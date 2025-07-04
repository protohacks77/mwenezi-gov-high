const admin = require('firebase-admin'); // Import the main firebase-admin module
const { z } = require('zod'); // Keep Zod if it's used for schema validation

// Initialize Firebase Admin
let app;
try {
  // Check if an app instance already exists to avoid re-initialization in hot-reloading environments
  app = admin.app();
} catch (e) {
  // If no app exists, initialize a new one
  app = admin.initializeApp({
    credential: admin.credential.cert({ // Use admin.credential.cert
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // The replace is crucial if the private key environment variable escapes newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL // Ensure this environment variable is set
  });
}

// Get the Realtime Database service instance
const db = admin.database(app);

// Validation schema
const activateTermSchema = z.object({
  termKey: z.string().min(1),
  adminId: z.string().min(1) // Assuming adminId is the ID of the admin performing the action
});

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
    };
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
    };
  }

  try {
    const body = JSON.parse(event.body);
    const validatedData = activateTermSchema.parse(body);

    // Get config
    // Corrected: Use db.ref().once('value')
    const configSnapshot = await db.ref('config').once('value');
    if (!configSnapshot.exists()) {
      // If config doesn't exist, you might want to initialize it
      // or throw a specific error indicating that initial setup is needed.
      throw new Error('Configuration not found. Please set up initial configuration.');
    }

    const config = configSnapshot.val();

    // Ensure activeTerms is an array, initialize if it doesn't exist or is not an array
    const currentActiveTerms = Array.isArray(config.activeTerms) ? config.activeTerms : [];

    // Check if term is already active
    if (currentActiveTerms.includes(validatedData.termKey)) {
      throw new Error('Term is already active');
    }

    const updates = {};

    // Add term to active terms
    const newActiveTerms = [...currentActiveTerms, validatedData.termKey];
    updates['config/activeTerms'] = newActiveTerms;

    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: validatedData.adminId, // The admin who performed the activation
      userRole: 'admin',
      title: 'Term Activated',
      message: `Term "${validatedData.termKey}" has been activated.`,
      type: 'success', // or 'info' depending on desired notification type
      read: false,
      createdAt: new Date().toISOString()
    };

    // Execute atomic update
    // Corrected: Use db.ref('/').update(updates)
    await db.ref('/').update(updates);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        message: `Term "${validatedData.termKey}" activated successfully`,
        activeTerms: newActiveTerms // Return the updated list of active terms
      })
    };

  } catch (error) {
    console.error('Error activating term:', error);

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
    };
  }
};