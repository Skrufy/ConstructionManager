import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserFromToken, AuthUser } from './auth-helpers'

/**
 * Unified authentication for API routes
 * Supports both:
 * - Cookie-based auth (web app)
 * - Bearer token auth (iOS/mobile app)
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = await requireApiAuth(request)
 *   if (authResult instanceof NextResponse) return authResult
 *   const { user } = authResult
 *   // user.id, user.role, user.email, user.name available
 * }
 * ```
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // Check for Bearer token first (iOS/mobile app)
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const user = await getUserFromToken(token)
    if (user) return user
  }

  // Fall back to cookie-based auth (web app)
  return getCurrentUser()
}

/**
 * Require authentication for API routes
 * Returns user object or 401 response
 *
 * Usage:
 * ```typescript
 * const authResult = await requireApiAuth(request)
 * if (authResult instanceof NextResponse) return authResult
 * const { user } = authResult
 * ```
 */
export async function requireApiAuth(
  request: NextRequest
): Promise<{ user: AuthUser } | NextResponse> {
  const user = await getAuthUser(request)

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return { user }
}

/**
 * Require specific roles for API routes
 *
 * Usage:
 * ```typescript
 * const authResult = await requireApiAuthWithRoles(request, ['ADMIN', 'PROJECT_MANAGER'])
 * if (authResult instanceof NextResponse) return authResult
 * const { user } = authResult
 * ```
 */
export async function requireApiAuthWithRoles(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ user: AuthUser } | NextResponse> {
  const authResult = await requireApiAuth(request)

  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  return { user }
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN'
}

/**
 * Check if user has manager or higher privileges
 */
export function isManagerOrAbove(user: AuthUser): boolean {
  const managerRoles = ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'ARCHITECT']
  return managerRoles.includes(user.role)
}

/**
 * Check if user has foreman or higher privileges
 */
export function isForemanOrAbove(user: AuthUser): boolean {
  const foremanRoles = ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'ARCHITECT', 'FOREMAN', 'SUPERINTENDENT']
  return foremanRoles.includes(user.role)
}
