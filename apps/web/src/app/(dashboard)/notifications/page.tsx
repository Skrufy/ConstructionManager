'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  RefreshCw,
  Settings,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ChevronDown,
  Loader2,
  Inbox,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  severity: string
  category: string
  read: boolean
  readAt: string | null
  actionUrl: string | null
  createdAt: string
  data?: Record<string, unknown>
}

type FilterType = 'all' | 'unread' | 'read'
type CategoryFilter = 'all' | 'SYSTEM' | 'API' | 'APPROVAL' | 'SAFETY' | 'DOCUMENT'

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'All Categories',
  SYSTEM: 'System',
  API: 'Integrations',
  APPROVAL: 'Approvals',
  SAFETY: 'Safety',
  DOCUMENT: 'Documents',
}

const SEVERITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: XCircle,
  CRITICAL: AlertCircle,
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  // Selected notifications for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Fetch notifications
  const fetchNotifications = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true)
    }

    try {
      const params = new URLSearchParams()
      if (filterType === 'unread') {
        params.set('unreadOnly', 'true')
      }

      const res = await fetch(`/api/notifications?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      setError('Failed to load notifications. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filterType])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Polling for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications(false)
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      })

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    setBulkActionLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
      )
      setUnreadCount(0)
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      })

      const notification = notifications.find(n => n.id === id)
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      setNotifications(prev => prev.filter(n => n.id !== id))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Select all visible
  const selectAll = () => {
    const filtered = getFilteredNotifications()
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(n => n.id)))
    }
  }

  // Delete selected
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return

    setBulkActionLoading(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch('/api/notifications', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: id }),
          })
        )
      )

      const deletedUnreadCount = notifications.filter(
        n => selectedIds.has(n.id) && !n.read
      ).length

      setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)))
      setUnreadCount(prev => Math.max(0, prev - deletedUnreadCount))
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Failed to delete selected:', err)
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Filter notifications
  const getFilteredNotifications = () => {
    return notifications.filter(n => {
      // Read/unread filter
      if (filterType === 'unread' && n.read) return false
      if (filterType === 'read' && !n.read) return false

      // Category filter
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false

      return true
    })
  }

  // Get severity styling
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/20'
      case 'ERROR':
        return 'border-l-4 border-l-red-400 bg-red-50 dark:bg-red-900/10'
      case 'WARNING':
        return 'border-l-4 border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
      default:
        return 'border-l-4 border-l-blue-400 bg-blue-50 dark:bg-blue-900/10'
    }
  }

  const getSeverityBadgeStyles = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      case 'ERROR':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
      case 'WARNING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
    }
  }

  const getCategoryBadgeStyles = (category: string) => {
    switch (category) {
      case 'API':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
      case 'APPROVAL':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'SAFETY':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
      case 'DOCUMENT':
        return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDateTime(date)
  }

  const filteredNotifications = getFilteredNotifications()
  const SeverityIcon = (severity: string) => SEVERITY_ICONS[severity] || Info

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Bell className="h-7 w-7 text-primary-600" />
            Notifications
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-sm font-medium bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Stay updated with system alerts, approvals, and important updates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/profile"
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Notification Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-800 dark:text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
          <button
            onClick={() => fetchNotifications(true)}
            className="ml-auto text-sm font-medium hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            {(['all', 'unread', 'read'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filterType === type
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {type === 'all' ? 'All' : type === 'unread' ? 'Unread' : 'Read'}
                {type === 'unread' && unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter className="h-4 w-4" />
              {CATEGORY_LABELS[categoryFilter]}
              <ChevronDown className="h-4 w-4" />
            </button>

            {showFilterDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilterDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
                  {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategoryFilter(cat)
                        setShowFilterDropdown(false)
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        categoryFilter === cat
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {filteredNotifications.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                onChange={selectAll}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              Select all ({filteredNotifications.length})
            </label>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedIds.size} selected
                </span>
              )}

              <button
                onClick={markAllAsRead}
                disabled={bulkActionLoading || unreadCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>

              {selectedIds.size > 0 && (
                <button
                  onClick={deleteSelected}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  {bulkActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete selected
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {filterType === 'unread'
              ? 'No unread notifications'
              : filterType === 'read'
              ? 'No read notifications'
              : 'No notifications yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filterType === 'unread'
              ? 'You\'re all caught up!'
              : 'Notifications will appear here when there are updates'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const IconComponent = SeverityIcon(notification.severity)

            return (
              <div
                key={notification.id}
                className={`card overflow-hidden transition-all ${
                  notification.read ? 'opacity-75' : ''
                } ${getSeverityStyles(notification.severity)}`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(notification.id)}
                      onChange={() => toggleSelection(notification.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />

                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${getSeverityBadgeStyles(notification.severity)}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getCategoryBadgeStyles(notification.category)}`}>
                          {CATEGORY_LABELS[notification.category as CategoryFilter] || notification.category}
                        </span>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-primary-500 rounded-full" />
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>

                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {notification.actionUrl && (
                        <Link
                          href={notification.actionUrl}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                          title="View details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Notification Preferences Link */}
      <div className="card p-6 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Notification Preferences</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage email notifications, push alerts, and more
            </p>
          </div>
          <Link
            href="/profile"
            className="btn btn-outline flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>
    </div>
  )
}
