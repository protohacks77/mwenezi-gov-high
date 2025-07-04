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
const activateTermSchema = z.object({
  termKey: z.string().min(1),
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
    const validatedData = activateTermSchema.parse(body)

    // Get config
    const configSnapshot = await get(ref(db, 'config'))
    if (!configSnapshot.exists()) {
      throw new Error('Configuration not found')
    }

    const config = configSnapshot.val()

    // Check if term is already active
    if (config.activeTerms.includes(validatedData.termKey)) {
      throw new Error('Term is already active')
    }

    const updates = {}

    // Add term to active terms
    const newActiveTerms = [...config.activeTerms, validatedData.termKey]
    updates['config/activeTerms'] = newActiveTerms

    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: validatedData.adminId,
      userRole: 'admin',
      title: 'Term Activated',
      message: `Term "${validatedData.termKey}" has been activated.`,
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
        message: 'Term activated successfully'
      })
    }

  } catch (error) {
    console.error('Error activating term:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to activate term'
      })
    }
  }
}