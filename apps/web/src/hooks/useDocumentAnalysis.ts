'use client'

import { useState, useCallback } from 'react'

export interface ExtractedDocumentData {
  projectMatch?: {
    id: string
    name: string
    confidence: number
  }
  drawingInfo?: {
    drawingNumber?: string
    sheetNumber?: string
    sheetTitle?: string
    revision?: string
    scale?: string
    discipline?: string
  }
  locationInfo?: {
    building?: string
    floor?: string
    zone?: string
    room?: string
  }
  dates?: {
    documentDate?: string
    revisionDate?: string
    approvalDate?: string
  }
  rawText?: string
  error?: string
}

// Multi-page extraction result from API
interface MultiPageExtractionResult {
  pageCount: number
  pages: Array<{ pageNumber: number; data: ExtractedDocumentData }>
  summary?: {
    projectMatch?: ExtractedDocumentData['projectMatch']
    uniqueDrawings: string[]
    sheetTitles: string[]
    disciplines: string[]
  }
  error?: string
}

/**
 * Convert multi-page extraction result to a single ExtractedDocumentData
 * Uses the summary data and combines info from pages
 */
function convertMultiPageToSingle(multiPageResult: MultiPageExtractionResult): ExtractedDocumentData {
  if (multiPageResult.error) {
    return { error: multiPageResult.error }
  }

  // Use summary data as primary source
  const summary = multiPageResult.summary
  const pages = multiPageResult.pages || []

  // Find first page with valid drawing info
  const firstPageWithDrawing = pages.find(p =>
    p.data?.drawingInfo?.drawingNumber || p.data?.drawingInfo?.sheetTitle
  )
  const firstPage = pages[0]?.data

  // Build combined result
  const result: ExtractedDocumentData = {}

  // Project match from summary (highest confidence across all pages)
  if (summary?.projectMatch) {
    result.projectMatch = summary.projectMatch
  }

  // Drawing info - use summary for lists, first page for specific details
  const firstDrawingInfo = firstPageWithDrawing?.data?.drawingInfo
  if (summary?.uniqueDrawings?.length || summary?.disciplines?.length || firstDrawingInfo) {
    result.drawingInfo = {
      // Use first drawing number found, or indicate multiple
      drawingNumber: firstDrawingInfo?.drawingNumber ||
        (summary?.uniqueDrawings?.length === 1 ? summary.uniqueDrawings[0] :
          summary?.uniqueDrawings?.length ? `${summary.uniqueDrawings.length} drawings` : undefined),
      sheetTitle: firstDrawingInfo?.sheetTitle ||
        (summary?.sheetTitles?.length === 1 ? summary.sheetTitles[0] :
          summary?.sheetTitles?.length ? `${summary.sheetTitles.length} sheets` : undefined),
      discipline: firstDrawingInfo?.discipline ||
        (summary?.disciplines?.length === 1 ? summary.disciplines[0] :
          summary?.disciplines?.length ? summary.disciplines.join(', ') : undefined),
      revision: firstDrawingInfo?.revision,
      scale: firstDrawingInfo?.scale
    }
  }

  // Location info from first page that has it
  const pageWithLocation = pages.find(p =>
    p.data?.locationInfo && Object.values(p.data.locationInfo).some(v => v)
  )
  if (pageWithLocation?.data?.locationInfo) {
    result.locationInfo = pageWithLocation.data.locationInfo
  }

  // Dates from first page that has it
  const pageWithDates = pages.find(p =>
    p.data?.dates && Object.values(p.data.dates).some(v => v)
  )
  if (pageWithDates?.data?.dates) {
    result.dates = pageWithDates.data.dates
  }

  // Raw text from first page
  if (firstPage?.rawText) {
    result.rawText = firstPage.rawText
  }

  return result
}

export interface AnalysisResult {
  loading: boolean
  data: ExtractedDocumentData | null
  error: string | null
}

/**
 * Hook to analyze documents using OCR
 */
export function useDocumentAnalysis() {
  const [analysisCache, setAnalysisCache] = useState<Map<string, AnalysisResult>>(new Map())
  const [ocrEnabled, setOcrEnabled] = useState<boolean | null>(null)

  // Check if OCR is enabled
  const checkOcrEnabled = useCallback(async () => {
    if (ocrEnabled !== null) return ocrEnabled

    try {
      const response = await fetch('/api/settings/org')
      if (response.ok) {
        const data = await response.json()
        setOcrEnabled(data.settings?.ocrEnabled ?? true)
        return data.settings?.ocrEnabled ?? true
      } else {
        console.warn('[DocumentAnalysis] Failed to fetch OCR settings:', response.status)
      }
    } catch (error) {
      // Log the error instead of silently swallowing it
      console.warn('[DocumentAnalysis] Error fetching OCR settings, defaulting to enabled:', error)
    }
    // Default to enabled if can't fetch settings
    setOcrEnabled(true)
    return true
  }, [ocrEnabled])

  // Analyze a single file
  const analyzeFile = useCallback(async (
    file: File,
    projectId?: string,
    mode: 'single' | 'all-pages' = 'single'
  ): Promise<ExtractedDocumentData | null> => {
    // Check if OCR is enabled
    const enabled = await checkOcrEnabled()
    if (!enabled) {
      return null
    }

    // Check cache
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`
    const cached = analysisCache.get(cacheKey)
    if (cached && cached.data) {
      return cached.data
    }

    // Only analyze PDFs and images
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ]

    if (!supportedTypes.includes(file.type)) {
      return null
    }

    // Mark as loading
    setAnalysisCache(prev => new Map(prev).set(cacheKey, {
      loading: true,
      data: null,
      error: null
    }))

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (projectId) {
        formData.append('projectId', projectId)
      }
      formData.append('mode', mode)

      const response = await fetch('/api/documents/analyze', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const result = await response.json()
      console.log('[DocumentAnalysis] API response:', { mode: result.mode, success: result.success, hasData: !!result.data })

      if (result.success && result.data && !result.data.error) {
        // Handle different response structures based on mode
        let extractedData: ExtractedDocumentData

        if (result.mode === 'all-pages') {
          // Convert multi-page result to single ExtractedDocumentData format
          extractedData = convertMultiPageToSingle(result.data as MultiPageExtractionResult)
          console.log('[DocumentAnalysis] Converted multi-page result:', {
            pageCount: result.data.pageCount,
            hasPages: !!result.data.pages?.length,
            hasSummary: !!result.data.summary,
            converted: extractedData
          })
        } else {
          // Single page mode - data is already ExtractedDocumentData
          extractedData = result.data
        }

        // Check if we actually got any data
        if (extractedData.error) {
          setAnalysisCache(prev => new Map(prev).set(cacheKey, {
            loading: false,
            data: null,
            error: extractedData.error || 'Analysis failed'
          }))
          return null
        }

        setAnalysisCache(prev => new Map(prev).set(cacheKey, {
          loading: false,
          data: extractedData,
          error: null
        }))
        return extractedData
      } else {
        const errorMsg = result.data?.error || 'Analysis failed'
        setAnalysisCache(prev => new Map(prev).set(cacheKey, {
          loading: false,
          data: null,
          error: errorMsg
        }))
        return null
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Analysis failed'
      setAnalysisCache(prev => new Map(prev).set(cacheKey, {
        loading: false,
        data: null,
        error: errorMsg
      }))
      return null
    }
  }, [analysisCache, checkOcrEnabled])

  // Get analysis status for a file
  const getAnalysisStatus = useCallback((file: File): AnalysisResult => {
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`
    return analysisCache.get(cacheKey) || { loading: false, data: null, error: null }
  }, [analysisCache])

  // Clear analysis cache
  const clearCache = useCallback(() => {
    setAnalysisCache(new Map())
  }, [])

  return {
    analyzeFile,
    getAnalysisStatus,
    clearCache,
    ocrEnabled
  }
}
