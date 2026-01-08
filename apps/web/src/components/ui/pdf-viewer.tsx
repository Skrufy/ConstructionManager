'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize2, Loader2, RefreshCw, Maximize, ExternalLink, Columns, AlertTriangle, Clock } from 'lucide-react'

// Rendering mode type
type RenderMode = 'canvas' | 'svg'

interface PDFViewerProps {
  url: string
  fileName: string
  onDownload?: () => void
  className?: string
  // External page control (optional)
  externalPage?: number
  onPageChange?: (page: number) => void
  // External zoom control (optional)
  externalZoom?: number
  onZoomChange?: (zoom: number) => void
  // Callback for PDF canvas dimensions (for annotation overlay sync)
  onCanvasDimensions?: (dimensions: { width: number; height: number; offsetX: number; offsetY: number }) => void
  // Hide toolbar for embedded use
  hideToolbar?: boolean
  // Compact mode for split preview
  compact?: boolean
  // Preferred rendering mode (svg = MuPDF.js default, canvas = PDF.js fallback)
  preferredRenderMode?: RenderMode
}

// Detect if device is touch-enabled (mobile/tablet)
function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// PDF.js types
declare global {
  interface Window {
    pdfjsLib: {
      GlobalWorkerOptions: { workerSrc: string }
      getDocument: (src: string | ArrayBuffer) => { promise: Promise<PDFDocumentProxy> }
      version: string
    }
  }
}

interface PDFDocumentProxy {
  numPages: number
  getPage: (pageNumber: number) => Promise<PDFPageProxy>
}

interface PDFPageProxy {
  getViewport: (options: { scale: number }) => PDFViewport
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PDFViewport }) => { promise: Promise<void> }
}

interface PDFViewport {
  width: number
  height: number
}

// PDF.js version and sources
const PDFJS_VERSION = '3.11.174'
const PDFJS_CDN_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`

// Load PDF.js script with retry and fallback
let pdfJsLoadPromise: Promise<void> | null = null
let pdfJsLoadAttempts = 0
let pdfJsLastLoadTime = 0
const MAX_LOAD_ATTEMPTS = 3
const LOAD_TIMEOUT_MS = 30000 // Reset promise if stuck for 30 seconds

async function loadPdfJsWithRetry(): Promise<void> {
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    // Ensure worker is configured even if pdfjsLib already exists
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN_BASE}/pdf.worker.min.js`
    }
    return Promise.resolve()
  }

  // Reset stuck promise after timeout
  if (pdfJsLoadPromise && Date.now() - pdfJsLastLoadTime > LOAD_TIMEOUT_MS) {
    console.warn('[PDFViewer] Resetting stuck load promise')
    pdfJsLoadPromise = null
  }

  if (pdfJsLoadPromise) return pdfJsLoadPromise

  pdfJsLastLoadTime = Date.now()

  pdfJsLoadPromise = new Promise(async (resolve, reject) => {
    const loadScript = (src: string): Promise<void> => {
      return new Promise((res, rej) => {
        // Check if script already exists
        const existing = document.querySelector(`script[src="${src}"]`)
        if (existing) {
          // Wait for existing script to be ready
          const checkReady = () => {
            if (window.pdfjsLib) {
              res()
            } else {
              setTimeout(checkReady, 50)
            }
          }
          checkReady()
          return
        }

        const script = document.createElement('script')
        script.src = src
        script.crossOrigin = 'anonymous'
        script.onload = () => res()
        script.onerror = () => rej(new Error(`Failed to load script: ${src}`))
        document.head.appendChild(script)
      })
    }

    // Try loading PDF.js with exponential backoff
    for (let attempt = 0; attempt < MAX_LOAD_ATTEMPTS; attempt++) {
      try {
        // Load PDF.js from CDN
        await loadScript(`${PDFJS_CDN_BASE}/pdf.min.js`)

        // Wait for the library to fully initialize (not just load)
        let waitAttempts = 0
        while (!window.pdfjsLib && waitAttempts < 20) {
          await new Promise(r => setTimeout(r, 100))
          waitAttempts++
        }

        if (window.pdfjsLib) {
          // Set worker source IMMEDIATELY after pdfjsLib is available
          // This MUST be set before any getDocument() call
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN_BASE}/pdf.worker.min.js`

          // Give the worker configuration time to be processed
          await new Promise(r => setTimeout(r, 50))

          // Preload the worker script to ensure it's cached
          try {
            const workerUrl = window.pdfjsLib.GlobalWorkerOptions.workerSrc
            const workerResponse = await fetch(workerUrl)
            if (!workerResponse.ok) {
              console.warn('[PDFViewer] Worker preload failed, but continuing...')
            }
          } catch {
            // Ignore - worker might still work from cache
          }

          console.log('[PDFViewer] PDF.js v' + PDFJS_VERSION + ' ready with CDN worker')

          pdfJsLoadAttempts = attempt + 1
          resolve()
          return
        } else {
          throw new Error('PDF.js loaded but pdfjsLib not available after waiting')
        }
      } catch (err) {
        console.warn(`[PDFViewer] Load attempt ${attempt + 1}/${MAX_LOAD_ATTEMPTS} failed:`, err)

        if (attempt < MAX_LOAD_ATTEMPTS - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }

    pdfJsLoadPromise = null
    reject(new Error('Failed to load PDF.js after multiple attempts. Please check your internet connection.'))
  })

  return pdfJsLoadPromise
}

// ============================================
// MuPDF.js (WebAssembly) for SVG Rendering
// ============================================
// NOTE: MuPDF.js requires Node.js APIs (fs, module) that aren't available in browsers.
// For browser-based SVG rendering, we would need a different approach like:
// 1. A server-side API endpoint that renders PDFs to SVG
// 2. PDF.js's experimental SVG backend
// 3. A browser-compatible WASM PDF library
//
// For now, MuPDF SVG rendering is disabled in the browser build.
// The Canvas mode (PDF.js) remains the default.

// Placeholder functions - SVG rendering disabled until browser-compatible solution is found
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadMuPdf(): Promise<null> {
  // MuPDF.js is not browser-compatible - uses node:fs
  console.warn('[PDFViewer] MuPDF.js SVG rendering not available in browser')
  return null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function renderPageToSvg(
  _pdfData: ArrayBuffer,
  _pageNumber: number
): Promise<{ svg: string; width: number; height: number } | null> {
  // Not implemented - MuPDF requires Node.js
  return null
}

// Maximum safe canvas dimensions (browser limits vary)
const MAX_CANVAS_DIMENSION = 16384
const MAX_CANVAS_PIXELS = 134217728

function getMaxSafeRenderScale(baseWidth: number, baseHeight: number): number {
  const maxScaleByWidth = MAX_CANVAS_DIMENSION / baseWidth
  const maxScaleByHeight = MAX_CANVAS_DIMENSION / baseHeight
  const maxScaleByPixels = Math.sqrt(MAX_CANVAS_PIXELS / (baseWidth * baseHeight))
  return Math.min(maxScaleByWidth, maxScaleByHeight, maxScaleByPixels)
}

// Error types for better user guidance
interface PDFError {
  type: 'network' | 'timeout' | 'invalid' | 'password' | 'cors' | 'unknown'
  message: string
  hint: string
  canRetry: boolean
}

function categorizeError(err: unknown): PDFError {
  const errMessage = err instanceof Error ? err.message : String(err)

  if (err instanceof TypeError && errMessage.includes('Failed to fetch')) {
    return {
      type: 'network',
      message: 'Network error loading PDF',
      hint: 'Check your internet connection and try again.',
      canRetry: true
    }
  }

  if (errMessage.includes('timeout') || errMessage.includes('Timeout')) {
    return {
      type: 'timeout',
      message: 'Request timed out',
      hint: 'The file may be too large or the connection is slow. Try again.',
      canRetry: true
    }
  }

  if (errMessage.includes('Invalid PDF') || errMessage.includes('corrupted')) {
    return {
      type: 'invalid',
      message: 'Invalid or corrupted PDF file',
      hint: 'The file may be damaged. Try re-uploading it.',
      canRetry: false
    }
  }

  if (errMessage.includes('password') || errMessage.includes('Password')) {
    return {
      type: 'password',
      message: 'Password-protected PDF',
      hint: 'This PDF requires a password. Please use an unprotected version.',
      canRetry: false
    }
  }

  if (errMessage.includes('CORS') || errMessage.includes('cross-origin')) {
    return {
      type: 'cors',
      message: 'Access denied',
      hint: 'The file cannot be loaded from this location.',
      canRetry: false
    }
  }

  // PDF.js worker initialization errors
  if (errMessage.includes('fake worker') || errMessage.includes('WorkerMessageHandler')) {
    return {
      type: 'unknown',
      message: 'PDF viewer initialization failed',
      hint: 'Try refreshing the page or opening in a new tab.',
      canRetry: true
    }
  }

  return {
    type: 'unknown',
    message: errMessage || 'Failed to load PDF',
    hint: 'Try refreshing the page or opening in a new tab.',
    canRetry: true
  }
}

// Format time for ETA display
function formatETA(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return ''
  if (seconds < 60) return `${Math.ceil(seconds)}s remaining`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.ceil(seconds % 60)
  return `${minutes}m ${remainingSeconds}s remaining`
}

export function PDFViewer({
  url,
  fileName,
  onDownload,
  className = '',
  externalPage,
  onPageChange,
  externalZoom,
  onZoomChange,
  onCanvasDimensions,
  hideToolbar = false,
  compact = false,
  preferredRenderMode = 'canvas' // Canvas is the only browser-compatible option currently
}: PDFViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [internalPageNumber, setInternalPageNumber] = useState<number>(1)
  const [numPages, setNumPages] = useState<number>(0)
  const [internalScale, setInternalScale] = useState<number>(1.0)

  // Rendering mode state
  const [renderMode, setRenderMode] = useState<RenderMode>(preferredRenderMode)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [svgDimensions, setSvgDimensions] = useState<{ width: number; height: number } | null>(null)
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null)
  const [mupdfAvailable, setMupdfAvailable] = useState<boolean | null>(null) // null = not checked yet

  // Use external zoom if provided, otherwise internal
  const scale = externalZoom ?? internalScale
  const setScale = useCallback((newScale: number | ((prev: number) => number)) => {
    const computedScale = typeof newScale === 'function' ? newScale(scale) : newScale
    const clampedScale = Math.min(Math.max(computedScale, 0.1), 5.0)
    if (onZoomChange) {
      onZoomChange(clampedScale)
    } else {
      setInternalScale(clampedScale)
    }
  }, [scale, onZoomChange])

  // Use external page if provided, otherwise internal
  const pageNumber = externalPage ?? internalPageNumber
  const setPageNumber = useCallback((page: number | ((prev: number) => number)) => {
    const newPage = typeof page === 'function' ? page(pageNumber) : page
    if (onPageChange) {
      onPageChange(newPage)
    } else {
      setInternalPageNumber(newPage)
    }
  }, [pageNumber, onPageChange])

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<PDFError | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [fileSize, setFileSize] = useState<string>('')
  const [rendering, setRendering] = useState<boolean>(false)
  const [loadAttempt, setLoadAttempt] = useState<number>(0)

  // ETA tracking
  const [eta, setEta] = useState<string>('')
  const downloadStartTimeRef = useRef<number>(0)

  // Render quality info for display
  const [renderInfo, setRenderInfo] = useState<{ scale: number; width: number; height: number } | null>(null)

  // Base viewport dimensions (at scale 1.0)
  const [baseViewport, setBaseViewport] = useState<{ width: number; height: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<{ promise: Promise<void> } | null>(null)

  // Drag-to-pan state
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)

  const [isMobile, setIsMobile] = useState(false)
  const [showMobileHint, setShowMobileHint] = useState(true)

  // MuPDF is not browser-compatible (requires node:fs)
  // SVG rendering is disabled until a browser-compatible solution is implemented
  useEffect(() => {
    setMupdfAvailable(false)
    setRenderMode('canvas')
  }, [])

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(isTouchDevice())
  }, [])

  // Hide mobile hint after 3 seconds
  useEffect(() => {
    if (isMobile && !loading && pdfDoc) {
      const timer = setTimeout(() => setShowMobileHint(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isMobile, loading, pdfDoc])

  // Cleanup canvas memory when component unmounts or page changes
  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          canvasRef.current.width = 0
          canvasRef.current.height = 0
        }
      }
    }
  }, [pageNumber])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Render page at optimal resolution for current zoom level
  // This ensures crisp rendering at any zoom, especially for large Arch D/E drawings
  const renderPage = useCallback(async (doc: PDFDocumentProxy, pageNum: number, zoomLevel: number) => {
    if (!canvasRef.current) return

    // Cancel any pending render
    if (renderTaskRef.current) {
      renderTaskRef.current = null
    }

    setRendering(true)
    try {
      const page = await doc.getPage(pageNum)

      // Get base viewport (scale 1.0) for dimension calculations
      const baseVp = page.getViewport({ scale: 1.0 })
      setBaseViewport({ width: baseVp.width, height: baseVp.height })

      // Calculate render scale for pixel-perfect display
      // The goal: canvas pixels = display pixels (no browser scaling)
      const pixelRatio = window.devicePixelRatio || 1
      const maxSafeScale = getMaxSafeRenderScale(baseVp.width, baseVp.height)

      // For pixel-perfect rendering:
      // - Render at zoomLevel * pixelRatio so canvas pixels match screen pixels
      // - This means at 50% zoom on 1x display: render at 0.5x (half resolution)
      // - At 100% zoom on 2x retina: render at 2.0x
      const pixelPerfectScale = zoomLevel * pixelRatio

      // However, for construction drawings we want extra detail
      // So we render at a higher scale and let CSS downscale slightly for anti-aliasing
      // 1.5x the pixel-perfect scale gives good text clarity
      const enhancedScale = pixelPerfectScale * 1.5

      // Ensure minimum of 1.5 for readable text even at very low zoom
      const targetScale = Math.max(enhancedScale, 1.5)
      const renderScale = Math.min(targetScale, maxSafeScale)


      const viewport = page.getViewport({ scale: renderScale })

      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) return

      // Set canvas size to render size
      canvas.width = viewport.width
      canvas.height = viewport.height

      // Clear canvas with white background
      context.fillStyle = '#FFFFFF'
      context.fillRect(0, 0, viewport.width, viewport.height)

      // Render PDF to canvas
      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport
      })
      renderTaskRef.current = renderTask
      await renderTask.promise

      // Check if render was cancelled
      if (renderTaskRef.current !== renderTask) {
        return
      }

      // Store render info for quality indicator
      setRenderInfo({
        scale: renderScale,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height)
      })

    } catch (err) {
      // Silent fail for cancelled renders
      if (err instanceof Error && err.message.includes('cancelled')) return
      console.error('[PDFViewer] Render error:', err)
    } finally {
      setRendering(false)
    }
  }, [])

  // Update dimensions callback when scale changes (CSS-based, instant)
  useEffect(() => {
    if (!baseViewport || !onCanvasDimensions || !containerRef.current) return

    const displayWidth = baseViewport.width * scale
    const displayHeight = baseViewport.height * scale
    const containerRect = containerRef.current.getBoundingClientRect()

    // Calculate centered position - DO NOT include scroll here
    // Drawing-viewer handles scroll separately via drawOffset to avoid sync issues
    const offsetX = Math.max(0, (containerRect.width - 32 - displayWidth) / 2) + 16

    onCanvasDimensions({
      width: displayWidth,
      height: displayHeight,
      offsetX,
      offsetY: 16, // Just padding, scroll handled by drawing-viewer
    })
  }, [scale, baseViewport, onCanvasDimensions])

  // Load PDF with retry logic
  const loadPdf = useCallback(async (retryCount = 0) => {
    setLoading(true)
    setError(null)
    setProgress(0)
    setEta('')
    setPdfDoc(null)
    setBaseViewport(null)
    setLoadAttempt(retryCount)
    downloadStartTimeRef.current = Date.now()

    try {
      await loadPdfJsWithRetry()

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      if (total > 0) {
        setFileSize(formatFileSize(total))
      }

      let pdfData: ArrayBuffer
      if (total && response.body) {
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let receivedLength = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          receivedLength += value.length

          const percent = Math.round((receivedLength / total) * 100)
          setProgress(percent)

          // Calculate ETA
          const elapsed = (Date.now() - downloadStartTimeRef.current) / 1000
          if (elapsed > 0.5 && receivedLength > 0) {
            const speed = receivedLength / elapsed
            const remaining = (total - receivedLength) / speed
            setEta(formatETA(remaining))
          }
        }

        const allChunks = new Uint8Array(receivedLength)
        let position = 0
        for (const chunk of chunks) {
          allChunks.set(chunk, position)
          position += chunk.length
        }
        pdfData = allChunks.buffer
      } else {
        const blob = await response.blob()
        setFileSize(formatFileSize(blob.size))
        pdfData = await blob.arrayBuffer()
        setProgress(100)
      }

      setEta('')

      // Store PDF buffer for SVG rendering (if MuPDF is available)
      setPdfBuffer(pdfData)

      const loadingTask = window.pdfjsLib.getDocument(pdfData)
      const doc = await loadingTask.promise

      setPdfDoc(doc)
      setNumPages(doc.numPages)
      setPageNumber(1)
      setLoading(false)

      // Fit to width on initial load
      requestAnimationFrame(async () => {
        if (containerRef.current) {
          try {
            const page = await doc.getPage(1)
            const viewport = page.getViewport({ scale: 1 })
            const rect = containerRef.current.getBoundingClientRect()
            const containerWidth = rect.width - 32
            if (containerWidth > 100) {
              const fitWidthScale = containerWidth / viewport.width
              setScale(Math.max(fitWidthScale, 0.25))
            }
          } catch {
            // Keep default scale
          }
        }
      })
    } catch (err) {
      console.error('[PDFViewer] Error loading PDF:', err)
      const pdfError = categorizeError(err)

      // Auto-retry for network errors
      if (pdfError.canRetry && retryCount < 2) {
        console.log(`[PDFViewer] Retrying (attempt ${retryCount + 2}/3)...`)
        const delay = Math.pow(2, retryCount) * 1000
        await new Promise(r => setTimeout(r, delay))
        return loadPdf(retryCount + 1)
      }

      setError(pdfError)
      setLoading(false)
    }
  }, [url, setScale, setPageNumber])

  // Load PDF on mount and URL change
  useEffect(() => {
    loadPdf()
    return () => {
      renderTaskRef.current = null
    }
  }, [url])

  // Render when PDF loads or page/zoom changes
  // This ensures crisp text/lines at any zoom level
  useEffect(() => {
    if (renderMode !== 'canvas' || !pdfDoc || loading) return

    // Small delay to ensure component is mounted and ready
    const timeoutId = setTimeout(() => {
      renderPage(pdfDoc, pageNumber, scale)
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [pdfDoc, pageNumber, scale, loading, renderPage, renderMode])

  // SVG mode: Currently disabled - MuPDF.js requires Node.js APIs
  // This effect is kept as placeholder for future browser-compatible SVG rendering
  // (e.g., via PDF.js SVGGraphics or a server-side API)
  useEffect(() => {
    if (renderMode !== 'svg' || !mupdfAvailable) return
    // SVG rendering would go here when a browser-compatible solution is available
  }, [renderMode, mupdfAvailable])

  // Update dimensions on scroll - note: scroll is handled by drawing-viewer via drawOffset
  // We only need to report the static offset (centering + padding)
  useEffect(() => {
    const container = containerRef.current
    if (!container || !onCanvasDimensions || !baseViewport) return

    const updateDimensions = () => {
      const displayWidth = baseViewport.width * scale
      const displayHeight = baseViewport.height * scale
      const containerRect = container.getBoundingClientRect()
      // DO NOT include scroll - drawing-viewer handles it via drawOffset
      const offsetX = Math.max(0, (containerRect.width - 32 - displayWidth) / 2) + 16

      onCanvasDimensions({
        width: displayWidth,
        height: displayHeight,
        offsetX,
        offsetY: 16, // Just padding, scroll handled by drawing-viewer
      })
    }

    container.addEventListener('scroll', updateDimensions)
    return () => container.removeEventListener('scroll', updateDimensions)
  }, [onCanvasDimensions, baseViewport, scale])

  const goToPrevPage = () => {
    if (pageNumber > 1) setPageNumber(prev => prev - 1)
  }

  const goToNextPage = () => {
    if (pageNumber < numPages) setPageNumber(prev => prev + 1)
  }

  // Zoom levels - now renders at optimal resolution per zoom level
  // so lower zoom levels are crisp too
  const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0]
  const MIN_ZOOM = 0.5

  const zoomIn = () => {
    setScale(prev => {
      const nextLevel = ZOOM_LEVELS.find(z => z > prev + 0.01)
      return nextLevel || Math.min(prev + 0.25, 3.0)
    })
  }

  const zoomOut = () => {
    setScale(prev => {
      const prevLevels = ZOOM_LEVELS.filter(z => z < prev - 0.01)
      return prevLevels.length > 0 ? prevLevels[prevLevels.length - 1] : Math.max(prev - 0.25, MIN_ZOOM)
    })
  }

  const fitToWidth = useCallback(async () => {
    if (!pdfDoc || !containerRef.current) return
    try {
      const page = await pdfDoc.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })
      const rect = containerRef.current.getBoundingClientRect()
      const containerWidth = rect.width - 32
      if (containerWidth > 100) {
        const newScale = containerWidth / viewport.width
        setScale(Math.min(Math.max(newScale, 0.1), 3.0))
      }
    } catch {
      // Silent fail
    }
  }, [pdfDoc, pageNumber, setScale])

  const fitToPage = useCallback(async () => {
    if (!pdfDoc || !containerRef.current) return
    try {
      const page = await pdfDoc.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })
      const rect = containerRef.current.getBoundingClientRect()
      const containerWidth = rect.width - 32
      const containerHeight = rect.height - 32
      if (containerWidth > 100 && containerHeight > 100) {
        const scaleX = containerWidth / viewport.width
        const scaleY = containerHeight / viewport.height
        setScale(Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 3.0))
      }
    } catch {
      // Silent fail
    }
  }, [pdfDoc, pageNumber, setScale])

  const openFullscreen = () => {
    window.open(url, '_blank')
  }

  // Drag-to-pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || e.button !== 0) return

    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop
    }
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return

    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y

    containerRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx
    containerRef.current.scrollTop = dragStartRef.current.scrollTop - dy
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      dragStartRef.current = null
    }
  }, [isDragging])

  // Touch handlers - panning only, no pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length !== 1) return

    const touch = e.touches[0]
    setIsDragging(true)
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || !isDragging || !dragStartRef.current || e.touches.length !== 1) return

    const touch = e.touches[0]
    const dx = touch.clientX - dragStartRef.current.x
    const dy = touch.clientY - dragStartRef.current.y

    containerRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx
    containerRef.current.scrollTop = dragStartRef.current.scrollTop - dy
  }, [isDragging])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  // Mouse wheel zoom - step-based for consistent behavior
  // Using Ctrl+scroll for zoom (standard behavior), plain scroll for pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only zoom on Ctrl+scroll, otherwise let container scroll naturally
    if (!e.ctrlKey && !e.metaKey) {
      return // Allow normal scrolling/panning
    }

    e.preventDefault()
    e.stopPropagation()

    // Step through zoom levels rather than continuous zoom
    const direction = e.deltaY > 0 ? -1 : 1
    setScale(prev => {
      if (direction > 0) {
        // Zoom in - find next level
        const nextLevel = ZOOM_LEVELS.find(z => z > prev + 0.01)
        return nextLevel || Math.min(prev * 1.1, 3.0)
      } else {
        // Zoom out - find previous level
        const prevLevels = ZOOM_LEVELS.filter(z => z < prev - 0.01)
        return prevLevels.length > 0 ? prevLevels[prevLevels.length - 1] : Math.max(prev * 0.9, MIN_ZOOM)
      }
    })
  }, [setScale])

  // Calculate display size based on zoom (CSS transform)
  const displayWidth = baseViewport ? baseViewport.width * scale : 0
  const displayHeight = baseViewport ? baseViewport.height * scale : 0

  // Error state with detailed guidance
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg p-8 ${className}`}>
        <div className={`inline-flex p-4 rounded-full mb-4 ${
          error.type === 'network' || error.type === 'timeout' ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          <AlertTriangle className={`w-12 h-12 ${
            error.type === 'network' || error.type === 'timeout' ? 'text-yellow-600' : 'text-red-600'
          }`} />
        </div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">{fileName}</h4>
        <p className="text-gray-700 font-medium mb-1">{error.message}</p>
        <p className="text-gray-500 text-sm mb-6 text-center max-w-md">{error.hint}</p>

        {loadAttempt > 0 && (
          <p className="text-xs text-gray-400 mb-4">
            Tried {loadAttempt + 1} time{loadAttempt > 0 ? 's' : ''}
          </p>
        )}

        <div className="flex gap-3">
          {error.canRetry && (
            <button
              onClick={() => loadPdf()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Retry
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <Maximize2 className="w-5 h-5" />
            Open in New Tab
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col bg-gray-100 rounded-lg overflow-hidden h-full ${className}`}>
      {/* Toolbar */}
      {!hideToolbar && (
        <div className="flex-shrink-0 flex items-center justify-between px-2 sm:px-4 py-2 bg-white border-b gap-1">
          {/* Page Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1 || loading}
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
              title="Previous page"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-sm text-gray-600 min-w-[60px] sm:min-w-[80px] text-center font-medium">
              {loading ? '...' : `${pageNumber}/${numPages}`}
            </span>
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages || loading}
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
              title="Next page"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut}
              disabled={scale <= MIN_ZOOM || loading}
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
              title="Zoom out"
            >
              <ZoomOut className="w-6 h-6" />
            </button>
            <select
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              disabled={loading}
              className="h-[44px] px-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {ZOOM_LEVELS.map(level => (
                <option key={level} value={level}>{Math.round(level * 100)}%</option>
              ))}
            </select>
            <button
              onClick={zoomIn}
              disabled={scale >= 3.0 || loading}
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
              title="Zoom in"
            >
              <ZoomIn className="w-6 h-6" />
            </button>
            <button
              onClick={fitToWidth}
              disabled={loading || !pdfDoc}
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
              title="Fit to width"
            >
              <Columns className="w-6 h-6" />
            </button>
            <button
              onClick={fitToPage}
              disabled={loading || !pdfDoc}
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
              title="Fit full page"
            >
              <Maximize className="w-6 h-6" />
            </button>
          </div>

          {/* Quality Indicator - Shows rendering quality */}
          {renderInfo && (
            <div
              className="hidden sm:flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-500 dark:text-gray-400"
              title={`PDF.js Canvas rendering at ${renderInfo.width}x${renderInfo.height}px (${renderInfo.scale.toFixed(1)}x base resolution)`}
            >
              <span className="text-blue-600 font-medium">Canvas</span>
              <span className="text-gray-400">|</span>
              <span className={renderInfo.scale >= 4 ? 'text-green-600' : renderInfo.scale >= 3 ? 'text-yellow-600' : 'text-red-600'}>
                {renderInfo.scale >= 4 ? 'HD' : renderInfo.scale >= 3 ? 'SD' : 'LOW'}
              </span>
              <span className="text-gray-400">|</span>
              <span>{renderInfo.scale.toFixed(1)}x</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={openFullscreen}
              className="min-h-[44px] px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-600 font-medium flex items-center gap-1.5 touch-manipulation sm:bg-transparent sm:hover:bg-gray-100"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5" />
              <span className="text-sm hidden xs:inline sm:hidden">Open</span>
            </button>
            {onDownload && (
              <button
                onClick={onDownload}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center touch-manipulation"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* PDF Content */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto ${compact ? 'p-2' : 'p-4'} bg-gray-200 ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
        style={{
          ...(compact ? {} : { minHeight: '500px' }),
          touchAction: isMobile ? 'none' : 'auto'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {loading && (
          <div className="flex items-center justify-center w-full">
            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <div className="w-full">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Loading PDF...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  {fileSize && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{fileSize}</p>
                  )}
                  {eta && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {eta}
                    </p>
                  )}
                </div>
                {loadAttempt > 0 && (
                  <p className="text-xs text-yellow-600 mt-2 text-center">
                    Retry attempt {loadAttempt + 1}...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && pdfDoc && (
          <div className="inline-block relative" style={{ minWidth: '100%', textAlign: 'center' }}>
            <div className="shadow-lg bg-white inline-block">
              {/* Canvas rendering (PDF.js) */}
              <canvas
                ref={canvasRef}
                className="block"
                style={{
                  width: displayWidth || 'auto',
                  height: displayHeight || 'auto',
                }}
              />

              {/* Loading overlay while rendering */}
              {rendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              )}
            </div>

            {/* Mobile hint */}
            {isMobile && showMobileHint && (
              <div
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-full pointer-events-none sm:hidden"
                style={{ opacity: 0.9 }}
              >
                Drag to pan - Use buttons to zoom
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
