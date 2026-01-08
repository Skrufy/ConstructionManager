'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  Search,
  ChevronDown,
  ChevronRight,
  Building2,
  Loader2,
  AlertCircle,
  Eye,
  Layers,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react'
import { getFileDisplayUrl } from '@/components/ui/file-display'
import { DrawingViewer } from '@/components/drawings/drawing-viewer'

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
  // Verification fields
  isVerified: boolean
  isLatestRevision: boolean
  hasOcrMetadata: boolean
  annotationCount: number
}

interface ProjectGroup {
  id: string
  name: string
  drawingCount: number
}

// Discipline display order and colors
const DISCIPLINES = [
  { value: 'CIVIL', label: 'Civil', shortLabel: 'C', color: 'amber' },
  { value: 'ARCHITECTURAL', label: 'Architectural', shortLabel: 'A', color: 'blue' },
  { value: 'STRUCTURAL', label: 'Structural', shortLabel: 'S', color: 'red' },
  { value: 'MECHANICAL', label: 'Mechanical', shortLabel: 'M', color: 'green' },
  { value: 'ELECTRICAL', label: 'Electrical', shortLabel: 'E', color: 'yellow' },
  { value: 'PLUMBING', label: 'Plumbing', shortLabel: 'P', color: 'cyan' },
  { value: 'FIRE_PROTECTION', label: 'Fire Protection', shortLabel: 'FP', color: 'orange' },
  { value: 'LANDSCAPE', label: 'Landscape', shortLabel: 'L', color: 'emerald' },
  { value: 'ORIGINAL', label: 'Original Plans', shortLabel: 'OP', color: 'purple' },
]

// Get discipline order for sorting
const getDisciplineOrder = (discipline: string | null): number => {
  if (!discipline) return 999
  const index = DISCIPLINES.findIndex(d => d.value === discipline)
  return index === -1 ? 999 : index
}

// Get discipline display info
const getDisciplineInfo = (discipline: string | null) => {
  const found = DISCIPLINES.find(d => d.value === discipline)
  return found || { value: discipline || 'OTHER', label: discipline || 'Other', shortLabel: '?', color: 'gray' }
}

// Discipline badge colors (static for Tailwind purging)
const DISCIPLINE_COLORS: Record<string, string> = {
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700',
  cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-700',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700',
  gray: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
}

// Natural sort for drawing numbers (A-101, A-102, etc.)
function naturalSort(a: string | null, b: string | null): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  return collator.compare(a, b)
}

type SortField = 'drawingNumber' | 'title' | 'discipline' | 'revision' | 'createdAt'
type SortDirection = 'asc' | 'desc'

// Loading timeout to prevent infinite loading states
const LOADING_TIMEOUT_MS = 15000 // 15 seconds

export default function DrawingsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [projects, setProjects] = useState<ProjectGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingTimedOut, setLoadingTimedOut] = useState(false)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fetchAttemptRef = useRef(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('')
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)

  // Sorting
  const [sortField, setSortField] = useState<SortField>('drawingNumber')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Expanded projects for grouping
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  // Viewer state
  const [viewerDrawing, setViewerDrawing] = useState<Drawing | null>(null)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)

  const fetchDrawings = useCallback(async (isRetry = false) => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }

    try {
      setLoading(true)
      setError(null)
      setLoadingTimedOut(false)
      fetchAttemptRef.current += 1

      // Set loading timeout
      loadingTimeoutRef.current = setTimeout(() => {
        setLoadingTimedOut(true)
        setLoading(false)
        setError('Loading is taking longer than expected. You may need to refresh the page.')
      }, LOADING_TIMEOUT_MS)

      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (selectedProject) params.set('projectId', selectedProject)
      if (selectedDiscipline) params.set('discipline', selectedDiscipline)
      // Add cache-busting param on retry to bypass service worker cache
      if (isRetry) params.set('_t', Date.now().toString())

      const response = await fetch(`/api/drawings?${params.toString()}`, {
        // Ensure fresh data, bypass cache
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Failed to fetch drawings')

      const data = await response.json()

      // Clear timeout on success
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }

      setDrawings(data.drawings || [])
      setProjects(data.projects || [])
      setLoadingTimedOut(false)

      // Auto-expand all projects on initial load
      if (expandedProjects.size === 0 && data.drawings?.length > 0) {
        const projectIds = [...new Set(data.drawings.map((d: Drawing) => d.project.id))]
        setExpandedProjects(new Set(projectIds as string[]))
      }
    } catch (err) {
      console.error('Error fetching drawings:', err)
      setError('Failed to load drawings')
      // Clear timeout on error
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedProject, selectedDiscipline])

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [])

  // Wait for auth to be ready before fetching
  useEffect(() => {
    // Don't fetch while auth is still loading
    if (sessionStatus === 'loading') {
      return
    }
    fetchDrawings()
  }, [fetchDrawings, sessionStatus])

  // Retry function with cache bypass
  const handleRetry = useCallback(() => {
    fetchDrawings(true)
  }, [fetchDrawings])

  // Sort and filter drawings
  const sortedDrawings = useMemo(() => {
    let filtered = [...drawings]

    // Apply verified filter
    if (showVerifiedOnly) {
      filtered = filtered.filter(d => d.isVerified)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'drawingNumber':
          comparison = naturalSort(a.drawingNumber, b.drawingNumber)
          break
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '')
          break
        case 'discipline':
          comparison = getDisciplineOrder(a.subcategory) - getDisciplineOrder(b.subcategory)
          break
        case 'revision':
          comparison = (a.revisionNumber || '').localeCompare(b.revisionNumber || '')
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [drawings, sortField, sortDirection, showVerifiedOnly])

  // Group by project
  const groupedByProject = useMemo(() => {
    const groups: Record<string, { project: Drawing['project']; drawings: Drawing[] }> = {}

    for (const drawing of sortedDrawings) {
      const projectId = drawing.project.id
      if (!groups[projectId]) {
        groups[projectId] = { project: drawing.project, drawings: [] }
      }
      groups[projectId].drawings.push(drawing)
    }

    return groups
  }, [sortedDrawings])

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const openViewer = async (drawing: Drawing) => {
    setViewerDrawing(drawing)
    setViewerLoading(true)

    try {
      const url = await getFileDisplayUrl(drawing.id, drawing.fileUrl)
      setViewerUrl(url)
    } catch (err) {
      console.error('Error getting file URL:', err)
      setViewerUrl(drawing.fileUrl)
    } finally {
      setViewerLoading(false)
    }
  }

  const closeViewer = () => {
    setViewerDrawing(null)
    setViewerUrl(null)
  }

  // Stats
  const stats = useMemo(() => {
    const total = drawings.length
    const verified = drawings.filter(d => d.isVerified).length
    const withAnnotations = drawings.filter(d => d.annotationCount > 0).length
    return { total, verified, withAnnotations }
  }, [drawings])

  // Show loading state with timeout protection
  if ((loading || sessionStatus === 'loading') && drawings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          {loadingTimedOut ? (
            <>
              <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-700 dark:text-gray-300 mb-2">Loading is taking longer than expected</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">This could be a network issue or cached data conflict.</p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </>
          ) : (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading drawings...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Drawings</h1>
              <p className="text-indigo-100">
                {stats.total} drawings • {stats.verified} verified
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.verified}</p>
              <p className="text-xs text-indigo-200">Verified</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.withAnnotations}</p>
              <p className="text-xs text-indigo-200">With Notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/70 text-red-800 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by drawing number, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          {/* Project filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.drawingCount})
              </option>
            ))}
          </select>

          {/* Discipline filter */}
          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Disciplines</option>
            {DISCIPLINES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          {/* Verified only toggle */}
          <button
            onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
              showVerifiedOnly
                ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <CheckCircle2 className="h-5 w-5" />
            <span className="hidden sm:inline">Verified Only</span>
          </button>
        </div>
      </div>

      {/* Drawings List */}
      {Object.keys(groupedByProject).length === 0 ? (
        <div className="card p-12 text-center">
          <Layers className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No drawings found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || selectedProject || selectedDiscipline || showVerifiedOnly
              ? 'Try adjusting your filters'
              : 'Upload drawings from the Documents page within a project'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByProject).map(([projectId, { project, drawings: projectDrawings }]) => {
            const isExpanded = expandedProjects.has(projectId)

            return (
              <div key={projectId} className="card overflow-hidden">
                {/* Project Header */}
                <button
                  onClick={() => toggleProject(projectId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{project.name}</h3>
                      {project.address && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{project.address}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-sm font-medium">
                      {projectDrawings.length} drawing{projectDrawings.length !== 1 ? 's' : ''}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Drawings Table */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => toggleSort('drawingNumber')}
                        className="col-span-2 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        Drawing #
                        {sortField === 'drawingNumber' && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleSort('title')}
                        className="col-span-3 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        Title
                        {sortField === 'title' && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleSort('discipline')}
                        className="col-span-2 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        Discipline
                        {sortField === 'discipline' && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </button>
                      <div className="col-span-1">Rev</div>
                      <div className="col-span-1">Scale</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-gray-50 dark:divide-gray-700">
                      {projectDrawings.map((drawing) => {
                        const disciplineInfo = getDisciplineInfo(drawing.subcategory)

                        return (
                          <div
                            key={drawing.id}
                            className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors items-center"
                          >
                            {/* Drawing Number */}
                            <div className="md:col-span-2">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {drawing.drawingNumber || '-'}
                              </span>
                            </div>

                            {/* Title */}
                            <div className="md:col-span-3">
                              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {drawing.title}
                              </p>
                              {/* Mobile: show discipline inline */}
                              <div className="md:hidden flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${DISCIPLINE_COLORS[disciplineInfo.color]}`}>
                                  {disciplineInfo.shortLabel}
                                </span>
                                {drawing.revisionNumber && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Rev {drawing.revisionNumber}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Discipline */}
                            <div className="hidden md:block md:col-span-2">
                              <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${DISCIPLINE_COLORS[disciplineInfo.color]}`}>
                                {disciplineInfo.label}
                              </span>
                            </div>

                            {/* Revision */}
                            <div className="hidden md:block md:col-span-1">
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {drawing.revisionNumber || '-'}
                              </span>
                            </div>

                            {/* Scale */}
                            <div className="hidden md:block md:col-span-1">
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {drawing.scale || '-'}
                              </span>
                            </div>

                            {/* Status */}
                            <div className="hidden md:flex md:col-span-1 items-center gap-1">
                              {drawing.isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span className="hidden lg:inline">Verified</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-medium">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span className="hidden lg:inline">Unverified</span>
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="md:col-span-2 flex items-center justify-end gap-2">
                              {drawing.annotationCount > 0 && (
                                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                  <MessageSquare className="h-3 w-3" />
                                  {drawing.annotationCount}
                                </span>
                              )}
                              <button
                                onClick={() => openViewer(drawing)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">View</span>
                              </button>
                            </div>

                            {/* Mobile status badge */}
                            <div className="md:hidden flex items-center gap-2 mt-1">
                              {drawing.isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium">
                                  <AlertTriangle className="h-3 w-3" />
                                  Unverified
                                </span>
                              )}
                              {drawing.scale && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Scale: {drawing.scale}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Drawing Viewer Modal with Annotations */}
      {viewerDrawing && viewerUrl && (
        <DrawingViewer
          drawing={viewerDrawing}
          drawings={sortedDrawings}
          viewerUrl={viewerUrl}
          onClose={closeViewer}
          onNavigate={(drawing) => openViewer(drawing)}
        />
      )}

      {/* Loading overlay for viewer */}
      {viewerDrawing && viewerLoading && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      )}
    </div>
  )
}
