import { createClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Validate required environment variables at module load time
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Lazy initialization to allow graceful handling when env vars are missing
let _supabaseStorage: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (_supabaseStorage) return _supabaseStorage

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Please configure these in your .env file. See .env.example for details.'
    )
  }

  _supabaseStorage = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return _supabaseStorage
}

// Export getter for lazy initialization
export const supabaseStorage = {
  get storage() {
    return getSupabaseClient().storage
  }
}

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'construction-files'

// Allowed file extensions for construction documents
export const ALLOWED_EXTENSIONS = new Set([
  // CAD/Drawing files
  'dwg', 'dxf', 'dwf',
  // BIM files
  'rvt', 'rfa', 'ifc', 'nwd', 'nwc',
  // 3D files
  'skp', 'step', 'stp', 'stl', 'obj', 'fbx',
  // Document files
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf',
  // Image files
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'tiff', 'tif', 'bmp', 'svg',
  // Video files
  'mp4', 'mov', 'avi', 'wmv', 'mkv',
  // Archive files
  'zip', 'rar', '7z',
])

// Max file size: 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024

export interface UploadResult {
  success: boolean
  storagePath?: string
  error?: string
  checksum?: string
}

export interface SignedUrlResult {
  success: boolean
  signedUrl?: string
  error?: string
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Determine file type from extension
 */
export function getFileType(filename: string): string {
  const ext = getFileExtension(filename)
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'tiff', 'tif', 'bmp', 'svg'].includes(ext)) {
    return 'image'
  }
  if (['mp4', 'mov', 'avi', 'wmv', 'mkv'].includes(ext)) {
    return 'video'
  }
  return 'document'
}

/**
 * Calculate MD5 checksum for integrity verification
 */
export function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex')
}

/**
 * Sanitize path component to prevent path traversal
 */
export function sanitizePathComponent(input: string): string {
  return input
    .replace(/[\/\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .trim()
    .toLowerCase()
}

/**
 * Generate unique filename with timestamp and random string
 */
export function generateFileName(originalName: string): string {
  const ext = getFileExtension(originalName)
  const timestamp = Date.now()
  const randomStr = crypto.randomBytes(4).toString('hex')
  return `${timestamp}-${randomStr}.${ext}`
}

/**
 * Build storage path for a file
 * For company-wide documents (null projectId), uses 'company-wide' folder
 */
export function buildStoragePath(
  projectId: string | null,
  category?: string | null,
  filename?: string
): string {
  const safeProjectId = projectId ? sanitizePathComponent(projectId) : 'company-wide'
  const safeCategory = category ? sanitizePathComponent(category) : null

  let path = safeProjectId
  if (safeCategory) {
    path = `${path}/${safeCategory}`
  }
  if (filename) {
    path = `${path}/${filename}`
  }
  return path
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadToSupabase(
  buffer: Buffer,
  storagePath: string,
  contentType?: string
): Promise<UploadResult> {
  try {
    const { data, error } = await supabaseStorage.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: contentType || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return { success: false, error: error.message }
    }

    const checksum = calculateChecksum(buffer)

    return {
      success: true,
      storagePath: data.path,
      checksum,
    }
  } catch (error) {
    console.error('Supabase upload exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

/**
 * Create a fresh Supabase client for operations that need fresh data
 * Uses a custom fetch with no-store to avoid Next.js caching
 */
function createFreshClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.'
    )
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      // Disable Next.js fetch caching for signed URLs
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        })
      },
    },
  })
}

/**
 * Generate a signed URL for file access (default 1 hour expiry)
 * Uses a fresh client to avoid any caching issues
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600 // seconds
): Promise<SignedUrlResult> {
  try {
    // Use fresh client to ensure no stale cached responses
    const freshClient = createFreshClient()
    const { data, error } = await freshClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn)

    if (error) {
      console.error('Supabase signed URL error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, signedUrl: data.signedUrl }
  } catch (error) {
    console.error('Supabase signed URL exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate signed URL',
    }
  }
}

/**
 * Generate a signed URL for downloads with content-disposition header
 * Uses a fresh client to avoid any caching issues
 */
export async function getDownloadUrl(
  storagePath: string,
  filename: string,
  expiresIn: number = 3600
): Promise<SignedUrlResult> {
  try {
    // Use fresh client to ensure no stale cached responses
    const freshClient = createFreshClient()
    const { data, error } = await freshClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn, {
        download: filename,
      })

    if (error) {
      console.error('Supabase download URL error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, signedUrl: data.signedUrl }
  } catch (error) {
    console.error('Supabase download URL exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate download URL',
    }
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFromSupabase(storagePath: string): Promise<boolean> {
  try {
    const { error } = await supabaseStorage.storage
      .from(BUCKET_NAME)
      .remove([storagePath])

    if (error) {
      console.error('Supabase delete error:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Supabase delete exception:', error)
    return false
  }
}

/**
 * Check if a storage path is a legacy local path
 */
export function isLegacyPath(storagePath: string): boolean {
  return storagePath.startsWith('/uploads/') || storagePath.startsWith('http')
}
