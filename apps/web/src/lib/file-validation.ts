import { z } from 'zod'

// ============================================
// File Type Definitions
// ============================================

// Magic bytes for file type detection
const FILE_SIGNATURES: Record<string, { bytes: number[]; offset?: number }[]> = {
  // Images
  'image/jpeg': [{ bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png': [{ bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  'image/gif': [{ bytes: [0x47, 0x49, 0x46, 0x38] }],
  'image/webp': [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }], // RIFF header, check WEBP at offset 8
  'image/bmp': [{ bytes: [0x42, 0x4D] }],
  'image/tiff': [
    { bytes: [0x49, 0x49, 0x2A, 0x00] }, // Little endian
    { bytes: [0x4D, 0x4D, 0x00, 0x2A] }, // Big endian
  ],
  // HEIC/HEIF files have 'ftyp' at offset 4, followed by brand identifier
  // The brand can be 'heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1'
  'image/heic': [
    { bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], offset: 4 }, // ftypheic
    { bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x78], offset: 4 }, // ftypheix
    { bytes: [0x66, 0x74, 0x79, 0x70, 0x6D, 0x69, 0x66, 0x31], offset: 4 }, // ftypmif1
  ],

  // Documents
  'application/pdf': [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  'application/zip': [{ bytes: [0x50, 0x4B, 0x03, 0x04] }], // PK..

  // Office formats (all ZIP-based)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    { bytes: [0x50, 0x4B, 0x03, 0x04] },
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    { bytes: [0x50, 0x4B, 0x03, 0x04] },
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    { bytes: [0x50, 0x4B, 0x03, 0x04] },
  ],

  // CAD/BIM formats
  'application/acad': [{ bytes: [0x41, 0x43, 0x31, 0x30] }], // AC10 for DWG

  // Videos
  'video/mp4': [
    { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp at offset 4
  ],
  'video/quicktime': [
    { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  ],
}

// Allowed file extensions by category
export const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.tiff', '.tif', '.bmp'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'],
  cad: ['.dwg', '.dxf', '.dwf'],
  bim: ['.rvt', '.rfa', '.ifc', '.nwd', '.nwc'],
  models3d: ['.skp', '.step', '.stp', '.stl', '.obj', '.fbx'],
  video: ['.mp4', '.mov', '.avi', '.wmv'],
  archives: ['.zip', '.rar', '.7z'],
}

// All allowed extensions flattened
export const ALL_ALLOWED_EXTENSIONS = Object.values(ALLOWED_EXTENSIONS).flat()

// Dangerous extensions that should never be allowed
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.vbs', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.ps1', '.psm1', '.psd1',
  '.sh', '.bash',
  '.php', '.asp', '.aspx', '.jsp',
  '.dll', '.sys', '.drv',
  '.reg', '.inf', '.lnk',
]

// Max file sizes by type (in bytes)
export const MAX_FILE_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024,       // 10 MB for images
  document: 50 * 1024 * 1024,    // 50 MB for documents
  cad: 100 * 1024 * 1024,        // 100 MB for CAD files
  bim: 500 * 1024 * 1024,        // 500 MB for BIM files
  model3d: 200 * 1024 * 1024,    // 200 MB for 3D models
  video: 500 * 1024 * 1024,      // 500 MB for videos
  default: 50 * 1024 * 1024,     // 50 MB default
}

// ============================================
// File Validation Functions
// ============================================

export interface FileValidationResult {
  valid: boolean
  error?: string
  category?: string
  sanitizedName?: string
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

/**
 * Get file category from extension
 */
export function getFileCategory(extension: string): string | null {
  for (const [category, extensions] of Object.entries(ALLOWED_EXTENSIONS)) {
    if (extensions.includes(extension.toLowerCase())) {
      return category
    }
  }
  return null
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  let sanitized = filename.split(/[/\\]/).pop() || filename

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Replace dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_')

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '')

  // Limit length
  if (sanitized.length > 255) {
    const ext = getFileExtension(sanitized)
    const name = sanitized.slice(0, -(ext.length || 1))
    sanitized = name.slice(0, 255 - ext.length - 1) + ext
  }

  // Ensure we have a filename
  if (!sanitized || sanitized === '.') {
    sanitized = 'unnamed_file'
  }

  return sanitized
}

/**
 * Check if file extension is dangerous
 */
export function isDangerousExtension(extension: string): boolean {
  return DANGEROUS_EXTENSIONS.includes(extension.toLowerCase())
}

/**
 * Check if file extension is allowed
 */
export function isAllowedExtension(extension: string): boolean {
  return ALL_ALLOWED_EXTENSIONS.includes(extension.toLowerCase())
}

/**
 * Validate file by extension
 */
export function validateFileExtension(filename: string): FileValidationResult {
  const extension = getFileExtension(filename)

  if (!extension) {
    return { valid: false, error: 'File must have an extension' }
  }

  if (isDangerousExtension(extension)) {
    return { valid: false, error: 'File type not allowed for security reasons' }
  }

  if (!isAllowedExtension(extension)) {
    return {
      valid: false,
      error: `File type ${extension} is not allowed. Allowed types: ${ALL_ALLOWED_EXTENSIONS.join(', ')}`,
    }
  }

  const category = getFileCategory(extension)
  const sanitizedName = sanitizeFilename(filename)

  return { valid: true, category: category || 'other', sanitizedName }
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, category?: string): FileValidationResult {
  const maxSize = category
    ? MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default
    : MAX_FILE_SIZES.default

  if (size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024))
    return { valid: false, error: `File size exceeds maximum of ${maxMB}MB` }
  }

  if (size === 0) {
    return { valid: false, error: 'File is empty' }
  }

  return { valid: true }
}

/**
 * Validate file content by checking magic bytes
 * This helps detect files that have been renamed to bypass extension checks
 */
export function validateFileContent(
  buffer: ArrayBuffer,
  expectedMimeType?: string
): FileValidationResult {
  const bytes = new Uint8Array(buffer.slice(0, 16))

  if (expectedMimeType && FILE_SIGNATURES[expectedMimeType]) {
    const signatures = FILE_SIGNATURES[expectedMimeType]
    const matches = signatures.some((sig) => {
      const offset = sig.offset || 0
      return sig.bytes.every((byte, i) => bytes[offset + i] === byte)
    })

    if (!matches) {
      return {
        valid: false,
        error: 'File content does not match the expected type',
      }
    }
  }

  // Check for executable signatures regardless of declared type
  const executableSignatures = [
    [0x4D, 0x5A], // MZ - Windows executable
    [0x7F, 0x45, 0x4C, 0x46], // ELF - Linux executable
    [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O - macOS executable
  ]

  for (const sig of executableSignatures) {
    if (sig.every((byte, i) => bytes[i] === byte)) {
      return { valid: false, error: 'Executable files are not allowed' }
    }
  }

  return { valid: true }
}

/**
 * Full file validation
 */
export function validateFile(
  filename: string,
  size: number,
  buffer?: ArrayBuffer
): FileValidationResult {
  // Validate extension
  const extResult = validateFileExtension(filename)
  if (!extResult.valid) return extResult

  // Validate size
  const sizeResult = validateFileSize(size, extResult.category)
  if (!sizeResult.valid) return sizeResult

  // Validate content if buffer provided
  if (buffer) {
    const extension = getFileExtension(filename)
    const mimeType = getMimeTypeFromExtension(extension)
    const contentResult = validateFileContent(buffer, mimeType)
    if (!contentResult.valid) return contentResult
  }

  return {
    valid: true,
    category: extResult.category,
    sanitizedName: extResult.sanitizedName,
  }
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string | undefined {
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.heic': 'image/heic',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.dwg': 'application/acad',
  }
  return mimeTypes[extension.toLowerCase()]
}

/**
 * Get document category for database storage
 */
export function getDocumentCategory(extension: string): string {
  const ext = extension.toLowerCase()

  if (ALLOWED_EXTENSIONS.images.includes(ext)) return 'PHOTOS'
  if (ALLOWED_EXTENSIONS.cad.includes(ext)) return 'DRAWINGS'
  if (ALLOWED_EXTENSIONS.bim.includes(ext)) return 'BIM'
  if (ALLOWED_EXTENSIONS.models3d.includes(ext)) return 'BIM'
  if (['.pdf', '.doc', '.docx'].includes(ext)) return 'SPECIFICATIONS'
  if (['.xls', '.xlsx'].includes(ext)) return 'REPORTS'

  return 'OTHER'
}

// ============================================
// Zod Schemas for File Validation
// ============================================

export const fileUploadSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .refine(
      (name) => {
        const ext = getFileExtension(name)
        return ext && !isDangerousExtension(ext)
      },
      { message: 'Invalid or dangerous file type' }
    )
    .refine(
      (name) => {
        const ext = getFileExtension(name)
        return isAllowedExtension(ext)
      },
      { message: 'File type not allowed' }
    ),
  size: z
    .number()
    .positive('File size must be positive')
    .max(500 * 1024 * 1024, 'File size exceeds maximum of 500MB'),
  mimeType: z.string().optional(),
  projectId: z.string().min(1, 'Project ID is required'),
})

export const photoUploadSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .refine(
      (name) => {
        const ext = getFileExtension(name)
        return ALLOWED_EXTENSIONS.images.includes(ext)
      },
      { message: 'Only image files are allowed' }
    ),
  size: z
    .number()
    .positive()
    .max(10 * 1024 * 1024, 'Image size exceeds maximum of 10MB'),
  gpsLatitude: z.number().min(-90).max(90).optional().nullable(),
  gpsLongitude: z.number().min(-180).max(180).optional().nullable(),
})
