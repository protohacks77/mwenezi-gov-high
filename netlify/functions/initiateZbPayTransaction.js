const admin = require('firebase-admin'); // Import the main firebase-admin module
const { z } = require('zod'); // Keep Zod if it's used for schema validation
const fetch = require('node-fetch'); // node-fetch is correctly imported for server-side fetch

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

// ZbPay API Credentials from environment variables
// IMPORTANT: For production, do NOT use default values for API keys/secrets.
// Ensure these are always pulled from environment variables.
const ZBPAY_API_KEY = process.env.ZBPAY_API_KEY;
const ZBPAY_API_SECRET = process.env.ZBPAY_API_SECRET;
const ZBPAY_BASE_URL = process.env.ZBPAY_BASE_URL || 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway';

// Validate that API keys are present
if (!ZBPAY_API_KEY || !ZBPAY_API_SECRET) {
  console.error("ZBPAY_API_KEY or ZBPAY_API_SECRET environment variables are not set. ZbPay integration may fail.");
  // In a real application, you might want to throw an error or prevent function execution
  // if critical environment variables are missing.
}

// Validation schema
const initiatePaymentSchema = z.object({
  studentId: z.string().min(1),
  amount: z.number().positive(),
  termKey: z.string().min(1),
  returnUrl: z.string().url(), // URL for user redirection after payment
  resultUrl: z.string().url() // URL for ZbPay to send webhook notifications
});

function generateOrderReference() {
  return `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function generateTransactionId() {
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
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
    const validatedData = initiatePaymentSchema.parse(body);

    console.log('🚀 Initiating ZbPay transaction:', validatedData);

    // Get student data
    // Corrected: Use db.ref().once('value')
    const studentSnapshot = await db.ref(`students/${validatedData.studentId}`).once('value');
    if (!studentSnapshot.exists()) {
      throw new Error('Student not found');
    }

    const student = studentSnapshot.val();

    // Get config for currency code
    // Corrected: Use db.ref().once('value')
    const configSnapshot = await db.ref('config').once('value');
    if (!configSnapshot.exists()) {
      throw new Error('Configuration not found. Please ensure your Firebase Realtime Database has a "config" node.');
    }

    const config = configSnapshot.val();
    const currencyCode = config.currencyCode || 840; // Default to USD if not set in config

    // Generate unique identifiers
    const orderReference = generateOrderReference();
    const transactionId = generateTransactionId();

    console.log('🔑 Generated IDs:', { orderReference, transactionId });

    // Create pending transaction record in your database
    const pendingTransaction = {
      id: transactionId,
      studentId: validatedData.studentId,
      studentName: `${student.name} ${student.surname}`,
      amount: validatedData.amount,
      type: 'zbpay',
      status: 'pending_zb_confirmation', // Initial status
      termKey: validatedData.termKey,
      orderReference: orderReference, // ZbPay's order reference
      transactionId: transactionId, // Your internal transaction ID, often same as ZbPay's transactionId
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save pending transaction to database
    // Corrected: Use db.ref().set() for direct path setting
    await db.ref(`transactions/${transactionId}`).set(pendingTransaction);
    console.log('💾 Saved pending transaction to database');

    // Prepare ZbPay request payload
    const zbPayRequest = {
      Amount: validatedData.amount,
      CurrencyCode: currencyCode,
      returnUrl: validatedData.returnUrl,
      resultUrl: validatedData.resultUrl, // This is the webhook URL for ZbPay to notify you
      orderReference: orderReference,
      transactionId: transactionId,
      // You might want to include more details for ZbPay if their API supports it,
      // e.g., customer details, product description.
      // For now, passing studentId and termKey as custom data if ZbPay allows.
      // If ZbPay doesn't support custom fields, these might be ignored.
      // Check ZbPay API docs for exact payload requirements.
      // studentId: validatedData.studentId, // Custom field, verify if ZbPay supports
      // termKey: validatedData.termKey // Custom field, verify if ZbPay supports
    };

    console.log('📡 ZbPay request payload:', zbPayRequest);

    // Make request to ZbPay API
    const zbPayResponse = await fetch(`${ZBPAY_BASE_URL}/payments/initiate-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ZBPAY_API_KEY,
        'x-api-secret': ZBPAY_API_SECRET
      },
      body: JSON.stringify(zbPayRequest)
    });

    console.log('📡 ZbPay response status:', zbPayResponse.status);

    const zbPayData = await zbPayResponse.json();
    console.log('📦 ZbPay response data:', zbPayData);

    if (!zbPayResponse.ok) {
      console.error('❌ ZbPay API error:', zbPayData);
      // If ZbPay returns an error, update the transaction status to failed
      await db.ref(`transactions/${transactionId}`).update({
        status: 'zb_initiation_failed',
        zbPayResponse: zbPayData, // Store the error response for debugging
        updatedAt: new Date().toISOString()
      });
      throw new Error(`ZbPay API error: ${zbPayData.message || zbPayData.error || 'Unknown error'}`);
    }

    // Update transaction with ZbPay response (e.g., paymentUrl, ZbPay's own transaction details)
    await db.ref(`transactions/${transactionId}`).update({
      paymentUrl: zbPayData.paymentUrl, // Store the payment URL provided by ZbPay
      zbPayResponse: zbPayData, // Store the full successful response
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Updated transaction with ZbPay response');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        paymentUrl: zbPayData.paymentUrl, // This is what your frontend needs to redirect the user
        orderReference: orderReference,
        transactionId: transactionId
      })
    };

  } catch (error) {
    console.error('💥 Error initiating ZbPay transaction:', error);

    // If an error occurred before the transaction was saved, or if it was a parsing error,
    // ensure a clean error response.
    // If 'transactionId' was generated but not saved, this won't update anything, which is fine.
    // If it was saved, the catch block for ZbPay API error above would have handled it.
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to initiate payment'
      })
    };
  }
};