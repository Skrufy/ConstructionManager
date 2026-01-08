'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'

interface TimeEntry {
  id: string
  type: 'time-entry'
  clockIn: string
  clockOut: string | null
  hours: number | null
  status: string
  notes: string | null
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  project: {
    id: string
    name: string
  }
}

interface DailyLog {
  id: string
  type: 'daily-log'
  date: string
  status: string
  crewCount: number
  totalHours: number
  notes: string | null
  submitter: {
    id: string
    name: string
    email: string
    role: string
  }
  project: {
    id: string
    name: string
  }
  _count: {
    entries: number
    materials: number
    issues: number
    visitors: number
  }
}

interface ApprovalData {
  timeEntries: TimeEntry[]
  dailyLogs: DailyLog[]
  summary: {
    pendingTimeEntries: number
    pendingDailyLogs: number
    totalPending: number
  }
}

const APPROVER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

export default function ApprovalsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<ApprovalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'time-entries' | 'daily-logs'>('all')
  const [rejectNotes, setRejectNotes] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<{ id: string; type: string } | null>(null)

  const canApprove = session?.user && APPROVER_ROLES.includes(session.user.role)

  useEffect(() => {
    if (!canApprove) {
      router.push('/dashboard')
      return
    }
    fetchApprovals()
  }, [canApprove, router])

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/approvals?type=all')
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (itemId: string, itemType: string, action: 'approve' | 'reject', notes?: string) => {
    setProcessing(itemId)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, itemType, action, notes })
      })

      if (res.ok) {
        await fetchApprovals()
        setShowRejectModal(null)
        setRejectNotes('')
      }
    } catch (error) {
      console.error('Error processing approval:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedItems.size === 0) return

    setProcessing('bulk')
    try {
      const items = Array.from(selectedItems).map(key => {
        const [type, id] = key.split(':')
        return { id, type }
      })

      const res = await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, action })
      })

      if (res.ok) {
        await fetchApprovals()
        setSelectedItems(new Set())
      }
    } catch (error) {
      console.error('Error in bulk action:', error)
    } finally {
      setProcessing(null)
    }
  }

  const toggleItemSelection = (type: string, id: string) => {
    const key = `${type}:${id}`
    const newSelected = new Set(selectedItems)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedItems(newSelected)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatHours = (hours: number | null) => {
    if (hours === null) return 'In Progress'
    return `${hours.toFixed(1)} hrs`
  }

  if (!canApprove) return null

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Approval Queue</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Review and approve time entries and daily logs</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data?.summary.totalPending || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Pending</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data?.summary.pendingTimeEntries || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Time Entries</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data?.summary.pendingDailyLogs || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Daily Logs</div>
        </div>
      </div>

      {/* Tabs and Bulk Actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'all' ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({data?.summary.totalPending || 0})
          </button>
          <button
            onClick={() => setActiveTab('time-entries')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'time-entries' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Time Entries ({data?.summary.pendingTimeEntries || 0})
          </button>
          <button
            onClick={() => setActiveTab('daily-logs')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'daily-logs' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Daily Logs ({data?.summary.pendingDailyLogs || 0})
          </button>
        </div>

        {selectedItems.size > 0 && (
          <div className="flex gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 self-center">{selectedItems.size} selected</span>
            <button
              onClick={() => handleBulkAction('approve')}
              disabled={processing === 'bulk'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Approve All
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              disabled={processing === 'bulk'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Reject All
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {data?.summary.totalPending === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">All caught up!</h3>
          <p className="text-gray-600 dark:text-gray-400">There are no pending items to approve.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Time Entries */}
          {(activeTab === 'all' || activeTab === 'time-entries') && data?.timeEntries.map(entry => (
            <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedItems.has(`time-entry:${entry.id}`)}
                  onChange={() => toggleItemSelection('time-entry', entry.id)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs font-medium">
                          Time Entry
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(entry.clockIn)}</span>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{entry.user.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{entry.project.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{formatHours(entry.hours)}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTime(entry.clockIn)} - {entry.clockOut ? formatTime(entry.clockOut) : 'Active'}
                      </div>
                    </div>
                  </div>
                  {entry.notes && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">{entry.notes}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleApproval(entry.id, 'time-entry', 'approve')}
                      disabled={processing === entry.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal({ id: entry.id, type: 'time-entry' })}
                      disabled={processing === entry.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Daily Logs */}
          {(activeTab === 'all' || activeTab === 'daily-logs') && data?.dailyLogs.map(log => (
            <div key={log.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedItems.has(`daily-log:${log.id}`)}
                  onChange={() => toggleItemSelection('daily-log', log.id)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500 dark:bg-gray-700"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-xs font-medium">
                          Daily Log
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(log.date)}</span>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{log.project.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Submitted by {log.submitter.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{log.crewCount}</span> crew
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{log.totalHours}</span> total hours
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{log._count.entries} entries</span>
                    <span>{log._count.materials} materials</span>
                    <span>{log._count.issues} issues</span>
                    <span>{log._count.visitors} visitors</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleApproval(log.id, 'daily-log', 'approve')}
                      disabled={processing === log.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal({ id: log.id, type: 'daily-log' })}
                      disabled={processing === log.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject
                    </button>
                    <a
                      href={`/daily-logs/${log.id}`}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Reject Item</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Please provide a reason for rejection (optional):</p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(null)
                  setRejectNotes('')
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproval(showRejectModal.id, showRejectModal.type, 'reject', rejectNotes)}
                disabled={processing === showRejectModal.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
