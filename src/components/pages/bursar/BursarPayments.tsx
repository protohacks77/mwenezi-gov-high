import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  Users, 
  Receipt,
  Search,
  Eye,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDataStore } from '@/store/dataStore'
import { formatCurrency } from '@/lib/utils'
import { CashPaymentModal } from '@/components/modals/CashPaymentModal'
import { StudentReportModal } from '@/components/modals/StudentReportModal'

export function BursarPayments() {
  const { students, transactions } = useDataStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [reportStudentId, setReportStudentId] = useState<string | null>(null)

  const studentList = Object.values(students)
  const todayTransactions = Object.values(transactions).filter(t => 
    t.type === 'cash' && 
    t.status === 'completed' &&
    new Date(t.createdAt).toDateString() === new Date().toDateString()
  )

  const filteredStudents = studentList.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalStudents = studentList.length
  const studentsWithBalance = studentList.filter(s => s.financials.balance > 0).length
  const todayPayments = todayTransactions.length

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId)
  }

  const handleGenerateReport = (studentId: string) => {
    setReportStudentId(studentId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cash Payments</h1>
          <p className="text-slate-400 mt-1">Process student fee payments</p>
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
            <div className="text-2xl font-bold text-white">{todayPayments}</div>
            <p className="text-xs text-slate-400 mt-1">
              Processed today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Search Students</CardTitle>
          <CardDescription className="text-slate-400">
            Find a student to process payment or generate report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by name or student number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-primary border-slate-600 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Student List</CardTitle>
          <CardDescription className="text-slate-400">
            Click on a student to process payment or generate their report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <motion.div
                key={student.id}
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between p-4 bg-slate-primary rounded-lg border border-slate-600"
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
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className={`font-bold ${
                      student.financials.balance <= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(student.financials.balance)}
                    </p>
                    <p className="text-slate-400 text-sm">Balance</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-400 hover:text-white"
                      onClick={() => handleStudentClick(student.id)}
                      title="Process Payment"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-400 hover:text-amber-400"
                      onClick={() => handleGenerateReport(student.id)}
                      title="Generate Report"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      <CashPaymentModal
        isOpen={!!selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        studentId={selectedStudentId}
      />

      <StudentReportModal
        isOpen={!!reportStudentId}
        onClose={() => setReportStudentId(null)}
        studentId={reportStudentId}
      />
    </div>
  )
}