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
const addTermSchema = z.object({
  termKey: z.string().min(1),
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
    const validatedData = addTermSchema.parse(body)

    // Get config and students
    const configSnapshot = await get(ref(db, 'config'))
    const studentsSnapshot = await get(ref(db, 'students'))
    
    if (!configSnapshot.exists()) {
      throw new Error('Configuration not found')
    }

    const config = configSnapshot.val()
    const students = studentsSnapshot.exists() ? studentsSnapshot.val() : {}

    // Check if term already exists
    if (config.activeTerms.includes(validatedData.termKey)) {
      throw new Error('Term already exists')
    }

    const updates = {}

    // Add term to active terms
    const newActiveTerms = [...config.activeTerms, validatedData.termKey]
    updates['config/activeTerms'] = newActiveTerms

    // Bill all students for the new term
    Object.values(students).forEach(student => {
      const termFee = calculateStudentFee(
        student.studentType,
        student.gradeCategory,
        student.grade,
        config.fees
      )

      const updatedTerms = {
        ...student.financials.terms,
        [validatedData.termKey]: {
          fee: termFee,
          paid: 0
        }
      }

      const newBalance = calculateStudentBalance(updatedTerms)

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
      title: 'New Term Added',
      message: `Term "${validatedData.termKey}" has been added and all students have been billed.`,
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
        message: 'Term added and students billed successfully'
      })
    }

  } catch (error) {
    console.error('Error adding new term:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to add new term'
      })
    }
  }
}