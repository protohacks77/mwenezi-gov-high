import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, CheckCircle, AlertCircle, Info, XCircle, BookMarked as MarkAsRead, Trash2, Filter, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDataStore } from '@/store/dataStore'
import { formatDate } from '@/lib/utils'
import { NotificationDetailModal } from '@/components/modals/NotificationDetailModal'
import toast from 'react-hot-toast'

export function AdminNotifications() {
  const { notifications } = useDataStore()
  const [filter, setFilter] = useState('all')
  const [selectedNotification, setSelectedNotification] = useState<any>(null)

  const notificationList = Object.values(notifications)
    .filter(n => n.userRole === 'admin')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const filteredNotifications = notificationList.filter(notification => {
    if (filter === 'unread') return !notification.read
    if (filter === 'read') return notification.read
    if (filter !== 'all') return notification.type === filter
    return true
  })

  const unreadCount = notificationList.filter(n => !n.read).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getNotificationBorder = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500'
      case 'warning':
        return 'border-l-amber-500'
      case 'error':
        return 'border-l-red-500'
      default:
        return 'border-l-blue-500'
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/.netlify/functions/markNotificationAsRead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId })
      })

      if (response.ok) {
        toast.success('Notification marked as read')
      } else {
        throw new Error('Failed to mark as read')
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/.netlify/functions/deleteNotification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId })
      })

      if (response.ok) {
        toast.success('Notification deleted')
      } else {
        throw new Error('Failed to delete notification')
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notificationList.filter(n => !n.read)
      const response = await fetch('/.netlify/functions/markAllNotificationsAsRead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          notificationIds: unreadNotifications.map(n => n.id),
          userRole: 'admin'
        })
      })

      if (response.ok) {
        toast.success('All notifications marked as read')
      } else {
        throw new Error('Failed to mark all as read')
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Failed to mark all notifications as read')
    }
  }

  const handleNotificationClick = (notification: any) => {
    setSelectedNotification(notification)
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Bell className="w-8 h-8 mr-3 text-amber-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-3">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-slate-400 mt-1">System notifications and activity updates</p>
        </div>
        {unreadCount > 0 && (
          <Button 
            onClick={markAllAsRead}
            variant="outline" 
            className="border-slate-600 text-slate-300"
          >
            <MarkAsRead className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total</p>
                <p className="text-2xl font-bold text-white">{notificationList.length}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Unread</p>
                <p className="text-2xl font-bold text-amber-400">{unreadCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Success</p>
                <p className="text-2xl font-bold text-green-400">
                  {notificationList.filter(n => n.type === 'success').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Errors</p>
                <p className="text-2xl font-bold text-red-400">
                  {notificationList.filter(n => n.type === 'error').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Filter Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full md:w-48 bg-slate-primary border-slate-600 text-white">
              <SelectValue placeholder="Filter by..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-primary border-slate-600">
              <SelectItem value="all">All Notifications</SelectItem>
              <SelectItem value="unread">Unread Only</SelectItem>
              <SelectItem value="read">Read Only</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="info">Information</SelectItem>
              <SelectItem value="warning">Warnings</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="bg-slate-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">
            Notifications ({filteredNotifications.length})
          </CardTitle>
          <CardDescription className="text-slate-400">
            Click on a notification to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 bg-slate-primary rounded-lg border-l-4 cursor-pointer ${getNotificationBorder(notification.type)} ${
                    !notification.read ? 'bg-opacity-80' : 'bg-opacity-40'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className={`font-medium ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <Badge variant="destructive" className="text-xs">
                              New
                            </Badge>
                          )}
                          {notification.read && (
                            <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                              Opened
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${!notification.read ? 'text-slate-300' : 'text-slate-400'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedNotification(notification)
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No notifications found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <NotificationDetailModal
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        notification={selectedNotification}
        onMarkAsRead={markAsRead}
        onDelete={deleteNotification}
      />
    </div>
  )
}