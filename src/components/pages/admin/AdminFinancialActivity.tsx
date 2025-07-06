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
  Banknote,
  BarChart3,
  LineChart
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useDataStore } from '@/store/dataStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line } from 'recharts'

export function AdminFinancialActivity() {
  const { transactions, students } = useDataStore()
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

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

  // Generate chart data for the last 7 days
  const generateChartData = () => {
    const last7Days = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateString = date.toISOString().split('T')[0]
      
      const dayTransactions = transactionList.filter(t => {
        const transactionDate = new Date(t.createdAt).toISOString().split('T')[0]
        return transactionDate === dateString && (t.status === 'completed' || t.status === 'zb_payment_successful')
      })
      
      const totalAmount = dayTransactions.reduce((sum, t) => sum + t.amount, 0)
      const cashAmount = dayTransactions.filter(t => t.type === 'cash').reduce((sum, t) => sum + t.amount, 0)
      const zbPayAmount = dayTransactions.filter(t => t.type === 'zbpay').reduce((sum, t) => sum + t.amount, 0)
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: dateString,
        total: totalAmount,
        cash: cashAmount,
        zbpay: zbPayAmount,
        count: dayTransactions.length
      })
    }
    
    return last7Days
  }

  const chartData = generateChartData()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-secondary border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
          <p className="text-green-400">
            Total: {formatCurrency(data.total)}
          </p>
          <p className="text-amber-400">
            Cash: {formatCurrency(data.cash)}
          </p>
          <p className="text-maroon-primary">
            ZbPay: {formatCurrency(data.zbpay)}
          </p>
          <p className="text-slate-400 text-sm">
            {data.count} transactions
          </p>
        </div>
      )
    }
    return null
  }

  const exportReport = async () => {
    try {
      const reportData = {
        transactions: filteredTransactions,
        summary: {
          totalRevenue,
          cashPayments: cashPayments.length,
          zbPayments: zbPayments.length,
          totalTransactions: transactionList.length
        },
        chartData,
        generatedAt: new Date().toISOString(),
        reportType: 'financial_activity'
      }

      const response = await fetch('/.netlify/functions/generateFinancialReport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `financial-activity-report-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error('Failed to generate report')
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

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
        <Button variant="outline" className="border-slate-600 text-slate-300" onClick={exportReport}>
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

      {/* Revenue Chart */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Daily Revenue (Last 7 Days)</CardTitle>
              <CardDescription className="text-slate-400">
                Payment collections by day
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={chartType === 'bar' ? 'maroon' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
                className={chartType === 'bar' ? '' : 'border-slate-600 text-slate-300'}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Bar
              </Button>
              <Button
                variant={chartType === 'line' ? 'maroon' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
                className={chartType === 'line' ? '' : 'border-slate-600 text-slate-300'}
              >
                <LineChart className="w-4 h-4 mr-2" />
                Line
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="total" 
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <RechartsLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                  />
                </RechartsLineChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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