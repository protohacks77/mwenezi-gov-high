
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
const feeAdjustmentSchema = z.object({
  studentId: z.string().min(1),
  adjustmentAmount: z.number().positive(),
  termKey: z.string().min(1),
  reason: z.string().min(1),
  adjustmentType: z.enum(['debit', 'credit']), // 'debit' increases fee, 'credit' reduces fee (increases paid)
  bursarId: z.string().min(1),
  bursarUsername: z.string().min(1)
});

function calculateStudentBalance(terms) {
  // Ensure terms is an object before iterating
  if (!terms || typeof terms !== 'object') {
    return 0;
  }
  return Object.values(terms).reduce((total, term) => total + (term.fee - term.paid), 0);
}

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
    const validatedData = feeAdjustmentSchema.parse(body);

    // Get student data
    // Corrected: Use db.ref().once('value')
    const studentSnapshot = await db.ref(`students/${validatedData.studentId}`).once('value');
    if (!studentSnapshot.exists()) {
      throw new Error('Student not found');
    }

    const student = studentSnapshot.val();
    const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const studentNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const adminNotificationId = `notif-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate adjustment
    const updatedTerms = { ...(student.financials?.terms || {}) }; // Ensure terms object exists
    if (!updatedTerms[validatedData.termKey]) {
      throw new Error('Invalid term key');
    }

    if (validatedData.adjustmentType === 'credit') {
      // Credit reduces the amount due, effectively increasing 'paid'
      updatedTerms[validatedData.termKey].paid = (updatedTerms[validatedData.termKey].paid || 0) + validatedData.adjustmentAmount;
    } else { // 'debit'
      // Debit increases the amount due, effectively increasing 'fee'
      updatedTerms[validatedData.termKey].fee = (updatedTerms[validatedData.termKey].fee || 0) + validatedData.adjustmentAmount;
    }

    // Recalculate balance
    const newBalance = calculateStudentBalance(updatedTerms);

    // Prepare atomic updates
    const updates = {};

    // Update student financials paths
    updates[`students/${validatedData.studentId}/financials/terms/${validatedData.termKey}`] =
      updatedTerms[validatedData.termKey]; // Update the specific term object
    updates[`students/${validatedData.studentId}/financials/balance`] = newBalance;
    updates[`students/${validatedData.studentId}/updatedAt`] = new Date().toISOString();

    // Create transaction record
    updates[`transactions/${transactionId}`] = {
      id: transactionId,
      studentId: validatedData.studentId,
      studentName: `${student.name} ${student.surname}`,
      amount: validatedData.adjustmentAmount,
      type: 'adjustment',
      status: 'completed',
      termKey: validatedData.termKey,
      reason: validatedData.reason,
      adjustmentType: validatedData.adjustmentType,
      bursarId: validatedData.bursarId,
      bursarUsername: validatedData.bursarUsername,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create notifications
    updates[`notifications/${studentNotificationId}`] = {
      id: studentNotificationId,
      userId: validatedData.studentId,
      userRole: 'student',
      title: 'Fee Adjustment Applied',
      message: `A ${validatedData.adjustmentType} adjustment of $${validatedData.adjustmentAmount.toFixed(2)} has been applied to your ${validatedData.termKey.replace('_', ' ')} fees. Reason: ${validatedData.reason}`,
      type: validatedData.adjustmentType === 'credit' ? 'success' : 'warning',
      read: false,
      createdAt: new Date().toISOString()
    };

    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: 'admin-001', // Assuming a fixed admin ID for notifications
      userRole: 'admin',
      title: 'Fee Adjustment Applied',
      message: `Bursar ${validatedData.bursarUsername} applied a ${validatedData.adjustmentType} adjustment of $${validatedData.adjustmentAmount.toFixed(2)} for ${student.name} ${student.surname}`,
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
        newBalance: newBalance,
        transactionId: transactionId
      })
    };

  } catch (error) {
    console.error('Error applying fee adjustment:', error);

    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to apply fee adjustment'
      })
    };
  }
};
