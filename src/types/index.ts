export interface User {
  id: string
  username: string
  role: 'admin' | 'bursar' | 'student'
  password: string
  createdAt: string
  lastLogin?: string
}

export interface Student {
  id: string
  name: string
  surname: string
  studentNumber: string
  studentType: 'Day Scholar' | 'Boarder'
  gradeCategory: 'ZJC' | 'OLevel' | 'ALevel'
  grade: string
  guardianPhoneNumber: string
  financials: {
    balance: number
    terms: Record<string, {
      fee: number
      paid: number
    }>
  }
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  studentId: string
  studentName: string
  amount: number
  type: 'cash' | 'zbpay' | 'adjustment'
  status: 'completed' | 'pending_zb_confirmation' | 'zb_payment_successful' | 'zb_payment_failed' | 'failed' | 'canceled'
  termKey?: string
  receiptNumber?: string
  orderReference?: string
  transactionId?: string
  bursarId?: string
  bursarUsername?: string
  adminId?: string
  reason?: string
  adjustmentType?: 'debit' | 'credit'
  createdAt: string
  updatedAt: string
}

export interface BursarActivity {
  id: string
  bursarId: string
  bursarUsername: string
  studentId: string
  studentName: string
  amount: number
  termKey: string
  receiptNumber: string
  createdAt: string
}

export interface FeeAdjustment {
  id: string
  studentId: string
  studentName: string
  adjustmentAmount: number
  termKey: string
  reason: string
  adjustmentType: 'debit' | 'credit'
  adminId: string
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  userRole: 'admin' | 'bursar' | 'student'
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
}

export interface SchoolConfig {
  fees: {
    dayScholar: {
      zjc: number
      oLevel: number
      aLevelSciences: number
      aLevelCommercials: number
      aLevelArts: number
    }
    boarder: {
      zjc: number
      oLevel: number
      aLevelSciences: number
      aLevelCommercials: number
      aLevelArts: number
    }
  }
  activeTerms: string[]
  currencyCode: number // 840 for USD, 924 for ZWL
  zbPayConfig: {
    baseUrl: string
    returnUrl: string
    resultUrl: string
  }
}

export interface PaymentRequest {
  studentId: string
  amount: number
  termKey: string
  returnUrl: string
  resultUrl: string
}

export interface ZbPayResponse {
  success: boolean
  paymentUrl?: string
  orderReference?: string
  transactionId?: string
  error?: string
}

export interface PaymentStatusResponse {
  success: boolean
  status: string
  orderReference: string
  transactionId: string
  amount?: number
  error?: string
}

// Form validation schemas
export interface LoginFormData {
  username: string
  password: string
}

export interface CreateStudentFormData {
  name: string
  surname: string
  studentNumber: string
  studentType: 'Day Scholar' | 'Boarder'
  gradeCategory: 'ZJC' | 'OLevel' | 'ALevel'
  grade: string
  guardianPhoneNumber: string
}

export interface ProcessPaymentFormData {
  amount: number
  termKey: string
}

export interface FeeAdjustmentFormData {
  adjustmentAmount: number
  termKey: string
  reason: string
  adjustmentType: 'debit' | 'credit'
}

export interface PasswordChangeFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}