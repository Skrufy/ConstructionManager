import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import {
  uploadToSupabase,
  buildStoragePath,
  generateFileName,
  getFileExtension,
  getFileType,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
} from '@/lib/supabase-storage'
import { validateFileContent, getMimeTypeFromExtension } from '@/lib/file-validation'

export const dynamic = 'force-dynamic'

// POST /api/upload - Upload a file to Supabase Storage
export async function POST(request: NextRequest) {
  // Apply rate limiting (10 uploads per minute)
  const rateLimitResponse = withRateLimit(request, RATE_LIMITS.upload)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string
    const dailyLogId = formData.get('dailyLogId') as string | null
    const category = formData.get('category') as string | null
    const description = formData.get('description') as string | null
    const tags = formData.get('tags') as string | null
    const gpsLatitude = formData.get('gpsLatitude') as string | null
    const gpsLongitude = formData.get('gpsLongitude') as string | null
    const blasterIdsStr = formData.get('blasterIds') as string | null
    const blasterIds = blasterIdsStr ? JSON.parse(blasterIdsStr) : null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Authorization check: verify user has access to the project (if specified)
    const isAdmin = user.role === 'ADMIN'

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          assignments: {
            select: { userId: true }
          }
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      // User must be admin or assigned to project to upload
      const isAssigned = project.assignments.some(a => a.userId === user.id)

      if (!isAdmin && !isAssigned) {
        return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
      }
    } else {
      // Company-wide documents can only be uploaded by admins
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admins can upload company-wide documents' }, { status: 403 })
      }
    }

    // Validate file extension
    const extension = getFileExtension(file.name)
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({
        error: `File type .${extension} not allowed. Supported types include: PDF, DWG, RVT, IFC, images, and more.`
      }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Validate file content using magic bytes (prevents disguised files)
    const mimeType = getMimeTypeFromExtension('.' + extension)
    if (mimeType) {
      const contentValidation = validateFileContent(bytes, mimeType)
      if (!contentValidation.valid) {
        return NextResponse.json({
          error: contentValidation.error || 'File content does not match the expected type'
        }, { status: 400 })
      }
    }

    // Generate unique filename and build storage path
    const filename = generateFileName(file.name)
    const storagePath = buildStoragePath(projectId, category, filename)

    // Upload to Supabase Storage
    const uploadResult = await uploadToSupabase(buffer, storagePath, file.type)

    if (!uploadResult.success) {
      console.error('Supabase upload failed:', uploadResult.error)
      return NextResponse.json({ error: uploadResult.error || 'Upload failed' }, { status: 500 })
    }

    // Determine file type for database
    const fileType = getFileType(file.name)

    // Store in database - storagePath is the Supabase path
    const dbFile = await prisma.file.create({
      data: {
        projectId,
        dailyLogId: dailyLogId || null,
        name: file.name,
        type: fileType,
        storagePath: uploadResult.storagePath!,
        uploadedBy: user.id,
        category: category || null,
        description: description || null,
        tags: tags || undefined,
        gpsLatitude: gpsLatitude ? parseFloat(gpsLatitude) : null,
        gpsLongitude: gpsLongitude ? parseFloat(gpsLongitude) : null,
        takenAt: new Date(),
        currentVersion: 1,
        isLatest: true
      },
      include: {
        project: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true } }
      }
    })

    // Create initial revision record
    await prisma.documentRevision.create({
      data: {
        fileId: dbFile.id,
        version: 1,
        storagePath: uploadResult.storagePath!,
        changeNotes: 'Initial upload',
        uploadedBy: user.id,
        fileSize: file.size,
        checksum: uploadResult.checksum
      }
    })

    // Create blaster assignments if provided
    if (blasterIds && Array.isArray(blasterIds) && blasterIds.length > 0) {
      await prisma.fileBlasterAssignment.createMany({
        data: blasterIds.map((blasterId: string) => ({
          fileId: dbFile.id,
          blasterId: blasterId
        }))
      })
    }

    return NextResponse.json({
      message: 'File uploaded successfully',
      file: {
        ...dbFile,
        // Note: Frontend should use /api/files/[id]/url to get signed URL
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
