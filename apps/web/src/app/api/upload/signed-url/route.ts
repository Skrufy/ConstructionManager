import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createAdminSupabaseClient } from '@/lib/supabase-auth'
import {
  buildStoragePath,
  generateFileName,
  getFileExtension,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
} from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'construction-files'

// POST /api/upload/signed-url - Get a signed URL for direct upload to Supabase
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = withRateLimit(request, RATE_LIMITS.upload)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const { fileName, fileSize, projectId, category } = body

    if (!fileName || !fileSize) {
      return NextResponse.json(
        { error: 'fileName and fileSize are required' },
        { status: 400 }
      )
    }

    // Validate file extension
    const extension = getFileExtension(fileName)
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({
        error: `File type .${extension} not allowed.`
      }, { status: 400 })
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
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

    // Generate unique filename and build storage path
    const uniqueFileName = generateFileName(fileName)
    const storagePath = buildStoragePath(projectId, category || null, uniqueFileName)

    // Create signed upload URL using admin client
    const supabaseAdmin = createAdminSupabaseClient()
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(storagePath)

    if (error) {
      console.error('Failed to create signed URL:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      storagePath,
      fileName: uniqueFileName,
      // Include data needed for confirm step
      uploadData: {
        projectId,
        category,
        originalFileName: fileName,
        storagePath,
        fileSize,
        uploaderId: user.id
      }
    })
  } catch (error) {
    console.error('Error creating signed URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
