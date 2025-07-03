import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const onSubmit = async (data: LoginFormData) => {
    console.log('📝 Form submitted with:', { username: data.username, passwordLength: data.password.length })
    
    clearError()
    
    try {
      const success = await login(data.username, data.password)
      
      if (success) {
        toast.success('Login successful!')
        reset()
      } else {
        toast.error('Invalid username or password')
      }
    } catch (error) {
      console.error('💥 Login form error:', error)
      toast.error('Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-primary flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-slate-secondary border-slate-700">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-maroon-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-3xl">M</span>
            </div>
            <div>
              <CardTitle className="text-2xl text-white font-bold">
                Mwenezi High School
              </CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                Fees Management System
              </CardDescription>
              <p className="text-xs text-amber-primary mt-1 font-medium">
                "Relevant Education for Livelihood"
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-200">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  {...register('username')}
                  className="bg-slate-primary border-slate-600 text-white placeholder:text-slate-500"
                  disabled={isLoading}
                />
                {errors.username && (
                  <p className="text-sm text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    className="bg-slate-primary border-slate-600 text-white placeholder:text-slate-500 pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10 text-slate-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.password.message}
                  </p>
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
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </div>
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-slate-primary rounded-lg border border-slate-600">
              <h4 className="text-sm font-medium text-white mb-2">Demo Credentials:</h4>
              <div className="space-y-1 text-xs text-slate-400">
                <p><span className="text-amber-primary">Admin:</span> admin / admin123</p>
                <p><span className="text-amber-primary">Bursar:</span> bursar / bursar123</p>
                <p><span className="text-amber-primary">Student:</span> MHS-001 / student123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}