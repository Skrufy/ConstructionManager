import { prisma } from './prisma'
import { NextRequest } from 'next/server'

// ============================================
// Audit Log Types
// ============================================

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'SETTINGS_CHANGE'
  | 'UPLOAD'
  | 'DOWNLOAD'
  | 'CLOCK_IN'
  | 'CLOCK_OUT'

export type AuditResource =
  | 'PROJECT'
  | 'DAILY_LOG'
  | 'TIME_ENTRY'
  | 'EQUIPMENT'
  | 'DOCUMENT'
  | 'INVOICE'
  | 'EXPENSE'
  | 'BUDGET'
  | 'CHANGE_ORDER'
  | 'USER'
  | 'WARNING'
  | 'INCIDENT'
  | 'INSPECTION'
  | 'PUNCH_LIST'
  | 'SAFETY_MEETING'
  | 'SUBCONTRACTOR'
  | 'CERTIFICATION'
  | 'SCHEDULE'
  | 'SETTINGS'
  | 'REPORT'
  | 'AUTH'

export interface AuditLogEntry {
  action: AuditAction
  resource: AuditResource
  resourceId?: string
  userId?: string
  userEmail?: string
  userRole?: string
  projectId?: string
  ipAddress?: string
  userAgent?: string
  details?: Record<string, unknown>
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  success: boolean
  errorMessage?: string
}

// ============================================
// Audit Log Functions
// ============================================

/**
 * Extract client info from request
 */
function getClientInfo(request?: NextRequest): { ipAddress: string; userAgent: string } {
  if (!request) {
    return { ipAddress: 'unknown', userAgent: 'unknown' }
  }

  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ipAddress = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  return { ipAddress, userAgent }
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  entry: AuditLogEntry,
  request?: NextRequest
): Promise<void> {
  try {
    const { ipAddress, userAgent } = getClientInfo(request)

    await prisma.auditLog.create({
      data: {
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        userId: entry.userId,
        userEmail: entry.userEmail,
        userRole: entry.userRole,
        projectId: entry.projectId,
        ipAddress: entry.ipAddress || ipAddress,
        userAgent: entry.userAgent || userAgent,
        details: (entry.details as object) || undefined,
        oldValues: (entry.oldValues as object) || undefined,
        newValues: (entry.newValues as object) || undefined,
        success: entry.success,
        errorMessage: entry.errorMessage,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    // Log error but don't throw - audit logging should never break the main flow
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Log a successful action
 */
export async function logSuccess(
  action: AuditAction,
  resource: AuditResource,
  user: { id: string; email?: string; role?: string },
  details?: {
    resourceId?: string
    projectId?: string
    oldValues?: Record<string, unknown>
    newValues?: Record<string, unknown>
    extra?: Record<string, unknown>
  },
  request?: NextRequest
): Promise<void> {
  await createAuditLog(
    {
      action,
      resource,
      resourceId: details?.resourceId,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      projectId: details?.projectId,
      oldValues: details?.oldValues,
      newValues: details?.newValues,
      details: details?.extra,
      success: true,
    },
    request
  )
}

/**
 * Log a failed action
 */
export async function logFailure(
  action: AuditAction,
  resource: AuditResource,
  user: { id?: string; email?: string; role?: string } | null,
  errorMessage: string,
  details?: {
    resourceId?: string
    projectId?: string
    extra?: Record<string, unknown>
  },
  request?: NextRequest
): Promise<void> {
  await createAuditLog(
    {
      action,
      resource,
      resourceId: details?.resourceId,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      projectId: details?.projectId,
      details: details?.extra,
      success: false,
      errorMessage,
    },
    request
  )
}

// ============================================
// Convenience Functions for Common Operations
// ============================================

export const auditLog = {
  // Authentication
  async loginSuccess(
    user: { id: string; email: string; role: string },
    request?: NextRequest
  ) {
    await logSuccess('LOGIN', 'AUTH', user, undefined, request)
  },

  async loginFailed(
    email: string,
    reason: string,
    request?: NextRequest
  ) {
    await logFailure(
      'LOGIN_FAILED',
      'AUTH',
      { email },
      reason,
      { extra: { attemptedEmail: email } },
      request
    )
  },

  async logout(
    user: { id: string; email?: string; role?: string },
    request?: NextRequest
  ) {
    await logSuccess('LOGOUT', 'AUTH', user, undefined, request)
  },

  // CRUD Operations
  async create(
    resource: AuditResource,
    user: { id: string; email?: string; role?: string },
    resourceId: string,
    newValues?: Record<string, unknown>,
    projectId?: string,
    request?: NextRequest
  ) {
    await logSuccess('CREATE', resource, user, { resourceId, projectId, newValues }, request)
  },

  async update(
    resource: AuditResource,
    user: { id: string; email?: string; role?: string },
    resourceId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    projectId?: string,
    request?: NextRequest
  ) {
    await logSuccess('UPDATE', resource, user, { resourceId, projectId, oldValues, newValues }, request)
  },

  async delete(
    resource: AuditResource,
    user: { id: string; email?: string; role?: string },
    resourceId: string,
    oldValues?: Record<string, unknown>,
    projectId?: string,
    request?: NextRequest
  ) {
    await logSuccess('DELETE', resource, user, { resourceId, projectId, oldValues }, request)
  },

  async view(
    resource: AuditResource,
    user: { id: string; email?: string; role?: string },
    resourceId?: string,
    projectId?: string,
    request?: NextRequest
  ) {
    await logSuccess('VIEW', resource, user, { resourceId, projectId }, request)
  },

  // Approval Workflow
  async approve(
    resource: AuditResource,
    user: { id: string; email?: string; role?: string },
    resourceId: string,
    details?: Record<string, unknown>,
    projectId?: string,
    request?: NextRequest
  ) {
    await logSuccess('APPROVE', resource, user, { resourceId, projectId, extra: details }, request)
  },

  async reject(
    resource: AuditResource,
    user: { id: string; email?: string; role?: string },
    resourceId: string,
    reason?: string,
    projectId?: string,
    request?: NextRequest
  ) {
    await logSuccess('REJECT', resource, user, { resourceId, projectId, extra: { reason } }, request)
  },

  // File Operations
  async upload(
    user: { id: string; email?: string; role?: string },
    fileName: string,
    fileSize: number,
    projectId?: string,
    request?: NextRequest
  ) {
    await logSuccess('UPLOAD', 'DOCUMENT', user, {
      extra: { fileName, fileSize },
      projectId,
    }, request)
  },

  async download(
    user: { id: string; email?: string; role?: string },
    resourceId: string,
    fileName: string,
    projectId?: string,
    request?: NextRequest
  ) {
    await logSuccess('DOWNLOAD', 'DOCUMENT', user, {
      resourceId,
      projectId,
      extra: { fileName },
    }, request)
  },

  // Export Operations
  async export(
    resource: AuditResource,
    user: { id: string; email?: string; role?: string },
    format: string,
    filters?: Record<string, unknown>,
    request?: NextRequest
  ) {
    await logSuccess('EXPORT', resource, user, {
      extra: { format, filters },
    }, request)
  },

  // Time Tracking
  async clockIn(
    user: { id: string; email?: string; role?: string },
    projectId: string,
    location?: { lat: number; lng: number },
    request?: NextRequest
  ) {
    await logSuccess('CLOCK_IN', 'TIME_ENTRY', user, {
      projectId,
      extra: { location },
    }, request)
  },

  async clockOut(
    user: { id: string; email?: string; role?: string },
    timeEntryId: string,
    projectId: string,
    totalHours: number,
    request?: NextRequest
  ) {
    await logSuccess('CLOCK_OUT', 'TIME_ENTRY', user, {
      resourceId: timeEntryId,
      projectId,
      extra: { totalHours },
    }, request)
  },

  // Settings
  async settingsChange(
    user: { id: string; email?: string; role?: string },
    settingType: 'company' | 'user',
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    request?: NextRequest
  ) {
    await logSuccess('SETTINGS_CHANGE', 'SETTINGS', user, {
      oldValues,
      newValues,
      extra: { settingType },
    }, request)
  },

  // Permission Changes
  async permissionChange(
    user: { id: string; email?: string; role?: string },
    targetUserId: string,
    oldRole: string,
    newRole: string,
    request?: NextRequest
  ) {
    await logSuccess('PERMISSION_CHANGE', 'USER', user, {
      resourceId: targetUserId,
      oldValues: { role: oldRole },
      newValues: { role: newRole },
    }, request)
  },
}

// ============================================
// Query Functions for Audit Logs
// ============================================

export interface AuditLogQuery {
  userId?: string
  resource?: AuditResource
  action?: AuditAction
  projectId?: string
  startDate?: Date
  endDate?: Date
  success?: boolean
  limit?: number
  offset?: number
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(query: AuditLogQuery) {
  const where: Record<string, unknown> = {}

  if (query.userId) where.userId = query.userId
  if (query.resource) where.resource = query.resource
  if (query.action) where.action = query.action
  if (query.projectId) where.projectId = query.projectId
  if (typeof query.success === 'boolean') where.success = query.success

  if (query.startDate || query.endDate) {
    where.timestamp = {}
    if (query.startDate) (where.timestamp as Record<string, Date>).gte = query.startDate
    if (query.endDate) (where.timestamp as Record<string, Date>).lte = query.endDate
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: query.limit || 50,
      skip: query.offset || 0,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total }
}

/**
 * Get recent activity for a specific resource
 */
export async function getResourceHistory(
  resource: AuditResource,
  resourceId: string,
  limit = 20
) {
  return prisma.auditLog.findMany({
    where: {
      resource,
      resourceId,
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  })
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(userId: string, days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const activities = await prisma.auditLog.groupBy({
    by: ['action', 'resource'],
    where: {
      userId,
      timestamp: { gte: startDate },
    },
    _count: true,
  })

  return activities.map((a) => ({
    action: a.action,
    resource: a.resource,
    count: a._count,
  }))
}
