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

function generateStudentReportHTML(data) {
  const { student, transactions, generatedBy, generatedAt } = data
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Student Financial Report - ${student.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6D282C; padding-bottom: 20px; }
        .school-name { color: #6D282C; font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .slogan { color: #f59e0b; font-style: italic; font-size: 14px; }
        .student-info { background: #f8f9fa; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { margin-bottom: 10px; }
        .label { font-weight: bold; color: #6D282C; }
        .value { margin-left: 10px; }
        .balance { font-size: 18px; font-weight: bold; }
        .balance.positive { color: #dc3545; }
        .balance.zero { color: #28a745; }
        .terms-table, .transactions-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .terms-table th, .terms-table td, .transactions-table th, .transactions-table td { 
            border: 1px solid #ddd; padding: 10px; text-align: left; 
        }
        .terms-table th, .transactions-table th { background-color: #6D282C; color: white; }
        .section-title { color: #6D282C; font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
        .status-paid { color: #28a745; font-weight: bold; }
        .status-due { color: #dc3545; font-weight: bold; }
        .status-completed { color: #28a745; }
        .status-pending { color: #ffc107; }
        .status-failed { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <div class="school-name">Mwenezi High School</div>
        <div class="slogan">"Relevant Education for Livelihood"</div>
        <h2>Student Financial Report</h2>
        <p>Generated on ${new Date(generatedAt).toLocaleDateString()} by ${generatedBy}</p>
    </div>
    
    <div class="student-info">
        <h3 class="section-title">Student Information</h3>
        <div class="info-grid">
            <div class="info-item">
                <span class="label">Name:</span>
                <span class="value">${student.name}</span>
            </div>
            <div class="info-item">
                <span class="label">Student Number:</span>
                <span class="value">${student.studentNumber}</span>
            </div>
            <div class="info-item">
                <span class="label">Grade:</span>
                <span class="value">${student.grade}</span>
            </div>
            <div class="info-item">
                <span class="label">Student Type:</span>
                <span class="value">${student.studentType}</span>
            </div>
            <div class="info-item">
                <span class="label">Guardian Phone:</span>
                <span class="value">${student.guardianPhone}</span>
            </div>
            <div class="info-item">
                <span class="label">Outstanding Balance:</span>
                <span class="value balance ${student.balance <= 0 ? 'zero' : 'positive'}">
                    $${student.balance.toFixed(2)}
                </span>
            </div>
        </div>
    </div>
    
    <h3 class="section-title">Term Breakdown</h3>
    <table class="terms-table">
        <thead>
            <tr>
                <th>Term</th>
                <th>Fee Amount</th>
                <th>Amount Paid</th>
                <th>Balance</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(student.terms).map(([termKey, term]) => {
                const balance = term.fee - term.paid
                const status = balance <= 0 ? 'Paid' : 'Due'
                return `
                <tr>
                    <td>${termKey.replace('_', ' ')}</td>
                    <td>$${term.fee.toFixed(2)}</td>
                    <td>$${term.paid.toFixed(2)}</td>
                    <td>$${balance.toFixed(2)}</td>
                    <td class="${balance <= 0 ? 'status-paid' : 'status-due'}">${status}</td>
                </tr>
                `
            }).join('')}
        </tbody>
    </table>
    
    <h3 class="section-title">Payment History</h3>
    ${transactions.length > 0 ? `
    <table class="transactions-table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Term</th>
                <th>Receipt/Reference</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${transactions.map(transaction => `
                <tr>
                    <td>${new Date(transaction.createdAt).toLocaleDateString()}</td>
                    <td>${transaction.type === 'cash' ? 'Cash Payment' : transaction.type === 'zbpay' ? 'ZbPay Payment' : 'Fee Adjustment'}</td>
                    <td>$${transaction.amount.toFixed(2)}</td>
                    <td>${transaction.termKey ? transaction.termKey.replace('_', ' ') : 'N/A'}</td>
                    <td>${transaction.receiptNumber || transaction.orderReference || 'N/A'}</td>
                    <td class="status-${transaction.status.includes('completed') || transaction.status.includes('successful') ? 'completed' : transaction.status.includes('pending') ? 'pending' : 'failed'}">
                        ${transaction.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    ` : '<p>No payment history available.</p>'}
    
    <div class="footer">
        <p><strong>Mwenezi High School</strong> | Financial Management System</p>
        <p>This report was generated electronically and is valid without signature.</p>
        <p>For inquiries, contact the school administration.</p>
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
    const reportData = JSON.parse(event.body)
    
    // Generate HTML content
    const htmlContent = generateStudentReportHTML(reportData)
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="student-report-${reportData.student.studentNumber}-${new Date().toISOString().split('T')[0]}.html"`
      },
      body: htmlContent
    }

  } catch (error) {
    console.error('Error generating student report:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate student report'
      })
    }
  }
}