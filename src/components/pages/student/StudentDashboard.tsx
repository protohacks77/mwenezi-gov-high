import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  CreditCard, 
  DollarSign, 
  Receipt, 
  AlertCircle,
  LogOut,
  Settings,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export function StudentDashboard() {
  const { user, logout } = useAuthStore()
  const { students, transactions, config } = useDataStore()
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  const student = user ? students[user.id] : null
  const studentTransactions = Object.values(transactions)
    .filter(t => t.studentId === user?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handlePayNow = async () => {
    if (!student || !config) {
      toast.error('Unable to process payment at this time')
      return
    }

    setIsProcessingPayment(true)
    
    try {
      // Find the first unpaid term
      const unpaidTerm = Object.entries(student.financials.terms)
        .find(([_, term]) => term.fee > term.paid)
      
      if (!unpaidTerm) {
        toast.success('All fees are paid!')
        setIsProcessingPayment(false)
        return
      }

      const [termKey, term] = unpaidTerm
      const amountDue = term.fee - term.paid

      const response = await fetch('/.netlify/functions/initiateZbPayTransaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          amount: amountDue,
          termKey: termKey,
          returnUrl: `${window.location.origin}/#/student/payment-status`,
          resultUrl: `${window.location.origin}/.netlify/functions/zbPayWebhookHandler`
        })
      })

      const data = await response.json()

      if (data.success && data.paymentUrl) {
        // Store transaction details for status checking
        localStorage.setItem('zbpay_transaction', JSON.stringify({
          orderReference: data.orderReference,
          transactionId: data.transactionId,
          amount: amountDue,
          termKey: termKey
        }))
        
        // Redirect to ZbPay
        window.location.href = data.paymentUrl
      } else {
        throw new Error(data.error || 'Failed to initiate payment')
      }
    } catch (error) {
      console.error('Payment initiation error:', error)
      toast.error('Failed to initiate payment. Please try again.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading student information...</p>
      </div>
    )
  }

  const unpaidTerms = Object.entries(student.financials.terms)
    .filter(([_, term]) => term.fee > term.paid)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome, {student.name} {student.surname}
          </h1>
          <p className="text-slate-400 mt-1">
            {student.grade} • {student.studentType} • ID: {student.studentNumber}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button 
            onClick={logout}
            variant="destructive" 
            size="sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Balance Overview */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-amber-primary" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-slate-400 text-sm">Outstanding Balance</p>
              <p className={`text-3xl font-bold ${
                student.financials.balance > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {formatCurrency(student.financials.balance)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-sm">Total Fees</p>
              <p className="text-2xl font-semibold text-white">
                {formatCurrency(
                  Object.values(student.financials.terms).reduce((sum, term) => sum + term.fee, 0)
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-sm">Total Paid</p>
              <p className="text-2xl font-semibold text-green-400">
                {formatCurrency(
                  Object.values(student.financials.terms).reduce((sum, term) => sum + term.paid, 0)
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Terms */}
      {unpaidTerms.length > 0 && (
        <Card className="bg-slate-secondary border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-amber-primary" />
              Outstanding Fees
            </CardTitle>
            <CardDescription className="text-slate-400">
              Terms with pending payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unpaidTerms.map(([termKey, term]) => (
                <div key={termKey} className="flex items-center justify-between p-4 bg-slate-primary rounded-lg">
                  <div>
                    <p className="text-white font-medium">{termKey.replace('_', ' ')}</p>
                    <p className="text-slate-400 text-sm">
                      Paid: {formatCurrency(term.paid)} of {formatCurrency(term.fee)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold">
                      {formatCurrency(term.fee - term.paid)}
                    </p>
                    <p className="text-slate-400 text-sm">Due</p>
                  </div>
                </div>
              ))}
              
              <Button 
                onClick={handlePayNow}
                disabled={isProcessingPayment}
                variant="maroon"
                className="w-full"
                size="lg"
              >
                {isProcessingPayment ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pay with ZbPay
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-amber-primary" />
            Payment History
          </CardTitle>
          <CardDescription className="text-slate-400">
            Your recent transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {studentTransactions.length > 0 ? (
              studentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-primary rounded-lg">
                  <div>
                    <p className="text-white font-medium">
                      {transaction.type === 'cash' ? 'Cash Payment' : 
                       transaction.type === 'zbpay' ? 'ZbPay Payment' : 'Fee Adjustment'}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {formatDate(transaction.createdAt)}
                      {transaction.receiptNumber && ` • Receipt: ${transaction.receiptNumber}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatCurrency(transaction.amount)}</p>
                    <p className={`text-sm ${
                      transaction.status === 'completed' || transaction.status === 'zb_payment_successful' 
                        ? 'text-green-400' 
                        : transaction.status.includes('pending') 
                        ? 'text-amber-400' 
                        : 'text-red-400'
                    }`}>
                      {transaction.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-8">No payment history available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}