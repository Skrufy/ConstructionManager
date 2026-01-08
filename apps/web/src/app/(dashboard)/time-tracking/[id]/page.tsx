'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Clock,
  Calendar,
  User,
  Folder,
  MapPin,
  Coffee,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText
} from 'lucide-react'

interface TimeEntry {
  id: string
  user_id: string
  project_id: string
  project_name: string
  clock_in: string
  clock_out: string | null
  gps_latitude_in: number | null
  gps_longitude_in: number | null
  gps_latitude_out: number | null
  gps_longitude_out: number | null
  status: string
  notes: string | null
  user_name: string | null
  break_minutes?: number
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  APPROVED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
  ACTIVE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
}

export default function TimeEntryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [entry, setEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchTimeEntry(params.id as string)
    }
  }, [params.id])

  const fetchTimeEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/time-entries/${id}`)
      if (!res.ok) throw new Error('Time entry not found')
      const data = await res.json()
      // Handle both response formats
      setEntry(data.timeEntry || data.time_entry || data.entry || data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time entry')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC'
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC'
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })
  }

  const calculateHours = () => {
    if (!entry || !entry.clock_out) return null
    const start = new Date(entry.clock_in).getTime()
    const end = new Date(entry.clock_out).getTime()
    const breakMs = (entry.break_minutes || 0) * 60 * 1000
    const totalMs = end - start - breakMs
    const hours = totalMs / (1000 * 60 * 60)
    return hours.toFixed(2)
  }

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!entry) return
    setProcessing(true)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: entry.id,
          itemType: 'time-entry',
          action
        })
      })
      if (!res.ok) throw new Error(`Failed to ${action} time entry`)
      await fetchTimeEntry(entry.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error || 'Time entry not found'}
        </div>
        <Link href="/time-tracking" className="mt-4 inline-block text-blue-600 dark:text-blue-400">
          &larr; Back to Time Tracking
        </Link>
      </div>
    )
  }

  const totalHours = calculateHours()

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/time-tracking" className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
          </Link>
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[entry.status] || STATUS_COLORS.PENDING}`}>
              {entry.status}
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              Time Entry Details
            </h1>
          </div>
        </div>

        {entry.status === 'PENDING' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApproval('approve')}
              disabled={processing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </button>
            <button
              onClick={() => handleApproval('reject')}
              disabled={processing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {new Date(entry.clock_in).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC'
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Clock In</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatTime(entry.clock_in)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Clock Out</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {entry.clock_out ? formatTime(entry.clock_out) : '--:--'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {totalHours ? `${totalHours}h` : 'Active'}
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Entry Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entry.user_name && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Employee</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{entry.user_name}</p>
                </div>
              </div>
            )}

            {entry.project_name && (
              <div className="flex items-start gap-3">
                <Folder className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                  <Link
                    href={`/projects/${entry.project_id}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {entry.project_name}
                  </Link>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(entry.clock_in)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Time Period</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatTime(entry.clock_in)} - {entry.clock_out ? formatTime(entry.clock_out) : 'Active'}
                </p>
              </div>
            </div>

            {entry.break_minutes !== undefined && entry.break_minutes > 0 && (
              <div className="flex items-start gap-3">
                <Coffee className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Break Time</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{entry.break_minutes} minutes</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        {(entry.gps_latitude_in || entry.gps_latitude_out) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Data
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entry.gps_latitude_in && entry.gps_longitude_in && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Clock In Location</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {entry.gps_latitude_in.toFixed(6)}, {entry.gps_longitude_in.toFixed(6)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${entry.gps_latitude_in},${entry.gps_longitude_in}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                  >
                    View on map &rarr;
                  </a>
                </div>
              )}

              {entry.gps_latitude_out && entry.gps_longitude_out && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Clock Out Location</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {entry.gps_latitude_out.toFixed(6)}, {entry.gps_longitude_out.toFixed(6)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${entry.gps_latitude_out},${entry.gps_longitude_out}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                  >
                    View on map &rarr;
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
