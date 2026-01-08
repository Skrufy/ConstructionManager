import { NextRequest, NextResponse } from 'next/server'

// ============================================
// Rate Limiting Configuration
// ============================================

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
  message?: string      // Custom error message
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// In production, use Redis or similar for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  })
}, 60000) // Clean up every minute

// ============================================
// Rate Limit Presets
// ============================================

export const RATE_LIMITS = {
  // Standard API endpoints
  standard: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 100,        // 100 requests per minute
  },

  // Strict limit for sensitive endpoints (auth, uploads)
  strict: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 20,         // 20 requests per minute
  },

  // Very strict for login attempts
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,          // 10 attempts per 15 minutes
    message: 'Too many login attempts. Please try again later.',
  },

  // File upload limit
  upload: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 10,         // 10 uploads per minute
    message: 'Upload rate limit exceeded. Please wait before uploading more files.',
  },

  // Report generation (expensive operations)
  reports: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 5,          // 5 reports per minute
    message: 'Report generation rate limit exceeded.',
  },

  // OCR/Document analysis (expensive external API calls)
  ocr: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 10,         // 10 analyses per minute
    message: 'Document analysis rate limit exceeded. Please wait before analyzing more documents.',
  },

  // Analytics (expensive operations)
  analytics: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 10,         // 10 analytics requests per minute
  },

  // Webhook/integration endpoints
  webhook: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 30,         // 30 requests per minute
  },
} as const

// ============================================
// Rate Limiting Functions
// ============================================

/**
 * Get a unique identifier for rate limiting
 * Uses IP address and optionally user ID
 */
function getClientIdentifier(request: NextRequest, userId?: string): string {
  // Get IP from various headers (handle proxies)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

  // Combine IP and user ID if available
  return userId ? `${ip}:${userId}` : ip
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): { allowed: boolean; remaining: number; resetTime: number } {
  const identifier = getClientIdentifier(request, userId)
  const key = `${request.nextUrl.pathname}:${identifier}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // If no entry or expired, create new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Create a rate limit response with proper headers
 */
export function createRateLimitResponse(
  remaining: number,
  resetTime: number,
  config: RateLimitConfig
): NextResponse {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)

  return NextResponse.json(
    {
      error: config.message || 'Too many requests. Please try again later.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  )
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetTime: number,
  maxRequests: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
  return response
}

/**
 * Rate limiting wrapper for API handlers
 *
 * Usage:
 * ```
 * export async function GET(request: NextRequest) {
 *   const rateLimitResult = withRateLimit(request, RATE_LIMITS.standard)
 *   if (rateLimitResult) return rateLimitResult
 *
 *   // Your handler logic here
 * }
 * ```
 */
export function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): NextResponse | null {
  const { allowed, remaining, resetTime } = checkRateLimit(request, config, userId)

  if (!allowed) {
    return createRateLimitResponse(remaining, resetTime, config)
  }

  return null
}

/**
 * Enhanced rate limiting that returns info for adding headers to success responses
 *
 * Usage:
 * ```
 * export async function GET(request: NextRequest) {
 *   const rateLimit = withRateLimitInfo(request, RATE_LIMITS.standard)
 *   if (rateLimit.blocked) return rateLimit.response
 *
 *   // Your handler logic here
 *   const response = NextResponse.json({ data })
 *   return rateLimit.addHeaders(response)
 * }
 * ```
 */
export function withRateLimitInfo(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): {
  blocked: boolean
  response?: NextResponse
  addHeaders: (response: NextResponse) => NextResponse
} {
  const { allowed, remaining, resetTime } = checkRateLimit(request, config, userId)

  if (!allowed) {
    return {
      blocked: true,
      response: createRateLimitResponse(remaining, resetTime, config),
      addHeaders: (r) => r,
    }
  }

  return {
    blocked: false,
    addHeaders: (response: NextResponse) => {
      return addRateLimitHeaders(response, remaining, resetTime, config.maxRequests)
    },
  }
}

/**
 * Higher-order function to wrap an API handler with rate limiting
 *
 * Usage:
 * ```
 * export const GET = rateLimited(RATE_LIMITS.standard, async (request) => {
 *   // Your handler logic here
 *   return NextResponse.json({ data: 'success' })
 * })
 * ```
 */
export function rateLimited<T extends (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>>(
  config: RateLimitConfig,
  handler: T
): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    // Check rate limit and store result (only check once!)
    const { allowed, remaining, resetTime } = checkRateLimit(request, config)

    if (!allowed) {
      return createRateLimitResponse(remaining, resetTime, config)
    }

    const response = await handler(request, ...args)

    // Add rate limit headers to successful response using stored values
    addRateLimitHeaders(response, remaining, resetTime, config.maxRequests)

    return response
  }) as T
}

// ============================================
// IP-based blocking (for abuse prevention)
// ============================================

const blockedIPs = new Set<string>()
const suspiciousActivity = new Map<string, number>()

/**
 * Block an IP address
 */
export function blockIP(ip: string): void {
  blockedIPs.add(ip)
}

/**
 * Unblock an IP address
 */
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip)
}

/**
 * Check if an IP is blocked
 */
export function isIPBlocked(request: NextRequest): boolean {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

  return blockedIPs.has(ip)
}

/**
 * Record suspicious activity for an IP
 * Auto-blocks after threshold is reached
 */
export function recordSuspiciousActivity(request: NextRequest, threshold = 50): boolean {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

  const count = (suspiciousActivity.get(ip) || 0) + 1
  suspiciousActivity.set(ip, count)

  if (count >= threshold) {
    blockIP(ip)
    return true // IP was blocked
  }

  return false
}
