const { getDatabase, ref, get, update } = require('firebase-admin/database')
const { initializeApp, cert } = require('firebase-admin/app')
const { z } = require('zod')

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

// Validation schema
const cashPaymentSchema = z.object({
  studentId: z.string().min(1),
  amount: z.number().positive(),
  termKey: z.string().min(1),
  bursarId: z.string().min(1),
  bursarUsername: z.string().min(1)
})

function generateReceiptNumber() {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 99).toString().padStart(2, '0')
  return `RCT-${timestamp}${random}`
}

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

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  try {
    // Parse and validate input
    const body = JSON.parse(event.body)
    const validatedData = cashPaymentSchema.parse(body)

    // Get student data
    const studentSnapshot = await get(ref(db, `students/${validatedData.studentId}`))
    if (!studentSnapshot.exists()) {
      throw new Error('Student not found')
    }

    const student = studentSnapshot.val()
    const receiptNumber = generateReceiptNumber()
    const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const bursarActivityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const studentNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const adminNotificationId = `notif-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`

    // Update student's payment for the specific term
    const updatedTerms = { ...student.financials.terms }
    if (!updatedTerms[validatedData.termKey]) {
      throw new Error('Invalid term key')
    }

    updatedTerms[validatedData.termKey].paid += validatedData.amount

    // Recalculate balance
    const newBalance = calculateStudentBalance(updatedTerms)

    // Prepare atomic updates
    const updates = {}

    // Update student financials
    updates[`students/${validatedData.studentId}/financials/terms/${validatedData.termKey}/paid`] = 
      updatedTerms[validatedData.termKey].paid
    updates[`students/${validatedData.studentId}/financials/balance`] = newBalance
    updates[`students/${validatedData.studentId}/updatedAt`] = new Date().toISOString()

    // Create transaction record
    updates[`transactions/${transactionId}`] = {
      id: transactionId,
      studentId: validatedData.studentId,
      studentName: `${student.name} ${student.surname}`,
      amount: validatedData.amount,
      type: 'cash',
      status: 'completed',
      termKey: validatedData.termKey,
      receiptNumber: receiptNumber,
      bursarId: validatedData.bursarId,
      bursarUsername: validatedData.bursarUsername,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Create bursar activity record
    updates[`bursar_activity/${bursarActivityId}`] = {
      id: bursarActivityId,
      bursarId: validatedData.bursarId,
      bursarUsername: validatedData.bursarUsername,
      studentId: validatedData.studentId,
      studentName: `${student.name} ${student.surname}`,
      amount: validatedData.amount,
      termKey: validatedData.termKey,
      receiptNumber: receiptNumber,
      createdAt: new Date().toISOString()
    }

    // Create notifications
    updates[`notifications/${studentNotificationId}`] = {
      id: studentNotificationId,
      userId: validatedData.studentId,
      userRole: 'student',
      title: 'Payment Received',
      message: `Cash payment of $${validatedData.amount.toFixed(2)} processed. Receipt: ${receiptNumber}`,
      type: 'success',
      read: false,
      createdAt: new Date().toISOString()
    }

    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: 'admin-001', // Default admin ID
      userRole: 'admin',
      title: 'Cash Payment Processed',
      message: `Bursar ${validatedData.bursarUsername} processed $${validatedData.amount.toFixed(2)} payment for ${student.name} ${student.surname}`,
      type: 'info',
      read: false,
      createdAt: new Date().toISOString()
    }

    // Execute atomic update
    await update(ref(db), updates)

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        receiptNumber: receiptNumber,
        newBalance: newBalance,
        transactionId: transactionId
      })
    }

  } catch (error) {
    console.error('Error processing cash payment:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to process payment'
      })
    }
  }
}