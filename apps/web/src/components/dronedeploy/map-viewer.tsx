'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  MapPin,
  Ruler,
  X,
  Palette,
  Trash2,
  Check,
  RotateCcw,
} from 'lucide-react'

// Import Leaflet CSS in the component that uses it
import 'leaflet/dist/leaflet.css'

interface MapAnnotation {
  id: string
  type: 'pin' | 'measurement'
  lat: number
  lng: number
  color: string
  label?: string
  endLat?: number
  endLng?: number
  distance?: number
}

interface MapViewerProps {
  mapUrl?: string
  center?: [number, number]
  zoom?: number
  showLayerControl?: boolean
  showAnnotations?: boolean
  onAnnotationsChange?: (annotations: MapAnnotation[]) => void
  initialAnnotations?: MapAnnotation[]
  className?: string
}

// Layer options
const MAP_LAYERS = [
  { id: 'satellite', label: 'Satellite', type: 'tile' },
  { id: 'orthomosaic', label: 'Orthomosaic', type: 'overlay' },
  { id: 'elevation', label: 'Elevation', type: 'overlay' },
  { id: 'contour', label: 'Contour Lines', type: 'overlay' },
]

// Annotation colors
const ANNOTATION_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
]

export function MapViewer({
  mapUrl,
  center = [37.7749, -122.4194], // Default to San Francisco
  zoom = 16,
  showLayerControl = true,
  showAnnotations = true,
  onAnnotationsChange,
  initialAnnotations = [],
  className = '',
}: MapViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(['satellite']))
  const [annotations, setAnnotations] = useState<MapAnnotation[]>(initialAnnotations)
  const [annotationMode, setAnnotationMode] = useState<'none' | 'pin' | 'measure'>('none')
  const [selectedColor, setSelectedColor] = useState(ANNOTATION_COLORS[4]) // blue default
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [measureStart, setMeasureStart] = useState<{ lat: number; lng: number } | null>(null)
  const [L, setL] = useState<any>(null)

  // Load Leaflet dynamically (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        setL(leaflet.default)
      })
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!L || !mapContainerRef.current || mapRef.current) return

    // Fix for default marker icons in Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
    })

    // Add satellite base layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    // Handle map clicks for annotations
    map.on('click', (e: any) => {
      if (annotationMode === 'pin') {
        addPinAnnotation(e.latlng.lat, e.latlng.lng)
      } else if (annotationMode === 'measure') {
        handleMeasureClick(e.latlng.lat, e.latlng.lng)
      }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [L, center, zoom])

  // Update annotations on map
  useEffect(() => {
    if (!L || !mapRef.current) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Add annotation markers
    annotations.forEach((annotation) => {
      if (annotation.type === 'pin') {
        const icon = L.divIcon({
          className: 'custom-pin-marker',
          html: `<div style="background-color: ${annotation.color}; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        })
        const marker = L.marker([annotation.lat, annotation.lng], { icon }).addTo(mapRef.current)
        if (annotation.label) {
          marker.bindTooltip(annotation.label, { permanent: true, direction: 'top' })
        }
        markersRef.current.push(marker)
      } else if (annotation.type === 'measurement' && annotation.endLat && annotation.endLng) {
        // Draw measurement line
        const line = L.polyline(
          [
            [annotation.lat, annotation.lng],
            [annotation.endLat, annotation.endLng],
          ],
          { color: annotation.color, weight: 3, dashArray: '5, 10' }
        ).addTo(mapRef.current)

        // Add distance label at midpoint
        const midLat = (annotation.lat + annotation.endLat) / 2
        const midLng = (annotation.lng + annotation.endLng) / 2
        const label = L.marker([midLat, midLng], {
          icon: L.divIcon({
            className: 'measurement-label',
            html: `<div style="background: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">${annotation.distance?.toFixed(1)}m</div>`,
            iconSize: [60, 20],
            iconAnchor: [30, 10],
          }),
        }).addTo(mapRef.current)

        markersRef.current.push(line, label)
      }
    })
  }, [L, annotations])

  const addPinAnnotation = useCallback(
    (lat: number, lng: number) => {
      const newAnnotation: MapAnnotation = {
        id: `pin-${Date.now()}`,
        type: 'pin',
        lat,
        lng,
        color: selectedColor,
      }
      const updated = [...annotations, newAnnotation]
      setAnnotations(updated)
      onAnnotationsChange?.(updated)
      setAnnotationMode('none')
    },
    [annotations, selectedColor, onAnnotationsChange]
  )

  const handleMeasureClick = useCallback(
    (lat: number, lng: number) => {
      if (!measureStart) {
        setMeasureStart({ lat, lng })
      } else {
        // Calculate distance using Haversine formula
        const R = 6371e3 // Earth's radius in meters
        const lat1 = (measureStart.lat * Math.PI) / 180
        const lat2 = (lat * Math.PI) / 180
        const deltaLat = ((lat - measureStart.lat) * Math.PI) / 180
        const deltaLng = ((lng - measureStart.lng) * Math.PI) / 180

        const a =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c

        const newAnnotation: MapAnnotation = {
          id: `measure-${Date.now()}`,
          type: 'measurement',
          lat: measureStart.lat,
          lng: measureStart.lng,
          endLat: lat,
          endLng: lng,
          color: selectedColor,
          distance,
        }
        const updated = [...annotations, newAnnotation]
        setAnnotations(updated)
        onAnnotationsChange?.(updated)
        setMeasureStart(null)
        setAnnotationMode('none')
      }
    },
    [measureStart, annotations, selectedColor, onAnnotationsChange]
  )

  const clearAnnotations = () => {
    setAnnotations([])
    onAnnotationsChange?.([])
  }

  const handleZoomIn = () => {
    mapRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    mapRef.current?.zoomOut()
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    setTimeout(() => {
      mapRef.current?.invalidateSize()
    }, 100)
  }

  const toggleLayer = (layerId: string) => {
    const newLayers = new Set(activeLayers)
    if (newLayers.has(layerId)) {
      newLayers.delete(layerId)
    } else {
      newLayers.add(layerId)
    }
    setActiveLayers(newLayers)
  }

  return (
    <div
      className={`relative bg-gray-900 rounded-lg overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : className
      }`}
    >
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        {/* Zoom Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700"
            title="Zoom In"
          >
            <ZoomIn className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Zoom Out"
          >
            <ZoomOut className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <Maximize2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          )}
        </button>

        {/* Layer Control */}
        {showLayerControl && (
          <div className="relative">
            <button
              onClick={() => setShowLayers(!showLayers)}
              className={`p-2 rounded-lg shadow-lg ${
                showLayers
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Map Layers"
            >
              <Layers className={`h-5 w-5 ${showLayers ? '' : 'text-gray-700 dark:text-gray-300'}`} />
            </button>

            {showLayers && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 py-2">
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Map Layers
                </div>
                {MAP_LAYERS.map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">{layer.label}</span>
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        activeLayers.has(layer.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {activeLayers.has(layer.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Annotation Controls */}
      {showAnnotations && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-[1000]">
          {/* Pin Tool */}
          <button
            onClick={() => setAnnotationMode(annotationMode === 'pin' ? 'none' : 'pin')}
            className={`p-2 rounded-lg shadow-lg ${
              annotationMode === 'pin'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Add Pin"
          >
            <MapPin className={`h-5 w-5 ${annotationMode === 'pin' ? '' : 'text-gray-700 dark:text-gray-300'}`} />
          </button>

          {/* Measure Tool */}
          <button
            onClick={() => {
              setAnnotationMode(annotationMode === 'measure' ? 'none' : 'measure')
              setMeasureStart(null)
            }}
            className={`p-2 rounded-lg shadow-lg ${
              annotationMode === 'measure'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Measure Distance"
          >
            <Ruler className={`h-5 w-5 ${annotationMode === 'measure' ? '' : 'text-gray-700 dark:text-gray-300'}`} />
          </button>

          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Annotation Color"
            >
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: selectedColor }} />
            </button>

            {showColorPicker && (
              <div className="absolute left-full ml-2 top-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 p-2 flex gap-1">
                {ANNOTATION_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color)
                      setShowColorPicker(false)
                    }}
                    className={`w-6 h-6 rounded-full ${
                      selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Clear Annotations */}
          {annotations.length > 0 && (
            <button
              onClick={clearAnnotations}
              className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Clear All Annotations"
            >
              <Trash2 className="h-5 w-5 text-red-500" />
            </button>
          )}
        </div>
      )}

      {/* Mode Indicator */}
      {annotationMode !== 'none' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-[1000]">
          {annotationMode === 'pin' && (
            <>
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">Click map to place pin</span>
            </>
          )}
          {annotationMode === 'measure' && (
            <>
              <Ruler className="h-4 w-4" />
              <span className="text-sm font-medium">
                {measureStart ? 'Click to set end point' : 'Click to set start point'}
              </span>
            </>
          )}
          <button
            onClick={() => {
              setAnnotationMode('none')
              setMeasureStart(null)
            }}
            className="ml-2 p-1 hover:bg-blue-700 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Fullscreen Close Button */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 z-[1001]"
        >
          <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      {/* Annotations Count */}
      {annotations.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 z-[1000]">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}
