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
const ZBPAY_BASE_URL = process.env.ZBPAY_BASE_URL || 'https://zbnet.zb.co.zw/wallet_sandbox-api/payments-gateway';

// Validate that API keys are present
if (!ZBPAY_API_KEY || !ZBPAY_API_SECRET) {
  console.error("ZBPAY_API_KEY or ZBPAY_API_SECRET environment variables are not set. ZbPay integration may fail.");
  // In a real application, you might want to throw an error or prevent function execution
  // if critical environment variables are missing.
}


// Validation schema for incoming query parameters
const checkStatusSchema = z.object({
  orderRef: z.string().min(1),
  txId: z.string().min(1)
});

function calculateStudentBalance(terms) {
  // Ensure terms is an object before iterating
  if (!terms || typeof terms !== 'object') {
    return 0;
  }
  return Object.values(terms).reduce((total, term) => total + ((term.fee || 0) - (term.paid || 0)), 0);
}

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Parse query parameters
    const { orderRef, txId } = event.queryStringParameters || {};

    // Validate parameters using Zod
    const validatedData = checkStatusSchema.parse({ orderRef, txId });
    console.log('Checking payment status for:', validatedData);

    // Get transaction from database
    // Corrected: Use db.ref().once('value')
    const transactionSnapshot = await db.ref(`transactions/${validatedData.txId}`).once('value');
    if (!transactionSnapshot.exists()) {
      throw new Error('Transaction not found in database for provided txId');
    }

    const transaction = transactionSnapshot.val();
    console.log('Found transaction:', transaction.id, 'Status:', transaction.status);

    // If already processed, return current status without calling ZbPay API again
    if (transaction.status === 'zb_payment_successful' || transaction.status === 'zb_payment_failed') {
      console.log('Transaction already processed, returning current status without re-checking ZbPay.');
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        },
        body: JSON.stringify({
          success: true,
          status: transaction.status,
          orderReference: transaction.orderReference,
          transactionId: transaction.id,
          amount: transaction.amount,
          zbPayStatus: transaction.zbPayStatusCheck?.status || 'N/A' // Return last known ZbPay status if available
        })
      };
    }

    // Check status with ZbPay API
    console.log('Checking with ZbPay API...');
    const zbPayResponse = await fetch(
      `${ZBPAY_BASE_URL}/payments/transaction/${validatedData.orderRef}/status/check`,
      {
        method: 'GET',
        headers: {
          'x-api-key': ZBPAY_API_KEY,
          'x-api-secret': ZBPAY_API_SECRET,
          'Content-Type': 'application/json' // Often good practice to include
        }
      }
    );

    console.log('ZbPay status check response status:', zbPayResponse.status);
    const zbPayData = await zbPayResponse.json();
    console.log('ZbPay status data:', zbPayData);

    if (!zbPayResponse.ok) {
      // Log the full error response from ZbPay if available
      console.error('ZbPay API call failed:', zbPayData);
      throw new Error(`ZbPay API error: ${zbPayData.message || zbPayData.error || 'Unknown error'}`);
    }

    const updates = {};
    let newStatus = transaction.status; // Default to current status
    let notificationTitle = 'Payment Status Update';
    let notificationMessage = 'Your ZbPay payment status has been updated.';
    let notificationType = 'info';

    // Process ZbPay status
    if (zbPayData.status === 'PAID' || zbPayData.status === 'SUCCESSFUL') {
      if (transaction.status === 'pending_zb_confirmation') {
        console.log('Payment successful, updating student financials');
        // Payment successful - update student financials
        // Corrected: Use db.ref().once('value')
        const studentSnapshot = await db.ref(`students/${transaction.studentId}`).once('value');
        if (studentSnapshot.exists()) {
          const student = studentSnapshot.val();
          const updatedTerms = { ...(student.financials?.terms || {}) };

          if (updatedTerms[transaction.termKey]) {
            // Ensure 'paid' property exists and is a number before adding
            updatedTerms[transaction.termKey].paid = (updatedTerms[transaction.termKey].paid || 0) + transaction.amount;
            const newBalance = calculateStudentBalance(updatedTerms);

            // Update student financials paths
            updates[`students/${transaction.studentId}/financials/terms/${transaction.termKey}/paid`] =
              updatedTerms[transaction.termKey].paid;
            updates[`students/${transaction.studentId}/financials/balance`] = newBalance;
            updates[`students/${transaction.studentId}/updatedAt`] = new Date().toISOString();

            newStatus = 'zb_payment_successful';
            notificationTitle = 'Payment Successful';
            notificationMessage = `ZbPay payment of $${transaction.amount.toFixed(2)} completed successfully.`;
            notificationType = 'success';

            // Create notifications
            const studentNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const adminNotificationId = `notif-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`;

            updates[`notifications/${studentNotificationId}`] = {
              id: studentNotificationId,
              userId: transaction.studentId,
              userRole: 'student',
              title: notificationTitle,
              message: notificationMessage,
              type: notificationType,
              read: false,
              createdAt: new Date().toISOString()
            };

            updates[`notifications/${adminNotificationId}`] = {
              id: adminNotificationId,
              userId: 'admin-001', // Default admin ID
              userRole: 'admin',
              title: 'ZbPay Payment Successful',
              message: `ZbPay payment of $${transaction.amount.toFixed(2)} for ${student.name} ${student.surname} completed. Ref: ${validatedData.orderRef}`,
              type: 'success',
              read: false,
              createdAt: new Date().toISOString()
            };
          } else {
            console.warn(`Term key '${transaction.termKey}' not found for student ${transaction.studentId}. Student financials not updated.`);
            newStatus = 'zb_payment_successful_term_issue'; // Custom status for successful payment but term issue
            notificationTitle = 'Payment Processed (Term Issue)';
            notificationMessage = `ZbPay payment of $${transaction.amount.toFixed(2)} completed, but term '${transaction.termKey}' not found.`;
            notificationType = 'warning';
          }
        } else {
          console.warn(`Student ${transaction.studentId} not found for transaction ${transaction.id}. Student financials not updated.`);
          newStatus = 'zb_payment_successful_student_missing'; // Custom status for successful payment but student missing
          notificationTitle = 'Payment Processed (Student Missing)';
          notificationMessage = `ZbPay payment of $${transaction.amount.toFixed(2)} completed, but student record not found.`;
          notificationType = 'warning';
        }
      } else {
        console.log(`ZbPay reported successful, but transaction status in DB is not 'pending_zb_confirmation'. No student update.`);
        newStatus = 'zb_payment_successful'; // Ensure status is marked successful
      }
    } else if (zbPayData.status === 'FAILED' || zbPayData.status === 'CANCELED') {
      console.log('Payment failed or canceled by ZbPay.');
      newStatus = 'zb_payment_failed';
      notificationTitle = 'Payment Failed';
      notificationMessage = `Your ZbPay payment for $${transaction.amount.toFixed(2)} failed. Please try again.`;
      notificationType = 'error';

      // Create failure notification
      const studentNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      updates[`notifications/${studentNotificationId}`] = {
        id: studentNotificationId,
        userId: transaction.studentId,
        userRole: 'student',
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        read: false,
        createdAt: new Date().toISOString()
      };
    } else {
      // Payment is still pending or in an unknown state
      console.log(`ZbPay status is '${zbPayData.status}'. Keeping transaction status as is.`);
      // No change to newStatus, notification, or student financials if still pending
    }

    // Update transaction status and store ZbPay response
    updates[`transactions/${transaction.id}/status`] = newStatus;
    updates[`transactions/${transaction.id}/zbPayStatusCheck`] = zbPayData; // Store the full ZbPay response
    updates[`transactions/${transaction.id}/updatedAt`] = new Date().toISOString();

    // Execute atomic update if there are changes
    if (Object.keys(updates).length > 0) {
      console.log('Executing database updates...');
      // Corrected: Use db.ref('/').update(updates)
      await db.ref('/').update(updates);
      console.log('Database updated successfully');
    } else {
      console.log('No database updates needed for this status check.');
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        status: newStatus, // Return the new or current status
        orderReference: transaction.orderReference,
        transactionId: transaction.id,
        amount: transaction.amount,
        zbPayStatus: zbPayData.status // Return the actual status from ZbPay
      })
    };

  } catch (error) {
    console.error('Error checking ZbPay status:', error);

    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to check payment status'
      })
    };
  }
};