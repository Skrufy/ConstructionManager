/**
 * Seed Default Permission Templates
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-permissions.ts
 * Or: npx tsx prisma/seed-permissions.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Default Project Templates
const PROJECT_TEMPLATES = [
  {
    name: 'Viewer',
    description: 'Read-only access for external stakeholders',
    scope: 'project',
    sortOrder: 1,
    toolPermissions: {
      daily_logs: 'read_only',
      time_tracking: 'none',
      equipment: 'read_only',
      documents: 'read_only',
      photos: 'read_only',
      schedule: 'read_only',
      punch_lists: 'read_only',
      safety: 'none',
      drone_flights: 'read_only',
      rfis: 'read_only',
      materials: 'read_only',
    },
    granularPermissions: {},
  },
  {
    name: 'Field Worker',
    description: 'Entry-level workers on job sites',
    scope: 'project',
    sortOrder: 2,
    toolPermissions: {
      daily_logs: 'standard',
      time_tracking: 'standard',
      equipment: 'read_only',
      documents: 'read_only',
      photos: 'standard',
      schedule: 'read_only',
      punch_lists: 'read_only',
      safety: 'standard',
      drone_flights: 'read_only',
      rfis: 'read_only',
      materials: 'read_only',
    },
    granularPermissions: {
      daily_logs: ['submit_entries', 'edit_own_entries'],
      time_tracking: ['clock_in_out'],
      photos: ['upload_photos'],
      safety: ['submit_safety_observations'],
    },
  },
  {
    name: 'Crew Leader',
    description: 'Lead a specific crew or trade',
    scope: 'project',
    sortOrder: 3,
    toolPermissions: {
      daily_logs: 'standard',
      time_tracking: 'standard',
      equipment: 'standard',
      documents: 'read_only',
      photos: 'standard',
      schedule: 'read_only',
      punch_lists: 'standard',
      safety: 'standard',
      drone_flights: 'read_only',
      rfis: 'standard',
      materials: 'standard',
    },
    granularPermissions: {
      daily_logs: ['submit_entries', 'edit_own_entries', 'edit_crew_entries'],
      time_tracking: ['clock_in_out', 'manage_crew_time', 'approve_crew_timesheets'],
      equipment: ['request_equipment', 'log_equipment_use'],
      punch_lists: ['create_items', 'complete_items'],
      rfis: ['create_rfis'],
      materials: ['log_usage'],
    },
  },
  {
    name: 'Foreman',
    description: 'Site supervisors overseeing operations',
    scope: 'project',
    sortOrder: 4,
    toolPermissions: {
      daily_logs: 'admin',
      time_tracking: 'admin',
      equipment: 'admin',
      documents: 'standard',
      photos: 'admin',
      schedule: 'standard',
      punch_lists: 'admin',
      safety: 'admin',
      drone_flights: 'standard',
      rfis: 'admin',
      materials: 'admin',
    },
    granularPermissions: {
      documents: ['upload_documents', 'create_folders'],
      schedule: ['update_task_status'],
      drone_flights: ['request_flight', 'add_annotations'],
    },
  },
  {
    name: 'Architect/Engineer',
    description: 'Design professionals with document access',
    scope: 'project',
    sortOrder: 5,
    toolPermissions: {
      daily_logs: 'read_only',
      time_tracking: 'none',
      equipment: 'none',
      documents: 'standard',
      photos: 'read_only',
      schedule: 'read_only',
      punch_lists: 'standard',
      safety: 'none',
      drone_flights: 'read_only',
      rfis: 'standard',
      materials: 'none',
    },
    granularPermissions: {
      documents: ['upload_documents', 'create_revisions', 'manage_drawings'],
      punch_lists: ['create_items', 'add_comments'],
      rfis: ['respond_to_rfis'],
    },
  },
  {
    name: 'Developer',
    description: 'Real estate developers/clients (external)',
    scope: 'project',
    sortOrder: 6,
    toolPermissions: {
      daily_logs: 'read_only',
      time_tracking: 'none',
      equipment: 'none',
      documents: 'read_only',
      photos: 'read_only',
      schedule: 'read_only',
      punch_lists: 'read_only',
      safety: 'none',
      drone_flights: 'read_only',
      rfis: 'read_only',
      materials: 'none',
    },
    granularPermissions: {
      documents: ['download_documents'],
      punch_lists: ['add_comments'],
    },
  },
  {
    name: 'Project Manager',
    description: 'Full project access',
    scope: 'project',
    sortOrder: 7,
    toolPermissions: {
      daily_logs: 'admin',
      time_tracking: 'admin',
      equipment: 'admin',
      documents: 'admin',
      photos: 'admin',
      schedule: 'admin',
      punch_lists: 'admin',
      safety: 'admin',
      drone_flights: 'admin',
      rfis: 'admin',
      materials: 'admin',
    },
    granularPermissions: {},
  },
]

// Default Company Templates
const COMPANY_TEMPLATES = [
  {
    name: 'No Company Access',
    description: 'No access to company-level tools',
    scope: 'company',
    sortOrder: 0,
    toolPermissions: {
      directory: 'none',
      financials: 'none',
      reports: 'none',
      label_library: 'none',
      settings: 'none',
      user_management: 'none',
    },
    granularPermissions: {},
  },
  {
    name: 'Office Staff',
    description: 'Administrative and back-office tasks',
    scope: 'company',
    sortOrder: 1,
    toolPermissions: {
      directory: 'standard',
      financials: 'standard',
      reports: 'standard',
      label_library: 'read_only',
      settings: 'none',
      user_management: 'none',
    },
    granularPermissions: {
      directory: ['create_contacts', 'edit_contacts'],
      financials: ['sync_quickbooks', 'view_costs'],
    },
  },
  {
    name: 'Project Manager (Company)',
    description: 'Company-level access for project managers',
    scope: 'company',
    sortOrder: 2,
    toolPermissions: {
      directory: 'standard',
      financials: 'read_only',
      reports: 'standard',
      label_library: 'standard',
      settings: 'none',
      user_management: 'none',
    },
    granularPermissions: {
      financials: ['view_project_budgets', 'view_costs'],
      label_library: ['create_project_labels'],
    },
  },
  {
    name: 'Owner / Admin',
    description: 'Full system access - cannot be edited or deleted',
    scope: 'company',
    sortOrder: 99,
    isProtected: true,
    toolPermissions: {
      directory: 'admin',
      financials: 'admin',
      reports: 'admin',
      label_library: 'admin',
      settings: 'admin',
      user_management: 'admin',
    },
    granularPermissions: {},
  },
]

async function main() {
  console.log('Seeding permission templates...')

  // Seed project templates
  for (const template of PROJECT_TEMPLATES) {
    const existing = await prisma.permissionTemplate.findUnique({
      where: { name: template.name },
    })

    if (existing) {
      console.log(`  Updating project template: ${template.name}`)
      await prisma.permissionTemplate.update({
        where: { name: template.name },
        data: {
          description: template.description,
          scope: template.scope,
          sortOrder: template.sortOrder,
          toolPermissions: template.toolPermissions,
          granularPermissions: template.granularPermissions,
          isSystemDefault: true,
        },
      })
    } else {
      console.log(`  Creating project template: ${template.name}`)
      await prisma.permissionTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          scope: template.scope,
          sortOrder: template.sortOrder,
          toolPermissions: template.toolPermissions,
          granularPermissions: template.granularPermissions,
          isSystemDefault: true,
        },
      })
    }
  }

  // Seed company templates
  for (const template of COMPANY_TEMPLATES) {
    const existing = await prisma.permissionTemplate.findUnique({
      where: { name: template.name },
    })

    if (existing) {
      console.log(`  Updating company template: ${template.name}`)
      await prisma.permissionTemplate.update({
        where: { name: template.name },
        data: {
          description: template.description,
          scope: template.scope,
          sortOrder: template.sortOrder,
          toolPermissions: template.toolPermissions,
          granularPermissions: template.granularPermissions,
          isSystemDefault: true,
          isProtected: template.isProtected || false,
        },
      })
    } else {
      console.log(`  Creating company template: ${template.name}`)
      await prisma.permissionTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          scope: template.scope,
          sortOrder: template.sortOrder,
          toolPermissions: template.toolPermissions,
          granularPermissions: template.granularPermissions,
          isSystemDefault: true,
          isProtected: template.isProtected || false,
        },
      })
    }
  }

  console.log('Done seeding permission templates!')

  // Count templates
  const projectCount = await prisma.permissionTemplate.count({ where: { scope: 'project' } })
  const companyCount = await prisma.permissionTemplate.count({ where: { scope: 'company' } })
  console.log(`Total: ${projectCount} project templates, ${companyCount} company templates`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
