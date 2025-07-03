import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Receipt, 
  CreditCard, 
  Banknote, 
  Download,
  Eye,
  Calendar,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'

export function StudentPayments() {
  const { transactions } = useDataStore()
  const { user } = useAuthStore()
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const studentTransactions = Object.values(transactions)
    .filter(t => t.studentId === user?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const filteredTransactions = studentTransactions.filter(transaction => {
    const matchesType = filterType === 'all' || transaction.type === filterType
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus
    return matchesType && matchesStatus
  })

  const totalPaid = studentTransactions
    .filter(t => t.status === 'completed' || t.status === 'zb_payment_successful')
    .reduce((sum, t) => sum + t.amount, 0)

  const cashPayments = studentTransactions.filter(t => t.type === 'cash' && t.status === 'completed')
  const zbPayments = studentTransactions.filter(t => t.type === 'zbpay' && t.status === 'zb_payment_successful')
  const pendingPayments = studentTransactions.filter(t => t.status === 'pending_zb_confirmation')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'zb_payment_successful':
        return 'border-green-500 text-green-400'
      case 'pending_zb_confirmation':
        return 'border-amber-500 text-amber-400'
      case 'zb_payment_failed':
      case 'failed':
        return 'border-red-500 text-red-400'
      default:
        return 'border-slate-500 text-slate-400'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Banknote className="w-4 h-4 text-amber-primary" />
      case 'zbpay':
        return <CreditCard className="w-4 h-4 text-maroon-primary" />
      default:
        return <Receipt className="w-4 h-4 text-blue-500" />
    }
  }

  const viewReceipt = (transaction: any) => {
    // In a real app, this would open a receipt modal or new window
    console.log('View receipt for transaction:', transaction.id)
    alert(`Receipt details:\nTransaction ID: ${transaction.id}\nAmount: ${formatCurrency(transaction.amount)}\nDate: ${formatDate(transaction.createdAt)}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Payment History</h1>
          <p className="text-slate-400 mt-1">View all your payment transactions and receipts</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Paid</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(totalPaid)}</p>
              </div>
              <Receipt className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Cash Payments</p>
                <p className="text-2xl font-bold text-white">{cashPayments.length}</p>
              </div>
              <Banknote className="w-8 h-8 text-amber-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">ZbPay Payments</p>
                <p className="text-2xl font-bold text-white">{zbPayments.length}</p>
              </div>
              <CreditCard className="w-8 h-8 text-maroon-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-amber-400">{pendingPayments.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Filter Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48 bg-slate-primary border-slate-600 text-white">
                <SelectValue placeholder="Payment Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-primary border-slate-600">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cash">Cash Payments</SelectItem>
                <SelectItem value="zbpay">ZbPay Payments</SelectItem>
                <SelectItem value="adjustment">Adjustments</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 bg-slate-primary border-slate-600 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-primary border-slate-600">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="zb_payment_successful">ZbPay Successful</SelectItem>
                <SelectItem value="pending_zb_confirmation">Pending</SelectItem>
                <SelectItem value="zb_payment_failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">
            Transaction History ({filteredTransactions.length})
          </CardTitle>
          <CardDescription className="text-slate-400">
            Complete record of all your payments and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 bg-slate-primary rounded-lg border border-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(transaction.type)}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">
                          {transaction.type === 'cash' ? 'Cash Payment' : 
                           transaction.type === 'zbpay' ? 'ZbPay Payment' : 'Fee Adjustment'}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-slate-400">
                          <span>{formatDate(transaction.createdAt)}</span>
                          {transaction.receiptNumber && (
                            <span>Receipt: {transaction.receiptNumber}</span>
                          )}
                          {transaction.orderReference && (
                            <span>Ref: {transaction.orderReference}</span>
                          )}
                          {transaction.termKey && (
                            <span>Term: {transaction.termKey.replace('_', ' ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-white font-bold">{formatCurrency(transaction.amount)}</p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(transaction.status)}`}
                        >
                          {transaction.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                      {(transaction.status === 'completed' || transaction.status === 'zb_payment_successful') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => viewReceipt(transaction)}
                          className="text-slate-400 hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No payment history available</p>
                <p className="text-slate-500 text-sm mt-2">
                  Your payments will appear here once you make them
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}