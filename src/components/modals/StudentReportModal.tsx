import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, X, FileText, Calendar, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface StudentReportModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string | null
}

export function StudentReportModal({ isOpen, onClose, studentId }: StudentReportModalProps) {
  const { students, transactions } = useDataStore()
  const { user } = useAuthStore()
  const [isGenerating, setIsGenerating] = useState(false)

  const student = studentId ? students[studentId] : null
  const studentTransactions = Object.values(transactions)
    .filter(t => t.studentId === studentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const generateStudentReport = async () => {
    if (!student || !user) return

    setIsGenerating(true)
    try {
      const reportData = {
        student: {
          name: `${student.name} ${student.surname}`,
          studentNumber: student.studentNumber,
          grade: student.grade,
          studentType: student.studentType,
          guardianPhone: student.guardianPhoneNumber,
          balance: student.financials.balance,
          terms: student.financials.terms
        },
        transactions: studentTransactions,
        generatedBy: user.username,
        generatedAt: new Date().toISOString(),
        reportType: 'student_financial_report'
      }

      const response = await fetch('/.netlify/functions/generateStudentReport', {
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
        a.download = `student-report-${student.studentNumber}-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.success('Student report downloaded successfully!')
        onClose()
      } else {
        throw new Error('Failed to generate report')
      }
    } catch (error) {
      console.error('Report generation error:', error)
      toast.error('Failed to generate student report')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!student) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-secondary border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <FileText className="w-5 h-5 mr-2 text-amber-primary" />
            Generate Student Report
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Generate a comprehensive financial report for {student.name} {student.surname}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info Preview */}
          <div className="p-4 bg-slate-primary rounded-lg border border-slate-600">
            <div className="flex items-center space-x-3 mb-3">
              <User className="w-5 h-5 text-amber-primary" />
              <h3 className="text-white font-medium">{student.name} {student.surname}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-400">Student Number</p>
                <p className="text-white">{student.studentNumber}</p>
              </div>
              <div>
                <p className="text-slate-400">Grade</p>
                <p className="text-white">{student.grade}</p>
              </div>
              <div>
                <p className="text-slate-400">Type</p>
                <p className="text-white">{student.studentType}</p>
              </div>
              <div>
                <p className="text-slate-400">Balance</p>
                <p className={student.financials.balance > 0 ? 'text-red-400' : 'text-green-400'}>
                  {formatCurrency(student.financials.balance)}
                </p>
              </div>
            </div>
          </div>

          {/* Report Contents */}
          <div className="p-4 bg-slate-primary rounded-lg border border-slate-600">
            <h4 className="text-white font-medium mb-2">Report will include:</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Student personal information</li>
              <li>• Financial summary and balance</li>
              <li>• Term-by-term fee breakdown</li>
              <li>• Complete payment history</li>
              <li>• Transaction details and receipts</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={generateStudentReport}
              disabled={isGenerating}
              variant="maroon"
            >
              {isGenerating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </div>
              ) : (
                <div className="flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}