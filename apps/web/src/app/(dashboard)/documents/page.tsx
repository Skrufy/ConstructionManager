'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from '@/hooks/useSession'
import { uploadFile } from '@/lib/upload-client'
import { useRouter } from 'next/navigation'
import {
  Image,
  FileText,
  Upload,
  Folder,
  Search,
  Grid,
  List,
  Download,
  Trash2,
  Building2,
  Calendar,
  MapPin,
  Loader2,
  History,
  MessageSquare,
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  User,
  FileCode,
  FileSpreadsheet,
  FileImage,
  Film,
  Archive,
  Box,
  Layers,
  PenTool,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Smartphone,
  Scissors,
  CheckCircle2,
  Share2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { FileImage as FileImageDisplay, FileDownloadLink, getFileDisplayUrl } from '@/components/ui/file-display'
import { FileActions } from '@/components/ui/file-actions'
import { PDFViewer } from '@/components/ui/pdf-viewer'
import { useDocumentAnalysis, type ExtractedDocumentData } from '@/hooks/useDocumentAnalysis'
import { useOcrJobs, type OcrJob } from '@/hooks/useOcrJobs'
import { normalizeScale } from '@/lib/services/pdf-utils'
import { OcrSuggestions } from '@/components/ui/ocr-suggestions'
import { DocumentSplitModal, DraftNotificationBanner, SplitProgressModal } from '@/components/ui/document-split-modal'
import { useToast } from '@/components/ui/toast'

interface DocumentRevision {
  id: string
  version: number
  storagePath: string
  changeNotes: string | null
  uploadedBy: string
  createdAt: string
}

interface Annotation {
  id: string
  fileId: string
  annotationType: string
  content: string
  pageNumber: number | null
  createdBy: string
  resolvedAt: string | null
  createdAt: string
}

interface DocumentMetadataInfo {
  discipline: string | null
  drawingNumber: string | null
  sheetTitle: string | null
  revision: string | null
  scale: string | null
  building: string | null
  floor: string | null
  zone: string | null
}

interface Blaster {
  id: string
  name: string
  email: string
}

interface File {
  id: string
  name: string
  type: string
  storagePath: string
  projectId: string
  project: { id: string; name: string; address?: string }
  uploader: { id: string; name: string }
  blasters?: Blaster[]
  createdAt: string
  gpsLatitude?: number
  gpsLongitude?: number
  currentVersion: number
  category: string | null
  description: string | null
  tags: string | null
  pageCount?: number | null
  revisions?: DocumentRevision[]
  metadata?: DocumentMetadataInfo | null
  _count?: {
    revisions: number
    annotations: number
  }
}

interface Project {
  id: string
  name: string
}

// Document categories (excluding DRAWINGS which has its own dedicated page)
const DOCUMENT_CATEGORIES = [
  { value: 'SPECIFICATIONS', label: 'Specifications', color: 'purple' },
  { value: 'CONTRACTS', label: 'Contracts', color: 'green' },
  { value: 'PHOTOS', label: 'Photos', color: 'yellow' },
  { value: 'REPORTS', label: 'Reports', color: 'red' },
  { value: 'BIM', label: 'BIM/3D Models', color: 'indigo' },
  { value: 'BLASTING', label: 'Blasting', color: 'orange' },
  { value: 'OTHER', label: 'Other', color: 'gray' },
]

// Drawing disciplines for grouping
// Disciplines in display order (index used for sorting)
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
  { value: 'OTHER', label: 'Other/General', shortLabel: '?', color: 'gray' },
]

// Get discipline sort order (returns index in DISCIPLINES array)
const getDisciplineOrder = (discipline: string): number => {
  const index = DISCIPLINES.findIndex(d => d.value === discipline)
  return index === -1 ? DISCIPLINES.length : index
}

// Common construction file types
const CONSTRUCTION_FILE_TYPES = {
  // CAD/Drawing files
  dwg: { label: 'AutoCAD Drawing', icon: 'cad', color: 'blue' },
  dxf: { label: 'DXF Drawing', icon: 'cad', color: 'blue' },
  dwf: { label: 'Design Web Format', icon: 'cad', color: 'blue' },
  // BIM files
  rvt: { label: 'Revit Model', icon: 'bim', color: 'indigo' },
  rfa: { label: 'Revit Family', icon: 'bim', color: 'indigo' },
  ifc: { label: 'IFC Model', icon: 'bim', color: 'indigo' },
  nwd: { label: 'Navisworks Model', icon: 'bim', color: 'indigo' },
  nwc: { label: 'Navisworks Cache', icon: 'bim', color: 'indigo' },
  // 3D files
  skp: { label: 'SketchUp Model', icon: '3d', color: 'purple' },
  step: { label: 'STEP 3D Model', icon: '3d', color: 'purple' },
  stp: { label: 'STEP 3D Model', icon: '3d', color: 'purple' },
  stl: { label: 'STL 3D Model', icon: '3d', color: 'purple' },
  obj: { label: 'OBJ 3D Model', icon: '3d', color: 'purple' },
  fbx: { label: 'FBX 3D Model', icon: '3d', color: 'purple' },
  // Document files
  pdf: { label: 'PDF Document', icon: 'pdf', color: 'red' },
  doc: { label: 'Word Document', icon: 'doc', color: 'blue' },
  docx: { label: 'Word Document', icon: 'doc', color: 'blue' },
  xls: { label: 'Excel Spreadsheet', icon: 'xls', color: 'green' },
  xlsx: { label: 'Excel Spreadsheet', icon: 'xls', color: 'green' },
  ppt: { label: 'PowerPoint', icon: 'ppt', color: 'orange' },
  pptx: { label: 'PowerPoint', icon: 'ppt', color: 'orange' },
  // Image files
  jpg: { label: 'JPEG Image', icon: 'image', color: 'green' },
  jpeg: { label: 'JPEG Image', icon: 'image', color: 'green' },
  png: { label: 'PNG Image', icon: 'image', color: 'green' },
  gif: { label: 'GIF Image', icon: 'image', color: 'green' },
  webp: { label: 'WebP Image', icon: 'image', color: 'green' },
  heic: { label: 'HEIC Image', icon: 'image', color: 'green' },
  tiff: { label: 'TIFF Image', icon: 'image', color: 'green' },
  tif: { label: 'TIFF Image', icon: 'image', color: 'green' },
  bmp: { label: 'BMP Image', icon: 'image', color: 'green' },
  // Video files
  mp4: { label: 'MP4 Video', icon: 'video', color: 'pink' },
  mov: { label: 'QuickTime Video', icon: 'video', color: 'pink' },
  avi: { label: 'AVI Video', icon: 'video', color: 'pink' },
  // Archive files
  zip: { label: 'ZIP Archive', icon: 'archive', color: 'gray' },
  rar: { label: 'RAR Archive', icon: 'archive', color: 'gray' },
} as const

// Accepted file types for upload
const ACCEPTED_FILE_TYPES = '.dwg,.dxf,.dwf,.rvt,.rfa,.ifc,.nwd,.nwc,.skp,.step,.stp,.stl,.obj,.fbx,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.heic,.tiff,.tif,.bmp,.mp4,.mov,.avi,.zip,.rar'

// Static Tailwind color classes for file types (must be static for purging)
const FILE_COLOR_CLASSES = {
  blue: { icon: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  indigo: { icon: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' },
  purple: { icon: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  red: { icon: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  green: { icon: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  orange: { icon: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  pink: { icon: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400' },
  gray: { icon: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
  yellow: { icon: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  amber: { icon: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  cyan: { icon: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400' },
  emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
} as const

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function getFileTypeInfo(filename: string) {
  const ext = getFileExtension(filename)
  return CONSTRUCTION_FILE_TYPES[ext as keyof typeof CONSTRUCTION_FILE_TYPES] || { label: 'Unknown', icon: 'file', color: 'gray' }
}

export default function DocumentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [groupBy, setGroupBy] = useState<'none' | 'project' | 'category'>('project')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']))
  const [filterProject, setFilterProject] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [blasters, setBlasters] = useState<Blaster[]>([])
  const [selectedBlasterIds, setSelectedBlasterIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [showUploadRevisionModal, setShowUploadRevisionModal] = useState(false)
  const [revisions, setRevisions] = useState<DocumentRevision[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const revisionInputRef = useRef<HTMLInputElement>(null)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [viewerFile, setViewerFile] = useState<File | null>(null)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [landscapeMode, setLandscapeMode] = useState(false)

  // Existing document analysis state
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null)
  const [analyzeResults, setAnalyzeResults] = useState<ExtractedDocumentData | null>(null)
  const [showAnalyzeResults, setShowAnalyzeResults] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadProjectId, setUploadProjectId] = useState<string>('')
  const [pendingUploads, setPendingUploads] = useState<Array<{
    file: globalThis.File
    category: string
    suggestedCategory: string
    blasterIds: string[]
    ocrData: ExtractedDocumentData | null
    ocrLoading: boolean
    ocrError: string | null
  }>>([])

  // Document analysis hook
  const { analyzeFile, getAnalysisStatus } = useDocumentAnalysis()

  // Background OCR jobs hook
  const {
    jobs: ocrJobs,
    activeCount: activeOcrJobs,
    startJob: startOcrJob,
    getJobForFile,
    fetchJobs: fetchOcrJobs,
    deleteJob
  } = useOcrJobs()

  // Document split state
  const [pendingDrafts, setPendingDrafts] = useState<Array<{
    id: string
    projectName: string
    originalFileName: string
    totalPages: number
    verifiedCount: number
    updatedAt: string
  }>>([])
  const [activeDraft, setActiveDraft] = useState<{
    id: string
    projectId: string
    projectName: string
    originalFileId: string
    originalFileName: string
    status: string
    totalPages: number
    verifiedCount: number
    pages: Array<{
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
    }>
    createdAt: string
    updatedAt: string
  } | null>(null)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [splitLoading, setSplitLoading] = useState(false)
  const [splitPdfUrl, setSplitPdfUrl] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<File | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Split document state
  const [splittingFileId, setSplittingFileId] = useState<string | null>(null)
  const [splittingFileName, setSplittingFileName] = useState<string | null>(null)

  // Handle split document
  const handleSplitDocument = async (file: File) => {
    if (!file.storagePath.toLowerCase().endsWith('.pdf')) {
      toast.warning('Invalid File Type', 'Only PDF files can be split')
      return
    }

    setSplittingFileId(file.id)
    setSplittingFileName(file.name)
    try {
      const res = await fetch(`/api/documents/${file.id}/split`, {
        method: 'POST'
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Fetch PDF URL for preview
        try {
          const urlRes = await fetch(`/api/files/${file.id}/url`)
          if (urlRes.ok) {
            const urlData = await urlRes.json()
            setSplitPdfUrl(urlData.url)
          }
        } catch (e) {
          console.error('Failed to fetch PDF URL:', e)
        }

        if (data.existing) {
          // Resume existing draft
          setActiveDraft({
            id: data.draft.id,
            projectId: file.projectId,
            projectName: file.project?.name || 'Company-wide',
            originalFileId: file.id,
            originalFileName: file.name,
            status: data.draft.status,
            totalPages: data.draft.totalPages,
            verifiedCount: data.draft.verifiedCount,
            pages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          // Fetch full draft data
          const draftRes = await fetch(`/api/documents/split/${data.draft.id}`)
          if (draftRes.ok) {
            const draftData = await draftRes.json()
            setActiveDraft(draftData.draft)
          }
        } else {
          // New draft created
          setActiveDraft({
            id: data.draft.id,
            projectId: data.draft.projectId,
            projectName: data.draft.projectName,
            originalFileId: data.draft.originalFileId,
            originalFileName: data.draft.originalFileName,
            status: data.draft.status,
            totalPages: data.draft.totalPages,
            verifiedCount: data.draft.verifiedCount,
            pages: data.draft.pages,
            createdAt: data.draft.createdAt,
            updatedAt: data.draft.createdAt
          })

          // If OCR is pending, poll for updates
          if (data.ocrPending) {
            const pollForOcrUpdates = async (draftId: string, attempts = 0) => {
              if (attempts > 30) return // Max 30 attempts (about 60 seconds)

              await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds

              try {
                const draftRes = await fetch(`/api/documents/split/${draftId}`)
                if (draftRes.ok) {
                  const draftData = await draftRes.json()
                  // Check if any page has OCR data now
                  const hasOcrData = draftData.draft.pages.some((p: { drawingNumber: string | null }) => p.drawingNumber !== null)
                  setActiveDraft(draftData.draft)

                  // Keep polling if no OCR data yet and modal is still open
                  if (!hasOcrData) {
                    pollForOcrUpdates(draftId, attempts + 1)
                  }
                }
              } catch (e) {
                console.error('Error polling for OCR updates:', e)
              }
            }

            // Start polling in background
            pollForOcrUpdates(data.draft.id)
          }
        }
        setShowSplitModal(true)
      } else {
        // Show detailed error information to help diagnose issues
        let errorMsg = data.error || 'Failed to start splitting'
        if (data.details) {
          errorMsg += `\n\nDetails: ${data.details}`
        }
        if (data.debugInfo) {
          console.error('[SplitDocument] Debug info:', data.debugInfo)
          errorMsg += `\n\nStorage Path: ${data.debugInfo.storagePath || 'unknown'}`
          errorMsg += `\nBucket: ${data.debugInfo.bucket || 'unknown'}`
          if (data.debugInfo.hint) {
            errorMsg += `\n\nHint: ${data.debugInfo.hint}`
          }
        }
        console.error('[SplitDocument] API error:', data)
        toast.error('Split Failed', errorMsg)
      }
    } catch (error) {
      console.error('[SplitDocument] Network/parse error:', error)
      const errorMsg = error instanceof Error
        ? error.message
        : 'Network error'
      toast.error('Split Failed', errorMsg)
    } finally {
      setSplittingFileId(null)
      setSplittingFileName(null)
    }
  }

  // Handle split with pre-populated OCR data from a completed OcrJob
  const handleSplitWithOcrData = async (file: File, ocrJob: OcrJob) => {
    if (!file.storagePath.toLowerCase().endsWith('.pdf')) {
      toast.warning('Invalid File Type', 'Only PDF files can be split')
      return
    }

    setSplittingFileId(file.id)
    setSplittingFileName(file.name)
    try {
      // First, create the split draft via the normal API
      const res = await fetch(`/api/documents/${file.id}/split`, {
        method: 'POST'
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Fetch PDF URL for preview
        try {
          const urlRes = await fetch(`/api/files/${file.id}/url`)
          if (urlRes.ok) {
            const urlData = await urlRes.json()
            setSplitPdfUrl(urlData.url)
          }
        } catch (e) {
          console.error('Failed to fetch PDF URL:', e)
        }

        // Get the draft ID
        const draftId = data.draft.id

        // If this is an existing draft, we need to fetch the full draft data including pages
        let draftData = data.draft
        if (data.existing || !data.draft.pages) {
          console.log('[handleSplitWithOcrData] Fetching full draft data for existing draft:', draftId)
          const fullDraftRes = await fetch(`/api/documents/split/${draftId}`)
          if (fullDraftRes.ok) {
            const fullDraftData = await fullDraftRes.json()
            draftData = fullDraftData.draft
            console.log('[handleSplitWithOcrData] Full draft fetched, pages:', draftData.pages?.length || 0)
          }
        }

        // Now update the draft pages with OCR data from the completed job
        if (ocrJob.result) {
          const ocrResult = ocrJob.result as {
            pages?: Array<{
              pageNumber: number
              data?: {
                drawingInfo?: {
                  drawingNumber?: string
                  sheetTitle?: string
                  discipline?: string
                  revision?: string
                  scale?: string
                }
                projectMatch?: { confidence?: number }
              }
            }>
          }

          if (ocrResult.pages?.length && draftData.pages?.length) {
            // Map OCR results to draft page format
            const updatedPages = draftData.pages.map((page: { pageNumber: number; thumbnailPath: string | null; drawingNumber: string | null; sheetTitle: string | null; discipline: string | null; revision: string | null; scale: string | null; confidence: number; verified: boolean; skipped: boolean }) => {
              const ocrPage = ocrResult.pages?.find(p => p.pageNumber === page.pageNumber)
              if (ocrPage?.data?.drawingInfo) {
                // Normalize scale to consistent format
                const rawScale = ocrPage.data.drawingInfo.scale || null
                const normalizedScale = rawScale ? normalizeScale(rawScale) : null
                return {
                  ...page,
                  drawingNumber: ocrPage.data.drawingInfo.drawingNumber || null,
                  sheetTitle: ocrPage.data.drawingInfo.sheetTitle || null,
                  discipline: ocrPage.data.drawingInfo.discipline || null,
                  revision: ocrPage.data.drawingInfo.revision || null,
                  scale: normalizedScale || rawScale,
                  confidence: ocrPage.data.projectMatch?.confidence || 0.5
                }
              }
              return page
            })

            // Update the draft with OCR data
            await fetch(`/api/documents/split/${draftId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pages: updatedPages })
            })

            // Set the active draft with updated pages
            setActiveDraft({
              id: draftId,
              projectId: draftData.projectId,
              projectName: draftData.projectName || file.project?.name || '',
              originalFileId: draftData.originalFileId,
              originalFileName: draftData.originalFileName,
              status: draftData.status,
              totalPages: draftData.totalPages,
              verifiedCount: 0,
              pages: updatedPages,
              createdAt: draftData.createdAt,
              updatedAt: new Date().toISOString()
            })
          } else {
            // No OCR pages, use default draft
            setActiveDraft({
              id: draftId,
              projectId: draftData.projectId,
              projectName: draftData.projectName || file.project?.name || '',
              originalFileId: draftData.originalFileId,
              originalFileName: draftData.originalFileName,
              status: draftData.status,
              totalPages: draftData.totalPages,
              verifiedCount: draftData.verifiedCount,
              pages: draftData.pages || [],
              createdAt: draftData.createdAt,
              updatedAt: draftData.createdAt
            })
          }
        } else {
          // No OCR result, use draft as-is
          setActiveDraft({
            id: draftId,
            projectId: draftData.projectId,
            projectName: draftData.projectName || file.project?.name || '',
            originalFileId: draftData.originalFileId,
            originalFileName: draftData.originalFileName,
            status: draftData.status,
            totalPages: draftData.totalPages,
            verifiedCount: draftData.verifiedCount,
            pages: draftData.pages || [],
            createdAt: draftData.createdAt,
            updatedAt: draftData.createdAt
          })
        }

        setShowSplitModal(true)
      } else {
        toast.error('Split Failed', data.error || 'Failed to start splitting')
      }
    } catch (error) {
      console.error('[handleSplitWithOcrData] Error:', error)
      toast.error('Split Failed', 'An unexpected error occurred')
    } finally {
      setSplittingFileId(null)
      setSplittingFileName(null)
    }
  }

  // Fetch signed URL when viewer file changes
  useEffect(() => {
    if (!viewerFile) {
      setViewerUrl(null)
      return
    }

    const file = viewerFile // Capture for async function
    async function fetchViewerUrl() {
      setViewerLoading(true)
      try {
        const url = await getFileDisplayUrl(file.id, file.storagePath)
        setViewerUrl(url)
      } catch (error) {
        console.error('Failed to get viewer URL:', error)
        setViewerUrl(null)
      } finally {
        setViewerLoading(false)
      }
    }

    fetchViewerUrl()
  }, [viewerFile])

  // Check for admin/project manager access
  const userRole = session?.user?.role as string | undefined
  const isAdmin = userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER'

  useEffect(() => {
    // Redirect non-admin users to dashboard
    if (status === 'authenticated' && !isAdmin) {
      router.push('/dashboard')
    }
  }, [status, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      // Reset to page 1 when filters change
      setPagination(prev => ({ ...prev, page: 1 }))
      fetchData(1)
    }
  }, [filterProject, filterCategory, selectedBlasterIds, isAdmin])

  // Fetch pending split drafts
  useEffect(() => {
    if (isAdmin) {
      fetchPendingDrafts()
    }
  }, [isAdmin])

  const fetchPendingDrafts = async () => {
    try {
      const res = await fetch('/api/documents/split/drafts?status=DRAFT')
      if (res.ok) {
        const data = await res.json()
        setPendingDrafts(data.drafts || [])
      }
    } catch (error) {
      console.error('Error fetching pending drafts:', error)
    }
  }

  // Handle document deletion
  const handleDeleteDocument = async (file: File) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${file.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        // Remove from local state
        setFiles(prev => prev.filter(f => f.id !== file.id))
        setDeleteConfirmFile(null)
        // Close viewer if this file was being viewed
        if (viewerFile?.id === file.id) {
          setViewerFile(null)
        }
        toast.success('Document Deleted', 'The document has been removed')
      } else {
        const data = await res.json()
        toast.error('Delete Failed', data.error || 'Failed to delete document')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Delete Failed', 'An unexpected error occurred')
    } finally {
      setDeleting(false)
    }
  }

  const fetchData = async (page = pagination.page) => {
    try {
      const params = new URLSearchParams()
      if (filterProject) params.set('projectId', filterProject)
      if (filterCategory) params.set('category', filterCategory)
      if (selectedBlasterIds.length > 0) params.set('blasterIds', selectedBlasterIds.join(','))
      params.set('page', String(page))
      params.set('limit', String(pagination.limit))

      const [filesRes, projectsRes, blastersRes] = await Promise.all([
        fetch(`/api/documents?${params}`),
        fetch('/api/projects'),
        fetch('/api/users/blasters'),
      ])

      if (filesRes.ok) {
        const filesData = await filesRes.json()
        setFiles(filesData.documents || [])
        setCategoryCounts(filesData.categories || {})
        if (filesData.pagination) {
          setPagination(filesData.pagination)
        }
      } else {
        // Fallback to old API
        const legacyRes = await fetch('/api/files')
        const legacyData = await legacyRes.json()
        setFiles(legacyData.files || [])
      }

      const projectsData = await projectsRes.json()
      setProjects(projectsData.projects || [])

      if (blastersRes.ok) {
        const blastersData = await blastersRes.json()
        setBlasters(blastersData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }))
      fetchData(newPage)
      // Scroll to top of list
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Suggest category based on file extension
  const suggestCategory = (fileName: string): string => {
    const ext = getFileExtension(fileName)
    if (['dwg', 'dxf', 'dwf'].includes(ext)) return 'DRAWINGS'
    if (['rvt', 'rfa', 'ifc', 'nwd', 'nwc', 'skp', 'step', 'stp', 'stl', 'obj', 'fbx'].includes(ext)) return 'BIM'
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'tiff', 'tif', 'bmp'].includes(ext)) return 'PHOTOS'
    if (['xls', 'xlsx'].includes(ext)) return 'REPORTS'
    // For PDFs and docs, don't assume - let user choose
    if (['pdf', 'doc', 'docx'].includes(ext)) return ''
    return 'OTHER'
  }

  // Handle file selection - show modal instead of uploading immediately
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    // Prepare pending uploads with suggested categories
    const pending = Array.from(selectedFiles).map(file => {
      const suggested = suggestCategory(file.name)
      return {
        file,
        category: suggested,
        suggestedCategory: suggested,
        blasterIds: [] as string[],
        ocrData: null as ExtractedDocumentData | null,
        ocrLoading: false,
        ocrError: null as string | null
      }
    })

    setPendingUploads(pending)
    setUploadProjectId(filterProject || '') // Pre-select filtered project, or empty for user to choose
    setShowUploadModal(true)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // Trigger OCR analysis for supported files (in background)
    pending.forEach(async (item, index) => {
      const supportedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!supportedTypes.includes(item.file.type)) return

      // Mark as loading
      setPendingUploads(prev => prev.map((p, i) =>
        i === index ? { ...p, ocrLoading: true } : p
      ))

      try {
        const result = await analyzeFile(item.file, uploadProjectId)
        setPendingUploads(prev => prev.map((p, i) =>
          i === index ? { ...p, ocrLoading: false, ocrData: result, ocrError: null } : p
        ))
      } catch (error) {
        setPendingUploads(prev => prev.map((p, i) =>
          i === index ? { ...p, ocrLoading: false, ocrError: error instanceof Error ? error.message : 'Analysis failed' } : p
        ))
      }
    })
  }

  // Update category for a pending upload
  const updatePendingCategory = (index: number, category: string) => {
    setPendingUploads(prev => prev.map((item, i) =>
      i === index ? { ...item, category } : item
    ))
  }

  const updatePendingBlasterIds = (index: number, blasterIds: string[]) => {
    setPendingUploads(prev => prev.map((item, i) =>
      i === index ? { ...item, blasterIds } : item
    ))
  }

  // Cancel upload modal
  const cancelUpload = () => {
    setShowUploadModal(false)
    setPendingUploads([])
    setUploadProjectId('')
  }

  // Confirm and perform the uploads
  const confirmUpload = async () => {
    if (!uploadProjectId) {
      toast.warning('No Project Selected', 'Please select a project before uploading')
      return
    }

    setShowUploadModal(false)
    setUploading(true)

    for (const { file, category, blasterIds } of pendingUploads) {
      try {
        const result = await uploadFile(file, {
          projectId: uploadProjectId === 'NONE' ? null : uploadProjectId,
          category: category || undefined,
          blasterIds: blasterIds.length > 0 ? blasterIds : undefined
        })

        if (result.success && result.file) {
          // Add the new file to the local state
          setFiles((prev) => [
            {
              id: result.file!.id,
              name: result.file!.name,
              type: result.file!.type as string,
              storagePath: result.file!.storagePath,
              projectId: result.file!.projectId as string,
              project: result.file!.project as { id: string; name: string },
              uploader: result.file!.uploader as { id: string; name: string },
              createdAt: result.file!.createdAt as string,
              currentVersion: (result.file!.currentVersion as number) || 1,
              category: result.file!.category as string | null,
              description: result.file!.description as string | null,
              tags: result.file!.tags as string | null,
              _count: { revisions: 1, annotations: 0 }
            },
            ...prev,
          ])
          toast.success('Upload Complete', `${file.name} uploaded successfully`)
        } else {
          console.error('Upload error:', result.error)
          toast.error('Upload Failed', `${file.name}: ${result.error}`)
        }
      } catch (error) {
        console.error('Upload error:', error)
        toast.error('Upload Failed', `Could not upload ${file.name}`)
      }
    }

    setPendingUploads([])
    setUploadProjectId('')
    setUploading(false)
  }

  const handleUploadRevision = async () => {
    if (!selectedFile || !revisionInputRef.current?.files?.[0]) return

    setUploading(true)
    const file = revisionInputRef.current.files[0]

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('changeNotes', revisionNotes || `Updated to version ${selectedFile.currentVersion + 1}`)

      const response = await fetch(`/api/documents/${selectedFile.id}/revisions/upload`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()

        // Update local state with new version
        setFiles(prev => prev.map(f =>
          f.id === selectedFile.id
            ? {
                ...f,
                currentVersion: data.newVersion,
                storagePath: data.storagePath,
                _count: {
                  revisions: (f._count?.revisions || 0) + 1,
                  annotations: f._count?.annotations || 0
                }
              }
            : f
        ))

        setShowUploadRevisionModal(false)
        setRevisionNotes('')
        setSelectedFile(null)

        // Refresh revisions if showing
        if (expandedFiles.has(selectedFile.id)) {
          fetchRevisions(selectedFile.id)
        }
        toast.success('Revision Uploaded', `Version ${data.newVersion} saved`)
      } else {
        // Handle non-JSON error responses (e.g., 413 from Vercel)
        const contentType = response.headers.get('content-type')
        let errorMessage = 'Upload failed'
        if (contentType?.includes('application/json')) {
          const errorData = await response.json()
          errorMessage = errorData.error || 'Upload failed'
        } else if (response.status === 413) {
          errorMessage = 'File too large. Maximum size is 4.5MB on Hobby plan or 100MB on Pro plan.'
        } else {
          errorMessage = response.statusText || 'Upload failed'
        }
        console.error('Revision upload error:', errorMessage)
        toast.error('Revision Upload Failed', errorMessage)
      }
    } catch (error) {
      console.error('Revision upload error:', error)
      toast.error('Revision Upload Failed', 'An unexpected error occurred')
    } finally {
      setUploading(false)
    }
  }

  const fetchRevisions = async (fileId: string) => {
    try {
      const res = await fetch(`/api/documents/${fileId}/revisions`)
      if (res.ok) {
        const data = await res.json()
        setRevisions(data.revisions || [])
      }
    } catch (error) {
      console.error('Error fetching revisions:', error)
    }
  }

  const fetchAnnotations = async (fileId: string) => {
    try {
      const res = await fetch(`/api/documents/${fileId}/annotations`)
      if (res.ok) {
        const data = await res.json()
        setAnnotations(data.annotations || [])
      }
    } catch (error) {
      console.error('Error fetching annotations:', error)
    }
  }

  // Resume a pending split draft
  const handleResumeDraft = async (draftId: string) => {
    setSplitLoading(true)
    try {
      const res = await fetch(`/api/documents/split/${draftId}`)
      if (res.ok) {
        const data = await res.json()
        setActiveDraft(data.draft)

        // Fetch PDF URL for preview
        if (data.draft.originalFileId) {
          try {
            const urlRes = await fetch(`/api/files/${data.draft.originalFileId}/url`)
            if (urlRes.ok) {
              const urlData = await urlRes.json()
              setSplitPdfUrl(urlData.url)
            }
          } catch (e) {
            console.error('Failed to fetch PDF URL:', e)
          }
        }

        setShowSplitModal(true)
      } else {
        const error = await res.json()
        toast.error('Failed to Load Draft', error.error || 'Could not resume the split')
      }
    } catch (error) {
      console.error('Error resuming draft:', error)
      toast.error('Failed to Load Draft', 'An unexpected error occurred')
    } finally {
      setSplitLoading(false)
    }
  }

  // Update page data in active draft
  const handleUpdatePages = async (pages: Array<{
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
  }>) => {
    if (!activeDraft) return

    try {
      const res = await fetch(`/api/documents/split/${activeDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages })
      })

      if (res.ok) {
        const data = await res.json()
        setActiveDraft(prev => prev ? {
          ...prev,
          pages: data.draft.pages,
          verifiedCount: data.draft.verifiedCount
        } : null)
      }
    } catch (error) {
      console.error('Error updating pages:', error)
    }
  }

  // Confirm and finalize the split - runs in background after modal closes
  const handleConfirmSplit = async (
    revisionMappings?: Array<{ pageNumber: number; existingFileId: string }>,
    draftId?: string
  ) => {
    // Use provided draftId or fall back to activeDraft
    const targetDraftId = draftId || activeDraft?.id
    if (!targetDraftId) {
      console.error('No draft ID available for split confirmation')
      return
    }

    // Show immediate feedback that processing has started
    setSplitLoading(true)

    try {
      const res = await fetch(`/api/documents/split/${targetDraftId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionMappings })
      })

      if (res.ok) {
        const data = await res.json()
        // Build a more descriptive success message
        const parts: string[] = []
        if (data.createdFiles > 0) {
          parts.push(`${data.createdFiles} new file${data.createdFiles === 1 ? '' : 's'}`)
        }
        if (data.updatedFiles > 0) {
          parts.push(`${data.updatedFiles} revision${data.updatedFiles === 1 ? '' : 's'}`)
        }
        const message = parts.length > 0
          ? `Created ${parts.join(' and ')}`
          : data.message || 'Split completed'
        toast.success('Split Complete', message)
        // Refresh data to show new files
        fetchData()
        fetchPendingDrafts()
      } else {
        const error = await res.json()
        toast.error('Split Failed', error.error || 'Failed to confirm split')
      }
    } catch (error) {
      console.error('Error confirming split:', error)
      toast.error('Split Failed', 'An unexpected error occurred')
    } finally {
      setSplitLoading(false)
    }
  }

  // Discard a draft
  const handleDiscardDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to discard this draft? This action cannot be undone.')) return

    try {
      const res = await fetch(`/api/documents/split/${draftId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setShowSplitModal(false)
        setActiveDraft(null)
        fetchPendingDrafts()
        toast.info('Draft Discarded', 'The draft has been removed')
      } else {
        const error = await res.json()
        toast.error('Discard Failed', error.error || 'Failed to discard draft')
      }
    } catch (error) {
      console.error('Error discarding draft:', error)
      toast.error('Discard Failed', 'An unexpected error occurred')
    }
  }

  // Analyze existing document with AI OCR
  const handleAnalyzeExisting = async (file: File, useBackground: boolean = false) => {
    // Check if file type is supported
    const ext = getFileExtension(file.name).toLowerCase()
    const supportedExts = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp']
    if (!supportedExts.includes(ext)) {
      setAnalyzeError('Only PDF and image files can be analyzed')
      setShowAnalyzeResults(true)
      return
    }

    // For PDFs, check if there's already a background job (active or completed)
    const existingJob = getJobForFile(file.id)
    if (existingJob && ['PENDING', 'PROCESSING', 'COMPLETED'].includes(existingJob.status)) {
      // Show the existing job status or results
      setAnalyzeError(null)
      setAnalyzeResults(null)
      setShowAnalyzeResults(true)
      return
    }

    // For background processing (multi-page PDFs)
    if (useBackground && ext === 'pdf') {
      setAnalyzingFileId(file.id)
      const result = await startOcrJob(file.id, 'all-pages')
      if (result.success) {
        setAnalyzeError(null)
        setAnalyzeResults(null)
        setShowAnalyzeResults(true)
      } else {
        setAnalyzeError(result.error || 'Failed to start background OCR')
        setShowAnalyzeResults(true)
      }
      setAnalyzingFileId(null)
      return
    }

    // Map extension to proper MIME type
    const mimeTypeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }
    const mimeType = mimeTypeMap[ext] || 'application/octet-stream'

    setAnalyzingFileId(file.id)
    setAnalyzeError(null)
    setAnalyzeResults(null)

    try {
      // First get the signed URL for the file
      const urlResponse = await fetch(`/api/files/${file.id}/url`)
      if (!urlResponse.ok) {
        throw new Error('Failed to get file URL')
      }
      const { url } = await urlResponse.json()

      // Fetch the actual file content from the signed URL
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch file')
      }

      const blob = await response.blob()
      // Use inferred MIME type since blob.type may be empty and file.type is the database type (not MIME)
      const fileObj = new globalThis.File([blob], file.name, { type: mimeType })

      // Analyze the file - use single page mode for quick results
      const result = await analyzeFile(fileObj, file.projectId, 'single')
      setAnalyzeResults(result)
      setShowAnalyzeResults(true)
    } catch (error) {
      console.error('Analysis error:', error)
      setAnalyzeError(error instanceof Error ? error.message : 'Analysis failed')
      setShowAnalyzeResults(true)
    } finally {
      setAnalyzingFileId(null)
    }
  }

  // Start background OCR for multi-page PDFs
  const handleBackgroundOcr = async (file: File) => {
    await handleAnalyzeExisting(file, true)
  }

  const openRevisionHistory = (file: File) => {
    setSelectedFile(file)
    fetchRevisions(file.id)
    setShowRevisionModal(true)
  }

  const toggleFileExpand = (fileId: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId)
    } else {
      newExpanded.add(fileId)
      fetchRevisions(fileId)
      fetchAnnotations(fileId)
    }
    setExpandedFiles(newExpanded)
  }

  const filteredFiles = files.filter((file) => {
    // Exclude DRAWINGS category - they have their own dedicated page
    if (file.category === 'DRAWINGS') return false
    if (filterProject && file.projectId !== filterProject) return false
    if (filterType && file.type !== filterType) return false
    if (filterCategory && file.category !== filterCategory) return false
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Sort files for navigation (by project, then by name)
  const sortedFilesForNavigation = [...filteredFiles].sort((a, b) => {
    // First sort by project (company-wide documents come last)
    const projectA = a.project?.name || 'zzz-Company-wide'
    const projectB = b.project?.name || 'zzz-Company-wide'
    const projectCompare = projectA.localeCompare(projectB)
    if (projectCompare !== 0) return projectCompare

    // Then by category
    const catA = a.category || 'OTHER'
    const catB = b.category || 'OTHER'
    const catCompare = catA.localeCompare(catB)
    if (catCompare !== 0) return catCompare

    // Then by file name
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })

  // Get current file index in sorted list for navigation
  const currentFileIndex = viewerFile
    ? sortedFilesForNavigation.findIndex(f => f.id === viewerFile.id)
    : -1

  // Navigate to previous/next file in sorted order
  const navigateToFile = async (direction: 'prev' | 'next') => {
    if (currentFileIndex === -1) return

    const newIndex = direction === 'prev' ? currentFileIndex - 1 : currentFileIndex + 1
    if (newIndex < 0 || newIndex >= sortedFilesForNavigation.length) return

    const newFile = sortedFilesForNavigation[newIndex]
    setViewerFile(newFile)
    setViewerLoading(true)

    try {
      const response = await fetch(`/api/files/${newFile.id}/url`)
      if (response.ok) {
        const data = await response.json()
        setViewerUrl(data.url)
      } else {
        setViewerUrl(null)
      }
    } catch (error) {
      console.error('Failed to load file URL:', error)
      setViewerUrl(null)
    } finally {
      setViewerLoading(false)
    }
  }

  const canNavigatePrev = currentFileIndex > 0
  const canNavigateNext = currentFileIndex >= 0 && currentFileIndex < sortedFilesForNavigation.length - 1

  // Types for grouping
  type SubGroup = { label: string; files: File[] }
  type GroupData = {
    label: string
    sublabel?: string
    files: File[]
    subgroups?: Record<string, SubGroup>
  }

  // Helper to sort files by drawing number (natural sort: C1.00, C2.00, C10.00)
  const sortByDrawingNumber = (files: File[]): File[] => {
    return [...files].sort((a, b) => {
      const drawA = a.metadata?.drawingNumber || a.name
      const drawB = b.metadata?.drawingNumber || b.name
      return drawA.localeCompare(drawB, undefined, { numeric: true, sensitivity: 'base' })
    })
  }

  // Group files by project and/or discipline
  const groupedFiles: Record<string, GroupData> = (() => {
    if (groupBy === 'none') {
      return { ungrouped: { label: 'All Files', files: sortByDrawingNumber(filteredFiles) } }
    }

    const groups: Record<string, GroupData> = {}

    filteredFiles.forEach(file => {
      const projectKey = file.projectId || 'company-wide'
      const projectName = file.project?.name || 'Company-wide Documents'
      const category = file.category || 'OTHER'
      const categoryInfo = DOCUMENT_CATEGORIES.find(c => c.value === category) || DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1]

      if (groupBy === 'project') {
        if (!groups[projectKey]) {
          groups[projectKey] = {
            label: projectName,
            sublabel: file.project?.address || 'Available to all projects',
            files: []
          }
        }
        groups[projectKey].files.push(file)
      } else if (groupBy === 'category') {
        if (!groups[category]) {
          groups[category] = {
            label: categoryInfo.label,
            files: []
          }
        }
        groups[category].files.push(file)
      }
    })

    // Sort files within each group by drawing number
    Object.values(groups).forEach(group => {
      group.files = sortByDrawingNumber(group.files)
      if (group.subgroups) {
        Object.values(group.subgroups).forEach(subgroup => {
          subgroup.files = sortByDrawingNumber(subgroup.files)
        })
      }
    })

    return groups
  })()

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)

      // If 'all' is set, we need to handle collapsing individual groups differently
      if (next.has('all')) {
        // Remove 'all' and add all current group keys except the one being toggled
        next.delete('all')
        Object.keys(groupedFiles).forEach(key => {
          if (key !== 'ungrouped' && key !== groupKey) {
            next.add(key)
            // Also add subgroups for discipline grouping within projects
            const group = groupedFiles[key]
            if (group.subgroups) {
              Object.keys(group.subgroups).forEach(subKey => {
                next.add(`${key}-${subKey}`)
              })
            }
          } else if (key === groupKey && groupedFiles[key].subgroups) {
            // For the collapsed group, keep its subgroups expanded state for later
            Object.keys(groupedFiles[key].subgroups!).forEach(subKey => {
              next.add(`${key}-${subKey}`)
            })
          }
        })
        // Don't add the clicked group (it should be collapsed)
        return next
      }

      // Normal toggle behavior
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  // Get discipline badge color classes
  const getDisciplineColor = (discipline: string | null | undefined) => {
    const d = DISCIPLINES.find(disc => disc.value === discipline)
    return d?.color || 'gray'
  }

  const getFileIcon = (file: File) => {
    const typeInfo = getFileTypeInfo(file.name)
    const colorClasses = FILE_COLOR_CLASSES[typeInfo.color as keyof typeof FILE_COLOR_CLASSES] || FILE_COLOR_CLASSES.gray

    switch (typeInfo.icon) {
      case 'cad':
        return <PenTool className={`h-5 w-5 ${colorClasses.icon}`} />
      case 'bim':
        return <Layers className={`h-5 w-5 ${colorClasses.icon}`} />
      case '3d':
        return <Box className={`h-5 w-5 ${colorClasses.icon}`} />
      case 'pdf':
        return <FileText className={`h-5 w-5 ${colorClasses.icon}`} />
      case 'doc':
        return <FileText className={`h-5 w-5 ${colorClasses.icon}`} />
      case 'xls':
        return <FileSpreadsheet className={`h-5 w-5 ${colorClasses.icon}`} />
      case 'ppt':
        return <FileText className={`h-5 w-5 ${colorClasses.icon}`} />
      case 'image':
        return <Image className={`h-5 w-5 ${colorClasses.icon}`} />
      case 'video':
        return <Film className={`h-5 w-5 ${colorClasses.icon}`} />
      case 'archive':
        return <Archive className={`h-5 w-5 ${colorClasses.icon}`} />
      default:
        if (file.type === 'image') {
          return <Image className="h-5 w-5 text-green-500" />
        }
        return <FileText className="h-5 w-5 text-blue-500" />
    }
  }

  const getFileTypeBadge = (filename: string) => {
    const ext = getFileExtension(filename).toUpperCase()
    const typeInfo = getFileTypeInfo(filename)
    const colorClasses = FILE_COLOR_CLASSES[typeInfo.color as keyof typeof FILE_COLOR_CLASSES] || FILE_COLOR_CLASSES.gray
    return (
      <span className={`px-1.5 py-0.5 ${colorClasses.bg} ${colorClasses.text} text-xs rounded font-medium`}>
        {ext}
      </span>
    )
  }

  const getCategoryColor = (category: string | null) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.value === category)
    return cat?.color || 'gray'
  }

  // Show loading while checking session or loading data
  if (status === 'loading' || loading || (status === 'authenticated' && !isAdmin)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documents & Photos</h1>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
              <ShieldCheck className="h-3 w-3" />
              Admin View
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Company-wide document management. For project-specific documents, go to the project page.</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary px-4 py-2 flex items-center gap-2"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            Upload Files
          </button>
        </div>
      </div>

      {/* Pending Drafts Notification */}
      {pendingDrafts.length > 0 && (
        <DraftNotificationBanner
          drafts={pendingDrafts}
          onResume={handleResumeDraft}
          onDiscard={handleDiscardDraft}
          loading={splitLoading}
        />
      )}

      {/* Category Pills - larger touch targets for mobile */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors touch-manipulation ${
            !filterCategory ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All ({pagination.total || files.length})
        </button>
        {DOCUMENT_CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors touch-manipulation ${
              filterCategory === cat.value
                ? `bg-${cat.color}-600 text-white`
                : `bg-${cat.color}-50 text-${cat.color}-700 hover:bg-${cat.color}-100`
            }`}
          >
            {cat.label} ({categoryCounts[cat.value] || 0})
          </button>
        ))}
      </div>

      {/* Project Picker - Prominent position */}
      <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Jobsite:</span>
          </div>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="flex-1 sm:flex-none sm:min-w-[280px] px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-700 rounded-lg text-base font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Active Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {filterProject && (
            <button
              onClick={() => setFilterProject('')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Blaster Filter - Only show when BLASTING category is selected */}
      {filterCategory === 'BLASTING' && (
        <div className="card p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">Blasters:</span>
              <span className="text-sm text-gray-500">({selectedBlasterIds.length} selected)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedBlasterIds([])}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedBlasterIds.length === 0
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All Blasters
              </button>
              {blasters.map(blaster => (
                <button
                  key={blaster.id}
                  onClick={() => {
                    setSelectedBlasterIds(prev =>
                      prev.includes(blaster.id)
                        ? prev.filter(id => id !== blaster.id)
                        : [...prev, blaster.id]
                    )
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedBlasterIds.includes(blaster.id)
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50'
                  }`}
                >
                  {blaster.name}
                </button>
              ))}
            </div>
            {blasters.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                No blasters found. Mark users as "Certified Blaster" in the Admin Users page.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Search and other filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          {/* Search - Full width on mobile */}
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="input pl-10 w-full"
              />
            </div>
          </div>
          {/* Filters row - scroll on mobile */}
          <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input w-auto text-sm sm:text-base hidden sm:block"
            >
              <option value="">All Types</option>
              <option value="image">Images</option>
              <option value="document">Documents</option>
            </select>
            <div className="flex border dark:border-gray-600 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : 'dark:text-gray-400'}`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700' : 'dark:text-gray-400'}`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'none' | 'project' | 'category')}
              className="input w-auto text-sm sm:text-base hidden sm:block"
            >
              <option value="none">No Grouping</option>
              <option value="project">Group by Jobsite</option>
              <option value="category">Group by Category</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pagination.total || files.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
              <History className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {files.reduce((sum, f) => sum + (f._count?.revisions || 0), 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revisions</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
              <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {files.reduce((sum, f) => sum + (f._count?.annotations || 0), 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Annotations</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">
              <Building2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {new Set(files.map((f) => f.projectId)).size}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Projects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <div className="card p-12 text-center">
          <Folder className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {files.length === 0 ? 'No files uploaded yet' : 'No files match your filters'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {files.length === 0
              ? 'Upload photos and documents to get started'
              : 'Try adjusting your search or filter criteria'}
          </p>
        </div>
      ) : groupBy !== 'none' ? (
        /* Grouped View */
        <div className="space-y-4">
          {Object.entries(groupedFiles).map(([groupKey, group]) => {
            if (groupKey === 'ungrouped') return null
            const isExpanded = expandedGroups.has(groupKey) || expandedGroups.has('all')

            return (
              <div key={groupKey} className="card overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {groupBy === 'project' ? (
                        <Building2 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                      ) : (
                        <Folder className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{group.label}</h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                        {group.files.length} {group.files.length === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                    {group.sublabel && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {group.sublabel}
                      </p>
                    )}
                  </div>
                </button>

                {/* Group Content */}
                {isExpanded && (
                  <div className="divide-y dark:divide-gray-700">
                    {/* Flat file list in group */}
                    {group.files.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="flex-shrink-0">{getFileIcon(file)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
                            {file.category && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                                {DOCUMENT_CATEGORIES.find(c => c.value === file.category)?.label || file.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            {groupBy === 'category' && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {file.project?.name || 'Company-wide'}
                              </span>
                            )}
                            <span>{formatDate(file.createdAt)}</span>
                            {file.description && (
                              <span className="truncate max-w-[200px]">{file.description}</span>
                            )}
                          </div>
                        </div>
                        <FileActions
                          file={file}
                          onView={() => setViewerFile(file)}
                          onSplit={() => handleSplitDocument(file)}
                          onDelete={() => setDeleteConfirmFile(file)}
                          isSplitting={splittingFileId === file.id}
                          showSplit={file.storagePath.toLowerCase().endsWith('.pdf') && (file.pageCount ?? 0) > 1}
                          variant="compact"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="card overflow-hidden hover:shadow-lg transition-shadow group"
            >
              <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                {file.type === 'image' ? (
                  <FileImageDisplay
                    fileId={file.id}
                    storagePath={file.storagePath}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    fallback={<FileText className="h-12 w-12 text-gray-400" />}
                  />
                ) : (
                  <FileText className="h-12 w-12 text-gray-400" />
                )}
                {/* Version Badge */}
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                  v{file.currentVersion}
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setViewerFile(file)}
                    className="min-h-[48px] px-4 py-2.5 bg-white rounded-lg hover:bg-gray-100 text-base font-semibold text-blue-600 shadow-lg active:scale-95 transition-transform"
                    title="View"
                  >
                    {file.category === 'DRAWINGS' ? 'Open Drawing' :
                     file.category === 'SPECIFICATIONS' ? 'Open Specs' :
                     file.category === 'CONTRACTS' ? 'Open Contract' :
                     file.category === 'PHOTOS' ? 'View Photo' :
                     file.category === 'REPORTS' ? 'Open Report' :
                     file.category === 'BIM' ? 'Open Model' :
                     'Open File'}
                  </button>
                  <button
                    onClick={() => openRevisionHistory(file)}
                    className="min-h-[48px] min-w-[48px] p-3 bg-white rounded-full hover:bg-gray-100 flex items-center justify-center shadow-lg"
                    title="Revision History"
                    aria-label="Revision History"
                  >
                    <History className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const shareUrl = `duggin://document/${file.id}`
                      const shareText = `Check out this document: ${file.name}\n${shareUrl}`
                      if (navigator.share) {
                        navigator.share({
                          title: file.name,
                          text: `Check out this document: ${file.name}`,
                          url: shareUrl
                        }).catch(() => {})
                      } else {
                        navigator.clipboard.writeText(shareText)
                        alert('Link copied to clipboard!')
                      }
                    }}
                    className="min-h-[48px] min-w-[48px] p-3 bg-white rounded-full hover:bg-gray-100 flex items-center justify-center shadow-lg"
                    title="Share"
                    aria-label="Share document"
                  >
                    <Share2 className="h-5 w-5 text-blue-600" />
                  </button>
                  <FileDownloadLink
                    fileId={file.id}
                    storagePath={file.storagePath}
                    fileName={file.name}
                    className="min-h-[48px] min-w-[48px] p-3 bg-white rounded-full hover:bg-gray-100 flex items-center justify-center shadow-lg"
                  >
                    <Download className="h-5 w-5" />
                  </FileDownloadLink>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirmFile(file)
                    }}
                    className="min-h-[48px] min-w-[48px] p-3 bg-white rounded-full hover:bg-gray-100 flex items-center justify-center shadow-lg"
                    aria-label="Delete file"
                  >
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{file.project?.name || 'Company-wide'}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">{formatDate(file.createdAt)}</p>
                  {(file._count?.annotations || 0) > 0 && (
                    <span className="text-xs text-purple-600 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {file._count?.annotations}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card divide-y">
          {filteredFiles.map((file) => (
            <div key={file.id}>
              <div
                className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleFileExpand(file.id)}
              >
                <button className="flex-shrink-0 hidden sm:block">
                  {expandedFiles.has(file.id) ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                <div className="flex-shrink-0">{getFileIcon(file)}</div>
                <div className="flex-1 min-w-0">
                  {/* Mobile: Simplified layout */}
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px] sm:max-w-none">{file.name}</p>
                    <span className="hidden sm:inline-flex">{getFileTypeBadge(file.name)}</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                      v{file.currentVersion}
                    </span>
                    {file.category && (
                      <span className={`hidden sm:inline-flex px-2 py-0.5 bg-${getCategoryColor(file.category)}-100 text-${getCategoryColor(file.category)}-700 text-xs rounded`}>
                        {DOCUMENT_CATEGORIES.find(c => c.value === file.category)?.label}
                      </span>
                    )}
                  </div>
                  {/* Mobile: Show only project name. Desktop: Show all metadata */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate max-w-[100px] sm:max-w-none">{file.project?.name || 'Company-wide'}</span>
                    </span>
                    <span className="hidden sm:flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(file.createdAt)}
                    </span>
                    <span className="hidden sm:flex items-center gap-1">
                      <History className="h-3 w-3" />
                      {file._count?.revisions || 0} rev
                    </span>
                    {(file._count?.annotations || 0) > 0 && (
                      <span className="flex items-center gap-1 text-purple-600">
                        <MessageSquare className="h-3 w-3" />
                        <span className="hidden sm:inline">{file._count?.annotations} annotations</span>
                        <span className="sm:hidden">{file._count?.annotations}</span>
                      </span>
                    )}
                    {file.gpsLatitude && file.gpsLongitude && (
                      <span className="hidden sm:flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        GPS
                      </span>
                    )}
                  </div>
                </div>
                <FileActions
                  file={file}
                  onView={() => setViewerFile(file)}
                  onUploadRevision={() => {
                    setSelectedFile(file)
                    setShowUploadRevisionModal(true)
                  }}
                  onSplit={() => handleSplitDocument(file)}
                  onDelete={() => setDeleteConfirmFile(file)}
                  isSplitting={splittingFileId === file.id}
                  showSplit={file.storagePath.toLowerCase().endsWith('.pdf') && (file.pageCount ?? 0) > 1}
                />
              </div>

              {/* Expanded Details */}
              {expandedFiles.has(file.id) && (
                <div className="bg-gray-50 dark:bg-gray-800/50 px-4 sm:px-12 py-4 border-t dark:border-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Revision History */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <History className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        Revision History
                      </h4>
                      <div className="space-y-2">
                        {(file.revisions || []).slice(0, 5).map((rev) => (
                          <div key={rev.id} className="flex items-center justify-between text-sm bg-white dark:bg-gray-700 p-2 rounded border dark:border-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">v{rev.version}</span>
                              <span className="text-gray-500 dark:text-gray-400">{rev.changeNotes || 'No notes'}</span>
                            </div>
                            <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400">{formatDate(rev.createdAt)}</span>
                          </div>
                        ))}
                        {(!file.revisions || file.revisions.length === 0) && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No revision history available</p>
                        )}
                      </div>
                    </div>

                    {/* Annotations */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        Annotations
                      </h4>
                      <div className="space-y-2">
                        {annotations.filter(a => a.fileId === file.id).slice(0, 5).map((ann) => (
                          <div key={ann.id} className={`text-sm bg-white dark:bg-gray-700 p-2 rounded border dark:border-gray-600 ${ann.resolvedAt ? 'opacity-60' : ''}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize text-gray-900 dark:text-gray-100">{ann.annotationType.toLowerCase()}</span>
                              {ann.resolvedAt && <span className="text-green-600 dark:text-green-400 text-xs">Resolved</span>}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 truncate">{ann.content}</p>
                          </div>
                        ))}
                        {annotations.filter(a => a.fileId === file.id).length === 0 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No annotations yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="card p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} files
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                // Show pages around current page
                let pageNum: number
                if (pagination.pages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 text-sm font-medium rounded-lg ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(pagination.pages)}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete Document</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Are you sure you want to delete this document?
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100 mb-4 break-all">
                {deleteConfirmFile.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This action cannot be undone. The file and all its revisions will be permanently deleted.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirmFile(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteDocument(deleteConfirmFile)}
                  disabled={deleting}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal with Category Selection */}
      {showUploadModal && pendingUploads.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload Documents</h3>
              <button onClick={cancelUpload}>
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select a category for each file. PDFs and documents require manual categorization.
              </p>

              {/* Project Selection */}
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Upload to Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={uploadProjectId}
                  onChange={(e) => setUploadProjectId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                    !uploadProjectId ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/30' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">-- Select Project --</option>
                  <option value="NONE" className="font-medium">📋 Not Project Specific (Company-wide)</option>
                  <option disabled>──────────────────</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {!uploadProjectId && (
                  <p className="text-xs text-red-500 mt-1">
                    Please select a project
                  </p>
                )}
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {pendingUploads.map((item, index) => {
                  const ext = getFileExtension(item.file.name)
                  const needsCategory = ['pdf', 'doc', 'docx'].includes(ext)
                  return (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.file.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Category {needsCategory && <span className="text-red-500">*</span>}
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) => updatePendingCategory(index, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                            needsCategory && !item.category ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/30' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <option value="">-- Select Category --</option>
                          {DOCUMENT_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                        {needsCategory && !item.category && (
                          <p className="text-xs text-red-500 mt-1">
                            Please select a category for this document
                          </p>
                        )}
                      </div>

                      {/* Blaster Selection - Only for BLASTING category */}
                      {item.category === 'BLASTING' && (
                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <label className="block text-sm font-medium text-orange-900 dark:text-orange-100 mb-2">
                            Assign Blasters <span className="text-red-500">*</span>
                          </label>
                          <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                            Only ADMINS and selected blasters will be able to view this document
                          </p>
                          {blasters.length === 0 ? (
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                              No blasters available. Please mark users as "Certified Blaster" in Admin Users.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {blasters.map(blaster => (
                                <label
                                  key={blaster.id}
                                  className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={item.blasterIds.includes(blaster.id)}
                                    onChange={(e) => {
                                      const newBlasterIds = e.target.checked
                                        ? [...item.blasterIds, blaster.id]
                                        : item.blasterIds.filter(id => id !== blaster.id)
                                      updatePendingBlasterIds(index, newBlasterIds)
                                    }}
                                    className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                                  />
                                  <span className="text-sm text-gray-900 dark:text-gray-100">{blaster.name}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">({blaster.email})</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {item.category === 'BLASTING' && item.blasterIds.length === 0 && (
                            <p className="text-xs text-red-500 mt-2">
                              Please select at least one blaster for blasting documents
                            </p>
                          )}
                        </div>
                      )}

                      {/* OCR Suggestions */}
                      <OcrSuggestions
                        file={item.file}
                        extractedData={item.ocrData}
                        isLoading={item.ocrLoading}
                        error={item.ocrError}
                        compact={true}
                        onApplySuggestion={(field, value) => {
                          // For now, just log - could extend to set description/tags
                          console.log('Apply suggestion:', field, value)
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button
                onClick={cancelUpload}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                disabled={!uploadProjectId || pendingUploads.some(item => {
                  const ext = getFileExtension(item.file.name)
                  const needsCategory = ['pdf', 'doc', 'docx'].includes(ext) && !item.category
                  const needsBlasters = item.category === 'BLASTING' && item.blasterIds.length === 0
                  return needsCategory || needsBlasters
                })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload {pendingUploads.length} {pendingUploads.length === 1 ? 'File' : 'Files'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision History Modal */}
      {showRevisionModal && selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Revision History</h3>
              <button onClick={() => setShowRevisionModal(false)}>
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{selectedFile.name}</p>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {revisions.map((rev) => (
                  <div key={rev.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-gray-100">Version {rev.version}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(rev.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {rev.changeNotes || 'No change notes'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                        {rev.version === selectedFile.currentVersion && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">Current</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {revisions.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">No revision history available</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button
                onClick={() => {
                  setShowRevisionModal(false)
                  setShowUploadRevisionModal(true)
                }}
                className="btn btn-primary px-4 py-2 flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload New Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Revision Modal */}
      {showUploadRevisionModal && selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload New Version</h3>
              <button onClick={() => setShowUploadRevisionModal(false)}>
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current: {selectedFile.name} (v{selectedFile.currentVersion})</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">New version will be: v{selectedFile.currentVersion + 1}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select File
                </label>
                <input
                  ref={revisionInputRef}
                  type="file"
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400
                    hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Change Notes
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Describe what changed in this version..."
                  rows={3}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button
                onClick={() => setShowUploadRevisionModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadRevision}
                disabled={uploading}
                className="btn btn-primary px-4 py-2 flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewerFile && (
        <div
          className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 ${
            landscapeMode ? 'landscape-viewer' : ''
          }`}
          onClick={() => { setViewerFile(null); setLandscapeMode(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setViewerFile(null); setLandscapeMode(false); }
            else if (e.key === 'ArrowLeft' && canNavigatePrev) { navigateToFile('prev'); }
            else if (e.key === 'ArrowRight' && canNavigateNext) { navigateToFile('next'); }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Document viewer"
        >
          <style jsx global>{`
            @media (max-width: 768px) {
              .landscape-viewer {
                position: fixed !important;
              }
              .landscape-viewer .viewer-container {
                transform: rotate(90deg);
                transform-origin: center center;
                width: 100vh !important;
                height: 100vw !important;
                max-width: 100vh !important;
                max-height: 100vw !important;
              }
            }
          `}</style>
          <div
            className={`viewer-container relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col ${
              landscapeMode
                ? 'w-[100vh] h-[100vw] max-w-[100vh] max-h-[100vw] md:w-[95vw] md:h-[95vh] md:max-w-[95vw] md:max-h-[95vh]'
                : 'w-[95vw] h-[95vh]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - compact on mobile */}
            <div className="flex items-center justify-between p-2 sm:p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 gap-2">
              {/* File navigation buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); navigateToFile('prev'); }}
                  disabled={!canNavigatePrev}
                  className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Previous document"
                  aria-label="Previous document"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigateToFile('next'); }}
                  disabled={!canNavigateNext}
                  className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Next document"
                  aria-label="Next document"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline ml-1">
                  {currentFileIndex + 1} / {sortedFilesForNavigation.length}
                </span>
              </div>
              {/* File info - truncated on mobile */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="hidden sm:block">{getFileIcon(viewerFile)}</div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base">{viewerFile.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    v{viewerFile.currentVersion} • {viewerFile.project.name}
                  </p>
                </div>
              </div>
              {/* Action buttons - fewer on mobile */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {/* Landscape mode toggle - mobile only */}
                <button
                  onClick={() => setLandscapeMode(!landscapeMode)}
                  className={`min-h-[44px] min-w-[44px] p-2 sm:p-3 rounded-lg md:hidden flex items-center justify-center ${
                    landscapeMode
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                  title={landscapeMode ? 'Exit Landscape Mode' : 'Landscape Mode'}
                  aria-label={landscapeMode ? 'Exit Landscape Mode' : 'Landscape Mode'}
                >
                  {landscapeMode ? (
                    <Smartphone className="h-5 w-5" />
                  ) : (
                    <RotateCcw className="h-5 w-5" />
                  )}
                </button>
                {/* Analyze with AI button - hidden on mobile, use desktop for detailed analysis */}
                {(() => {
                  const ext = getFileExtension(viewerFile.name).toLowerCase()
                  const supportedExts = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp']
                  const isPdf = ext === 'pdf'
                  const activeJob = getJobForFile(viewerFile.id)
                  const hasActiveJob = activeJob && ['PENDING', 'PROCESSING'].includes(activeJob.status)
                  const hasCompletedJob = activeJob && activeJob.status === 'COMPLETED'

                  if (supportedExts.includes(ext)) {
                    return (
                      <div className="hidden sm:flex items-center gap-1">
                        {/* Quick analyze (first page) */}
                        <button
                          onClick={() => handleAnalyzeExisting(viewerFile)}
                          disabled={analyzingFileId === viewerFile.id || hasActiveJob}
                          className="min-h-[44px] px-3 py-2 hover:bg-purple-100 rounded-lg text-purple-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
                          title={isPdf ? "Quick Analyze (first page)" : "Analyze with AI"}
                          aria-label={isPdf ? "Quick Analyze (first page)" : "Analyze with AI"}
                        >
                          {analyzingFileId === viewerFile.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : hasActiveJob ? (
                            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                          ) : (
                            <Sparkles className="h-5 w-5" />
                          )}
                          <span className="text-sm font-medium">{isPdf ? 'Quick' : 'Analyze'}</span>
                        </button>
                        {/* Full analyze button for PDFs (background processing) - also shows completed results */}
                        {isPdf && (
                          <button
                            onClick={() => hasCompletedJob ? setShowAnalyzeResults(true) : handleBackgroundOcr(viewerFile)}
                            disabled={analyzingFileId === viewerFile.id || hasActiveJob}
                            className={`min-h-[44px] px-3 py-2 hover:bg-purple-100 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                              hasCompletedJob ? 'text-green-600' : 'text-purple-600'
                            }`}
                            title={hasCompletedJob ? "View analysis results" : "Analyze all pages (runs in background)"}
                            aria-label="Analyze all pages"
                          >
                            {hasActiveJob ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : hasCompletedJob ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Layers className="h-5 w-5" />
                            )}
                            <span className="text-sm font-medium">{hasCompletedJob ? 'Results' : 'All'}</span>
                          </button>
                        )}
                      </div>
                    )
                  }
                  return null
                })()}
                {/* Download - always visible */}
                <FileDownloadLink
                  fileId={viewerFile.id}
                  storagePath={viewerFile.storagePath}
                  fileName={viewerFile.name}
                  className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 flex items-center justify-center"
                >
                  <Download className="h-5 w-5" />
                </FileDownloadLink>
                {/* Upload revision - hidden on mobile */}
                <button
                  onClick={() => {
                    setSelectedFile(viewerFile)
                    setShowUploadRevisionModal(true)
                    setViewerFile(null)
                  }}
                  className="hidden sm:flex min-h-[44px] min-w-[44px] p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 items-center justify-center"
                  title="Upload New Version"
                  aria-label="Upload New Version"
                >
                  <Upload className="h-5 w-5" />
                </button>
                {/* Close button */}
                <button
                  onClick={() => setViewerFile(null)}
                  className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 flex items-center justify-center"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content - less padding on mobile */}
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-2 sm:p-4">
              {viewerLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : !viewerUrl ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <p className="text-gray-500 dark:text-gray-400">Failed to load file</p>
                </div>
              ) : (() => {
                const ext = getFileExtension(viewerFile.name)
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif'].includes(ext)
                const isPdf = ext === 'pdf'
                const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext)

                if (isImage) {
                  return (
                    <div className="flex items-center justify-center min-h-full">
                      <img
                        src={viewerUrl}
                        alt={viewerFile.name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-image.png'
                        }}
                      />
                    </div>
                  )
                }

                if (isPdf) {
                  return (
                    <PDFViewer
                      url={viewerUrl}
                      fileName={viewerFile.name}
                      className="h-full"
                    />
                  )
                }

                if (isVideo) {
                  return (
                    <div className="flex items-center justify-center min-h-full">
                      <video
                        src={viewerUrl}
                        controls
                        className="max-w-full max-h-full rounded-lg shadow-lg"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )
                }

                // For other file types, show file info
                const typeInfo = getFileTypeInfo(viewerFile.name)
                return (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md">
                      <div className="inline-flex p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                        {getFileIcon(viewerFile)}
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{viewerFile.name}</h4>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">{typeInfo.label}</p>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-6">
                        <p>Version: {viewerFile.currentVersion}</p>
                        <p>Uploaded by: {viewerFile.uploader.name}</p>
                        <p>Project: {viewerFile.project.name}</p>
                        {viewerFile.category && (
                          <p>Category: {DOCUMENT_CATEGORIES.find(c => c.value === viewerFile.category)?.label}</p>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                        This file type cannot be previewed in the browser.
                      </p>
                      <FileDownloadLink
                        fileId={viewerFile.id}
                        storagePath={viewerFile.storagePath}
                        fileName={viewerFile.name}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                      >
                        <Download className="h-5 w-5" />
                        Download File
                      </FileDownloadLink>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Footer with file details */}
            {viewerFile.description && (
              <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">{viewerFile.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Analysis Results Modal */}
      {showAnalyzeResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Document Analysis</h3>
              </div>
              <button onClick={() => setShowAnalyzeResults(false)}>
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {/* Check for active background OCR job */}
              {viewerFile && (() => {
                const activeJob = getJobForFile(viewerFile.id)
                if (activeJob && ['PENDING', 'PROCESSING'].includes(activeJob.status)) {
                  return (
                    <div className="bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-700 rounded-xl p-5">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-purple-800 dark:text-purple-300">
                            {activeJob.status === 'PENDING' ? 'Starting analysis...' : 'Analyzing document...'}
                          </p>
                          <p className="text-base text-purple-600 dark:text-purple-400">
                            {activeJob.processedPages} of {activeJob.totalPages} pages
                          </p>
                        </div>
                      </div>
                      {/* Larger progress bar with percentage */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-purple-700 dark:text-purple-400">
                            {Math.round(activeJob.progress)}%
                          </span>
                        </div>
                        <div className="w-full bg-purple-200 dark:bg-purple-900/50 rounded-full h-4">
                          <div
                            className="bg-purple-600 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${activeJob.progress}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-purple-600 dark:text-purple-400 mt-4 font-medium">
                        You can close this and come back later. Analysis continues in the background.
                      </p>
                    </div>
                  )
                }

                // Check for completed background job
                if (activeJob && activeJob.status === 'COMPLETED' && activeJob.result) {
                  const result = activeJob.result as ExtractedDocumentData & {
                    summary?: {
                      projectMatch?: { id: string; name: string; confidence: number }
                      uniqueDrawings?: string[]
                      sheetTitles?: string[]
                      disciplines?: string[]
                    }
                    pageCount?: number
                    pages?: Array<{
                      pageNumber: number
                      drawingInfo?: { drawingNumber?: string; discipline?: string; sheetTitle?: string }
                    }>
                    error?: string
                  }

                  // Check if the result contains an error (OCR failed)
                  if (result.error) {
                    return (
                      <div className="space-y-4">
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
                          <p className="text-red-700 dark:text-red-400 font-medium">Analysis failed</p>
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{result.error}</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (viewerFile) {
                              await deleteJob(activeJob.id)
                              await fetchOcrJobs()
                              handleBackgroundOcr(viewerFile)
                            }
                          }}
                          className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                        >
                          Retry Analysis
                        </button>
                      </div>
                    )
                  }

                  // Get project match from summary or root
                  const projectMatch = result.summary?.projectMatch || result.projectMatch
                  // Get drawing info from summary or root
                  const uniqueDrawings = result.summary?.uniqueDrawings || (result.drawingInfo?.drawingNumber ? [result.drawingInfo.drawingNumber] : [])
                  const disciplines = result.summary?.disciplines || (result.drawingInfo?.discipline ? [result.drawingInfo.discipline] : [])
                  const sheetTitles = result.summary?.sheetTitles || (result.drawingInfo?.sheetTitle ? [result.drawingInfo.sheetTitle] : [])

                  // Use totalPages from the job for accurate count
                  const pageCount = activeJob.totalPages || result.pageCount || activeJob.processedPages || 1

                  // Show results from background job
                  return (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-green-700">
                            Analysis completed ({pageCount} pages analyzed)
                          </p>
                          <button
                            onClick={async () => {
                              if (viewerFile) {
                                // Delete old job and start new one
                                await deleteJob(activeJob.id)
                                await fetchOcrJobs()
                                handleBackgroundOcr(viewerFile)
                              }
                            }}
                            className="text-xs text-green-600 hover:text-green-800 underline"
                          >
                            Re-analyze
                          </button>
                        </div>
                      </div>
                      {projectMatch && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-green-800 mb-1">Project Match</p>
                          <p className="text-green-700">{projectMatch.name}</p>
                          <p className="text-xs text-green-600">Confidence: {Math.round(projectMatch.confidence * 100)}%</p>
                        </div>
                      )}
                      {uniqueDrawings.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-blue-800 mb-2">Drawing Numbers Found</p>
                          <div className="flex flex-wrap gap-2">
                            {uniqueDrawings.slice(0, 10).map((num, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {num}
                              </span>
                            ))}
                            {uniqueDrawings.length > 10 && (
                              <span className="px-2 py-1 text-blue-600 text-xs">
                                +{uniqueDrawings.length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {disciplines.length > 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-purple-800 mb-2">Disciplines</p>
                          <div className="flex flex-wrap gap-2">
                            {disciplines.map((disc, i) => (
                              <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                {disc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {sheetTitles.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-800 mb-2">Sheet Titles</p>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {sheetTitles.slice(0, 5).map((title, i) => (
                              <li key={i} className="truncate">{title}</li>
                            ))}
                            {sheetTitles.length > 5 && (
                              <li className="text-gray-500 text-xs">+{sheetTitles.length - 5} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {!projectMatch && uniqueDrawings.length === 0 && disciplines.length === 0 && sheetTitles.length === 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                          <p className="text-gray-600 dark:text-gray-400">No metadata could be extracted from this document.</p>
                        </div>
                      )}

                      {/* Review & Split button - main action after analysis */}
                      <div className="pt-4 border-t">
                        <button
                          onClick={async () => {
                            if (viewerFile) {
                              setShowAnalyzeResults(false)
                              // Trigger the split workflow with OCR data from the job
                              await handleSplitWithOcrData(viewerFile, activeJob)
                            }
                          }}
                          className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <Scissors className="h-5 w-5" />
                          Review & Split into Individual Files
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">
                          Verify each page and save as separate documents
                        </p>
                      </div>
                    </div>
                  )
                }

                // Check for failed job
                if (activeJob && activeJob.status === 'FAILED') {
                  return (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700">{activeJob.error || 'Analysis failed'}</p>
                    </div>
                  )
                }

                return null
              })()}

              {/* Show regular analyze error/results if no background job */}
              {viewerFile && getJobForFile(viewerFile.id) ? null : analyzeError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{analyzeError}</p>
                </div>
              ) : analyzeResults ? (
                <div className="space-y-4">
                  {/* Project Match */}
                  {analyzeResults.projectMatch && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-800 mb-1">Project Match</p>
                      <p className="text-green-700">{analyzeResults.projectMatch.name}</p>
                      <p className="text-xs text-green-600">Confidence: {Math.round(analyzeResults.projectMatch.confidence * 100)}%</p>
                    </div>
                  )}

                  {/* Drawing Info */}
                  {analyzeResults.drawingInfo && Object.values(analyzeResults.drawingInfo).some(v => v) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-800 mb-2">Drawing Information</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {analyzeResults.drawingInfo.drawingNumber && (
                          <div>
                            <span className="text-blue-600">Drawing #:</span>{' '}
                            <span className="text-blue-800">{analyzeResults.drawingInfo.drawingNumber}</span>
                          </div>
                        )}
                        {analyzeResults.drawingInfo.sheetNumber && (
                          <div>
                            <span className="text-blue-600">Sheet #:</span>{' '}
                            <span className="text-blue-800">{analyzeResults.drawingInfo.sheetNumber}</span>
                          </div>
                        )}
                        {analyzeResults.drawingInfo.sheetTitle && (
                          <div className="col-span-2">
                            <span className="text-blue-600">Sheet Title:</span>{' '}
                            <span className="text-blue-800">{analyzeResults.drawingInfo.sheetTitle}</span>
                          </div>
                        )}
                        {analyzeResults.drawingInfo.revision && (
                          <div>
                            <span className="text-blue-600">Revision:</span>{' '}
                            <span className="text-blue-800">{analyzeResults.drawingInfo.revision}</span>
                          </div>
                        )}
                        {analyzeResults.drawingInfo.discipline && (
                          <div>
                            <span className="text-blue-600">Discipline:</span>{' '}
                            <span className="text-blue-800">{analyzeResults.drawingInfo.discipline}</span>
                          </div>
                        )}
                        {analyzeResults.drawingInfo.scale && (
                          <div>
                            <span className="text-blue-600">Scale:</span>{' '}
                            <span className="text-blue-800">{analyzeResults.drawingInfo.scale}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Location Info */}
                  {analyzeResults.locationInfo && Object.values(analyzeResults.locationInfo).some(v => v) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-yellow-800 mb-2">Location Information</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {analyzeResults.locationInfo.building && (
                          <div>
                            <span className="text-yellow-600">Building:</span>{' '}
                            <span className="text-yellow-800">{analyzeResults.locationInfo.building}</span>
                          </div>
                        )}
                        {analyzeResults.locationInfo.floor && (
                          <div>
                            <span className="text-yellow-600">Floor:</span>{' '}
                            <span className="text-yellow-800">{analyzeResults.locationInfo.floor}</span>
                          </div>
                        )}
                        {analyzeResults.locationInfo.zone && (
                          <div>
                            <span className="text-yellow-600">Zone:</span>{' '}
                            <span className="text-yellow-800">{analyzeResults.locationInfo.zone}</span>
                          </div>
                        )}
                        {analyzeResults.locationInfo.room && (
                          <div>
                            <span className="text-yellow-600">Room:</span>{' '}
                            <span className="text-yellow-800">{analyzeResults.locationInfo.room}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  {analyzeResults.dates && Object.values(analyzeResults.dates).some(v => v) && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-purple-800 mb-2">Dates</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {analyzeResults.dates.documentDate && (
                          <div>
                            <span className="text-purple-600">Document Date:</span>{' '}
                            <span className="text-purple-800">{analyzeResults.dates.documentDate}</span>
                          </div>
                        )}
                        {analyzeResults.dates.revisionDate && (
                          <div>
                            <span className="text-purple-600">Revision Date:</span>{' '}
                            <span className="text-purple-800">{analyzeResults.dates.revisionDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No data found */}
                  {!analyzeResults.projectMatch &&
                    !Object.values(analyzeResults.drawingInfo || {}).some(v => v) &&
                    !Object.values(analyzeResults.locationInfo || {}).some(v => v) &&
                    !Object.values(analyzeResults.dates || {}).some(v => v) && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-gray-600 dark:text-gray-400">No metadata could be extracted from this document.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                </div>
              )}
            </div>
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => setShowAnalyzeResults(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Progress Modal - Shows during OCR analysis */}
      {splittingFileId && splittingFileName && !showSplitModal && (
        <SplitProgressModal
          fileName={splittingFileName}
          onCancel={() => {
            setSplittingFileId(null)
            setSplittingFileName(null)
          }}
        />
      )}

      {/* Document Split Modal */}
      {showSplitModal && activeDraft && (
        <DocumentSplitModal
          draft={activeDraft}
          onClose={() => {
            setShowSplitModal(false)
            setActiveDraft(null)
            setSplitPdfUrl(null)
          }}
          onUpdatePages={handleUpdatePages}
          pdfUrl={splitPdfUrl || undefined}
          onConfirm={handleConfirmSplit}
          onDiscard={() => handleDiscardDraft(activeDraft.id)}
          loading={splitLoading}
        />
      )}
    </div>
  )
}
