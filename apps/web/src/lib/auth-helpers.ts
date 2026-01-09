import { createServerSupabaseClient, createAdminSupabaseClient } from './supabase-auth'
import { prisma } from './prisma'

/**
 * Authenticated user interface
 * Matches the structure previously used by NextAuth for backward compatibility
 */
export interface AuthUser {
  id: string          // Prisma User ID (cuid)
  supabaseId: string  // Supabase UUID
  email: string
  name: string
  role: string
}

/**
 * Get the current authenticated user from Supabase session
 * Combines Supabase Auth user with Prisma user data (role, etc.)
 *
 * Use this in Server Components and API routes for cookie-based auth (web)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser) {
      return null
    }

    // Get Prisma user data (includes role, status, etc.)
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    })

    // User must exist in Prisma and be ACTIVE
    if (!prismaUser || prismaUser.status !== 'ACTIVE') {
      return null
    }

    return {
      id: prismaUser.id,
      supabaseId: supabaseUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      role: prismaUser.role,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Validate a Bearer token and get the user (for iOS/mobile requests)
 *
 * @param token - The access token from Authorization header
 * @returns AuthUser if valid, null otherwise
 */
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const adminClient = createAdminSupabaseClient()
    const { data: { user: supabaseUser }, error } = await adminClient.auth.getUser(token)

    if (error) {
      console.error('[getUserFromToken] Supabase token validation error:', error)
      return null
    }

    if (!supabaseUser) {
      console.error('[getUserFromToken] No Supabase user found for token')
      return null
    }

    // Get Prisma user data
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    })

    if (!prismaUser) {
      console.warn('[getUserFromToken] No Prisma user found, creating PENDING_SETUP user')

      // Create user with PENDING_SETUP status - they can't login until admin activates them
      // This ensures we track these users and admins can see them in user management
      await prisma.user.create({
        data: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'New User',
          password: 'supabase_auth', // Placeholder - auth is via Supabase
          role: 'FIELD_WORKER', // Default role - admin must review and change if needed
          status: 'PENDING_SETUP', // Blocked until admin configures
        },
      })

      console.warn('[getUserFromToken] User created with PENDING_SETUP status - requires admin activation')

      // Return null to reject login - user must be activated by admin first
      return null
    }

    if (prismaUser.status !== 'ACTIVE') {
      console.error('[getUserFromToken] User account is not active')
      return null
    }

    return {
      id: prismaUser.id,
      supabaseId: supabaseUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      role: prismaUser.role,
    }
  } catch (error) {
    console.error('[getUserFromToken] Error validating bearer token:', error)
    return null
  }
}

/**
 * Require authentication - throws if not authenticated
 * Use in Server Components where you want to enforce auth
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

/**
 * Create or update a Prisma user record from Supabase Auth user
 * Called after OAuth sign-in or registration
 */
export async function syncUserToPrisma(supabaseUserId: string, email: string, name?: string): Promise<void> {
  const existingUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUserId },
  })

  if (existingUser) {
    // User exists, no update needed
    return
  }

  // Check if user exists by email (migration case)
  const userByEmail = await prisma.user.findUnique({
    where: { email },
  })

  if (userByEmail) {
    // Link existing user to Supabase
    await prisma.user.update({
      where: { email },
      data: {
        supabaseId: supabaseUserId,
        migratedAt: new Date(),
        passwordResetRequired: false,
      },
    })
    return
  }

  // Create new Prisma user for OAuth sign-ups
  await prisma.user.create({
    data: {
      supabaseId: supabaseUserId,
      email,
      name: name || email.split('@')[0],
      password: '', // No password for OAuth users
      role: 'VIEWER', // Default role for new users
      status: 'ACTIVE',
    },
  })
}

/**
 * Get user by Supabase ID
 */
export async function getUserBySupabaseId(supabaseId: string) {
  return prisma.user.findUnique({
    where: { supabaseId },
  })
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  })
}
