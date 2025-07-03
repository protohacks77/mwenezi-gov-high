import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { useAuthStore } from '@/store/authStore'

interface LayoutProps {
  children: ReactNode
  onSettingsClick: () => void
}

export function Layout({ children, onSettingsClick }: LayoutProps) {
  const { user } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-primary">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar onSettingsClick={onSettingsClick} />
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <MobileNav 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          onSettingsClick={onSettingsClick}
        />
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        <main className="min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="container mx-auto px-4 py-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}