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
const cashPaymentSchema = z.object({
  studentId: z.string().min(1),
  amount: z.number().positive(),
  termKey: z.string().min(1),
  bursarId: z.string().min(1),
  bursarUsername: z.string().min(1)
});

function generateReceiptNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 99).toString().padStart(2, '0');
  return `RCT-${timestamp}${random}`;
}

function calculateStudentBalance(terms) {
  // Ensure terms is an object before iterating
  if (!terms || typeof terms !== 'object') {
    return 0;
  }
  return Object.values(terms).reduce((total, term) => total + (term.fee - term.paid), 0);
}

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
    const validatedData = cashPaymentSchema.parse(body);

    // Get student data
    // Corrected: Use db.ref().once('value')
    const studentSnapshot = await db.ref(`students/${validatedData.studentId}`).once('value');
    if (!studentSnapshot.exists()) {
      throw new Error('Student not found');
    }

    const student = studentSnapshot.val();
    const receiptNumber = generateReceiptNumber();
    const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const bursarActivityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const studentNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const adminNotificationId = `notif-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`;

    // Update student's payment for the specific term
    const updatedTerms = { ...(student.financials?.terms || {}) }; // Ensure financials.terms exists
    if (!updatedTerms[validatedData.termKey]) {
      throw new Error('Invalid term key');
    }

    // Ensure 'paid' property exists and is a number before adding
    updatedTerms[validatedData.termKey].paid = (updatedTerms[validatedData.termKey].paid || 0) + validatedData.amount;

    // Recalculate balance
    const newBalance = calculateStudentBalance(updatedTerms);

    // Prepare atomic updates
    const updates = {};

    // Update student financials paths
    // Update the specific 'paid' field within the term
    updates[`students/${validatedData.studentId}/financials/terms/${validatedData.termKey}/paid`] =
      updatedTerms[validatedData.termKey].paid;
    updates[`students/${validatedData.studentId}/financials/balance`] = newBalance;
    updates[`students/${validatedData.studentId}/updatedAt`] = new Date().toISOString();

    // Create transaction record
    updates[`transactions/${transactionId}`] = {
      id: transactionId,
      studentId: validatedData.studentId,
      studentName: `${student.name} ${student.surname}`,
      amount: validatedData.amount,
      type: 'cash',
      status: 'completed',
      termKey: validatedData.termKey,
      receiptNumber: receiptNumber,
      bursarId: validatedData.bursarId,
      bursarUsername: validatedData.bursarUsername,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create bursar activity record
    updates[`bursar_activity/${bursarActivityId}`] = {
      id: bursarActivityId,
      bursarId: validatedData.bursarId,
      bursarUsername: validatedData.bursarUsername,
      studentId: validatedData.studentId,
      studentName: `${student.name} ${student.surname}`,
      amount: validatedData.amount,
      termKey: validatedData.termKey,
      receiptNumber: receiptNumber,
      createdAt: new Date().toISOString()
    };

    // Create notifications
    updates[`notifications/${studentNotificationId}`] = {
      id: studentNotificationId,
      userId: validatedData.studentId,
      userRole: 'student',
      title: 'Payment Received',
      message: `Cash payment of $${validatedData.amount.toFixed(2)} processed. Receipt: ${receiptNumber}`,
      type: 'success',
      read: false,
      createdAt: new Date().toISOString()
    };

    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: 'admin-001', // Default admin ID
      userRole: 'admin',
      title: 'Cash Payment Processed',
      message: `Bursar ${validatedData.bursarUsername} processed $${validatedData.amount.toFixed(2)} payment for ${student.name} ${student.surname}`,
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
        receiptNumber: receiptNumber,
        newBalance: newBalance,
        transactionId: transactionId
      })
    };

  } catch (error) {
    console.error('Error processing cash payment:', error);

    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to process payment'
      })
    };
  }
};