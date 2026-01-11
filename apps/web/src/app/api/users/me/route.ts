import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().max(20).nullable().optional(),
  language: z.enum(['en', 'es']).optional(),
})

// GET /api/users/me - Get current user profile
export async function GET(request: NextRequest) {
  try {
    console.log('[/api/users/me] Starting auth check')
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) {
      console.log('[/api/users/me] Auth failed, returning error response')
      return authResult
    }
    const { user: authUser } = authResult
    console.log('[/api/users/me] Auth passed, user:', authUser.id, authUser.email)

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        language: true,
        createdAt: true,
      },
    })

    if (!user) {
      console.log('[/api/users/me] User not found in DB for id:', authUser.id)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    console.log('[/api/users/me] User found:', user.email)

    // Return snake_case for iOS compatibility
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      language: user.language,
      created_at: user.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    // Log the full error details for debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/users/me - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user: authUser } = authResult

    const body = await request.json()
    const validation = updateProfileSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.flatten(),
      }, { status: 400 })
    }

    const { name, phone, language } = validation.data

    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        name,
        phone: phone || null,
        ...(language && { language }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        language: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
