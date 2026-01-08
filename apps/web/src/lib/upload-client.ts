/**
 * Client-side upload utility for direct-to-Supabase uploads
 * Bypasses Vercel's 4.5MB body size limit by uploading directly to Supabase Storage
 */

interface UploadOptions {
  projectId: string | null
  category?: string
  description?: string
  tags?: string
  dailyLogId?: string
  gpsLatitude?: number
  gpsLongitude?: number
  isAdminOnly?: boolean
  blasterIds?: string[]
}

interface UploadResult {
  success: boolean
  file?: {
    id: string
    name: string
    storagePath: string
    type: string
    [key: string]: unknown
  }
  error?: string
}

/**
 * Upload a file directly to Supabase Storage, bypassing API route size limits
 *
 * Flow:
 * 1. Get signed upload URL from our API
 * 2. Upload directly to Supabase using the signed URL
 * 3. Confirm upload and create database record
 */
export async function uploadFileDirect(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const { projectId, category, description, tags, dailyLogId, gpsLatitude, gpsLongitude, isAdminOnly, blasterIds } = options

  try {
    // Step 1: Get signed upload URL
    const signedUrlRes = await fetch('/api/upload/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        projectId,
        category
      })
    })

    if (!signedUrlRes.ok) {
      const errorData = await signedUrlRes.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to get upload URL: ${signedUrlRes.statusText}`)
    }

    const { signedUrl, storagePath } = await signedUrlRes.json()

    // Step 2: Upload directly to Supabase Storage
    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file
    })

    if (!uploadRes.ok) {
      throw new Error(`Direct upload failed: ${uploadRes.statusText}`)
    }

    // Step 3: Confirm upload and create database record
    const confirmRes = await fetch('/api/upload/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        storagePath,
        originalFileName: file.name,
        fileSize: file.size,
        category,
        description,
        tags,
        dailyLogId,
        gpsLatitude,
        gpsLongitude,
        isAdminOnly,
        blasterIds
      })
    })

    if (!confirmRes.ok) {
      const errorData = await confirmRes.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to confirm upload')
    }

    const { file: uploadedFile } = await confirmRes.json()

    return {
      success: true,
      file: uploadedFile
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Legacy upload through API route (for small files < 4.5MB)
 * Falls back to this if direct upload fails
 */
export async function uploadFileLegacy(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  if (options.projectId) formData.append('projectId', options.projectId)

  if (options.category) formData.append('category', options.category)
  if (options.description) formData.append('description', options.description)
  if (options.tags) formData.append('tags', options.tags)
  if (options.dailyLogId) formData.append('dailyLogId', options.dailyLogId)
  if (options.gpsLatitude) formData.append('gpsLatitude', options.gpsLatitude.toString())
  if (options.gpsLongitude) formData.append('gpsLongitude', options.gpsLongitude.toString())
  if (options.isAdminOnly) formData.append('isAdminOnly', 'true')
  if (options.blasterIds && options.blasterIds.length > 0) {
    formData.append('blasterIds', JSON.stringify(options.blasterIds))
  }

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      const contentType = res.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      } else {
        if (res.status === 413) {
          throw new Error('File too large for API route')
        }
        throw new Error(`Upload failed: ${res.statusText}`)
      }
    }

    const data = await res.json()
    return {
      success: true,
      file: data.file
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Smart upload that tries direct upload first, falls back to legacy for small files
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  // For files larger than 4MB, always use direct upload
  const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024 // 4MB

  if (file.size > DIRECT_UPLOAD_THRESHOLD) {
    return uploadFileDirect(file, options)
  }

  // For smaller files, try legacy first (slightly faster), fall back to direct
  const legacyResult = await uploadFileLegacy(file, options)

  if (legacyResult.success) {
    return legacyResult
  }

  // If legacy failed due to size limit, try direct upload
  if (legacyResult.error?.includes('too large') || legacyResult.error?.includes('413')) {
    return uploadFileDirect(file, options)
  }

  return legacyResult
}
