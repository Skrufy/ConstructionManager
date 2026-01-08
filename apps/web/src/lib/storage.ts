// File Storage Utility for Development
// Uses local filesystem storage. For production, swap to S3/Azure Blob.

import { writeFile, mkdir, unlink, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ''

// Allowed file types for construction documents
const ALLOWED_EXTENSIONS = new Set([
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
  'zip', 'rar', '7z', 'tar', 'gz',
])

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  dwg: 'application/acad',
  dxf: 'application/dxf',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  zip: 'application/zip',
}

export interface UploadResult {
  success: boolean
  filePath?: string
  publicUrl?: string
  fileName?: string
  originalName?: string
  size?: number
  mimeType?: string
  error?: string
}

export interface FileInfo {
  exists: boolean
  size?: number
  mimeType?: string
  createdAt?: Date
}

/**
 * Ensure the upload directory exists
 */
async function ensureUploadDir(subDir?: string): Promise<string> {
  const dir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }

  return dir
}

/**
 * Generate a unique filename
 */
function generateFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  const timestamp = Date.now()
  const randomId = crypto.randomBytes(8).toString('hex')
  return `${timestamp}-${randomId}${ext}`
}

/**
 * Get file extension from filename
 */
function getExtension(filename: string): string {
  return path.extname(filename).slice(1).toLowerCase()
}

/**
 * Validate file type
 */
function isAllowedFileType(filename: string): boolean {
  const ext = getExtension(filename)
  return ALLOWED_EXTENSIONS.has(ext)
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = getExtension(filename)
  return MIME_TYPES[ext] || 'application/octet-stream'
}

/**
 * Calculate file checksum
 */
function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex')
}

/**
 * Upload a file from a Buffer
 */
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  options?: {
    subDir?: string
    projectId?: string
    category?: string
  }
): Promise<UploadResult> {
  try {
    // Validate file type
    if (!isAllowedFileType(originalName)) {
      return {
        success: false,
        error: `File type not allowed. Allowed types: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`
      }
    }

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }
    }

    // Determine subdirectory
    let subDir = options?.subDir || ''
    if (options?.projectId) {
      subDir = path.join('projects', options.projectId)
    }
    if (options?.category) {
      subDir = path.join(subDir, options.category.toLowerCase())
    }

    // Ensure directory exists
    const uploadDir = await ensureUploadDir(subDir)

    // Generate unique filename
    const fileName = generateFileName(originalName)
    const filePath = path.join(uploadDir, fileName)
    const relativePath = path.join(subDir, fileName)

    // Write file
    await writeFile(filePath, buffer)

    // Generate public URL
    const publicUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`

    return {
      success: true,
      filePath: relativePath,
      publicUrl,
      fileName,
      originalName,
      size: buffer.length,
      mimeType: getMimeType(originalName)
    }
  } catch (error) {
    console.error('File upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    }
  }
}

/**
 * Upload a file from FormData
 */
export async function uploadFromFormData(
  formData: FormData,
  options?: {
    fieldName?: string
    projectId?: string
    category?: string
  }
): Promise<UploadResult> {
  try {
    const fieldName = options?.fieldName || 'file'
    const file = formData.get(fieldName)

    if (!file || !(file instanceof File)) {
      return {
        success: false,
        error: 'No file provided'
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    return uploadFile(buffer, file.name, {
      projectId: options?.projectId,
      category: options?.category
    })
  } catch (error) {
    console.error('FormData upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    }
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(UPLOAD_DIR, filePath)

    if (existsSync(fullPath)) {
      await unlink(fullPath)
      return true
    }

    return false
  } catch (error) {
    console.error('File delete error:', error)
    return false
  }
}

/**
 * Get file info
 */
export async function getFileInfo(filePath: string): Promise<FileInfo> {
  try {
    const fullPath = path.join(UPLOAD_DIR, filePath)

    if (!existsSync(fullPath)) {
      return { exists: false }
    }

    const buffer = await readFile(fullPath)
    const fileName = path.basename(filePath)

    return {
      exists: true,
      size: buffer.length,
      mimeType: getMimeType(fileName)
    }
  } catch (error) {
    return { exists: false }
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(filePath: string): string {
  return `${BASE_URL}/uploads/${filePath.replace(/\\/g, '/')}`
}

/**
 * Create a new revision of a file
 */
export async function createRevision(
  buffer: Buffer,
  originalName: string,
  documentId: string,
  version: number
): Promise<UploadResult> {
  return uploadFile(buffer, originalName, {
    subDir: path.join('revisions', documentId, `v${version}`)
  })
}
