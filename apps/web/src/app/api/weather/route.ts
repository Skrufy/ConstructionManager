import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

interface WeatherData {
  temperature: number
  temperatureUnit: 'F' | 'C'
  condition: string
  conditionCode: string
  humidity: number
  windSpeed: number
  windDirection: string
  precipitation: number
  visibility: number
  uvIndex: number
  sunrise: string
  sunset: string
  location: string
  timestamp: string
  source: 'api' | 'mock'
}

// Fetch weather data from OpenWeatherMap
async function getOpenWeatherData(lat: number, lng: number, apiKey: string): Promise<WeatherData | null> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial`
    const response = await fetch(url, { next: { revalidate: 1800 } }) // Cache for 30 minutes

    if (!response.ok) {
      console.error('OpenWeatherMap API error:', response.status)
      return null
    }

    const data = await response.json()

    const windDirections = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    const windDegree = data.wind?.deg || 0
    const windIndex = Math.round(windDegree / 22.5) % 16

    return {
      temperature: Math.round(data.main.temp),
      temperatureUnit: 'F',
      condition: data.weather[0]?.description || 'Unknown',
      conditionCode: data.weather[0]?.main?.toLowerCase() || 'unknown',
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind?.speed || 0),
      windDirection: windDirections[windIndex],
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      visibility: Math.round((data.visibility || 10000) / 1609.34), // Convert meters to miles
      uvIndex: 0, // Not available in basic API
      sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      location: data.name || `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      timestamp: new Date().toISOString(),
      source: 'api'
    }
  } catch (error) {
    console.error('Error fetching weather data:', error)
    return null
  }
}

// GET /api/weather - Get weather data for a location
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')

    const apiKey = process.env.OPENWEATHER_API_KEY

    // Validate coordinates - use default if not provided
    const latitude = (lat === 0 && lng === 0) ? 39.8283 : lat
    const longitude = (lat === 0 && lng === 0) ? -98.5795 : lng

    // If API key is not configured, return error with configuration message
    if (!apiKey) {
      return NextResponse.json({
        error: 'Weather API not configured',
        message: 'Add OPENWEATHER_API_KEY to environment variables for live weather data.',
        configured: false,
        temperature: null,
        condition: null,
        location: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        timestamp: new Date().toISOString()
      })
    }

    // Try to get real weather data
    const weatherData = await getOpenWeatherData(latitude, longitude, apiKey)

    if (weatherData) {
      return NextResponse.json(weatherData)
    }

    // API call failed - return error
    return NextResponse.json({
      error: 'Failed to fetch weather data from OpenWeatherMap',
      configured: true,
      temperature: null,
      condition: null,
      location: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  } catch (error) {
    console.error('Error in weather API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
