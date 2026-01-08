import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { VALID_ROLES, VALID_STATUSES } from '@/lib/permissions'
import { isOwnerAdmin, getToolAccessLevel } from '@/lib/api-permissions'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// Helper to transform user to snake_case format for iOS
function transformUser(user: {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  status: string
  createdAt: Date
  updatedAt?: Date
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt?.toISOString() ?? user.createdAt.toISOString()
  }
}

// VALID_ROLES and VALID_STATUSES imported from @/lib/permissions

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password validation: minimum 8 characters, at least one uppercase, one lowercase, one number
const PASSWORD_MIN_LENGTH = 8
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' }
  }
  return { valid: true }
}

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check user management permissions - need at least read_only access
    const isAdmin = await isOwnerAdmin(user.id)
    const accessLevel = await getToolAccessLevel(user.id, null, 'user_management')
    const canViewUsers = isAdmin || accessLevel !== 'none'

    if (!canViewUsers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        companyPermission: {
          select: {
            companyTemplate: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            projectAssignments: true,
          },
        },
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(users.map(u => ({
      ...transformUser(u),
      project_count: u._count.projectAssignments,
      companyPermission: u.companyPermission,
    })))
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Creating users requires owner/admin access to user_management
    const isAdmin = await isOwnerAdmin(user.id)
    const accessLevel = await getToolAccessLevel(user.id, null, 'user_management')
    const canCreateUsers = isAdmin || accessLevel === 'admin'

    if (!canCreateUsers) {
      return NextResponse.json({ error: 'Only administrators can create users' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, phone, role, status } = body

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    // Email format validation
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Password strength validation
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 })
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone || null,
        role: role || 'FIELD_WORKER',
        status: status || 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true,
      }
    })

    return NextResponse.json(transformUser(newUser), { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
