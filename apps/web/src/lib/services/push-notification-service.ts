/**
 * Push Notification Service
 *
 * Sends push notifications to iOS (APNs) and Android (FCM) devices.
 *
 * Required environment variables:
 * - APNS_KEY_ID: Apple Push Notification Key ID
 * - APNS_TEAM_ID: Apple Developer Team ID
 * - APNS_BUNDLE_ID: Your app's bundle identifier
 * - APNS_PRIVATE_KEY: Contents of the .p8 key file (base64 encoded)
 * - FCM_SERVER_KEY: Firebase Cloud Messaging server key (for Android)
 */

import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

interface PushPayload {
  title: string
  body: string
  data?: Record<string, string>
  badge?: number
  sound?: string
}

interface SendResult {
  success: boolean
  platform: string
  token: string
  error?: string
}

// APNs JWT token cache
let apnsToken: string | null = null
let apnsTokenExpiry: number = 0

/**
 * Generate APNs JWT token for authentication
 */
function getApnsToken(): string | null {
  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  const privateKeyBase64 = process.env.APNS_PRIVATE_KEY

  if (!keyId || !teamId || !privateKeyBase64) {
    console.warn('APNs credentials not configured')
    return null
  }

  // Return cached token if still valid (tokens last 1 hour, refresh at 50 mins)
  const now = Math.floor(Date.now() / 1000)
  if (apnsToken && apnsTokenExpiry > now + 600) {
    return apnsToken
  }

  try {
    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8')

    apnsToken = jwt.sign({}, privateKey, {
      algorithm: 'ES256',
      issuer: teamId,
      header: {
        alg: 'ES256',
        kid: keyId,
      },
      expiresIn: '1h',
    })
    apnsTokenExpiry = now + 3600

    return apnsToken
  } catch (error) {
    console.error('Failed to generate APNs token:', error)
    return null
  }
}

/**
 * Send push notification to an iOS device via APNs
 */
async function sendToApns(token: string, payload: PushPayload): Promise<SendResult> {
  const bundleId = process.env.APNS_BUNDLE_ID
  const authToken = getApnsToken()

  if (!authToken || !bundleId) {
    return {
      success: false,
      platform: 'IOS',
      token,
      error: 'APNs not configured',
    }
  }

  // Use production APNs server (use api.sandbox.push.apple.com for dev)
  const isProduction = process.env.NODE_ENV === 'production'
  const apnsHost = isProduction
    ? 'api.push.apple.com'
    : 'api.sandbox.push.apple.com'

  const apnsPayload = {
    aps: {
      alert: {
        title: payload.title,
        body: payload.body,
      },
      badge: payload.badge ?? 1,
      sound: payload.sound ?? 'default',
    },
    ...payload.data,
  }

  try {
    const response = await fetch(`https://${apnsHost}/3/device/${token}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apnsPayload),
    })

    if (response.ok) {
      return { success: true, platform: 'IOS', token }
    }

    const errorBody = await response.text()
    console.error('APNs error:', response.status, errorBody)

    // Handle invalid tokens
    if (response.status === 410 || response.status === 400) {
      // Mark token as inactive
      await prisma.deviceToken.updateMany({
        where: { token },
        data: { isActive: false },
      })
    }

    return {
      success: false,
      platform: 'IOS',
      token,
      error: `APNs error: ${response.status}`,
    }
  } catch (error) {
    console.error('APNs send error:', error)
    return {
      success: false,
      platform: 'IOS',
      token,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send push notification to an Android device via FCM
 */
async function sendToFcm(token: string, payload: PushPayload): Promise<SendResult> {
  const serverKey = process.env.FCM_SERVER_KEY

  if (!serverKey) {
    return {
      success: false,
      platform: 'ANDROID',
      token,
      error: 'FCM not configured',
    }
  }

  const fcmPayload = {
    to: token,
    notification: {
      title: payload.title,
      body: payload.body,
      sound: payload.sound ?? 'default',
    },
    data: payload.data ?? {},
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    })

    const result = await response.json()

    if (result.success === 1) {
      return { success: true, platform: 'ANDROID', token }
    }

    // Handle invalid tokens
    if (result.results?.[0]?.error === 'NotRegistered') {
      await prisma.deviceToken.updateMany({
        where: { token },
        data: { isActive: false },
      })
    }

    return {
      success: false,
      platform: 'ANDROID',
      token,
      error: result.results?.[0]?.error || 'FCM error',
    }
  } catch (error) {
    console.error('FCM send error:', error)
    return {
      success: false,
      platform: 'ANDROID',
      token,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send push notification to a specific user on all their devices
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<SendResult[]> {
  const devices = await prisma.deviceToken.findMany({
    where: {
      userId,
      isActive: true,
    },
  })

  if (devices.length === 0) {
    return []
  }

  const results = await Promise.all(
    devices.map(async (device) => {
      if (device.platform === 'IOS') {
        return sendToApns(device.token, payload)
      } else if (device.platform === 'ANDROID') {
        return sendToFcm(device.token, payload)
      }
      return {
        success: false,
        platform: device.platform,
        token: device.token,
        error: 'Unknown platform',
      }
    })
  )

  return results
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<Map<string, SendResult[]>> {
  const results = new Map<string, SendResult[]>()

  await Promise.all(
    userIds.map(async (userId) => {
      const userResults = await sendPushToUser(userId, payload)
      results.set(userId, userResults)
    })
  )

  return results
}

/**
 * Send push notification to all users assigned to a project
 */
export async function sendPushToProject(
  projectId: string,
  payload: PushPayload,
  excludeUserId?: string
): Promise<Map<string, SendResult[]>> {
  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId },
    select: { userId: true },
  })

  const userIds = assignments
    .map((a) => a.userId)
    .filter((id) => id !== excludeUserId)

  return sendPushToUsers(userIds, payload)
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): { ios: boolean; android: boolean } {
  return {
    ios: !!(
      process.env.APNS_KEY_ID &&
      process.env.APNS_TEAM_ID &&
      process.env.APNS_BUNDLE_ID &&
      process.env.APNS_PRIVATE_KEY
    ),
    android: !!process.env.FCM_SERVER_KEY,
  }
}
