import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'OFFICE']

// Helper to calculate certification status
function calculateStatus(expiryDate: Date | null): string {
  if (!expiryDate) return 'VALID'

  const now = new Date()
  const thirtyDays = new Date()
  thirtyDays.setDate(thirtyDays.getDate() + 30)
  const sixtyDays = new Date()
  sixtyDays.setDate(sixtyDays.getDate() + 60)

  if (expiryDate < now) return 'EXPIRED'
  if (expiryDate < thirtyDays) return 'EXPIRING_SOON'
  return 'VALID'
}

// Transform certification for mobile compatibility (certName -> name, certNumber -> certificateNumber)
function transformCertification(cert: {
  id: string
  certType: string
  certName: string
  certNumber?: string | null
  issuingAuthority?: string | null
  issueDate?: Date | null
  expiryDate?: Date | null
  documentUrl?: string | null
  status: string
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  userId?: string
  user?: { id: string; name: string } | null
  subcontractorId?: string
  subcontractor?: { id: string; companyName: string } | null
}, type: 'user' | 'subcontractor') {
  return {
    id: cert.id,
    type,
    userId: cert.userId ?? null,
    user: cert.user ?? null,
    subcontractorId: cert.subcontractorId ?? null,
    subcontractor: cert.subcontractor ?? null,
    certType: cert.certType,
    name: cert.certName, // Android expects 'name' instead of 'certName'
    issuingAuthority: cert.issuingAuthority ?? null,
    certificateNumber: cert.certNumber ?? null, // Android expects 'certificateNumber' instead of 'certNumber'
    issueDate: cert.issueDate?.toISOString().split('T')[0] ?? null,
    expiryDate: cert.expiryDate?.toISOString().split('T')[0] ?? null,
    status: cert.status,
    documentUrl: cert.documentUrl ?? null,
    notes: cert.notes ?? null,
    createdAt: cert.createdAt.toISOString(),
    updatedAt: cert.updatedAt.toISOString()
  }
}

// GET /api/certifications - Get certifications
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const type = searchParams.get('type') // 'user' or 'subcontractor' or 'all'
    const alertsOnly = searchParams.get('alertsOnly') === 'true'

    // Build query for user certifications
    const userWhere: Record<string, unknown> = {}

    // Non-managers can only see their own certifications
    if (!MANAGER_ROLES.includes(user.role)) {
      userWhere.userId = user.id
    } else if (userId) {
      userWhere.userId = userId
    }

    if (status) userWhere.status = status
    if (alertsOnly) {
      userWhere.status = { in: ['EXPIRED', 'EXPIRING_SOON'] }
    }

    // Collect all certifications into a flat list
    const allCertifications: ReturnType<typeof transformCertification>[] = []

    // Fetch user certifications
    if (type !== 'subcontractor') {
      const userCerts = await prisma.userCertification.findMany({
        where: userWhere,
        include: {
          user: { select: { id: true, name: true, role: true } }
        },
        orderBy: { expiryDate: 'asc' }
      })

      // Update status for each certification
      for (const cert of userCerts) {
        const newStatus = calculateStatus(cert.expiryDate)
        if (newStatus !== cert.status) {
          await prisma.userCertification.update({
            where: { id: cert.id },
            data: { status: newStatus }
          })
        }
        allCertifications.push(transformCertification({ ...cert, status: newStatus }, 'user'))
      }
    }

    // Fetch subcontractor certifications (managers only)
    if (type !== 'user' && MANAGER_ROLES.includes(user.role)) {
      const subWhere: Record<string, unknown> = {}
      if (status) subWhere.status = status
      if (alertsOnly) {
        subWhere.status = { in: ['EXPIRED', 'EXPIRING_SOON'] }
      }

      const subCerts = await prisma.subcontractorCertification.findMany({
        where: subWhere,
        include: {
          subcontractor: { select: { id: true, companyName: true } }
        },
        orderBy: { expiryDate: 'asc' }
      })

      // Update status for each certification
      for (const cert of subCerts) {
        const newStatus = calculateStatus(cert.expiryDate)
        if (newStatus !== cert.status) {
          await prisma.subcontractorCertification.update({
            where: { id: cert.id },
            data: { status: newStatus }
          })
        }
        allCertifications.push(transformCertification({ ...cert, status: newStatus }, 'subcontractor'))
      }
    }

    // Return in Android-compatible format
    return NextResponse.json({
      certifications: allCertifications,
      total: allCertifications.length,
      expiringCount: allCertifications.filter(c => c.status === 'EXPIRING_SOON').length,
      expiredCount: allCertifications.filter(c => c.status === 'EXPIRED').length
    })
  } catch (error) {
    console.error('Error fetching certifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/certifications - Create certification
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      type: rawType, // 'user' or 'subcontractor'
      userId,
      subcontractorId,
      certType,
      certName,
      name, // Android sends 'name' instead of 'certName'
      certNumber,
      certificateNumber, // Android sends 'certificateNumber' instead of 'certNumber'
      issuingAuthority,
      issueDate,
      expiryDate,
      documentUrl,
      notes
    } = body

    // Default type to 'user' if not provided, or infer from subcontractorId
    const type = rawType || (subcontractorId ? 'subcontractor' : 'user')

    // Accept both web and Android field names
    const finalCertName = certName || name
    const finalCertNumber = certNumber || certificateNumber

    const status = calculateStatus(expiryDate ? new Date(expiryDate) : null)

    if (type === 'user') {
      // Only managers can add certs for other users
      const targetUserId = userId || user.id
      if (targetUserId !== user.id && !MANAGER_ROLES.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const cert = await prisma.userCertification.create({
        data: {
          userId: targetUserId,
          certType,
          certName: finalCertName,
          certNumber: finalCertNumber,
          issuingAuthority,
          issueDate: issueDate ? new Date(issueDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          documentUrl,
          status,
          notes
        },
        include: {
          user: { select: { id: true, name: true } }
        }
      })

      return NextResponse.json(transformCertification(cert, 'user'), { status: 201 })
    }

    if (type === 'subcontractor') {
      if (!MANAGER_ROLES.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const cert = await prisma.subcontractorCertification.create({
        data: {
          subcontractorId,
          certType,
          certName: finalCertName,
          certNumber: finalCertNumber,
          issueDate: issueDate ? new Date(issueDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          documentUrl,
          status
        },
        include: {
          subcontractor: { select: { id: true, companyName: true } }
        }
      })

      return NextResponse.json(transformCertification(cert, 'subcontractor'), { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error creating certification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/certifications - Update certification
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      id,
      type, // 'user' or 'subcontractor'
      certType,
      certName,
      certNumber,
      issuingAuthority,
      issueDate,
      expiryDate,
      documentUrl,
      notes
    } = body

    const status = calculateStatus(expiryDate ? new Date(expiryDate) : null)

    if (type === 'user') {
      const existingCert = await prisma.userCertification.findUnique({
        where: { id }
      })

      if (!existingCert) {
        return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
      }

      // Users can update their own, managers can update anyone's
      if (existingCert.userId !== user.id && !MANAGER_ROLES.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const cert = await prisma.userCertification.update({
        where: { id },
        data: {
          certType,
          certName,
          certNumber,
          issuingAuthority,
          issueDate: issueDate ? new Date(issueDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          documentUrl,
          status,
          notes
        }
      })

      return NextResponse.json(cert)
    }

    if (type === 'subcontractor') {
      if (!MANAGER_ROLES.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const cert = await prisma.subcontractorCertification.update({
        where: { id },
        data: {
          certType,
          certName,
          certNumber,
          issueDate: issueDate ? new Date(issueDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          documentUrl,
          status
        }
      })

      return NextResponse.json(cert)
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error updating certification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/certifications - Delete certification
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type are required' }, { status: 400 })
    }

    if (type === 'user') {
      const existingCert = await prisma.userCertification.findUnique({
        where: { id }
      })

      if (!existingCert) {
        return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
      }

      if (existingCert.userId !== user.id && !MANAGER_ROLES.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      await prisma.userCertification.delete({ where: { id } })
    } else if (type === 'subcontractor') {
      if (!MANAGER_ROLES.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      await prisma.subcontractorCertification.delete({ where: { id } })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting certification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
