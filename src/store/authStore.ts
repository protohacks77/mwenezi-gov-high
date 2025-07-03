import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { authenticateUser } from '@/lib/firebase'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => void
  updateUser: (user: User) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        console.log('🚀 Login attempt for:', username)
        set({ isLoading: true, error: null })
        
        try {
          const user = await authenticateUser(username, password)
          
          if (user) {
            console.log('✅ Login successful for:', user.username, 'Role:', user.role)
            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false,
              error: null
            })
            return true
          } else {
            console.log('❌ Login failed: Invalid credentials')
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false,
              error: 'Invalid username or password'
            })
            return false
          }
        } catch (error) {
          console.error('💥 Login error:', error)
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: 'Login failed. Please try again.'
          })
          return false
        }
      },

      logout: () => {
        console.log('👋 User logged out')
        set({ 
          user: null, 
          isAuthenticated: false,
          error: null
        })
      },

      checkAuth: () => {
        const { user } = get()
        const isAuthenticated = !!user
        console.log('🔍 Auth check:', { hasUser: !!user, isAuthenticated })
        set({ isAuthenticated })
      },

      updateUser: (user: User) => {
        set({ user })
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'mwenezi-auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
)