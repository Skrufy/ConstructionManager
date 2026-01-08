import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// ============================================
// Geocoding API - Uses Google Places or falls back to Nominatim
// ============================================

interface GooglePlaceResult {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

interface GoogleGeocodeResult {
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  address_components: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
}

// Convert Google result to our standard format
function parseGoogleResult(result: GoogleGeocodeResult) {
  const components = result.address_components || []

  const getComponent = (type: string) =>
    components.find(c => c.types.includes(type))?.long_name || ''

  const getShortComponent = (type: string) =>
    components.find(c => c.types.includes(type))?.short_name || ''

  return {
    place_id: 0,
    lat: result.geometry.location.lat.toString(),
    lon: result.geometry.location.lng.toString(),
    display_name: result.formatted_address,
    importance: 1,
    address: {
      house_number: getComponent('street_number'),
      road: getComponent('route'),
      city: getComponent('locality') || getComponent('sublocality'),
      state: getShortComponent('administrative_area_level_1'),
      postcode: getComponent('postal_code'),
      country: getComponent('country'),
    }
  }
}

// Simple in-memory cache (5-minute TTL)
interface CacheEntry {
  data: unknown[]
  timestamp: number
}
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000

function getCachedResult(query: string): unknown[] | null {
  const entry = cache.get(query.toLowerCase().trim())
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }
  return null
}

function setCachedResult(query: string, data: unknown[]): void {
  if (cache.size >= 1000) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
  cache.set(query.toLowerCase().trim(), { data, timestamp: Date.now() })
}

/**
 * GET /api/geocode?q=<address>
 * Uses Google Places API if available, falls back to Nominatim
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const placeId = searchParams.get('place_id') // For getting details of a selected place

    if (!query && !placeId) {
      return NextResponse.json({ results: [] })
    }

    if (query && query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Check cache first
    const cacheKey = placeId || query || ''
    const cachedResult = getCachedResult(cacheKey)
    if (cachedResult) {
      return NextResponse.json({ results: cachedResult, source: 'cache' })
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY

    // If we have a place_id, get details from Google
    if (placeId && googleApiKey) {
      const detailsUrl = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${googleApiKey}`
      const response = await fetch(detailsUrl)
      const data = await response.json()

      if (data.status === 'OK' && data.results?.length > 0) {
        const parsed = parseGoogleResult(data.results[0])
        setCachedResult(cacheKey, [parsed])
        return NextResponse.json({ results: [parsed], source: 'google' })
      }
    }

    // Use Google Places Autocomplete if API key is available
    if (googleApiKey && query) {
      const autocompleteUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
      autocompleteUrl.searchParams.set('input', query)
      autocompleteUrl.searchParams.set('key', googleApiKey)
      autocompleteUrl.searchParams.set('types', 'address')
      autocompleteUrl.searchParams.set('components', 'country:us')
      // Bias towards Tennessee (Nashville coordinates)
      autocompleteUrl.searchParams.set('location', '36.1627,-86.7816')
      autocompleteUrl.searchParams.set('radius', '500000') // 500km radius bias

      const response = await fetch(autocompleteUrl.toString())
      const data = await response.json()

      if (data.status === 'OK' && data.predictions?.length > 0) {
        // Get full details for each prediction (up to 5)
        const predictions = data.predictions.slice(0, 5) as GooglePlaceResult[]

        const detailedResults = await Promise.all(
          predictions.map(async (pred) => {
            const detailUrl = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${pred.place_id}&key=${googleApiKey}`
            const detailRes = await fetch(detailUrl)
            const detailData = await detailRes.json()

            if (detailData.status === 'OK' && detailData.results?.[0]) {
              return parseGoogleResult(detailData.results[0])
            }
            return null
          })
        )

        const validResults = detailedResults.filter(Boolean)
        setCachedResult(cacheKey, validResults)
        return NextResponse.json({ results: validResults, source: 'google' })
      }

      // If Google fails, fall through to Nominatim
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Google Places API error:', data.status, data.error_message)
      }
    }

    // Fallback to Nominatim (free, no API key required)
    if (query) {
      const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search')
      nominatimUrl.searchParams.set('q', query)
      nominatimUrl.searchParams.set('format', 'json')
      nominatimUrl.searchParams.set('addressdetails', '1')
      nominatimUrl.searchParams.set('limit', '5')
      nominatimUrl.searchParams.set('countrycodes', 'us')

      const response = await fetch(nominatimUrl.toString(), {
        headers: {
          'User-Agent': 'ConstructionManagementPlatform/1.0',
          'Accept-Language': 'en-US,en',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCachedResult(cacheKey, data)
        return NextResponse.json({ results: data, source: 'nominatim' })
      }
    }

    return NextResponse.json({ results: [], source: 'none' })
  } catch (error) {
    console.error('Error in geocode API:', error)
    return NextResponse.json({ error: 'Geocoding service error' }, { status: 500 })
  }
}
