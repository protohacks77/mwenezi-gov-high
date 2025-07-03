import React from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  Users, 
  Receipt,
  LogOut,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'

export function BursarPayments() {
  const { logout } = useAuthStore()
  const { students } = useDataStore()

  const totalStudents = Object.keys(students).length
  const studentsWithBalance = Object.values(students).filter(s => s.financials.balance > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cash Payments</h1>
          <p className="text-slate-400 mt-1">Process student fee payments</p>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-secondary border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalStudents}</div>
            <p className="text-xs text-slate-400 mt-1">
              Enrolled students
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              With Outstanding Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-amber-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{studentsWithBalance}</div>
            <p className="text-xs text-slate-400 mt-1">
              Need to pay fees
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Today's Payments
            </CardTitle>
            <Receipt className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="text-xs text-slate-400 mt-1">
              Processed today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Student List</CardTitle>
          <CardDescription className="text-slate-400">
            Select a student to process payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.values(students).map((student) => (
              <motion.div
                key={student.id}
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between p-4 bg-slate-primary rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    student.financials.balance <= 0 ? 'bg-green-500' :
                    student.financials.balance <= 100 ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-white font-medium">
                      {student.name} {student.surname}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {student.studentNumber} • {student.grade}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    student.financials.balance <= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${student.financials.balance.toFixed(2)}
                  </p>
                  <p className="text-slate-400 text-sm">Balance</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}