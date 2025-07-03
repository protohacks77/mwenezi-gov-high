const { getDatabase, ref, get, update } = require('firebase-admin/database')
const { initializeApp, cert } = require('firebase-admin/app')

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

function calculateStudentBalance(terms) {
  return Object.values(terms).reduce((total, term) => total + (term.fee - term.paid), 0)
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse webhook payload
    const webhookData = JSON.parse(event.body)
    console.log('Received ZbPay webhook:', webhookData)

    const { orderReference, status, amount, transactionId } = webhookData

    if (!orderReference) {
      throw new Error('Missing orderReference in webhook')
    }

    // Find transaction by orderReference
    const transactionsSnapshot = await get(ref(db, 'transactions'))
    if (!transactionsSnapshot.exists()) {
      throw new Error('No transactions found')
    }

    const transactions = transactionsSnapshot.val()
    const transaction = Object.values(transactions).find(t => t.orderReference === orderReference)

    if (!transaction) {
      throw new Error(`Transaction not found for orderReference: ${orderReference}`)
    }

    console.log('Found transaction:', transaction.id, 'Current status:', transaction.status)

    // Only process if transaction is still pending
    if (transaction.status !== 'pending_zb_confirmation') {
      console.log(`Transaction ${transaction.id} already processed, status: ${transaction.status}`)
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Already processed' })
      }
    }

    const updates = {}
    let newStatus = 'zb_payment_failed'
    let notificationTitle = 'Payment Failed'
    let notificationMessage = 'Your ZbPay payment failed. Please try again.'
    let notificationType = 'error'

    // Process based on webhook status
    if (status === 'PAID' || status === 'SUCCESSFUL') {
      console.log('Processing successful payment via webhook')
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

          newStatus = 'zb_payment_successful'
          notificationTitle = 'Payment Successful'
          notificationMessage = `ZbPay payment of $${transaction.amount.toFixed(2)} completed successfully.`
          notificationType = 'success'

          // Create admin notification
          const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          updates[`notifications/${adminNotificationId}`] = {
            id: adminNotificationId,
            userId: 'admin-001',
            userRole: 'admin',
            title: 'ZbPay Payment Successful',
            message: `ZbPay payment of $${transaction.amount.toFixed(2)} for ${student.name} ${student.surname} completed. Ref: ${orderReference}`,
            type: 'success',
            read: false,
            createdAt: new Date().toISOString()
          }
        }
      }
    }

    // Update transaction status
    updates[`transactions/${transaction.id}/status`] = newStatus
    updates[`transactions/${transaction.id}/webhookData`] = webhookData
    updates[`transactions/${transaction.id}/updatedAt`] = new Date().toISOString()

    // Create student notification
    const studentNotificationId = `notif-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`
    updates[`notifications/${studentNotificationId}`] = {
      id: studentNotificationId,
      userId: transaction.studentId,
      userRole: 'student',
      title: notificationTitle,
      message: notificationMessage,
      type: notificationType,
      read: false,
      createdAt: new Date().toISOString()
    }

    // Execute atomic update
    console.log('Executing webhook database updates...')
    await update(ref(db), updates)

    console.log(`Successfully processed webhook for transaction ${transaction.id}`)

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        message: 'Webhook processed successfully',
        transactionId: transaction.id,
        status: newStatus
      })
    }

  } catch (error) {
    console.error('Error processing ZbPay webhook:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message || 'Failed to process webhook'
      })
    }
  }
}