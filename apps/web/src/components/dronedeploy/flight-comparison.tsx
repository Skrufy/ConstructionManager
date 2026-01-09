'use client'

import { useState, useRef, useEffect } from 'react'
import {
  X,
  Calendar,
  ChevronDown,
  Columns,
  Layers,
  SlidersHorizontal,
  Camera,
  MapPin,
  Clock,
} from 'lucide-react'
import { getFlightStatusColor } from '@/lib/status-colors'

interface Flight {
  id: string
  flightDate: string
  pilotName: string
  droneModel: string
  duration: number
  area: number
  images: number
  mapUrl: string
  status: string
  notes: string
}

interface FlightComparisonProps {
  flights: Flight[]
  onClose: () => void
}

type ComparisonMode = 'side-by-side' | 'overlay'

export function FlightComparison({ flights, onClose }: FlightComparisonProps) {
  const [leftFlight, setLeftFlight] = useState<Flight | null>(
    flights.length > 1 ? flights[flights.length - 2] : null
  )
  const [rightFlight, setRightFlight] = useState<Flight | null>(
    flights.length > 0 ? flights[flights.length - 1] : null
  )
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('side-by-side')
  const [overlayOpacity, setOverlayOpacity] = useState(50)
  const [showLeftSelector, setShowLeftSelector] = useState(false)
  const [showRightSelector, setShowRightSelector] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  // Handle slider drag for side-by-side comparison
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return
      const rect = sliderRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setSliderPosition(percentage)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const FlightSelector = ({
    selected,
    onSelect,
    show,
    setShow,
    excludeId,
    label,
  }: {
    selected: Flight | null
    onSelect: (flight: Flight) => void
    show: boolean
    setShow: (show: boolean) => void
    excludeId?: string
    label: string
  }) => (
    <div className="relative flex-1">
      <button
        onClick={() => setShow(!show)}
        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between hover:border-blue-500 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-gray-400" />
          <div className="text-left">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {selected ? formatDate(selected.flightDate) : 'Select flight'}
            </p>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 text-gray-400" />
      </button>

      {show && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShow(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
            {flights
              .filter((f) => f.id !== excludeId && f.status === 'PROCESSED')
              .map((flight) => (
                <button
                  key={flight.id}
                  onClick={() => {
                    onSelect(flight)
                    setShow(false)
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selected?.id === flight.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(flight.flightDate)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {flight.images} images • {flight.area} acres
                    </p>
                  </div>
                </button>
              ))}
            {flights.filter((f) => f.id !== excludeId && f.status === 'PROCESSED').length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                No processed flights available
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-gray-900/90 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Flight Comparison
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Compare orthomosaic maps from different flights
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Comparison Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setComparisonMode('side-by-side')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                comparisonMode === 'side-by-side'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Columns className="h-4 w-4" />
              Side by Side
            </button>
            <button
              onClick={() => setComparisonMode('overlay')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                comparisonMode === 'overlay'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Layers className="h-4 w-4" />
              Overlay
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Flight Selectors */}
      <div className="flex items-center gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
        <FlightSelector
          selected={leftFlight}
          onSelect={setLeftFlight}
          show={showLeftSelector}
          setShow={setShowLeftSelector}
          excludeId={rightFlight?.id}
          label="Before"
        />

        <div className="text-gray-400">
          <SlidersHorizontal className="h-5 w-5" />
        </div>

        <FlightSelector
          selected={rightFlight}
          onSelect={setRightFlight}
          show={showRightSelector}
          setShow={setShowRightSelector}
          excludeId={leftFlight?.id}
          label="After"
        />
      </div>

      {/* Comparison View */}
      <div className="flex-1 relative overflow-hidden" ref={sliderRef}>
        {leftFlight && rightFlight ? (
          <>
            {comparisonMode === 'side-by-side' ? (
              <>
                {/* Left Image */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg font-medium">
                        {formatDate(leftFlight.flightDate)}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {leftFlight.images} images • {leftFlight.area} acres
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Image */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ left: `${sliderPosition}%`, width: `${100 - sliderPosition}%` }}
                >
                  <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-300 text-lg font-medium">
                        {formatDate(rightFlight.flightDate)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {rightFlight.images} images • {rightFlight.area} acres
                      </p>
                    </div>
                  </div>
                </div>

                {/* Slider Handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
                  style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                  onMouseDown={() => setIsDragging(true)}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <SlidersHorizontal className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-full">
                  <span className="text-white text-sm font-medium">Before</span>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1.5 rounded-full">
                  <span className="text-white text-sm font-medium">After</span>
                </div>
              </>
            ) : (
              /* Overlay Mode */
              <>
                {/* Base Layer (Before) */}
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg font-medium">
                      {formatDate(leftFlight.flightDate)}
                    </p>
                    <p className="text-gray-500 text-sm">Before</p>
                  </div>
                </div>

                {/* Overlay Layer (After) */}
                <div
                  className="absolute inset-0 bg-gray-700 flex items-center justify-center"
                  style={{ opacity: overlayOpacity / 100 }}
                >
                  <div className="text-center">
                    <Camera className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-300 text-lg font-medium">
                      {formatDate(rightFlight.flightDate)}
                    </p>
                    <p className="text-gray-400 text-sm">After</p>
                  </div>
                </div>

                {/* Opacity Slider */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl px-4 py-3 flex items-center gap-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Before
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
                    className="w-48 accent-blue-600"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    After
                  </span>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <Columns className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg font-medium">Select two flights to compare</p>
              <p className="text-gray-500 text-sm mt-1">
                Choose flights with processed orthomosaic maps
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Flight Details Footer */}
      {leftFlight && rightFlight && (
        <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-4">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Flight Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFlightStatusColor(leftFlight.status)}`}>
                  Before
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(leftFlight.flightDate)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Camera className="h-4 w-4" />
                  {leftFlight.images} images
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4" />
                  {leftFlight.area} acres
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  {leftFlight.duration} min
                </div>
              </div>
            </div>

            {/* Right Flight Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFlightStatusColor(rightFlight.status)}`}>
                  After
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(rightFlight.flightDate)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Camera className="h-4 w-4" />
                  {rightFlight.images} images
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4" />
                  {rightFlight.area} acres
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  {rightFlight.duration} min
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
