'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Calendar, User, Building2, Shield, ChevronDown } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getDailyLogStatusColor } from '@/lib/status-colors'

interface Project {
  id: string
  name: string
}

interface DailyLog {
  id: string
  date: string
  status: string
  notes: string | null
  totalHours: number
  weatherDelay: boolean
  project: {
    id: string
    name: string
  }
  submitter: {
    id: string
    name: string
  }
  _count: {
    entries: number
    materials: number
    issues: number
  }
}

interface DailyLogsClientProps {
  initialLogs: DailyLog[]
  projects: Project[]
  canViewAllLogs: boolean
  isTimeTrackingEnabled: boolean
  initialProjectFilter?: string
}

export function DailyLogsClient({
  initialLogs,
  projects,
  canViewAllLogs,
  isTimeTrackingEnabled,
  initialProjectFilter,
}: DailyLogsClientProps) {
  const [selectedProject, setSelectedProject] = useState(initialProjectFilter || '')
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(initialLogs)
  const [loading, setLoading] = useState(false)

  // Transform API response (snake_case) to client format (camelCase)
  const transformApiResponse = (apiLogs: any[]): DailyLog[] => {
    return apiLogs.map((log) => ({
      id: log.id,
      date: log.date,
      status: log.status,
      notes: log.notes,
      totalHours: log.total_hours,
      weatherDelay: log.weather_delay || false,
      project: {
        id: log.project_id,
        name: log.project_name,
      },
      submitter: {
        id: log.submitted_by || '',
        name: log.submitter_name || 'Unknown',
      },
      _count: {
        entries: log.entries_count,
        materials: log.materials_count,
        issues: log.issues_count,
      },
    }))
  }

  // Fetch logs when project filter changes
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      try {
        const url = selectedProject
          ? `/api/daily-logs?projectId=${selectedProject}`
          : '/api/daily-logs'
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          const logs = data.daily_logs || []
          setDailyLogs(transformApiResponse(logs))
        }
      } catch (error) {
        console.error('Failed to fetch daily logs:', error)
      } finally {
        setLoading(false)
      }
    }

    // Only fetch if filter changed from initial
    if (selectedProject !== (initialProjectFilter || '')) {
      fetchLogs()
    }
  }, [selectedProject, initialProjectFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Daily Logs</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {canViewAllLogs
              ? 'All daily work activities across projects'
              : 'Your daily logs and assigned project logs'}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Project Filter Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="appearance-none w-full sm:w-48 px-4 py-2 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          <Link
            href="/daily-logs/new"
            className="btn btn-primary px-4 py-2 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">New Daily Log</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      {/* Role-based access indicator */}
      {!canViewAllLogs && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
          <Shield className="h-4 w-4" />
          <span>Showing logs you submitted or from projects you&apos;re assigned to.</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Logs List */}
      {!loading && dailyLogs.length === 0 ? (
        <div className="card p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {selectedProject ? 'No logs for this project' : 'No daily logs yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {selectedProject
              ? 'Try selecting a different project or create a new log'
              : 'Start tracking your daily work activities'}
          </p>
          <Link
            href="/daily-logs/new"
            className="btn btn-primary px-4 py-2 inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Daily Log
          </Link>
        </div>
      ) : !loading && (
        <div className="space-y-4">
          {dailyLogs.map((log) => (
            <Link
              key={log.id}
              href={`/daily-logs/${log.id}`}
              className={`card p-6 block hover:shadow-lg transition-shadow ${
                log.weatherDelay ? 'border-2 border-amber-400 bg-amber-50/30 dark:border-amber-500 dark:bg-amber-500/20' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    {formatDate(log.date)}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {log.project.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {log.submitter.name}
                    </span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDailyLogStatusColor(log.status)}`}>
                  {log.status}
                </span>
              </div>

              {/* Only show stats that have data */}
              {(log._count.entries > 0 || log._count.materials > 0 || log._count.issues > 0 || (isTimeTrackingEnabled && log.totalHours > 0)) && (
                <div className="grid gap-4 text-sm border-t dark:border-gray-700 pt-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                  {log._count.entries > 0 && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Work Entries</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{log._count.entries}</p>
                    </div>
                  )}
                  {log._count.materials > 0 && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Materials</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{log._count.materials}</p>
                    </div>
                  )}
                  {log._count.issues > 0 && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Issues</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{log._count.issues}</p>
                    </div>
                  )}
                  {isTimeTrackingEnabled && log.totalHours > 0 && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Total Hours</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{log.totalHours}h</p>
                    </div>
                  )}
                </div>
              )}

              {log.notes && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{log.notes}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
