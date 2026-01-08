import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema for POST request body
const syncActionSchema = z.object({
  action: z.enum(['sync']),
})

// Test the Google Maps API key by making a simple geocoding request
async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Use Geocoding API to validate the key with a simple test
    const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${apiKey}`
    const response = await fetch(testUrl)
    const data = await response.json()

    // Check for API errors (invalid key, quota exceeded, etc.)
    if (data.status === 'REQUEST_DENIED') {
      return { valid: false, error: data.error_message || 'API key is invalid or restricted' }
    }
    if (data.status === 'OVER_QUERY_LIMIT') {
      return { valid: false, error: 'API quota exceeded' }
    }
    // OK or ZERO_RESULTS both mean the key is valid
    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      return { valid: true }
    }

    return { valid: false, error: `Unexpected API status: ${data.status}` }
  } catch (error) {
    return { valid: false, error: 'Failed to connect to Google Maps API' }
  }
}

// GET /api/integrations/googlemaps - Get Google Maps integration status
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    // Check if API key is configured
    const apiKeyConfigured = !!process.env.GOOGLE_MAPS_API_KEY

    return NextResponse.json({
      configured: apiKeyConfigured,
      connected: apiKeyConfigured,
      lastSync: null,
      stats: {},
      features: {
        geocoding: apiKeyConfigured,
        staticmaps: apiKeyConfigured,
        places: apiKeyConfigured,
      },
    })
  } catch (error) {
    console.error('[Google Maps Integration] GET Error:', error)
    return NextResponse.json({
      error: 'Failed to get integration status',
      code: 'STATUS_FETCH_FAILED',
    }, { status: 500 })
  }
}

// POST /api/integrations/googlemaps - Handle sync actions
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins can trigger syncs
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
      }, { status: 400 })
    }

    const parseResult = syncActionSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const { action } = parseResult.data

    if (action === 'sync') {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY

      if (!apiKey) {
        return NextResponse.json({
          success: false,
          error: 'Google Maps API key not configured',
          code: 'API_KEY_NOT_CONFIGURED',
        }, { status: 400 })
      }

      // Actually validate the API key by making a test request
      const validation = await validateApiKey(apiKey)

      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          error: validation.error || 'API key validation failed',
          code: 'API_KEY_INVALID',
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Google Maps API key verified and working',
        lastSync: new Date().toISOString(),
      })
    }

    // This shouldn't be reachable due to Zod validation, but kept for safety
    return NextResponse.json({
      error: 'Unknown action',
      code: 'UNKNOWN_ACTION',
    }, { status: 400 })
  } catch (error) {
    console.error('[Google Maps Integration] POST Error:', error)
    return NextResponse.json({
      error: 'Failed to process request',
      code: 'REQUEST_FAILED',
    }, { status: 500 })
  }
}
