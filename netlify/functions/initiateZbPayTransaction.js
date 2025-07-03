const { getDatabase, ref, get, set, update } = require('firebase-admin/database')
const { initializeApp, cert } = require('firebase-admin/app')
const { z } = require('zod')
const fetch = require('node-fetch')

// Initialize Firebase Admin
let app
try {
  app = require('firebase-admin').app()
} catch (e) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  })
}

const db = getDatabase(app)

// ZbPay API Credentials from environment variables
const ZBPAY_API_KEY = process.env.ZBPAY_API_KEY || '3f36fd4b-3b23-4249-b65d-f39dc9df42d4'
const ZBPAY_API_SECRET = process.env.ZBPAY_API_SECRET || '2f2c32d7-7a32-4523-bcde-1913bf7c171d'
const ZBPAY_BASE_URL = process.env.ZBPAY_BASE_URL || 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway'

// Validation schema
const initiatePaymentSchema = z.object({
  studentId: z.string().min(1),
  amount: z.number().positive(),
  termKey: z.string().min(1),
  returnUrl: z.string().url(),
  resultUrl: z.string().url()
})

function generateOrderReference() {
  return `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

function generateTransactionId() {
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`
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
    }
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
    }
  }

  try {
    // Parse and validate input
    const body = JSON.parse(event.body)
    const validatedData = initiatePaymentSchema.parse(body)

    console.log('Initiating ZbPay transaction:', validatedData)

    // Get student data
    const studentSnapshot = await get(ref(db, `students/${validatedData.studentId}`))
    if (!studentSnapshot.exists()) {
      throw new Error('Student not found')
    }

    const student = studentSnapshot.val()

    // Get config for currency code
    const configSnapshot = await get(ref(db, 'config'))
    if (!configSnapshot.exists()) {
      throw new Error('Configuration not found')
    }

    const config = configSnapshot.val()
    const currencyCode = config.currencyCode || 840 // Default to USD

    // Generate unique identifiers
    const orderReference = generateOrderReference()
    const transactionId = generateTransactionId()

    console.log('Generated IDs:', { orderReference, transactionId })

    // Create pending transaction record
    const pendingTransaction = {
      id: transactionId,
      studentId: validatedData.studentId,
      studentName: `${student.name} ${student.surname}`,
      amount: validatedData.amount,
      type: 'zbpay',
      status: 'pending_zb_confirmation',
      termKey: validatedData.termKey,
      orderReference: orderReference,
      transactionId: transactionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Save pending transaction to database
    await set(ref(db, `transactions/${transactionId}`), pendingTransaction)
    console.log('Saved pending transaction to database')

    // Prepare ZbPay request
    const zbPayRequest = {
      Amount: validatedData.amount,
      CurrencyCode: currencyCode,
      returnUrl: validatedData.returnUrl,
      resultUrl: validatedData.resultUrl,
      orderReference: orderReference,
      transactionId: transactionId,
      studentId: validatedData.studentId,
      termKey: validatedData.termKey
    }

    console.log('ZbPay request payload:', zbPayRequest)

    // Make request to ZbPay API
    const zbPayResponse = await fetch(`${ZBPAY_BASE_URL}/payments/initiate-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ZBPAY_API_KEY,
        'x-api-secret': ZBPAY_API_SECRET
      },
      body: JSON.stringify(zbPayRequest)
    })

    console.log('ZbPay response status:', zbPayResponse.status)
    
    const zbPayData = await zbPayResponse.json()
    console.log('ZbPay response data:', zbPayData)

    if (!zbPayResponse.ok) {
      throw new Error(`ZbPay API error: ${zbPayData.message || 'Unknown error'}`)
    }

    // Update transaction with ZbPay response
    await update(ref(db, `transactions/${transactionId}`), {
      zbPayResponse: zbPayData,
      updatedAt: new Date().toISOString()
    })

    console.log('Updated transaction with ZbPay response')

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
        orderReference: orderReference,
        transactionId: transactionId
      })
    }

  } catch (error) {
    console.error('Error initiating ZbPay transaction:', error)
    
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
    }
  }
}