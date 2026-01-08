import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Roles that can issue warnings (foreman and above)
const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

// Type for warning from Prisma
type WarningRecord = {
  id: string
  employeeId: string
  employee: { id: string; name: string; email?: string; role?: string }
  issuedById: string
  issuedBy: { id: string; name: string; role?: string }
  projectId: string | null
  project: { id: string; name: string } | null
  warningType: string
  severity: string
  description: string
  incidentDate: Date
  witnessNames: string | null
  actionRequired: string | null
  status: string
  acknowledgedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

// Transform warning for mobile compatibility (iOS decoder uses convertFromSnakeCase)
function transformWarning(warning: WarningRecord) {
  // Parse witnessNames string into array (comma or newline separated)
  const witnesses = warning.witnessNames
    ? warning.witnessNames.split(/[,\n]/).map(w => w.trim()).filter(w => w.length > 0)
    : []

  return {
    id: warning.id,
    employee_id: warning.employeeId,
    employee_name: warning.employee?.name ?? 'Unknown',
    issued_by_id: warning.issuedById,
    issued_by_name: warning.issuedBy?.name ?? 'Unknown',
    project_id: warning.projectId,
    project_name: warning.project?.name ?? null,
    type: warning.warningType,
    warning_type: warning.warningType,  // Android compatibility
    severity: warning.severity,
    title: warning.description.substring(0, 100),  // Use first 100 chars of description as title
    description: warning.description,
    incident_date: warning.incidentDate.toISOString(),
    issued_at: warning.createdAt.toISOString(),
    acknowledged_at: null,  // Not in current schema
    employee_response: null,  // Not in current schema
    witnesses,
    attachments: [],  // Not in current schema
    follow_up_required: warning.actionRequired ? true : false,
    follow_up_date: null,  // Not in current schema
    follow_up_notes: warning.actionRequired,
    status: warning.status || 'Pending',
    action_required: warning.actionRequired,
    created_at: warning.createdAt.toISOString(),
    updated_at: warning.updatedAt.toISOString()
  }
}

// GET /api/warnings - List all warnings
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId') || searchParams.get('employee_id')
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const status = searchParams.get('status')

    // Build filter
    const where: Record<string, unknown> = {}

    // Non-supervisory roles can only see their own warnings
    if (!AUTHORIZED_ROLES.includes(user.role)) {
      where.employeeId = user.id
    } else {
      // Supervisors can filter by employee
      if (employeeId) where.employeeId = employeeId
    }

    if (projectId) where.projectId = projectId
    if (status) where.status = status

    const warnings = await prisma.employeeWarning.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, email: true, role: true }
        },
        issuedBy: {
          select: { id: true, name: true, role: true }
        },
        project: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      warnings: warnings.map(transformWarning),
      total: warnings.length,
      page: 1,
      page_size: warnings.length
    })
  } catch (error) {
    console.error('Error fetching warnings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/warnings - Create a new warning
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check if user has permission to issue warnings
    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to issue warnings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      employeeId,
      projectId,
      warningType,
      severity,
      description,
      incidentDate,
      witnessNames,
      actionRequired
    } = body

    // Validate required fields
    if (!employeeId || !warningType || !severity || !description || !incidentDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify employee exists
    const employee = await prisma.user.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Can't issue warning to yourself
    if (employeeId === user.id) {
      return NextResponse.json(
        { error: 'You cannot issue a warning to yourself' },
        { status: 400 }
      )
    }

    // Create warning
    const warning = await prisma.employeeWarning.create({
      data: {
        employeeId,
        issuedById: user.id,
        projectId: projectId || null,
        warningType,
        severity,
        description,
        incidentDate: new Date(incidentDate),
        witnessNames: witnessNames || null,
        actionRequired: actionRequired || null
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true }
        },
        issuedBy: {
          select: { id: true, name: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    })

    // Return warning directly for iOS compatibility (no wrapper)
    return NextResponse.json(transformWarning(warning), { status: 201 })
  } catch (error) {
    console.error('Error creating warning:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
