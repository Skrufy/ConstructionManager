import { prisma } from '@/lib/prisma'
import { sendPushToUser, isPushConfigured } from './push-notification-service'

export type NotificationType =
  | 'API_DISCONNECT'
  | 'API_RECONNECT'
  | 'CERT_EXPIRING'
  | 'APPROVAL_NEEDED'
  | 'SYSTEM_ALERT'
  | 'DOCUMENT_SPLIT_COMPLETE'
  | 'DOCUMENT_SPLIT_FAILED'
  | 'OCR_COMPLETE'
  | 'OCR_FAILED'

export type NotificationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export type NotificationCategory = 'SYSTEM' | 'API' | 'APPROVAL' | 'SAFETY' | 'DOCUMENT'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  severity?: NotificationSeverity
  category?: NotificationCategory
  data?: Record<string, unknown>
  actionUrl?: string
}

/**
 * Create a notification for a specific user
 * Also sends push notification to their mobile devices if configured
 */
export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    type,
    title,
    message,
    severity = 'INFO',
    category = 'SYSTEM',
    data,
    actionUrl,
  } = params

  // Create the notification in the database
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      severity,
      category,
      data: (data as object) ?? undefined,
      actionUrl,
    },
  })

  // Send push notification if configured (non-blocking)
  const pushConfig = isPushConfigured()
  if (pushConfig.ios || pushConfig.android) {
    sendPushToUser(userId, {
      title,
      body: message,
      data: {
        notificationId: notification.id,
        type,
        category,
        ...(actionUrl ? { actionUrl } : {}),
      },
    }).catch((error) => {
      console.error('Failed to send push notification:', error)
    })
  }

  return notification
}

/**
 * Notify all admin users with a notification
 */
export async function notifyAdmins(
  params: Omit<CreateNotificationParams, 'userId'>
) {
  // Find all active admin users
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    select: { id: true },
  })

  if (admins.length === 0) {
    console.warn('No active admin users found to notify')
    return []
  }

  // Create notifications for all admins
  const notifications = await Promise.all(
    admins.map((admin) => createNotification({ ...params, userId: admin.id }))
  )

  return notifications
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Get all notifications for a user (with pagination)
 */
export async function getNotifications(
  userId: string,
  options: { skip?: number; take?: number; unreadOnly?: boolean } = {}
) {
  const { skip = 0, take = 50, unreadOnly = false } = options

  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  })
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  })
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.update({
    where: { id: notificationId, userId },
    data: { read: true, readAt: new Date() },
  })
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  })
}

/**
 * Delete a specific notification for a user
 */
export async function deleteNotification(notificationId: string, userId: string) {
  return prisma.notification.delete({
    where: { id: notificationId, userId },
  })
}

/**
 * Delete old notifications (cleanup)
 */
export async function cleanupOldNotifications(daysOld = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  return prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      read: true,
    },
  })
}
