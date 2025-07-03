import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  Plus, 
  Minus,
  Search,
  Filter,
  FileText,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useDataStore } from '@/store/dataStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FeeAdjustmentModal } from '@/components/modals/FeeAdjustmentModal'

export function BursarAdjustments() {
  const { students, transactions } = useDataStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)

  const studentList = Object.values(students)
  const adjustmentTransactions = Object.values(transactions)
    .filter(t => t.type === 'adjustment')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const filteredStudents = studentList.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAdjustmentClick = (studentId: string) => {
    setSelectedStudent(studentId)
    setAdjustmentModalOpen(true)
  }

  const getAdjustmentIcon = (type: string) => {
    return type === 'credit' ? (
      <Minus className="w-4 h-4 text-green-500" />
    ) : (
      <Plus className="w-4 h-4 text-red-500" />
    )
  }

  const getAdjustmentColor = (type: string) => {
    return type === 'credit' ? 'text-green-400' : 'text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Fee Adjustments</h1>
          <p className="text-slate-400 mt-1">Apply fee adjustments and corrections</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Adjustments</p>
                <p className="text-2xl font-bold text-white">{adjustmentTransactions.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Credits Applied</p>
                <p className="text-2xl font-bold text-green-400">
                  {adjustmentTransactions.filter(t => t.adjustmentType === 'credit').length}
                </p>
              </div>
              <Minus className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Debits Applied</p>
                <p className="text-2xl font-bold text-red-400">
                  {adjustmentTransactions.filter(t => t.adjustmentType === 'debit').length}
                </p>
              </div>
              <Plus className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Selection */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Select Student for Adjustment</CardTitle>
          <CardDescription className="text-slate-400">
            Search and select a student to apply fee adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by name or student number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-primary border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredStudents.map((student) => (
                <motion.div
                  key={student.id}
                  whileHover={{ scale: 1.01 }}
                  className="p-3 bg-slate-primary rounded-lg border border-slate-600 hover:border-slate-500 transition-colors cursor-pointer"
                  onClick={() => handleAdjustmentClick(student.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">
                        {student.name} {student.surname}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {student.studentNumber} • {student.grade}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        student.financials.balance <= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(student.financials.balance)}
                      </p>
                      <p className="text-slate-400 text-sm">Balance</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Adjustments */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Adjustments</CardTitle>
          <CardDescription className="text-slate-400">
            History of fee adjustments and corrections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adjustmentTransactions.length > 0 ? (
              adjustmentTransactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 bg-slate-primary rounded-lg border border-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getAdjustmentIcon(transaction.adjustmentType || 'debit')}
                      <div>
                        <h3 className="text-white font-medium">{transaction.studentName}</h3>
                        <p className="text-slate-400 text-sm">
                          {transaction.reason || 'Fee adjustment'}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${getAdjustmentColor(transaction.adjustmentType || 'debit')}`}>
                        {transaction.adjustmentType === 'credit' ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          transaction.adjustmentType === 'credit' 
                            ? 'border-green-500 text-green-400'
                            : 'border-red-500 text-red-400'
                        }`}
                      >
                        {transaction.adjustmentType === 'credit' ? 'Credit' : 'Debit'}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No adjustments have been made yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="bg-slate-secondary border-slate-700 border-l-4 border-l-amber-500">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="text-amber-400 font-medium">Important Notice</h4>
              <p className="text-slate-300 text-sm mt-1">
                Fee adjustments should only be applied with proper authorization. All adjustments 
                are logged and tracked for audit purposes. Credits reduce the student's balance, 
                while debits increase it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <FeeAdjustmentModal
        isOpen={adjustmentModalOpen}
        onClose={() => {
          setAdjustmentModalOpen(false)
          setSelectedStudent(null)
        }}
        studentId={selectedStudent}
      />
    </div>
  )
}