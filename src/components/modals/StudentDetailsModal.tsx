import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Edit, 
  Trash2, 
  X, 
  Save,
  GraduationCap,
  Phone,
  DollarSign,
  Receipt,
  AlertTriangle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface StudentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string | null
}

export function StudentDetailsModal({ isOpen, onClose, studentId }: StudentDetailsModalProps) {
  const { students, transactions } = useDataStore()
  const { user } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const student = studentId ? students[studentId] : null
  const studentTransactions = Object.values(transactions)
    .filter(t => t.studentId === studentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const [editData, setEditData] = useState({
    name: student?.name || '',
    surname: student?.surname || '',
    guardianPhoneNumber: student?.guardianPhoneNumber || '',
    grade: student?.grade || '',
    studentType: student?.studentType || 'Day Scholar'
  })

  React.useEffect(() => {
    if (student) {
      setEditData({
        name: student.name,
        surname: student.surname,
        guardianPhoneNumber: student.guardianPhoneNumber,
        grade: student.grade,
        studentType: student.studentType
      })
    }
  }, [student])

  const handleSave = async () => {
    if (!student || !user) return

    setIsLoading(true)
    try {
      const response = await fetch('/.netlify/functions/updateStudent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          ...editData,
          adminId: user.id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Student updated successfully!')
        setIsEditing(false)
      } else {
        toast.error(result.error || 'Failed to update student')
      }
    } catch (error) {
      console.error('Update student error:', error)
      toast.error('Failed to update student')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!student || !user) return

    setIsLoading(true)
    try {
      const response = await fetch('/.netlify/functions/deleteStudent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          adminId: user.id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Student deleted successfully!')
        onClose()
      } else {
        toast.error(result.error || 'Failed to delete student')
      }
    } catch (error) {
      console.error('Delete student error:', error)
      toast.error('Failed to delete student')
    } finally {
      setIsLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!student) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-secondary border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <User className="w-5 h-5 mr-2 text-amber-primary" />
              {student.name} {student.surname}
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="border-slate-600 text-slate-300"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="border-slate-600 text-slate-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="maroon"
                    size="sm"
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Student ID: {student.studentNumber}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-primary">
            <TabsTrigger value="details" className="text-slate-300 data-[state=active]:bg-maroon-primary data-[state=active]:text-white">
              Details
            </TabsTrigger>
            <TabsTrigger value="financials" className="text-slate-300 data-[state=active]:bg-maroon-primary data-[state=active]:text-white">
              Financials
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-slate-300 data-[state=active]:bg-maroon-primary data-[state=active]:text-white">
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">First Name</Label>
                {isEditing ? (
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-slate-primary border-slate-600 text-white"
                  />
                ) : (
                  <p className="text-white p-2 bg-slate-primary rounded border border-slate-600">
                    {student.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Surname</Label>
                {isEditing ? (
                  <Input
                    value={editData.surname}
                    onChange={(e) => setEditData(prev => ({ ...prev, surname: e.target.value }))}
                    className="bg-slate-primary border-slate-600 text-white"
                  />
                ) : (
                  <p className="text-white p-2 bg-slate-primary rounded border border-slate-600">
                    {student.surname}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Student Number</Label>
                <p className="text-white p-2 bg-slate-primary rounded border border-slate-600">
                  {student.studentNumber}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Guardian Phone</Label>
                {isEditing ? (
                  <Input
                    value={editData.guardianPhoneNumber}
                    onChange={(e) => setEditData(prev => ({ ...prev, guardianPhoneNumber: e.target.value }))}
                    className="bg-slate-primary border-slate-600 text-white"
                  />
                ) : (
                  <p className="text-white p-2 bg-slate-primary rounded border border-slate-600">
                    {student.guardianPhoneNumber}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Student Type</Label>
                {isEditing ? (
                  <Select 
                    value={editData.studentType} 
                    onValueChange={(value) => setEditData(prev => ({ ...prev, studentType: value as any }))}
                  >
                    <SelectTrigger className="bg-slate-primary border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-primary border-slate-600">
                      <SelectItem value="Day Scholar">Day Scholar</SelectItem>
                      <SelectItem value="Boarder">Boarder</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-white p-2 bg-slate-primary rounded border border-slate-600">
                    {student.studentType}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Grade</Label>
                {isEditing ? (
                  <Input
                    value={editData.grade}
                    onChange={(e) => setEditData(prev => ({ ...prev, grade: e.target.value }))}
                    className="bg-slate-primary border-slate-600 text-white"
                  />
                ) : (
                  <p className="text-white p-2 bg-slate-primary rounded border border-slate-600">
                    {student.grade}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financials" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-slate-primary rounded-lg">
                <p className="text-slate-400 text-sm">Outstanding Balance</p>
                <p className={`text-2xl font-bold ${
                  student.financials.balance > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {formatCurrency(student.financials.balance)}
                </p>
              </div>
              <div className="text-center p-4 bg-slate-primary rounded-lg">
                <p className="text-slate-400 text-sm">Total Fees</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(
                    Object.values(student.financials.terms).reduce((sum, term) => sum + term.fee, 0)
                  )}
                </p>
              </div>
              <div className="text-center p-4 bg-slate-primary rounded-lg">
                <p className="text-slate-400 text-sm">Total Paid</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(
                    Object.values(student.financials.terms).reduce((sum, term) => sum + term.paid, 0)
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Term Breakdown</h3>
              {Object.entries(student.financials.terms).map(([termKey, term]) => (
                <div key={termKey} className="flex items-center justify-between p-3 bg-slate-primary rounded-lg">
                  <div>
                    <p className="text-white font-medium">{termKey.replace('_', ' ')}</p>
                    <p className="text-slate-400 text-sm">
                      Paid: {formatCurrency(term.paid)} of {formatCurrency(term.fee)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      term.fee - term.paid <= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(term.fee - term.paid)}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {term.fee - term.paid <= 0 ? 'Paid' : 'Due'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4 mt-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Payment History</h3>
              {studentTransactions.length > 0 ? (
                studentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-primary rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Receipt className="w-5 h-5 text-amber-primary" />
                      <div>
                        <p className="text-white font-medium">
                          {transaction.type === 'cash' ? 'Cash Payment' : 
                           transaction.type === 'zbpay' ? 'ZbPay Payment' : 'Fee Adjustment'}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {formatDate(transaction.createdAt)}
                          {transaction.receiptNumber && ` • Receipt: ${transaction.receiptNumber}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(transaction.amount)}</p>
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
                ))
              ) : (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No payment history available</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-secondary p-6 rounded-lg border border-slate-700 max-w-md">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-white">Confirm Deletion</h3>
              </div>
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete {student.name} {student.surname}? 
                This action cannot be undone and will remove all associated data.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete Student'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}