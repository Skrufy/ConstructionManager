import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/audit-logs - List audit logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check admin permission
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const resource = searchParams.get('resource')
    const userId = searchParams.get('userId') || searchParams.get('user_id')
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const startDate = searchParams.get('startDate') || searchParams.get('start_date')
    const endDate = searchParams.get('endDate') || searchParams.get('end_date')
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize') || searchParams.get('page_size')

    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeParam || '50', 10) || 50))
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (action) where.action = action
    if (resource) where.resource = resource
    if (userId) where.userId = userId
    if (projectId) where.projectId = projectId

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) (where.timestamp as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.timestamp as Record<string, unknown>).lte = new Date(endDate)
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: pageSize
      })
    ])

    // Transform to match Android AuditLog model (camelCase)
    const transformedLogs = logs.map(log => {
      // Convert details to string if it's an object (Android expects String)
      let detailsStr: string | null = null
      if (log.details) {
        detailsStr = typeof log.details === 'object'
          ? JSON.stringify(log.details)
          : String(log.details)
      }

      return {
        id: log.id,
        userId: log.userId || '',
        userName: log.user?.name || null,
        action: log.action,
        resourceType: log.resource, // Android expects 'resourceType', API stores as 'resource'
        resourceId: log.resourceId,
        resourceName: null, // Not stored in DB
        details: detailsStr,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp?.toISOString() || new Date().toISOString(),
        // Additional fields for web compatibility
        userEmail: log.userEmail || log.user?.email || null,
        userRole: log.userRole,
        projectId: log.projectId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        success: log.success,
        errorMessage: log.errorMessage
      }
    })

    return NextResponse.json({
      logs: transformedLogs,
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/audit-logs - Create audit log entry (internal use)
export async function POST(request: NextRequest) {
  try {
    // Try to get user info if authenticated, but don't require it
    const authResult = await requireApiAuth(request)
    const user = authResult instanceof NextResponse ? null : authResult.user

    const body = await request.json()
    const {
      action,
      resource,
      resourceId,
      projectId,
      details,
      oldValues,
      newValues,
      success = true,
      errorMessage
    } = body

    if (!action || !resource) {
      return NextResponse.json({ error: 'Action and resource are required' }, { status: 400 })
    }

    // Get client info from headers
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const log = await prisma.auditLog.create({
      data: {
        action,
        resource,
        resourceId: resourceId || body.resource_id,
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role as string || undefined,
        projectId: projectId || body.project_id,
        ipAddress,
        userAgent,
        details,
        oldValues: oldValues || body.old_values,
        newValues: newValues || body.new_values,
        success,
        errorMessage: errorMessage || body.error_message
      }
    })

    return NextResponse.json({
      id: log.id,
      action: log.action,
      resource: log.resource,
      timestamp: log.timestamp
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating audit log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
