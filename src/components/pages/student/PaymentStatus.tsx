import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowLeft, 
  Receipt,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface TransactionData {
  orderReference: string
  transactionId: string
  amount: number
  termKey: string
}

export function PaymentStatus() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing')
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null)
  const [statusDetails, setStatusDetails] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    // Get transaction data from localStorage
    const storedTransaction = localStorage.getItem('zbpay_transaction')
    if (storedTransaction) {
      const data = JSON.parse(storedTransaction)
      setTransactionData(data)
      checkPaymentStatus(data.orderReference, data.transactionId)
    } else {
      // No transaction data, redirect to dashboard
      navigate('/student/dashboard')
    }
  }, [navigate])

  const checkPaymentStatus = async (orderRef: string, txId: string) => {
    setIsChecking(true)
    try {
      const response = await fetch(
        `/.netlify/functions/checkZbPaymentStatus?orderRef=${orderRef}&txId=${txId}`
      )
      const data = await response.json()

      if (data.success) {
        setStatusDetails(data)
        
        if (data.status === 'zb_payment_successful') {
          setStatus('success')
          toast.success('Payment completed successfully!')
        } else if (data.status === 'zb_payment_failed') {
          setStatus('failed')
          toast.error('Payment failed')
        } else {
          // Still processing, check again in 3 seconds
          setTimeout(() => checkPaymentStatus(orderRef, txId), 3000)
        }
      } else {
        console.error('Status check failed:', data.error)
        // Continue checking
        setTimeout(() => checkPaymentStatus(orderRef, txId), 3000)
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
      // Continue checking
      setTimeout(() => checkPaymentStatus(orderRef, txId), 3000)
    } finally {
      setIsChecking(false)
    }
  }

  const handleReturnToDashboard = () => {
    localStorage.removeItem('zbpay_transaction')
    navigate('/student/dashboard')
  }

  const handleTryAgain = () => {
    localStorage.removeItem('zbpay_transaction')
    navigate('/student/dashboard')
  }

  const renderProcessingState = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="w-16 h-16 mx-auto mb-6 bg-amber-primary rounded-full flex items-center justify-center">
        <Clock className="w-8 h-8 text-white animate-pulse" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Processing Payment</h2>
      <p className="text-slate-400 mb-6">
        Please wait while we confirm your payment with ZbPay...
      </p>
      
      {transactionData && (
        <div className="bg-slate-primary rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Amount</p>
              <p className="text-white font-medium">{formatCurrency(transactionData.amount)}</p>
            </div>
            <div>
              <p className="text-slate-400">Term</p>
              <p className="text-white font-medium">{transactionData.termKey.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-slate-400">Order Reference</p>
              <p className="text-white font-medium text-xs">{transactionData.orderReference}</p>
            </div>
            <div>
              <p className="text-slate-400">Transaction ID</p>
              <p className="text-white font-medium text-xs">{transactionData.transactionId}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center space-x-2 text-slate-400">
        <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
        <span className="text-sm">Checking status...</span>
      </div>
    </motion.div>
  )

  const renderSuccessState = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="w-16 h-16 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
      <p className="text-slate-400 mb-6">
        Your payment has been processed successfully.
      </p>
      
      {statusDetails && (
        <div className="bg-slate-primary rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Amount Paid</p>
              <p className="text-green-400 font-bold">{formatCurrency(statusDetails.amount)}</p>
            </div>
            <div>
              <p className="text-slate-400">Status</p>
              <p className="text-green-400 font-medium">Completed</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-400">Order Reference</p>
              <p className="text-white font-medium text-xs">{statusDetails.orderReference}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleReturnToDashboard}
          variant="maroon"
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
        <Button 
          variant="outline"
          className="flex-1 border-slate-600 text-slate-300"
        >
          <Receipt className="w-4 h-4 mr-2" />
          View Receipt
        </Button>
      </div>
    </motion.div>
  )

  const renderFailedState = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="w-16 h-16 mx-auto mb-6 bg-red-500 rounded-full flex items-center justify-center">
        <XCircle className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
      <p className="text-slate-400 mb-6">
        Your payment could not be processed. Please try again or contact support.
      </p>
      
      {transactionData && (
        <div className="bg-slate-primary rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Amount</p>
              <p className="text-white font-medium">{formatCurrency(transactionData.amount)}</p>
            </div>
            <div>
              <p className="text-slate-400">Status</p>
              <p className="text-red-400 font-medium">Failed</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-400">Order Reference</p>
              <p className="text-white font-medium text-xs">{transactionData.orderReference}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleTryAgain}
          variant="maroon"
          className="flex-1"
        >
          Try Again
        </Button>
        <Button 
          onClick={handleReturnToDashboard}
          variant="outline"
          className="flex-1 border-slate-600 text-slate-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-center text-white">Payment Status</CardTitle>
          <CardDescription className="text-center text-slate-400">
            ZbPay Transaction Update
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'processing' && renderProcessingState()}
          {status === 'success' && renderSuccessState()}
          {status === 'failed' && renderFailedState()}
        </CardContent>
      </Card>
    </div>
  )
}