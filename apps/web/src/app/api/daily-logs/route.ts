import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { getToolAccessLevel, isOwnerAdmin } from '@/lib/api-permissions'

export const dynamic = 'force-dynamic'

// Transform daily log for mobile API compatibility (snake_case with flattened fields)
function transformDailyLog(log: {
  id: string
  projectId: string
  submittedBy: string | null
  date: Date
  notes: string | null
  status: string
  weatherData?: unknown
  crewCount: number
  totalHours: number
  weatherDelay: boolean
  weatherDelayNotes: string | null
  createdAt: Date
  updatedAt: Date
  project: { id: string; name: string }
  submitter: { id: string; name: string } | null
  _count: { entries: number; materials: number; issues: number }
}) {
  return {
    id: log.id,
    project_id: log.projectId,
    project_name: log.project.name,
    submitted_by: log.submittedBy,
    submitter_name: log.submitter?.name ?? null,
    date: log.date.toISOString(),
    notes: log.notes,
    status: log.status,
    weather: log.weatherData ?? null,
    crew_count: log.crewCount,
    total_hours: log.totalHours,
    weather_delay: log.weatherDelay,
    weather_delay_notes: log.weatherDelayNotes,
    photo_urls: null, // TODO: Add photo support
    entries_count: log._count.entries,
    materials_count: log._count.materials,
    issues_count: log._count.issues,
    created_at: log.createdAt.toISOString(),
    updated_at: log.updatedAt.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    // Accept both camelCase and snake_case
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const date = searchParams.get('date')
    const search = searchParams.get('search')
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')
    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeParam || '25', 10) || 25))
    const skip = (page - 1) * pageSize
    const userId = user.id
    const userRole = user.role

    // Check if user has admin-level access to daily logs (can see all)
    const isAdmin = await isOwnerAdmin(userId)
    const accessLevel = isAdmin ? 'admin' : await getToolAccessLevel(userId, projectId, 'daily_logs')
    const canViewAllLogs = accessLevel === 'admin'

    const where: any = {}
    if (projectId) where.projectId = projectId
    if (date) where.date = new Date(date)
    if (search) {
      where.AND = [
        {
          OR: [
            { notes: { contains: search, mode: 'insensitive' } },
            { project: { is: { name: { contains: search, mode: 'insensitive' } } } },
            { submitter: { is: { name: { contains: search, mode: 'insensitive' } } } },
          ],
        },
      ]
    }

    // Role-based filtering based on company settings
    // - SUPERINTENDENT+ can see all logs by default
    // - Other roles filtered based on admin-configured data access settings
    if (!canViewAllLogs) {
      // Get company settings to check role-specific visibility preference
      const companySettings = await prisma.companySettings.findFirst()

      // Check role-specific data access settings first, then fall back to legacy Field Worker setting
      let visibilityMode = 'ASSIGNED_PROJECTS'
      const roleDataAccess = companySettings?.roleDataAccess as Record<string, { dailyLogAccess?: string }> | undefined
      if (roleDataAccess && roleDataAccess[userRole]?.dailyLogAccess) {
        visibilityMode = roleDataAccess[userRole].dailyLogAccess
      } else if (userRole === 'FIELD_WORKER' && companySettings?.fieldWorkerDailyLogAccess) {
        // Legacy Field Worker setting for backwards compatibility
        visibilityMode = companySettings.fieldWorkerDailyLogAccess
      }

      if (visibilityMode === 'ALL') {
        // Role can see all logs - no additional filtering
      } else if (visibilityMode === 'OWN_ONLY') {
        // Role can only see their own submissions
        where.submittedBy = userId
      } else {
        // ASSIGNED_PROJECTS (default): See own logs OR logs from assigned projects
        const userAssignments = await prisma.projectAssignment.findMany({
          where: { userId },
          select: { projectId: true },
        })
        const assignedProjectIds = userAssignments.map(a => a.projectId)

        where.OR = [
          { submittedBy: userId },
          { projectId: { in: assignedProjectIds } },
        ]
      }
    }

    const total = await prisma.dailyLog.count({ where })
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
      skip,
      take: pageSize,
    })

    return NextResponse.json({
      daily_logs: dailyLogs.map(transformDailyLog),
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching daily logs:', error)
    return NextResponse.json({ error: 'Failed to fetch daily logs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const { projectId, date, notes, entries, weatherData, status = 'DRAFT', crewCount, totalHours, weatherDelay, weatherDelayNotes } = body

    if (!projectId || !date) {
      return NextResponse.json(
        { error: 'Project and date are required' },
        { status: 400 }
      )
    }

    // Create the daily log with entries
    // Parse date - accepts both ISO8601 (from mobile) and YYYY-MM-DD (from web)
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }
    // Create local date at noon to avoid timezone issues
    const localDate = new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
      12, 0, 0
    )

    const dailyLog = await prisma.dailyLog.create({
      data: {
        projectId,
        date: localDate,
        submittedBy: user.id,
        notes,
        status,
        weatherData: weatherData || undefined,
        crewCount: crewCount ?? 0,
        totalHours: totalHours ?? 0,
        weatherDelay: weatherDelay ?? false,
        weatherDelayNotes: weatherDelayNotes || null,
      },
    })

    // Create work entries if provided (batch to avoid N+1 queries)
    if (entries && entries.length > 0) {
      // Collect all unique activity and status names
      const activityNames = Array.from(new Set(entries.map((e: { activity: string }) => e.activity))) as string[]
      const statusNames = Array.from(new Set(entries.filter((e: { status?: string }) => e.status).map((e: { status: string }) => e.status))) as string[]

      // Batch lookup existing activity labels
      const existingActivityLabels = await prisma.label.findMany({
        where: {
          category: 'ACTIVITY',
          name: { in: activityNames, mode: 'insensitive' },
        },
      })
      const activityLabelMap = new Map(existingActivityLabels.map(l => [l.name.toLowerCase(), l]))

      // Create missing activity labels in batch
      const missingActivityNames = activityNames.filter(name => !activityLabelMap.has(name.toLowerCase()))
      if (missingActivityNames.length > 0) {
        await prisma.label.createMany({
          data: missingActivityNames.map(name => ({ category: 'ACTIVITY', name })),
          skipDuplicates: true,
        })
        // Re-fetch to get IDs
        const newActivityLabels = await prisma.label.findMany({
          where: {
            category: 'ACTIVITY',
            name: { in: missingActivityNames, mode: 'insensitive' },
          },
        })
        newActivityLabels.forEach(l => activityLabelMap.set(l.name.toLowerCase(), l))
      }

      // Batch lookup existing status labels
      const statusLabelMap = new Map<string, { id: string; name: string }>()
      if (statusNames.length > 0) {
        const existingStatusLabels = await prisma.label.findMany({
          where: {
            category: 'STATUS',
            name: { in: statusNames, mode: 'insensitive' },
          },
        })
        existingStatusLabels.forEach(l => statusLabelMap.set(l.name.toLowerCase(), l))

        // Create missing status labels in batch
        const missingStatusNames = statusNames.filter(name => !statusLabelMap.has(name.toLowerCase()))
        if (missingStatusNames.length > 0) {
          await prisma.label.createMany({
            data: missingStatusNames.map(name => ({ category: 'STATUS', name })),
            skipDuplicates: true,
          })
          // Re-fetch to get IDs
          const newStatusLabels = await prisma.label.findMany({
            where: {
              category: 'STATUS',
              name: { in: missingStatusNames, mode: 'insensitive' },
            },
          })
          newStatusLabels.forEach(l => statusLabelMap.set(l.name.toLowerCase(), l))
        }
      }

      // Create all entries in batch
      await prisma.dailyLogEntry.createMany({
        data: entries.map((entry: { activity: string; status?: string; locationBuilding?: string; locationFloor?: string; locationZone?: string; percentComplete?: number; notes?: string }) => ({
          dailyLogId: dailyLog.id,
          activityLabelId: activityLabelMap.get(entry.activity.toLowerCase())!.id,
          statusLabelId: entry.status ? statusLabelMap.get(entry.status.toLowerCase())?.id : null,
          locationLabels: [
            entry.locationBuilding,
            entry.locationFloor,
            entry.locationZone,
          ].filter(Boolean) as string[],
          percentComplete: entry.percentComplete,
          notes: entry.notes,
        })),
      })
    }

    // Fetch the complete daily log with relations
    const completeLog = await prisma.dailyLog.findUnique({
      where: { id: dailyLog.id },
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
    })

    if (!completeLog) {
      return NextResponse.json({ error: 'Failed to create daily log' }, { status: 500 })
    }

    return NextResponse.json({ daily_log: transformDailyLog(completeLog) }, { status: 201 })
  } catch (error) {
    console.error('Error creating daily log:', error)
    return NextResponse.json({ error: 'Failed to create daily log' }, { status: 500 })
  }
}
