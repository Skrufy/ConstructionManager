import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

import {
  isQuickBooksConfigured,
  isQuickBooksConnected,
  getAuthorizationUrl,
  createOAuthState,
  syncTimesheetsToQuickBooks,
  getSyncStatus,
  getEmployees,
  disconnectQuickBooks,
} from '@/lib/quickbooks'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Rate limit for sync operations (expensive external API calls)
const syncRateLimit = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 5,       // 5 sync operations per minute
  message: 'Too many sync requests. Please wait before syncing again.',
}

// GET /api/integrations/quickbooks - Get integration status
export async function GET(request: NextRequest) {
  // Apply standard rate limiting
  const rateLimitResponse = withRateLimit(request, RATE_LIMITS.standard)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const configured = isQuickBooksConfigured()
    const connected = await isQuickBooksConnected()
    const syncStatus = await getSyncStatus()

    return NextResponse.json({
      configured,
      connected,
      lastSync: syncStatus.lastSyncTime?.toISOString() || null,
      stats: {
        totalApproved: syncStatus.totalApproved,
        synced: syncStatus.synced,
        pendingSync: syncStatus.pendingSync,
        failed: syncStatus.failed,
      },
      features: {
        timesheetSync: true,
        employeeSync: true,
        payrollExport: true,
      },
    })
  } catch (error) {
    console.error('QuickBooks status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/integrations/quickbooks - Perform sync actions
export async function POST(request: NextRequest) {
  // Apply rate limiting for sync operations
  const rateLimitResponse = withRateLimit(request, syncRateLimit)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (!isQuickBooksConfigured()) {
      return NextResponse.json({
        error: 'QuickBooks integration not configured',
        message: 'Please add QuickBooks API credentials to your environment variables:\n' +
          '- QUICKBOOKS_CLIENT_ID\n' +
          '- QUICKBOOKS_CLIENT_SECRET\n' +
          '- QUICKBOOKS_REDIRECT_URI',
        configureUrl: '/admin/integrations',
      }, { status: 400 })
    }

    // Get OAuth authorization URL with secure state
    if (action === 'authorize') {
      // Generate cryptographically secure state and store it
      const state = await createOAuthState(user.id)
      const authUrl = getAuthorizationUrl(state)

      return NextResponse.json({
        success: true,
        authUrl,
        message: 'Redirect to authUrl to complete OAuth flow',
      })
    }

    // Disconnect QuickBooks
    if (action === 'disconnect') {
      await disconnectQuickBooks()
      return NextResponse.json({
        success: true,
        message: 'QuickBooks disconnected successfully',
      })
    }

    // Sync timesheets to QuickBooks
    if (action === 'sync' || action === 'sync-timesheets') {
      const connected = await isQuickBooksConnected()
      if (!connected) {
        return NextResponse.json({
          error: 'QuickBooks not connected',
          message: 'Please complete the OAuth flow first.',
          action: 'authorize',
        }, { status: 400 })
      }

      const result = await syncTimesheetsToQuickBooks()

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Successfully synced ${result.syncedCount} time entries to QuickBooks`
          : `Synced ${result.syncedCount} entries with ${result.failedCount} failures`,
        syncedCount: result.syncedCount,
        failedCount: result.failedCount,
        details: result.details,
        errors: result.errors,
      })
    }

    // Sync employees (fetch from QB for mapping)
    if (action === 'sync-employees') {
      const connected = await isQuickBooksConnected()
      if (!connected) {
        return NextResponse.json({
          error: 'QuickBooks not connected',
          message: 'Please complete the OAuth flow first.',
        }, { status: 400 })
      }

      const employees = await getEmployees()

      return NextResponse.json({
        success: true,
        message: `Found ${employees.length} employees in QuickBooks`,
        employeeCount: employees.length,
        employees: employees.map(e => ({
          id: e.Id,
          name: e.DisplayName,
          email: e.PrimaryEmailAddr?.Address,
          active: e.Active,
        })),
      })
    }

    // Get sync status
    if (action === 'status') {
      const status = await getSyncStatus()
      return NextResponse.json({
        success: true,
        ...status,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('QuickBooks sync error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'QuickBooks operation failed',
      message,
    }, { status: 500 })
  }
}
