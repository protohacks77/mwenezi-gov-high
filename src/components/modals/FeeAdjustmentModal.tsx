import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { DollarSign, Save, X, Plus, Minus } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const feeAdjustmentSchema = z.object({
  adjustmentAmount: z.number().positive('Amount must be positive'),
  termKey: z.string().min(1, 'Term is required'),
  reason: z.string().min(1, 'Reason is required'),
  adjustmentType: z.enum(['debit', 'credit']),
})

type FeeAdjustmentFormData = z.infer<typeof feeAdjustmentSchema>

interface FeeAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string | null
}

export function FeeAdjustmentModal({ isOpen, onClose, studentId }: FeeAdjustmentModalProps) {
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
  } = useForm<FeeAdjustmentFormData>({
    resolver: zodResolver(feeAdjustmentSchema),
  })

  const adjustmentType = watch('adjustmentType')

  const onSubmit = async (data: FeeAdjustmentFormData) => {
    if (!user || !student) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/.netlify/functions/applyFeeAdjustment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          adjustmentAmount: data.adjustmentType === 'credit' ? -data.adjustmentAmount : data.adjustmentAmount,
          termKey: data.termKey,
          reason: data.reason,
          adjustmentType: data.adjustmentType,
          adminId: user.id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Fee adjustment applied successfully!`)
        reset()
        onClose()
      } else {
        toast.error(result.error || 'Failed to apply adjustment')
      }
    } catch (error) {
      console.error('Fee adjustment error:', error)
      toast.error('Failed to apply adjustment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!student) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-secondary border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-amber-primary" />
            Fee Adjustment
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Apply a fee adjustment for {student.name} {student.surname}
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
            <Label className="text-slate-200">Adjustment Type</Label>
            <Select onValueChange={(value) => setValue('adjustmentType', value as any)}>
              <SelectTrigger className="bg-slate-primary border-slate-600 text-white">
                <SelectValue placeholder="Select adjustment type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-primary border-slate-600">
                <SelectItem value="credit">
                  <div className="flex items-center">
                    <Minus className="w-4 h-4 mr-2 text-green-500" />
                    Credit (Reduce Balance)
                  </div>
                </SelectItem>
                <SelectItem value="debit">
                  <div className="flex items-center">
                    <Plus className="w-4 h-4 mr-2 text-red-500" />
                    Debit (Increase Balance)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.adjustmentType && (
              <p className="text-sm text-red-400">{errors.adjustmentType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustmentAmount" className="text-slate-200">
              Amount
            </Label>
            <Input
              id="adjustmentAmount"
              type="number"
              step="0.01"
              {...register('adjustmentAmount', { valueAsNumber: true })}
              className="bg-slate-primary border-slate-600 text-white"
              placeholder="Enter adjustment amount"
            />
            {errors.adjustmentAmount && (
              <p className="text-sm text-red-400">{errors.adjustmentAmount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Term</Label>
            <Select onValueChange={(value) => setValue('termKey', value)}>
              <SelectTrigger className="bg-slate-primary border-slate-600 text-white">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent className="bg-slate-primary border-slate-600">
                {config?.activeTerms.map((term) => (
                  <SelectItem key={term} value={term}>
                    {term.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.termKey && (
              <p className="text-sm text-red-400">{errors.termKey.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-slate-200">
              Reason for Adjustment
            </Label>
            <Textarea
              id="reason"
              {...register('reason')}
              className="bg-slate-primary border-slate-600 text-white"
              placeholder="Enter reason for this adjustment..."
              rows={3}
            />
            {errors.reason && (
              <p className="text-sm text-red-400">{errors.reason.message}</p>
            )}
          </div>

          {/* Preview */}
          {adjustmentType && (
            <div className="p-3 bg-slate-primary rounded-lg border border-slate-600">
              <p className="text-slate-300 text-sm">
                This will {adjustmentType === 'credit' ? 'reduce' : 'increase'} the student's balance
              </p>
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
                  Applying...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  Apply Adjustment
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}