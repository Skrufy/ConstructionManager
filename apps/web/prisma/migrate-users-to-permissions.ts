/**
 * Migrate Existing Users to New Permission System
 *
 * Run with: npx tsx prisma/migrate-users-to-permissions.ts
 *
 * This script:
 * 1. Finds all users without company permissions
 * 2. Maps their old role to the appropriate company template
 * 3. Maps their old role to the appropriate project template for each assignment
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Map old roles to company templates
const ROLE_TO_COMPANY_TEMPLATE: Record<string, string> = {
  VIEWER: 'No Company Access',
  FIELD_WORKER: 'No Company Access',
  CREW_LEADER: 'No Company Access',
  FOREMAN: 'No Company Access',
  SUPERINTENDENT: 'No Company Access',
  ARCHITECT: 'No Company Access',
  DEVELOPER: 'No Company Access',
  PROJECT_MANAGER: 'Project Manager (Company)',
  ADMIN: 'Owner / Admin',
  OFFICE: 'Office Staff',
}

// Map old roles to project templates
const ROLE_TO_PROJECT_TEMPLATE: Record<string, string> = {
  VIEWER: 'Viewer',
  FIELD_WORKER: 'Field Worker',
  CREW_LEADER: 'Crew Leader',
  FOREMAN: 'Foreman',
  SUPERINTENDENT: 'Foreman',
  ARCHITECT: 'Architect/Engineer',
  DEVELOPER: 'Developer',
  PROJECT_MANAGER: 'Project Manager',
  ADMIN: 'Project Manager',
  OFFICE: 'Field Worker',
}

async function main() {
  console.log('Starting user permission migration...\n')

  // Get all templates for reference
  const allTemplates = await prisma.permissionTemplate.findMany()
  const companyTemplates = allTemplates.filter((t) => t.scope === 'company')
  const projectTemplates = allTemplates.filter((t) => t.scope === 'project')

  console.log(`Found ${companyTemplates.length} company templates:`)
  companyTemplates.forEach((t) => console.log(`  - ${t.name}`))
  console.log(`\nFound ${projectTemplates.length} project templates:`)
  projectTemplates.forEach((t) => console.log(`  - ${t.name}`))

  // Find users without company permissions
  const usersToMigrate = await prisma.user.findMany({
    where: {
      companyPermission: null,
    },
    include: {
      projectAssignments: {
        include: {
          project: { select: { name: true } },
        },
      },
    },
  })

  console.log(`\n${usersToMigrate.length} users need migration:\n`)

  let successCount = 0
  let errorCount = 0

  for (const user of usersToMigrate) {
    console.log(`Migrating: ${user.name || user.email} (${user.role})`)

    // Find company template
    const companyTemplateName =
      ROLE_TO_COMPANY_TEMPLATE[user.role] || 'No Company Access'
    const companyTemplate = companyTemplates.find((t) => t.name === companyTemplateName)

    if (!companyTemplate) {
      console.log(`  ❌ Company template not found: ${companyTemplateName}`)
      errorCount++
      continue
    }

    try {
      // Create company permission
      await prisma.userCompanyPermission.create({
        data: {
          userId: user.id,
          companyTemplateId: companyTemplate.id,
          assignedBy: null, // System migration
        },
      })
      console.log(`  ✓ Assigned company template: ${companyTemplateName}`)

      // Update project assignments
      const projectTemplateName =
        ROLE_TO_PROJECT_TEMPLATE[user.role] || 'Field Worker'
      const projectTemplate = projectTemplates.find((t) => t.name === projectTemplateName)

      if (projectTemplate && user.projectAssignments.length > 0) {
        let updatedCount = 0
        for (const assignment of user.projectAssignments) {
          if (!assignment.projectTemplateId) {
            await prisma.projectAssignment.update({
              where: { id: assignment.id },
              data: {
                projectTemplateId: projectTemplate.id,
                assignedBy: null, // System migration
              },
            })
            updatedCount++
          }
        }
        if (updatedCount > 0) {
          console.log(
            `  ✓ Updated ${updatedCount} project assignment(s) with template: ${projectTemplateName}`
          )
        }
      }

      successCount++
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('Migration Complete!')
  console.log(`  ✓ Successfully migrated: ${successCount} users`)
  if (errorCount > 0) {
    console.log(`  ❌ Errors: ${errorCount} users`)
  }

  // Show summary
  const totalWithPermissions = await prisma.userCompanyPermission.count()
  const totalUsers = await prisma.user.count()
  const totalAssignmentsWithTemplate = await prisma.projectAssignment.count({
    where: { projectTemplateId: { not: null } },
  })
  const totalAssignments = await prisma.projectAssignment.count()

  console.log('\nCurrent State:')
  console.log(`  Users with company permissions: ${totalWithPermissions}/${totalUsers}`)
  console.log(
    `  Project assignments with templates: ${totalAssignmentsWithTemplate}/${totalAssignments}`
  )
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
