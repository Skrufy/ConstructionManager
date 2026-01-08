import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { deleteFromSupabase } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'

// GET /api/documents/[id] - Get a single document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const document = await prisma.file.findUnique({
      where: { id: params.id },
      include: {
        project: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true } },
        revisions: {
          orderBy: { version: 'desc' }
        },
        annotations: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            revisions: true,
            annotations: true
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if user has access to the project (company-wide documents are accessible to all)
    if (user.role !== 'ADMIN' && document.projectId) {
      const hasAccess = await prisma.projectAssignment.findFirst({
        where: {
          projectId: document.projectId,
          userId: user.id
        }
      })

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Find the document
    const document = await prisma.file.findUnique({
      where: { id: params.id },
      include: {
        revisions: true,
        project: { select: { id: true } }
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check permissions - only admin, project manager, or uploader can delete
    const isAdmin = user.role === 'ADMIN'
    const isUploader = document.uploadedBy === user.id

    if (!isAdmin && !isUploader) {
      // Check if user is a project manager for this project (company-wide docs can be deleted by uploader only)
      if (!document.projectId) {
        return NextResponse.json(
          { error: 'Only admins or the uploader can delete company-wide documents' },
          { status: 403 }
        )
      }

      const assignment = await prisma.projectAssignment.findFirst({
        where: {
          projectId: document.projectId,
          userId: user.id,
          roleOverride: 'PROJECT_MANAGER'
        }
      })

      if (!assignment) {
        return NextResponse.json(
          { error: 'Only admins, project managers, or the uploader can delete documents' },
          { status: 403 }
        )
      }
    }

    // Collect all storage paths to delete
    const storagePaths = [document.storagePath]
    for (const revision of document.revisions) {
      if (revision.storagePath && revision.storagePath !== document.storagePath) {
        storagePaths.push(revision.storagePath)
      }
    }

    // Delete from Supabase storage
    for (const path of storagePaths) {
      const deleted = await deleteFromSupabase(path)
      if (!deleted) {
        console.error('Failed to delete file from storage:', path)
        // Continue with database deletion even if storage fails
      }
    }

    // Delete related records and the document in a transaction
    await prisma.$transaction([
      // Delete annotations
      prisma.documentAnnotation.deleteMany({
        where: { fileId: params.id }
      }),
      // Delete revisions
      prisma.documentRevision.deleteMany({
        where: { fileId: params.id }
      }),
      // Delete any split drafts referencing this file
      prisma.documentSplitDraft.deleteMany({
        where: { originalFileId: params.id }
      }),
      // Delete the file record
      prisma.file.delete({
        where: { id: params.id }
      })
    ])

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        resource: 'FILE',
        resourceId: params.id,
        userId: user.id,
        userEmail: user.email || '',
        userRole: user.role || 'UNKNOWN',
        projectId: document.projectId,
        success: true,
        details: { fileName: document.name }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/documents/[id] - Update document metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const { name, description, category, tags, scale } = body

    // Find the document
    const document = await prisma.file.findUnique({
      where: { id: params.id },
      select: { projectId: true, uploadedBy: true }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check permissions
    const isAdmin = user.role === 'ADMIN'
    const isUploader = document.uploadedBy === user.id

    if (!isAdmin && !isUploader) {
      // Company-wide documents require admin or uploader
      if (!document.projectId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const assignment = await prisma.projectAssignment.findFirst({
        where: {
          projectId: document.projectId,
          userId: user.id
        }
      })

      if (!assignment) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Update the document
    const updatedDocument = await prisma.file.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(tags && { tags })
      },
      include: {
        project: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true } }
      }
    })

    // Update scale in DocumentMetadata if provided
    if (scale !== undefined) {
      await prisma.documentMetadata.upsert({
        where: { fileId: params.id },
        update: { scale },
        create: {
          fileId: params.id,
          scale,
        },
      })
    }

    return NextResponse.json({ document: updatedDocument })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
