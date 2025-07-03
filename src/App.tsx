import React, { useEffect, useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LoginForm } from './components/LoginForm'
import { Layout } from './components/Layout'
import { SettingsModal } from './components/SettingsModal'
import { useAuthStore } from './store/authStore'
import { useDataStore } from './store/dataStore'
import { seedInitialData } from './lib/firebase'

// Import page components
import { AdminDashboard } from './components/pages/admin/AdminDashboard'
import { AdminStudents } from './components/pages/admin/AdminStudents'
import { AdminFinancialActivity } from './components/pages/admin/AdminFinancialActivity'
import { AdminConfig } from './components/pages/admin/AdminConfig'
import { AdminNotifications } from './components/pages/admin/AdminNotifications'

import { StudentDashboard } from './components/pages/student/StudentDashboard'
import { StudentPayments } from './components/pages/student/StudentPayments'
import { PaymentStatus } from './components/pages/student/PaymentStatus'

import { BursarPayments } from './components/pages/bursar/BursarPayments'
import { BursarAdjustments } from './components/pages/bursar/BursarAdjustments'
import { BursarReconciliation } from './components/pages/bursar/BursarReconciliation'

function App() {
  const { isAuthenticated, user, checkAuth } = useAuthStore()
  const { subscribeToStudents, subscribeToTransactions, subscribeToConfig, subscribeToNotifications } = useDataStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    // Initialize app immediately without blocking UI
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing application...')
        
        // Check authentication first
        checkAuth()
        
        // Initialize database in background (non-blocking)
        seedInitialData().catch(error => {
          console.error('⚠️ Background database initialization error:', error)
          // Don't block the app if seeding fails
        })
        
        console.log('✅ App initialization complete')
      } catch (error) {
        console.error('💥 App initialization error:', error)
        // Don't block the app even if initialization fails
      }
    }

    initializeApp()
  }, [checkAuth])

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔗 Setting up real-time subscriptions for user:', user.username)
      
      // Subscribe to real-time data
      const unsubscribeStudents = subscribeToStudents()
      const unsubscribeTransactions = subscribeToTransactions()
      const unsubscribeConfig = subscribeToConfig()
      const unsubscribeNotifications = subscribeToNotifications(user.id)

      return () => {
        console.log('🔌 Cleaning up subscriptions')
        unsubscribeStudents()
        unsubscribeTransactions()
        unsubscribeConfig()
        unsubscribeNotifications()
      }
    }
  }, [isAuthenticated, user, subscribeToStudents, subscribeToTransactions, subscribeToConfig, subscribeToNotifications])

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginForm />
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #475569'
            }
          }}
        />
      </>
    )
  }

  const getDefaultRoute = () => {
    switch (user?.role) {
      case 'admin':
        return '/admin/dashboard'
      case 'bursar':
        return '/bursar/payments'
      case 'student':
        return '/student/dashboard'
      default:
        return '/login'
    }
  }

  return (
    <Router>
      <Layout onSettingsClick={() => setSettingsOpen(true)}>
        <Routes>
          {/* Default redirect */}
          <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
          
          {/* Admin routes */}
          {user?.role === 'admin' && (
            <>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/students" element={<AdminStudents />} />
              <Route path="/admin/financial-activity" element={<AdminFinancialActivity />} />
              <Route path="/admin/config" element={<AdminConfig />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
            </>
          )}
          
          {/* Bursar routes */}
          {user?.role === 'bursar' && (
            <>
              <Route path="/bursar/payments" element={<BursarPayments />} />
              <Route path="/bursar/adjustments" element={<BursarAdjustments />} />
              <Route path="/bursar/reconciliation" element={<BursarReconciliation />} />
            </>
          )}
          
          {/* Student routes */}
          {user?.role === 'student' && (
            <>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/payments" element={<StudentPayments />} />
              <Route path="/student/payment-status" element={<PaymentStatus />} />
            </>
          )}
          
          {/* Catch all - redirect to role-based home */}
          <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
        </Routes>
      </Layout>
      
      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
      
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #475569'
          }
        }}
      />
    </Router>
  )
}

export default App