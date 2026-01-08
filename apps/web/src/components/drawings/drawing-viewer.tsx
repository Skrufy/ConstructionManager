'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  RotateCw,
  Eye,
  EyeOff,
  MapPin,
  MessageSquare,
  Square,
  Circle,
  Cloud,
  ArrowRight,
  ArrowLeft,
  Minus,
  Hash,
  Maximize2,
  PenTool,
  Undo2,
  Redo2,
  Trash2,
  Loader2,
  Settings,
  MousePointer2,
  Target,
} from 'lucide-react'
import { PDFViewer } from '@/components/ui/pdf-viewer'
import { useAnnotations, useDrawingScale } from '@/hooks/useAnnotations'
import type { Annotation, AnnotationType, NormalizedPoint } from '@/types/annotations'

interface Drawing {
  id: string
  title: string
  drawingNumber: string | null
  revisionNumber: string | null
  subcategory: string | null
  fileUrl: string
  fileType: string
  scale: string | null
  createdAt: string
  project: {
    id: string
    name: string
    address: string | null
    status: string
  }
  uploadedByUser: {
    id: string
    name: string
  } | null
  isVerified: boolean
  isLatestRevision: boolean
  hasOcrMetadata: boolean
  annotationCount: number
}

interface DrawingViewerProps {
  drawing: Drawing
  drawings: Drawing[]  // All drawings for navigation
  viewerUrl: string
  onClose: () => void
  onNavigate: (drawing: Drawing) => void
}

// Tool definitions - SELECT is special (null type means selection mode)
const TOOLS = [
  { type: null, icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { type: 'PIN' as AnnotationType, icon: MapPin, label: 'Pin', shortcut: 'P' },
  { type: 'COMMENT' as AnnotationType, icon: MessageSquare, label: 'Comment', shortcut: 'C' },
  { type: 'RECTANGLE' as AnnotationType, icon: Square, label: 'Rectangle', shortcut: 'R' },
  { type: 'CIRCLE' as AnnotationType, icon: Circle, label: 'Circle', shortcut: 'O' },
  { type: 'CLOUD' as AnnotationType, icon: Cloud, label: 'Cloud', shortcut: 'K' },
  { type: 'ARROW' as AnnotationType, icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
  { type: 'LINE' as AnnotationType, icon: Minus, label: 'Line', shortcut: 'L' },
  { type: 'CALLOUT' as AnnotationType, icon: Hash, label: 'Callout', shortcut: 'N' },
  { type: 'MEASUREMENT' as AnnotationType, icon: Ruler, label: 'Measure', shortcut: 'M' },
  { type: 'AREA' as AnnotationType, icon: Maximize2, label: 'Area', shortcut: 'E' },
  { type: 'FREEHAND' as AnnotationType, icon: PenTool, label: 'Freehand', shortcut: 'F' },
]

// Default colors for annotations
const COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#000000', // black
]

export function DrawingViewer({
  drawing,
  drawings,
  viewerUrl,
  onClose,
  onNavigate,
}: DrawingViewerProps) {
  // Annotations
  const {
    annotations,
    loading: annotationsLoading,
    createAnnotation,
    deleteAnnotation,
    loadAnnotations,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAnnotations({ fileId: drawing.id, autoLoad: true })

  // State for clear all confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearingAnnotations, setClearingAnnotations] = useState(false)

  // Clear all annotations for this drawing
  const clearAllAnnotations = async () => {
    setClearingAnnotations(true)
    try {
      const response = await fetch(`/api/documents/${drawing.id}/annotations?clearAll=true`, {
        method: 'DELETE',
      })
      if (response.ok) {
        // Reload annotations to refresh the view
        await loadAnnotations()
      }
    } catch (error) {
      console.error('Failed to clear annotations:', error)
    } finally {
      setClearingAnnotations(false)
      setShowClearConfirm(false)
    }
  }

  // Local scale state - overrides prop when calibrated
  const [localScale, setLocalScale] = useState<string | null>(drawing.scale)

  // Scale calculations - use local scale which can be updated after calibration
  const { hasScale, calculateDistance, calculateArea } = useDrawingScale(localScale)

  // Tool state
  const [activeTool, setActiveTool] = useState<AnnotationType | null>(null)
  const [isSelectMode, setIsSelectMode] = useState(true) // Start in select mode
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [activeColor, setActiveColor] = useState(COLORS[5]) // blue default
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [showToolbar, setShowToolbar] = useState(true)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showMobileToolsMenu, setShowMobileToolsMenu] = useState(false)

  // Zoom state for PDF viewer
  const [zoom, setZoom] = useState(1.0)
  const zoomRef = useRef(1.0) // Track current zoom for wheel handler (avoids stale closure)
  const zoomAnchorRef = useRef<{ contentX: number; contentY: number; mouseX: number; mouseY: number; oldZoom: number } | null>(null)
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null) // Track last mouse position for button zoom

  // PDF canvas dimensions for syncing annotation overlay
  const [pdfDimensions, setPdfDimensions] = useState<{
    width: number
    height: number
    offsetX: number
    offsetY: number
  } | null>(null)

  // Track the draw offset for annotations (accounts for scroll position)
  // NOTE: Must be declared before handlePdfDimensions which uses setDrawOffset
  const [drawOffset, setDrawOffset] = useState({ x: 0, y: 0 })

  // Keep zoomRef in sync
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  // Handle PDF dimension updates - adjust scroll for cursor-following zoom
  // NOTE: dims.offsetX/offsetY are the centering offset + padding ONLY (no scroll)
  // Scroll is tracked separately via drawOffset to avoid sync issues
  const handlePdfDimensions = useCallback((dims: { width: number; height: number; offsetX: number; offsetY: number }) => {
    setPdfDimensions(dims)

    const scrollContainer = pdfContainerRef.current
    if (!scrollContainer) return

    // If we have a zoom anchor point, adjust scroll to keep that point under cursor
    const anchor = zoomAnchorRef.current
    if (anchor) {
      // Calculate zoom ratio
      const zoomRatio = zoom / anchor.oldZoom

      // Scale the content position by zoom ratio
      const newContentX = anchor.contentX * zoomRatio
      const newContentY = anchor.contentY * zoomRatio

      // Calculate new scroll position to keep anchor point under mouse
      const newScrollLeft = Math.max(0, newContentX - anchor.mouseX)
      const newScrollTop = Math.max(0, newContentY - anchor.mouseY)

      // Set scroll position
      scrollContainer.scrollLeft = newScrollLeft
      scrollContainer.scrollTop = newScrollTop

      // IMPORTANT: Update drawOffset immediately to match the scroll we just set
      // This prevents annotation canvas from being mispositioned between
      // the scroll change and the scroll event firing
      setDrawOffset({ x: newScrollLeft, y: newScrollTop })

      // Clear anchor after use
      zoomAnchorRef.current = null
    } else {
      // No zoom anchor (e.g., button zoom) - sync drawOffset with current scroll
      // This ensures canvas stays aligned when content size changes
      setDrawOffset({ x: scrollContainer.scrollLeft, y: scrollContainer.scrollTop })
    }
  }, [zoom])

  // Helper function to set zoom anchor from last mouse position (for button zoom)
  const setZoomAnchorFromMouse = useCallback(() => {
    const scrollContainer = pdfContainerRef.current
    const mousePos = lastMousePosRef.current

    if (!scrollContainer || !mousePos) {
      // No mouse position tracked - zoom to center
      return
    }

    const rect = scrollContainer.getBoundingClientRect()
    const mouseX = mousePos.x - rect.left
    const mouseY = mousePos.y - rect.top

    // Calculate content position under cursor BEFORE zoom
    const currentZoom = zoomRef.current
    const contentX = (mouseX + scrollContainer.scrollLeft) / currentZoom
    const contentY = (mouseY + scrollContainer.scrollTop) / currentZoom

    // Store anchor point for scroll adjustment
    zoomAnchorRef.current = {
      contentX,
      contentY,
      mouseX,
      mouseY,
      oldZoom: currentZoom
    }
  }, [])

  // Toolbar drag state
  const [toolbarPosition, setToolbarPosition] = useState({ x: 16, y: 16 })
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false)
  const toolbarDragStart = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Measurement state
  const [measureStart, setMeasureStart] = useState<NormalizedPoint | null>(null)
  const [measureEnd, setMeasureEnd] = useState<NormalizedPoint | null>(null)
  const [measureDistance, setMeasureDistance] = useState<string | null>(null)

  // Calibration state
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationStart, setCalibrationStart] = useState<NormalizedPoint | null>(null)
  const [calibrationEnd, setCalibrationEnd] = useState<NormalizedPoint | null>(null)
  const [calibrationPreview, setCalibrationPreview] = useState<NormalizedPoint | null>(null) // For mouse move preview
  const [showCalibrationModal, setShowCalibrationModal] = useState(false)
  const [calibrationPixelDist, setCalibrationPixelDist] = useState(0)
  const [calibrationFeet, setCalibrationFeet] = useState('')
  const [calibrationInches, setCalibrationInches] = useState('')
  const [savingCalibration, setSavingCalibration] = useState(false)

  // Pan state for dragging the view
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
  const pdfContainerRef = useRef<HTMLDivElement | null>(null)

  // Drawing state for shapes
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<NormalizedPoint | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<NormalizedPoint | null>(null)
  const [drawPoints, setDrawPoints] = useState<NormalizedPoint[]>([])
  const [currentPath, setCurrentPath] = useState<NormalizedPoint[]>([])

  // Canvas ref for annotations overlay
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Current drawing index for navigation
  const currentIndex = drawings.findIndex(d => d.id === drawing.id)
  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < drawings.length - 1

  const navigatePrev = () => {
    if (canGoPrev) {
      onNavigate(drawings[currentIndex - 1])
    }
  }

  const navigateNext = () => {
    if (canGoNext) {
      onNavigate(drawings[currentIndex + 1])
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Navigation
      if (e.key === 'Escape') {
        if (selectedAnnotationId) {
          setSelectedAnnotationId(null)
        } else if (activeTool) {
          setActiveTool(null)
        } else {
          onClose()
        }
      }
      if (e.key === 'ArrowLeft') navigatePrev()
      if (e.key === 'ArrowRight') navigateNext()

      // Delete selected annotation
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId) {
        deleteAnnotation(selectedAnnotationId)
        setSelectedAnnotationId(null)
      }

      // Tools
      const toolKey = e.key.toUpperCase()
      const tool = TOOLS.find(t => t.shortcut === toolKey)
      if (tool) {
        if (tool.type === null) {
          // Select tool - deselect any active tool
          setActiveTool(null)
        } else {
          setActiveTool(prev => prev === tool.type ? null : tool.type)
        }
        return // Don't also toggle annotations when V is pressed
      }

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }

      // Toggle annotations visibility (use Shift+V to avoid conflict with Select tool)
      if ((e.shiftKey && (e.key === 'v' || e.key === 'V')) || e.key === 'H') {
        setShowAnnotations(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, canGoPrev, canGoNext, onClose, undo, redo, selectedAnnotationId, deleteAnnotation])

  // Find and store reference to PDF viewer's scrollable container for panning
  // Also track scroll position for annotation offset
  useEffect(() => {
    if (containerRef.current) {
      // The PDF viewer's scrollable container has overflow-auto class
      const scrollableContainer = containerRef.current.querySelector('.overflow-auto') as HTMLDivElement
      if (scrollableContainer) {
        pdfContainerRef.current = scrollableContainer

        // Track scroll position to offset annotation drawing
        const handleScroll = () => {
          setDrawOffset({
            x: scrollableContainer.scrollLeft,
            y: scrollableContainer.scrollTop,
          })
        }

        handleScroll() // Set initial
        scrollableContainer.addEventListener('scroll', handleScroll)
        return () => scrollableContainer.removeEventListener('scroll', handleScroll)
      }
    }
  }, [pdfDimensions]) // Re-run when PDF dimensions change (PDF is loaded)

  // Prevent scroll wheel from scrolling the page - zoom instead
  // Uses requestAnimationFrame throttling for smooth 60fps updates
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let pendingZoom: number | null = null
    let rafId: number | null = null

    const applyZoom = () => {
      if (pendingZoom !== null) {
        setZoom(pendingZoom)
        pendingZoom = null
      }
      rafId = null
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const scrollContainer = pdfContainerRef.current
      if (!scrollContainer) return

      // Get mouse position relative to scroll container viewport
      const rect = scrollContainer.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Calculate content position under cursor BEFORE zoom
      const contentX = scrollContainer.scrollLeft + mouseX
      const contentY = scrollContainer.scrollTop + mouseY

      // Calculate new zoom (2% per tick for smooth feel)
      const currentZoom = pendingZoom ?? zoomRef.current
      const zoomFactor = e.deltaY > 0 ? 0.98 : 1.02
      let newZoom = currentZoom * zoomFactor

      // Clamp zoom range
      newZoom = Math.max(0.25, Math.min(5, newZoom))

      // Store anchor point for scroll adjustment after PDF re-renders
      zoomAnchorRef.current = {
        contentX,
        contentY,
        mouseX,
        mouseY,
        oldZoom: zoomRef.current
      }

      // Queue zoom update via requestAnimationFrame for smooth 60fps
      pendingZoom = newZoom
      if (!rafId) {
        rafId = requestAnimationFrame(applyZoom)
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, []) // No dependencies - uses refs for current values

  // Toolbar drag handlers
  const handleToolbarMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag on the toolbar border/background, not on buttons
    if ((e.target as HTMLElement).closest('button')) return

    e.preventDefault()
    setIsDraggingToolbar(true)
    toolbarDragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: toolbarPosition.x,
      posY: toolbarPosition.y,
    }
  }, [toolbarPosition])

  useEffect(() => {
    if (!isDraggingToolbar) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!toolbarDragStart.current) return

      const dx = e.clientX - toolbarDragStart.current.x
      const dy = e.clientY - toolbarDragStart.current.y

      // Keep toolbar within viewport bounds
      const maxX = window.innerWidth - (toolbarRef.current?.offsetWidth || 200)
      const maxY = window.innerHeight - (toolbarRef.current?.offsetHeight || 400)

      setToolbarPosition({
        x: Math.max(0, Math.min(toolbarDragStart.current.posX + dx, maxX)),
        y: Math.max(0, Math.min(toolbarDragStart.current.posY + dy, maxY)),
      })
    }

    const handleMouseUp = () => {
      setIsDraggingToolbar(false)
      toolbarDragStart.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingToolbar])

  // Update canvas size when PDF dimensions change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pdfDimensions) return

    // Set canvas internal resolution to match PDF
    if (canvas.width !== pdfDimensions.width || canvas.height !== pdfDimensions.height) {
      canvas.width = pdfDimensions.width
      canvas.height = pdfDimensions.height
    }
  }, [pdfDimensions])

  // Render annotations on canvas
  useEffect(() => {
    if (!canvasRef.current || !showAnnotations || !pdfDimensions) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Ensure canvas size matches PDF dimensions
    if (canvas.width !== pdfDimensions.width) canvas.width = pdfDimensions.width
    if (canvas.height !== pdfDimensions.height) canvas.height = pdfDimensions.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw each annotation
    annotations.forEach(annotation => {
      const isSelected = annotation.id === selectedAnnotationId
      drawAnnotation(ctx, annotation, canvas.width, canvas.height, isSelected)
    })

    // Draw current measurement line if measuring
    if (activeTool === 'MEASUREMENT' && measureStart && measureEnd) {
      const x1 = measureStart.x * canvas.width
      const y1 = measureStart.y * canvas.height
      const x2 = measureEnd.x * canvas.width
      const y2 = measureEnd.y * canvas.height

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = activeColor
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.stroke()
      ctx.setLineDash([])

      // Draw end points
      ctx.fillStyle = activeColor
      ctx.beginPath()
      ctx.arc(x1, y1, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x2, y2, 5, 0, Math.PI * 2)
      ctx.fill()

      // Draw distance label
      if (measureDistance) {
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        ctx.font = 'bold 14px sans-serif'
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 3
        ctx.strokeText(measureDistance, midX + 10, midY - 10)
        ctx.fillText(measureDistance, midX + 10, midY - 10)
      }
    }

    // Draw current shape preview while dragging
    if (isDrawing && drawStart && measureEnd) {
      const x1 = drawStart.x * canvas.width
      const y1 = drawStart.y * canvas.height
      const x2 = measureEnd.x * canvas.width
      const y2 = measureEnd.y * canvas.height

      ctx.strokeStyle = activeColor
      ctx.fillStyle = activeColor + '33' // 20% opacity for fill
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])

      switch (activeTool) {
        case 'RECTANGLE': {
          const w = x2 - x1
          const h = y2 - y1
          ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(w), Math.abs(h))
          break
        }

        case 'CIRCLE': {
          const rx = Math.abs(x2 - x1) / 2
          const ry = Math.abs(y2 - y1) / 2
          const cx = Math.min(x1, x2) + rx
          const cy = Math.min(y1, y2) + ry
          ctx.beginPath()
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
          ctx.stroke()
          break
        }

        case 'CLOUD': {
          const w = Math.abs(x2 - x1)
          const h = Math.abs(y2 - y1)
          const left = Math.min(x1, x2)
          const top = Math.min(y1, y2)
          ctx.strokeRect(left, top, w, h) // Simplified preview
          break
        }

        case 'LINE':
        case 'ARROW': {
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()

          if (activeTool === 'ARROW') {
            const angle = Math.atan2(y2 - y1, x2 - x1)
            const headLength = 15
            ctx.beginPath()
            ctx.moveTo(x2, y2)
            ctx.lineTo(
              x2 - headLength * Math.cos(angle - Math.PI / 6),
              y2 - headLength * Math.sin(angle - Math.PI / 6)
            )
            ctx.moveTo(x2, y2)
            ctx.lineTo(
              x2 - headLength * Math.cos(angle + Math.PI / 6),
              y2 - headLength * Math.sin(angle + Math.PI / 6)
            )
            ctx.stroke()
          }
          break
        }

        case 'CALLOUT': {
          // Circle at start point
          ctx.beginPath()
          ctx.arc(x1, y1, 14, 0, Math.PI * 2)
          ctx.stroke()
          // Leader line
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
          break
        }

        case 'AREA': {
          const w = x2 - x1
          const h = y2 - y1
          ctx.beginPath()
          ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(w), Math.abs(h))
          ctx.fill()
          ctx.stroke()
          break
        }
      }

      ctx.setLineDash([])
    }

    // Draw freehand path preview
    if (isDrawing && activeTool === 'FREEHAND' && currentPath.length > 1) {
      ctx.strokeStyle = activeColor
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.setLineDash([])

      ctx.beginPath()
      ctx.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height)
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x * canvas.width, currentPath[i].y * canvas.height)
      }
      ctx.stroke()
    }

    // Draw calibration line preview
    if (isCalibrating && calibrationStart) {
      // Use calibrationEnd if set (final), otherwise use preview (live mouse position)
      const endPoint = calibrationEnd || calibrationPreview
      const x1 = calibrationStart.x * canvas.width
      const y1 = calibrationStart.y * canvas.height
      const x2 = endPoint ? endPoint.x * canvas.width : x1
      const y2 = endPoint ? endPoint.y * canvas.height : y1

      // Draw the calibration line
      ctx.strokeStyle = '#10B981' // green
      ctx.lineWidth = 3
      ctx.setLineDash([8, 4])
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw end points
      ctx.fillStyle = '#10B981'
      ctx.beginPath()
      ctx.arc(x1, y1, 8, 0, Math.PI * 2)
      ctx.fill()
      if (endPoint) {
        ctx.beginPath()
        ctx.arc(x2, y2, 8, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw pixel distance label
      if (endPoint) {
        const pixelDist = Math.hypot(x2 - x1, y2 - y1)
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        ctx.font = 'bold 14px sans-serif'
        ctx.fillStyle = '#10B981'
        ctx.textAlign = 'center'
        ctx.fillText(`${Math.round(pixelDist)}px`, midX, midY - 15)
      }
    }
  }, [annotations, showAnnotations, measureStart, measureEnd, measureDistance, activeTool, activeColor, isDrawing, drawStart, selectedAnnotationId, currentPath, pdfDimensions, isCalibrating, calibrationStart, calibrationEnd, calibrationPreview])

  // Draw a single annotation
  function drawAnnotation(
    ctx: CanvasRenderingContext2D,
    annotation: Annotation,
    width: number,
    height: number,
    isSelected: boolean = false
  ) {
    const color = annotation.color || activeColor

    // Draw selection indicator if selected
    if (isSelected) {
      ctx.save()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])

      // Draw selection box around annotation
      const selectionPadding = 8

      switch (annotation.type) {
        case 'PIN':
        case 'COMMENT':
        case 'CALLOUT': {
          const x = annotation.position.x * width
          const y = annotation.position.y * height
          ctx.beginPath()
          ctx.arc(x, y - 10, 20, 0, Math.PI * 2)
          ctx.stroke()
          break
        }
        case 'RECTANGLE':
        case 'CIRCLE':
        case 'CLOUD': {
          const annData = annotation as Annotation & { width: number; height: number }
          const x = annotation.position.x * width - selectionPadding
          const y = annotation.position.y * height - selectionPadding
          const w = (annData.width || 0.1) * width + selectionPadding * 2
          const h = (annData.height || 0.1) * height + selectionPadding * 2
          ctx.strokeRect(x, y, w, h)
          break
        }
        case 'ARROW':
        case 'LINE':
        case 'MEASUREMENT': {
          const annData = annotation as Annotation & { endPoint: NormalizedPoint }
          if (annData.endPoint) {
            const x1 = annotation.position.x * width
            const y1 = annotation.position.y * height
            const x2 = annData.endPoint.x * width
            const y2 = annData.endPoint.y * height
            const minX = Math.min(x1, x2) - selectionPadding
            const maxX = Math.max(x1, x2) + selectionPadding
            const minY = Math.min(y1, y2) - selectionPadding
            const maxY = Math.max(y1, y2) + selectionPadding
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
          }
          break
        }
        default: {
          // Generic selection box for other types
          const x = annotation.position.x * width - 15
          const y = annotation.position.y * height - 15
          ctx.strokeRect(x, y, 30, 30)
        }
      }
      ctx.restore()
    }

    switch (annotation.type) {
      case 'PIN': {
        const x = annotation.position.x * width
        const y = annotation.position.y * height

        // Draw pin icon
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y - 12, 10, 0, Math.PI * 2)
        ctx.fill()

        // Pin point
        ctx.beginPath()
        ctx.moveTo(x - 6, y - 6)
        ctx.lineTo(x, y)
        ctx.lineTo(x + 6, y - 6)
        ctx.fill()

        // Inner circle
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(x, y - 12, 4, 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'COMMENT': {
        const x = annotation.position.x * width
        const y = annotation.position.y * height

        // Comment bubble
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(x, y, 24, 20, 4)
        ctx.fill()

        // Bubble tail
        ctx.beginPath()
        ctx.moveTo(x + 4, y + 20)
        ctx.lineTo(x, y + 28)
        ctx.lineTo(x + 10, y + 20)
        ctx.fill()

        // Icon
        ctx.fillStyle = 'white'
        ctx.fillRect(x + 6, y + 6, 12, 2)
        ctx.fillRect(x + 6, y + 10, 8, 2)
        break
      }

      case 'RECTANGLE': {
        const ann = annotation as Annotation & { width: number; height: number }
        const x = annotation.position.x * width
        const y = annotation.position.y * height
        const w = (ann.width || 0.1) * width
        const h = (ann.height || 0.1) * height

        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, w, h)
        break
      }

      case 'CIRCLE': {
        const ann = annotation as Annotation & { width: number; height: number }
        const x = annotation.position.x * width
        const y = annotation.position.y * height
        const rx = ((ann.width || 0.1) * width) / 2
        const ry = ((ann.height || 0.1) * height) / 2

        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(x + rx, y + ry, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
        break
      }

      case 'CLOUD': {
        const ann = annotation as Annotation & { width: number; height: number }
        const x = annotation.position.x * width
        const y = annotation.position.y * height
        const w = (ann.width || 0.1) * width
        const h = (ann.height || 0.1) * height

        // Draw cloud shape (bumpy rectangle)
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()

        const bumps = 8
        const bumpRadius = Math.min(w, h) / (bumps / 2)

        // Top edge
        for (let i = 0; i < bumps / 2; i++) {
          const bx = x + (w / (bumps / 2)) * i + bumpRadius
          ctx.arc(bx, y, bumpRadius, Math.PI, 0, false)
        }

        // Right edge
        for (let i = 0; i < bumps / 4; i++) {
          const by = y + (h / (bumps / 4)) * i + bumpRadius
          ctx.arc(x + w, by, bumpRadius, -Math.PI / 2, Math.PI / 2, false)
        }

        // Bottom edge
        for (let i = bumps / 2 - 1; i >= 0; i--) {
          const bx = x + (w / (bumps / 2)) * i + bumpRadius
          ctx.arc(bx, y + h, bumpRadius, 0, Math.PI, false)
        }

        // Left edge
        for (let i = bumps / 4 - 1; i >= 0; i--) {
          const by = y + (h / (bumps / 4)) * i + bumpRadius
          ctx.arc(x, by, bumpRadius, Math.PI / 2, -Math.PI / 2, false)
        }

        ctx.stroke()
        break
      }

      case 'ARROW':
      case 'LINE': {
        const ann = annotation as Annotation & { endPoint: NormalizedPoint; strokeWidth?: number }
        if (!ann.endPoint) break

        const x1 = annotation.position.x * width
        const y1 = annotation.position.y * height
        const x2 = ann.endPoint.x * width
        const y2 = ann.endPoint.y * height

        ctx.strokeStyle = color
        ctx.lineWidth = ann.strokeWidth || 2
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()

        // Draw arrowhead for ARROW type
        if (annotation.type === 'ARROW') {
          const angle = Math.atan2(y2 - y1, x2 - x1)
          const headLength = 15

          ctx.beginPath()
          ctx.moveTo(x2, y2)
          ctx.lineTo(
            x2 - headLength * Math.cos(angle - Math.PI / 6),
            y2 - headLength * Math.sin(angle - Math.PI / 6)
          )
          ctx.moveTo(x2, y2)
          ctx.lineTo(
            x2 - headLength * Math.cos(angle + Math.PI / 6),
            y2 - headLength * Math.sin(angle + Math.PI / 6)
          )
          ctx.stroke()
        }
        break
      }

      case 'CALLOUT': {
        const ann = annotation as Annotation & { number: number; leaderEndPoint?: NormalizedPoint }
        const x = annotation.position.x * width
        const y = annotation.position.y * height

        // Draw circle with number
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.fill()

        // Number
        ctx.fillStyle = 'white'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(ann.number || 1), x, y)

        // Leader line
        if (ann.leaderEndPoint) {
          const lx = ann.leaderEndPoint.x * width
          const ly = ann.leaderEndPoint.y * height

          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(lx, ly)
          ctx.stroke()
        }
        break
      }

      case 'MEASUREMENT': {
        const ann = annotation as Annotation & { endPoint: NormalizedPoint; displayValue?: string }
        if (!ann.endPoint) break

        const x1 = annotation.position.x * width
        const y1 = annotation.position.y * height
        const x2 = ann.endPoint.x * width
        const y2 = ann.endPoint.y * height

        // Line
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()

        // End markers
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const perpAngle = angle + Math.PI / 2
        const markerLength = 10

        // Start marker
        ctx.beginPath()
        ctx.moveTo(x1 - markerLength * Math.cos(perpAngle), y1 - markerLength * Math.sin(perpAngle))
        ctx.lineTo(x1 + markerLength * Math.cos(perpAngle), y1 + markerLength * Math.sin(perpAngle))
        ctx.stroke()

        // End marker
        ctx.beginPath()
        ctx.moveTo(x2 - markerLength * Math.cos(perpAngle), y2 - markerLength * Math.sin(perpAngle))
        ctx.lineTo(x2 + markerLength * Math.cos(perpAngle), y2 + markerLength * Math.sin(perpAngle))
        ctx.stroke()

        // Distance label
        if (ann.displayValue) {
          const midX = (x1 + x2) / 2
          const midY = (y1 + y2) / 2

          ctx.font = 'bold 12px sans-serif'
          const textWidth = ctx.measureText(ann.displayValue).width

          // Background
          ctx.fillStyle = 'white'
          ctx.fillRect(midX - textWidth / 2 - 4, midY - 10, textWidth + 8, 20)
          ctx.strokeStyle = color
          ctx.strokeRect(midX - textWidth / 2 - 4, midY - 10, textWidth + 8, 20)

          // Text
          ctx.fillStyle = color
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(ann.displayValue, midX, midY)
        }
        break
      }

      case 'FREEHAND': {
        const ann = annotation as Annotation & { path: NormalizedPoint[]; strokeWidth?: number }
        if (!ann.path || ann.path.length < 2) break

        ctx.strokeStyle = color
        ctx.lineWidth = ann.strokeWidth || 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()
        ctx.moveTo(ann.path[0].x * width, ann.path[0].y * height)
        for (let i = 1; i < ann.path.length; i++) {
          ctx.lineTo(ann.path[i].x * width, ann.path[i].y * height)
        }
        ctx.stroke()
        break
      }

      case 'AREA': {
        const ann = annotation as Annotation & { points: NormalizedPoint[]; displayArea?: string }
        if (!ann.points || ann.points.length < 3) break

        ctx.strokeStyle = color
        ctx.fillStyle = color + '33' // 20% opacity
        ctx.lineWidth = 2

        ctx.beginPath()
        ctx.moveTo(ann.points[0].x * width, ann.points[0].y * height)
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x * width, ann.points[i].y * height)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Area label at centroid
        if (ann.displayArea) {
          const centroidX = ann.points.reduce((sum, p) => sum + p.x, 0) / ann.points.length * width
          const centroidY = ann.points.reduce((sum, p) => sum + p.y, 0) / ann.points.length * height

          ctx.font = 'bold 12px sans-serif'
          const textWidth = ctx.measureText(ann.displayArea).width

          ctx.fillStyle = 'white'
          ctx.fillRect(centroidX - textWidth / 2 - 4, centroidY - 10, textWidth + 8, 20)
          ctx.strokeStyle = color
          ctx.strokeRect(centroidX - textWidth / 2 - 4, centroidY - 10, textWidth + 8, 20)

          ctx.fillStyle = color
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(ann.displayArea, centroidX, centroidY)
        }
        break
      }
    }
  }

  // Find annotation at a given position (normalized coordinates)
  const findAnnotationAtPosition = useCallback((x: number, y: number): Annotation | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const hitRadius = 20 / canvas.width // 20px hit radius normalized

    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i]
      const pos = ann.position

      switch (ann.type) {
        case 'PIN':
        case 'COMMENT':
        case 'CALLOUT': {
          // Point-based annotations - check distance
          const dx = x - pos.x
          const dy = y - pos.y
          if (Math.hypot(dx, dy) < hitRadius * 2) {
            return ann
          }
          break
        }

        case 'RECTANGLE':
        case 'CIRCLE':
        case 'CLOUD': {
          // Area-based annotations - check if inside bounds
          const annWidth = (ann as Annotation & { width: number }).width || 0.1
          const annHeight = (ann as Annotation & { height: number }).height || 0.1
          if (x >= pos.x && x <= pos.x + annWidth && y >= pos.y && y <= pos.y + annHeight) {
            return ann
          }
          break
        }

        case 'ARROW':
        case 'LINE':
        case 'MEASUREMENT': {
          // Line-based annotations - check distance to line segment
          const endPoint = (ann as Annotation & { endPoint: NormalizedPoint }).endPoint
          if (endPoint) {
            const dist = distanceToLineSegment(x, y, pos.x, pos.y, endPoint.x, endPoint.y)
            if (dist < hitRadius) {
              return ann
            }
          }
          break
        }

        case 'FREEHAND': {
          // Check distance to any point in path
          const path = (ann as Annotation & { path: NormalizedPoint[] }).path
          if (path) {
            for (const pt of path) {
              if (Math.hypot(x - pt.x, y - pt.y) < hitRadius) {
                return ann
              }
            }
          }
          break
        }

        case 'AREA': {
          // Check if point is inside polygon
          const points = (ann as Annotation & { points: NormalizedPoint[] }).points
          if (points && isPointInPolygon(x, y, points)) {
            return ann
          }
          break
        }
      }
    }
    return null
  }, [annotations])

  // Helper: distance from point to line segment
  function distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    const lengthSquared = dx * dx + dy * dy

    if (lengthSquared === 0) {
      return Math.hypot(px - x1, py - y1)
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared
    t = Math.max(0, Math.min(1, t))

    const projX = x1 + t * dx
    const projY = y1 + t * dy

    return Math.hypot(px - projX, py - projY)
  }

  // Helper: point in polygon test
  function isPointInPolygon(x: number, y: number, polygon: NormalizedPoint[]): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y
      const xj = polygon[j].x, yj = polygon[j].y

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    return inside
  }

  // Handle canvas clicks for annotations
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    const position: NormalizedPoint = { x, y }

    // CALIBRATION MODE: Handle calibration clicks
    if (isCalibrating) {
      if (!calibrationStart) {
        setCalibrationStart(position)
      } else if (!calibrationEnd) {
        setCalibrationEnd(position)
        // Calculate pixel distance using pdfDimensions for consistency
        // pdfDimensions.width = baseViewport.width * zoom, so this gives us
        // the distance in current display pixels which we then convert
        const canvasWidth = pdfDimensions?.width || 800
        const canvasHeight = pdfDimensions?.height || 600
        const pixelDist = Math.hypot(
          (position.x - calibrationStart.x) * canvasWidth,
          (position.y - calibrationStart.y) * canvasHeight
        )
        setCalibrationPixelDist(pixelDist)
        // Pre-fill with existing scale if available
        if (localScale && hasScale) {
          // Parse existing scale to suggest values
          const match = localScale.match(/(\d+)['\u2019][-\s]*(\d*)[""]?/)
          if (match) {
            setCalibrationFeet(match[1] || '')
            setCalibrationInches(match[2] || '0')
          }
        }
        setShowCalibrationModal(true)
      }
      return
    }

    // SELECT MODE: When no tool is active, try to select an annotation
    if (activeTool === null) {
      const clickedAnnotation = findAnnotationAtPosition(x, y)
      if (clickedAnnotation) {
        setSelectedAnnotationId(clickedAnnotation.id)
      } else {
        setSelectedAnnotationId(null)
      }
      return
    }

    // Handle different tools
    switch (activeTool) {
      case 'PIN':
      case 'COMMENT':
        createAnnotation({
          type: activeTool,
          position,
          pageNumber: 1,
          color: activeColor,
        })
        break

      case 'MEASUREMENT':
        if (!measureStart) {
          setMeasureStart(position)
        } else {
          // Calculate distance using pdfDimensions for consistency
          const canvasWidth = pdfDimensions?.width || 800
          const canvasHeight = pdfDimensions?.height || 600
          const pixelDist = Math.hypot(
            (position.x - measureStart.x) * canvasWidth,
            (position.y - measureStart.y) * canvasHeight
          )
          const displayValue = calculateDistance(pixelDist, zoom, 72)

          createAnnotation({
            type: 'MEASUREMENT',
            position: measureStart,
            pageNumber: 1,
            color: activeColor,
            endPoint: position,
            displayValue,
            rawPixelDistance: pixelDist,
          } as Partial<Annotation>)

          setMeasureStart(null)
          setMeasureEnd(null)
          setMeasureDistance(null)
        }
        break
    }
  }

  // Helper to finalize a measurement (used by both mouse and touch handlers)
  const finalizeMeasurement = (position: NormalizedPoint) => {
    if (!measureStart) return

    // Calculate distance using pdfDimensions for consistency
    const canvasWidth = pdfDimensions?.width || 800
    const canvasHeight = pdfDimensions?.height || 600
    const pixelDist = Math.hypot(
      (position.x - measureStart.x) * canvasWidth,
      (position.y - measureStart.y) * canvasHeight
    )
    const displayValue = calculateDistance(pixelDist, zoom, 72)

    createAnnotation({
      type: 'MEASUREMENT',
      position: measureStart,
      pageNumber: 1,
      color: activeColor,
      endPoint: position,
      displayValue,
      rawPixelDistance: pixelDist,
    } as Partial<Annotation>)

    setMeasureStart(null)
    setMeasureEnd(null)
    setMeasureDistance(null)
  }

  // Helper to finalize shape annotations (used by touch end handler)
  const finalizeAnnotation = () => {
    if (!drawStart || !drawCurrent || !activeTool) return

    const endPoint = drawCurrent

    switch (activeTool) {
      case 'RECTANGLE':
      case 'CIRCLE':
      case 'CLOUD': {
        const width = Math.abs(endPoint.x - drawStart.x)
        const height = Math.abs(endPoint.y - drawStart.y)
        const position = {
          x: Math.min(drawStart.x, endPoint.x),
          y: Math.min(drawStart.y, endPoint.y),
        }

        if (width > 0.01 || height > 0.01) {
          createAnnotation({
            type: activeTool,
            position,
            pageNumber: 1,
            color: activeColor,
            width,
            height,
          } as Partial<Annotation>)
        }
        break
      }

      case 'LINE':
      case 'ARROW': {
        const dist = Math.hypot(endPoint.x - drawStart.x, endPoint.y - drawStart.y)
        if (dist > 0.01) {
          createAnnotation({
            type: activeTool,
            position: drawStart,
            pageNumber: 1,
            color: activeColor,
            endPoint,
          } as Partial<Annotation>)
        }
        break
      }

      case 'CALLOUT': {
        const nextNumber = annotations.filter(a => a.type === 'CALLOUT').length + 1
        createAnnotation({
          type: 'CALLOUT',
          position: drawStart,
          pageNumber: 1,
          color: activeColor,
          number: nextNumber,
          leaderEndPoint: endPoint,
        } as Partial<Annotation>)
        break
      }

      case 'FREEHAND': {
        if (drawPoints.length > 2) {
          createAnnotation({
            type: 'FREEHAND',
            position: drawPoints[0],
            pageNumber: 1,
            color: activeColor,
            path: drawPoints,
          } as Partial<Annotation>)
        }
        break
      }

      case 'AREA': {
        const width = Math.abs(endPoint.x - drawStart.x)
        const height = Math.abs(endPoint.y - drawStart.y)
        const topLeft = {
          x: Math.min(drawStart.x, endPoint.x),
          y: Math.min(drawStart.y, endPoint.y),
        }

        if (width > 0.01 && height > 0.01) {
          const points: NormalizedPoint[] = [
            topLeft,
            { x: topLeft.x + width, y: topLeft.y },
            { x: topLeft.x + width, y: topLeft.y + height },
            { x: topLeft.x, y: topLeft.y + height },
          ]

          const canvasWidth = pdfDimensions?.width || 800
          const canvasHeight = pdfDimensions?.height || 600
          const displayArea = calculateArea(points, canvasWidth, canvasHeight, 1, 72)

          createAnnotation({
            type: 'AREA',
            position: topLeft,
            pageNumber: 1,
            color: activeColor,
            points,
            displayArea,
          } as Partial<Annotation>)
        }
        break
      }
    }

    // Reset drawing state
    setIsDrawing(false)
    setDrawStart(null)
    setDrawCurrent(null)
    setDrawPoints([])
  }

  // Handle mouse move for measurement preview, shape drawing, and panning
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    // Handle panning
    if (isPanning && panStartRef.current && pdfContainerRef.current) {
      e.preventDefault()
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      pdfContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx
      pdfContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy
      return
    }

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    // Calibration preview (when first point is placed, before 2nd click)
    if (isCalibrating && calibrationStart && !calibrationEnd) {
      setCalibrationPreview({ x, y })
    }

    // Measurement tool preview
    if (activeTool === 'MEASUREMENT' && measureStart) {
      setMeasureEnd({ x, y })

      // Calculate distance
      const pixelDist = Math.hypot(
        (x - measureStart.x) * rect.width,
        (y - measureStart.y) * rect.height
      )
      setMeasureDistance(calculateDistance(pixelDist, zoom, 72))
    }

    // Shape drawing preview (when dragging)
    if (isDrawing && drawStart) {
      if (activeTool === 'FREEHAND') {
        setCurrentPath(prev => [...prev, { x, y }])
      } else {
        setMeasureEnd({ x, y }) // Reuse measureEnd for shape preview endpoint
      }
    }
  }

  // Handle mouse down for starting shape drawing or panning
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    // In select mode (no tool active, not calibrating), start panning
    if (!activeTool && !isCalibrating) {
      e.preventDefault()
      setIsPanning(true)
      const scrollContainer = pdfContainerRef.current
      if (scrollContainer) {
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: scrollContainer.scrollLeft,
          scrollTop: scrollContainer.scrollTop,
        }
      }
      return
    }

    if (!activeTool) return

    // Skip for tools that don't use drag (PIN, COMMENT use click)
    if (activeTool === 'PIN' || activeTool === 'COMMENT' || activeTool === 'MEASUREMENT') return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    setIsDrawing(true)
    setDrawStart({ x, y })

    if (activeTool === 'FREEHAND') {
      setCurrentPath([{ x, y }])
    } else {
      setMeasureEnd({ x, y }) // Start point = end point initially
    }
  }

  // Handle mouse up for completing shape drawing or panning
  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Stop panning
    if (isPanning) {
      setIsPanning(false)
      panStartRef.current = null
      return
    }

    if (!canvasRef.current || !isDrawing || !drawStart) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    const endPoint: NormalizedPoint = { x, y }

    // Create the annotation based on the tool type
    switch (activeTool) {
      case 'RECTANGLE':
      case 'CIRCLE':
      case 'CLOUD': {
        const width = Math.abs(endPoint.x - drawStart.x)
        const height = Math.abs(endPoint.y - drawStart.y)
        const position = {
          x: Math.min(drawStart.x, endPoint.x),
          y: Math.min(drawStart.y, endPoint.y),
        }

        if (width > 0.01 || height > 0.01) { // Minimum size threshold
          createAnnotation({
            type: activeTool,
            position,
            pageNumber: 1,
            color: activeColor,
            width,
            height,
          } as Partial<Annotation>)
        }
        break
      }

      case 'LINE':
      case 'ARROW': {
        const dist = Math.hypot(endPoint.x - drawStart.x, endPoint.y - drawStart.y)
        if (dist > 0.01) { // Minimum length threshold
          createAnnotation({
            type: activeTool,
            position: drawStart,
            pageNumber: 1,
            color: activeColor,
            endPoint,
          } as Partial<Annotation>)
        }
        break
      }

      case 'CALLOUT': {
        // Callout: circle at start, leader line to end
        const nextNumber = annotations.filter(a => a.type === 'CALLOUT').length + 1
        createAnnotation({
          type: 'CALLOUT',
          position: drawStart,
          pageNumber: 1,
          color: activeColor,
          number: nextNumber,
          leaderEndPoint: endPoint,
        } as Partial<Annotation>)
        break
      }

      case 'FREEHAND': {
        if (currentPath.length > 2) {
          createAnnotation({
            type: 'FREEHAND',
            position: currentPath[0],
            pageNumber: 1,
            color: activeColor,
            path: currentPath,
          } as Partial<Annotation>)
        }
        break
      }

      case 'AREA': {
        // For now, create a simple rectangular area
        // A more advanced implementation would allow polygon drawing
        const width = Math.abs(endPoint.x - drawStart.x)
        const height = Math.abs(endPoint.y - drawStart.y)
        const topLeft = {
          x: Math.min(drawStart.x, endPoint.x),
          y: Math.min(drawStart.y, endPoint.y),
        }

        if (width > 0.01 && height > 0.01) {
          const points: NormalizedPoint[] = [
            topLeft,
            { x: topLeft.x + width, y: topLeft.y },
            { x: topLeft.x + width, y: topLeft.y + height },
            { x: topLeft.x, y: topLeft.y + height },
          ]

          const canvasWidth = pdfDimensions?.width || 800
          const canvasHeight = pdfDimensions?.height || 600
          const displayArea = calculateArea(points, canvasWidth, canvasHeight, 1, 72)

          createAnnotation({
            type: 'AREA',
            position: topLeft,
            pageNumber: 1,
            color: activeColor,
            points,
            displayArea,
          } as Partial<Annotation>)
        }
        break
      }
    }

    // Reset drawing state
    setIsDrawing(false)
    setDrawStart(null)
    setCurrentPath([])
    setMeasureEnd(null)
  }

  // Track touch start position for distinguishing tap from drag
  const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null)

  // Touch handlers for mobile - supports panning, annotation tools, and calibration
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Ignore multi-touch (pinch gestures handled by PDF viewer)
    if (e.touches.length !== 1) return
    if (!canvasRef.current) return

    const touch = e.touches[0]
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (touch.clientX - rect.left) / rect.width
    const y = (touch.clientY - rect.top) / rect.height

    // Store touch start for tap detection
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }

    // CALIBRATION MODE: Start calibration line
    if (isCalibrating) {
      e.preventDefault()
      if (!calibrationStart) {
        setCalibrationStart({ x, y })
      }
      return
    }

    // TOOL MODE: Handle drawing tools that use drag
    if (activeTool && activeTool !== 'PIN' && activeTool !== 'COMMENT' && activeTool !== 'MEASUREMENT') {
      e.preventDefault()
      setIsDrawing(true)
      setDrawStart({ x, y })

      // Initialize points for AREA and FREEHAND
      if (activeTool === 'AREA' || activeTool === 'FREEHAND') {
        setDrawPoints([{ x, y }])
      }
      return
    }

    // SELECT MODE (no tool active): Start panning
    if (!activeTool) {
      e.preventDefault()
      setIsPanning(true)
      const scrollContainer = pdfContainerRef.current
      if (scrollContainer) {
        panStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          scrollLeft: scrollContainer.scrollLeft,
          scrollTop: scrollContainer.scrollTop,
        }
      }
    }
  }

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return
    if (!canvasRef.current) return

    const touch = e.touches[0]
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (touch.clientX - rect.left) / rect.width
    const y = (touch.clientY - rect.top) / rect.height

    // CALIBRATION MODE: Update calibration preview
    if (isCalibrating && calibrationStart && !calibrationEnd) {
      e.preventDefault()
      setCalibrationPreview({ x, y })
      return
    }

    // TOOL MODE: Update drawing preview
    if (isDrawing && drawStart && activeTool) {
      e.preventDefault()
      setDrawCurrent({ x, y })

      // Update points for FREEHAND
      if (activeTool === 'FREEHAND') {
        setDrawPoints(prev => [...prev, { x, y }])
      }
      return
    }

    // PANNING MODE
    if (isPanning) {
      if (!panStartRef.current || !pdfContainerRef.current) return

      const dx = touch.clientX - panStartRef.current.x
      const dy = touch.clientY - panStartRef.current.y

      pdfContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx
      pdfContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy
    }
  }

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const touchStart = touchStartPosRef.current
    const wasTap = touchStart && (Date.now() - touchStart.time < 300) // Less than 300ms = tap

    // Get position from last known touch
    const changedTouch = e.changedTouches[0]
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (changedTouch.clientX - rect.left) / rect.width
    const y = (changedTouch.clientY - rect.top) / rect.height

    // CALIBRATION MODE: Complete calibration on tap
    if (isCalibrating && wasTap) {
      if (!calibrationStart) {
        setCalibrationStart({ x, y })
      } else if (!calibrationEnd) {
        setCalibrationEnd({ x, y })
        // Calculate pixel distance using pdfDimensions for consistency
        const canvasWidth = pdfDimensions?.width || 800
        const canvasHeight = pdfDimensions?.height || 600
        const pixelDist = Math.hypot(
          (x - calibrationStart.x) * canvasWidth,
          (y - calibrationStart.y) * canvasHeight
        )
        setCalibrationPixelDist(pixelDist)
        // Pre-fill with existing scale if available
        if (localScale && hasScale) {
          const match = localScale.match(/(\d+)['\u2019][-\s]*(\d*)[""]?/)
          if (match) {
            setCalibrationFeet(match[1] || '')
            setCalibrationInches(match[2] || '0')
          }
        }
        setShowCalibrationModal(true)
      }
      setCalibrationPreview(null)
      touchStartPosRef.current = null
      return
    }

    // TAP-BASED TOOLS: PIN, COMMENT, MEASUREMENT
    if (wasTap && activeTool && (activeTool === 'PIN' || activeTool === 'COMMENT' || activeTool === 'MEASUREMENT')) {
      const position: NormalizedPoint = { x, y }

      if (activeTool === 'MEASUREMENT') {
        if (!measureStart) {
          setMeasureStart(position)
        } else {
          finalizeMeasurement(position)
        }
      } else {
        // PIN or COMMENT - create annotation directly
        createAnnotation({
          type: activeTool,
          position,
          pageNumber: 1,
          color: activeColor,
        })
      }

      touchStartPosRef.current = null
      return
    }

    // DRAG-BASED TOOLS: Complete shape drawing
    if (isDrawing && drawStart && drawCurrent && activeTool) {
      finalizeAnnotation()
    }

    // Reset all states
    setIsPanning(false)
    setIsDrawing(false)
    panStartRef.current = null
    touchStartPosRef.current = null
  }

  // Start calibration mode
  const startCalibration = () => {
    setIsCalibrating(true)
    setCalibrationStart(null)
    setCalibrationEnd(null)
    setActiveTool(null) // Deactivate any other tool
    setSelectedAnnotationId(null)
  }

  // Cancel calibration
  const cancelCalibration = () => {
    setIsCalibrating(false)
    setCalibrationStart(null)
    setCalibrationEnd(null)
    setCalibrationPreview(null)
    setShowCalibrationModal(false)
    setCalibrationFeet('')
    setCalibrationInches('')
  }

  // Save calibration - calculates and saves the scale
  const saveCalibration = async () => {
    if (!calibrationPixelDist) return

    const feet = parseFloat(calibrationFeet) || 0
    const inches = parseFloat(calibrationInches) || 0
    const totalRealInches = feet * 12 + inches

    if (totalRealInches <= 0) return

    setSavingCalibration(true)

    try {
      // Calculate the scale ratio
      // pixelDist represents the number of screen pixels for totalRealInches
      // At 72 DPI base and zoom level, 1 inch on PDF = 72 * zoom pixels on screen
      // Scale like "1/4" = 1'-0"" means 0.25" on drawing = 12" real
      // We must account for the current zoom level when calculating drawing inches

      const pdfDPI = 72
      // Divide by zoom to get the actual drawing size in inches (at 100% zoom)
      const drawingInches = calibrationPixelDist / (pdfDPI * zoom)

      // Find the closest standard scale
      // Architectural scales: X" = 1'-0" (fraction of inch = 1 foot)
      // Civil/Engineering scales: 1" = X' (1 inch = many feet)

      // Architectural scales (X" on drawing = 1'-0" real)
      const architecturalScales = [
        { ratio: (1/16) / 12, label: '1/16" = 1\'-0"' },
        { ratio: (1/8) / 12, label: '1/8" = 1\'-0"' },
        { ratio: (3/16) / 12, label: '3/16" = 1\'-0"' },
        { ratio: (1/4) / 12, label: '1/4" = 1\'-0"' },
        { ratio: (3/8) / 12, label: '3/8" = 1\'-0"' },
        { ratio: (1/2) / 12, label: '1/2" = 1\'-0"' },
        { ratio: (3/4) / 12, label: '3/4" = 1\'-0"' },
        { ratio: 1 / 12, label: '1" = 1\'-0"' },
        { ratio: (3/2) / 12, label: '1-1/2" = 1\'-0"' },
        { ratio: 3 / 12, label: '3" = 1\'-0"' },
      ]

      // Civil/Engineering scales (1" on drawing = X' real)
      const civilScales = [
        { ratio: 1 / (10 * 12), label: '1" = 10\'' },
        { ratio: 1 / (20 * 12), label: '1" = 20\'' },
        { ratio: 1 / (30 * 12), label: '1" = 30\'' },
        { ratio: 1 / (40 * 12), label: '1" = 40\'' },
        { ratio: 1 / (50 * 12), label: '1" = 50\'' },
        { ratio: 1 / (60 * 12), label: '1" = 60\'' },
        { ratio: 1 / (100 * 12), label: '1" = 100\'' },
        { ratio: 1 / (150 * 12), label: '1" = 150\'' },
        { ratio: 1 / (200 * 12), label: '1" = 200\'' },
        { ratio: 1 / (300 * 12), label: '1" = 300\'' },
        { ratio: 1 / (400 * 12), label: '1" = 400\'' },
        { ratio: 1 / (500 * 12), label: '1" = 500\'' },
      ]

      // Determine default scale based on discipline
      // Civil drawings use civil scales, everything else uses architectural
      const discipline = drawing.subcategory?.toUpperCase()
      const isCivilDrawing = discipline === 'CIVIL' || discipline === 'SITE' || discipline === 'SURVEY'

      const allScales = [...architecturalScales, ...civilScales]

      // Calculate the measured ratio: drawingInches / realInches
      const measuredRatio = drawingInches / totalRealInches

      // Find the closest matching scale
      // The ratios are very different between civil (~0.0005) and architectural (~0.02),
      // so closest match will naturally select the right type
      let closestScale = isCivilDrawing ? civilScales[7] : architecturalScales[3] // Default: 1" = 150' or 1/4"
      let closestDiff = Infinity

      for (const scale of allScales) {
        const diff = Math.abs(scale.ratio - measuredRatio)
        if (diff < closestDiff) {
          closestDiff = diff
          closestScale = scale
        }
      }

      console.log('[DrawingViewer] Calibration:', {
        discipline,
        isCivilDrawing,
        measuredRatio,
        closestScale: closestScale.label,
        drawingInches,
        totalRealInches
      })

      // Update local scale state
      setLocalScale(closestScale.label)

      // Persist scale to database
      try {
        const response = await fetch(`/api/drawings/${drawing.id}/scale`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scale: closestScale.label }),
        })

        if (!response.ok) {
          const data = await response.json()
          console.error('[DrawingViewer] Failed to save scale:', data.error)
          // Still show the scale locally even if save fails
        } else {
          console.log('[DrawingViewer] Scale saved successfully:', closestScale.label)
        }
      } catch (err) {
        console.error('[DrawingViewer] Error saving scale to database:', err)
        // Scale is still applied locally even if save fails
      }

      // Reset calibration state
      cancelCalibration()
    } finally {
      setSavingCalibration(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur-sm border-b border-white/10">
        {/* Left: Navigation and Title */}
        <div className="flex items-center gap-4">
          {/* Mobile back button - 56px touch target, high contrast */}
          <button
            onClick={onClose}
            className="md:hidden flex items-center gap-2 min-h-[56px] px-4 py-3
                       bg-white/20 text-white rounded-xl font-semibold text-lg
                       active:bg-white/30 transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={navigatePrev}
              disabled={!canGoPrev}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous (←)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-white/50 text-sm min-w-[60px] text-center">
              {currentIndex + 1} / {drawings.length}
            </span>
            <button
              onClick={navigateNext}
              disabled={!canGoNext}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next (→)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="hidden sm:block border-l border-white/20 h-8" />

          <div className="hidden sm:block">
            <h3 className="font-semibold text-white">
              {drawing.drawingNumber ? `${drawing.drawingNumber} - ${drawing.title}` : drawing.title}
            </h3>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span>{drawing.project.name}</span>
              {drawing.revisionNumber && (
                <span className="px-2 py-0.5 bg-white/10 rounded">Rev {drawing.revisionNumber}</span>
              )}
              {localScale && (
                <span className="flex items-center gap-1">
                  <Ruler className="h-3 w-3" />
                  {localScale}
                </span>
              )}
              {drawing.isVerified ? (
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-400">
                  <AlertTriangle className="h-3 w-3" />
                  Unverified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => {
                setZoomAnchorFromMouse()
                setZoom(Math.max(0.25, zoom - 0.25))
              }}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setZoomAnchorFromMouse()
                setZoom(1)
              }}
              className="text-white text-sm px-2 py-1 min-w-[48px] text-center hover:bg-white/10 rounded transition-colors"
              title="Click to reset to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => {
                setZoomAnchorFromMouse()
                setZoom(Math.min(5, zoom + 0.25))
              }}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Annotation toggle */}
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`p-2 rounded-lg transition-colors ${
              showAnnotations ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/10'
            }`}
            title={showAnnotations ? 'Hide annotations (H)' : 'Show annotations (H)'}
          >
            {showAnnotations ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </button>

          {/* Clear all annotations */}
          {annotations.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-2 rounded-lg text-white/70 hover:text-red-400 hover:bg-white/10 transition-colors"
              title="Clear all annotations"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}

          {/* Toolbar toggle */}
          <button
            onClick={() => setShowToolbar(!showToolbar)}
            className={`p-2 rounded-lg transition-colors ${
              showToolbar ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
            }`}
            title="Toggle toolbar"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* Download */}
          <a
            href={viewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </a>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex relative overflow-hidden min-h-0">
        {/* Annotation Toolbar - fixed on mobile/tablet, draggable on desktop */}
        {showToolbar && showAnnotations && (
          <>
            {/* Mobile/Tablet: Single tools button that opens full menu */}
            <div className="lg:hidden fixed z-30 left-3 bottom-6">
              {/* Tools toggle button - shows current tool icon */}
              <button
                onClick={() => setShowMobileToolsMenu(!showMobileToolsMenu)}
                className={`min-h-[56px] min-w-[56px] flex items-center justify-center rounded-full shadow-xl transition-colors border-2 ${
                  showMobileToolsMenu
                    ? 'bg-blue-600 text-white border-blue-400'
                    : activeTool
                      ? 'bg-blue-600 text-white border-white/30'
                      : 'bg-gray-900/90 text-white border-white/20'
                }`}
              >
                {activeTool ? (
                  // Show active tool icon
                  (() => {
                    const tool = TOOLS.find(t => t.type === activeTool)
                    return tool ? <tool.icon className="h-6 w-6" /> : <Settings className="h-6 w-6" />
                  })()
                ) : (
                  <Settings className="h-6 w-6" />
                )}
              </button>

              {/* Mobile tools menu popup */}
              {showMobileToolsMenu && (
                <div className="absolute bottom-16 left-0 bg-gray-900/95 backdrop-blur-sm rounded-xl p-3 shadow-xl border-2 border-white/20 min-w-[200px]">
                  {/* Tools grid */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {TOOLS.map((tool) => {
                      const isActive = tool.type === null ? activeTool === null : activeTool === tool.type
                      return (
                        <button
                          key={tool.type ?? 'select'}
                          onClick={() => {
                            if (tool.type === null) {
                              setActiveTool(null)
                              setSelectedAnnotationId(null)
                            } else {
                              setActiveTool(activeTool === tool.type ? null : tool.type)
                            }
                            setShowMobileToolsMenu(false)
                          }}
                          className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors ${
                            isActive ? 'bg-blue-600 text-white' : 'text-white/70 active:bg-white/10'
                          }`}
                        >
                          <tool.icon className="h-5 w-5" />
                          <span className="text-[10px] truncate max-w-[40px]">{tool.label.length > 6 ? tool.label.slice(0, 5) + '.' : tool.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Color picker */}
                  <div className="border-t border-white/10 pt-3 mb-3">
                    <p className="text-white/50 text-xs mb-2">Color</p>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setActiveColor(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-transform ${
                            activeColor === color ? 'border-white scale-110' : 'border-white/30'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-white/10 pt-3 flex gap-2">
                    <button
                      onClick={() => { undo(); setShowMobileToolsMenu(false); }}
                      disabled={!canUndo}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-1 rounded-lg text-white/70 active:bg-white/10 disabled:opacity-30"
                    >
                      <Undo2 className="h-4 w-4" />
                      <span className="text-xs">Undo</span>
                    </button>
                    <button
                      onClick={() => { redo(); setShowMobileToolsMenu(false); }}
                      disabled={!canRedo}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-1 rounded-lg text-white/70 active:bg-white/10 disabled:opacity-30"
                    >
                      <Redo2 className="h-4 w-4" />
                      <span className="text-xs">Redo</span>
                    </button>
                    {selectedAnnotationId && (
                      <button
                        onClick={() => {
                          deleteAnnotation(selectedAnnotationId)
                          setSelectedAnnotationId(null)
                          setShowMobileToolsMenu(false)
                        }}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-1 rounded-lg text-red-400 active:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-xs">Delete</span>
                      </button>
                    )}
                  </div>

                  {/* Calibration */}
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <button
                      onClick={() => {
                        startCalibration()
                        setShowMobileToolsMenu(false)
                      }}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-lg text-green-400 active:bg-green-500/20"
                    >
                      <Target className="h-4 w-4" />
                      <span className="text-sm font-medium">Calibrate Scale</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop: Draggable toolbar (hidden on mobile/tablet) */}
            <div
              ref={toolbarRef}
              className={`hidden lg:block absolute z-30 bg-gray-900/90 backdrop-blur-sm rounded-xl p-2 shadow-xl border-2 border-white/20 select-none ${
                isDraggingToolbar ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{
                left: toolbarPosition.x,
                top: toolbarPosition.y,
              }}
              onMouseDown={handleToolbarMouseDown}
            >
            {/* Drag handle hint */}
            <div className="flex justify-center mb-1 opacity-50">
              <div className="w-8 h-1 bg-white/30 rounded-full" />
            </div>
            {/* Tools */}
            <div className="space-y-1">
              {TOOLS.map((tool) => {
                // Select tool is active when activeTool is null
                const isActive = tool.type === null
                  ? activeTool === null
                  : activeTool === tool.type

                return (
                  <button
                    key={tool.type ?? 'select'}
                    onClick={() => {
                      if (tool.type === null) {
                        // Select tool - clear active tool and selection state
                        setActiveTool(null)
                        setSelectedAnnotationId(null)
                      } else {
                        // Toggle other tools
                        setActiveTool(activeTool === tool.type ? null : tool.type)
                      }
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                    title={`${tool.label} (${tool.shortcut})`}
                  >
                    <tool.icon className="h-4 w-4" />
                    <span className="text-sm hidden lg:inline">{tool.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="border-t border-white/10 my-2" />

            {/* Color picker */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-white/50"
                  style={{ backgroundColor: activeColor }}
                />
                <span className="text-sm hidden lg:inline">Color</span>
              </button>

              {showColorPicker && (
                <div className="absolute left-full ml-2 top-0 bg-gray-900/95 rounded-lg p-3 shadow-xl border border-white/10 z-50">
                  <div className="grid grid-cols-4 gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setActiveColor(color)
                          setShowColorPicker(false)
                        }}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                          activeColor === color ? 'border-white ring-2 ring-white/50' : 'border-white/30'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 my-2" />

            {/* Undo/Redo/Delete */}
            <div className="flex gap-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="flex-1 p-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4 mx-auto" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="flex-1 p-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="h-4 w-4 mx-auto" />
              </button>
              <button
                onClick={() => {
                  if (selectedAnnotationId) {
                    deleteAnnotation(selectedAnnotationId)
                    setSelectedAnnotationId(null)
                  }
                }}
                disabled={!selectedAnnotationId}
                className="flex-1 p-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Delete selected (Del)"
              >
                <Trash2 className="h-4 w-4 mx-auto" />
              </button>
            </div>

            <div className="border-t border-white/10 my-2" />

            {/* Calibration button */}
            <button
              onClick={startCalibration}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-colors ${
                isCalibrating
                  ? 'bg-green-600 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              title="Calibrate Scale"
            >
              <Target className="h-4 w-4" />
              <span className="text-sm hidden lg:inline">Calibrate</span>
            </button>
          </div>
          </>
        )}

        {/* Scale indicator (top right) */}
        {localScale && hasScale && (
          <div className="absolute top-4 right-4 z-30 bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-xl border border-white/10">
            <div className="flex items-center gap-2 text-white">
              <Ruler className="h-4 w-4 text-white/70" />
              <span className="font-medium">{localScale}</span>
            </div>
          </div>
        )}

        {/* Calibration hint */}
        {isCalibrating && !showCalibrationModal && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-green-900/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-xl border border-green-400/30 flex items-center gap-3">
            <Target className="h-5 w-5 text-green-400" />
            <p className="text-white text-sm">
              {!calibrationStart ? (
                'Click the first point of a known dimension'
              ) : (
                'Click the second point to complete the measurement'
              )}
            </p>
            <button
              onClick={cancelCalibration}
              className="ml-2 px-2 py-1 bg-white/10 hover:bg-white/20 text-white/70 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Measurement hint */}
        {activeTool === 'MEASUREMENT' && measureStart && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-xl border border-white/10">
            <p className="text-white text-sm">
              {measureDistance ? (
                <>Distance: <strong>{measureDistance}</strong> - Click to place</>
              ) : (
                'Click second point to measure'
              )}
            </p>
          </div>
        )}

        {/* Selection indicator */}
        {selectedAnnotationId && activeTool === null && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-blue-900/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-xl border border-blue-400/30 flex items-center gap-3">
            <p className="text-white text-sm">
              Annotation selected
            </p>
            <button
              onClick={() => {
                deleteAnnotation(selectedAnnotationId)
                setSelectedAnnotationId(null)
              }}
              className="flex items-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded text-sm transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
            <span className="text-white/50 text-xs">or press Delete key</span>
          </div>
        )}

        {/* PDF Viewer with annotation overlay */}
        {/* touch-action:none prevents browser pinch zoom on tablets - use manual zoom controls instead */}
        <div
          ref={containerRef}
          className="flex-1 relative min-h-0 min-w-0 overflow-hidden"
          style={{ touchAction: 'none' }}
          onMouseMove={(e) => {
            // Track mouse position for cursor-following button zoom
            lastMousePosRef.current = { x: e.clientX, y: e.clientY }
          }}
        >
          <PDFViewer
            url={viewerUrl}
            fileName={drawing.title}
            className="h-full w-full"
            externalZoom={zoom}
            onZoomChange={setZoom}
            onCanvasDimensions={handlePdfDimensions}
            hideToolbar={true}
          />

          {/* Annotation Canvas Overlay */}
          <canvas
              ref={canvasRef}
              className={`absolute z-20 pointer-events-auto ${
                activeTool || isCalibrating
                  ? 'cursor-crosshair'
                  : isPanning
                    ? 'cursor-grabbing'
                    : 'cursor-grab'
              }`}
              style={{
                display: showAnnotations ? 'block' : 'none',
                width: pdfDimensions?.width ?? '100%',
                height: pdfDimensions?.height ?? '100%',
                left: (pdfDimensions?.offsetX ?? 0) - drawOffset.x,
                top: (pdfDimensions?.offsetY ?? 0) - drawOffset.y,
              }}
              width={pdfDimensions?.width ?? 800}
              height={pdfDimensions?.height ?? 600}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={() => {
                if (isPanning) {
                  setIsPanning(false)
                  panStartRef.current = null
                }
              }}
              onTouchStart={handleCanvasTouchStart}
              onTouchMove={handleCanvasTouchMove}
              onTouchEnd={handleCanvasTouchEnd}
            />
        </div>
      </div>

      {/* Loading indicator for annotations */}
      {annotationsLoading && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading annotations...</span>
        </div>
      )}

      {/* Calibration Modal */}
      {showCalibrationModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Calibrate Scale</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enter the real-world measurement</p>
                </div>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You measured <strong>{Math.round(calibrationPixelDist)}px</strong> on the drawing.
                </p>
                {localScale && (
                  <p className="text-sm text-gray-500 mt-1">
                    Current scale: <strong>{localScale}</strong>
                  </p>
                )}
              </div>

              <p className="text-sm text-gray-700 mb-3">
                What is the actual measurement of this line?
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feet</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={calibrationFeet}
                    onChange={(e) => setCalibrationFeet(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inches</label>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    step="1"
                    value={calibrationInches}
                    onChange={(e) => setCalibrationInches(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelCalibration}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCalibration}
                  disabled={savingCalibration || (!calibrationFeet && !calibrationInches)}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingCalibration ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Set Scale'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Annotations Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Clear All Annotations?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-6">
                This will permanently delete all <strong>{annotations.length}</strong> annotations
                you have created on this drawing.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearingAnnotations}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={clearAllAnnotations}
                  disabled={clearingAnnotations}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {clearingAnnotations ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    'Clear All'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
