'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2, Search, X, Clock, Building2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { ParsedAddress, parseNominatimResult, NominatimResult } from '@/lib/geocode'

// Saved address type from our database
interface SavedAddress {
  id: string
  fullAddress: string
  streetAddress?: string
  city?: string
  state?: string
  zipCode?: string
  latitude?: number
  longitude?: number
  label?: string
  type: string
  usageCount: number
}

// Combined suggestion type
interface CombinedSuggestion {
  type: 'saved' | 'geocode'
  id: string
  displayName: string
  subtitle?: string
  label?: string
  data: SavedAddress | NominatimResult
}

interface AddressAutocompleteProps {
  /** Current input value */
  value: string
  /** Called when input value changes */
  onChange: (value: string) => void
  /** Called when user selects an address from suggestions */
  onSelect: (address: ParsedAddress) => void
  /** Placeholder text */
  placeholder?: string
  /** Additional CSS classes for the input */
  className?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Whether the field is required */
  required?: boolean
  /** Input ID */
  id?: string
  /** Input name */
  name?: string
  /** Show GPS coordinates when available */
  showGpsFields?: boolean
  /** Current latitude (for display) */
  latitude?: number | string | null
  /** Current longitude (for display) */
  longitude?: number | string | null
  /** Address type for saving (JOBSITE, OFFICE, WAREHOUSE, SUBCONTRACTOR) */
  addressType?: string
  /** Whether to save selected addresses to the library */
  saveToLibrary?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing an address...',
  className = '',
  disabled = false,
  required = false,
  id,
  name,
  showGpsFields = false,
  latitude,
  longitude,
  addressType = 'JOBSITE',
  saveToLibrary = true,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CombinedSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [recentAddresses, setRecentAddresses] = useState<SavedAddress[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce the search query
  const debouncedValue = useDebounce(value, 300)

  // Fetch recent/saved addresses on mount
  useEffect(() => {
    const fetchRecentAddresses = async () => {
      try {
        const response = await fetch('/api/addresses?limit=5')
        if (response.ok) {
          const data = await response.json()
          setRecentAddresses(data.addresses || [])
        }
      } catch (err) {
        console.error('Failed to fetch recent addresses:', err)
      }
    }
    fetchRecentAddresses()
  }, [])

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    // Don't search for very short queries
    if (debouncedValue.length < 2) {
      // Show recent addresses when input is focused but empty/short
      if (recentAddresses.length > 0 && debouncedValue.length > 0) {
        const filtered = recentAddresses
          .filter(addr => addr.fullAddress.toLowerCase().includes(debouncedValue.toLowerCase()))
          .map(addr => ({
            type: 'saved' as const,
            id: addr.id,
            displayName: addr.fullAddress.split(',')[0],
            subtitle: addr.fullAddress.split(',').slice(1).join(',').trim(),
            label: addr.label,
            data: addr,
          }))
        setSuggestions(filtered)
        setIsOpen(filtered.length > 0)
      } else {
        setSuggestions([])
        setIsOpen(false)
      }
      return
    }

    // Create AbortController to cancel previous requests
    const abortController = new AbortController()

    const fetchSuggestions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch both saved addresses and geocode results in parallel
        const [savedResponse, geocodeResponse] = await Promise.all([
          fetch(`/api/addresses?q=${encodeURIComponent(debouncedValue)}&limit=3`, {
            signal: abortController.signal,
          }),
          fetch(`/api/geocode?q=${encodeURIComponent(debouncedValue)}`, {
            signal: abortController.signal,
          }),
        ])

        const savedData = savedResponse.ok ? await savedResponse.json() : { addresses: [] }
        const geocodeData = geocodeResponse.ok ? await geocodeResponse.json() : { results: [] }

        // Convert saved addresses to combined format
        const savedSuggestions: CombinedSuggestion[] = (savedData.addresses || []).map(
          (addr: SavedAddress) => ({
            type: 'saved' as const,
            id: addr.id,
            displayName: addr.fullAddress.split(',')[0],
            subtitle: addr.fullAddress.split(',').slice(1).join(',').trim(),
            label: addr.label,
            data: addr,
          })
        )

        // Convert geocode results to combined format
        const geocodeSuggestions: CombinedSuggestion[] = (geocodeData.results || []).map(
          (result: NominatimResult) => ({
            type: 'geocode' as const,
            id: result.place_id.toString(),
            displayName: result.display_name.split(',')[0],
            subtitle: result.display_name.split(',').slice(1).join(',').trim(),
            data: result,
          })
        )

        // Combine: saved addresses first, then geocode results
        const combined = [...savedSuggestions, ...geocodeSuggestions].slice(0, 8)
        setSuggestions(combined)
        setIsOpen(combined.length > 0)
        setSelectedIndex(-1)
      } catch (err) {
        // Ignore abort errors (expected when user types quickly)
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        console.error('Address autocomplete error:', err)
        setError('Unable to load address suggestions')
        setSuggestions([])
      } finally {
        // Only update loading state if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchSuggestions()

    // Cleanup: abort the request if component unmounts or query changes
    return () => {
      abortController.abort()
    }
  }, [debouncedValue, recentAddresses])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Save address to library (non-blocking)
  const saveAddressToLibrary = useCallback(
    async (address: ParsedAddress) => {
      if (!saveToLibrary) return

      try {
        await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullAddress: address.fullAddress,
            streetAddress: address.streetAddress,
            city: address.city,
            state: address.state,
            zipCode: address.zip,
            latitude: address.latitude,
            longitude: address.longitude,
            type: addressType,
          }),
        })
      } catch (err) {
        console.error('Failed to save address to library:', err)
      }
    },
    [saveToLibrary, addressType]
  )

  // Handle selection of an address
  const handleSelect = useCallback(
    (suggestion: CombinedSuggestion) => {
      let parsed: ParsedAddress

      if (suggestion.type === 'saved') {
        // Handle saved address
        const savedAddr = suggestion.data as SavedAddress
        parsed = {
          fullAddress: savedAddr.fullAddress,
          streetAddress: savedAddr.streetAddress || '',
          city: savedAddr.city || '',
          state: savedAddr.state || '',
          zip: savedAddr.zipCode || '',
          latitude: savedAddr.latitude || null,
          longitude: savedAddr.longitude || null,
        }
        // Update usage count (fire and forget)
        fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullAddress: savedAddr.fullAddress }),
        }).catch(() => {})
      } else {
        // Handle geocode result
        const geocodeResult = suggestion.data as NominatimResult
        parsed = parseNominatimResult(geocodeResult)
        // Save new address to library
        saveAddressToLibrary(parsed)
      }

      onChange(parsed.fullAddress)
      onSelect(parsed)
      setIsOpen(false)
      setSuggestions([])
    },
    [onChange, onSelect, saveAddressToLibrary]
  )

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Clear input
  const handleClear = () => {
    onChange('')
    setSuggestions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Check if we have valid GPS coordinates to display
  const hasGpsCoordinates =
    latitude != null &&
    longitude != null &&
    latitude !== '' &&
    longitude !== ''

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        {/* Input Field */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            id={id}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={`w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls={isOpen ? 'address-suggestions' : undefined}
          />

          {/* Loading/Clear indicators */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            )}
            {value && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 p-0.5"
                tabIndex={-1}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <ul
            id="address-suggestions"
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
            role="listbox"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.type}-${suggestion.id}`}
                role="option"
                aria-selected={index === selectedIndex}
                className={`px-4 py-3 cursor-pointer flex items-start gap-3 border-b border-gray-100 last:border-0 ${
                  index === selectedIndex
                    ? 'bg-primary-50 text-primary-900'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {suggestion.type === 'saved' ? (
                  <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {suggestion.displayName}
                    </p>
                    {suggestion.label && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {suggestion.label}
                      </span>
                    )}
                    {suggestion.type === 'saved' && !suggestion.label && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        Recent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {suggestion.subtitle}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Error message */}
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>

      {/* Optional GPS coordinate display */}
      {showGpsFields && hasGpsCoordinates && (
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          <MapPin className="w-4 h-4 text-green-500" />
          <span>
            GPS: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
          </span>
        </div>
      )}
    </div>
  )
}
