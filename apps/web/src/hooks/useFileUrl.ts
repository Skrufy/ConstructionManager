'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseFileUrlOptions {
  download?: boolean
  expiresIn?: number
}

interface UseFileUrlReturn {
  url: string | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch signed URLs for files stored in Supabase Storage
 * Handles legacy local files automatically
 */
export function useFileUrl(
  fileId: string | null,
  options: UseFileUrlOptions = {}
): UseFileUrlReturn {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUrl = useCallback(async () => {
    if (!fileId) {
      setUrl(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.download) params.set('download', 'true')
      if (options.expiresIn) params.set('expiresIn', options.expiresIn.toString())

      const response = await fetch(`/api/files/${fileId}/url?${params}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to get file URL')
      }

      const data = await response.json()
      setUrl(data.url)
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : 'Unknown error occurred'
      console.error('Error fetching file URL:', err)
      setError(errorMessage)
      setUrl(null)
    } finally {
      setLoading(false)
    }
  }, [fileId, options.download, options.expiresIn])

  useEffect(() => {
    fetchUrl()
  }, [fetchUrl])

  return { url, loading, error, refetch: fetchUrl }
}

/**
 * Utility function for one-off URL fetching (non-hook usage)
 */
export async function getFileUrl(
  fileId: string,
  options: UseFileUrlOptions = {}
): Promise<string> {
  const params = new URLSearchParams()
  if (options.download) params.set('download', 'true')
  if (options.expiresIn) params.set('expiresIn', options.expiresIn.toString())

  const response = await fetch(`/api/files/${fileId}/url?${params}`)

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: null }))
    throw new Error(data.error || `Failed to get file URL (HTTP ${response.status})`)
  }

  const data = await response.json()
  return data.url
}

/**
 * Check if a storage path is a legacy local path that can be used directly
 */
export function isLegacyStoragePath(storagePath: string): boolean {
  return storagePath.startsWith('/uploads/') || storagePath.startsWith('http')
}

/**
 * Get the URL to use for a file - either the direct path for legacy files
 * or fetches a signed URL for Supabase files
 */
export async function getFileDisplayUrl(
  fileId: string,
  storagePath: string
): Promise<string> {
  // Legacy files can use the path directly
  if (isLegacyStoragePath(storagePath)) {
    return storagePath
  }
  // Supabase files need a signed URL
  return getFileUrl(fileId)
}
