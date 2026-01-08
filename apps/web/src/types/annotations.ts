// Annotation type definitions for construction drawings

export type AnnotationType =
  | 'PIN'           // Location marker with entity linking
  | 'COMMENT'       // Text annotation
  | 'RECTANGLE'     // Rectangle shape
  | 'CIRCLE'        // Circle/ellipse shape
  | 'CLOUD'         // Revision cloud markup
  | 'ARROW'         // Arrow with line
  | 'LINE'          // Simple line
  | 'CALLOUT'       // Numbered callout with leader line
  | 'MEASUREMENT'   // Distance measurement
  | 'AREA'          // Area calculation (polygon)
  | 'FREEHAND'      // Freehand sketch
  // Legacy types (from existing DocumentAnnotation)
  | 'MARKUP'
  | 'HIGHLIGHT'

// Normalized point (0-1 range relative to PDF page dimensions)
export interface NormalizedPoint {
  x: number  // 0-1
  y: number  // 0-1
}

// Base annotation interface
export interface BaseAnnotation {
  id: string
  fileId: string
  pageNumber: number
  type: AnnotationType
  createdBy: string
  createdByName?: string
  createdAt: string
  updatedAt?: string
  resolvedAt: string | null
  resolvedBy: string | null
  color: string
  position: NormalizedPoint  // Primary anchor point
}

// Entity that can be linked to a pin
export interface LinkedEntity {
  type: 'COMMENT' | 'ISSUE' | 'RFI' | 'PUNCH_LIST_ITEM'
  id: string
  title?: string
  status?: string
}

// Pin annotation - location marker with optional entity link
export interface PinAnnotation extends BaseAnnotation {
  type: 'PIN'
  label?: string
  linkedEntity?: LinkedEntity
}

// Comment annotation - text note at a location
export interface CommentAnnotation extends BaseAnnotation {
  type: 'COMMENT'
  text: string
}

// Shape annotations (rectangle, circle, cloud)
export interface ShapeAnnotation extends BaseAnnotation {
  type: 'RECTANGLE' | 'CIRCLE' | 'CLOUD'
  width: number   // Normalized
  height: number  // Normalized
  rotation?: number  // Degrees
  fillColor?: string
  fillOpacity?: number  // 0-1
  strokeWidth?: number
}

// Line/arrow annotation
export interface LineAnnotation extends BaseAnnotation {
  type: 'ARROW' | 'LINE'
  endPoint: NormalizedPoint
  strokeWidth: number
}

// Callout annotation - numbered marker with leader line
export interface CalloutAnnotation extends BaseAnnotation {
  type: 'CALLOUT'
  number: number
  text: string
  leaderEndPoint: NormalizedPoint
  bubbleRadius?: number
}

// Measurement annotation - distance between two points
export interface MeasurementAnnotation extends BaseAnnotation {
  type: 'MEASUREMENT'
  endPoint: NormalizedPoint
  displayValue: string      // Pre-calculated: "12'-6\"" or "3.8m"
  rawPixelDistance: number  // For recalculation if needed
  scale?: string            // Drawing scale used: "1/4\" = 1'-0\""
  strokeWidth?: number
}

// Area annotation - polygon with area calculation
export interface AreaAnnotation extends BaseAnnotation {
  type: 'AREA'
  points: NormalizedPoint[]  // Polygon vertices (closed)
  displayArea: string        // Pre-calculated: "256 sq ft"
  rawPixelArea: number       // For recalculation
  scale?: string
  fillOpacity?: number
}

// Freehand annotation - sketch path
export interface FreehandAnnotation extends BaseAnnotation {
  type: 'FREEHAND'
  path: NormalizedPoint[]
  strokeWidth: number
}

// Union type for all annotations
export type Annotation =
  | PinAnnotation
  | CommentAnnotation
  | ShapeAnnotation
  | LineAnnotation
  | CalloutAnnotation
  | MeasurementAnnotation
  | AreaAnnotation
  | FreehandAnnotation

// Annotation tool configuration
export interface AnnotationTool {
  type: AnnotationType
  icon: string  // Lucide icon name
  label: string
  shortcut: string
  description?: string
}

// Default annotation tools configuration
export const ANNOTATION_TOOLS: AnnotationTool[] = [
  { type: 'PIN', icon: 'MapPin', label: 'Pin', shortcut: 'P', description: 'Place location marker' },
  { type: 'COMMENT', icon: 'MessageSquare', label: 'Comment', shortcut: 'C', description: 'Add text note' },
  { type: 'RECTANGLE', icon: 'Square', label: 'Rectangle', shortcut: 'R', description: 'Draw rectangle' },
  { type: 'CIRCLE', icon: 'Circle', label: 'Circle', shortcut: 'O', description: 'Draw circle' },
  { type: 'CLOUD', icon: 'Cloud', label: 'Cloud', shortcut: 'K', description: 'Revision cloud' },
  { type: 'ARROW', icon: 'ArrowRight', label: 'Arrow', shortcut: 'A', description: 'Draw arrow' },
  { type: 'LINE', icon: 'Minus', label: 'Line', shortcut: 'L', description: 'Draw line' },
  { type: 'CALLOUT', icon: 'Hash', label: 'Callout', shortcut: 'N', description: 'Numbered callout' },
  { type: 'MEASUREMENT', icon: 'Ruler', label: 'Measure', shortcut: 'M', description: 'Measure distance' },
  { type: 'AREA', icon: 'Maximize2', label: 'Area', shortcut: 'E', description: 'Calculate area' },
  { type: 'FREEHAND', icon: 'PenTool', label: 'Freehand', shortcut: 'F', description: 'Freehand sketch' },
]

// Default colors for annotations
export const ANNOTATION_COLORS = [
  '#EF4444', // red-500
  '#F97316', // orange-500
  '#EAB308', // yellow-500
  '#22C55E', // green-500
  '#06B6D4', // cyan-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#000000', // black
  '#FFFFFF', // white
]

// Helper to serialize annotation for API storage
export function serializeAnnotationContent(annotation: Omit<Annotation, 'id' | 'fileId' | 'createdBy' | 'createdAt' | 'resolvedAt' | 'resolvedBy'>): Record<string, unknown> {
  return annotation as unknown as Record<string, unknown>
}

// Helper to parse annotation from API response
export function parseAnnotationContent(
  id: string,
  fileId: string,
  content: Record<string, unknown>,
  pageNumber: number,
  createdBy: string,
  createdAt: string,
  resolvedAt: string | null,
  resolvedBy: string | null
): Annotation {
  const base: Omit<BaseAnnotation, 'type' | 'position' | 'color'> = {
    id,
    fileId,
    pageNumber,
    createdBy,
    createdAt,
    resolvedAt,
    resolvedBy,
  }

  return {
    ...base,
    ...content,
  } as Annotation
}

// Scale parsing utilities
export interface ParsedScale {
  ratio: number           // e.g., 1/48 for 1/4" = 1'-0"
  unit: 'imperial' | 'metric'
  display: string         // Original display string
}

// Parse common construction scale formats
export function parseScale(scaleString: string | null): ParsedScale | null {
  if (!scaleString) return null

  const trimmed = scaleString.trim().toUpperCase()

  // "NTS" = Not to Scale
  if (trimmed === 'NTS' || trimmed === 'N.T.S.' || trimmed === 'NOT TO SCALE') {
    return null
  }

  // Architectural Imperial: "1/4" = 1'-0"" format (fraction of inch = some feet)
  // Pattern: X/Y" = Z'-W"
  const imperialMatch = trimmed.match(/(\d+)\/(\d+)[""]?\s*=\s*(\d+)['\u2019][-\s]*(\d*)[""]?/i)
  if (imperialMatch) {
    const numerator = parseInt(imperialMatch[1])
    const denominator = parseInt(imperialMatch[2])
    const feet = parseInt(imperialMatch[3])
    const inches = imperialMatch[4] ? parseInt(imperialMatch[4]) : 0
    const totalInches = feet * 12 + inches
    const ratio = (numerator / denominator) / totalInches
    return { ratio, unit: 'imperial', display: scaleString }
  }

  // Civil/Engineering: "1" = 150'" format (1 inch = many feet)
  // Pattern: 1" = X' where X is typically 10, 20, 30, 40, 50, 60, 100, 150, 200, etc.
  const civilMatch = trimmed.match(/^1[""]?\s*=\s*(\d+)['\u2019]$/i)
  if (civilMatch) {
    const feet = parseInt(civilMatch[1])
    const totalInches = feet * 12
    // 1 inch on drawing = feet * 12 inches real
    // ratio = drawing inches / real inches = 1 / (feet * 12)
    const ratio = 1 / totalInches
    return { ratio, unit: 'imperial', display: scaleString }
  }

  // Metric: "1:100" format
  const metricMatch = trimmed.match(/1\s*:\s*(\d+)/i)
  if (metricMatch) {
    const scale = parseInt(metricMatch[1])
    return { ratio: 1 / scale, unit: 'metric', display: scaleString }
  }

  // Simple ratio: "1/4" = 1/4 scale
  const simpleMatch = trimmed.match(/(\d+)\/(\d+)/)
  if (simpleMatch) {
    const numerator = parseInt(simpleMatch[1])
    const denominator = parseInt(simpleMatch[2])
    return { ratio: numerator / denominator, unit: 'imperial', display: scaleString }
  }

  return null
}

// Calculate real-world distance from pixel distance
export function calculateRealDistance(
  pixelDistance: number,
  zoom: number,
  parsedScale: ParsedScale | null,
  pdfDPI: number = 72
): string {
  if (!parsedScale) {
    return `${Math.round(pixelDistance)}px`
  }

  // Convert pixel distance to inches on screen
  const screenInches = pixelDistance / (pdfDPI * zoom)

  // Apply scale to get real-world inches
  const realInches = screenInches / parsedScale.ratio

  if (parsedScale.unit === 'imperial') {
    // Convert to feet and inches
    const feet = Math.floor(realInches / 12)
    const inches = realInches % 12

    if (feet === 0) {
      return `${inches.toFixed(1)}"`
    } else if (inches < 0.5) {
      return `${feet}'-0"`
    } else {
      return `${feet}'-${Math.round(inches)}"`
    }
  } else {
    // Metric - convert inches to meters
    const meters = realInches * 0.0254
    if (meters < 1) {
      return `${(meters * 100).toFixed(1)} cm`
    } else {
      return `${meters.toFixed(2)} m`
    }
  }
}

// Calculate area from polygon points
export function calculateRealArea(
  points: NormalizedPoint[],
  pageWidth: number,
  pageHeight: number,
  zoom: number,
  parsedScale: ParsedScale | null,
  pdfDPI: number = 72
): string {
  if (points.length < 3) return '0 sq ft'

  // Calculate pixel area using shoelace formula
  let pixelArea = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    const x1 = points[i].x * pageWidth * zoom
    const y1 = points[i].y * pageHeight * zoom
    const x2 = points[j].x * pageWidth * zoom
    const y2 = points[j].y * pageHeight * zoom
    pixelArea += x1 * y2 - x2 * y1
  }
  pixelArea = Math.abs(pixelArea) / 2

  if (!parsedScale) {
    return `${Math.round(pixelArea)} sq px`
  }

  // Convert to real-world area
  const screenSqInches = pixelArea / Math.pow(pdfDPI * zoom, 2)
  const realSqInches = screenSqInches / Math.pow(parsedScale.ratio, 2)

  if (parsedScale.unit === 'imperial') {
    const sqFeet = realSqInches / 144
    if (sqFeet < 1) {
      return `${Math.round(realSqInches)} sq in`
    } else {
      return `${Math.round(sqFeet)} sq ft`
    }
  } else {
    const sqMeters = realSqInches * 0.00064516
    if (sqMeters < 1) {
      return `${(sqMeters * 10000).toFixed(1)} sq cm`
    } else {
      return `${sqMeters.toFixed(2)} sq m`
    }
  }
}
