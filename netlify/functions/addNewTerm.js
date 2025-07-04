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
const addTermSchema = z.object({
  termKey: z.string().min(1),
  adminId: z.string().min(1)
});

function calculateStudentFee(studentType, gradeCategory, grade, fees) {
  // Ensure fees and its nested properties exist before accessing
  if (!fees || !fees.boarder || !fees.dayScholar) {
    console.error("Fee structure is incomplete or missing in config.");
    return 0; // Return 0 if fee structure is not properly defined
  }

  const feeStructure = studentType === 'Boarder' ? fees.boarder : fees.dayScholar;

  switch (gradeCategory) {
    case 'ZJC':
      return feeStructure.zjc || 0; // Provide default 0 if property missing
    case 'OLevel':
      return feeStructure.oLevel || 0;
    case 'ALevel':
      if (grade.includes('Sciences')) return feeStructure.aLevelSciences || 0;
      if (grade.includes('Commercials')) return feeStructure.aLevelCommercials || 0;
      if (grade.includes('Arts')) return feeStructure.aLevelArts || 0;
      return feeStructure.aLevelSciences || 0; // Default for ALevel if no specific match
    default:
      return 0;
  }
}

function calculateStudentBalance(terms) {
  // Ensure terms is an object before iterating
  if (!terms || typeof terms !== 'object') {
    return 0;
  }
  return Object.values(terms).reduce((total, term) => total + ((term.fee || 0) - (term.paid || 0)), 0);
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
    const validatedData = addTermSchema.parse(body);

    // Get config and students
    // Corrected: Use db.ref().once('value') for both
    const configSnapshot = await db.ref('config').once('value');
    const studentsSnapshot = await db.ref('students').once('value');

    if (!configSnapshot.exists()) {
      throw new Error('Configuration not found. Please ensure your Firebase Realtime Database has a "config" node.');
    }

    const config = configSnapshot.val();
    const students = studentsSnapshot.exists() ? studentsSnapshot.val() : {}; // Ensure students is an object even if empty

    // Ensure activeTerms is an array, initialize if it doesn't exist or is not an array
    const currentActiveTerms = Array.isArray(config.activeTerms) ? config.activeTerms : [];

    // Check if term already exists in activeTerms
    if (currentActiveTerms.includes(validatedData.termKey)) {
      throw new Error('Term already exists in active terms. Cannot add duplicate.');
    }

    // Check if config.fees exists before proceeding to bill students
    if (!config.fees || typeof config.fees !== 'object') {
        throw new Error('Fee structure (config/fees) not found in database. Please configure fees first.');
    }

    const updates = {};

    // Add term to active terms
    const newActiveTerms = [...currentActiveTerms, validatedData.termKey];
    updates['config/activeTerms'] = newActiveTerms;

    // Bill all students for the new term
    // Only iterate if there are students
    if (Object.keys(students).length > 0) {
      Object.values(students).forEach(student => {
        const termFee = calculateStudentFee(
          student.studentType,
          student.gradeCategory,
          student.grade,
          config.fees // Pass the fees from the config
        );

        // Ensure student.financials and student.financials.terms exist
        const studentFinancials = student.financials || {};
        const studentTerms = studentFinancials.terms || {};

        const updatedTerms = {
          ...studentTerms,
          [validatedData.termKey]: {
            fee: termFee,
            paid: 0 // New terms start with 0 paid
          }
        };

        const newBalance = calculateStudentBalance(updatedTerms);

        updates[`students/${student.id}/financials/terms`] = updatedTerms;
        updates[`students/${student.id}/financials/balance`] = newBalance;
        updates[`students/${student.id}/updatedAt`] = new Date().toISOString();
      });
    } else {
      console.log("No students found to bill for the new term.");
    }


    // Create admin notification
    const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: validatedData.adminId,
      userRole: 'admin',
      title: 'New Term Added',
      message: `Term "${validatedData.termKey}" has been added and all students have been billed.`,
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
        message: `Term "${validatedData.termKey}" added and students billed successfully`,
        activeTerms: newActiveTerms // Return the updated list of active terms
      })
    };

  } catch (error) {
    console.error('Error adding new term:', error);

    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to add new term'
      })
    };
  }
};