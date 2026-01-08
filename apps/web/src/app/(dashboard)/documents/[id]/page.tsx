'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Download,
  Calendar,
  User,
  Folder,
  Tag,
  Clock,
  History,
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react'

interface DocumentRevision {
  id: string
  version: number
  fileName: string
  storagePath: string
  createdAt: string
  uploadedBy?: string
}

interface DocumentAnnotation {
  id: string
  content: string
  pageNumber?: number
  x?: number
  y?: number
  createdAt: string
  user?: { id: string; name: string }
}

interface Document {
  id: string
  name: string
  description: string | null
  fileName: string
  fileSize: number
  mimeType: string
  category: string | null
  tags: string[]
  storagePath: string
  project: { id: string; name: string } | null
  uploader: { id: string; name: string } | null
  revisions: DocumentRevision[]
  annotations: DocumentAnnotation[]
  _count: {
    revisions: number
    annotations: number
  }
  createdAt: string
  updatedAt: string
}

const CATEGORY_COLORS: Record<string, string> = {
  DRAWING: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
  SPECIFICATION: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
  CONTRACT: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  PERMIT: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400',
  REPORT: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400',
  PHOTO: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-400',
  OTHER: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
}

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchDocument(params.id as string)
    }
  }, [params.id])

  const fetchDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`)
      if (!res.ok) throw new Error('Document not found')
      const data = await res.json()
      setDocument(data.document)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDelete = async () => {
    if (!document || !confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete document')
      router.push('/documents')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error || 'Document not found'}
        </div>
        <Link href="/documents" className="mt-4 inline-block text-blue-600 dark:text-blue-400">
          &larr; Back to Documents
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/documents" className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
          </Link>
          <div>
            {document.category && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[document.category] || CATEGORY_COLORS.OTHER}`}>
                {document.category}
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {document.name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/documents/${document.id}/download`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* File Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">File Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">File Name</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{document.fileName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Folder className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">File Size</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatFileSize(document.fileSize)}</p>
              </div>
            </div>

            {document.project && (
              <div className="flex items-start gap-3">
                <Folder className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                  <Link
                    href={`/projects/${document.project.id}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {document.project.name}
                  </Link>
                </div>
              </div>
            )}

            {document.uploader && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Uploaded By</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{document.uploader.name}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Uploaded</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(document.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(document.updatedAt)}</p>
              </div>
            </div>
          </div>

          {document.description && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
              <p className="text-gray-700 dark:text-gray-300">{document.description}</p>
            </div>
          )}
        </div>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {document.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Revisions */}
        {document.revisions && document.revisions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <History className="h-5 w-5" />
              Revision History ({document._count.revisions})
            </h2>
            <div className="space-y-3">
              {document.revisions.map(revision => (
                <div
                  key={revision.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-sm font-medium">
                      v{revision.version}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{revision.fileName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(revision.createdAt)}</p>
                    </div>
                  </div>
                  <a
                    href={`/api/documents/${document.id}/download?version=${revision.version}`}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Annotations */}
        {document.annotations && document.annotations.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments & Annotations ({document._count.annotations})
            </h2>
            <div className="space-y-3">
              {document.annotations.map(annotation => (
                <div
                  key={annotation.id}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {annotation.user?.name || 'Unknown User'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(annotation.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{annotation.content}</p>
                  {annotation.pageNumber && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Page {annotation.pageNumber}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
