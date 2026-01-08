import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  gpsLatitude: z.number().optional().nullable(),
  gpsLongitude: z.number().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
  visibilityMode: z.enum(['ALL', 'ASSIGNED_ONLY']).optional(),
  description: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(), // Associated client
  assignedUserIds: z.array(z.string()).optional(), // Users to assign to this project
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: { id: true, companyName: true, contactName: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: {
            dailyLogs: true,
            timeEntries: true,
            files: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user has access to this project
    // Admins always have access
    // Other users: can access if visibilityMode is 'ALL' OR they are assigned
    if (user.role !== 'ADMIN') {
      const isAssigned = project.assignments.some(a => a.userId === user.id)
      const isPublic = project.visibilityMode === 'ALL'
      if (!isAssigned && !isPublic) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins can update projects
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can edit projects' }, { status: 403 })
    }

    const body = await request.json()
    const validation = updateProjectSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Handle assignment updates if provided
    if (data.assignedUserIds !== undefined) {
      // Always include the session user (project creator/editor should stay assigned)
      const userIdsToAssign = new Set<string>([user.id])
      data.assignedUserIds.forEach(id => userIdsToAssign.add(id))

      // Delete existing assignments and recreate
      await prisma.projectAssignment.deleteMany({
        where: { projectId: params.id },
      })

      await prisma.projectAssignment.createMany({
        data: Array.from(userIdsToAssign).map(userId => ({
          projectId: params.id,
          userId,
        })),
      })
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.gpsLatitude !== undefined && { gpsLatitude: data.gpsLatitude }),
        ...(data.gpsLongitude !== undefined && { gpsLongitude: data.gpsLongitude }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.status && { status: data.status }),
        ...(data.visibilityMode && { visibilityMode: data.visibilityMode }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.clientId !== undefined && { clientId: data.clientId }),
      },
      include: {
        client: {
          select: { id: true, companyName: true, contactName: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins can delete projects
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete projects' }, { status: 403 })
    }

    await prisma.project.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
