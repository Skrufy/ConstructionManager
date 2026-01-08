import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import Link from 'next/link'
import { Plus, MapPin, Calendar, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Suspense } from 'react'
import { ProjectCreatedToast } from './project-created-toast'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const user = await getCurrentUser()

  // Fetch company settings to check module status
  const companySettings = await prisma.companySettings.findFirst()
  const isTimeTrackingEnabled = companySettings?.moduleTimeTracking ?? true

  const userRole = user?.role || 'VIEWER'
  const isAdminOrPM = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole)

  // Build visibility filter
  const where: Record<string, unknown> = {}

  // Admins and Project Managers see all projects
  // Other users see: projects with visibilityMode='ALL' OR projects they're assigned to
  if (!isAdminOrPM) {
    where.OR = [
      { visibilityMode: 'ALL' },
      {
        assignments: {
          some: {
            userId: user?.id,
          },
        },
      },
    ]
  }

  // Build daily logs filter - non-admins/non-PMs see only their own logs
  const dailyLogsWhere = isAdminOrPM ? {} : { submittedBy: user?.id }

  const projects = await prisma.project.findMany({
    where,
    include: {
      assignments: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
      dailyLogs: {
        where: dailyLogsWhere,
        select: { id: true },
      },
      _count: {
        select: {
          timeEntries: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
      case 'ON_HOLD':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
      case 'COMPLETED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
      case 'ARCHIVED':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Success Toast for newly created projects */}
      <Suspense fallback={null}>
        <ProjectCreatedToast />
      </Suspense>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your construction projects</p>
        </div>
        <Link
          href="/projects/new"
          className="btn btn-primary px-4 py-2 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Project
        </Link>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="card p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No projects yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first project</p>
          <Link
            href="/projects/new"
            className="btn btn-primary px-4 py-2 inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{project.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>

              {project.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{project.address}</span>
                </div>
              )}

              {project.startDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatDate(project.startDate)}
                    {project.endDate && ` - ${formatDate(project.endDate)}`}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <Users className="h-4 w-4" />
                <span>{project.assignments.length} team members</span>
              </div>

              <div className="border-t dark:border-gray-700 pt-4 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {project.dailyLogs.length} daily logs
                </span>
                {isTimeTrackingEnabled && (
                  <span className="text-gray-600 dark:text-gray-400">
                    {project._count.timeEntries} time entries
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
