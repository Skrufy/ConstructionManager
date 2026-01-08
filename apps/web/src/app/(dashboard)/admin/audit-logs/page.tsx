'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import {
  ScrollText,
  Search,
  Loader2,
  AlertCircle,
  X,
  Filter,
  ChevronRight,
  ChevronLeft,
  Clock,
  User,
  Globe,
  FileText,
  Eye,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Settings,
  CheckCircle,
  XCircle,
  Calendar,
  Monitor,
} from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  resource: string
  resource_id: string | null
  user_id: string | null
  user_email: string | null
  user_name: string | null
  user_role: string | null
  project_id: string | null
  ip_address: string | null
  user_agent: string | null
  details: Record<string, unknown> | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  success: boolean
  error_message: string | null
  timestamp: string
}

interface PaginatedResponse {
  logs: AuditLog[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

// Action icon mapping
const getActionIcon = (action: string) => {
  switch (action.toLowerCase()) {
    case 'create':
      return Plus
    case 'update':
      return Pencil
    case 'delete':
      return Trash2
    case 'login':
      return LogIn
    case 'logout':
      return LogOut
    case 'view':
      return Eye
    case 'settings':
      return Settings
    default:
      return FileText
  }
}

// Action color mapping
const getActionColor = (action: string) => {
  switch (action.toLowerCase()) {
    case 'create':
      return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' }
    case 'update':
      return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' }
    case 'delete':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
    case 'login':
      return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' }
    case 'logout':
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
    case 'view':
      return { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
  }
}

// Format timestamp
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Parse user agent for display
const parseUserAgent = (ua: string | null): string => {
  if (!ua || ua === 'unknown') return 'Unknown'

  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS App'
  if (ua.includes('Android')) return 'Android App'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'

  return 'Web Browser'
}

export default function AuditLogsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 25

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const isAdmin = session?.user?.role === 'ADMIN'

  // Redirect non-admins
  useEffect(() => {
    if (sessionStatus === 'authenticated' && !isAdmin) {
      router.push('/dashboard')
    }
  }, [sessionStatus, isAdmin, router])

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())

      if (actionFilter) params.set('action', actionFilter)
      if (resourceFilter) params.set('resource', resourceFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied - Admin privileges required')
        }
        throw new Error('Failed to fetch audit logs')
      }

      const data: PaginatedResponse = await response.json()
      setLogs(data.logs)
      setTotalPages(data.total_pages)
      setTotal(data.total)
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, resourceFilter, startDate, endDate])

  useEffect(() => {
    if (isAdmin) {
      fetchLogs()
    }
  }, [fetchLogs, isAdmin])

  // Clear filters
  const clearFilters = () => {
    setActionFilter('')
    setResourceFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  // Filter logs by search query (client-side)
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.action.toLowerCase().includes(query) ||
      log.resource.toLowerCase().includes(query) ||
      log.user_email?.toLowerCase().includes(query) ||
      log.user_name?.toLowerCase().includes(query) ||
      log.resource_id?.toLowerCase().includes(query)
    )
  })

  // Get unique actions and resources from logs for filter dropdowns
  const uniqueActions = [...new Set(logs.map(l => l.action))].sort()
  const uniqueResources = [...new Set(logs.map(l => l.resource))].sort()

  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && !isAdmin) || (loading && logs.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading audit logs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-600 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <ScrollText className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold">Audit Logs</h1>
            </div>
            <p className="text-slate-200">
              Track all system activities and changes
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{total.toLocaleString()}</div>
            <div className="text-slate-300 text-sm">Total Events</div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 shadow-sm border border-red-100 dark:border-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by action, resource, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-lg text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${
              showFilters || actionFilter || resourceFilter || startDate || endDate
                ? 'bg-slate-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-5 w-5" />
            Filters
            {(actionFilter || resourceFilter || startDate || endDate) && (
              <span className="bg-white text-slate-600 text-xs px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action</label>
                <select
                  value={actionFilter}
                  onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Actions</option>
                  {uniqueActions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resource</label>
                <select
                  value={resourceFilter}
                  onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Resources</option>
                  {uniqueResources.map(resource => (
                    <option key={resource} value={resource}>{resource}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-slate-500 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            {(actionFilter || resourceFilter || startDate || endDate) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No audit logs found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || actionFilter || resourceFilter || startDate || endDate
                ? 'Try adjusting your filters'
                : 'System activities will appear here'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400">
              <div className="col-span-2">Action</div>
              <div className="col-span-2">Resource</div>
              <div className="col-span-3">User</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Time</div>
              <div className="col-span-1"></div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredLogs.map((log) => {
                const ActionIcon = getActionIcon(log.action)
                const actionColor = getActionColor(log.action)

                return (
                  <div
                    key={log.id}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedLog(log)}
                  >
                    {/* Action */}
                    <div className="lg:col-span-2 flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${actionColor.bg}`}>
                        <ActionIcon className={`h-4 w-4 ${actionColor.text}`} />
                      </div>
                      <span className={`font-semibold text-sm ${actionColor.text} hidden lg:inline`}>
                        {log.action}
                      </span>
                      {/* Mobile: Show all info inline */}
                      <div className="lg:hidden">
                        <div className={`font-semibold ${actionColor.text}`}>{log.action}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{log.resource}</div>
                      </div>
                    </div>

                    {/* Resource */}
                    <div className="lg:col-span-2 hidden lg:flex items-center">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{log.resource}</div>
                        {log.resource_id && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                            {log.resource_id}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User */}
                    <div className="lg:col-span-3 flex items-center gap-3">
                      <div className="hidden lg:flex w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 items-center justify-center">
                        <User className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {log.user_name || 'System'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {log.user_email || 'Automated action'}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="lg:col-span-2 flex items-center">
                      {log.success ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <XCircle className="h-3.5 w-3.5" />
                          Failed
                        </span>
                      )}
                    </div>

                    {/* Time */}
                    <div className="lg:col-span-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="h-4 w-4 hidden lg:inline" />
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>

                    {/* View Button */}
                    <div className="lg:col-span-1 flex items-center justify-end">
                      <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} logs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
        {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} displayed
        {searchQuery && ` (filtered from ${logs.length})`}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedLog(null)
          }}
        >
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedLog(null)}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-600 to-slate-800 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      {(() => {
                        const Icon = getActionIcon(selectedLog.action)
                        return <Icon className="h-5 w-5" />
                      })()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{selectedLog.action} {selectedLog.resource}</h3>
                      <p className="text-slate-200 text-sm">
                        {formatTimestamp(selectedLog.timestamp)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status */}
                <div className="flex items-center gap-4">
                  {selectedLog.success ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      Completed Successfully
                    </span>
                  ) : (
                    <div>
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle className="h-5 w-5" />
                        Failed
                      </span>
                      {selectedLog.error_message && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{selectedLog.error_message}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* User Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      User
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedLog.user_name || 'System'}
                    </div>
                    {selectedLog.user_email && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">{selectedLog.user_email}</div>
                    )}
                    {selectedLog.user_role && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">Role: {selectedLog.user_role}</div>
                    )}
                  </div>

                  {/* Resource Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <FileText className="h-4 w-4" />
                      Resource
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{selectedLog.resource}</div>
                    {selectedLog.resource_id && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                        ID: {selectedLog.resource_id}
                      </div>
                    )}
                  </div>

                  {/* IP Address */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Globe className="h-4 w-4" />
                      IP Address
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 font-mono">
                      {selectedLog.ip_address || 'Unknown'}
                    </div>
                  </div>

                  {/* Device */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Monitor className="h-4 w-4" />
                      Device
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {parseUserAgent(selectedLog.user_agent)}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      Timestamp
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(selectedLog.timestamp).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZoneName: 'short',
                      })}
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Additional Details</h4>
                    <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Old/New Values */}
                {(selectedLog.old_values || selectedLog.new_values) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Previous Values</h4>
                        <pre className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-sm text-red-800 dark:text-red-300 overflow-x-auto">
                          {JSON.stringify(selectedLog.old_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">New Values</h4>
                        <pre className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-sm text-green-800 dark:text-green-300 overflow-x-auto">
                          {JSON.stringify(selectedLog.new_values, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-full px-6 py-3 bg-slate-600 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
