'use client'

import { useMemo, useCallback, useRef } from 'react'
import { useAuth } from '@/components/providers/auth-provider'

/**
 * Backward-compatible useSession hook
 *
 * Provides the same interface as NextAuth's useSession() for easy migration.
 * Components using `const { data: session } = useSession()` will work unchanged.
 *
 * Session structure matches NextAuth:
 * - session.user.id (Prisma user ID)
 * - session.user.email
 * - session.user.name
 * - session.user.role
 */
export function useSession() {
  const { prismaUser, session, loading, refreshUser } = useAuth()

  // Cache the last session data to prevent unnecessary object creation
  const lastSessionDataRef = useRef<{
    user: {
      id: string
      email: string
      name: string
      role: string
      phone?: string
    }
    expires: string
  } | null>(null)

  // Memoize the update function to prevent recreating on every render
  const update = useCallback(async (_data?: Record<string, unknown>) => {
    await refreshUser()
  }, [refreshUser])

  // Extract primitive values for stable comparison
  const prismaUserId = prismaUser?.id
  const prismaUserEmail = prismaUser?.email
  const prismaUserName = prismaUser?.name
  const prismaUserRole = prismaUser?.role
  const prismaUserPhone = (prismaUser as { phone?: string } | null)?.phone
  const sessionExpiresAt = session?.expires_at

  // Memoize the session data using ONLY primitive values as dependencies
  // This prevents re-creating the object when object references change
  const sessionData = useMemo(() => {
    if (!prismaUserId || !sessionExpiresAt) {
      lastSessionDataRef.current = null
      return null
    }

    // Check if data actually changed from last time
    const last = lastSessionDataRef.current
    if (last &&
        last.user.id === prismaUserId &&
        last.user.email === prismaUserEmail &&
        last.user.name === prismaUserName &&
        last.user.role === prismaUserRole &&
        last.user.phone === prismaUserPhone) {
      // Data unchanged, return same reference
      return last
    }

    // Data changed, create new object
    const newData = {
      user: {
        id: prismaUserId,
        email: prismaUserEmail || '',
        name: prismaUserName || '',
        role: prismaUserRole || '',
        phone: prismaUserPhone,
      },
      expires: new Date(sessionExpiresAt * 1000).toISOString(),
    }
    lastSessionDataRef.current = newData
    return newData
  }, [prismaUserId, prismaUserEmail, prismaUserName, prismaUserRole, prismaUserPhone, sessionExpiresAt])

  // Memoize the entire return object to prevent unnecessary re-renders
  const result = useMemo(() => {
    if (loading) {
      return {
        data: null,
        status: 'loading' as const,
        update,
      }
    }

    if (!sessionData) {
      return {
        data: null,
        status: 'unauthenticated' as const,
        update,
      }
    }

    return {
      data: sessionData,
      status: 'authenticated' as const,
      update,
    }
  }, [loading, sessionData, update])

  return result
}

/**
 * Type definitions for session data
 * Matches NextAuth session structure for compatibility
 */
export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
}

export interface SessionData {
  user: SessionUser
  expires: string
}

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'
