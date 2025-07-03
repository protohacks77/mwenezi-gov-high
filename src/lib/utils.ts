import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function generateStudentId(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 999).toString().padStart(3, '0')
  return `MHS-${timestamp}${random}`
}

export function generateReceiptNumber(): string {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 99).toString().padStart(2, '0')
  return `RCT-${timestamp}${random}`
}

export function generateOrderReference(): string {
  return `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export function generateTransactionId(): string {
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export function getPaymentStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'zb payment successful':
    case 'paid':
      return 'text-green-500'
    case 'pending zb confirmation':
    case 'processing':
      return 'text-amber-500'
    case 'failed':
    case 'canceled':
    case 'zb payment failed':
      return 'text-red-500'
    default:
      return 'text-slate-400'
  }
}

export function getStudentStatusColor(balance: number): string {
  if (balance <= 0) return 'bg-green-500'
  if (balance <= 100) return 'bg-amber-500'
  return 'bg-red-500'
}

export function calculateStudentBalance(terms: Record<string, { fee: number, paid: number }>): number {
  return Object.values(terms).reduce((total, term) => total + (term.fee - term.paid), 0)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}