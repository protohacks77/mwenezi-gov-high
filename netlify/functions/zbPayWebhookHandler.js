
const admin = require('firebase-admin'); // Import the main firebase-admin module
const { z } = require('zod'); // Assuming Zod is still a dependency for other functions or future use

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

// Validation schema (if used for webhook data, otherwise remove)
// Note: The webhook data structure seems to be defined implicitly by usage,
// but if you want to validate it with Zod, you'd define a schema for it.
// For now, I'll keep the calculateStudentBalance and other helper functions.

function calculateStudentBalance(terms) {
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

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: '' // Empty body for OPTIONS requests
    };
  }

  try {
    // Parse webhook payload
    const webhookData = JSON.parse(event.body);
    console.log('Received ZbPay webhook:', webhookData);

    const { orderReference, status, amount, transactionId } = webhookData; // Destructure directly from webhookData

    if (!orderReference) {
      throw new Error('Missing orderReference in webhook');
    }

    // Find transaction by orderReference
    // Corrected: Use db.ref().once('value') instead of get(ref(db, ...))
    const transactionsSnapshot = await db.ref('transactions').once('value');
    if (!transactionsSnapshot.exists()) {
      console.log('No transactions collection found.'); // Log instead of throwing if it might be empty
      throw new Error('No transactions found in database'); // Or handle gracefully
    }

    const transactions = transactionsSnapshot.val();
    // Ensure transactions is an object before using Object.values
    const transaction = transactions ? Object.values(transactions).find(t => t.orderReference === orderReference) : null;

    if (!transaction) {
      throw new Error(`Transaction not found for orderReference: ${orderReference}`);
    }

    console.log('Found transaction:', transaction.id, 'Current status:', transaction.status);

    // Only process if transaction is still pending
    if (transaction.status !== 'pending_zb_confirmation') {
      console.log(`Transaction ${transaction.id} already processed, status: ${transaction.status}`);
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Already processed' })
      };
    }

    const updates = {};
    let newStatus = 'zb_payment_failed';
    let notificationTitle = 'Payment Failed';
    let notificationMessage = 'Your ZbPay payment failed. Please try again.';
    let notificationType = 'error';

    // Process based on webhook status
    if (status === 'PAID' || status === 'SUCCESSFUL') {
      console.log('Processing successful payment via webhook');
      // Payment successful - update student financials
      // Corrected: Use db.ref().once('value')
      const studentSnapshot = await db.ref(`students/${transaction.studentId}`).once('value');
      if (studentSnapshot.exists()) {
        const student = studentSnapshot.val();
        const updatedTerms = { ...student.financials.terms };

        if (updatedTerms[transaction.termKey]) {
          // Ensure amount is a number for addition
          updatedTerms[transaction.termKey].paid = (updatedTerms[transaction.termKey].paid || 0) + parseFloat(transaction.amount);
          const newBalance = calculateStudentBalance(updatedTerms);

          // Update student financials paths
          updates[`students/${transaction.studentId}/financials/terms/${transaction.termKey}/paid`] =
            updatedTerms[transaction.termKey].paid;
          updates[`students/${transaction.studentId}/financials/balance`] = newBalance;
          updates[`students/${transaction.studentId}/updatedAt`] = new Date().toISOString();

          newStatus = 'zb_payment_successful';
          notificationTitle = 'Payment Successful';
          notificationMessage = `ZbPay payment of $${parseFloat(transaction.amount).toFixed(2)} completed successfully.`;
          notificationType = 'success';

          // Create admin notification
          const adminNotificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          updates[`notifications/${adminNotificationId}`] = {
            id: adminNotificationId,
            userId: 'admin-001',
            userRole: 'admin',
            title: 'ZbPay Payment Successful',
            message: `ZbPay payment of $${parseFloat(transaction.amount).toFixed(2)} for ${student.name} ${student.surname} completed. Ref: ${orderReference}`,
            type: 'success',
            read: false,
            createdAt: new Date().toISOString()
          };
        } else {
          console.warn(`Term key '${transaction.termKey}' not found for student ${transaction.studentId}. Payment not applied to term.`);
          // You might want to handle this case, e.g., log it and still mark transaction as successful
          newStatus = 'zb_payment_successful_term_issue'; // Custom status
          notificationTitle = 'Payment Processed (Term Issue)';
          notificationMessage = `ZbPay payment of $${parseFloat(transaction.amount).toFixed(2)} completed, but term '${transaction.termKey}' not found.`;
          notificationType = 'warning';
        }
      } else {
        console.warn(`Student ${transaction.studentId} not found for transaction ${transaction.id}. Financials not updated.`);
        // Still mark transaction as successful if payment was confirmed by ZbPay
        newStatus = 'zb_payment_successful_student_missing';
        notificationTitle = 'Payment Processed (Student Missing)';
        notificationMessage = `ZbPay payment of $${parseFloat(transaction.amount).toFixed(2)} completed, but student not found.`;
        notificationType = 'warning';
      }
    }

    // Update transaction status
    updates[`transactions/${transaction.id}/status`] = newStatus;
    updates[`transactions/${transaction.id}/webhookData`] = webhookData;
    updates[`transactions/${transaction.id}/updatedAt`] = new Date().toISOString();

    // Create student notification
    const studentNotificationId = `notif-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`;
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

    // Execute atomic update
    console.log('Executing webhook database updates...');
    // Corrected: Use db.ref('/').update(updates)
    await db.ref('/').update(updates);

    console.log(`Successfully processed webhook for transaction ${transaction.id}`);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true, // Add success: true for consistency with frontend
        message: 'Webhook processed successfully',
        transactionId: transaction.id,
        status: newStatus
      })
    };

  } catch (error) {
    console.error('Error processing ZbPay webhook:', error);

    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false, // Add success: false for consistency with frontend
        error: error.message || 'Failed to process webhook'
      })
    };
  }
};
