import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const registerDeviceSchema = z.object({
  token: z.string().min(1, 'Device token is required'),
  platform: z.enum(['IOS', 'ANDROID'], {
    errorMap: () => ({ message: 'Platform must be IOS or ANDROID' }),
  }),
  deviceId: z.string().optional(),
  appVersion: z.string().optional(),
})

/**
 * POST /api/notifications/register-device
 *
 * Register a device token for push notifications (iOS/Android)
 * Called when the mobile app initializes or refreshes its push token
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const validation = registerDeviceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { token, platform, deviceId, appVersion } = validation.data

    // Upsert the device token
    // If token exists, update user association (handles device transfers)
    await prisma.deviceToken.upsert({
      where: { token },
      update: {
        userId: user.id,
        platform,
        deviceId: deviceId || null,
        appVersion: appVersion || null,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        token,
        platform,
        deviceId: deviceId || null,
        appVersion: appVersion || null,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Device registered for push notifications',
    })
  } catch (error) {
    console.error('Error registering device:', error)
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/register-device
 *
 * Unregister a device token (called on logout)
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Only allow users to delete their own device tokens
    await prisma.deviceToken.updateMany({
      where: {
        token,
        userId: user.id,
      },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Device unregistered',
    })
  } catch (error) {
    console.error('Error unregistering device:', error)
    return NextResponse.json(
      { error: 'Failed to unregister device' },
      { status: 500 }
    )
  }
}
