import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Calculator, 
  Calendar, 
  DollarSign, 
  Receipt,
  Download,
  TrendingUp,
  Banknote
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'

export function BursarReconciliation() {
  const { transactions } = useDataStore()
  const { user } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Filter transactions for the selected date and current bursar
  const dailyTransactions = Object.values(transactions).filter(transaction => {
    const transactionDate = new Date(transaction.createdAt).toISOString().split('T')[0]
    const isSameDate = transactionDate === selectedDate
    const isCashPayment = transaction.type === 'cash' && transaction.status === 'completed'
    const isBursarTransaction = transaction.bursarId === user?.id
    
    return isSameDate && isCashPayment && isBursarTransaction
  })

  const totalCashCollected = dailyTransactions.reduce((sum, t) => sum + t.amount, 0)
  const transactionCount = dailyTransactions.length

  // Get all cash transactions for comparison
  const allCashTransactions = Object.values(transactions).filter(t => 
    t.type === 'cash' && 
    t.status === 'completed' &&
    new Date(t.createdAt).toISOString().split('T')[0] === selectedDate
  )

  const totalDailyCash = allCashTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalDailyTransactions = allCashTransactions.length

  const generateReport = () => {
    const reportData = {
      date: selectedDate,
      bursar: user?.username,
      transactions: dailyTransactions,
      summary: {
        totalAmount: totalCashCollected,
        transactionCount: transactionCount
      }
    }
    
    // In a real app, this would generate and download a PDF report
    console.log('Generating report:', reportData)
    alert('Report generation feature will be implemented with PDF export')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Daily Reconciliation</h1>
          <p className="text-slate-400 mt-1">Review and reconcile daily cash collections</p>
        </div>
        <Button 
          onClick={generateReport}
          variant="outline" 
          className="border-slate-600 text-slate-300"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Date Selection */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Select Date</CardTitle>
          <CardDescription className="text-slate-400">
            Choose a date to view reconciliation details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label className="text-slate-200">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-primary border-slate-600 text-white"
              />
            </div>
            <div className="flex items-center space-x-2 text-slate-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">My Collections</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(totalCashCollected)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">My Transactions</p>
                <p className="text-2xl font-bold text-white">{transactionCount}</p>
              </div>
              <Receipt className="w-8 h-8 text-amber-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Daily Cash</p>
                <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalDailyCash)}</p>
              </div>
              <Banknote className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">All Transactions</p>
                <p className="text-2xl font-bold text-white">{totalDailyTransactions}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-maroon-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Performance Summary</CardTitle>
          <CardDescription className="text-slate-400">
            Your contribution to daily collections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Collection Percentage</span>
                  <span className="text-white font-medium">
                    {totalDailyCash > 0 ? ((totalCashCollected / totalDailyCash) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${totalDailyCash > 0 ? (totalCashCollected / totalDailyCash) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Transaction Percentage</span>
                  <span className="text-white font-medium">
                    {totalDailyTransactions > 0 ? ((transactionCount / totalDailyTransactions) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${totalDailyTransactions > 0 ? (transactionCount / totalDailyTransactions) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Average per Transaction:</span>
                <span className="text-white font-medium">
                  {formatCurrency(transactionCount > 0 ? totalCashCollected / transactionCount : 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bursar:</span>
                <span className="text-white font-medium">{user?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="text-white font-medium">
                  {new Date(selectedDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Transaction Details</CardTitle>
          <CardDescription className="text-slate-400">
            Detailed breakdown of your cash collections for {new Date(selectedDate).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyTransactions.length > 0 ? (
              dailyTransactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 bg-slate-primary rounded-lg border border-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Receipt className="w-5 h-5 text-amber-primary" />
                      <div>
                        <h3 className="text-white font-medium">{transaction.studentName}</h3>
                        <p className="text-slate-400 text-sm">
                          Receipt: {transaction.receiptNumber}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {transaction.termKey?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <Calculator className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">
                  No cash transactions found for {new Date(selectedDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}