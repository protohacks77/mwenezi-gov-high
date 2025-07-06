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

function generateFinancialReportHTML(data) {
  const { transactions, summary, chartData, generatedAt } = data
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Financial Activity Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6D282C; padding-bottom: 20px; }
        .school-name { color: #6D282C; font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .slogan { color: #f59e0b; font-style: italic; font-size: 14px; }
        .summary { background: #f8f9fa; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .summary-item { text-align: center; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #6D282C; }
        .summary-value { font-size: 24px; font-weight: bold; color: #6D282C; }
        .summary-label { color: #666; font-size: 14px; }
        .chart-section { margin: 20px 0; }
        .chart-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .chart-table th, .chart-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .chart-table th { background-color: #6D282C; color: white; }
        .transactions-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .transactions-table th, .transactions-table td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        .transactions-table th { background-color: #6D282C; color: white; }
        .section-title { color: #6D282C; font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
        .status-completed { color: #28a745; font-weight: bold; }
        .status-pending { color: #ffc107; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .type-cash { color: #f59e0b; }
        .type-zbpay { color: #6D282C; }
        .type-adjustment { color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <div class="school-name">Mwenezi High School</div>
        <div class="slogan">"Relevant Education for Livelihood"</div>
        <h2>Financial Activity Report</h2>
        <p>Generated on ${new Date(generatedAt).toLocaleDateString()}</p>
    </div>
    
    <div class="summary">
        <h3 class="section-title">Summary</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">$${summary.totalRevenue.toFixed(2)}</div>
                <div class="summary-label">Total Revenue</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${summary.cashPayments}</div>
                <div class="summary-label">Cash Payments</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${summary.zbPayments}</div>
                <div class="summary-label">ZbPay Payments</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${summary.totalTransactions}</div>
                <div class="summary-label">Total Transactions</div>
            </div>
        </div>
    </div>
    
    <div class="chart-section">
        <h3 class="section-title">Daily Revenue (Last 7 Days)</h3>
        <table class="chart-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Total Revenue</th>
                    <th>Cash Payments</th>
                    <th>ZbPay Payments</th>
                    <th>Transaction Count</th>
                </tr>
            </thead>
            <tbody>
                ${chartData.map(day => `
                    <tr>
                        <td>${day.date}</td>
                        <td>$${day.total.toFixed(2)}</td>
                        <td>$${day.cash.toFixed(2)}</td>
                        <td>$${day.zbpay.toFixed(2)}</td>
                        <td>${day.count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    
    <h3 class="section-title">Recent Transactions</h3>
    <table class="transactions-table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reference</th>
            </tr>
        </thead>
        <tbody>
            ${transactions.slice(0, 50).map(transaction => `
                <tr>
                    <td>${new Date(transaction.createdAt).toLocaleDateString()}</td>
                    <td>${transaction.studentName}</td>
                    <td class="type-${transaction.type}">${transaction.type.toUpperCase()}</td>
                    <td>$${transaction.amount.toFixed(2)}</td>
                    <td class="status-${transaction.status.includes('completed') || transaction.status.includes('successful') ? 'completed' : transaction.status.includes('pending') ? 'pending' : 'failed'}">
                        ${transaction.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td>${transaction.receiptNumber || transaction.orderReference || 'N/A'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="footer">
        <p><strong>Mwenezi High School</strong> | Financial Management System</p>
        <p>This report was generated electronically and contains the latest financial data.</p>
        <p>For detailed analysis or inquiries, contact the administration.</p>
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
    const htmlContent = generateFinancialReportHTML(reportData)
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="financial-activity-report-${new Date().toISOString().split('T')[0]}.html"`
      },
      body: htmlContent
    }

  } catch (error) {
    console.error('Error generating financial report:', error)
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate financial report'
      })
    }
  }
}