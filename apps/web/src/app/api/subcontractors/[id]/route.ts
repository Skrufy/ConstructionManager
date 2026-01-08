import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'OFFICE']

// GET /api/subcontractors/[id] - Get single subcontractor
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const subcontractor = await prisma.subcontractor.findUnique({
      where: { id: params.id },
      include: {
        projects: {
          include: {
            project: { select: { id: true, name: true, status: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        certifications: {
          orderBy: { expiryDate: 'asc' }
        }
      }
    })

    if (!subcontractor) {
      return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 })
    }

    return NextResponse.json(subcontractor)
  } catch (error) {
    console.error('Error fetching subcontractor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/subcontractors/[id] - Update subcontractor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      city,
      state,
      zip,
      trades,
      licenseNumber,
      insuranceExpiry,
      rating,
      status,
      notes
    } = body

    const subcontractor = await prisma.subcontractor.update({
      where: { id: params.id },
      data: {
        companyName,
        contactName,
        email,
        phone,
        address,
        city,
        state,
        zip,
        trades: trades || undefined,
        licenseNumber,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        rating,
        status,
        notes
      }
    })

    return NextResponse.json(subcontractor)
  } catch (error) {
    console.error('Error updating subcontractor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/subcontractors/[id] - Delete subcontractor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.subcontractor.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subcontractor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/subcontractors/[id] - Add certification or project assignment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { type } = body

    if (type === 'certification') {
      const { certType, certName, certNumber, issueDate, expiryDate, documentUrl } = body

      // Determine status based on expiry date
      let status = 'VALID'
      if (expiryDate) {
        const expiry = new Date(expiryDate)
        const now = new Date()
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

        if (expiry < now) {
          status = 'EXPIRED'
        } else if (expiry < thirtyDaysFromNow) {
          status = 'EXPIRING_SOON'
        }
      }

      const certification = await prisma.subcontractorCertification.create({
        data: {
          subcontractorId: params.id,
          certType,
          certName,
          certNumber,
          issueDate: issueDate ? new Date(issueDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          documentUrl,
          status
        }
      })

      return NextResponse.json(certification, { status: 201 })
    }

    if (type === 'assignment') {
      const { projectId, startDate, endDate, contractAmount, notes } = body

      const assignment = await prisma.subcontractorAssignment.create({
        data: {
          subcontractorId: params.id,
          projectId,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          contractAmount,
          notes
        },
        include: {
          project: { select: { id: true, name: true } }
        }
      })

      return NextResponse.json(assignment, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error adding subcontractor data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
