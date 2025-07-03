import React from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  LogOut,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { formatCurrency } from '@/lib/utils'

export function AdminDashboard() {
  const { logout } = useAuthStore()
  const { students, transactions } = useDataStore()

  const totalStudents = Object.keys(students).length
  const totalBalance = Object.values(students).reduce((sum, student) => sum + student.financials.balance, 0)
  const completedTransactions = Object.values(transactions).filter(t => t.status === 'completed').length
  const recentTransactions = Object.values(transactions)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const dashboardCards = [
    {
      title: 'Total Students',
      value: totalStudents,
      description: 'Active students enrolled',
      icon: Users,
      color: 'text-blue-500'
    },
    {
      title: 'Outstanding Balance',
      value: formatCurrency(totalBalance),
      description: 'Total fees pending',
      icon: DollarSign,
      color: 'text-amber-primary'
    },
    {
      title: 'Completed Payments',
      value: completedTransactions,
      description: 'This term',
      icon: TrendingUp,
      color: 'text-green-500'
    },
    {
      title: 'Recent Activity',
      value: recentTransactions.length,
      description: 'Last 5 transactions',
      icon: Activity,
      color: 'text-maroon-primary'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back, manage your school efficiently</p>
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

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-slate-secondary border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{card.value}</div>
                <p className="text-xs text-slate-400 mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
          <CardDescription className="text-slate-400">
            Latest transactions and system activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-primary rounded-lg">
                  <div>
                    <p className="text-white font-medium">{transaction.studentName}</p>
                    <p className="text-slate-400 text-sm">
                      {transaction.type === 'cash' ? 'Cash Payment' : 
                       transaction.type === 'zbpay' ? 'ZbPay Payment' : 'Fee Adjustment'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatCurrency(transaction.amount)}</p>
                    <p className="text-slate-400 text-sm">{transaction.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-8">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}