import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  TrendingUp, 
  Receipt, 
  Download,
  Calendar,
  Filter,
  CreditCard,
  Banknote
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useDataStore } from '@/store/dataStore'
import { formatCurrency, formatDate } from '@/lib/utils'

export function AdminFinancialActivity() {
  const { transactions, students } = useDataStore()
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const transactionList = Object.values(transactions).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const filteredTransactions = transactionList.filter(transaction => {
    const matchesType = filterType === 'all' || transaction.type === filterType
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus
    return matchesType && matchesStatus
  })

  const totalRevenue = transactionList
    .filter(t => t.status === 'completed' || t.status === 'zb_payment_successful')
    .reduce((sum, t) => sum + t.amount, 0)

  const cashPayments = transactionList.filter(t => t.type === 'cash' && t.status === 'completed')
  const zbPayments = transactionList.filter(t => t.type === 'zbpay' && t.status === 'zb_payment_successful')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'zb_payment_successful':
        return 'bg-green-500'
      case 'pending_zb_confirmation':
        return 'bg-amber-500'
      case 'zb_payment_failed':
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-slate-500'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Banknote className="w-4 h-4" />
      case 'zbpay':
        return <CreditCard className="w-4 h-4" />
      default:
        return <Receipt className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Financial Activity</h1>
          <p className="text-slate-400 mt-1">Monitor all financial transactions and revenue</p>
        </div>
        <Button variant="outline" className="border-slate-600 text-slate-300">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
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
                <p className="text-slate-400 text-sm">Total Transactions</p>
                <p className="text-2xl font-bold text-white">{transactionList.length}</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Filter Transactions</CardTitle>
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

      {/* Transactions List */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Transaction History ({filteredTransactions.length})</CardTitle>
          <CardDescription className="text-slate-400">
            Complete record of all financial transactions
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
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(transaction.status)}`} />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{transaction.studentName}</h3>
                        <div className="flex items-center space-x-4 text-sm text-slate-400">
                          <span>{formatDate(transaction.createdAt)}</span>
                          {transaction.receiptNumber && (
                            <span>Receipt: {transaction.receiptNumber}</span>
                          )}
                          {transaction.orderReference && (
                            <span>Ref: {transaction.orderReference}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-white font-bold">{formatCurrency(transaction.amount)}</p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            transaction.status === 'completed' || transaction.status === 'zb_payment_successful'
                              ? 'border-green-500 text-green-400'
                              : transaction.status.includes('pending')
                              ? 'border-amber-500 text-amber-400'
                              : 'border-red-500 text-red-400'
                          }`}
                        >
                          {transaction.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No transactions found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}