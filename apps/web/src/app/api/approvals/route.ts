import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Roles that can approve items
const APPROVER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

// GET /api/approvals - Get pending items for approval
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!APPROVER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'time-entries', 'daily-logs', or 'all'
    const projectId = searchParams.get('projectId')

    const results: {
      timeEntries: unknown[]
      dailyLogs: unknown[]
      summary: {
        pendingTimeEntries: number
        pendingDailyLogs: number
        totalPending: number
      }
    } = {
      timeEntries: [],
      dailyLogs: [],
      summary: {
        pendingTimeEntries: 0,
        pendingDailyLogs: 0,
        totalPending: 0
      }
    }

    // Build project filter
    const projectFilter = projectId ? { projectId } : {}

    // Get pending time entries
    if (type === 'time-entries' || type === 'all' || !type) {
      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          status: 'PENDING',
          ...projectFilter
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          },
          project: {
            select: { id: true, name: true }
          }
        },
        orderBy: { clockIn: 'desc' }
      })

      // Transform time entries to flat format for Android compatibility
      // Android uses @SerialName with snake_case, so we must return snake_case field names
      // Android time display expects format without milliseconds: "2024-01-15T10:30:55"
      const formatTime = (date: Date) => date.toISOString().slice(0, 19)

      results.timeEntries = timeEntries.map(entry => ({
        id: entry.id,
        user_id: entry.userId,
        project_id: entry.projectId,
        clock_in: formatTime(entry.clockIn),
        clock_out: entry.clockOut ? formatTime(entry.clockOut) : null,
        break_minutes: entry.breakMinutes,
        notes: entry.notes,
        status: entry.status,
        gps_latitude_in: entry.gpsInLat,
        gps_longitude_in: entry.gpsInLng,
        gps_latitude_out: entry.gpsOutLat,
        gps_longitude_out: entry.gpsOutLng,
        created_at: formatTime(entry.createdAt),
        updated_at: formatTime(entry.updatedAt),
        // Nested objects
        user: entry.user,
        project: entry.project,
        // Computed fields
        type: 'time-entry',
        total_hours: entry.clockOut
          ? Math.round((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60) * 100) / 100
          : null
      }))
      results.summary.pendingTimeEntries = timeEntries.length
    }

    // Get pending daily logs
    if (type === 'daily-logs' || type === 'all' || !type) {
      const dailyLogs = await prisma.dailyLog.findMany({
        where: {
          status: 'SUBMITTED',
          ...projectFilter
        },
        include: {
          submitter: {
            select: { id: true, name: true, email: true, role: true }
          },
          project: {
            select: { id: true, name: true }
          },
          _count: {
            select: { entries: true, materials: true, issues: true, visitors: true }
          }
        },
        orderBy: { date: 'desc' }
      })

      // Transform daily logs to flat format for Android compatibility
      results.dailyLogs = dailyLogs.map(log => ({
        id: log.id,
        date: log.date.toISOString().split('T')[0],
        status: log.status,
        crewCount: log.crewCount,
        totalHours: log.totalHours,
        notes: log.notes,
        weatherDelay: log.weatherDelay,
        weatherDelayNotes: log.weatherDelayNotes,
        // Flat fields from nested objects
        projectId: log.projectId,
        projectName: log.project?.name ?? null,
        submittedBy: log.submittedBy,
        submitterName: log.submitter?.name ?? null,
        // Flat counts from _count
        entriesCount: log._count?.entries ?? 0,
        materialsCount: log._count?.materials ?? 0,
        issuesCount: log._count?.issues ?? 0,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt.toISOString(),
        // Nested objects for backward compat
        project: log.project,
        submitter: log.submitter,
        type: 'daily-log'
      }))
      results.summary.pendingDailyLogs = dailyLogs.length
    }

    results.summary.totalPending = results.summary.pendingTimeEntries + results.summary.pendingDailyLogs

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/approvals - Approve or reject an item
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!APPROVER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    // Accept both camelCase and snake_case, and both naming conventions
    const {
      itemId, itemType,  // Web naming
      id, type,          // Android naming
      action, notes
    } = body

    // Use whichever was provided
    const finalItemId = itemId || id
    const finalItemType = itemType || type

    if (!finalItemId || !finalItemType || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    let result

    if (finalItemType === 'time-entry') {
      result = await prisma.timeEntry.update({
        where: { id: finalItemId },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          approvedBy: user.id,
          notes: notes || undefined
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } }
        }
      })

      // TODO: Send email notification to employee
      // await sendApprovalNotification(result.user.email, itemType, action, result)

    } else if (finalItemType === 'daily-log') {
      // Fetch existing log to preserve notes
      const existingLog = await prisma.dailyLog.findUnique({ where: { id: finalItemId } })
      result = await prisma.dailyLog.update({
        where: { id: finalItemId },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'DRAFT', // Rejected goes back to draft
          notes: notes ? `${existingLog?.notes || ''}\n[${action.toUpperCase()}] ${notes}`.trim() : undefined
        },
        include: {
          submitter: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } }
        }
      })

      // TODO: Send email notification to submitter
      // await sendApprovalNotification(result.submitter.email, itemType, action, result)

    } else {
      return NextResponse.json({ error: 'Invalid item type' }, { status: 400 })
    }

    return NextResponse.json({
      message: `Item ${action}d successfully`,
      item: result
    })
  } catch (error) {
    console.error('Error processing approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/approvals/bulk - Bulk approve/reject items
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!APPROVER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { items, action } = body // items: [{ id, type }], action: 'approve' | 'reject'

    if (!items || !Array.isArray(items) || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const item of items) {
      try {
        if (item.type === 'time-entry') {
          await prisma.timeEntry.update({
            where: { id: item.id },
            data: {
              status: action === 'approve' ? 'APPROVED' : 'REJECTED',
              approvedBy: user.id
            }
          })
          results.success++
        } else if (item.type === 'daily-log') {
          await prisma.dailyLog.update({
            where: { id: item.id },
            data: {
              status: action === 'approve' ? 'APPROVED' : 'DRAFT'
            }
          })
          results.success++
        }
      } catch (err) {
        results.failed++
        results.errors.push(`Failed to ${action} ${item.type} ${item.id}`)
      }
    }

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      results
    })
  } catch (error) {
    console.error('Error in bulk approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
