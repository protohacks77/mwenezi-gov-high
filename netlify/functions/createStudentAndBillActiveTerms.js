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
const createStudentSchema = z.object({
  name: z.string().min(1),
  surname: z.string().min(1),
  studentNumber: z.string().min(1),
  studentType: z.enum(['Day Scholar', 'Boarder']),
  gradeCategory: z.enum(['ZJC', 'OLevel', 'ALevel']),
  grade: z.string().min(1),
  guardianPhoneNumber: z.string().min(1),
  adminId: z.string().min(1)
});

function calculateStudentFee(studentType, gradeCategory, grade, fees) {
  // Ensure fees and its nested properties exist before accessing
  if (!fees || !fees.boarder || !fees.dayScholar) {
    console.error("Fee structure is incomplete or missing in config for calculateStudentFee.");
    return 0; // Return 0 if fee structure is not properly defined
  }

  const feeStructure = studentType === 'Boarder' ? fees.boarder : fees.dayScholar;

  switch (gradeCategory) {
    case 'ZJC':
      return feeStructure.zjc || 0;
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

function generateStudentId() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `MHS-${timestamp}${random}`;
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
    const validatedData = createStudentSchema.parse(body);

    // Generate new student ID
    const studentId = generateStudentId();

    // Get current config (active terms and fees)
    // Corrected: Use db.ref().once('value')
    const configSnapshot = await db.ref('config').once('value');
    if (!configSnapshot.exists()) {
      throw new Error('School configuration not found. Please ensure your Firebase Realtime Database has a "config" node.');
    }

    const config = configSnapshot.val();
    const activeTerms = Array.isArray(config.activeTerms) ? config.activeTerms : []; // Ensure activeTerms is an array
    const fees = config.fees;

    // Validate that fees are configured
    if (!fees || typeof fees !== 'object') {
      throw new Error('Fee structure (config/fees) not found in database. Please configure fees first.');
    }

    // Check if studentNumber already exists
    // Corrected: Use db.ref().orderByChild().equalTo().once() for efficient lookup
    const existingStudentSnapshot = await db.ref('students')
      .orderByChild('studentNumber')
      .equalTo(validatedData.studentNumber)
      .once('value');

    if (existingStudentSnapshot.exists()) {
      throw new Error(`Student with number ${validatedData.studentNumber} already exists.`);
    }


    // Calculate fee for this student
    const termFee = calculateStudentFee(
      validatedData.studentType,
      validatedData.gradeCategory,
      validatedData.grade,
      fees
    );

    // Build terms object and calculate total balance
    const terms = {};
    let totalBalance = 0;

    // Only bill for active terms if there are any
    if (activeTerms.length > 0) {
      activeTerms.forEach(termKey => {
        terms[termKey] = {
          fee: termFee,
          paid: 0
        };
        totalBalance += termFee;
      });
    } else {
      console.warn("No active terms configured. Student will be created with 0 balance for now.");
      // You might want to add a default term or handle this case specifically in your UI
    }


    // Create student record
    const newStudent = {
      id: studentId,
      name: validatedData.name,
      surname: validatedData.surname,
      studentNumber: validatedData.studentNumber,
      studentType: validatedData.studentType,
      gradeCategory: validatedData.gradeCategory,
      grade: validatedData.grade,
      guardianPhoneNumber: validatedData.guardianPhoneNumber,
      financials: {
        balance: totalBalance,
        terms: terms
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create user account for student
    const newUser = {
      id: studentId,
      username: validatedData.studentNumber, // Using studentNumber as default username
      password: 'student123', // IMPORTANT: Default password. Consider a more secure initial password or flow.
      role: 'student',
      createdAt: new Date().toISOString()
    };

    // Atomic write - create both student and user records
    const updates = {};
    updates[`students/${studentId}`] = newStudent;
    updates[`users/${studentId}`] = newUser;

    // Create notifications
    const welcomeNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const adminNotificationId = `notif-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`;

    updates[`notifications/${welcomeNotificationId}`] = {
      id: welcomeNotificationId,
      userId: studentId,
      userRole: 'student',
      title: 'Welcome to Mwenezi High!',
      message: `Your account has been created. Your balance is $${totalBalance.toFixed(2)}.`,
      type: 'info',
      read: false,
      createdAt: new Date().toISOString()
    };

    updates[`notifications/${adminNotificationId}`] = {
      id: adminNotificationId,
      userId: validatedData.adminId,
      userRole: 'admin',
      title: 'New Student Added',
      message: `New student ${validatedData.name} ${validatedData.surname} (${validatedData.studentNumber}) added to ${validatedData.grade}.`,
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
        studentId: studentId,
        studentNumber: validatedData.studentNumber,
        totalBalance: totalBalance
      })
    };

  } catch (error) {
    console.error('Error creating student:', error);

    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to create student'
      })
    };
  }
};