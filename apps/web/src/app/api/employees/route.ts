import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Roles that can manage employees
const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT', 'FOREMAN', 'CREW_LEADER']

// Transform employee for mobile API compatibility (snake_case with flattened fields)
function transformEmployee(employee: {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  jobTitle: string | null
  userId: string | null
  isActive: boolean
  createdAt: Date
  updatedAt?: Date | null
  user?: { id: string; name: string; email: string } | null
}) {
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    company: employee.company,
    job_title: employee.jobTitle,
    user_id: employee.userId,
    is_active: employee.isActive,
    created_at: employee.createdAt.toISOString(),
    updated_at: employee.updatedAt?.toISOString() ?? null,
    user: employee.user ? {
      id: employee.user.id,
      name: employee.user.name,
      email: employee.user.email,
    } : null,
  }
}

// GET /api/employees - List all employees
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Most roles can view employees for safety meeting attendance
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const isActive = searchParams.get('active')
    const company = searchParams.get('company')

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)))
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    // Default to active employees only
    if (isActive !== 'all') {
      where.isActive = isActive === 'false' ? false : true
    }

    if (company) {
      where.company = { contains: company, mode: 'insensitive' }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          jobTitle: true,
          userId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.employee.count({ where })
    ])

    return NextResponse.json({
      employees: employees.map(transformEmployee),
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/employees - Create a new employee
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check authorization
    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, phone, company, jobTitle, userId } = body

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check if email already exists for another employee
    if (email) {
      const existingEmployee = await prisma.employee.findFirst({
        where: { email: email.toLowerCase() }
      })
      if (existingEmployee) {
        return NextResponse.json({ error: 'An employee with this email already exists' }, { status: 409 })
      }
    }

    // If userId is provided, check it exists and isn't already linked
    if (userId) {
      const existingLink = await prisma.employee.findFirst({
        where: { userId }
      })
      if (existingLink) {
        return NextResponse.json({ error: 'This user is already linked to an employee record' }, { status: 409 })
      }

      const userExists = await prisma.user.findUnique({ where: { id: userId } })
      if (!userExists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
    }

    // Create employee
    const newEmployee = await prisma.employee.create({
      data: {
        name: name.trim(),
        email: email ? email.toLowerCase().trim() : null,
        phone: phone ? phone.trim() : null,
        company: company ? company.trim() : null,
        jobTitle: jobTitle ? jobTitle.trim() : null,
        userId: userId || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        jobTitle: true,
        userId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json(transformEmployee(newEmployee), { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
