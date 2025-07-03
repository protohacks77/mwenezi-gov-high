const { getDatabase, ref, get, set, update } = require('firebase-admin/database')
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
const createStudentSchema = z.object({
  name: z.string().min(1),
  surname: z.string().min(1),
  studentNumber: z.string().min(1),
  studentType: z.enum(['Day Scholar', 'Boarder']),
  gradeCategory: z.enum(['ZJC', 'OLevel', 'ALevel']),
  grade: z.string().min(1),
  guardianPhoneNumber: z.string().min(1),
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

function generateStudentId() {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 999).toString().padStart(3, '0')
  return `MHS-${timestamp}${random}`
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
    const validatedData = createStudentSchema.parse(body)

    // Generate new student ID
    const studentId = generateStudentId()

    // Get current config (active terms and fees)
    const configSnapshot = await get(ref(db, 'config'))
    if (!configSnapshot.exists()) {
      throw new Error('School configuration not found')
    }

    const config = configSnapshot.val()
    const { activeTerms, fees } = config

    // Calculate fee for this student
    const termFee = calculateStudentFee(
      validatedData.studentType,
      validatedData.gradeCategory,
      validatedData.grade,
      fees
    )

    // Build terms object and calculate total balance
    const terms = {}
    let totalBalance = 0

    activeTerms.forEach(termKey => {
      terms[termKey] = {
        fee: termFee,
        paid: 0
      }
      totalBalance += termFee
    })

    // Create student record
    const newStudent = {
      id: studentId,
      name: validatedData.name,
      surname: validatedData.surname,
      studentNumber: validatedData.studentNumber,
      studentType: validatedData.studentType,
      gradeCategory: validatedData.gradeCategory,
      grade: validatedData.grade,
      guardianPhoneNumber: validatedData.guardianPhoneNumber,
      financials: {
        balance: totalBalance,
        terms: terms
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Create user account for student
    const newUser = {
      id: studentId,
      username: validatedData.studentNumber,
      password: 'student123', // Default password
      role: 'student',
      createdAt: new Date().toISOString()
    }

    // Atomic write - create both student and user records
    const updates = {}
    updates[`students/${studentId}`] = newStudent
    updates[`users/${studentId}`] = newUser

    // Create notifications
    const welcomeNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const adminNotificationId = `notif-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`

    updates[`notifications/${welcomeNotificationId}`] = {
      id: welcomeNotificationId,
      userId: studentId,
      userRole: 'student',
      title: 'Welcome to Mwenezi High!',
      message: `Your account has been created. Your balance is $${totalBalance.toFixed(2)}.`,
      type: 'info',
      read: false,
      createdAt: new Date().toISOString()
    }

    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: validatedData.adminId,
      userRole: 'admin',
      title: 'New Student Added',
      message: `New student ${validatedData.name} ${validatedData.surname} (${validatedData.studentNumber}) added to ${validatedData.grade}`,
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
        studentId: studentId,
        studentNumber: validatedData.studentNumber,
        totalBalance: totalBalance
      })
    }

  } catch (error) {
    console.error('Error creating student:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to create student'
      })
    }
  }
}