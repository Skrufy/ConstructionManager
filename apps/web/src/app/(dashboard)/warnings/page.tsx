'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import Link from 'next/link'

interface Warning {
  id: string
  warningType: string
  severity: string
  description: string
  incidentDate: string
  status: string
  acknowledged: boolean
  acknowledgedAt: string | null
  createdAt: string
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
  TARDINESS: { label: 'Tardiness', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' },
  SAFETY_VIOLATION: { label: 'Safety Violation', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' },
  INSUBORDINATION: { label: 'Insubordination', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' },
  POOR_WORK_QUALITY: { label: 'Poor Work Quality', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400' },
  NO_SHOW: { label: 'No Show', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' },
  DRESS_CODE: { label: 'Dress Code', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' },
  EQUIPMENT_MISUSE: { label: 'Equipment Misuse', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400' },
  UNPROFESSIONAL_CONDUCT: { label: 'Unprofessional Conduct', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-400' }
}

const SEVERITY_LEVELS: Record<string, { label: string; color: string }> = {
  VERBAL: { label: 'Verbal Warning', color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  WRITTEN: { label: 'Written Warning', color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  FINAL: { label: 'Final Warning', color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' }
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
  RESOLVED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  APPEALED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  VOID: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
}

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

export default function WarningsPage() {
  const { data: session } = useSession()
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')

  const canIssueWarnings = session?.user && AUTHORIZED_ROLES.includes(session.user.role)

  useEffect(() => {
    fetchWarnings()
  }, [])

  const fetchWarnings = async () => {
    try {
      const res = await fetch('/api/warnings')
      if (res.ok) {
        const data = await res.json()
        setWarnings(data)
      }
    } catch (error) {
      console.error('Error fetching warnings:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredWarnings = warnings.filter(w => {
    if (filter === 'all') return w.status !== 'VOID'
    if (filter === 'active') return w.status === 'ACTIVE'
    if (filter === 'resolved') return w.status === 'RESOLVED'
    return true
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Employee Warnings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {canIssueWarnings
              ? 'Manage employee warnings and disciplinary actions'
              : 'View your warning history'
            }
          </p>
        </div>
        {canIssueWarnings && (
          <Link
            href="/warnings/new"
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Issue Warning
          </Link>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {warnings.filter(w => w.status === 'ACTIVE').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Warnings</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {warnings.filter(w => w.status === 'RESOLVED').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {warnings.filter(w => !w.acknowledged && w.status === 'ACTIVE').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending Acknowledgement</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {warnings.filter(w => w.severity === 'FINAL' && w.status === 'ACTIVE').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Final Warnings</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'active'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'resolved'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Resolved
        </button>
      </div>

      {/* Warnings List */}
      {filteredWarnings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">No warnings found</p>
          {canIssueWarnings && (
            <Link
              href="/warnings/new"
              className="inline-block mt-4 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
            >
              Issue a new warning
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWarnings.map(warning => (
            <Link
              key={warning.id}
              href={`/warnings/${warning.id}`}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className={`p-4 border-l-4 rounded-lg ${SEVERITY_LEVELS[warning.severity]?.color || 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${WARNING_TYPES[warning.warningType]?.color || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
                        {WARNING_TYPES[warning.warningType]?.label || warning.warningType}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[warning.status]}`}>
                        {warning.status}
                      </span>
                      {warning.acknowledged && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {canIssueWarnings ? warning.employee.name : 'Your Warning'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{warning.description}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400 ml-4">
                    <div>Incident: {formatDate(warning.incidentDate)}</div>
                    <div className="mt-1">Issued: {formatDate(warning.createdAt)}</div>
                    {warning.project && (
                      <div className="mt-1 text-blue-600 dark:text-blue-400">{warning.project.name}</div>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    Issued by: <span className="font-medium text-gray-700 dark:text-gray-300">{warning.issuedBy.name}</span>
                  </div>
                  <div className={`font-medium ${SEVERITY_LEVELS[warning.severity]?.color.replace('bg-', 'text-').split(' ')[0]}`}>
                    {SEVERITY_LEVELS[warning.severity]?.label || warning.severity}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
