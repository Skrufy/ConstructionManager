import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withRateLimit } from '@/lib/rate-limit'

// Schema for Supabase-based registration (new flow)
const supabaseRegisterSchema = z.object({
  supabaseId: z.string().uuid('Invalid Supabase ID'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

// Rate limit: 3 registration attempts per hour per IP
const registrationLimit = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  message: 'Too many registration attempts. Please try again later.',
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = withRateLimit(request, registrationLimit)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()

    // New Supabase-based registration flow
    const validation = supabaseRegisterSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { supabaseId, name, email } = validation.data

    // Check if user already exists by email
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUserByEmail) {
      // If user exists but doesn't have supabaseId, link them
      if (!existingUserByEmail.supabaseId) {
        const updatedUser = await prisma.user.update({
          where: { email },
          data: {
            supabaseId,
            migratedAt: new Date(),
            passwordResetRequired: false,
          },
        })

        return NextResponse.json(
          {
            message: 'User linked to Supabase successfully',
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
            },
          },
          { status: 200 }
        )
      }

      // User already exists and is linked
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Check if user exists by supabaseId
    const existingUserBySupabase = await prisma.user.findUnique({
      where: { supabaseId },
    })

    if (existingUserBySupabase) {
      return NextResponse.json(
        {
          message: 'User already exists',
          user: {
            id: existingUserBySupabase.id,
            name: existingUserBySupabase.name,
            email: existingUserBySupabase.email,
            role: existingUserBySupabase.role,
          },
        },
        { status: 200 }
      )
    }

    // Create new user with VIEWER role by default
    // Roles can only be changed by admins through the admin panel
    const user = await prisma.user.create({
      data: {
        supabaseId,
        name,
        email,
        password: '', // No password for Supabase Auth users
        role: 'VIEWER',
        status: 'ACTIVE',
      },
    })

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    )
  }
}
