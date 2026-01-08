import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'OFFICE']

// Helper to transform client for iOS - flattens _count.projects to projectCount
function transformClient(client: {
  id: string
  companyName: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  status: string
  notes: string | null
  website: string | null
  industry: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { projects: number }
}) {
  return {
    id: client.id,
    companyName: client.companyName,
    contactName: client.contactName,
    email: client.email,
    phone: client.phone,
    address: client.address,
    city: client.city,
    state: client.state,
    zip: client.zip,
    status: client.status,
    notes: client.notes,
    website: client.website,
    industry: client.industry,
    projectCount: client._count?.projects ?? 0,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt
  }
}

const clientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().optional().nullable(),
  email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
})

// GET /api/clients - List clients
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    // Parse query params (accept both variants)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const industry = searchParams.get('industry')
    const search = searchParams.get('search') || searchParams.get('q')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (industry) where.industry = industry
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        _count: { select: { projects: true } }
      },
      orderBy: { companyName: 'asc' }
    })

    // Transform to flatten _count for iOS
    return NextResponse.json(clients.map(transformClient))
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/clients - Create client
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Handle empty email string
    if (body.email === '') {
      body.email = null
    }

    const validation = clientSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    const client = await prisma.client.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        status: data.status,
        notes: data.notes,
        website: data.website,
        industry: data.industry,
      },
      include: {
        _count: { select: { projects: true } }
      }
    })

    // Transform to flatten _count for iOS
    return NextResponse.json(transformClient(client), { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
