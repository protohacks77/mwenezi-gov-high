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
import { Badge } from './ui/badge'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { icon: Home, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Users, label: 'Students', path: '/admin/students' },
  { icon: BarChart3, label: 'Activity', path: '/admin/financial-activity' },
  { icon: Settings, label: 'Config', path: '/admin/config' },
  { icon: Bell, label: 'Alerts', path: '/admin/notifications', hasNotifications: true },
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
  const { notifications } = useDataStore()
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

  // Get unread notifications count for current user
  const unreadNotificationsCount = Object.values(notifications).filter(
    n => n.userRole === user?.role && !n.read
  ).length

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-secondary border-t border-slate-700">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const showNotificationBadge = item.hasNotifications && unreadNotificationsCount > 0
          
          return (
            <Link key={item.path} to={item.path} className="flex-1">
              <motion.div
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex flex-col items-center py-2 px-1 rounded-lg transition-colors relative",
                  isActive 
                    ? "text-maroon-primary" 
                    : "text-slate-400"
                )}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5 mb-1" />
                  {showNotificationBadge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 text-xs min-w-[16px] h-4 p-0 flex items-center justify-center"
                    >
                      {unreadNotificationsCount}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}