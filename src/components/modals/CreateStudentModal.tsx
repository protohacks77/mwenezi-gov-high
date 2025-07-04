import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { UserPlus, Save, X } from 'lucide-react'
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
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const createStudentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  surname: z.string().min(1, 'Surname is required'),
  studentNumber: z.string().min(1, 'Student number is required'),
  studentType: z.enum(['Day Scholar', 'Boarder']),
  gradeCategory: z.enum(['ZJC', 'OLevel', 'ALevel']),
  grade: z.string().min(1, 'Grade is required'),
  guardianPhoneNumber: z.string().min(1, 'Guardian phone number is required'),
})

type CreateStudentFormData = z.infer<typeof createStudentSchema>

interface CreateStudentModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateStudentModal({ isOpen, onClose }: CreateStudentModalProps) {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentSchema),
  })

  const gradeCategory = watch('gradeCategory')

  const getGradeOptions = () => {
    switch (gradeCategory) {
      case 'ZJC':
        return [
          'Form 1A1', 'Form 1A2', 'Form 1A3',
          'Form 2A1', 'Form 2A2', 'Form 2A3'
        ]
      case 'OLevel':
        return [
          'Form 3A1', 'Form 3A2', 'Form 3A3',
          'Form 4A1', 'Form 4A2', 'Form 4A3'
        ]
      case 'ALevel':
        return [
          'Lower 6 Sciences', 'Lower 6 Commercials', 'Lower 6 Arts',
          'Upper 6 Sciences', 'Upper 6 Commercials', 'Upper 6 Arts'
        ]
      default:
        return []
    }
  }

  const onSubmit = async (data: CreateStudentFormData) => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/.netlify/functions/createStudentAndBillActiveTerms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          adminId: user.id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Student ${data.name} ${data.surname} created successfully! Login: ${data.studentNumber} / student123`)
        reset()
        onClose()
      } else {
        toast.error(result.error || 'Failed to create student')
      }
    } catch (error) {
      console.error('Create student error:', error)
      toast.error('Failed to create student. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-secondary border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-amber-primary" />
            Create New Student
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a new student to the system and automatically bill for active terms
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-200">
                  First Name
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  className="bg-slate-primary border-slate-600 text-white"
                  placeholder="Enter first name"
                />
                {errors.name && (
                  <p className="text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname" className="text-slate-200">
                  Surname
                </Label>
                <Input
                  id="surname"
                  {...register('surname')}
                  className="bg-slate-primary border-slate-600 text-white"
                  placeholder="Enter surname"
                />
                {errors.surname && (
                  <p className="text-sm text-red-400">{errors.surname.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentNumber" className="text-slate-200">
                Student Number
              </Label>
              <Input
                id="studentNumber"
                {...register('studentNumber')}
                className="bg-slate-primary border-slate-600 text-white"
                placeholder="e.g., MHS-003"
              />
              {errors.studentNumber && (
                <p className="text-sm text-red-400">{errors.studentNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardianPhoneNumber" className="text-slate-200">
                Guardian Phone Number
              </Label>
              <Input
                id="guardianPhoneNumber"
                {...register('guardianPhoneNumber')}
                className="bg-slate-primary border-slate-600 text-white"
                placeholder="e.g., +263771234567"
              />
              {errors.guardianPhoneNumber && (
                <p className="text-sm text-red-400">{errors.guardianPhoneNumber.message}</p>
              )}
            </div>
          </div>

          {/* Academic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Student Type</Label>
                <Select onValueChange={(value) => setValue('studentType', value as any)}>
                  <SelectTrigger className="bg-slate-primary border-slate-600 text-white">
                    <SelectValue placeholder="Select student type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-primary border-slate-600">
                    <SelectItem value="Day Scholar">Day Scholar</SelectItem>
                    <SelectItem value="Boarder">Boarder</SelectItem>
                  </SelectContent>
                </Select>
                {errors.studentType && (
                  <p className="text-sm text-red-400">{errors.studentType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Grade Category</Label>
                <Select onValueChange={(value) => setValue('gradeCategory', value as any)}>
                  <SelectTrigger className="bg-slate-primary border-slate-600 text-white">
                    <SelectValue placeholder="Select grade category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-primary border-slate-600">
                    <SelectItem value="ZJC">ZJC</SelectItem>
                    <SelectItem value="OLevel">O Level</SelectItem>
                    <SelectItem value="ALevel">A Level</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gradeCategory && (
                  <p className="text-sm text-red-400">{errors.gradeCategory.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Grade/Class</Label>
              <Select 
                onValueChange={(value) => setValue('grade', value)}
                disabled={!gradeCategory}
              >
                <SelectTrigger className="bg-slate-primary border-slate-600 text-white">
                  <SelectValue placeholder={gradeCategory ? "Select grade/class" : "Select grade category first"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-primary border-slate-600">
                  {getGradeOptions().map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.grade && (
                <p className="text-sm text-red-400">{errors.grade.message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6">
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
                  Creating...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  Create Student
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}