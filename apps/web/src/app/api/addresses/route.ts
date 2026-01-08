import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Search saved addresses
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const type = searchParams.get('type') // Filter by address type
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build where clause
    const where: Record<string, unknown> = {}

    if (query && query.length >= 2) {
      // Search in full address, street, city, or label (case-insensitive)
      const searchWhere: Record<string, unknown> = {
        OR: [
          { fullAddress: { contains: query, mode: 'insensitive' } },
          { streetAddress: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { label: { contains: query, mode: 'insensitive' } },
        ],
      }

      if (type) {
        searchWhere.type = type
      }

      const addresses = await prisma.savedAddress.findMany({
        where: searchWhere,
        orderBy: [
          { usageCount: 'desc' },
          { lastUsedAt: 'desc' },
        ],
        take: limit,
      })

      return NextResponse.json({ addresses })
    }

    // If no query, return most frequently used addresses
    const addresses = await prisma.savedAddress.findMany({
      where: type ? { type } : undefined,
      orderBy: [
        { usageCount: 'desc' },
        { lastUsedAt: 'desc' },
      ],
      take: limit,
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error('Error fetching addresses:', error)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}

// POST - Save a new address or update existing
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      fullAddress,
      streetAddress,
      city,
      state,
      zipCode,
      country = 'USA',
      latitude,
      longitude,
      label,
      type = 'JOBSITE',
    } = body

    if (!fullAddress) {
      return NextResponse.json({ error: 'Full address is required' }, { status: 400 })
    }

    // Check if address already exists (by full address or coordinates)
    let existingAddress = await prisma.savedAddress.findFirst({
      where: {
        fullAddress: fullAddress,
      },
    })

    if (existingAddress) {
      // Update usage count and last used timestamp
      const updated = await prisma.savedAddress.update({
        where: { id: existingAddress.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
          // Update other fields if provided
          ...(label && { label }),
          ...(latitude && { latitude }),
          ...(longitude && { longitude }),
        },
      })
      return NextResponse.json({ address: updated, isNew: false })
    }

    // Create new address
    const address = await prisma.savedAddress.create({
      data: {
        fullAddress,
        streetAddress,
        city,
        state,
        zipCode,
        country,
        latitude,
        longitude,
        label,
        type,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ address, isNew: true }, { status: 201 })
  } catch (error) {
    console.error('Error saving address:', error)
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
  }
}
