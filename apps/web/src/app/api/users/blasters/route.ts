import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/users/blasters - Get all certified blasters
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const blasters = await prisma.user.findMany({
      where: {
        isBlaster: true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isBlaster: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Return direct array for mobile compatibility
    return NextResponse.json(blasters)
  } catch (error) {
    console.error('Error fetching blasters:', error)
    return NextResponse.json({ error: 'Failed to fetch blasters' }, { status: 500 })
  }
}
