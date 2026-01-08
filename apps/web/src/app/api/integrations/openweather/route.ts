import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// GET /api/integrations/openweather - Check OpenWeather integration status
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.OPENWEATHER_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        connected: false,
        lastSync: null,
        stats: {},
        features: {},
      })
    }

    // Test the API key by making a simple request
    try {
      const testUrl = `https://api.openweathermap.org/data/2.5/weather?lat=39.8283&lon=-98.5795&appid=${apiKey}&units=imperial`
      const response = await fetch(testUrl)

      if (response.ok) {
        return NextResponse.json({
          configured: true,
          connected: true,
          lastSync: new Date().toISOString(),
          stats: {
            apiCalls: 1,
          },
          features: {
            currentWeather: true,
            forecast: true,
          },
        })
      } else {
        return NextResponse.json({
          configured: true,
          connected: false,
          lastSync: null,
          stats: {},
          features: {},
          error: 'API key is invalid or expired',
        })
      }
    } catch {
      return NextResponse.json({
        configured: true,
        connected: false,
        lastSync: null,
        stats: {},
        features: {},
        error: 'Failed to connect to OpenWeather API',
      })
    }
  } catch (error) {
    console.error('OpenWeather status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
