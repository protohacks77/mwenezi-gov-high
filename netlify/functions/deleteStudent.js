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
const deleteStudentSchema = z.object({
  studentId: z.string().min(1),
  adminId: z.string().min(1)
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
    const validatedData = deleteStudentSchema.parse(body);

    // Get student
    // Corrected: Use db.ref().once('value')
    const studentRef = db.ref(`students/${validatedData.studentId}`);
    const studentSnapshot = await studentRef.once('value');
    if (!studentSnapshot.exists()) {
      throw new Error('Student not found');
    }

    const student = studentSnapshot.val();

    // Get all transactions (for filtering by studentId)
    // Corrected: Use db.ref().once('value')
    const transactionsRef = db.ref('transactions');
    const transactionsSnapshot = await transactionsRef.once('value');
    const transactions = transactionsSnapshot.exists() ? transactionsSnapshot.val() : {};

    // Get all notifications (for filtering by userId)
    // Corrected: Use db.ref().once('value')
    const notificationsRef = db.ref('notifications');
    const notificationsSnapshot = await notificationsRef.once('value');
    const notifications = notificationsSnapshot.exists() ? notificationsSnapshot.val() : {};

    const updates = {};

    // Set paths to null to delete data
    // Delete student record
    updates[`students/${validatedData.studentId}`] = null;

    // Delete user account associated with the student (assuming studentId is also userId)
    updates[`users/${validatedData.studentId}`] = null;

    // Delete student-specific transactions
    Object.entries(transactions).forEach(([txId, transaction]) => {
      if (transaction && transaction.studentId === validatedData.studentId) {
        updates[`transactions/${txId}`] = null;
      }
    });

    // Delete student-specific notifications
    Object.entries(notifications).forEach(([notifId, notification]) => {
      if (notification && notification.userId === validatedData.studentId) {
        updates[`notifications/${notifId}`] = null;
      }
    });

    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: validatedData.adminId, // The admin who performed the deletion
      userRole: 'admin',
      title: 'Student Deleted',
      message: `Student ${student.name} ${student.surname} (${student.studentNumber || 'N/A'}) has been deleted from the system.`,
      type: 'warning',
      read: false,
      createdAt: new Date().toISOString()
    };

    // Execute atomic update (deletes are performed by setting to null in an update operation)
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
        message: 'Student deleted successfully'
      })
    };

  } catch (error) {
    console.error('Error deleting student:', error);

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
    };
  }
};