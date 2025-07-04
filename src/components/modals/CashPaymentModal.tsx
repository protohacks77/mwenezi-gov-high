import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { DollarSign, Save, X, Receipt } from 'lucide-react'
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
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const cashPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  termKey: z.string().min(1, 'Term is required'),
})

type CashPaymentFormData = z.infer<typeof cashPaymentSchema>

interface CashPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string | null
}

export function CashPaymentModal({ isOpen, onClose, studentId }: CashPaymentModalProps) {
  const { students, config } = useDataStore()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const student = studentId ? students[studentId] : null

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<CashPaymentFormData>({
    resolver: zodResolver(cashPaymentSchema),
  })

  const selectedTerm = watch('termKey')
  const amount = watch('amount')

  const onSubmit = async (data: CashPaymentFormData) => {
    if (!user || !student) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/.netlify/functions/processCashPayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          amount: data.amount,
          termKey: data.termKey,
          bursarId: user.id,
          bursarUsername: user.username
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Payment processed successfully! Receipt: ${result.receiptNumber}`)
        reset()
        onClose()
      } else {
        toast.error(result.error || 'Failed to process payment')
      }
    } catch (error) {
      console.error('Cash payment error:', error)
      toast.error('Failed to process payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const getTermBalance = (termKey: string) => {
    if (!student || !student.financials.terms[termKey]) return 0
    const term = student.financials.terms[termKey]
    return term.fee - term.paid
  }

  const setMaxAmount = () => {
    if (selectedTerm) {
      const maxAmount = getTermBalance(selectedTerm)
      setValue('amount', maxAmount)
    }
  }

  if (!student) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-secondary border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-amber-primary" />
            Process Cash Payment
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Process cash payment for {student.name} {student.surname}
          </DialogDescription>
        </DialogHeader>

        {/* Student Info */}
        <div className="p-4 bg-slate-primary rounded-lg border border-slate-600">
          <h3 className="text-white font-medium">{student.name} {student.surname}</h3>
          <p className="text-slate-400 text-sm">{student.studentNumber} • {student.grade}</p>
          <p className="text-slate-300 text-sm mt-1">
            Current Balance: <span className={student.financials.balance > 0 ? 'text-red-400' : 'text-green-400'}>
              {formatCurrency(student.financials.balance)}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Term</Label>
            <Select onValueChange={(value) => setValue('termKey', value)}>
              <SelectTrigger className="bg-slate-primary border-slate-600 text-white">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent className="bg-slate-primary border-slate-600">
                {Object.entries(student.financials.terms).map(([termKey, term]) => (
                  <SelectItem key={termKey} value={termKey}>
                    <div className="flex justify-between items-center w-full">
                      <span>{termKey.replace('_', ' ')}</span>
                      <span className="ml-4 text-slate-400">
                        Due: {formatCurrency(term.fee - term.paid)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.termKey && (
              <p className="text-sm text-red-400">{errors.termKey.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount" className="text-slate-200">
                Payment Amount
              </Label>
              {selectedTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={setMaxAmount}
                  className="text-amber-primary hover:text-amber-secondary"
                >
                  Max: {formatCurrency(getTermBalance(selectedTerm))}
                </Button>
              )}
            </div>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              className="bg-slate-primary border-slate-600 text-white"
              placeholder="Enter payment amount"
            />
            {errors.amount && (
              <p className="text-sm text-red-400">{errors.amount.message}</p>
            )}
          </div>

          {/* Payment Preview */}
          {selectedTerm && amount > 0 && (
            <div className="p-3 bg-slate-primary rounded-lg border border-slate-600">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300">Term:</span>
                <span className="text-white">{selectedTerm.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300">Amount Due:</span>
                <span className="text-white">{formatCurrency(getTermBalance(selectedTerm))}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300">Payment:</span>
                <span className="text-green-400">{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium border-t border-slate-600 pt-2 mt-2">
                <span className="text-slate-300">Remaining:</span>
                <span className={getTermBalance(selectedTerm) - amount <= 0 ? 'text-green-400' : 'text-amber-400'}>
                  {formatCurrency(Math.max(0, getTermBalance(selectedTerm) - amount))}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-slate-600 text-slate-300"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              variant="maroon"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Receipt className="w-4 h-4 mr-2" />
                  Process Payment
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}