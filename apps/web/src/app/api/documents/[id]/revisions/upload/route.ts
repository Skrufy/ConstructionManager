import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import {
  uploadToSupabase,
  getFileExtension,
  sanitizePathComponent,
  MAX_FILE_SIZE,
} from '@/lib/supabase-storage'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/documents/[id]/revisions/upload - Upload a new file revision to Supabase Storage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting for uploads
  const rateLimitResult = withRateLimit(request, RATE_LIMITS.upload)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Viewers cannot upload revisions
    if (user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Viewers cannot upload document revisions' }, { status: 403 })
    }

    const { id } = await params

    // Get the current document with project assignments for authorization
    const document = await prisma.file.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            assignments: {
              select: { userId: true }
            }
          }
        },
        uploader: { select: { id: true } }
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Authorization check: user must be admin, assigned to project, or the uploader
    const isAdmin = user.role === 'ADMIN'
    const isAssigned = document.project?.assignments.some(a => a.userId === user.id) || false
    const isUploader = document.uploader.id === user.id

    if (!isAdmin && !isAssigned && !isUploader) {
      return NextResponse.json({ error: 'Access denied to this document' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const changeNotes = formData.get('changeNotes') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    const newVersion = document.currentVersion + 1

    // Create unique filename with version
    const extension = getFileExtension(file.name)
    const timestamp = Date.now()
    const randomStr = crypto.randomBytes(4).toString('hex')
    const filename = `${timestamp}-${randomStr}-v${newVersion}.${extension}`

    // Build storage path for revisions
    const safeProjectId = sanitizePathComponent(document.projectId || 'company-wide')
    const storagePath = `${safeProjectId}/revisions/${id}/${filename}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase Storage
    const uploadResult = await uploadToSupabase(buffer, storagePath, file.type)

    if (!uploadResult.success) {
      console.error('Supabase revision upload failed:', uploadResult.error)
      return NextResponse.json({ error: uploadResult.error || 'Upload failed' }, { status: 500 })
    }

    // Create new revision record
    const revision = await prisma.documentRevision.create({
      data: {
        fileId: id,
        version: newVersion,
        storagePath: uploadResult.storagePath!,
        changeNotes: changeNotes || `Updated to version ${newVersion}`,
        uploadedBy: user.id,
        fileSize: file.size,
        checksum: uploadResult.checksum
      }
    })

    // Update the main document
    await prisma.file.update({
      where: { id },
      data: {
        currentVersion: newVersion,
        storagePath: uploadResult.storagePath!
      }
    })

    return NextResponse.json({
      success: true,
      revision: {
        ...revision,
        fileName: file.name
      },
      newVersion,
      storagePath: uploadResult.storagePath,
      message: `Document updated to version ${newVersion}`
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading revision:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
