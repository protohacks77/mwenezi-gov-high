const { getDatabase, ref, get } = require('firebase-admin/database')
const { initializeApp, cert } = require('firebase-admin/app')

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

// Simple PDF generation using HTML
function generatePDFContent(data) {
  const { date, bursarUsername, transactions, summary } = data
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bursar Daily Report - ${date}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
        .transactions { width: 100%; border-collapse: collapse; }
        .transactions th, .transactions td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .transactions th { background-color: #6D282C; color: white; }
        .total { font-weight: bold; background-color: #f9f9f9; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mwenezi High School</h1>
        <h2>Daily Bursar Report</h2>
        <p>Date: ${new Date(date).toLocaleDateString()}</p>
        <p>Bursar: ${bursarUsername}</p>
    </div>
    
    <div class="summary">
        <h3>Summary</h3>
        <p><strong>Total Amount Collected:</strong> $${summary.totalAmount.toFixed(2)}</p>
        <p><strong>Number of Transactions:</strong> ${summary.transactionCount}</p>
        <p><strong>Average per Transaction:</strong> $${summary.transactionCount > 0 ? (summary.totalAmount / summary.transactionCount).toFixed(2) : '0.00'}</p>
    </div>
    
    <h3>Transaction Details</h3>
    <table class="transactions">
        <thead>
            <tr>
                <th>Time</th>
                <th>Student Name</th>
                <th>Receipt Number</th>
                <th>Amount</th>
                <th>Term</th>
            </tr>
        </thead>
        <tbody>
            ${transactions.map(tx => `
                <tr>
                    <td>${new Date(tx.createdAt).toLocaleTimeString()}</td>
                    <td>${tx.studentName}</td>
                    <td>${tx.receiptNumber}</td>
                    <td>$${tx.amount.toFixed(2)}</td>
                    <td>${tx.termKey ? tx.termKey.replace('_', ' ') : 'N/A'}</td>
                </tr>
            `).join('')}
            <tr class="total">
                <td colspan="3"><strong>Total</strong></td>
                <td><strong>$${summary.totalAmount.toFixed(2)}</strong></td>
                <td></td>
            </tr>
        </tbody>
    </table>
    
    <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>"Relevant Education for Livelihood"</p>
    </div>
</body>
</html>
  `
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
    }
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
    }
  }

  try {
    const body = JSON.parse(event.body)
    
    // Generate HTML content
    const htmlContent = generatePDFContent(body)
    
    // For now, return HTML that can be printed as PDF by the browser
    // In production, you might want to use a service like Puppeteer
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="bursar-report-${body.date}-${body.bursarUsername}.html"`
      },
      body: htmlContent
    }

  } catch (error) {
    console.error('Error generating report:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate report'
      })
    }
  }
}