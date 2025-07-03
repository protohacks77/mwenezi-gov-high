import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Settings, Eye, EyeOff, Save, X } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

const usernameSchema = z.object({
  newUsername: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(1, 'Password is required for verification'),
})

type PasswordFormData = z.infer<typeof passwordSchema>
type UsernameFormData = z.infer<typeof usernameSchema>

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuthStore()
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    verify: false
  })
  const [isLoading, setIsLoading] = useState(false)

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const usernameForm = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      newUsername: user?.username || ''
    }
  })

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/.netlify/functions/updateUserPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          role: user.role
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Password updated successfully!')
        passwordForm.reset()
      } else {
        toast.error(result.error || 'Failed to update password')
      }
    } catch (error) {
      console.error('Password update error:', error)
      toast.error('Failed to update password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const onUsernameSubmit = async (data: UsernameFormData) => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/.netlify/functions/updateUsername', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          newUsername: data.newUsername,
          password: data.password,
          role: user.role
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Username updated successfully!')
        usernameForm.reset({ newUsername: data.newUsername, password: '' })
      } else {
        toast.error(result.error || 'Failed to update username')
      }
    } catch (error) {
      console.error('Username update error:', error)
      toast.error('Failed to update username. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-secondary border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <Settings className="w-5 h-5 mr-2 text-amber-primary" />
            Account Settings
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Manage your account preferences and security
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-primary">
            <TabsTrigger value="password" className="text-slate-300 data-[state=active]:bg-maroon-primary data-[state=active]:text-white">
              Password
            </TabsTrigger>
            <TabsTrigger value="username" className="text-slate-300 data-[state=active]:bg-maroon-primary data-[state=active]:text-white">
              Username
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password" className="space-y-4 mt-6">
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-slate-200">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    placeholder="Enter current password"
                    {...passwordForm.register('currentPassword')}
                    className="bg-slate-primary border-slate-600 text-white placeholder:text-slate-500 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10 text-slate-400 hover:text-white"
                    onClick={() => togglePasswordVisibility('current')}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-red-400">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-200">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    placeholder="Enter new password"
                    {...passwordForm.register('newPassword')}
                    className="bg-slate-primary border-slate-600 text-white placeholder:text-slate-500 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10 text-slate-400 hover:text-white"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-red-400">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-200">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    {...passwordForm.register('confirmPassword')}
                    className="bg-slate-primary border-slate-600 text-white placeholder:text-slate-500 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10 text-slate-400 hover:text-white"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-400">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="maroon"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Updating...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Update Password
                  </div>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="username" className="space-y-4 mt-6">
            <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newUsername" className="text-slate-200">
                  New Username
                </Label>
                <Input
                  id="newUsername"
                  type="text"
                  placeholder="Enter new username"
                  {...usernameForm.register('newUsername')}
                  className="bg-slate-primary border-slate-600 text-white placeholder:text-slate-500"
                />
                {usernameForm.formState.errors.newUsername && (
                  <p className="text-sm text-red-400">{usernameForm.formState.errors.newUsername.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="verifyPassword" className="text-slate-200">
                  Verify Password
                </Label>
                <div className="relative">
                  <Input
                    id="verifyPassword"
                    type={showPasswords.verify ? 'text' : 'password'}
                    placeholder="Enter your password to verify"
                    {...usernameForm.register('password')}
                    className="bg-slate-primary border-slate-600 text-white placeholder:text-slate-500 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10 text-slate-400 hover:text-white"
                    onClick={() => togglePasswordVisibility('verify')}
                  >
                    {showPasswords.verify ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {usernameForm.formState.errors.password && (
                  <p className="text-sm text-red-400">{usernameForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="maroon"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Updating...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Update Username
                  </div>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}