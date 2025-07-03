import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get, push, update, onValue, off } from 'firebase/database'
import type { Student, User, Transaction, SchoolConfig, BursarActivity, FeeAdjustment, Notification } from '@/types'

const firebaseConfig = {
  apiKey: "AIzaSyBUFe6bLBJL8J8_h9x8EjwQ9KJ2YvqQ6-Y",
  authDomain: "mwenezi-fees-management.firebaseapp.com",
  databaseURL: "https://mwenezi-fees-management-default-rtdb.firebaseio.com",
  projectId: "mwenezi-fees-management",
  storageBucket: "mwenezi-fees-management.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:1234567890abcdef"
}

const app = initializeApp(firebaseConfig)
export const database = getDatabase(app)

// Database References
export const dbRefs = {
  users: () => ref(database, 'users'),
  user: (id: string) => ref(database, `users/${id}`),
  students: () => ref(database, 'students'),
  student: (id: string) => ref(database, `students/${id}`),
  transactions: () => ref(database, 'transactions'),
  transaction: (id: string) => ref(database, `transactions/${id}`),
  bursarActivity: () => ref(database, 'bursar_activity'),
  feeAdjustments: () => ref(database, 'fee_adjustments'),
  notifications: () => ref(database, 'notifications'),
  config: () => ref(database, 'config')
}

// Helper Functions
export const getData = async <T>(reference: any): Promise<T | null> => {
  try {
    const snapshot = await get(reference)
    return snapshot.exists() ? snapshot.val() : null
  } catch (error) {
    console.error('Error getting data:', error)
    return null
  }
}

export const setData = async (reference: any, data: any): Promise<boolean> => {
  try {
    await set(reference, data)
    return true
  } catch (error) {
    console.error('Error setting data:', error)
    return false
  }
}

export const updateData = async (reference: any, updates: any): Promise<boolean> => {
  try {
    await update(reference, updates)
    return true
  } catch (error) {
    console.error('Error updating data:', error)
    return false
  }
}

export const pushData = async (reference: any, data: any): Promise<string | null> => {
  try {
    const newRef = push(reference)
    await set(newRef, data)
    return newRef.key
  } catch (error) {
    console.error('Error pushing data:', error)
    return null
  }
}

// Real-time listeners
export const subscribeToData = <T>(
  reference: any,
  callback: (data: T | null) => void
): (() => void) => {
  const listener = onValue(reference, (snapshot) => {
    const data = snapshot.exists() ? snapshot.val() : null
    callback(data)
  })
  
  return () => off(reference, 'value', listener)
}

// Initialize database with seed data
export const seedInitialData = async (): Promise<void> => {
  try {
    console.log('Checking if database needs initialization...')
    
    // Check if data already exists
    const configSnapshot = await get(dbRefs.config())
    if (configSnapshot.exists()) {
      console.log('Database already initialized')
      return
    }

    console.log('Initializing database with seed data...')

    const initialData = {
      config: {
        fees: {
          dayScholar: {
            zjc: 200,
            oLevel: 200,
            aLevelSciences: 250,
            aLevelCommercials: 230,
            aLevelArts: 230
          },
          boarder: {
            zjc: 300,
            oLevel: 300,
            aLevelSciences: 350,
            aLevelCommercials: 330,
            aLevelArts: 330
          }
        },
        activeTerms: ['2025_Term1'],
        currencyCode: 840,
        zbPayConfig: {
          baseUrl: 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway',
          returnUrl: 'https://mghpayfees.netlify.app/#/student/payment-status',
          resultUrl: 'https://mghpayfees.netlify.app/.netlify/functions/zbPayWebhookHandler'
        }
      },
      users: {
        'admin-001': {
          id: 'admin-001',
          username: 'admin',
          password: 'admin123',
          role: 'admin',
          createdAt: new Date().toISOString()
        },
        'bursar-001': {
          id: 'bursar-001',
          username: 'bursar',
          password: 'bursar123',
          role: 'bursar',
          createdAt: new Date().toISOString()
        },
        'MHS-001': {
          id: 'MHS-001',
          username: 'MHS-001',
          password: 'student123',
          role: 'student',
          createdAt: new Date().toISOString()
        },
        'MHS-002': {
          id: 'MHS-002',
          username: 'MHS-002',
          password: 'student456',
          role: 'student',
          createdAt: new Date().toISOString()
        }
      },
      students: {
        'MHS-001': {
          id: 'MHS-001',
          name: 'John',
          surname: 'Doe',
          studentNumber: 'MHS-001',
          studentType: 'Day Scholar',
          gradeCategory: 'ZJC',
          grade: 'Form 1A1',
          guardianPhoneNumber: '+263771234567',
          financials: {
            balance: 200,
            terms: {
              '2025_Term1': {
                fee: 200,
                paid: 0
              }
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        'MHS-002': {
          id: 'MHS-002',
          name: 'Jane',
          surname: 'Smith',
          studentNumber: 'MHS-002',
          studentType: 'Boarder',
          gradeCategory: 'ALevel',
          grade: 'Lower 6 Sciences',
          guardianPhoneNumber: '+263779876543',
          financials: {
            balance: 350,
            terms: {
              '2025_Term1': {
                fee: 350,
                paid: 0
              }
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },
      transactions: {},
      bursar_activity: {},
      fee_adjustments: {},
      notifications: {}
    }

    // Set initial data
    await set(ref(database), initialData)
    console.log('Database initialized successfully with all required data')
  } catch (error) {
    console.error('Error seeding initial data:', error)
    throw error
  }
}

// Authentication helpers
export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  try {
    console.log('🔐 Starting authentication for username:', username)
    
    const usersSnapshot = await get(dbRefs.users())
    
    if (!usersSnapshot.exists()) {
      console.log('❌ No users found in database')
      return null
    }

    const users = usersSnapshot.val()
    console.log('👥 Found users in database:', Object.keys(users))
    
    // Find user by username and password
    const userArray = Object.values(users) as User[]
    const user = userArray.find((u: User) => {
      const usernameMatch = u.username === username
      const passwordMatch = u.password === password
      console.log(`🔍 Checking user: ${u.username}, username match: ${usernameMatch}, password match: ${passwordMatch}`)
      return usernameMatch && passwordMatch
    })

    if (user) {
      console.log('✅ User authenticated successfully:', user.username, 'Role:', user.role)
      
      // Update last login
      try {
        await update(dbRefs.user(user.id), {
          lastLogin: new Date().toISOString()
        })
        console.log('📅 Updated last login time')
      } catch (updateError) {
        console.error('⚠️ Error updating last login:', updateError)
      }
      
      return user
    } else {
      console.log('❌ Authentication failed: Invalid credentials')
      return null
    }
  } catch (error) {
    console.error('💥 Error authenticating user:', error)
    return null
  }
}

// Student helpers
export const calculateStudentFee = (
  studentType: string,
  gradeCategory: string,
  grade: string,
  fees: SchoolConfig['fees']
): number => {
  const feeStructure = studentType === 'Boarder' ? fees.boarder : fees.dayScholar

  switch (gradeCategory) {
    case 'ZJC':
      return feeStructure.zjc
    case 'OLevel':
      return feeStructure.oLevel
    case 'ALevel':
      if (grade.includes('Sciences')) return feeStructure.aLevelSciences
      if (grade.includes('Commercials')) return feeStructure.aLevelCommercials
      if (grade.includes('Arts')) return feeStructure.aLevelArts
      return feeStructure.aLevelSciences
    default:
      return 0
  }
}