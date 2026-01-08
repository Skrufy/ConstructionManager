'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  FileText,
  Check,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Save,
  RotateCcw,
  Eye,
  List,
  GripVertical,
  RefreshCw,
  GitBranch,
  FilePlus
} from 'lucide-react'
import { PDFViewer } from './pdf-viewer'
import { COMMON_SCALES } from '@/lib/services/pdf-utils'

interface PageData {
  pageNumber: number
  thumbnailPath: string | null
  drawingNumber: string | null
  sheetTitle: string | null
  discipline: string | null
  revision: string | null
  scale: string | null
  confidence: number
  verified: boolean
  skipped: boolean
}

interface ExistingDrawingMatch {
  fileId: string
  fileName: string
  drawingNumber: string
  currentVersion: number
  currentRevision: string | null
  uploadedAt: string
  matchedPageNumbers: number[]
}

interface RevisionMapping {
  pageNumber: number
  existingFileId: string
}

interface Draft {
  id: string
  projectId: string
  projectName: string
  originalFileId: string
  originalFileName: string
  status: string
  totalPages: number
  verifiedCount: number
  pages: PageData[]
  createdAt: string
  updatedAt: string
}

interface DocumentSplitModalProps {
  draft: Draft
  onClose: () => void
  onUpdatePages: (pages: PageData[]) => Promise<void>
  onConfirm: (revisionMappings?: RevisionMapping[], draftId?: string) => Promise<void>
  onDiscard?: () => void
  loading?: boolean
  pdfUrl?: string // Signed URL for PDF preview
}

const DISCIPLINES = [
  { value: 'CIVIL', label: 'Civil (C)' },
  { value: 'ARCHITECTURAL', label: 'Architectural (A)' },
  { value: 'STRUCTURAL', label: 'Structural (S)' },
  { value: 'MECHANICAL', label: 'Mechanical (M)' },
  { value: 'ELECTRICAL', label: 'Electrical (E)' },
  { value: 'PLUMBING', label: 'Plumbing (P)' },
  { value: 'LANDSCAPE', label: 'Landscape (L)' },
  { value: 'FIRE_PROTECTION', label: 'Fire Protection (FP)' },
  { value: 'ORIGINAL', label: 'Original Plans (OP)' },
  { value: 'GENERAL', label: 'General (G)' },
  { value: '', label: 'Unknown' },
]

export function DocumentSplitModal({
  draft,
  onClose,
  onUpdatePages,
  onConfirm,
  onDiscard,
  loading = false,
  pdfUrl
}: DocumentSplitModalProps) {
  // Ensure pages is always an array
  const initialPages = Array.isArray(draft?.pages) ? draft.pages : []
  const [pages, setPages] = useState<PageData[]>(initialPages)
  const [editingPage, setEditingPage] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [expandedPage, setExpandedPage] = useState<number | null>(null)

  // Preview mode state
  const [viewMode, setViewMode] = useState<'list' | 'preview'>(pdfUrl ? 'preview' : 'list')
  const [currentPageIndex, setCurrentPageIndex] = useState(0)

  // Draggable panel state
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  // Revision detection state
  const [revisionMatches, setRevisionMatches] = useState<ExistingDrawingMatch[]>([])
  const [revisionMappings, setRevisionMappings] = useState<Map<number, string>>(new Map())
  const [checkingRevisions, setCheckingRevisions] = useState(false)
  const [showRevisionPanel, setShowRevisionPanel] = useState(false)

  // Calculate stats
  const verifiedCount = pages.filter(p => p.verified && !p.skipped).length
  const skippedCount = pages.filter(p => p.skipped).length
  const needsReviewCount = pages.filter(p => !p.verified && !p.skipped && p.confidence < 0.7).length
  const disciplines = [...new Set(pages.filter(p => p.discipline && !p.skipped).map(p => p.discipline))]
  const pagesAsRevisions = revisionMappings.size

  // Check for revision matches when modal opens or pages with drawing numbers change
  useEffect(() => {
    const checkForRevisions = async () => {
      // Only check if we have pages with drawing numbers
      const pagesWithDrawingNumbers = pages.filter(p => p.drawingNumber && !p.skipped)
      if (pagesWithDrawingNumbers.length === 0) {
        setRevisionMatches([])
        return
      }

      setCheckingRevisions(true)
      try {
        const response = await fetch(`/api/documents/split/${draft.id}/check-revisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        if (response.ok) {
          const data = await response.json()
          setRevisionMatches(data.matches || [])
          // Show revision panel if matches found
          if (data.matches?.length > 0) {
            setShowRevisionPanel(true)
          }
        }
      } catch (error) {
        console.error('[DocumentSplitModal] Error checking revisions:', error)
      } finally {
        setCheckingRevisions(false)
      }
    }

    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(checkForRevisions, 500)
    return () => clearTimeout(timeoutId)
  }, [draft.id, pages.map(p => p.drawingNumber).join(',')])

  // Update a single page
  const updatePage = (pageNumber: number, updates: Partial<PageData>) => {
    setPages(prev => prev.map(p =>
      p.pageNumber === pageNumber ? { ...p, ...updates } : p
    ))
  }

  // Toggle revision mapping for a page
  const toggleRevisionMapping = (pageNumber: number, existingFileId: string) => {
    setRevisionMappings(prev => {
      const next = new Map(prev)
      if (next.get(pageNumber) === existingFileId) {
        next.delete(pageNumber)
      } else {
        next.set(pageNumber, existingFileId)
      }
      return next
    })
  }

  // Mark all matched pages as revisions
  const markAllAsRevisions = () => {
    const newMappings = new Map<number, string>()
    for (const match of revisionMatches) {
      for (const pageNumber of match.matchedPageNumbers) {
        newMappings.set(pageNumber, match.fileId)
      }
    }
    setRevisionMappings(newMappings)
  }

  // Clear all revision mappings
  const clearRevisionMappings = () => {
    setRevisionMappings(new Map())
  }

  // Check if a page is marked as a revision
  const isPageMarkedAsRevision = (pageNumber: number) => revisionMappings.has(pageNumber)

  // Toggle verified status (auto-advance in preview mode)
  const toggleVerified = (pageNumber: number) => {
    const page = pages.find(p => p.pageNumber === pageNumber)
    const wasVerified = page?.verified
    updatePage(pageNumber, { verified: !wasVerified })

    // Auto-advance to next unverified page in preview mode
    if (!wasVerified && viewMode === 'preview') {
      // Find next unverified, non-skipped page
      const nextUnverifiedIndex = pages.findIndex((p, idx) =>
        idx > currentPageIndex && !p.verified && !p.skipped
      )
      if (nextUnverifiedIndex !== -1) {
        setCurrentPageIndex(nextUnverifiedIndex)
      } else {
        // Check if there are any unverified pages before current
        const prevUnverifiedIndex = pages.findIndex(p => !p.verified && !p.skipped)
        if (prevUnverifiedIndex !== -1 && prevUnverifiedIndex !== currentPageIndex) {
          setCurrentPageIndex(prevUnverifiedIndex)
        }
        // If all verified, stay on current page
      }
    }
  }

  // Toggle skipped status (auto-advance in preview mode)
  const toggleSkipped = (pageNumber: number) => {
    const page = pages.find(p => p.pageNumber === pageNumber)
    const wasSkipped = page?.skipped
    updatePage(pageNumber, { skipped: !wasSkipped, verified: false })

    // Auto-advance to next page in preview mode when skipping
    if (!wasSkipped && viewMode === 'preview') {
      const nextIndex = pages.findIndex((p, idx) =>
        idx > currentPageIndex && !p.skipped
      )
      if (nextIndex !== -1) {
        setCurrentPageIndex(nextIndex)
      }
    }
  }

  // Verify all pages
  const verifyAll = () => {
    setPages(prev => prev.map(p => ({ ...p, verified: !p.skipped })))
  }

  // Preview mode navigation
  const currentPage = pages[currentPageIndex]
  const goToPrevPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.max(0, prev - 1))
  }, [])
  const goToNextPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1))
  }, [pages.length])

  // Keyboard navigation for preview mode
  useEffect(() => {
    if (viewMode !== 'preview') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        goToPrevPage()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        goToNextPage()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (currentPage && !currentPage.skipped) {
          toggleVerified(currentPage.pageNumber)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, goToPrevPage, goToNextPage, currentPage])

  // Drag handlers for floating panel
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartPos.current = {
      x: e.clientX - panelPosition.x,
      y: e.clientY - panelPosition.y
    }
  }, [panelPosition])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStartPos.current.x
      const newY = e.clientY - dragStartPos.current.y

      // Constrain to viewport bounds (with some padding)
      const panel = panelRef.current
      if (panel) {
        const rect = panel.getBoundingClientRect()
        const maxX = window.innerWidth - rect.width - 16
        const maxY = window.innerHeight - rect.height - 16
        const minX = -(window.innerWidth - rect.width - 32)
        const minY = -(window.innerHeight - rect.height - 32)

        setPanelPosition({
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY))
        })
      } else {
        setPanelPosition({ x: newX, y: newY })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Reset panel position when switching to list mode
  useEffect(() => {
    if (viewMode === 'list') {
      setPanelPosition({ x: 0, y: 0 })
    }
  }, [viewMode])

  // Save progress
  const handleSaveProgress = async () => {
    setSaving(true)
    try {
      await onUpdatePages(pages)
    } finally {
      setSaving(false)
    }
  }

  // Confirm and split - closes modal immediately, processes in background
  const handleConfirm = async () => {
    // First save current state
    setSaving(true)
    try {
      await onUpdatePages(pages)
    } catch (error) {
      console.error('Failed to save pages:', error)
      setSaving(false)
      return // Don't proceed if save fails
    }
    setSaving(false)

    // Convert revision mappings Map to array
    const mappingsArray: RevisionMapping[] = []
    revisionMappings.forEach((existingFileId, pageNumber) => {
      mappingsArray.push({ pageNumber, existingFileId })
    })

    // Close modal immediately - processing will happen in background
    // The parent component handles the async processing and notifications
    setConfirming(true)
    onClose() // Close modal right away

    // Fire off the confirmation (parent handles background processing)
    // Pass draft.id since activeDraft will be null after onClose clears it
    onConfirm(mappingsArray.length > 0 ? mappingsArray : undefined, draft.id).catch(error => {
      console.error('Split confirmation failed:', error)
    })
  }

  const isLoading = loading || saving || confirming

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className={`bg-white rounded-xl shadow-2xl w-full flex flex-col ${
        viewMode === 'preview' ? 'max-w-[95vw] h-[95vh]' : 'max-w-4xl max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold">Document Set Analysis</h2>
            <p className="text-blue-100 text-sm">
              {draft.originalFileName} • {draft.totalPages} pages
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            {pdfUrl && (
              <div className="flex bg-white/20 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    viewMode === 'preview' ? 'bg-white text-blue-700' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    viewMode === 'list' ? 'bg-white text-blue-700' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Summary Bar - hidden in preview mode for more space */}
        {viewMode === 'list' && (
          <>
            <div className="p-4 bg-gray-50 border-b grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{draft.totalPages}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Pages</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Verified</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{needsReviewCount}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Need Review</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{skippedCount}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Skipped</p>
              </div>
            </div>

            {/* Disciplines Summary */}
            {disciplines.length > 0 && (
              <div className="px-4 py-2 bg-blue-50 border-b flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-blue-800">Disciplines:</span>
                {disciplines.map(d => (
                  <span key={d} className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded text-xs font-medium">
                    {d}
                  </span>
                ))}
              </div>
            )}

            {/* Revision Detection Panel */}
            {(revisionMatches.length > 0 || checkingRevisions) && (
              <div className="border-b">
                <button
                  onClick={() => setShowRevisionPanel(!showRevisionPanel)}
                  className="w-full px-4 py-3 bg-amber-50 flex items-center justify-between hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {checkingRevisions ? (
                      <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
                    ) : (
                      <GitBranch className="h-5 w-5 text-amber-600" />
                    )}
                    <span className="font-medium text-amber-900">
                      {checkingRevisions
                        ? 'Checking for existing drawings...'
                        : `${revisionMatches.length} existing drawing${revisionMatches.length === 1 ? '' : 's'} found`
                      }
                    </span>
                    {pagesAsRevisions > 0 && (
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded text-xs font-medium">
                        {pagesAsRevisions} marked as revision{pagesAsRevisions === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  {!checkingRevisions && (
                    showRevisionPanel ? <ChevronUp className="h-5 w-5 text-amber-600" /> : <ChevronDown className="h-5 w-5 text-amber-600" />
                  )}
                </button>

                {showRevisionPanel && !checkingRevisions && (
                  <div className="p-4 bg-amber-50/50 border-t border-amber-200">
                    <p className="text-sm text-amber-800 mb-3">
                      These pages match existing drawings in your project. You can update them as new revisions instead of creating duplicates.
                    </p>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={markAllAsRevisions}
                        className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Mark All as Revisions
                      </button>
                      <button
                        onClick={clearRevisionMappings}
                        disabled={pagesAsRevisions === 0}
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <FilePlus className="h-4 w-4" />
                        Create All as New
                      </button>
                    </div>

                    {/* Match List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {revisionMatches.map(match => (
                        <div key={match.fileId} className="bg-white rounded-lg border border-amber-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{match.drawingNumber}</p>
                              <p className="text-xs text-gray-500 truncate">{match.fileName}</p>
                              <p className="text-xs text-gray-400">
                                Current: v{match.currentVersion}{match.currentRevision ? ` (Rev ${match.currentRevision})` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Pages: {match.matchedPageNumbers.join(', ')}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {match.matchedPageNumbers.map(pageNum => {
                              const isMarked = revisionMappings.get(pageNum) === match.fileId
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => toggleRevisionMapping(pageNum, match.fileId)}
                                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    isMarked
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  Page {pageNum} {isMarked ? '✓ Revision' : '→ New'}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Preview Mode - Full Page Layout with Floating Panel */}
        {viewMode === 'preview' && pdfUrl && currentPage && (
          <div className="flex-1 relative overflow-hidden">
            {/* Full-page PDF Viewer */}
            <PDFViewer
              url={pdfUrl}
              fileName={draft.originalFileName}
              externalPage={currentPage.pageNumber}
              onPageChange={(page) => {
                const idx = pages.findIndex(p => p.pageNumber === page)
                if (idx !== -1) setCurrentPageIndex(idx)
              }}
              className="absolute inset-0"
            />

            {/* Floating OCR Data Panel - Draggable */}
            <div
              ref={panelRef}
              className={`absolute bottom-4 right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden transition-shadow ${
                isDragging ? 'shadow-2xl ring-2 ring-blue-400' : ''
              }`}
              style={{
                transform: `translate(${panelPosition.x}px, ${panelPosition.y}px)`,
                cursor: isDragging ? 'grabbing' : 'default'
              }}
            >
              {/* Drag Handle */}
              <div
                onMouseDown={handleDragStart}
                className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 cursor-grab active:cursor-grabbing z-10 group"
                title="Drag to move panel"
              >
                <div className="flex items-center gap-0.5 text-gray-400 group-hover:text-gray-600 transition-colors">
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>

              {/* Panel Header */}
              <div className={`px-4 py-3 border-b pt-6 ${
                currentPage.verified
                  ? 'bg-emerald-50 border-emerald-200'
                  : currentPage.skipped
                  ? 'bg-gray-100 border-gray-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      Page {currentPage.pageNumber}/{pages.length}
                    </span>
                    {currentPage.verified && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">
                        ✓ Verified
                      </span>
                    )}
                    {currentPage.skipped && (
                      <span className="px-2 py-0.5 bg-gray-500 text-white text-xs font-medium rounded-full">
                        Skipped
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    currentPage.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                    currentPage.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {Math.round(currentPage.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Drawing #</label>
                    <input
                      type="text"
                      value={currentPage.drawingNumber || ''}
                      onChange={(e) => updatePage(currentPage.pageNumber, { drawingNumber: e.target.value })}
                      className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="C0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Discipline</label>
                    <select
                      value={currentPage.discipline || ''}
                      onChange={(e) => updatePage(currentPage.pageNumber, { discipline: e.target.value || null })}
                      className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {DISCIPLINES.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sheet Title</label>
                  <input
                    type="text"
                    value={currentPage.sheetTitle || ''}
                    onChange={(e) => updatePage(currentPage.pageNumber, { sheetTitle: e.target.value })}
                    className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Cover Sheet"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Revision</label>
                    <input
                      type="text"
                      value={currentPage.revision || ''}
                      onChange={(e) => updatePage(currentPage.pageNumber, { revision: e.target.value })}
                      className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Rev A"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Scale</label>
                    <div className="relative">
                      <select
                        value={currentPage.scale || ''}
                        onChange={(e) => {
                          updatePage(currentPage.pageNumber, { scale: e.target.value || null })
                        }}
                        className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                      >
                        <option value="">Select scale...</option>
                        {/* OCR-detected scale first if present */}
                        {currentPage.scale && !COMMON_SCALES.includes(currentPage.scale) && (
                          <option value={currentPage.scale}>{currentPage.scale} (detected)</option>
                        )}
                        <optgroup label="Common Scales">
                          {COMMON_SCALES.slice(0, 15).map((scale, idx) => (
                            <option key={`common-${idx}`} value={scale}>{scale}</option>
                          ))}
                        </optgroup>
                        <optgroup label="More Scales">
                          {COMMON_SCALES.slice(15).map((scale, idx) => (
                            <option key={`more-${idx}`} value={scale}>{scale}</option>
                          ))}
                        </optgroup>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPageIndex === 0}
                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  <button
                    onClick={() => toggleSkipped(currentPage.pageNumber)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                      currentPage.skipped
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {currentPage.skipped ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    {currentPage.skipped ? 'Restore' : 'Skip'}
                  </button>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPageIndex === pages.length - 1}
                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    const isLastPage = currentPageIndex === pages.length - 1
                    if (!currentPage.verified) {
                      toggleVerified(currentPage.pageNumber)
                      // If it's the last page and now verified, trigger confirm
                      if (isLastPage) {
                        // Small delay to let state update, then confirm
                        setTimeout(() => handleConfirm(), 100)
                      }
                    } else if (isLastPage) {
                      // Already verified and on last page - confirm and split
                      handleConfirm()
                    } else {
                      goToNextPage()
                    }
                  }}
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    currentPageIndex === pages.length - 1 && currentPage.verified
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : currentPage.verified
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                  {currentPageIndex === pages.length - 1
                    ? (currentPage.verified ? 'Confirm & Split' : 'Verify & Split')
                    : (currentPage.verified ? 'Next Page →' : 'Confirm & Next →')
                  }
                </button>
              </div>

              {/* Progress Bar */}
              <div className="px-3 pb-3 bg-gray-50">
                <div className="flex gap-0.5">
                  {pages.map((p, idx) => (
                    <button
                      key={p.pageNumber}
                      onClick={() => setCurrentPageIndex(idx)}
                      className={`flex-1 h-1.5 rounded-full transition-colors ${
                        idx === currentPageIndex
                          ? 'bg-blue-500'
                          : p.verified
                          ? 'bg-emerald-500'
                          : p.skipped
                          ? 'bg-gray-400'
                          : 'bg-gray-300'
                      }`}
                      title={`Page ${p.pageNumber}${p.verified ? ' ✓' : p.skipped ? ' (skipped)' : ''}`}
                    />
                  ))}
                </div>
                <div className="text-center mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {verifiedCount} verified • {skippedCount} skipped • {pages.length - verifiedCount - skippedCount} remaining
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List Mode - Pages List */}
        {viewMode === 'list' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {pages.map((page) => (
              <div
                key={page.pageNumber}
                className={`border rounded-lg transition-all ${
                  page.skipped
                    ? 'bg-gray-100 border-gray-200 opacity-60'
                    : page.verified
                    ? 'bg-green-50 border-green-200'
                    : page.confidence < 0.7
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-white border-gray-200'
                }`}
              >
              <div
                className="p-3 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedPage(expandedPage === page.pageNumber ? null : page.pageNumber)}
              >
                {/* Page Number */}
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center font-bold text-gray-600 dark:text-gray-400">
                  {page.pageNumber}
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {page.drawingNumber || `Page ${page.pageNumber}`}
                    </span>
                    {page.discipline && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {page.discipline}
                      </span>
                    )}
                    {page.verified && !page.skipped && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                    {!page.verified && !page.skipped && page.confidence < 0.7 && (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    {isPageMarkedAsRevision(page.pageNumber) && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        Revision
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {page.sheetTitle || 'No title detected'}
                  </p>
                </div>

                {/* Confidence */}
                <div className={`text-sm ${getConfidenceColor(page.confidence)}`}>
                  {Math.round(page.confidence * 100)}%
                </div>

                {/* Expand Icon */}
                {expandedPage === page.pageNumber ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Expanded Edit Form */}
              {expandedPage === page.pageNumber && (
                <div className="px-3 pb-3 pt-1 border-t bg-gray-50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Drawing Number
                      </label>
                      <input
                        type="text"
                        value={page.drawingNumber || ''}
                        onChange={(e) => updatePage(page.pageNumber, { drawingNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., C0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Discipline
                      </label>
                      <select
                        value={page.discipline || ''}
                        onChange={(e) => updatePage(page.pageNumber, { discipline: e.target.value || null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {DISCIPLINES.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sheet Title
                    </label>
                    <input
                      type="text"
                      value={page.sheetTitle || ''}
                      onChange={(e) => updatePage(page.pageNumber, { sheetTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Cover Sheet, Grading Plan"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Revision
                      </label>
                      <input
                        type="text"
                        value={page.revision || ''}
                        onChange={(e) => updatePage(page.pageNumber, { revision: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Rev A"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Scale
                      </label>
                      <div className="relative">
                        <select
                          value={page.scale || ''}
                          onChange={(e) => {
                            updatePage(page.pageNumber, { scale: e.target.value || null })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                        >
                          <option value="">Select scale...</option>
                          {/* OCR-detected scale first if present */}
                          {page.scale && !COMMON_SCALES.includes(page.scale) && (
                            <option value={page.scale}>{page.scale} (detected)</option>
                          )}
                          <optgroup label="Common Scales">
                            {COMMON_SCALES.slice(0, 15).map((scale, idx) => (
                              <option key={`common-${idx}`} value={scale}>{scale}</option>
                            ))}
                          </optgroup>
                          <optgroup label="More Scales">
                            {COMMON_SCALES.slice(15).map((scale, idx) => (
                              <option key={`more-${idx}`} value={scale}>{scale}</option>
                            ))}
                          </optgroup>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => toggleVerified(page.pageNumber)}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                        page.verified
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <Check className="h-4 w-4 inline mr-1" />
                      {page.verified ? 'Verified' : 'Mark Verified'}
                    </button>
                    <button
                      onClick={() => toggleSkipped(page.pageNumber)}
                      className={`py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                        page.skipped
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <Trash2 className="h-4 w-4 inline mr-1" />
                      {page.skipped ? 'Restore' : 'Skip'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between rounded-b-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={verifyAll}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4 inline mr-1" />
              Verify All
            </button>
            {onDiscard && (
              <button
                onClick={onDiscard}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 inline mr-1" />
                Discard Draft
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProgress}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Progress
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {confirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {(() => {
                const totalPages = pages.filter(p => !p.skipped).length
                const revisionCount = pagesAsRevisions
                const newCount = totalPages - revisionCount
                if (revisionCount > 0 && newCount > 0) {
                  return `Confirm (${newCount} new, ${revisionCount} revision${revisionCount === 1 ? '' : 's'})`
                } else if (revisionCount > 0) {
                  return `Confirm (${revisionCount} revision${revisionCount === 1 ? '' : 's'})`
                } else {
                  return `Confirm & Split (${totalPages} pages)`
                }
              })()}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Draft Notification Banner Component
 * Shows pending drafts that need review
 */
interface DraftNotificationProps {
  drafts: Array<{
    id: string
    projectName: string
    originalFileName: string
    totalPages: number
    verifiedCount: number
    updatedAt: string
  }>
  onResume: (draftId: string) => void
  onDiscard: (draftId: string) => void
  loading?: boolean
}

export function DraftNotificationBanner({
  drafts,
  onResume,
  onDiscard,
  loading = false
}: DraftNotificationProps) {
  if (drafts.length === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <FileText className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">
            {drafts.length === 1
              ? 'You have 1 document set pending review'
              : `You have ${drafts.length} document sets pending review`
            }
          </h3>
          <div className="mt-2 space-y-2">
            {drafts.slice(0, 3).map(draft => (
              <div
                key={draft.id}
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{draft.originalFileName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {draft.verifiedCount} of {draft.totalPages} verified •{' '}
                    {draft.projectName} •{' '}
                    {formatTimeAgo(draft.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onResume(draft.id)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Continue'}
                  </button>
                  <button
                    onClick={() => onDiscard(draft.id)}
                    disabled={loading}
                    className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
          {drafts.length > 3 && (
            <p className="text-sm text-blue-700 mt-2">
              And {drafts.length - 3} more...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

/**
 * Split Progress Modal Component
 * Shows progress while OCR is analyzing PDF pages
 */
interface SplitProgressModalProps {
  fileName: string
  onCancel?: () => void
}

export function SplitProgressModal({ fileName, onCancel }: SplitProgressModalProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [dots, setDots] = useState('')

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // Progress steps with animated indicators
  const steps = [
    { label: 'Downloading PDF', delay: 0 },
    { label: 'Counting pages', delay: 2 },
    { label: 'Running OCR analysis', delay: 4 },
    { label: 'Extracting drawing info', delay: 6 },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            {/* Animated scanner effect */}
            <div className="absolute inset-0 bg-blue-100 rounded-lg"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            {/* Scanning line animation */}
            <div
              className="absolute left-0 right-0 h-0.5 bg-blue-500 rounded animate-pulse"
              style={{
                top: `${30 + (elapsedTime % 3) * 20}%`,
                opacity: 0.8
              }}
            />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Analyzing Document</h2>
          <p className="text-sm text-gray-600 mt-1 truncate max-w-xs mx-auto">
            {fileName}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3 mb-6">
          {steps.map((step, idx) => {
            const isActive = elapsedTime >= step.delay
            const isComplete = elapsedTime >= step.delay + 3 && idx < steps.length - 1
            const isCurrent = isActive && !isComplete

            return (
              <div
                key={step.label}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                  isCurrent ? 'bg-blue-50' : isComplete ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-500'
                }`}>
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs">{idx + 1}</span>
                  )}
                </div>
                <span className={`text-sm ${
                  isCurrent ? 'text-blue-700 font-medium' : isComplete ? 'text-green-700' : 'text-gray-500'
                }`}>
                  {step.label}{isCurrent ? dots : ''}
                </span>
              </div>
            )
          })}
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            OCR analysis may take 1-2 minutes for large documents. Please wait.
          </p>
        </div>

        {/* Elapsed Time */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Elapsed time: {formatTime(elapsedTime)}
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
