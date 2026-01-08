import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'

export const dynamic = 'force-dynamic'

interface CSVRow {
  name?: string
  email?: string
  phone?: string
  company?: string
  jobTitle?: string
  job_title?: string // Alternative column name
}

interface ImportResult {
  success: boolean
  row: number
  name?: string
  error?: string
}

// POST /api/employees/bulk - Bulk import employees from CSV
export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { user } = authResult

  // Only allow ADMIN, PROJECT_MANAGER, and SUPERINTENDENT
  if (!['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const skipDuplicates = formData.get('skipDuplicates') === 'true'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV file' },
        { status: 400 }
      )
    }

    // Read file content
    const text = await file.text()

    // Parse CSV
    const parseResult = Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
    })

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: 'CSV parsing failed',
          details: parseResult.errors.slice(0, 5).map(e => e.message)
        },
        { status: 400 }
      )
    }

    const rows = parseResult.data
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or has no valid data rows' },
        { status: 400 }
      )
    }

    // Get existing emails for duplicate checking
    const existingEmails = new Set(
      (await prisma.employee.findMany({
        where: { email: { not: null } },
        select: { email: true }
      })).map(e => e.email?.toLowerCase())
    )

    const results: ImportResult[] = []
    let created = 0
    let skipped = 0
    let failed = 0

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +2 because of header row and 0-index

      // Get name (required)
      const name = row.name?.trim()
      if (!name) {
        results.push({ success: false, row: rowNum, error: 'Missing required field: name' })
        failed++
        continue
      }

      // Get other fields
      const email = row.email?.trim().toLowerCase() || null
      const phone = row.phone?.trim() || null
      const company = row.company?.trim() || null
      const jobTitle = (row.jobTitle || row.job_title)?.trim() || null

      // Check for duplicate email
      if (email && existingEmails.has(email)) {
        if (skipDuplicates) {
          results.push({ success: false, row: rowNum, name, error: 'Skipped: duplicate email' })
          skipped++
          continue
        } else {
          results.push({ success: false, row: rowNum, name, error: 'Duplicate email already exists' })
          failed++
          continue
        }
      }

      try {
        await prisma.employee.create({
          data: {
            name,
            email,
            phone,
            company,
            jobTitle,
            isActive: true,
          }
        })

        if (email) {
          existingEmails.add(email)
        }

        results.push({ success: true, row: rowNum, name })
        created++
      } catch (error) {
        results.push({
          success: false,
          row: rowNum,
          name,
          error: error instanceof Error ? error.message : 'Database error'
        })
        failed++
      }
    }

    return NextResponse.json({
      message: `Import complete: ${created} created, ${skipped} skipped, ${failed} failed`,
      summary: {
        total: rows.length,
        created,
        skipped,
        failed
      },
      results: results.slice(0, 100) // Limit detailed results to first 100
    })

  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk import' },
      { status: 500 }
    )
  }
}
