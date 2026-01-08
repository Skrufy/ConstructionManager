'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface FileImageProps {
  fileId: string
  storagePath: string
  alt: string
  className?: string
  fallback?: React.ReactNode
}

interface FileDownloadLinkProps {
  fileId: string
  storagePath: string
  fileName: string
  children: React.ReactNode
  className?: string
}

/**
 * Check if a storage path is a legacy local path that can be used directly
 */
function isLegacyPath(storagePath: string): boolean {
  return storagePath.startsWith('/uploads/') || storagePath.startsWith('http')
}

/**
 * FileImage component that handles both legacy local files and Supabase Storage files
 * For legacy files: uses the storagePath directly
 * For Supabase files: fetches a signed URL
 */
export function FileImage({
  fileId,
  storagePath,
  alt,
  className = '',
  fallback
}: FileImageProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadUrl() {
      // Legacy files can use the path directly
      if (isLegacyPath(storagePath)) {
        setUrl(storagePath)
        setLoading(false)
        return
      }

      // Supabase files need a signed URL
      try {
        const response = await fetch(`/api/files/${fileId}/url`)
        if (response.ok) {
          const data = await response.json()
          setUrl(data.url)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Failed to fetch file URL:', errorData.error || `HTTP ${response.status}`)
          setError(true)
        }
      } catch (err) {
        console.error('Error fetching file URL:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadUrl()
  }, [fileId, storagePath])

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !url) {
    return fallback ? <>{fallback}</> : null
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  )
}

/**
 * FileDownloadLink component that handles both legacy local files and Supabase Storage files
 * For legacy files: uses the storagePath directly
 * For Supabase files: fetches a signed download URL on click
 */
export function FileDownloadLink({
  fileId,
  storagePath,
  fileName,
  children,
  className = ''
}: FileDownloadLinkProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    // Legacy files can use the path directly
    if (isLegacyPath(storagePath)) {
      // Let the default anchor behavior work
      return
    }

    // Supabase files need a signed URL
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/files/${fileId}/url?download=true`)
      if (response.ok) {
        const data = await response.json()
        // Open the signed URL in a new tab for download
        window.open(data.url, '_blank')
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get download URL' }))
        console.error('Failed to get download URL:', errorData.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to get download URL:', error)
    } finally {
      setLoading(false)
    }
  }

  // For legacy files, use direct link
  if (isLegacyPath(storagePath)) {
    return (
      <a
        href={storagePath}
        download={fileName}
        className={className}
      >
        {children}
      </a>
    )
  }

  // For Supabase files, use button that fetches signed URL
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  )
}

/**
 * Hook to get a file URL (signed or direct)
 * Useful for one-off URL fetching
 */
export async function getFileDisplayUrl(
  fileId: string,
  storagePath: string,
  download: boolean = false
): Promise<string> {
  // Legacy files can use the path directly
  if (isLegacyPath(storagePath)) {
    return storagePath
  }

  // Supabase files need a signed URL
  const params = download ? '?download=true' : ''
  const response = await fetch(`/api/files/${fileId}/url${params}`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: null }))
    throw new Error(errorData.error || `Failed to get file URL (HTTP ${response.status})`)
  }
  const data = await response.json()
  return data.url
}
