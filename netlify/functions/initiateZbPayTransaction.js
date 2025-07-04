/**
 * This is a serverless function (e.g., for AWS Lambda, Firebase Functions)
 * that initiates a payment with the ZbPay Payment Gateway.
 *
 * It validates the incoming request, creates a pending transaction record in
 * Firebase Realtime Database, calls the ZbPay API to get a payment URL,
 * and then updates the transaction record with the response.
 */

// Use require for Node.js environment (like Firebase Functions)
const admin = require('firebase-admin');
const { z } = require('zod');
const fetch = require('node-fetch');

// --- Firebase Admin Initialization ---
// This pattern prevents re-initializing the app on every function invocation
// in a warm execution environment.
let app;
try {
  app = admin.app();
} catch (e) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Ensure the private key's newlines are correctly formatted
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}
// Use the initialized app to get the database instance
const db = admin.database(app);


// --- ZbPay Configuration ---
const ZBPAY_API_KEY = process.env.ZBPAY_API_KEY;
const ZBPAY_API_SECRET = process.env.ZBPAY_API_SECRET;
// Use the sandbox URL from the documentation for testing
const ZBPAY_BASE_URL = process.env.ZBPAY_BASE_URL || 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway';


// --- Zod Schema for Input Validation ---
// Defines the expected shape and types of the incoming request body.
const initiatePaymentSchema = z.object({
  studentId: z.string().min(1, { message: "Student ID is required" }),
  amount: z.number().positive({ message: "Amount must be a positive number" }),
  termKey: z.string().min(1, { message: "Term key is required" }),
  returnUrl: z.string().url({ message: "A valid return URL is required" }),
  resultUrl: z.string().url({ message: "A valid result URL is required" })
});


// --- Helper Functions ---
function generateOrderReference() {
  // Generates a unique reference for the order
  return `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function generateTransactionId() {
    // Generates a unique internal ID for the transaction record
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}


// --- Main Serverless Handler ---
exports.handler = async (event, context) => {
  // Handle CORS pre-flight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // Use 204 No Content for OPTIONS response
      headers: {
        'Access-Control-Allow-Origin': '*', // Be more specific in production if possible
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Set common CORS headers for all responses
  const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Reject any method that is not POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  try {
    // 1. Parse and Validate Incoming Data
    const body = JSON.parse(event.body);
    const validatedData = initiatePaymentSchema.parse(body);

    // 2. Fetch Required Data from Firebase
    const studentSnapshot = await db.ref(`students/${validatedData.studentId}`).once('value');
    if (!studentSnapshot.exists()) {
        throw new Error('Student not found');
    }
    const student = studentSnapshot.val();

    const configSnapshot = await db.ref('config').once('value');
    if (!configSnapshot.exists()) {
        throw new Error('Missing system configuration in Firebase');
    }
    const config = configSnapshot.val();
    // Default to ZWL (932) if not set, as per common use in Zimbabwe. 840 is USD.
    const currencyCode = config.currencyCode || 932;

    // 3. Generate Unique IDs for the Transaction
    const orderReference = generateOrderReference();
    const transactionId = generateTransactionId();

    // 4. Create a Pending Transaction Record in Firebase
    const pendingTransaction = {
      id: transactionId,
      studentId: validatedData.studentId,
      studentName: `${student.name} ${student.surname}`,
      amount: validatedData.amount,
      type: 'zbpay',
      status: 'pending_zb_confirmation',
      termKey: validatedData.termKey,
      orderReference,
      zbPayTransactionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.ref(`transactions/${transactionId}`).set(pendingTransaction);

    // 5. Construct the Correct ZbPay API Request Payload
    //
    // *** FIX APPLIED HERE ***
    // The payload now strictly adheres to the ZbPay API documentation.
    // - Uses `PascalCase` for `Amount` and `CurrencyCode` as specified.
    // - Uses `camelCase` for `returnUrl` and `resultUrl`.
    // - Includes `itemName` and `orderReference` which are documented.
    // - REMOVED `customerName` and `customerEmail` as they are not in the docs
    //   and were the likely cause of the "Internal Server Error".
    const zbPayRequest = {
      Amount: validatedData.amount,
      CurrencyCode: currencyCode,
      returnUrl: validatedData.returnUrl,
      resultUrl: validatedData.resultUrl,
      orderReference: orderReference,
      itemName: `School Fees for ${student.name} ${student.surname}`,
    };

    console.log('📡 ZbPay request payload:', JSON.stringify(zbPayRequest, null, 2));

    // 6. Call the ZbPay API
    const zbPayResponse = await fetch(`${ZBPAY_BASE_URL}/payments/initiate-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ZBPAY_API_KEY,
        'x-api-secret': ZBPAY_API_SECRET
      },
      body: JSON.stringify(zbPayRequest)
    });

    const responseText = await zbPayResponse.text(); // Get response as text first
    let zbPayData;

    try {
        zbPayData = JSON.parse(responseText); // Try to parse as JSON
    } catch (e) {
        // If parsing fails, the response was not JSON (e.g., HTML error page)
        console.error('ZbPay returned a non-JSON response:', responseText);
        throw new Error(`ZbPay returned an invalid response. Status: ${zbPayResponse.status}`);
    }

    // 7. Handle API Response
    if (!zbPayResponse.ok) {
      // If the API returns an error status (4xx, 5xx)
      await db.ref(`transactions/${transactionId}`).update({
        status: 'zb_initiation_failed',
        zbPayResponse: zbPayData, // Log the error response from ZbPay
        updatedAt: new Date().toISOString()
      });
      // Throw an error with the message from the API response
      throw new Error(`ZbPay API error: ${zbPayData.message || zbPayData.error || 'Unknown error'}`);
    }

    // 8. Update Transaction on Success
    await db.ref(`transactions/${transactionId}`).update({
      status: 'pending_payment', // Status updated, waiting for user to pay
      paymentUrl: zbPayData.paymentUrl,
      zbPayTransactionId: zbPayData.transactionId || zbPayData.reference || null,
      zbPayResponse: zbPayData,
      updatedAt: new Date().toISOString()
    });

    // 9. Return Success Response to Client
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        paymentUrl: zbPayData.paymentUrl,
        orderReference: orderReference,
        transactionId: transactionId
      })
    };

  } catch (error) {
    // Catch all errors (validation, Firebase, API call, etc.)
    console.error('💥 ZbPay Initiation Error:', error);

    // Differentiate between Zod validation errors and other errors
    if (error instanceof z.ZodError) {
        return {
            statusCode: 400, // Bad Request
            headers: corsHeaders,
            body: JSON.stringify({ success: false, errors: error.flatten().fieldErrors })
        };
    }

    return {
      statusCode: 500, // Internal Server Error for other issues
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to initiate payment due to an internal error.'
      })
    };
  }
};
