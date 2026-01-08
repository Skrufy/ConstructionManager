'use client'

import Link from 'next/link'
import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Upload,
  ExternalLink,
} from 'lucide-react'

interface ProjectFile {
  id: string
  name: string
  category: string | null
  type: string  // 'image', 'document', 'video'
  createdAt: Date
  uploader: {
    name: string
  } | null
}

interface ProjectDocumentsProps {
  projectId: string
  files: ProjectFile[]
  totalCount: number
}

function getFileIcon(type: string) {
  switch (type) {
    case 'image':
      return <Image className="h-5 w-5 text-purple-600" />
    case 'document':
      return <FileText className="h-5 w-5 text-blue-600" />
    case 'video':
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />
    default:
      return <File className="h-5 w-5 text-gray-600 dark:text-gray-400" />
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    PHOTO: 'Photo',
    DOCUMENT: 'Document',
    DRAWING: 'Drawing',
    PERMIT: 'Permit',
    CONTRACT: 'Contract',
    INVOICE: 'Invoice',
    REPORT: 'Report',
    OTHER: 'Other',
  }
  return labels[category] || category
}

export function ProjectDocuments({ projectId, files, totalCount }: ProjectDocumentsProps) {
  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Drawings</h2>
        <div className="flex items-center gap-3">
          <Link
            href="/drawings"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View All ({totalCount})
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8">
          <File className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-4">No drawings uploaded yet</p>
          <Link
            href="/drawings"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            View Drawings
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {files.map((file) => (
              <li key={file.id}>
                <Link
                  href={`/documents/${file.id}`}
                  className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                >
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getCategoryLabel(file.category || 'OTHER')} • {formatTimeAgo(file.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/drawings"
              className="btn btn-outline w-full flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View All Drawings
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
