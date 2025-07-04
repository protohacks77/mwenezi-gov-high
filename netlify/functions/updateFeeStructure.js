
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
const updateFeeSchema = z.object({
  fees: z.object({
    dayScholar: z.object({
      zjc: z.number(),
      oLevel: z.number(),
      aLevelSciences: z.number(),
      aLevelCommercials: z.number(),
      aLevelArts: z.number()
    }),
    boarder: z.object({
      zjc: z.number(),
      oLevel: z.number(),
      aLevelSciences: z.number(),
      aLevelCommercials: z.number(),
      aLevelArts: z.number()
    })
  }),
  adminId: z.string().min(1)
});

function calculateStudentFee(studentType, gradeCategory, grade, fees) {
  const feeStructure = studentType === 'Boarder' ? fees.boarder : fees.dayScholar;

  switch (gradeCategory) {
    case 'ZJC':
      return feeStructure.zjc;
    case 'OLevel':
      return feeStructure.oLevel;
    case 'ALevel':
      if (grade.includes('Sciences')) return feeStructure.aLevelSciences;
      if (grade.includes('Commercials')) return feeStructure.aLevelCommercials;
      if (grade.includes('Arts')) return feeStructure.aLevelArts;
      return feeStructure.aLevelSciences; // Default for ALevel if no specific match
    default:
      return 0;
  }
}

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
    const validatedData = updateFeeSchema.parse(body);

    // Get all students
    // Corrected: Use db.ref().once('value')
    const studentsSnapshot = await db.ref('students').once('value');
    if (!studentsSnapshot.exists()) {
      // It's possible there are no students yet, so handle this gracefully
      console.warn('No students found in database. Only fees config will be updated.');
      // Don't throw an error if no students, just proceed to update config
    }

    const students = studentsSnapshot.val() || {}; // Ensure students is an object even if snapshot doesn't exist
    const updates = {};

    // Update config with new fees
    updates['config/fees'] = validatedData.fees;

    // Recalculate all student balances if students exist
    if (Object.keys(students).length > 0) {
      Object.values(students).forEach(student => {
        // Ensure student.financials and student.financials.terms exist
        const updatedTerms = { ...(student.financials?.terms || {}) };

        // Recalculate fees for each term
        Object.keys(updatedTerms).forEach(termKey => {
          const newFee = calculateStudentFee(
            student.studentType,
            student.gradeCategory,
            student.grade,
            validatedData.fees
          );
          updatedTerms[termKey].fee = newFee;
        });

        // Recalculate balance
        const newBalance = calculateStudentBalance(updatedTerms);

        // Update student data paths
        updates[`students/${student.id}/financials/terms`] = updatedTerms;
        updates[`students/${student.id}/financials/balance`] = newBalance;
        updates[`students/${student.id}/updatedAt`] = new Date().toISOString();
      });
    }

    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: validatedData.adminId,
      userRole: 'admin',
      title: 'Fee Structure Updated',
      message: 'Fee structure has been updated and all student balances have been recalculated.',
      type: 'success',
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
        message: 'Fee structure updated and student balances recalculated'
      })
    };

  } catch (error) {
    console.error('Error updating fee structure:', error);

    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to update fee structure'
      })
    };
  }
};