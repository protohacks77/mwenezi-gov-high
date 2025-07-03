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
const updateUsernameSchema = z.object({
  userId: z.string().min(1),
  newUsername: z.string().min(3),
  password: z.string().min(1),
  role: z.enum(['admin', 'bursar', 'student'])
})

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
    const validatedData = updateUsernameSchema.parse(body)

    // Get user data
    const userSnapshot = await get(ref(db, `users/${validatedData.userId}`))
    if (!userSnapshot.exists()) {
      throw new Error('User not found')
    }

    const user = userSnapshot.val()

    // Verify password
    if (user.password !== validatedData.password) {
      throw new Error('Password is incorrect')
    }

    // Check if username is already taken
    const usersSnapshot = await get(ref(db, 'users'))
    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val()
      const existingUser = Object.values(users).find(u => 
        u.username === validatedData.newUsername && u.id !== validatedData.userId
      )
      if (existingUser) {
        throw new Error('Username is already taken')
      }
    }

    // Update username
    const updates = {}
    updates[`users/${validatedData.userId}/username`] = validatedData.newUsername
    updates[`users/${validatedData.userId}/updatedAt`] = new Date().toISOString()

    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: 'admin-001',
      userRole: 'admin',
      title: 'Username Changed',
      message: `${validatedData.role} user changed username from ${user.username} to ${validatedData.newUsername}`,
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
        message: 'Username updated successfully'
      })
    }

  } catch (error) {
    console.error('Error updating username:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to update username'
      })
    }
  }
}