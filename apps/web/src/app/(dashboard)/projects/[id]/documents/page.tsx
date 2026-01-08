'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { uploadFile } from '@/lib/upload-client'
import Link from 'next/link'
import {
  ArrowLeft,
  Image,
  FileText,
  Upload,
  Folder,
  Search,
  Grid,
  List,
  Download,
  Trash2,
  Calendar,
  Loader2,
  History,
  MessageSquare,
  X,
  FileSpreadsheet,
  Film,
  Archive,
  Box,
  Layers,
  PenTool,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { FileImage as FileImageDisplay, FileDownloadLink, getFileDisplayUrl } from '@/components/ui/file-display'
import { PDFViewer } from '@/components/ui/pdf-viewer'

interface DocumentRevision {
  id: string
  version: number
  storagePath: string
  changeNotes: string | null
  uploadedBy: string
  createdAt: string
}

interface File {
  id: string
  name: string
  type: string
  storagePath: string
  projectId: string
  uploader: { id: string; name: string }
  createdAt: string
  currentVersion: number
  category: string | null
  description: string | null
  _count?: {
    revisions: number
    annotations: number
  }
}

interface Project {
  id: string
  name: string
}

const DOCUMENT_CATEGORIES = [
  { value: 'DRAWINGS', label: 'Drawings', color: 'blue' },
  { value: 'SPECIFICATIONS', label: 'Specifications', color: 'purple' },
  { value: 'CONTRACTS', label: 'Contracts', color: 'green' },
  { value: 'PHOTOS', label: 'Photos', color: 'yellow' },
  { value: 'REPORTS', label: 'Reports', color: 'red' },
  { value: 'BIM', label: 'BIM/3D Models', color: 'indigo' },
  { value: 'OTHER', label: 'Other', color: 'gray' },
]

const CONSTRUCTION_FILE_TYPES = {
  dwg: { label: 'AutoCAD Drawing', icon: 'cad', color: 'blue' },
  dxf: { label: 'DXF Drawing', icon: 'cad', color: 'blue' },
  dwf: { label: 'Design Web Format', icon: 'cad', color: 'blue' },
  rvt: { label: 'Revit Model', icon: 'bim', color: 'indigo' },
  rfa: { label: 'Revit Family', icon: 'bim', color: 'indigo' },
  ifc: { label: 'IFC Model', icon: 'bim', color: 'indigo' },
  nwd: { label: 'Navisworks Model', icon: 'bim', color: 'indigo' },
  nwc: { label: 'Navisworks Cache', icon: 'bim', color: 'indigo' },
  skp: { label: 'SketchUp Model', icon: '3d', color: 'purple' },
  step: { label: 'STEP 3D Model', icon: '3d', color: 'purple' },
  stp: { label: 'STEP 3D Model', icon: '3d', color: 'purple' },
  stl: { label: 'STL 3D Model', icon: '3d', color: 'purple' },
  obj: { label: 'OBJ 3D Model', icon: '3d', color: 'purple' },
  fbx: { label: 'FBX 3D Model', icon: '3d', color: 'purple' },
  pdf: { label: 'PDF Document', icon: 'pdf', color: 'red' },
  doc: { label: 'Word Document', icon: 'doc', color: 'blue' },
  docx: { label: 'Word Document', icon: 'doc', color: 'blue' },
  xls: { label: 'Excel Spreadsheet', icon: 'xls', color: 'green' },
  xlsx: { label: 'Excel Spreadsheet', icon: 'xls', color: 'green' },
  ppt: { label: 'PowerPoint', icon: 'ppt', color: 'orange' },
  pptx: { label: 'PowerPoint', icon: 'ppt', color: 'orange' },
  jpg: { label: 'JPEG Image', icon: 'image', color: 'green' },
  jpeg: { label: 'JPEG Image', icon: 'image', color: 'green' },
  png: { label: 'PNG Image', icon: 'image', color: 'green' },
  gif: { label: 'GIF Image', icon: 'image', color: 'green' },
  webp: { label: 'WebP Image', icon: 'image', color: 'green' },
  heic: { label: 'HEIC Image', icon: 'image', color: 'green' },
  tiff: { label: 'TIFF Image', icon: 'image', color: 'green' },
  tif: { label: 'TIFF Image', icon: 'image', color: 'green' },
  bmp: { label: 'BMP Image', icon: 'image', color: 'green' },
  mp4: { label: 'MP4 Video', icon: 'video', color: 'pink' },
  mov: { label: 'QuickTime Video', icon: 'video', color: 'pink' },
  avi: { label: 'AVI Video', icon: 'video', color: 'pink' },
  zip: { label: 'ZIP Archive', icon: 'archive', color: 'gray' },
  rar: { label: 'RAR Archive', icon: 'archive', color: 'gray' },
} as const

const ACCEPTED_FILE_TYPES = '.dwg,.dxf,.dwf,.rvt,.rfa,.ifc,.nwd,.nwc,.skp,.step,.stp,.stl,.obj,.fbx,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.heic,.tiff,.tif,.bmp,.mp4,.mov,.avi,.zip,.rar'

const FILE_COLOR_CLASSES = {
  blue: { icon: 'text-blue-500', bg: 'bg-blue-100', text: 'text-blue-700' },
  indigo: { icon: 'text-indigo-500', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  purple: { icon: 'text-purple-500', bg: 'bg-purple-100', text: 'text-purple-700' },
  red: { icon: 'text-red-500', bg: 'bg-red-100', text: 'text-red-700' },
  green: { icon: 'text-green-500', bg: 'bg-green-100', text: 'text-green-700' },
  orange: { icon: 'text-orange-500', bg: 'bg-orange-100', text: 'text-orange-700' },
  pink: { icon: 'text-pink-500', bg: 'bg-pink-100', text: 'text-pink-700' },
  gray: { icon: 'text-gray-500', bg: 'bg-gray-100', text: 'text-gray-700' },
  yellow: { icon: 'text-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-700' },
} as const

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function getFileTypeInfo(filename: string) {
  const ext = getFileExtension(filename)
  return CONSTRUCTION_FILE_TYPES[ext as keyof typeof CONSTRUCTION_FILE_TYPES] || { label: 'Unknown', icon: 'file', color: 'gray' }
}

export default function ProjectDocumentsPage() {
  const params = useParams()
  const projectId = params.id as string
  const { data: session } = useSession()

  // Check if user can manage documents (not field worker or viewer)
  const userRole = (session?.user as { role?: string })?.role || 'FIELD_WORKER'
  const canManageDocuments = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT', 'FOREMAN', 'ARCHITECT', 'DEVELOPER'].includes(userRole)

  const [project, setProject] = useState<Project | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [viewerFile, setViewerFile] = useState<File | null>(null)
  const [showUploadRevisionModal, setShowUploadRevisionModal] = useState(false)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [revisions, setRevisions] = useState<DocumentRevision[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const revisionInputRef = useRef<HTMLInputElement>(null)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [pendingUploads, setPendingUploads] = useState<Array<{
    file: globalThis.File
    category: string
    suggestedCategory: string
    isAdminOnly: boolean
  }>>([])

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

  useEffect(() => {
    fetchData()
  }, [projectId, filterCategory, currentPage])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterCategory])

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      params.set('projectId', projectId)
      params.set('page', currentPage.toString())
      params.set('limit', itemsPerPage.toString())
      if (filterCategory) params.set('category', filterCategory)

      const [filesRes, projectRes] = await Promise.all([
        fetch(`/api/documents?${params}`),
        fetch(`/api/projects/${projectId}`),
      ])

      if (filesRes.ok) {
        const filesData = await filesRes.json()
        setFiles(filesData.documents || [])
        setCategoryCounts(filesData.categories || {})
        setTotalCount(filesData.total || 0)
        setTotalPages(filesData.pages || 1)
      }

      if (projectRes.ok) {
        const projectData = await projectRes.json()
        setProject(projectData.project)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
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
        isAdminOnly: false
      }
    })

    setPendingUploads(pending)
    setShowUploadModal(true)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Update category for a pending upload
  const updatePendingCategory = (index: number, category: string) => {
    setPendingUploads(prev => prev.map((item, i) =>
      i === index ? { ...item, category } : item
    ))
  }

  // Update isAdminOnly for a pending upload
  const updatePendingAdminOnly = (index: number, isAdminOnly: boolean) => {
    setPendingUploads(prev => prev.map((item, i) =>
      i === index ? { ...item, isAdminOnly } : item
    ))
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'admin'

  // Cancel upload modal
  const cancelUpload = () => {
    setShowUploadModal(false)
    setPendingUploads([])
  }

  // Confirm and perform the uploads
  const confirmUpload = async () => {
    setShowUploadModal(false)
    setUploading(true)

    for (const { file, category, isAdminOnly } of pendingUploads) {
      try {
        const result = await uploadFile(file, {
          projectId,
          category: category || undefined,
          isAdminOnly
        })

        if (result.success && result.file) {
          setFiles((prev) => [
            {
              id: result.file!.id,
              name: result.file!.name,
              type: result.file!.type as string,
              storagePath: result.file!.storagePath,
              projectId: result.file!.projectId as string,
              uploader: result.file!.uploader as { id: string; name: string },
              createdAt: result.file!.createdAt as string,
              currentVersion: (result.file!.currentVersion as number) || 1,
              category: result.file!.category as string | null,
              description: result.file!.description as string | null,
              _count: { revisions: 1, annotations: 0 }
            },
            ...prev,
          ])
        } else {
          console.error('Upload error:', result.error)
          alert(`Failed to upload ${file.name}: ${result.error}`)
        }
      } catch (error) {
        console.error('Upload error:', error)
        alert(`Failed to upload file: ${error}`)
      }
    }

    setPendingUploads([])
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

        setFiles(prev => prev.map(f =>
          f.id === selectedFile.id
            ? {
                ...f,
                currentVersion: data.newVersion,
                storagePath: data.storagePath,
                _count: {
                  revisions: (f._count?.revisions || 1) + 1,
                  annotations: f._count?.annotations || 0
                }
              }
            : f
        ))

        setShowUploadRevisionModal(false)
        setRevisionNotes('')
        setSelectedFile(null)
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
        alert(`Failed to upload revision: ${errorMessage}`)
      }
    } catch (error) {
      alert(`Failed to upload revision: ${error}`)
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

  const toggleFileExpand = (fileId: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId)
    } else {
      newExpanded.add(fileId)
      fetchRevisions(fileId)
    }
    setExpandedFiles(newExpanded)
  }

  const filteredFiles = files.filter((file) => {
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

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
      case 'doc':
      case 'ppt':
        return <FileText className={`h-5 w-5 ${colorClasses.icon}`} />
      case 'xls':
        return <FileSpreadsheet className={`h-5 w-5 ${colorClasses.icon}`} />
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <Link
            href={`/projects/${projectId}`}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Link href="/projects" className="hover:text-gray-700 dark:hover:text-gray-300">Projects</Link>
              <span>/</span>
              <Link href={`/projects/${projectId}`} className="hover:text-gray-700 dark:hover:text-gray-300">
                {project?.name || 'Project'}
              </Link>
              <span>/</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">Documents</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Project Documents</h1>
            <p className="text-gray-600 dark:text-gray-400">Upload and manage documents for {project?.name}</p>
          </div>
        </div>
        {canManageDocuments && (
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
        )}
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !filterCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({files.length})
        </button>
        {DOCUMENT_CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterCategory === cat.value
                ? `bg-${cat.color}-600 text-white`
                : `bg-${cat.color}-50 text-${cat.color}-700 hover:bg-${cat.color}-100`
            }`}
          >
            {cat.label} ({categoryCounts[cat.value] || 0})
          </button>
        ))}
      </div>

      {/* Search and View Toggle */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex border rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Folder className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{files.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <History className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {files.reduce((sum, f) => sum + (f._count?.revisions || 1), 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Revisions</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <MessageSquare className="h-5 w-5 text-purple-600" />
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
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Image className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {files.filter(f => f.type === 'image').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Photos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <div className="card p-12 text-center">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {files.length === 0 ? 'No files uploaded yet' : 'No files match your search'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {files.length === 0
              ? 'Upload photos and documents to get started'
              : 'Try adjusting your search criteria'}
          </p>
          {files.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Upload className="h-5 w-5" />
              Upload First Document
            </button>
          )}
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
                  <FileDownloadLink
                    fileId={file.id}
                    storagePath={file.storagePath}
                    fileName={file.name}
                    className="min-h-[48px] min-w-[48px] p-3 bg-white rounded-full hover:bg-gray-100 flex items-center justify-center shadow-lg"
                  >
                    <Download className="h-5 w-5" />
                  </FileDownloadLink>
                  {canManageDocuments && (
                    <button
                      className="min-h-[48px] min-w-[48px] p-3 bg-white rounded-full hover:bg-gray-100 flex items-center justify-center shadow-lg"
                      aria-label="Delete file"
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(file.createdAt)}</p>
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
                className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleFileExpand(file.id)}
              >
                <button className="flex-shrink-0">
                  {expandedFiles.has(file.id) ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                <div className="flex-shrink-0">{getFileIcon(file)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
                    {getFileTypeBadge(file.name)}
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                      v{file.currentVersion}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(file.createdAt)}
                    </span>
                    {/* Hide revision count on mobile to prevent overlap with buttons */}
                    <span className="hidden sm:flex items-center gap-1">
                      <History className="h-3 w-3" />
                      {file._count?.revisions || 1} revisions
                    </span>
                    {(file._count?.annotations || 0) > 0 && (
                      <span className="hidden sm:flex items-center gap-1 text-purple-600">
                        <MessageSquare className="h-3 w-3" />
                        {file._count?.annotations} annotations
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setViewerFile(file)}
                    className="min-h-[44px] px-3 sm:px-4 py-2 hover:bg-blue-50 rounded-lg text-blue-600 text-sm sm:text-base font-semibold transition-colors"
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
                  {canManageDocuments && (
                    <button
                      onClick={() => {
                        setSelectedFile(file)
                        setShowUploadRevisionModal(true)
                      }}
                      className="min-h-[44px] min-w-[44px] p-2.5 hover:bg-blue-50 rounded-lg text-blue-600 flex items-center justify-center"
                      title="Upload New Version"
                      aria-label="Upload New Version"
                    >
                      <Upload className="h-5 w-5" />
                    </button>
                  )}
                  <FileDownloadLink
                    fileId={file.id}
                    storagePath={file.storagePath}
                    fileName={file.name}
                    className="min-h-[44px] min-w-[44px] p-2.5 hover:bg-gray-100 rounded-lg flex items-center justify-center"
                  >
                    <Download className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </FileDownloadLink>
                  {canManageDocuments && (
                    <button
                      className="min-h-[44px] min-w-[44px] p-2.5 hover:bg-gray-100 rounded-lg flex items-center justify-center"
                      aria-label="Delete file"
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedFiles.has(file.id) && (
                <div className="bg-gray-50 px-12 py-4 border-t">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Revision History
                  </h4>
                  <div className="space-y-2">
                    {revisions.filter(r => r.id.startsWith(file.id.substring(0, 8)) || revisions.length > 0).slice(0, 5).map((rev) => (
                      <div key={rev.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">v{rev.version}</span>
                          <span className="text-gray-500 dark:text-gray-400">{rev.changeNotes || 'No notes'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400">{formatDate(rev.createdAt)}</span>
                          {rev.version === file.currentVersion && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Current</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {revisions.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading revision history...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} files
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 py-2 text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal with Category Selection */}
      {showUploadModal && pendingUploads.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Upload Documents</h3>
              <button onClick={cancelUpload}>
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Select a category for each file. PDFs and documents require manual categorization.
              </p>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {pendingUploads.map((item, index) => {
                  const ext = getFileExtension(item.file.name)
                  const needsCategory = ['pdf', 'doc', 'docx'].includes(ext)
                  return (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.file.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category {needsCategory && <span className="text-red-500">*</span>}
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) => updatePendingCategory(index, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            needsCategory && !item.category ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                      {isAdmin && (
                        <div className="mt-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.isAdminOnly}
                              onChange={(e) => updatePendingAdminOnly(index, e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              Admin Only
                              <span className="text-gray-500 ml-1">(hidden from foremen/crew)</span>
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={cancelUpload}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                disabled={pendingUploads.some(item => {
                  const ext = getFileExtension(item.file.name)
                  return ['pdf', 'doc', 'docx'].includes(ext) && !item.category
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

      {/* Upload Revision Modal */}
      {showUploadRevisionModal && selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Upload New Version</h3>
              <button onClick={() => setShowUploadRevisionModal(false)}>
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Current: {selectedFile.name} (v{selectedFile.currentVersion})</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">New version will be: v{selectedFile.currentVersion + 1}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select File
                </label>
                <input
                  ref={revisionInputRef}
                  type="file"
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Change Notes
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Describe what changed in this version..."
                  rows={3}
                  className="textarea"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowUploadRevisionModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
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
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setViewerFile(null)}
        >
          <div
            className="relative w-[95vw] h-[95vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                {getFileIcon(viewerFile)}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{viewerFile.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    v{viewerFile.currentVersion} • {formatDate(viewerFile.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileDownloadLink
                  fileId={viewerFile.id}
                  storagePath={viewerFile.storagePath}
                  fileName={viewerFile.name}
                  className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 dark:text-gray-400"
                >
                  <Download className="h-5 w-5" />
                </FileDownloadLink>
                <button
                  onClick={() => setViewerFile(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 dark:text-gray-400"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-100 p-4">
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

                const typeInfo = getFileTypeInfo(viewerFile.name)
                return (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
                      <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                        {getFileIcon(viewerFile)}
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{viewerFile.name}</h4>
                      <p className="text-gray-500 mb-4">{typeInfo.label}</p>
                      <p className="text-sm text-gray-400 mb-4">
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
          </div>
        </div>
      )}
    </div>
  )
}
