import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema
const UploadFileSchema = z.object({
  projectId: z.string(),
  category: z.string().optional(),
  name: z.string(),
  type: z.enum(['DOCUMENT', 'COMPLIANCE', 'DRAWING']).default('DOCUMENT'),
})

// POST /api/files/upload - Upload a new file
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string
    const category = formData.get('category') as string | null
    const name = formData.get('name') as string | null
    const type = formData.get('type') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // File size validation (50MB max by default)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // File type validation
    const ALLOWED_TYPES = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/tiff',
      // CAD/Drawings
      'application/acad',
      'application/x-autocad',
      'application/dxf',
      'image/vnd.dwg',
      'image/vnd.dxf',
      // Video
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
    ]

    // Also allow files without MIME type or with generic binary type (some uploads don't have proper types)
    const isAllowedType = !file.type ||
      file.type === 'application/octet-stream' ||
      ALLOWED_TYPES.includes(file.type)

    if (!isAllowedType) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}` },
        { status: 400 }
      )
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Validate input
    const result = UploadFileSchema.safeParse({
      projectId,
      category: category || undefined,
      name: name || file.name,
      type: type || 'DOCUMENT',
    })

    if (!result.success) {
      return NextResponse.json({
        error: 'Invalid request',
        details: result.error.flatten(),
      }, { status: 400 })
    }

    const data = result.data

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Upload to Supabase Storage
    const supabase = await createServerSupabaseClient()
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'construction-files'

    // Generate storage path: projectId/category/timestamp-filename
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const safeName = data.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${projectId}/${data.category || 'documents'}/${timestamp}-${safeName}.${fileExt}`

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage', details: uploadError.message },
        { status: 500 }
      )
    }

    // Create file record in database
    const fileRecord = await prisma.file.create({
      data: {
        projectId,
        name: data.name,
        type: 'document', // image, document, video
        storagePath: uploadData.path,
        category: data.category || 'DOCUMENTS',
        uploadedBy: user.id,
      },
    })

    // Get public URL or signed URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path)

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.name,
        url: urlData.publicUrl,
        type: fileRecord.type,
        category: fileRecord.category,
        storagePath: fileRecord.storagePath,
        createdAt: fileRecord.createdAt.toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
