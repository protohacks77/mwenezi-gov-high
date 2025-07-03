import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, UserCheck, LogOut, Settings } from 'lucide-react'
import { Button } from './ui/button'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  onSettingsClick: () => void
}

export function MobileNav({ sidebarOpen, setSidebarOpen, onSettingsClick }: MobileNavProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  return (
    <>
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-slate-secondary border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-white"
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-maroon-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="text-white font-semibold">Mwenezi High</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              className="text-white"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-white"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-secondary border-r border-slate-700"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-maroon-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">M</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white">Mwenezi High</h1>
                    <p className="text-xs text-slate-400">Fees Management</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
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

              {/* Navigation - will be populated based on role */}
              <nav className="flex-1 px-4 py-6">
                {/* Navigation items will be added when implementing role-specific pages */}
              </nav>

              {/* Settings & Logout */}
              <div className="p-4 border-t border-slate-700 space-y-2">
                <Button
                  onClick={() => {
                    onSettingsClick()
                    setSidebarOpen(false)
                  }}
                  variant="ghost"
                  className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Settings
                </Button>
                <Button
                  onClick={() => {
                    logout()
                    setSidebarOpen(false)
                  }}
                  variant="ghost"
                  className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}