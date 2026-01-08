import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * CORS Configuration
 * Allowed origins for API requests from iOS/Android apps and web
 */
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || (
  process.env.NODE_ENV === 'production'
    ? 'https://your-production-domain.com,capacitor://localhost,ionic://localhost'
    : 'http://localhost:3000,http://localhost:3001,capacitor://localhost,ionic://localhost'
)).split(',').map(origin => origin.trim())

/**
 * Check if origin is allowed for CORS
 */
function isOriginAllowed(origin: string | null, requestUrl: URL): boolean {
  if (!origin) return true // Allow requests with no origin (same-origin, mobile apps)

  // Allow same-origin requests (e.g., web app calling its own API)
  const requestOrigin = `${requestUrl.protocol}//${requestUrl.host}`
  if (origin === requestOrigin) return true

  return ALLOWED_ORIGINS.includes(origin)
}

/**
 * Edge-compatible rate limiting for authentication endpoints
 * Uses in-memory storage - works for single-instance deployments
 * For production with multiple instances, use Redis or similar edge-compatible storage
 */

// In-memory rate limit storage (resets on cold start)
const authAttempts = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration for auth endpoints
const AUTH_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 10,          // 10 attempts per window
}

// Clean up expired entries periodically
function cleanupExpiredEntries() {
  const now = Date.now()
  authAttempts.forEach((entry, key) => {
    if (entry.resetTime < now) {
      authAttempts.delete(key)
    }
  })
}

// Get client IP from request
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return 'unknown'
}

// Check and update rate limit
function checkAuthRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  const entry = authAttempts.get(ip)

  // Clean up occasionally
  if (Math.random() < 0.01) {
    cleanupExpiredEntries()
  }

  // No entry or expired window
  if (!entry || entry.resetTime < now) {
    authAttempts.set(ip, { count: 1, resetTime: now + AUTH_RATE_LIMIT.windowMs })
    return { allowed: true, remaining: AUTH_RATE_LIMIT.maxAttempts - 1 }
  }

  // Check if over limit
  if (entry.count >= AUTH_RATE_LIMIT.maxAttempts) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  // Increment and allow
  entry.count++
  return { allowed: true, remaining: AUTH_RATE_LIMIT.maxAttempts - entry.count }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const origin = request.headers.get('origin')
  const requestUrl = request.nextUrl

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    if (!isOriginAllowed(origin, requestUrl)) {
      return new NextResponse(null, { status: 403 })
    }
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With, Origin',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // Block API requests from disallowed origins
  if (pathname.startsWith('/api/') && origin && !isOriginAllowed(origin, requestUrl)) {
    return new NextResponse(
      JSON.stringify({ error: 'CORS error: Origin not allowed' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Add CORS headers for allowed origins on API routes
  if (pathname.startsWith('/api/') && origin && isOriginAllowed(origin, requestUrl)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  // Rate limit auth endpoints (keep existing logic)
  if (pathname.startsWith('/api/auth/') && request.method === 'POST') {
    // Rate limit login/register attempts
    if (
      pathname.includes('/callback') ||
      pathname.includes('/signin') ||
      pathname.includes('/register')
    ) {
      const ip = getClientIP(request)
      const { allowed, remaining, retryAfter } = checkAuthRateLimit(ip)

      if (!allowed) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too many login attempts',
            message: 'Please try again later.',
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': AUTH_RATE_LIMIT.maxAttempts.toString(),
              'X-RateLimit-Remaining': '0',
              'Retry-After': retryAfter?.toString() || '900',
            },
          }
        )
      }

      response.headers.set('X-RateLimit-Limit', AUTH_RATE_LIMIT.maxAttempts.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
    }
  }

  // Supabase session refresh
  // This refreshes the auth session if expired and updates cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    // This will refresh the session if expired
    await supabase.auth.getUser()
  }

  return response
}

// Apply middleware to all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
