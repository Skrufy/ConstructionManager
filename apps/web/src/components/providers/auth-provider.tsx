'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js'

// Auth initialization timeout - prevent infinite loading
const AUTH_INIT_TIMEOUT_MS = 10000 // 10 seconds

interface PrismaUser {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  prismaUser: PrismaUser | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  prismaUser: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
})

/**
 * AuthProvider - Supabase Auth context provider
 *
 * Works across all platforms:
 * - Web: Uses browser cookies via @supabase/ssr
 * - iOS/Android: Uses access tokens (handled by native SDK)
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [prismaUser, setPrismaUser] = useState<PrismaUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Track the last fetched user ID to prevent duplicate fetches
  const lastFetchedUserIdRef = useRef<string | null>(null)
  // Track if initial auth has completed
  const initialAuthCompleteRef = useRef(false)

  // Only create supabase client after mount to avoid SSR issues
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null
    return createBrowserSupabaseClient()
  }, [])

  // Fetch Prisma user data (role, id, etc.)
  // Uses ref to prevent duplicate fetches for the same user
  const fetchPrismaUser = useCallback(async (userId: string, force = false) => {
    // Skip if we already fetched for this user (unless forced)
    if (!force && lastFetchedUserIdRef.current === userId) {
      return
    }

    try {
      const response = await fetch('/api/users/me')
      if (response.ok) {
        const data = await response.json()
        // Only update state if the data actually changed
        setPrismaUser(prev => {
          if (prev?.id === data.id &&
              prev?.email === data.email &&
              prev?.name === data.name &&
              prev?.role === data.role) {
            return prev // Return same reference if data unchanged
          }
          return data
        })
        lastFetchedUserIdRef.current = userId
      } else {
        setPrismaUser(null)
        lastFetchedUserIdRef.current = null
      }
    } catch {
      setPrismaUser(null)
      lastFetchedUserIdRef.current = null
    }
  }, [])

  // Refresh user data (can be called after profile updates)
  const refreshUser = useCallback(async () => {
    if (!supabase) return
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    setUser(currentUser)
    if (currentUser) {
      await fetchPrismaUser(currentUser.id, true) // Force refresh
    }
  }, [supabase, fetchPrismaUser])

  // Set mounted state
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Don't run until mounted and supabase is available
    if (!mounted || !supabase) return

    // Get initial session with timeout protection
    const initSession = async () => {
      // Prevent duplicate initialization
      if (initialAuthCompleteRef.current) return

      // Set timeout to prevent infinite loading
      authTimeoutRef.current = setTimeout(() => {
        console.warn('[AuthProvider] Auth initialization timed out after', AUTH_INIT_TIMEOUT_MS, 'ms')
        setLoading(false)
      }, AUTH_INIT_TIMEOUT_MS)

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()

        // Clear timeout on success
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current)
          authTimeoutRef.current = null
        }

        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        if (initialSession?.user) {
          await fetchPrismaUser(initialSession.user.id)
        }

        initialAuthCompleteRef.current = true
      } catch (error) {
        console.error('Error getting initial session:', error)
        // Clear timeout on error
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current)
          authTimeoutRef.current = null
        }
      } finally {
        setLoading(false)
      }
    }

    initSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        // Skip INITIAL_SESSION if we already handled initial auth
        if (event === 'INITIAL_SESSION' && initialAuthCompleteRef.current) {
          return
        }

        // Only update session if it actually changed
        setSession(prev => {
          if (prev?.access_token === currentSession?.access_token) {
            return prev // Return same reference if unchanged
          }
          return currentSession
        })

        setUser(prev => {
          if (prev?.id === currentSession?.user?.id) {
            return prev // Return same reference if unchanged
          }
          return currentSession?.user ?? null
        })

        if (currentSession?.user) {
          // Fetch Prisma user data on sign in (skip if already fetched for this user)
          await fetchPrismaUser(currentSession.user.id)
        } else {
          setPrismaUser(null)
          lastFetchedUserIdRef.current = null
        }

        // Handle specific events
        if (event === 'SIGNED_OUT') {
          setPrismaUser(null)
          lastFetchedUserIdRef.current = null
          initialAuthCompleteRef.current = false
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      // Clean up timeout on unmount
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current)
      }
    }
  }, [mounted, supabase, fetchPrismaUser])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setPrismaUser(null)
  }, [supabase])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    prismaUser,
    session,
    loading,
    signOut,
    refreshUser,
  }), [user, prismaUser, session, loading, signOut, refreshUser])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth hook - Access auth context
 * Provides Supabase user and Prisma user data
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
