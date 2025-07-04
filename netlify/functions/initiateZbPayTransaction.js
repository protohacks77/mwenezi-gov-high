const admin = require('firebase-admin');
const { z } = require('zod');
const fetch = require('node-fetch');

// Initialize Firebase Admin
let app;
try {
  app = admin.app();
} catch (e) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}
const db = admin.database(app);

// ZbPay credentials
const ZBPAY_API_KEY = process.env.ZBPAY_API_KEY;
const ZBPAY_API_SECRET = process.env.ZBPAY_API_SECRET;
const ZBPAY_BASE_URL = process.env.ZBPAY_BASE_URL || 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway';

const initiatePaymentSchema = z.object({
  studentId: z.string().min(1),
  amount: z.number().positive(),
  termKey: z.string().min(1),
  returnUrl: z.string().url(),
  resultUrl: z.string().url()
});

function generateOrderReference() {
  return `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
function generateTransactionId() {
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

exports.handler = async (event, context) => {
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const validatedData = initiatePaymentSchema.parse(body);

    const studentSnapshot = await db.ref(`students/${validatedData.studentId}`).once('value');
    if (!studentSnapshot.exists()) throw new Error('Student not found');
    const student = studentSnapshot.val();

    const configSnapshot = await db.ref('config').once('value');
    if (!configSnapshot.exists()) throw new Error('Missing system config');
    const config = configSnapshot.val();
    const currencyCode = config.currencyCode || 840;

    const orderReference = generateOrderReference();
    const transactionId = generateTransactionId();

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

    const zbPayRequest = {
      Amount: validatedData.amount,
      CurrencyCode: currencyCode,
      returnUrl: validatedData.returnUrl,
      resultUrl: validatedData.resultUrl,
      orderReference,
      itemName: `Fees for ${student.name} ${student.surname}`, // ✅ Required
      customerName: `${student.name} ${student.surname}`,      // ✅ Recommended
      customerEmail: student.email || 'no-reply@example.com'   // ✅ Recommended fallback
    };

    console.log('📡 ZbPay request payload:', JSON.stringify(zbPayRequest, null, 2));

    const zbPayResponse = await fetch(`${ZBPAY_BASE_URL}/payments/initiate-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ZBPAY_API_KEY,
        'x-api-secret': ZBPAY_API_SECRET
      },
      body: JSON.stringify(zbPayRequest)
    });

    const contentType = zbPayResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorHtml = await zbPayResponse.text();
      throw new Error(`ZbPay returned non-JSON response: ${errorHtml.slice(0, 100)}...`);
    }

    const zbPayData = await zbPayResponse.json();

    if (!zbPayResponse.ok) {
      await db.ref(`transactions/${transactionId}`).update({
        status: 'zb_initiation_failed',
        zbPayResponse: zbPayData,
        updatedAt: new Date().toISOString()
      });
      throw new Error(`ZbPay API error: ${zbPayData.message || zbPayData.error || 'Unknown error'}`);
    }

    await db.ref(`transactions/${transactionId}`).update({
      paymentUrl: zbPayData.paymentUrl,
      zbPayTransactionId: zbPayData.transactionId || zbPayData.reference || null,
      zbPayResponse: zbPayData,
      updatedAt: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        paymentUrl: zbPayData.paymentUrl,
        orderReference,
        transactionId
      })
    };

  } catch (error) {
    console.error('💥 ZbPay Initiation Error:', error);
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to initiate payment'
      })
    };
  }
};
