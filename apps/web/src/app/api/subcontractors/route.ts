import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'OFFICE']

// Type for certification from database
interface CertificationDB {
  id: string
  certName: string
  expiryDate: Date | null
  status: string
}

// Helper to transform subcontractor for iOS - flattens _count fields and certifications
function transformSubcontractor(sub: {
  id: string
  companyName: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  trades: unknown
  licenseNumber: string | null
  insuranceExpiry: Date | null
  rating: number | null
  status: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { projects: number; certifications: number }
  certifications?: CertificationDB[]
}) {
  // Map certifications to expiringCertifications format
  const expiringCertifications = (sub.certifications || []).map(cert => ({
    id: cert.id,
    certName: cert.certName,
    expiryDate: cert.expiryDate,
    status: cert.status
  }))

  // Get first trade for Android (expects single string), keep trades array for web/iOS
  const tradesArray = sub.trades as unknown as string[] | null
  const firstTrade = Array.isArray(tradesArray) && tradesArray.length > 0 ? tradesArray[0] : null

  return {
    id: sub.id,
    companyName: sub.companyName,
    contactName: sub.contactName,
    email: sub.email,
    phone: sub.phone,
    address: sub.address,
    city: sub.city,
    state: sub.state,
    zip: sub.zip,
    trades: sub.trades,
    trade: firstTrade,  // Android expects single trade string
    licenseNumber: sub.licenseNumber,
    insuranceExpiry: sub.insuranceExpiry?.toISOString?.() ?? sub.insuranceExpiry,
    rating: sub.rating,
    status: sub.status,
    notes: sub.notes,
    projectCount: sub._count?.projects ?? 0,
    certificationCount: sub._count?.certifications ?? 0,
    certifications: expiringCertifications,  // Android expects 'certifications' not 'expiringCertifications'
    expiringCertifications,
    createdAt: sub.createdAt?.toISOString?.() ?? sub.createdAt,
    updatedAt: sub.updatedAt?.toISOString?.() ?? sub.updatedAt
  }
}

// GET /api/subcontractors - List subcontractors
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    // Parse query params (accept both variants)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const trade = searchParams.get('trade')
    const search = searchParams.get('search') || searchParams.get('q')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const subcontractors = await prisma.subcontractor.findMany({
      where,
      include: {
        _count: { select: { projects: true, certifications: true } },
        certifications: {
          where: {
            OR: [
              { status: 'EXPIRED' },
              { status: 'EXPIRING_SOON' }
            ]
          },
          select: { id: true, certName: true, expiryDate: true, status: true }
        }
      },
      orderBy: { companyName: 'asc' }
    })

    // Filter by trade if specified (trades is already parsed from JSONB)
    let result = subcontractors
    if (trade) {
      result = subcontractors.filter(sub => {
        const trades = sub.trades as unknown as string[] | null
        return Array.isArray(trades) && trades.includes(trade)
      })
    }

    // Transform to flatten _count for iOS and wrap in Android-compatible response
    const transformed = result.map(transformSubcontractor)
    return NextResponse.json({
      subcontractors: transformed,
      total: transformed.length,
      page: 1,
      pageSize: transformed.length
    })
  } catch (error) {
    console.error('Error fetching subcontractors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/subcontractors - Create subcontractor
export async function POST(request: NextRequest) {
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
      trades,    // Array of trades (web/iOS)
      trade,     // Single trade (Android)
      licenseNumber,
      insuranceExpiry,
      rating,
      status,
      notes
    } = body

    // Accept either trades array or single trade string
    let finalTrades = trades
    if (!finalTrades && trade) {
      finalTrades = [trade]  // Convert single trade to array
    }

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Trades are optional - default to empty array if not provided
    if (!finalTrades) {
      finalTrades = []
    }

    const subcontractor = await prisma.subcontractor.create({
      data: {
        companyName,
        contactName,
        email,
        phone,
        address,
        city,
        state,
        zip,
        trades: finalTrades,
        licenseNumber,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        rating,
        status: status || 'ACTIVE',
        notes
      }
    })

    // Return response matching Android Subcontractor model
    // For newly created subcontractors, certifications and projects are empty
    const firstTrade = Array.isArray(finalTrades) && finalTrades.length > 0 ? finalTrades[0] : null

    return NextResponse.json({
      id: subcontractor.id,
      companyName: subcontractor.companyName,
      contactName: subcontractor.contactName,
      email: subcontractor.email,
      phone: subcontractor.phone,
      address: subcontractor.address,
      trade: firstTrade,  // Android expects single trade string
      status: subcontractor.status,
      rating: subcontractor.rating,
      notes: subcontractor.notes,
      insuranceExpiry: subcontractor.insuranceExpiry?.toISOString() ?? null,
      licenseNumber: subcontractor.licenseNumber,
      certifications: [],  // Empty for new subcontractor
      projects: [],  // Empty for new subcontractor
      createdAt: subcontractor.createdAt.toISOString(),
      updatedAt: subcontractor.updatedAt.toISOString()
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating subcontractor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
