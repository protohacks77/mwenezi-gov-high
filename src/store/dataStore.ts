import { create } from 'zustand'
import type { Student, Transaction, SchoolConfig, Notification } from '@/types'
import { subscribeToData, dbRefs } from '@/lib/firebase'

interface DataState {
  students: Record<string, Student>
  transactions: Record<string, Transaction>
  config: SchoolConfig | null
  notifications: Record<string, Notification>
  isLoading: boolean
  error: string | null
  
  // Actions
  setStudents: (students: Record<string, Student>) => void
  setTransactions: (transactions: Record<string, Transaction>) => void
  setConfig: (config: SchoolConfig) => void
  setNotifications: (notifications: Record<string, Notification>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Real-time subscriptions
  subscribeToStudents: () => (() => void)
  subscribeToTransactions: () => (() => void)
  subscribeToConfig: () => (() => void)
  subscribeToNotifications: (userId: string) => (() => void)
}

export const useDataStore = create<DataState>((set, get) => ({
  students: {},
  transactions: {},
  config: null,
  notifications: {},
  isLoading: false,
  error: null,

  setStudents: (students) => set({ students: students || {} }),
  setTransactions: (transactions) => set({ transactions: transactions || {} }),
  setConfig: (config) => set({ config }),
  setNotifications: (notifications) => set({ notifications: notifications || {} }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  subscribeToStudents: () => {
    return subscribeToData<Record<string, Student>>(
      dbRefs.students(),
      (data) => {
        get().setStudents(data || {})
      }
    )
  },

  subscribeToTransactions: () => {
    return subscribeToData<Record<string, Transaction>>(
      dbRefs.transactions(),
      (data) => {
        get().setTransactions(data || {})
      }
    )
  },

  subscribeToConfig: () => {
    return subscribeToData<SchoolConfig>(
      dbRefs.config(),
      (data) => {
        if (data) get().setConfig(data)
      }
    )
  },

  subscribeToNotifications: (userId: string) => {
    return subscribeToData<Record<string, Notification>>(
      dbRefs.notifications(),
      (data) => {
        if (data) {
          // Filter notifications for the current user
          const userNotifications = Object.fromEntries(
            Object.entries(data).filter(([_, notification]) => 
              notification.userId === userId
            )
          )
          get().setNotifications(userNotifications)
        }
      }
    )
  }
}))