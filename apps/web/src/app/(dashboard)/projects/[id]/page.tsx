import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  FileText,
  Clock,
  Edit,
  FolderOpen,
  UserPlus,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getProjectStatusColor } from '@/lib/status-colors'
import { DeleteProjectButton } from './delete-button'
import { ProjectDocuments } from '@/components/project/project-documents'

interface ProjectPageProps {
  params: { id: string }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const user = await getCurrentUser()
  const userRole = user?.role || 'VIEWER'
  const isAdmin = userRole === 'ADMIN'
  const canManageTeam = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole)

  // Fetch company settings to check module status
  const companySettings = await prisma.companySettings.findFirst()

  // Check if time tracking module is enabled for this user's role
  const isTimeTrackingEnabled = (() => {
    const globalEnabled = companySettings?.moduleTimeTracking ?? true
    if (!globalEnabled) return false

    const roleOverrides = (companySettings?.roleModuleOverrides as Record<string, Record<string, boolean>> | null) ?? {}
    const userOverrides = roleOverrides[userRole]
    if (userOverrides && 'moduleTimeTracking' in userOverrides) {
      return userOverrides.moduleTimeTracking
    }
    return globalEnabled
  })()

  // Build daily logs filter based on role
  const dailyLogsWhere: Record<string, unknown> = {}
  // Only ADMIN and PROJECT_MANAGER can see all logs
  // Everyone else sees only their own logs
  if (!['ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
    dailyLogsWhere.submittedBy = user?.id
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      assignments: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
      dailyLogs: {
        where: dailyLogsWhere,
        orderBy: { date: 'desc' },
        take: 5,
        include: {
          submitter: {
            select: { name: true },
          },
        },
      },
      timeEntries: {
        orderBy: { clockIn: 'desc' },
        take: 5,
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      files: {
        where: {
          category: 'DRAWINGS',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          uploader: {
            select: { name: true },
          },
        },
      },
      _count: {
        select: {
          dailyLogs: true,
          timeEntries: true,
          files: {
            where: {
              category: 'DRAWINGS',
            },
          },
        },
      },
    },
  })

  if (!project) {
    notFound()
  }

  // Get accurate daily logs count based on user permissions
  const dailyLogsCount = await prisma.dailyLog.count({
    where: {
      projectId: params.id,
      ...dailyLogsWhere,
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <Link
            href="/projects"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mt-1"
          >
            <ArrowLeft className="h-5 w-5 text-gray-900 dark:text-gray-100" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getProjectStatusColor(project.status)}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            {project.address && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-1">
                <MapPin className="h-4 w-4" />
                <span>{project.address}</span>
              </div>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              href={`/projects/${project.id}/edit`}
              className="btn btn-outline px-4 py-2 flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project.assignments.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Team</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dailyLogsCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Logs</p>
            </div>
          </div>
        </div>
        {isTimeTrackingEnabled && (
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project._count.timeEntries}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Time</p>
              </div>
            </div>
          </div>
        )}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-100 p-2 rounded-lg">
              <FolderOpen className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project._count.files}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Drawings</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {project.startDate ? formatDate(project.startDate) : 'Not set'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {project.endDate ? `to ${formatDate(project.endDate)}` : 'Start Date'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Details</h2>
          <dl className="space-y-3">
            {project.description && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{project.description}</dd>
              </div>
            )}
            {project.gpsLatitude && project.gpsLongitude && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">GPS Coordinates</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {project.gpsLatitude.toFixed(6)}, {project.gpsLongitude.toFixed(6)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatDate(project.createdAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Team Members */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Members</h2>
            {isAdmin && (
              <Link
                href={`/projects/${project.id}/team`}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Manage Team
              </Link>
            )}
          </div>
          {project.assignments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No team members assigned yet</p>
          ) : (
            <ul className="space-y-3">
              {project.assignments.map((assignment) => (
                <li key={assignment.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {assignment.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{assignment.user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(assignment.roleOverride || assignment.user.role).replace('_', ' ')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Daily Logs */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Daily Logs</h2>
            <Link
              href={`/daily-logs?project=${project.id}`}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View All
            </Link>
          </div>
          {project.dailyLogs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No daily logs yet</p>
          ) : (
            <ul className="space-y-3">
              {project.dailyLogs.map((log) => (
                <li key={log.id}>
                  <Link
                    href={`/daily-logs/${log.id}`}
                    className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-2 px-2 py-1 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(log.date)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        by {log.submitter.name}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      log.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      log.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800 dark:text-gray-200'
                    }`}>
                      {log.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/daily-logs/new?project=${project.id}`}
              className="btn btn-outline py-3 flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              New Daily Log
            </Link>
            {isTimeTrackingEnabled ? (
              <Link
                href={`/time-tracking?project=${project.id}`}
                className="btn btn-outline py-3 flex items-center justify-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Log Time
              </Link>
            ) : canManageTeam ? (
              <Link
                href="/admin/users"
                className="btn btn-outline py-3 flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add User
              </Link>
            ) : (
              <Link
                href={`/projects/${project.id}/documents`}
                className="btn btn-outline py-3 flex items-center justify-center gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                View Documents
              </Link>
            )}
            <Link
              href={`/projects/${project.id}/documents`}
              className="btn btn-outline py-3 flex items-center justify-center gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              View Documents
            </Link>
            {canManageTeam && isTimeTrackingEnabled && (
              <Link
                href="/admin/users"
                className="btn btn-outline py-3 flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add User
              </Link>
            )}
            {!canManageTeam && (
              <Link
                href={`/projects/${project.id}/documents`}
                className="btn btn-outline py-3 flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Upload File
              </Link>
            )}
          </div>
        </div>

        {/* Project Documents */}
        <ProjectDocuments
          projectId={project.id}
          files={project.files}
          totalCount={project._count.files}
        />
      </div>
    </div>
  )
}
