
const admin = require('firebase-admin'); // Import the main firebase-admin module
// No need for 'z' (zod) if not used in this specific function

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

// Simple PDF generation using HTML
function generatePDFContent(data) {
  const { date, bursarUsername, transactions, summary } = data;

  // Basic validation for data to prevent errors in template
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeSummary = summary || { totalAmount: 0, transactionCount: 0 };

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bursar Daily Report - ${new Date(date).toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6D282C; padding-bottom: 15px; }
        .header h1 { color: #6D282C; margin: 0; font-size: 28px; }
        .header h2 { color: #555; margin: 5px 0 15px; font-size: 22px; }
        .header p { margin: 5px 0; font-size: 14px; color: #666; }
        .summary { background: #f9f9f9; padding: 20px; margin-bottom: 30px; border-radius: 8px; border: 1px solid #eee; }
        .summary h3 { color: #6D282C; margin-top: 0; margin-bottom: 15px; font-size: 18px; }
        .summary p { margin: 8px 0; font-size: 15px; }
        .transactions { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .transactions th, .transactions td { border: 1px solid #e0e0e0; padding: 12px; text-align: left; font-size: 14px; }
        .transactions th { background-color: #6D282C; color: white; text-transform: uppercase; letter-spacing: 0.5px; }
        .transactions tbody tr:nth-child(even) { background-color: #f5f5f5; }
        .transactions tbody tr:hover { background-color: #e8e8e8; }
        .total { font-weight: bold; background-color: #e0e0e0; }
        .total td { font-size: 16px; padding: 15px 12px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mwenezi High School</h1>
        <h2>Daily Bursar Report</h2>
        <p>Date: ${new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p>Bursar: ${bursarUsername}</p>
    </div>

    <div class="summary">
        <h3>Summary</h3>
        <p><strong>Total Amount Collected:</strong> $${safeSummary.totalAmount.toFixed(2)}</p>
        <p><strong>Number of Transactions:</strong> ${safeSummary.transactionCount}</p>
        <p><strong>Average per Transaction:</strong> $${safeSummary.transactionCount > 0 ? (safeSummary.totalAmount / safeSummary.transactionCount).toFixed(2) : '0.00'}</p>
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
            ${safeTransactions.length > 0 ? safeTransactions.map(tx => `
                <tr>
                    <td>${new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                    <td>${tx.studentName || 'N/A'}</td>
                    <td>${tx.receiptNumber || 'N/A'}</td>
                    <td>$${(tx.amount || 0).toFixed(2)}</td>
                    <td>${tx.termKey ? tx.termKey.replace(/_/g, ' ') : 'N/A'}</td>
                </tr>
            `).join('') : `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px;">No transactions for this date.</td>
                </tr>
            `}
            <tr class="total">
                <td colspan="3"><strong>Total</strong></td>
                <td><strong>$${safeSummary.totalAmount.toFixed(2)}</strong></td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        <p>Generated on ${new Date().toLocaleString('en-US')}</p>
        <p>"Relevant Education for Livelihood"</p>
    </div>
</body>
</html>
  `;
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
    };
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
    };
  }

  try {
    const body = JSON.parse(event.body);

    // Validate incoming body structure (optional but recommended)
    if (!body.date || !body.bursarUsername || !Array.isArray(body.transactions) || !body.summary) {
        throw new Error('Missing required data for report generation.');
    }

    // Generate HTML content
    const htmlContent = generatePDFContent(body);

    // For now, return HTML that can be printed as PDF by the browser
    // In production, you might want to use a service like Puppeteer or a dedicated PDF API
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/html', // Set content type to HTML
        // Suggest a filename for download. Ensure date and username are safe for filenames.
        'Content-Disposition': `attachment; filename="bursar-report-${body.date.split('T')[0]}-${body.bursarUsername.replace(/\s/g, '_')}.html"`
      },
      body: htmlContent
    };

  } catch (error) {
    console.error('Error generating report:', error);

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
    };
  }
};
