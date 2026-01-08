'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Download,
  Trash2,
  Upload,
  Scissors,
  MoreVertical,
  Eye,
  Loader2,
  X,
  Share2
} from 'lucide-react'
import { FileDownloadLink } from './file-display'
import { cn } from '@/lib/utils'

interface FileActionsProps {
  file: {
    id: string
    name: string
    storagePath: string
    category?: string | null
    pageCount?: number | null
  }
  onView: () => void
  onUploadRevision?: () => void
  onSplit?: () => void
  onDelete: () => void
  isSplitting?: boolean
  showSplit?: boolean
  variant?: 'default' | 'compact' | 'icon-only'
  className?: string
}

export function FileActions({
  file,
  onView,
  onUploadRevision,
  onSplit,
  onDelete,
  isSplitting = false,
  showSplit = false,
  variant = 'default',
  className
}: FileActionsProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  // Get view button label based on category
  const getViewLabel = () => {
    if (variant === 'icon-only') return null
    switch (file.category) {
      case 'DRAWINGS': return 'Open'
      case 'SPECIFICATIONS': return 'Open'
      case 'CONTRACTS': return 'Open'
      case 'PHOTOS': return 'View'
      case 'REPORTS': return 'Open'
      case 'BIM': return 'Open'
      default: return 'Open'
    }
  }

  const viewLabel = getViewLabel()

  return (
    <div className={cn('flex items-center', className)} onClick={e => e.stopPropagation()}>
      {/* Primary Actions - Always visible */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* View/Open Button */}
        <button
          onClick={onView}
          className={cn(
            'min-h-[44px] hover:bg-blue-50 rounded-lg text-blue-600 font-semibold transition-colors flex items-center justify-center gap-1',
            variant === 'icon-only'
              ? 'min-w-[44px] p-2'
              : 'px-3 py-2 text-sm'
          )}
          title="View file"
        >
          {variant === 'icon-only' && <Eye className="h-5 w-5" />}
          {viewLabel}
        </button>

        {/* Download - Always visible */}
        <FileDownloadLink
          fileId={file.id}
          storagePath={file.storagePath}
          fileName={file.name}
          className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-100 rounded-lg flex items-center justify-center"
        >
          <Download className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </FileDownloadLink>

        {/* Share - Always visible */}
        <button
          onClick={() => {
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
          className="min-h-[44px] min-w-[44px] p-2 hover:bg-blue-50 rounded-lg flex items-center justify-center"
          title="Share document"
        >
          <Share2 className="h-5 w-5 text-blue-600" />
        </button>
      </div>

      {/* Secondary Actions - Hidden on mobile, shown in menu */}
      {/* Desktop view - show all buttons */}
      <div className="hidden sm:flex items-center gap-1 sm:gap-2 ml-1">
        {onUploadRevision && (
          <button
            onClick={onUploadRevision}
            className="min-h-[44px] min-w-[44px] p-2 hover:bg-blue-50 rounded-lg text-blue-600 flex items-center justify-center"
            title="Upload New Version"
          >
            <Upload className="h-5 w-5" />
          </button>
        )}

        {showSplit && onSplit && (
          <button
            onClick={onSplit}
            disabled={isSplitting}
            className="min-h-[44px] min-w-[44px] p-2 hover:bg-purple-50 rounded-lg text-purple-600 flex items-center justify-center disabled:opacity-50"
            title={`Split into ${file.pageCount} pages`}
          >
            {isSplitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Scissors className="h-5 w-5" />
            )}
          </button>
        )}

        <button
          onClick={onDelete}
          className="min-h-[44px] min-w-[44px] p-2 hover:bg-red-50 rounded-lg flex items-center justify-center"
          title="Delete file"
        >
          <Trash2 className="h-5 w-5 text-red-500" />
        </button>
      </div>

      {/* Mobile Menu Button */}
      <div className="relative sm:hidden ml-1" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-100 rounded-lg flex items-center justify-center"
          aria-label="More actions"
        >
          <MoreVertical className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
            {/* Share option in mobile menu */}
            <button
              onClick={() => {
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
                setShowMenu(false)
              }}
              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-blue-50 text-gray-700 dark:text-gray-300"
            >
              <Share2 className="h-5 w-5 text-blue-600" />
              <span>Share Link</span>
            </button>

            {onUploadRevision && (
              <button
                onClick={() => {
                  onUploadRevision()
                  setShowMenu(false)
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 text-gray-700 dark:text-gray-300"
              >
                <Upload className="h-5 w-5 text-blue-600" />
                <span>Upload New Version</span>
              </button>
            )}

            {showSplit && onSplit && (
              <button
                onClick={() => {
                  onSplit()
                  setShowMenu(false)
                }}
                disabled={isSplitting}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                {isSplitting ? (
                  <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                ) : (
                  <Scissors className="h-5 w-5 text-purple-600" />
                )}
                <span>Split Pages</span>
              </button>
            )}

            <div className="border-t border-gray-100 my-1" />

            <button
              onClick={() => {
                onDelete()
                setShowMenu(false)
              }}
              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-red-50 text-red-600"
            >
              <Trash2 className="h-5 w-5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
