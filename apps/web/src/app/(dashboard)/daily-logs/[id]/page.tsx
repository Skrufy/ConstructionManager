import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  User,
  Building2,
  Cloud,
  CloudOff,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  UserCheck,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { getDailyLogStatusColor } from '@/lib/status-colors'
import { DailyLogActions } from './daily-log-actions'

interface DailyLogPageProps {
  params: { id: string }
}

export default async function DailyLogPage({ params }: DailyLogPageProps) {
  // Fetch company settings to check module status
  const companySettings = await prisma.companySettings.findFirst()
  const isTimeTrackingEnabled = companySettings?.moduleTimeTracking ?? true
  const activitiesEnabled = companySettings?.activitiesEnabled ?? true

  const dailyLog = await prisma.dailyLog.findUnique({
    where: { id: params.id },
    include: {
      project: {
        select: { id: true, name: true, address: true },
      },
      submitter: {
        select: { id: true, name: true, email: true },
      },
      entries: {
        include: {
          activityLabel: true,
          statusLabel: true,
        },
      },
      materials: {
        include: {
          materialLabel: true,
        },
      },
      issues: {
        include: {
          issueLabel: true,
        },
      },
      visitors: {
        include: {
          visitorLabel: true,
        },
      },
      photos: true,
    },
  })

  if (!dailyLog) {
    notFound()
  }

  const weatherData = dailyLog.weatherData as { temp?: number; conditions?: string } | null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <Link href="/daily-logs" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Daily Log - {formatDate(dailyLog.date)}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDailyLogStatusColor(dailyLog.status)}`}>
                {dailyLog.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {dailyLog.project.name}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {dailyLog.submitter.name}
              </span>
            </div>
          </div>
        </div>
        {dailyLog.status === 'DRAFT' && (
          <DailyLogActions logId={dailyLog.id} />
        )}
      </div>

      {/* Summary Stats - Only show cards with actual data */}
      {(weatherData || (isTimeTrackingEnabled && (dailyLog.crewCount > 0 || dailyLog.totalHours > 0)) || (activitiesEnabled && dailyLog.entries.length > 0)) && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {weatherData && (
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <Cloud className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Weather</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {weatherData.temp}F, {weatherData.conditions}
                  </p>
                </div>
              </div>
            </div>
          )}
          {isTimeTrackingEnabled && dailyLog.crewCount > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Crew Count</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{dailyLog.crewCount} workers</p>
                </div>
              </div>
            </div>
          )}
          {isTimeTrackingEnabled && dailyLog.totalHours > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{dailyLog.totalHours}h</p>
                </div>
              </div>
            </div>
          )}
          {activitiesEnabled && dailyLog.entries.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Work Entries</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{dailyLog.entries.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weather Delay Alert */}
      {dailyLog.weatherDelay && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <CloudOff className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Weather Delay Reported</p>
              {dailyLog.weatherDelayNotes && (
                <p className="text-amber-700 mt-1">{dailyLog.weatherDelayNotes}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Work Entries - Only show if activities are enabled */}
      {activitiesEnabled && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Work Activities
          </h2>
          {dailyLog.entries.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No work entries recorded</p>
          ) : (
            <div className="space-y-4">
              {dailyLog.entries.map((entry) => {
                const locationLabels = (entry.locationLabels as unknown as string[] | null) || []
                return (
                  <div key={entry.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {entry.activityLabel.name}
                        </p>
                        {locationLabels.length > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Location: {locationLabels.join(' > ')}
                          </p>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{entry.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {entry.statusLabel && (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            entry.statusLabel.name === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            entry.statusLabel.name === 'In Progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                          }`}>
                            {entry.statusLabel.name}
                          </span>
                        )}
                        {entry.percentComplete !== null && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {entry.percentComplete}% complete
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Materials */}
      {dailyLog.materials.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            Materials Used
          </h2>
          <div className="space-y-2">
            {dailyLog.materials.map((material) => (
              <div
                key={material.id}
                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <span className="text-gray-900 dark:text-gray-100">{material.materialLabel.name}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {material.quantity} {material.unit || 'units'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {dailyLog.issues.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Issues & Delays
          </h2>
          <div className="space-y-3">
            {dailyLog.issues.map((issue) => (
              <div key={issue.id} className="p-4 bg-red-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-red-800">
                      {issue.issueLabel.name}
                    </p>
                    {issue.description && (
                      <p className="text-sm text-red-700 mt-1">{issue.description}</p>
                    )}
                  </div>
                  {issue.delayHours && (
                    <span className="text-sm font-medium text-red-700">
                      {issue.delayHours}h delay
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visitors */}
      {dailyLog.visitors.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-500" />
            Visitors
          </h2>
          <div className="space-y-2">
            {dailyLog.visitors.map((visitor) => (
              <div
                key={visitor.id}
                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <span className="text-gray-900 dark:text-gray-100">{visitor.visitorLabel.name}</span>
                {visitor.result && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    visitor.result === 'PASSED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    visitor.result === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                    'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                    {visitor.result}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {dailyLog.notes && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notes</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{dailyLog.notes}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Log Details</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Created</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{formatDateTime(dailyLog.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Last Updated</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{formatDateTime(dailyLog.updatedAt)}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Submitted By</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{dailyLog.submitter.name}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Project</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{dailyLog.project.name}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
