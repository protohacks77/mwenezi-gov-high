# Mwenezi High Fees Management PWA

A comprehensive Progressive Web Application for managing school fees with integrated ZbPay payment gateway, role-based access control, and real-time data synchronization.

## 🎯 Project Overview

The Mwenezi High Fees Management PWA is a production-ready application designed to streamline fee collection and management for educational institutions. Built with modern web technologies, it provides a secure, intuitive platform for administrators, bursars, and students to manage financial transactions seamlessly.

**Philosophy:** "Relevant Education for Livelihood" - Empowering educational excellence through efficient financial management.

## ✨ Key Features

### 🔐 Role-Based Access Control
- **Admin**: Complete system management, student creation, financial oversight, fee configuration
- **Bursar**: Cash payment processing, fee adjustments, daily reconciliation
- **Student**: Balance viewing, online payments via ZbPay, payment history

### 💳 ZbPay Payment Gateway Integration
- Live sandbox environment integration with ZbPay API
- Secure server-side payment processing via Netlify Functions
- Real-time payment status updates and webhooks
- Comprehensive transaction tracking and receipt generation

### 📊 Financial Management
- Automated balance calculations based on student categories
- Term-based fee structure with flexible adjustment capabilities
- Detailed transaction history with audit trails
- Receipt generation with printing functionality

### 📱 Progressive Web App Features
- Installable on all devices (iOS, Android, Desktop)
- Offline read-only mode for cached data
- Push notifications for payment updates
- Responsive design optimized for all screen sizes

### 🎨 Premium Design System
- Dark theme with academic color palette (Maroon primary, Amber accents)
- Smooth animations and micro-interactions
- Premium typography using Inter font family
- Consistent UI components built with shadcn/ui

### ⚙️ Settings & Account Management
- Password change functionality for all users
- Username update capabilities
- Secure verification processes
- Admin notifications for account changes

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for lightning-fast build and development
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for consistent, accessible UI components
- **Framer Motion** for smooth animations
- **Zustand** for lightweight state management
- **React Hook Form + Zod** for form validation
- **Recharts** for data visualization

### Backend & Database
- **Firebase Realtime Database** for real-time data synchronization
- **Netlify Functions** (Node.js) for secure server-side logic
- **ZbPay API** integration for payment processing

### Development Tools
- **TypeScript** for enhanced developer experience
- **ESLint** for code quality
- **React Hot Toast** for user notifications

## 🚀 Complete Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Git
- Netlify account
- Firebase project

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/mwenezi-fees-management.git
cd mwenezi-fees-management

# Install dependencies
npm install
```

### 2. Firebase Configuration

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Click "Create a project"
   - Name it "mwenezi-fees-management"
   - Enable Google Analytics (optional)

2. **Setup Realtime Database:**
   - In Firebase Console, go to "Realtime Database"
   - Click "Create Database"
   - Choose "Start in test mode"
   - Select your preferred location

3. **Get Firebase Configuration:**
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click "Add app" > Web
   - Register app with nickname "Mwenezi Fees PWA"
   - Copy the configuration object

4. **Update Firebase Config:**
   - Replace the config in `src/lib/firebase.ts` with your actual Firebase config

5. **Setup Service Account (for Netlify Functions):**
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Keep this file secure - you'll need values from it

### 3. Netlify Deployment Setup

1. **Initialize Git Repository:**
   ```bash
   # Initialize git repository (if not already done)
   git init
   git add .
   git commit -m "Initial commit: Mwenezi High Fees Management PWA"
   
   # Create GitHub repository and push
   git remote add origin https://github.com/yourusername/mwenezi-fees-management.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy to Netlify:**
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Click "Deploy site"

3. **Configure Custom Domain:**
   - In Netlify dashboard, go to "Domain settings"
   - Add custom domain: `mghpayfees.netlify.app`
   - Follow DNS configuration instructions

### 4. Environment Variables Setup

In your Netlify dashboard, go to "Site settings" > "Environment variables" and add these variables:

**Copy and paste these exact variable names and values:**

```bash
# Firebase Configuration (Replace with your actual values)
FIREBASE_PROJECT_ID=mwenezi-fees-management
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mwenezi-fees-management.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----
FIREBASE_DATABASE_URL=https://mwenezi-fees-management-default-rtdb.firebaseio.com

# ZbPay Configuration (Sandbox - Use these exact values)
ZBPAY_API_KEY=3f36fd4b-3b23-4249-b65d-f39dc9df42d4
ZBPAY_API_SECRET=2f2c32d7-7a32-4523-bcde-1913bf7c171d
ZBPAY_BASE_URL=https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway

# Application URLs (Replace with your actual domain)
SITE_URL=https://mghpayfees.netlify.app
RETURN_URL=https://mghpayfees.netlify.app/#/student/payment-status
WEBHOOK_URL=https://mghpayfees.netlify.app/.netlify/functions/zbPayWebhookHandler
```

**Important Notes:**
- Replace `FIREBASE_PROJECT_ID` with your actual Firebase project ID
- Replace `FIREBASE_CLIENT_EMAIL` with your actual service account email from the downloaded JSON
- Replace `FIREBASE_PRIVATE_KEY` with your actual private key from the downloaded JSON (keep the `\n` characters)
- Replace `FIREBASE_DATABASE_URL` with your actual database URL
- The ZbPay credentials are for sandbox testing - use exactly as shown
- Replace the URLs with your actual Netlify domain

### 5. Firebase Security Rules

Set up your Firebase Realtime Database rules:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "users": {
      ".indexOn": ["username", "role"]
    },
    "students": {
      ".indexOn": ["studentNumber", "name", "surname"]
    },
    "transactions": {
      ".indexOn": ["studentId", "status", "createdAt"]
    },
    "notifications": {
      ".indexOn": ["userId", "userRole", "read"]
    }
  }
}
```

### 6. Local Development

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

### 7. Testing ZbPay Integration

1. **Sandbox Environment:**
   - All ZbPay integration uses sandbox environment
   - No real money transactions occur
   - Use test payment methods provided by ZbPay

2. **Test Payment Flow:**
   - Login as student (MHS-001 / student123)
   - Click "Pay with ZbPay"
   - Complete payment on ZbPay sandbox
   - Return to app to see updated balance

3. **Webhook Testing:**
   - Use tools like ngrok for local webhook testing
   - Update webhook URL in environment variables
   - Monitor Netlify function logs for webhook processing

### 8. Production Deployment Checklist

- [ ] Firebase project created and configured
- [ ] Netlify site deployed with custom domain
- [ ] All environment variables set correctly
- [ ] Firebase security rules configured
- [ ] ZbPay sandbox integration tested
- [ ] All user roles tested (Admin, Bursar, Student)
- [ ] PWA installation tested on mobile devices
- [ ] Offline functionality verified

## 🔧 ZbPay Integration Details

### Sandbox Environment Configuration
- **API Key**: `3f36fd4b-3b23-4249-b65d-f39dc9df42d4`
- **API Secret**: `2f2c32d7-7a32-4523-bcde-1913bf7c171d`
- **Base URL**: `https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway`

### Payment Flow
1. Student initiates payment from dashboard
2. `initiateZbPayTransaction` Netlify Function creates transaction
3. Student redirected to ZbPay hosted payment page
4. ZbPay processes payment and sends webhook to `zbPayWebhookHandler`
5. System updates student balance and creates notifications
6. `checkZbPaymentStatus` provides status polling capability

### Security Features
- All ZbPay API calls handled server-side via Netlify Functions
- API credentials never exposed to frontend
- Webhook validation and idempotent processing
- Atomic database operations for financial transactions

## 👥 Demo Credentials

### Administrator
- **Username**: `admin`
- **Password**: `admin123`

### Bursar
- **Username**: `bursar`
- **Password**: `bursar123`

### Students
- **Student 1**: `MHS-001` / `student123` (Day Scholar, Form 1A1)
- **Student 2**: `MHS-002` / `student456` (Boarder, Lower 6 Sciences)

## 📱 PWA Installation

### Mobile Devices (iOS/Android)
1. Open the app in your mobile browser
2. Look for "Add to Home Screen" option in browser menu
3. Tap "Add" to install the PWA

### Desktop Browsers
1. Open the app in Chrome, Edge, or similar browser
2. Look for install icon in address bar
3. Click "Install" to add to your applications

## 🔄 Offline Functionality

The PWA provides read-only access to cached data when offline:
- Student lists and basic information
- Previously loaded payment history
- Cached dashboard data
- App shell and navigation

**Note**: Payment processing and data modifications require internet connection.

## 🐛 Troubleshooting

### Common Issues

**Build Errors with firebase-admin**
- Ensure `firebase-admin` and `node-fetch` are in dependencies
- Check that all environment variables are set in Netlify
- Verify Firebase service account credentials are correct

**Firebase Connection Issues**
- Verify Firebase configuration in `src/lib/firebase.ts`
- Check Firebase Realtime Database rules
- Ensure service account credentials are correct in Netlify environment variables

**Netlify Functions Not Working**
- Verify all environment variables are set in Netlify dashboard
- Check function logs in Netlify Functions tab
- Ensure Firebase Admin SDK is properly initialized
- Verify CORS headers in function responses

**ZbPay Integration Issues**
- Confirm sandbox API credentials are correct
- Check webhook URL is accessible from ZbPay servers
- Monitor Netlify function logs for API call details
- Verify return URL format matches expected pattern

**Login Issues**
- Check network connectivity
- Verify Firebase database contains user data
- Monitor browser console for error messages
- Ensure proper authentication flow

**Settings/Password Change Issues**
- Check network connectivity
- Verify user authentication status
- Monitor browser console for error messages
- Ensure proper form validation

### Development Tips
- Use browser dev tools to debug Firebase connections
- Monitor Netlify function logs for backend issues
- Test payment flows with ZbPay sandbox environment
- Use React DevTools for state management debugging
- Check browser console for JavaScript errors

### Environment Variable Debugging
```bash
# Check if environment variables are set correctly
# In Netlify function logs, you should see:
console.log('Environment check:', {
  hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
  hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
  hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
  hasFirebaseDatabaseUrl: !!process.env.FIREBASE_DATABASE_URL
})
```

### Git Setup Commands

If you're starting fresh with Git:

```bash
# Initialize repository
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: Mwenezi High Fees Management PWA"

# Add remote origin (replace with your GitHub repo URL)
git remote add origin https://github.com/yourusername/mwenezi-fees-management.git

# Push to main branch
git branch -M main
git push -u origin main
```

## 📄 License

This project is proprietary software developed for Mwenezi High School.

## 🤝 Support

For technical support or feature requests, please contact the development team.

---

**Mwenezi High School** - *"Relevant Education for Livelihood"*