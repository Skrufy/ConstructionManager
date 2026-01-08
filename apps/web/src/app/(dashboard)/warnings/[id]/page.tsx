'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Warning {
  id: string
  warningType: string
  severity: string
  description: string
  incidentDate: string
  witnessNames: string | null
  actionRequired: string | null
  status: string
  acknowledged: boolean
  acknowledgedAt: string | null
  createdAt: string
  updatedAt: string
  employee: {
    id: string
    name: string
    email: string
    role: string
  }
  issuedBy: {
    id: string
    name: string
    role: string
  }
  project: {
    id: string
    name: string
  } | null
}

const WARNING_TYPES: Record<string, { label: string; color: string }> = {
  TARDINESS: { label: 'Tardiness', color: 'bg-yellow-100 text-yellow-800' },
  SAFETY_VIOLATION: { label: 'Safety Violation', color: 'bg-red-100 text-red-800' },
  INSUBORDINATION: { label: 'Insubordination', color: 'bg-purple-100 text-purple-800' },
  POOR_WORK_QUALITY: { label: 'Poor Work Quality', color: 'bg-orange-100 text-orange-800' },
  NO_SHOW: { label: 'No Show / No Call', color: 'bg-red-100 text-red-800' },
  DRESS_CODE: { label: 'Dress Code Violation', color: 'bg-blue-100 text-blue-800' },
  EQUIPMENT_MISUSE: { label: 'Equipment Misuse', color: 'bg-orange-100 text-orange-800' },
  UNPROFESSIONAL_CONDUCT: { label: 'Unprofessional Conduct', color: 'bg-pink-100 text-pink-800' }
}

const SEVERITY_LEVELS: Record<string, { label: string; color: string; bg: string }> = {
  VERBAL: { label: 'Verbal Warning', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  WRITTEN: { label: 'Written Warning', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  FINAL: { label: 'Final Warning', color: 'text-red-700', bg: 'bg-red-50 border-red-200' }
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-red-100 text-red-800',
  RESOLVED: 'bg-green-100 text-green-800',
  APPEALED: 'bg-yellow-100 text-yellow-800',
  VOID: 'bg-gray-100 text-gray-800 dark:text-gray-200'
}

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

export default function WarningDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [warning, setWarning] = useState<Warning | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  const canManageWarnings = session?.user && AUTHORIZED_ROLES.includes(session.user.role)
  const isOwnWarning = warning?.employee.id === session?.user?.id

  useEffect(() => {
    fetchWarning()
  }, [params.id])

  const fetchWarning = async () => {
    try {
      const res = await fetch(`/api/warnings/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setWarning(data)
      } else if (res.status === 404) {
        router.push('/warnings')
      }
    } catch (err) {
      console.error('Error fetching warning:', err)
      setError('Failed to load warning')
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async () => {
    if (!warning) return
    setUpdating(true)
    setError('')

    try {
      const res = await fetch(`/api/warnings/${warning.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged: true })
      })

      if (res.ok) {
        const data = await res.json()
        setWarning(data.warning)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to acknowledge warning')
      }
    } catch (err) {
      console.error('Error acknowledging warning:', err)
      setError('Failed to acknowledge warning')
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!warning) return
    setUpdating(true)
    setError('')

    try {
      const res = await fetch(`/api/warnings/${warning.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        const data = await res.json()
        setWarning(data.warning)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update warning')
      }
    } catch (err) {
      console.error('Error updating warning:', err)
      setError('Failed to update warning')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse max-w-4xl mx-auto">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!warning) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">Warning not found</p>
        <Link href="/warnings" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-4 inline-block">
          Back to Warnings
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/warnings"
          className="text-gray-600 hover:text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Warnings
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${WARNING_TYPES[warning.warningType]?.color || 'bg-gray-100 text-gray-800 dark:text-gray-200'}`}>
                {WARNING_TYPES[warning.warningType]?.label || warning.warningType}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[warning.status]}`}>
                {warning.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {canManageWarnings ? `Warning for ${warning.employee.name}` : 'Warning Details'}
            </h1>
          </div>

          <div className={`px-4 py-2 rounded-lg border ${SEVERITY_LEVELS[warning.severity]?.bg}`}>
            <div className={`font-semibold ${SEVERITY_LEVELS[warning.severity]?.color}`}>
              {SEVERITY_LEVELS[warning.severity]?.label || warning.severity}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Warning Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Incident Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Incident Date</label>
              <div className="font-medium text-gray-900 dark:text-gray-100">{formatDate(warning.incidentDate)}</div>
            </div>

            {warning.project && (
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Project</label>
                <div className="font-medium text-gray-900 dark:text-gray-100">{warning.project.name}</div>
              </div>
            )}

            {canManageWarnings && (
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Employee</label>
                <div className="font-medium text-gray-900 dark:text-gray-100">{warning.employee.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{warning.employee.email}</div>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Issued By</label>
              <div className="font-medium text-gray-900 dark:text-gray-100">{warning.issuedBy.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{warning.issuedBy.role.replace('_', ' ')}</div>
            </div>

            {warning.witnessNames && (
              <div className="md:col-span-2">
                <label className="text-sm text-gray-500 dark:text-gray-400">Witnesses</label>
                <div className="font-medium text-gray-900 dark:text-gray-100">{warning.witnessNames}</div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Description of Incident</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{warning.description}</p>
        </div>

        {warning.actionRequired && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Required Corrective Action</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{warning.actionRequired}</p>
          </div>
        )}
      </div>

      {/* Acknowledgement Section */}
      <div className={`rounded-lg shadow mb-6 ${warning.acknowledged ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {warning.acknowledged ? 'Warning Acknowledged' : 'Acknowledgement Required'}
              </h3>
              {warning.acknowledged && warning.acknowledgedAt && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Acknowledged on {formatDateTime(warning.acknowledgedAt)}
                </p>
              )}
              {!warning.acknowledged && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The employee must acknowledge they have read and understand this warning.
                </p>
              )}
            </div>

            {!warning.acknowledged && isOwnWarning && (
              <button
                onClick={handleAcknowledge}
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {updating ? 'Processing...' : 'Acknowledge Warning'}
              </button>
            )}

            {warning.acknowledged && (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Management Actions */}
      {canManageWarnings && warning.status === 'ACTIVE' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Management Actions</h3>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleUpdateStatus('RESOLVED')}
              disabled={updating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mark as Resolved
            </button>

            {session?.user?.role === 'ADMIN' && (
              <button
                onClick={() => handleUpdateStatus('VOID')}
                disabled={updating}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Void Warning
              </button>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Timeline</h3>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Warning Issued</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{formatDateTime(warning.createdAt)}</div>
            </div>
          </div>

          {warning.acknowledged && warning.acknowledgedAt && (
            <div className="flex gap-4">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Acknowledged by Employee</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{formatDateTime(warning.acknowledgedAt)}</div>
              </div>
            </div>
          )}

          {warning.status !== 'ACTIVE' && (
            <div className="flex gap-4">
              <div className={`w-2 h-2 rounded-full mt-2 ${warning.status === 'RESOLVED' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Status Changed to {warning.status}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{formatDateTime(warning.updatedAt)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
