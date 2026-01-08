import { useState, useCallback, useEffect } from 'react'
import type { Annotation, AnnotationType, NormalizedPoint } from '@/types/annotations'

interface UseAnnotationsOptions {
  fileId: string | null
  pageNumber?: number
  autoLoad?: boolean
}

interface UseAnnotationsResult {
  annotations: Annotation[]
  loading: boolean
  error: string | null
  // CRUD operations
  loadAnnotations: () => Promise<void>
  createAnnotation: (annotation: Partial<Annotation>) => Promise<Annotation | null>
  updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<boolean>
  deleteAnnotation: (id: string) => Promise<boolean>
  resolveAnnotation: (id: string) => Promise<boolean>
  unresolveAnnotation: (id: string) => Promise<boolean>
  // Undo/Redo
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  // Local state management
  addLocalAnnotation: (annotation: Annotation) => void
  removeLocalAnnotation: (id: string) => void
  clearLocalAnnotations: () => void
}

// History for undo/redo
interface HistoryEntry {
  annotations: Annotation[]
  action: 'add' | 'remove' | 'update'
}

export function useAnnotations({
  fileId,
  pageNumber,
  autoLoad = true
}: UseAnnotationsOptions): UseAnnotationsResult {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Undo/redo history
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Load annotations from API
  const loadAnnotations = useCallback(async () => {
    if (!fileId) {
      setAnnotations([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (pageNumber !== undefined) {
        params.set('pageNumber', String(pageNumber))
      }

      const response = await fetch(`/api/documents/${fileId}/annotations?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to load annotations')
      }

      const data = await response.json()

      // Transform API response to Annotation format
      const loadedAnnotations: Annotation[] = (data.annotations || []).map((ann: Record<string, unknown>) => ({
        id: ann.id as string,
        fileId: ann.fileId as string,
        pageNumber: ann.pageNumber as number,
        createdBy: ann.createdBy as string,
        createdAt: ann.createdAt as string,
        resolvedAt: ann.resolvedAt as string | null,
        resolvedBy: ann.resolvedBy as string | null,
        // Spread content which contains the annotation-specific data
        ...(ann.content as Record<string, unknown>),
      }))

      setAnnotations(loadedAnnotations)

      // Reset history when loading fresh data
      setHistory([])
      setHistoryIndex(-1)
    } catch (err) {
      console.error('Error loading annotations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load annotations')
    } finally {
      setLoading(false)
    }
  }, [fileId, pageNumber])

  // Auto-load on mount or when fileId changes
  useEffect(() => {
    if (autoLoad && fileId) {
      loadAnnotations()
    }
  }, [autoLoad, fileId, loadAnnotations])

  // Push to history for undo/redo
  const pushHistory = useCallback((action: HistoryEntry['action']) => {
    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push({ annotations: [...annotations], action })
      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift()
      }
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [annotations, historyIndex])

  // Create annotation
  const createAnnotation = useCallback(async (annotation: Partial<Annotation>): Promise<Annotation | null> => {
    if (!fileId) return null

    try {
      const response = await fetch(`/api/documents/${fileId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annotationType: annotation.type,
          pageNumber: annotation.pageNumber || 1,
          content: annotation,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create annotation')
      }

      const data = await response.json()
      const ann = data.annotation // API returns { annotation: ... }

      const newAnnotation: Annotation = {
        id: ann.id,
        fileId: ann.fileId,
        pageNumber: ann.pageNumber,
        createdBy: ann.createdBy,
        createdAt: ann.createdAt,
        resolvedAt: ann.resolvedAt,
        resolvedBy: ann.resolvedBy,
        ...(ann.content as Record<string, unknown>),
      } as Annotation

      pushHistory('add')
      setAnnotations(prev => [...prev, newAnnotation])

      return newAnnotation
    } catch (err) {
      console.error('Error creating annotation:', err)
      setError(err instanceof Error ? err.message : 'Failed to create annotation')
      return null
    }
  }, [fileId, pushHistory])

  // Update annotation
  const updateAnnotation = useCallback(async (id: string, updates: Partial<Annotation>): Promise<boolean> => {
    if (!fileId) return false

    try {
      const response = await fetch(`/api/documents/${fileId}/annotations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          content: updates,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update annotation')
      }

      pushHistory('update')
      setAnnotations(prev =>
        prev.map(ann => (ann.id === id ? { ...ann, ...updates } as Annotation : ann))
      )

      return true
    } catch (err) {
      console.error('Error updating annotation:', err)
      setError(err instanceof Error ? err.message : 'Failed to update annotation')
      return false
    }
  }, [fileId, pushHistory])

  // Delete annotation
  const deleteAnnotation = useCallback(async (id: string): Promise<boolean> => {
    if (!fileId) return false

    try {
      const response = await fetch(`/api/documents/${fileId}/annotations?annotationId=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete annotation')
      }

      pushHistory('remove')
      setAnnotations(prev => prev.filter(ann => ann.id !== id))

      return true
    } catch (err) {
      console.error('Error deleting annotation:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete annotation')
      return false
    }
  }, [fileId, pushHistory])

  // Resolve annotation
  const resolveAnnotation = useCallback(async (id: string): Promise<boolean> => {
    if (!fileId) return false

    try {
      const response = await fetch(`/api/documents/${fileId}/annotations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, resolve: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to resolve annotation')
      }

      const data = await response.json()

      setAnnotations(prev =>
        prev.map(ann =>
          ann.id === id
            ? { ...ann, resolvedAt: data.resolvedAt, resolvedBy: data.resolvedBy }
            : ann
        )
      )

      return true
    } catch (err) {
      console.error('Error resolving annotation:', err)
      return false
    }
  }, [fileId])

  // Unresolve annotation
  const unresolveAnnotation = useCallback(async (id: string): Promise<boolean> => {
    if (!fileId) return false

    try {
      const response = await fetch(`/api/documents/${fileId}/annotations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, resolve: false }),
      })

      if (!response.ok) {
        throw new Error('Failed to unresolve annotation')
      }

      setAnnotations(prev =>
        prev.map(ann =>
          ann.id === id
            ? { ...ann, resolvedAt: null, resolvedBy: null }
            : ann
        )
      )

      return true
    } catch (err) {
      console.error('Error unresolving annotation:', err)
      return false
    }
  }, [fileId])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex < 0) return

    const entry = history[historyIndex]
    if (entry) {
      setAnnotations(entry.annotations)
      setHistoryIndex(prev => prev - 1)
    }
  }, [history, historyIndex])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return

    const entry = history[historyIndex + 1]
    if (entry) {
      setAnnotations(entry.annotations)
      setHistoryIndex(prev => prev + 1)
    }
  }, [history, historyIndex])

  // Local state management (for optimistic updates or temporary annotations)
  const addLocalAnnotation = useCallback((annotation: Annotation) => {
    pushHistory('add')
    setAnnotations(prev => [...prev, annotation])
  }, [pushHistory])

  const removeLocalAnnotation = useCallback((id: string) => {
    pushHistory('remove')
    setAnnotations(prev => prev.filter(ann => ann.id !== id))
  }, [pushHistory])

  const clearLocalAnnotations = useCallback(() => {
    pushHistory('remove')
    setAnnotations([])
  }, [pushHistory])

  return {
    annotations,
    loading,
    error,
    loadAnnotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    resolveAnnotation,
    unresolveAnnotation,
    undo,
    redo,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
    addLocalAnnotation,
    removeLocalAnnotation,
    clearLocalAnnotations,
  }
}

// Helper hook for drawing scale calculations
export function useDrawingScale(scale: string | null) {
  const [parsedScale, setParsedScale] = useState<{
    ratio: number
    unit: 'imperial' | 'metric'
    display: string
  } | null>(null)

  useEffect(() => {
    if (!scale) {
      setParsedScale(null)
      return
    }

    const trimmed = scale.trim().toUpperCase()

    // NTS = Not to Scale
    if (trimmed === 'NTS' || trimmed === 'N.T.S.' || trimmed === 'NOT TO SCALE') {
      setParsedScale(null)
      return
    }

    // Architectural Imperial: "1/4" = 1'-0"" format (fraction of inch = some feet)
    const imperialMatch = trimmed.match(/(\d+)\/(\d+)[""]?\s*=\s*(\d+)['\u2019][-\s]*(\d*)[""]?/i)
    if (imperialMatch) {
      const numerator = parseInt(imperialMatch[1])
      const denominator = parseInt(imperialMatch[2])
      const feet = parseInt(imperialMatch[3])
      const inches = imperialMatch[4] ? parseInt(imperialMatch[4]) : 0
      const totalInches = feet * 12 + inches
      const ratio = (numerator / denominator) / totalInches
      setParsedScale({ ratio, unit: 'imperial', display: scale })
      return
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
      setParsedScale({ ratio, unit: 'imperial', display: scale })
      return
    }

    // Metric: "1:100" format
    const metricMatch = trimmed.match(/1\s*:\s*(\d+)/i)
    if (metricMatch) {
      const scaleValue = parseInt(metricMatch[1])
      setParsedScale({ ratio: 1 / scaleValue, unit: 'metric', display: scale })
      return
    }

    // Simple ratio: "1/4" = 1/4 scale
    const simpleMatch = trimmed.match(/(\d+)\/(\d+)/)
    if (simpleMatch) {
      const numerator = parseInt(simpleMatch[1])
      const denominator = parseInt(simpleMatch[2])
      setParsedScale({ ratio: numerator / denominator, unit: 'imperial', display: scale })
      return
    }

    setParsedScale(null)
  }, [scale])

  // Calculate real distance from pixel distance
  const calculateDistance = useCallback((
    pixelDistance: number,
    zoom: number,
    pdfDPI: number = 72
  ): string => {
    if (!parsedScale) {
      return `${Math.round(pixelDistance)}px`
    }

    const screenInches = pixelDistance / (pdfDPI * zoom)
    const realInches = screenInches / parsedScale.ratio

    if (parsedScale.unit === 'imperial') {
      // Ensure positive value
      const absRealInches = Math.abs(realInches)
      let feet = Math.floor(absRealInches / 12)
      let inches = absRealInches % 12

      // Handle rounding: if inches rounds to 12, add to feet
      const roundedInches = Math.round(inches)
      if (roundedInches >= 12) {
        feet += 1
        inches = 0
      }

      if (feet === 0) {
        return `${inches.toFixed(1)}"`
      } else if (roundedInches === 0 || roundedInches >= 12) {
        return `${feet}' 0"`
      } else {
        return `${feet}' ${roundedInches}"`
      }
    } else {
      const meters = realInches * 0.0254
      if (meters < 1) {
        return `${(meters * 100).toFixed(1)} cm`
      } else {
        return `${meters.toFixed(2)} m`
      }
    }
  }, [parsedScale])

  // Calculate area from polygon points
  const calculateArea = useCallback((
    points: { x: number; y: number }[],
    pageWidth: number,
    pageHeight: number,
    zoom: number,
    pdfDPI: number = 72
  ): string => {
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
  }, [parsedScale])

  return {
    parsedScale,
    hasScale: parsedScale !== null,
    calculateDistance,
    calculateArea,
  }
}
