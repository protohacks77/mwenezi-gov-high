const { getDatabase, ref, get, update } = require('firebase-admin/database')
const { initializeApp, cert } = require('firebase-admin/app')
const { z } = require('zod')
const fetch = require('node-fetch')

// Initialize Firebase Admin
let app
try {
  app = require('firebase-admin').app()
} catch (e) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  })
}

const db = getDatabase(app)

// ZbPay API Credentials from environment variables
const ZBPAY_API_KEY = process.env.ZBPAY_API_KEY || '3f36fd4b-3b23-4249-b65d-f39dc9df42d4'
const ZBPAY_API_SECRET = process.env.ZBPAY_API_SECRET || '2f2c32d7-7a32-4523-bcde-1913bf7c171d'
const ZBPAY_BASE_URL = process.env.ZBPAY_BASE_URL || 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway'

// Validation schema
const checkStatusSchema = z.object({
  orderRef: z.string().min(1),
  txId: z.string().min(1)
})

function calculateStudentBalance(terms) {
  return Object.values(terms).reduce((total, term) => total + (term.fee - term.paid), 0)
}

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    }
  }

  try {
    // Parse query parameters
    const { orderRef, txId } = event.queryStringParameters || {}
    
    if (!orderRef || !txId) {
      throw new Error('Missing required parameters: orderRef and txId')
    }

    const validatedData = checkStatusSchema.parse({ orderRef, txId })
    console.log('Checking payment status for:', validatedData)

    // Get transaction from database
    const transactionSnapshot = await get(ref(db, `transactions/${validatedData.txId}`))
    if (!transactionSnapshot.exists()) {
      throw new Error('Transaction not found')
    }

    const transaction = transactionSnapshot.val()
    console.log('Found transaction:', transaction.id, 'Status:', transaction.status)

    // If already processed, return current status
    if (transaction.status === 'zb_payment_successful' || transaction.status === 'zb_payment_failed') {
      console.log('Transaction already processed, returning current status')
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        },
        body: JSON.stringify({
          success: true,
          status: transaction.status,
          orderReference: transaction.orderReference,
          transactionId: transaction.id,
          amount: transaction.amount
        })
      }
    }

    // Check status with ZbPay API
    console.log('Checking with ZbPay API...')
    const zbPayResponse = await fetch(
      `${ZBPAY_BASE_URL}/payments/transaction/${validatedData.orderRef}/status/check`,
      {
        method: 'GET',
        headers: {
          'x-api-key': ZBPAY_API_KEY,
          'x-api-secret': ZBPAY_API_SECRET
        }
      }
    )

    console.log('ZbPay status check response:', zbPayResponse.status)
    const zbPayData = await zbPayResponse.json()
    console.log('ZbPay status data:', zbPayData)

    if (!zbPayResponse.ok) {
      throw new Error(`ZbPay API error: ${zbPayData.message || 'Unknown error'}`)
    }

    const updates = {}
    let newStatus = transaction.status
    let shouldUpdateStudent = false

    // Process ZbPay status
    if (zbPayData.status === 'PAID' || zbPayData.status === 'SUCCESSFUL') {
      if (transaction.status === 'pending_zb_confirmation') {
        console.log('Payment successful, updating student financials')
        // Payment successful - update student financials
        const studentSnapshot = await get(ref(db, `students/${transaction.studentId}`))
        if (studentSnapshot.exists()) {
          const student = studentSnapshot.val()
          const updatedTerms = { ...student.financials.terms }
          
          if (updatedTerms[transaction.termKey]) {
            updatedTerms[transaction.termKey].paid += transaction.amount
            const newBalance = calculateStudentBalance(updatedTerms)

            // Update student financials
            updates[`students/${transaction.studentId}/financials/terms/${transaction.termKey}/paid`] = 
              updatedTerms[transaction.termKey].paid
            updates[`students/${transaction.studentId}/financials/balance`] = newBalance
            updates[`students/${transaction.studentId}/updatedAt`] = new Date().toISOString()

            shouldUpdateStudent = true
            newStatus = 'zb_payment_successful'

            // Create notifications
            const studentNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            const adminNotificationId = `notif-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`

            updates[`notifications/${studentNotificationId}`] = {
              id: studentNotificationId,
              userId: transaction.studentId,
              userRole: 'student',
              title: 'Payment Successful',
              message: `ZbPay payment of $${transaction.amount.toFixed(2)} completed successfully.`,
              type: 'success',
              read: false,
              createdAt: new Date().toISOString()
            }

            updates[`notifications/${adminNotificationId}`] = {
              id: adminNotificationId,
              userId: 'admin-001',
              userRole: 'admin',
              title: 'ZbPay Payment Successful',
              message: `ZbPay payment of $${transaction.amount.toFixed(2)} for ${student.name} ${student.surname} completed. Ref: ${validatedData.orderRef}`,
              type: 'success',
              read: false,
              createdAt: new Date().toISOString()
            }
          }
        }
      }
    } else if (zbPayData.status === 'FAILED' || zbPayData.status === 'CANCELED') {
      console.log('Payment failed or canceled')
      newStatus = 'zb_payment_failed'

      // Create failure notification
      const studentNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      updates[`notifications/${studentNotificationId}`] = {
        id: studentNotificationId,
        userId: transaction.studentId,
        userRole: 'student',
        title: 'Payment Failed',
        message: `Your ZbPay payment failed. Please try again.`,
        type: 'error',
        read: false,
        createdAt: new Date().toISOString()
      }
    }

    // Update transaction status
    updates[`transactions/${transaction.id}/status`] = newStatus
    updates[`transactions/${transaction.id}/zbPayStatusCheck`] = zbPayData
    updates[`transactions/${transaction.id}/updatedAt`] = new Date().toISOString()

    // Execute atomic update if there are changes
    if (Object.keys(updates).length > 0) {
      console.log('Executing database updates...')
      await update(ref(db), updates)
      console.log('Database updated successfully')
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        status: newStatus,
        orderReference: transaction.orderReference,
        transactionId: transaction.id,
        amount: transaction.amount,
        zbPayStatus: zbPayData.status
      })
    }

  } catch (error) {
    console.error('Error checking ZbPay status:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to check payment status'
      })
    }
  }
}