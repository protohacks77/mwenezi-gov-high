
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
const updatePasswordSchema = z.object({
  userId: z.string().min(1),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
  role: z.enum(['admin', 'bursar', 'student']) // Ensure these roles match your data structure
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
    const validatedData = updatePasswordSchema.parse(body);

    // Determine the correct path based on the role
    // This assumes your 'users' node might be structured by role,
    // or that all users are under a single 'users' node.
    // If users are under 'admin', 'bursar', 'student' nodes, adjust this.
    // For simplicity, assuming all users are under 'users' and role is just metadata.
    const userPath = `users/${validatedData.userId}`;

    // Get user data
    // Corrected: Use db.ref().once('value')
    const userSnapshot = await db.ref(userPath).once('value');
    if (!userSnapshot.exists()) {
      throw new Error('User not found');
    }

    const user = userSnapshot.val();

    // Verify current password
    // IMPORTANT: Storing plain text passwords in Realtime Database is NOT secure.
    // You should be hashing passwords (e.g., with bcrypt) and comparing hashes.
    // This check is functional but a security risk for production.
    if (user.password !== validatedData.currentPassword) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    const updates = {};
    updates[`${userPath}/password`] = validatedData.newPassword; // Update the specific user's password
    updates[`${userPath}/updatedAt`] = new Date().toISOString();

    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: 'admin-001', // Assuming a fixed admin ID for notifications
      userRole: 'admin',
      title: 'Password Changed',
      message: `${validatedData.role} user ${user.username || validatedData.userId} changed their password`, // Use username if available
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
        message: 'Password updated successfully'
      })
    };

  } catch (error) {
    console.error('Error updating password:', error);

    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to update password'
      })
    };
  }
};
