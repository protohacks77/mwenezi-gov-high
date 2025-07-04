const { getDatabase, ref, get, update, remove } = require('firebase-admin/database')
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
const deleteStudentSchema = z.object({
  studentId: z.string().min(1),
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
    const validatedData = deleteStudentSchema.parse(body)

    // Get student
    const studentSnapshot = await get(ref(db, `students/${validatedData.studentId}`))
    if (!studentSnapshot.exists()) {
      throw new Error('Student not found')
    }

    const student = studentSnapshot.val()

    // Get all transactions for this student
    const transactionsSnapshot = await get(ref(db, 'transactions'))
    const transactions = transactionsSnapshot.exists() ? transactionsSnapshot.val() : {}

    // Get all notifications for this student
    const notificationsSnapshot = await get(ref(db, 'notifications'))
    const notifications = notificationsSnapshot.exists() ? notificationsSnapshot.val() : {}

    const updates = {}

    // Remove student
    updates[`students/${validatedData.studentId}`] = null

    // Remove user account
    updates[`users/${validatedData.studentId}`] = null

    // Remove student transactions
    Object.entries(transactions).forEach(([txId, transaction]) => {
      if (transaction.studentId === validatedData.studentId) {
        updates[`transactions/${txId}`] = null
      }
    })

    // Remove student notifications
    Object.entries(notifications).forEach(([notifId, notification]) => {
      if (notification.userId === validatedData.studentId) {
        updates[`notifications/${notifId}`] = null
      }
    })

    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: validatedData.adminId,
      userRole: 'admin',
      title: 'Student Deleted',
      message: `Student ${student.name} ${student.surname} (${student.studentNumber}) has been deleted from the system.`,
      type: 'warning',
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
        message: 'Student deleted successfully'
      })
    }

  } catch (error) {
    console.error('Error deleting student:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to delete student'
      })
    }
  }
}