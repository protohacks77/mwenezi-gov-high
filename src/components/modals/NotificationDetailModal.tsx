import React from 'react'
import { motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, XCircle, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Notification } from '@/types'

interface NotificationDetailModalProps {
  isOpen: boolean
  onClose: () => void
  notification: Notification | null
  onMarkAsRead: (notificationId: string) => void
  onDelete: (notificationId: string) => void
}

export function NotificationDetailModal({ 
  isOpen, 
  onClose, 
  notification,
  onMarkAsRead,
  onDelete 
}: NotificationDetailModalProps) {
  if (!notification) return null

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />
      case 'warning':
        return <AlertCircle className="w-8 h-8 text-amber-500" />
      case 'error':
        return <XCircle className="w-8 h-8 text-red-500" />
      default:
        return <Info className="w-8 h-8 text-blue-500" />
    }
  }

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20'
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20'
      case 'error':
        return 'bg-red-500/10 border-red-500/20'
      default:
        return 'bg-blue-500/10 border-blue-500/20'
    }
  }

  const handleMarkAsRead = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
    onClose()
  }

  const handleDelete = () => {
    onDelete(notification.id)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-secondary border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>Notification Details</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Notification Content */}
          <div className={`p-4 rounded-lg border ${getNotificationBgColor(notification.type)}`}>
            <div className="flex items-start space-x-3">
              {getNotificationIcon(notification.type)}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-white font-medium">{notification.title}</h3>
                  {!notification.read && (
                    <Badge variant="destructive" className="text-xs">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {notification.message}
                </p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="p-3 bg-slate-primary rounded-lg border border-slate-600">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-400">Type</p>
                <p className="text-white capitalize">{notification.type}</p>
              </div>
              <div>
                <p className="text-slate-400">Status</p>
                <p className={notification.read ? 'text-green-400' : 'text-amber-400'}>
                  {notification.read ? 'Read' : 'Unread'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400">Received</p>
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <p className="text-white">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between space-x-3 pt-4">
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
            >
              Delete
            </Button>
            <div className="flex space-x-2">
              {!notification.read && (
                <Button
                  onClick={() => onMarkAsRead(notification.id)}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300"
                >
                  Mark as Read
                </Button>
              )}
              <Button
                onClick={handleMarkAsRead}
                variant="maroon"
                size="sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}