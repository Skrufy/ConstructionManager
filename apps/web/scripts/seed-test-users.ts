/**
 * Test User Seed Script
 *
 * This script:
 * 1. Deletes all existing users (and cascades to related records)
 * 2. Creates fresh test users in both Supabase Auth AND Prisma
 *
 * Usage:
 *   npx tsx scripts/seed-test-users.ts
 *
 * Prerequisites:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env
 *   - DATABASE_URL must be set for Prisma connection
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Initialize Supabase Admin client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  console.error('Set these in your .env file before running this script')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test users to create - all use the same password for easy testing
const TEST_PASSWORD = 'TestPass123!'

const TEST_USERS = [
  {
    email: 'admin@test.com',
    name: 'Alex Admin',
    role: 'ADMIN',
    phone: '555-100-0001',
  },
  {
    email: 'pm@test.com',
    name: 'Patricia Manager',
    role: 'PROJECT_MANAGER',
    phone: '555-200-0002',
  },
  {
    email: 'super@test.com',
    name: 'Sam Superintendent',
    role: 'SUPERINTENDENT',
    phone: '555-300-0003',
  },
  {
    email: 'field1@test.com',
    name: 'Frank Field',
    role: 'FIELD_WORKER',
    phone: '555-400-0004',
  },
  {
    email: 'field2@test.com',
    name: 'Fiona Field',
    role: 'FIELD_WORKER',
    phone: '555-400-0005',
  },
  {
    email: 'office@test.com',
    name: 'Oscar Office',
    role: 'OFFICE',
    phone: '555-500-0006',
  },
  {
    email: 'viewer@test.com',
    name: 'Vera Viewer',
    role: 'VIEWER',
    phone: '555-600-0007',
  },
]

async function clearExistingData() {
  console.log('Clearing existing data...\n')

  // Delete in order to respect foreign key constraints
  // Most dependent tables first
  const deleteOperations = [
    { name: 'EquipmentAssignment', fn: () => prisma.equipmentAssignment.deleteMany() },
    { name: 'EquipmentLog', fn: () => prisma.equipmentLog.deleteMany() },
    { name: 'Equipment', fn: () => prisma.equipment.deleteMany() },
    { name: 'PunchListItem', fn: () => prisma.punchListItem.deleteMany() },
    { name: 'PunchList', fn: () => prisma.punchList.deleteMany() },
    { name: 'InspectionPhoto', fn: () => prisma.inspectionPhoto.deleteMany() },
    { name: 'Inspection', fn: () => prisma.inspection.deleteMany() },
    { name: 'DailyLogEntry', fn: () => prisma.dailyLogEntry.deleteMany() },
    { name: 'DailyLogMaterial', fn: () => prisma.dailyLogMaterial.deleteMany() },
    { name: 'DailyLogIssue', fn: () => prisma.dailyLogIssue.deleteMany() },
    { name: 'DailyLogVisitor', fn: () => prisma.dailyLogVisitor.deleteMany() },
    { name: 'DailyLog', fn: () => prisma.dailyLog.deleteMany() },
    { name: 'TimeEntry', fn: () => prisma.timeEntry.deleteMany() },
    { name: 'EmployeeWarning', fn: () => prisma.employeeWarning.deleteMany() },
    { name: 'DocumentAnnotation', fn: () => prisma.documentAnnotation.deleteMany() },
    { name: 'DocumentSplitDraft', fn: () => prisma.documentSplitDraft.deleteMany() },
    { name: 'File', fn: () => prisma.file.deleteMany() },
    { name: 'ProjectAssignment', fn: () => prisma.projectAssignment.deleteMany() },
    { name: 'Project', fn: () => prisma.project.deleteMany() },
    { name: 'DeviceToken', fn: () => prisma.deviceToken.deleteMany() },
    { name: 'User', fn: () => prisma.user.deleteMany() },
  ]

  for (const op of deleteOperations) {
    try {
      const result = await op.fn()
      if (result.count > 0) {
        console.log(`  Deleted ${result.count} ${op.name} records`)
      }
    } catch (error) {
      // Table might not exist or be empty, continue
      console.log(`  Skipped ${op.name} (may not exist)`)
    }
  }

  // Also clear Supabase Auth users
  console.log('\nClearing Supabase Auth users...')
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()

  if (existingUsers?.users) {
    for (const user of existingUsers.users) {
      await supabaseAdmin.auth.admin.deleteUser(user.id)
      console.log(`  Deleted Supabase user: ${user.email}`)
    }
  }

  console.log('\nAll existing data cleared!\n')
}

async function createTestUsers() {
  console.log('Creating test users...\n')
  console.log(`All test users use password: ${TEST_PASSWORD}\n`)

  for (const testUser of TEST_USERS) {
    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: testUser.email,
        password: TEST_PASSWORD,
        email_confirm: true, // Skip email verification for test users
        user_metadata: {
          name: testUser.name,
          role: testUser.role,
        }
      })

      if (authError) {
        console.log(`  ✗ Failed to create Supabase user ${testUser.email}: ${authError.message}`)
        continue
      }

      if (!authData.user) {
        console.log(`  ✗ No user returned for ${testUser.email}`)
        continue
      }

      // 2. Create corresponding Prisma user
      const prismaUser = await prisma.user.create({
        data: {
          email: testUser.email.toLowerCase(),
          name: testUser.name,
          role: testUser.role as any,
          phone: testUser.phone,
          status: 'ACTIVE',
          supabaseId: authData.user.id,
          password: 'SUPABASE_AUTH', // Placeholder - auth handled by Supabase
        }
      })

      console.log(`  ✓ Created ${testUser.role.padEnd(16)} - ${testUser.email} (${testUser.name})`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log(`  ✗ Failed to create ${testUser.email}: ${errorMessage}`)
    }
  }
}

async function createSampleProject() {
  console.log('\nCreating sample project...\n')

  // Get the admin and some field workers
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  const pm = await prisma.user.findFirst({ where: { role: 'PROJECT_MANAGER' } })
  const superintendent = await prisma.user.findFirst({ where: { role: 'SUPERINTENDENT' } })
  const fieldWorkers = await prisma.user.findMany({ where: { role: 'FIELD_WORKER' } })

  if (!admin) {
    console.log('  No admin user found, skipping project creation')
    return
  }

  const project = await prisma.project.create({
    data: {
      name: 'Downtown Office Building',
      description: 'New 12-story office building construction in downtown area',
      address: '123 Main Street, Downtown',
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      gpsLatitude: 40.7128,
      gpsLongitude: -74.0060,
    }
  })

  console.log(`  ✓ Created project: ${project.name}`)

  // Assign team members
  const assignments = []

  if (pm) {
    assignments.push({ userId: pm.id, projectId: project.id })
  }
  if (superintendent) {
    assignments.push({ userId: superintendent.id, projectId: project.id })
  }
  for (const worker of fieldWorkers) {
    assignments.push({ userId: worker.id, projectId: project.id })
  }

  if (assignments.length > 0) {
    await prisma.projectAssignment.createMany({ data: assignments })
    console.log(`  ✓ Assigned ${assignments.length} team members to project`)
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Test User Seed Script')
  console.log('='.repeat(60))
  console.log()

  try {
    await clearExistingData()
    await createTestUsers()
    await createSampleProject()

    console.log('\n' + '='.repeat(60))
    console.log('Summary')
    console.log('='.repeat(60))
    console.log(`
Test users created successfully!

Login credentials (all use the same password):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Password: ${TEST_PASSWORD}

Users:
  ADMIN            admin@test.com
  PROJECT_MANAGER  pm@test.com
  SUPERINTENDENT   super@test.com
  FIELD_WORKER     field1@test.com
  FIELD_WORKER     field2@test.com
  OFFICE           office@test.com
  VIEWER           viewer@test.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

  } catch (error) {
    console.error('Script failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
