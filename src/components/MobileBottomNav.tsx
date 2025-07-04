import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Home, 
  Users, 
  DollarSign, 
  Settings, 
  Bell,
  BarChart3,
  CreditCard,
  FileText,
  Calculator
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { icon: Home, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Users, label: 'Students', path: '/admin/students' },
  { icon: BarChart3, label: 'Activity', path: '/admin/financial-activity' },
  { icon: Settings, label: 'Config', path: '/admin/config' },
  { icon: Bell, label: 'Alerts', path: '/admin/notifications' },
]

const bursarNavItems = [
  { icon: DollarSign, label: 'Payments', path: '/bursar/payments' },
  { icon: FileText, label: 'Adjustments', path: '/bursar/adjustments' },
  { icon: Calculator, label: 'Reports', path: '/bursar/reconciliation' },
]

const studentNavItems = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: CreditCard, label: 'Payments', path: '/student/payments' },
]

export function MobileBottomNav() {
  const { user } = useAuthStore()
  const location = useLocation()

  const getNavItems = () => {
    switch (user?.role) {
      case 'admin':
        return adminNavItems
      case 'bursar':
        return bursarNavItems
      case 'student':
        return studentNavItems
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-secondary border-t border-slate-700">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link key={item.path} to={item.path} className="flex-1">
              <motion.div
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex flex-col items-center py-2 px-1 rounded-lg transition-colors",
                  isActive 
                    ? "text-maroon-primary" 
                    : "text-slate-400"
                )}
              >
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}