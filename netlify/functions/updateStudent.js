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
const updateStudentSchema = z.object({
  studentId: z.string().min(1),
  name: z.string().min(1),
  surname: z.string().min(1),
  guardianPhoneNumber: z.string().min(1),
  grade: z.string().min(1),
  studentType: z.enum(['Day Scholar', 'Boarder']),
  adminId: z.string().min(1)
})

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
    const validatedData = updateStudentSchema.parse(body)

    // Get student
    const studentSnapshot = await get(ref(db, `students/${validatedData.studentId}`))
    if (!studentSnapshot.exists()) {
      throw new Error('Student not found')
    }

    const updates = {}

    // Update student data
    updates[`students/${validatedData.studentId}/name`] = validatedData.name
    updates[`students/${validatedData.studentId}/surname`] = validatedData.surname
    updates[`students/${validatedData.studentId}/guardianPhoneNumber`] = validatedData.guardianPhoneNumber
    updates[`students/${validatedData.studentId}/grade`] = validatedData.grade
    updates[`students/${validatedData.studentId}/studentType`] = validatedData.studentType
    updates[`students/${validatedData.studentId}/updatedAt`] = new Date().toISOString()

    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: validatedData.adminId,
      userRole: 'admin',
      title: 'Student Updated',
      message: `Student ${validatedData.name} ${validatedData.surname} information has been updated.`,
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
        message: 'Student updated successfully'
      })
    }

  } catch (error) {
    console.error('Error updating student:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to update student'
      })
    }
  }
}