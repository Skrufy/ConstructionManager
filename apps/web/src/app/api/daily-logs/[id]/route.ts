import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getToolAccessLevel, isOwnerAdmin, hasProjectAccess } from '@/lib/api-permissions'

export const dynamic = 'force-dynamic'

// Helper to check if user can access this daily log
async function canAccessDailyLog(
  userId: string,
  dailyLog: { submittedBy: string | null; projectId: string }
): Promise<boolean> {
  // Owner can always access their own logs
  if (dailyLog.submittedBy === userId) return true

  // Owner/Admin can view all logs
  const isAdmin = await isOwnerAdmin(userId)
  if (isAdmin) return true

  // Check if user has access to the project
  return hasProjectAccess(userId, dailyLog.projectId)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const dailyLog = await prisma.dailyLog.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: { id: true, name: true, gpsLatitude: true, gpsLongitude: true },
        },
        submitter: {
          select: { id: true, name: true },
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
        photos: {
          select: {
            id: true,
            name: true,
            type: true,
            createdAt: true,
          },
        },
      },
    })

    if (!dailyLog) {
      return NextResponse.json({ error: 'Daily log not found' }, { status: 404 })
    }

    // Authorization check: user must be owner, assigned to project, or have elevated role
    const canAccess = await canAccessDailyLog(
      user.id,
      { submittedBy: dailyLog.submittedBy, projectId: dailyLog.projectId }
    )

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ daily_log: dailyLog })
  } catch (error) {
    console.error('Error fetching daily log:', error)
    return NextResponse.json({ error: 'Failed to fetch daily log' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // First fetch the existing log to check permissions
    const existingLog = await prisma.dailyLog.findUnique({
      where: { id: params.id },
      select: { submittedBy: true, projectId: true, status: true },
    })

    if (!existingLog) {
      return NextResponse.json({ error: 'Daily log not found' }, { status: 404 })
    }

    // Authorization check
    const isOwner = existingLog.submittedBy === user.id
    const isAdmin = await isOwnerAdmin(user.id)
    const accessLevel = await getToolAccessLevel(user.id, existingLog.projectId, 'daily_logs')
    const hasAdminAccess = isAdmin || accessLevel === 'admin'

    // Only owner can edit their own logs, or users with admin access can edit any log
    if (!isOwner && !hasAdminAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { projectId, date, notes, entries, materials, issues, visitors, weatherData, status, crewCount, totalHours, weatherDelay, weatherDelayNotes } = body

    // If only status is provided (submit action), just update status
    const isStatusOnlyUpdate = status && !projectId && !date && !entries

    // Status change restrictions:
    // - Owner can submit (DRAFT -> SUBMITTED)
    // - Only users with admin access can approve/reject (SUBMITTED -> APPROVED/REJECTED)
    // - Once APPROVED, only users with admin access can modify
    if (status && status !== existingLog.status) {
      const isStatusChangeToApproveReject = status === 'APPROVED' || status === 'REJECTED'
      const isExistingApproved = existingLog.status === 'APPROVED'

      if (isStatusChangeToApproveReject && !hasAdminAccess) {
        return NextResponse.json(
          { error: 'Only users with admin access can approve/reject logs' },
          { status: 403 }
        )
      }

      if (isExistingApproved && !hasAdminAccess) {
        return NextResponse.json(
          { error: 'Cannot modify approved logs without admin permissions' },
          { status: 403 }
        )
      }
    }

    // If only status update, just update status and return
    if (isStatusOnlyUpdate) {
      const dailyLog = await prisma.dailyLog.update({
        where: { id: params.id },
        data: { status },
      })
      return NextResponse.json({ daily_log: dailyLog })
    }

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

    // Update the daily log
    const dailyLog = await prisma.dailyLog.update({
      where: { id: params.id },
      data: {
        projectId,
        date: localDate,
        notes,
        status,
        weatherData: weatherData || undefined,
        crewCount: crewCount ?? 0,
        totalHours: totalHours ?? 0,
        weatherDelay: weatherDelay ?? false,
        weatherDelayNotes: weatherDelayNotes || null,
      },
    })

    // Delete existing related records and recreate them
    await prisma.dailyLogEntry.deleteMany({ where: { dailyLogId: params.id } })
    await prisma.dailyLogMaterial.deleteMany({ where: { dailyLogId: params.id } })
    await prisma.dailyLogIssue.deleteMany({ where: { dailyLogId: params.id } })
    await prisma.dailyLogVisitor.deleteMany({ where: { dailyLogId: params.id } })

    // Create work entries if provided
    if (entries && entries.length > 0) {
      for (const entry of entries) {
        let activityLabel = await prisma.label.findFirst({
          where: { category: 'ACTIVITY', name: { equals: entry.activity, mode: 'insensitive' } },
        })
        if (!activityLabel) {
          activityLabel = await prisma.label.create({
            data: { category: 'ACTIVITY', name: entry.activity },
          })
        }

        let statusLabel = null
        if (entry.status) {
          statusLabel = await prisma.label.findFirst({
            where: { category: 'STATUS', name: { equals: entry.status, mode: 'insensitive' } },
          })
          if (!statusLabel) {
            statusLabel = await prisma.label.create({
              data: { category: 'STATUS', name: entry.status },
            })
          }
        }

        await prisma.dailyLogEntry.create({
          data: {
            dailyLogId: dailyLog.id,
            activityLabelId: activityLabel.id,
            statusLabelId: statusLabel?.id,
            locationLabels: [
              entry.locationBuilding,
              entry.locationFloor,
              entry.locationZone,
            ].filter(Boolean),
            percentComplete: entry.percentComplete,
            notes: entry.notes,
          },
        })
      }
    }

    // Create materials if provided
    if (materials && materials.length > 0) {
      for (const mat of materials) {
        let materialLabel = await prisma.label.findFirst({
          where: { category: 'MATERIAL', name: { equals: mat.material, mode: 'insensitive' } },
        })
        if (!materialLabel) {
          materialLabel = await prisma.label.create({
            data: { category: 'MATERIAL', name: mat.material },
          })
        }

        await prisma.dailyLogMaterial.create({
          data: {
            dailyLogId: dailyLog.id,
            materialLabelId: materialLabel.id,
            quantity: mat.quantity,
            unit: mat.unit,
            notes: mat.notes,
          },
        })
      }
    }

    // Create issues if provided
    if (issues && issues.length > 0) {
      for (const issue of issues) {
        let issueLabel = await prisma.label.findFirst({
          where: { category: 'ISSUE', name: { equals: issue.issueType, mode: 'insensitive' } },
        })
        if (!issueLabel) {
          issueLabel = await prisma.label.create({
            data: { category: 'ISSUE', name: issue.issueType },
          })
        }

        await prisma.dailyLogIssue.create({
          data: {
            dailyLogId: dailyLog.id,
            issueLabelId: issueLabel.id,
            delayHours: issue.delayHours,
            description: issue.description,
          },
        })
      }
    }

    // Create visitors if provided
    if (visitors && visitors.length > 0) {
      for (const visitor of visitors) {
        let visitorLabel = await prisma.label.findFirst({
          where: { category: 'VISITOR', name: { equals: visitor.visitorType, mode: 'insensitive' } },
        })
        if (!visitorLabel) {
          visitorLabel = await prisma.label.create({
            data: { category: 'VISITOR', name: visitor.visitorType },
          })
        }

        await prisma.dailyLogVisitor.create({
          data: {
            dailyLogId: dailyLog.id,
            visitorLabelId: visitorLabel.id,
            visitTime: visitor.time ? new Date(`1970-01-01T${visitor.time}:00`) : null,
            result: visitor.result,
            notes: visitor.notes,
          },
        })
      }
    }

    return NextResponse.json({ daily_log: dailyLog })
  } catch (error) {
    console.error('Error updating daily log:', error)
    return NextResponse.json({ error: 'Failed to update daily log' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // First fetch the existing log to check permissions
    const existingLog = await prisma.dailyLog.findUnique({
      where: { id: params.id },
      select: { submittedBy: true, status: true },
    })

    if (!existingLog) {
      return NextResponse.json({ error: 'Daily log not found' }, { status: 404 })
    }

    const isOwner = existingLog.submittedBy === user.id
    const isAdmin = await isOwnerAdmin(user.id)

    // Owners can only delete their own DRAFT logs
    // Admins can delete any log
    if (!isAdmin) {
      if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Owner can only delete drafts
      if (existingLog.status !== 'DRAFT') {
        return NextResponse.json(
          { error: 'You can only delete draft logs. Contact an administrator to delete submitted logs.' },
          { status: 403 }
        )
      }
    }

    await prisma.dailyLog.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting daily log:', error)
    return NextResponse.json({ error: 'Failed to delete daily log' }, { status: 500 })
  }
}
