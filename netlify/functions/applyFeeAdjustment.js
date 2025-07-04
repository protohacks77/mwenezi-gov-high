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
const feeAdjustmentSchema = z.object({
  studentId: z.string().min(1),
  adjustmentAmount: z.number().positive(),
  termKey: z.string().min(1),
  reason: z.string().min(1),
  adjustmentType: z.enum(['debit', 'credit']),
  bursarId: z.string().min(1),
  bursarUsername: z.string().min(1)
})

function calculateStudentBalance(terms) {
  return Object.values(terms).reduce((total, term) => total + (term.fee - term.paid), 0)
}

exports.handler = async (event, context) => {
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
    const body = JSON.parse(event.body)
    const validatedData = feeAdjustmentSchema.parse(body)

    // Get student data
    const studentSnapshot = await get(ref(db, `students/${validatedData.studentId}`))
    if (!studentSnapshot.exists()) {
      throw new Error('Student not found')
    }

    const student = studentSnapshot.val()
    const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const studentNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const adminNotificationId = `notif-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`

    // Calculate adjustment
    const updatedTerms = { ...student.financials.terms }
    if (!updatedTerms[validatedData.termKey]) {
      throw new Error('Invalid term key')
    }

    if (validatedData.adjustmentType === 'credit') {
      // Credit reduces the fee (increases paid amount)
      updatedTerms[validatedData.termKey].paid += validatedData.adjustmentAmount
    } else {
      // Debit increases the fee
      updatedTerms[validatedData.termKey].fee += validatedData.adjustmentAmount
    }

    // Recalculate balance
    const newBalance = calculateStudentBalance(updatedTerms)

    // Prepare atomic updates
    const updates = {}

    // Update student financials
    updates[`students/${validatedData.studentId}/financials/terms/${validatedData.termKey}`] = 
      updatedTerms[validatedData.termKey]
    updates[`students/${validatedData.studentId}/financials/balance`] = newBalance
    updates[`students/${validatedData.studentId}/updatedAt`] = new Date().toISOString()

    // Create transaction record
    updates[`transactions/${transactionId}`] = {
      id: transactionId,
      studentId: validatedData.studentId,
      studentName: `${student.name} ${student.surname}`,
      amount: validatedData.adjustmentAmount,
      type: 'adjustment',
      status: 'completed',
      termKey: validatedData.termKey,
      reason: validatedData.reason,
      adjustmentType: validatedData.adjustmentType,
      bursarId: validatedData.bursarId,
      bursarUsername: validatedData.bursarUsername,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Create notifications
    updates[`notifications/${studentNotificationId}`] = {
      id: studentNotificationId,
      userId: validatedData.studentId,
      userRole: 'student',
      title: 'Fee Adjustment Applied',
      message: `A ${validatedData.adjustmentType} adjustment of $${validatedData.adjustmentAmount.toFixed(2)} has been applied to your ${validatedData.termKey.replace('_', ' ')} fees. Reason: ${validatedData.reason}`,
      type: validatedData.adjustmentType === 'credit' ? 'success' : 'warning',
      read: false,
      createdAt: new Date().toISOString()
    }

    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: 'admin-001',
      userRole: 'admin',
      title: 'Fee Adjustment Applied',
      message: `Bursar ${validatedData.bursarUsername} applied a ${validatedData.adjustmentType} adjustment of $${validatedData.adjustmentAmount.toFixed(2)} for ${student.name} ${student.surname}`,
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
        newBalance: newBalance,
        transactionId: transactionId
      })
    }

  } catch (error) {
    console.error('Error applying fee adjustment:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to apply fee adjustment'
      })
    }
  }
}