
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
const removeTermSchema = z.object({
  termKey: z.string().min(1),
  adminId: z.string().min(1)
});

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
    };
  }

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: '' // Empty body for OPTIONS requests
    };
  }

  try {
    const body = JSON.parse(event.body);
    const validatedData = removeTermSchema.parse(body);

    // Get config
    // Corrected: Use db.ref().once('value') instead of get(ref(db, ...))
    const configSnapshot = await db.ref('config').once('value');
    if (!configSnapshot.exists()) {
      throw new Error('Configuration not found');
    }

    const config = configSnapshot.val();

    // Check if it's the last active term
    if (config.activeTerms.length <= 1) {
      throw new Error('Cannot remove the last active term');
    }

    // Check if term exists
    if (!config.activeTerms.includes(validatedData.termKey)) {
      throw new Error('Term is not active');
    }

    const updates = {};

    // Remove term from active terms
    const newActiveTerms = config.activeTerms.filter(term => term !== validatedData.termKey);
    updates['config/activeTerms'] = newActiveTerms;

    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: validatedData.adminId,
      userRole: 'admin',
      title: 'Term Removed',
      message: `Term "${validatedData.termKey}" has been removed from active terms.`,
      type: 'warning',
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
        message: 'Term removed successfully'
      })
    };

  } catch (error) {
    console.error('Error removing term:', error);

    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to remove term'
      })
    };
  }
};
