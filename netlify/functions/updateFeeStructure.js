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
const updateFeeSchema = z.object({
  fees: z.object({
    dayScholar: z.object({
      zjc: z.number(),
      oLevel: z.number(),
      aLevelSciences: z.number(),
      aLevelCommercials: z.number(),
      aLevelArts: z.number()
    }),
    boarder: z.object({
      zjc: z.number(),
      oLevel: z.number(),
      aLevelSciences: z.number(),
      aLevelCommercials: z.number(),
      aLevelArts: z.number()
    })
  }),
  adminId: z.string().min(1)
})

function calculateStudentFee(studentType, gradeCategory, grade, fees) {
  const feeStructure = studentType === 'Boarder' ? fees.boarder : fees.dayScholar

  switch (gradeCategory) {
    case 'ZJC':
      return feeStructure.zjc
    case 'OLevel':
      return feeStructure.oLevel
    case 'ALevel':
      if (grade.includes('Sciences')) return feeStructure.aLevelSciences
      if (grade.includes('Commercials')) return feeStructure.aLevelCommercials
      if (grade.includes('Arts')) return feeStructure.aLevelArts
      return feeStructure.aLevelSciences
    default:
      return 0
  }
}

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
    const validatedData = updateFeeSchema.parse(body)

    // Get all students
    const studentsSnapshot = await get(ref(db, 'students'))
    if (!studentsSnapshot.exists()) {
      throw new Error('No students found')
    }

    const students = studentsSnapshot.val()
    const updates = {}

    // Update config with new fees
    updates['config/fees'] = validatedData.fees

    // Recalculate all student balances
    Object.values(students).forEach(student => {
      const updatedTerms = { ...student.financials.terms }
      
      // Recalculate fees for each term
      Object.keys(updatedTerms).forEach(termKey => {
        const newFee = calculateStudentFee(
          student.studentType,
          student.gradeCategory,
          student.grade,
          validatedData.fees
        )
        updatedTerms[termKey].fee = newFee
      })

      // Recalculate balance
      const newBalance = calculateStudentBalance(updatedTerms)

      // Update student data
      updates[`students/${student.id}/financials/terms`] = updatedTerms
      updates[`students/${student.id}/financials/balance`] = newBalance
      updates[`students/${student.id}/updatedAt`] = new Date().toISOString()
    })

    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: validatedData.adminId,
      userRole: 'admin',
      title: 'Fee Structure Updated',
      message: 'Fee structure has been updated and all student balances have been recalculated.',
      type: 'success',
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
        message: 'Fee structure updated and student balances recalculated'
      })
    }

  } catch (error) {
    console.error('Error updating fee structure:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to update fee structure'
      })
    }
  }
}