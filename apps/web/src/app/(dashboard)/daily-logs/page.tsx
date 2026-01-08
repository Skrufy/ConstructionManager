import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/permissions'
import { DailyLogsClient } from '@/components/daily-logs/daily-logs-client'

export const dynamic = 'force-dynamic'

export default async function DailyLogsPage({
  searchParams,
}: {
  searchParams: { project?: string }
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const userId = user.id
  const userRole = user.role

  // Check if user can see all daily logs
  // Only ADMIN and PROJECT_MANAGER can see all logs
  // Everyone else can ONLY see their own created logs
  const canViewAllLogs = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole)

  // Build where clause with role-based filtering
  let where: any = {}

  if (searchParams.project) {
    where.projectId = searchParams.project
  }

  // Role-based filtering:
  // - ADMIN and PROJECT_MANAGER can see all logs
  // - All other roles can ONLY see their own logs
  let assignedProjectIds: string[] = []
  if (!canViewAllLogs) {
    // Get projects user is assigned to (for the filter dropdown)
    const userAssignments = await prisma.projectAssignment.findMany({
      where: { userId },
      select: { projectId: true },
    })
    assignedProjectIds = userAssignments.map(a => a.projectId)

    // User can ONLY see their own logs
    where.submittedBy = userId
  }

  // Fetch company settings to check module status
  const companySettings = await prisma.companySettings.findFirst()
  const isTimeTrackingEnabled = companySettings?.moduleTimeTracking ?? true

  // Fetch daily logs
  const dailyLogs = await prisma.dailyLog.findMany({
    where,
    include: {
      project: {
        select: { id: true, name: true },
      },
      submitter: {
        select: { id: true, name: true },
      },
      _count: {
        select: {
          entries: true,
          materials: true,
          issues: true,
        },
      },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  // Fetch projects for the filter dropdown
  // If user can view all logs, show all active projects
  // Otherwise, show only assigned projects
  const projectsWhere = canViewAllLogs
    ? { status: 'ACTIVE' }
    : { id: { in: assignedProjectIds }, status: 'ACTIVE' }

  const projects = await prisma.project.findMany({
    where: projectsWhere,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // Transform logs for the client component
  const transformedLogs = dailyLogs.map((log) => ({
    id: log.id,
    date: log.date.toISOString(),
    status: log.status,
    notes: log.notes,
    totalHours: log.totalHours,
    weatherDelay: log.weatherDelay,
    project: {
      id: log.project.id,
      name: log.project.name,
    },
    submitter: {
      id: log.submitter?.id || '',
      name: log.submitter?.name || 'Unknown',
    },
    _count: {
      entries: log._count.entries,
      materials: log._count.materials,
      issues: log._count.issues,
    },
  }))

  return (
    <DailyLogsClient
      initialLogs={transformedLogs}
      projects={projects}
      canViewAllLogs={canViewAllLogs}
      isTimeTrackingEnabled={isTimeTrackingEnabled}
      initialProjectFilter={searchParams.project}
    />
  )
}
