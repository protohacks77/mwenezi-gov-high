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
const updateUsernameSchema = z.object({
  userId: z.string().min(1),
  newUsername: z.string().min(3),
  password: z.string().min(1), // IMPORTANT: See security note below
  role: z.enum(['admin', 'bursar', 'student'])
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
    };
  }

  try {
    // Parse and validate input
    const body = JSON.parse(event.body);
    const validatedData = updateUsernameSchema.parse(body);

    // Get user data
    // Corrected: Use db.ref().once('value')
    const userSnapshot = await db.ref(`users/${validatedData.userId}`).once('value');
    if (!userSnapshot.exists()) {
      throw new Error('User not found');
    }

    const user = userSnapshot.val();

    // Verify password
    // IMPORTANT SECURITY NOTE: Storing and comparing plain text passwords like this is highly insecure.
    // In a real application, you should hash passwords (e.g., using bcrypt) when they are created
    // and then compare the provided password against the stored hash.
    if (user.password !== validatedData.password) {
      throw new Error('Password is incorrect');
    }

    // Check if newUsername is already taken by another user
    // Corrected: Use db.ref().once('value')
    const usersSnapshot = await db.ref('users').once('value');
    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      const existingUser = Object.values(users).find(u =>
        u.username === validatedData.newUsername && u.id !== validatedData.userId
      );
      if (existingUser) {
        throw new Error('Username is already taken');
      }
    }

    // Update username
    const updates = {};
    updates[`users/${validatedData.userId}/username`] = validatedData.newUsername;
    updates[`users/${validatedData.userId}/updatedAt`] = new Date().toISOString();

    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: 'admin-001', // Assuming a fixed admin ID for notifications
      userRole: 'admin',
      title: 'Username Changed',
      message: `${validatedData.role} user changed username from ${user.username || 'N/A'} to ${validatedData.newUsername}`,
      type: 'info',
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
        message: 'Username updated successfully'
      })
    };

  } catch (error) {
    console.error('Error updating username:', error);

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
    };
  }
};