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
// Note: Double-check this base URL against the ZbPay documentation for exact match.
// The documentation sometimes shows slight variations (e.g., 'payment' vs 'payments-gateway').
// Ensure it matches what ZbPay expects for 'initiate-transaction'.
const ZBPAY_BASE_URL = process.env.ZBPAY_BASE_URL || 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway';

// Validate that API keys are present
if (!ZBPAY_API_KEY || !ZBPAY_API_SECRET) {
  console.error("ZBPAY_API_KEY or ZBPAY_API_SECRET environment variables are not set. ZbPay integration may fail.");
  // In a real application, you might want to throw an error or prevent function execution
  // if critical environment variables are missing.
}

// Validation schema for the incoming request body from your frontend
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
    // Parse and validate input from your frontend
    const body = JSON.parse(event.body);
    const validatedData = initiatePaymentSchema.parse(body);

    console.log('🚀 Initiating ZbPay transaction with data:', validatedData);

    // Get student data from your database
    const studentSnapshot = await db.ref(`students/${validatedData.studentId}`).once('value');
    if (!studentSnapshot.exists()) {
      throw new Error('Student not found in your database.');
    }
    const student = studentSnapshot.val();

    // Get config for currency code from your database
    const configSnapshot = await db.ref('config').once('value');
    if (!configSnapshot.exists()) {
      throw new Error('Configuration not found in your database. Please ensure your Firebase Realtime Database has a "config" node.');
    }
    const config = configSnapshot.val();
    const currencyCode = config.currencyCode || 840; // Default to USD (840) if not set in config

    // Generate unique identifiers for your internal tracking and for ZbPay
    const orderReference = generateOrderReference(); // Your internal order reference
    const transactionId = generateTransactionId(); // Your internal transaction ID

    console.log('🔑 Generated internal IDs:', { orderReference, transactionId });

    // Create a pending transaction record in your database for tracking
    const pendingTransaction = {
      id: transactionId,
      studentId: validatedData.studentId,
      studentName: `${student.name} ${student.surname}`,
      amount: validatedData.amount,
      type: 'zbpay',
      status: 'pending_zb_confirmation', // Initial status before ZbPay confirms
      termKey: validatedData.termKey,
      orderReference: orderReference, // This will be sent to ZbPay
      zbPayTransactionId: null, // Placeholder for ZbPay's transaction ID if they return a different one
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save pending transaction to your database
    await db.ref(`transactions/${transactionId}`).set(pendingTransaction);
    console.log('💾 Saved pending transaction to database:', transactionId);

    // Prepare ZbPay request payload based on their documentation (Standard Checkout)
    // Removed 'transactionId', 'studentId', 'termKey' from this payload as they are not
    // explicitly listed as request parameters for 'initiate-transaction' in the provided docs.
    const zbPayRequest = {
      Amount: validatedData.amount,
      CurrencyCode: currencyCode,
      returnUrl: validatedData.returnUrl,
      resultUrl: validatedData.resultUrl, // This is the webhook URL for ZbPay to notify you
      orderReference: orderReference, // This is explicitly required by ZbPay
    };

    console.log('📡 ZbPay request payload being sent:', zbPayRequest);

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
      console.error('❌ ZbPay API returned an error response:', zbPayData);
      // If ZbPay returns an error, update the transaction status to failed in your DB
      await db.ref(`transactions/${transactionId}`).update({
        status: 'zb_initiation_failed',
        zbPayResponse: zbPayData, // Store the full error response for debugging
        updatedAt: new Date().toISOString()
      });
      throw new Error(`ZbPay API error: ${zbPayData.message || zbPayData.error || 'Unknown error'}`);
    }

    // Update your transaction record with the successful response from ZbPay
    await db.ref(`transactions/${transactionId}`).update({
      paymentUrl: zbPayData.paymentUrl, // Store the payment URL provided by ZbPay
      zbPayResponse: zbPayData, // Store the full successful response
      // If ZbPay returns its own transaction ID, store it here
      zbPayTransactionId: zbPayData.transactionId || zbPayData.reference || null,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Updated internal transaction with ZbPay response. Payment URL received.');

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
        transactionId: transactionId // Your internal transaction ID
      })
    };

  } catch (error) {
    console.error('💥 Error initiating ZbPay transaction:', error);

    // If an error occurred before the transaction was saved, or if it was a parsing error,
    // ensure a clean error response.
    // If 'transactionId' was generated but not saved, this won't update anything, which is fine.
    // If it was saved and the ZbPay API call failed, the `await db.ref(...).update` above would have handled it.
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