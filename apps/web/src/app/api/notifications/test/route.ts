import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { createNotification } from '@/lib/services/notification-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/test
 * Send a test notification to the current user (dev only)
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Test notifications only available in development' },
      { status: 403 }
    )
  }

  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Create a test notification
    const notification = await createNotification({
      userId: user.id,
      type: 'SYSTEM_ALERT',
      title: 'Test Notification',
      message: 'This is a test push notification from ConstructionPro!',
      severity: 'INFO',
      category: 'SYSTEM',
      actionUrl: '/admin/settings',
      data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      message: 'Test notification sent',
    })
  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
}
