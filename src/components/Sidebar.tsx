import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Home, 
  Users, 
  DollarSign, 
  Settings, 
  LogOut,
  Receipt,
  Bell,
  BarChart3,
  UserCheck,
  CreditCard,
  FileText,
  Calculator,
  TrendingUp
} from 'lucide-react'
import { Button } from './ui/button'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { icon: Home, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Users, label: 'Manage Students', path: '/admin/students' },
  { icon: BarChart3, label: 'Financial Activity', path: '/admin/financial-activity' },
  { icon: Settings, label: 'Fee/Term Config', path: '/admin/config' },
  { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
]

const bursarNavItems = [
  { icon: DollarSign, label: 'Cash Payments', path: '/bursar/payments' },
  { icon: FileText, label: 'Fee Adjustments', path: '/bursar/adjustments' },
  { icon: Calculator, label: 'Daily Reconciliation', path: '/bursar/reconciliation' },
]

const studentNavItems = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: CreditCard, label: 'Payment History', path: '/student/payments' },
]

interface SidebarProps {
  onSettingsClick: () => void
}

export function Sidebar({ onSettingsClick }: SidebarProps) {
  const { user, logout } = useAuthStore()
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
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-secondary border-r border-slate-700"
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-maroon-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Mwenezi High</h1>
              <p className="text-xs text-slate-400">Fees Management</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-amber-primary rounded-full flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.username}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-maroon-primary text-white" 
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* Settings & Logout */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          <Button
            onClick={onSettingsClick}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </Button>
          <Button
            onClick={logout}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>
    </motion.div>
  )
}