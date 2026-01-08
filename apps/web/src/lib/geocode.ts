// ============================================
// Geocoding Types and Utilities
// Using OpenStreetMap Nominatim API
// ============================================

/**
 * Raw response from Nominatim API
 */
export interface NominatimResult {
  place_id: number
  licence: string
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  display_name: string
  importance: number
  address: {
    house_number?: string
    road?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    county?: string
    state?: string
    postcode?: string
    country?: string
    country_code?: string
  }
  boundingbox: string[]
}

/**
 * Parsed address for application use
 */
export interface ParsedAddress {
  fullAddress: string
  streetAddress: string
  city: string
  state: string
  zip: string
  country?: string
  latitude: number | null
  longitude: number | null
}

/**
 * Parse Nominatim result into application-friendly format
 */
export function parseNominatimResult(result: NominatimResult): ParsedAddress {
  const addr = result.address

  // Build street address from house number and road
  const streetParts = [addr.house_number, addr.road].filter(Boolean)

  // City can be city, town, or village depending on location size
  const city = addr.city || addr.town || addr.village || ''

  return {
    fullAddress: result.display_name,
    streetAddress: streetParts.join(' '),
    city,
    state: addr.state || '',
    zip: addr.postcode || '',
    country: addr.country || '',
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
  }
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number, precision = 6): string {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`
}

/**
 * Validate coordinates are within valid ranges
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}
