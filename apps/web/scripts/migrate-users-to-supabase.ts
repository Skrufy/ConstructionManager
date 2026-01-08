/**
 * User Migration Script: NextAuth to Supabase Auth
 *
 * This script migrates existing users from the local Prisma database to Supabase Auth.
 * After migration, users will need to reset their passwords (forced reset).
 *
 * Usage:
 *   npx tsx scripts/migrate-users-to-supabase.ts
 *
 * Prerequisites:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env
 *   - DATABASE_URL must be set for Prisma connection
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Initialize Supabase Admin client (requires service role key)
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

interface MigrationResult {
  total: number
  migrated: number
  skipped: number
  failed: number
  errors: Array<{ email: string; error: string }>
}

async function migrateUsers(): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  }

  console.log('Starting user migration to Supabase Auth...\n')

  // Get all users that haven't been migrated yet
  const users = await prisma.user.findMany({
    where: {
      supabaseId: null // Only users not yet linked to Supabase
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true
    }
  })

  result.total = users.length
  console.log(`Found ${users.length} users to migrate\n`)

  for (const user of users) {
    console.log(`Processing: ${user.email}...`)

    try {
      // Check if user already exists in Supabase Auth
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingSupabaseUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === user.email.toLowerCase()
      )

      if (existingSupabaseUser) {
        // User already exists in Supabase - just link them
        console.log(`  -> User already exists in Supabase, linking...`)

        await prisma.user.update({
          where: { id: user.id },
          data: {
            supabaseId: existingSupabaseUser.id,
            passwordResetRequired: true,
            migratedAt: new Date()
          }
        })

        result.skipped++
        console.log(`  -> Linked existing Supabase user`)
        continue
      }

      // Create new Supabase Auth user (without password - forces reset)
      // Generate a random temporary password (user will reset it)
      const tempPassword = crypto.randomUUID() + crypto.randomUUID()

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: true, // Skip email verification since they're existing users
        user_metadata: {
          name: user.name,
          role: user.role,
          migrated_from: 'nextauth',
          prisma_id: user.id
        }
      })

      if (createError) {
        console.log(`  -> Failed: ${createError.message}`)
        result.failed++
        result.errors.push({ email: user.email, error: createError.message })
        continue
      }

      if (!newUser?.user) {
        console.log(`  -> Failed: No user returned from Supabase`)
        result.failed++
        result.errors.push({ email: user.email, error: 'No user returned' })
        continue
      }

      // Update Prisma user with Supabase ID
      await prisma.user.update({
        where: { id: user.id },
        data: {
          supabaseId: newUser.user.id,
          passwordResetRequired: true,
          migratedAt: new Date()
        }
      })

      result.migrated++
      console.log(`  -> Migrated successfully (Supabase ID: ${newUser.user.id})`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log(`  -> Failed: ${errorMessage}`)
      result.failed++
      result.errors.push({ email: user.email, error: errorMessage })
    }
  }

  return result
}

async function sendPasswordResetEmails(): Promise<void> {
  console.log('\nSending password reset emails to migrated users...\n')

  // Get all migrated users who need password reset
  const users = await prisma.user.findMany({
    where: {
      supabaseId: { not: null },
      passwordResetRequired: true,
      status: 'ACTIVE' // Only active users
    },
    select: {
      email: true,
      name: true
    }
  })

  console.log(`Found ${users.length} users needing password reset emails\n`)

  let sent = 0
  let failed = 0

  for (const user of users) {
    try {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`
      })

      if (error) {
        console.log(`Failed to send reset email to ${user.email}: ${error.message}`)
        failed++
      } else {
        console.log(`Sent reset email to ${user.email}`)
        sent++
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log(`Failed to send reset email to ${user.email}: ${errorMessage}`)
      failed++
    }
  }

  console.log(`\nPassword reset emails: ${sent} sent, ${failed} failed`)
}

async function main() {
  console.log('='.repeat(60))
  console.log('User Migration: NextAuth -> Supabase Auth')
  console.log('='.repeat(60))
  console.log()

  try {
    // Step 1: Migrate users
    const result = await migrateUsers()

    console.log('\n' + '='.repeat(60))
    console.log('Migration Summary')
    console.log('='.repeat(60))
    console.log(`Total users:    ${result.total}`)
    console.log(`Migrated:       ${result.migrated}`)
    console.log(`Skipped:        ${result.skipped} (already in Supabase)`)
    console.log(`Failed:         ${result.failed}`)

    if (result.errors.length > 0) {
      console.log('\nErrors:')
      for (const err of result.errors) {
        console.log(`  - ${err.email}: ${err.error}`)
      }
    }

    // Step 2: Prompt to send password reset emails
    if (result.migrated > 0 || result.skipped > 0) {
      console.log('\n' + '-'.repeat(60))
      console.log('Next step: Send password reset emails?')
      console.log('-'.repeat(60))
      console.log('\nTo send password reset emails to all migrated users, run:')
      console.log('  npx tsx scripts/migrate-users-to-supabase.ts --send-reset-emails')
      console.log('\nUsers will receive an email to set their new password.')
    }

    // Check for --send-reset-emails flag
    if (process.argv.includes('--send-reset-emails')) {
      await sendPasswordResetEmails()
    }

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
