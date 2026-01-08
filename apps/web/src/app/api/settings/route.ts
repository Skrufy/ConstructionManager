import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import cache, { cacheTTL, cacheKeys } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// Validation schemas
const CompanySettingsSchema = z.object({
  companyName: z.string().min(1).max(100).optional(),
  companyLogo: z.string().nullable().optional(),
  companyFavicon: z.string().nullable().optional(),
  timezone: z.string().optional(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MXN']).optional(),

  // Module toggles
  moduleProjects: z.boolean().optional(),
  moduleDailyLogs: z.boolean().optional(),
  moduleTimeTracking: z.boolean().optional(),
  moduleTasks: z.boolean().optional(),
  moduleScheduling: z.boolean().optional(),
  moduleEquipment: z.boolean().optional(),
  moduleDocuments: z.boolean().optional(),
  moduleDrawings: z.boolean().optional(),
  moduleSafety: z.boolean().optional(),
  moduleFinancials: z.boolean().optional(),
  moduleReports: z.boolean().optional(),
  moduleAnalytics: z.boolean().optional(),
  moduleSubcontractors: z.boolean().optional(),
  moduleCertifications: z.boolean().optional(),
  moduleDroneDeploy: z.boolean().optional(),
  moduleApprovals: z.boolean().optional(),
  moduleWarnings: z.boolean().optional(),
  moduleClients: z.boolean().optional(),
  moduleMaterials: z.boolean().optional(),

  // Legacy role-based access overrides (backwards compatibility)
  allowFieldWorkerSafety: z.boolean().optional(),
  allowFieldWorkerScheduling: z.boolean().optional(),
  fieldWorkerDailyLogAccess: z.enum(['ALL', 'ASSIGNED_PROJECTS', 'OWN_ONLY']).optional(),

  // Role-based module visibility overrides (JSON object)
  // Structure: { "ROLE_NAME": { "moduleKey": boolean, ... }, ... }
  roleModuleOverrides: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),

  // Role-based data access settings (JSON object)
  // Structure: { "ROLE_NAME": { "dailyLogAccess": "ALL"|"ASSIGNED_PROJECTS"|"OWN_ONLY", ... }, ... }
  roleDataAccess: z.record(z.string(), z.object({
    dailyLogAccess: z.enum(['ALL', 'ASSIGNED_PROJECTS', 'OWN_ONLY']).optional(),
  })).optional(),

  // Feature settings
  requireGpsClockIn: z.boolean().optional(),
  requirePhotoDaily: z.boolean().optional(),
  autoApproveTimesheet: z.boolean().optional(),
  dailyLogReminders: z.boolean().optional(),
  certExpiryAlertDays: z.number().int().min(1).max(365).optional(),
  maxFileUploadMB: z.number().int().min(1).max(500).optional(),
  autoDeleteDocuments: z.boolean().optional(),
  autoDeleteDocumentsYears: z.number().int().min(1).max(10).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  activitiesEnabled: z.boolean().optional(),
  dailyLogApprovalRequired: z.boolean().optional(),
  hideBuildingInfo: z.boolean().optional(),
}).strict()

const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  sidebarCollapsed: z.boolean().optional(),
  dashboardLayout: z.string().nullable().optional(),
  defaultProjectId: z.string().nullable().optional(),
  sidebarOrder: z.array(z.string()).nullable().optional(),
  emailDailyDigest: z.boolean().optional(),
  emailApprovals: z.boolean().optional(),
  emailMentions: z.boolean().optional(),
  emailCertExpiry: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  itemsPerPage: z.number().int().min(10).max(100).optional(),
  showCompletedTasks: z.boolean().optional(),
  defaultView: z.enum(['list', 'grid', 'calendar']).optional(),
}).strict()

const UpdateRequestSchema = z.object({
  type: z.enum(['company', 'user']),
  settings: z.record(z.unknown()),
})

// GET /api/settings - Get company settings and user preferences
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Try to get company settings from cache
    const companyCacheKey = cacheKeys.companySettings()
    let companySettings = cache.get<Awaited<ReturnType<typeof prisma.companySettings.findFirst>>>(companyCacheKey)

    if (!companySettings) {
      // Get or create company settings (singleton)
      companySettings = await prisma.companySettings.findFirst() ?? null
      if (!companySettings) {
        companySettings = await prisma.companySettings.create({
          data: {}
        })
      }
      // Cache for 10 minutes
      cache.set(companyCacheKey, companySettings, {
        ttl: cacheTTL.settings,
        tags: ['settings', 'company-settings']
      })
    }

    // Try to get user preferences from cache
    const userCacheKey = cacheKeys.userPreferences(user.id)
    let userPreferences = cache.get<Awaited<ReturnType<typeof prisma.userPreferences.findUnique>>>(userCacheKey)

    if (!userPreferences) {
      // Get or create user preferences
      userPreferences = await prisma.userPreferences.findUnique({
        where: { userId: user.id }
      }) ?? null
      if (!userPreferences) {
        userPreferences = await prisma.userPreferences.create({
          data: { userId: user.id }
        })
      }
      // Cache for 10 minutes
      cache.set(userCacheKey, userPreferences, {
        ttl: cacheTTL.settings,
        tags: ['settings', `user-settings:${user.id}`]
      })
    }

    return NextResponse.json({
      company: companySettings,
      user: userPreferences
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()

    // Validate request structure
    const requestParse = UpdateRequestSchema.safeParse(body)
    if (!requestParse.success) {
      return NextResponse.json({
        error: 'Invalid request format',
        details: requestParse.error.flatten()
      }, { status: 400 })
    }

    const { type, settings } = requestParse.data

    if (type === 'company') {
      // Only admins can update company settings
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only administrators can update company settings' }, { status: 403 })
      }

      // Validate company settings
      const settingsParse = CompanySettingsSchema.safeParse(settings)
      if (!settingsParse.success) {
        return NextResponse.json({
          error: 'Invalid company settings',
          details: settingsParse.error.flatten()
        }, { status: 400 })
      }

      const validatedSettings = settingsParse.data

      // Get existing company settings
      let companySettings = await prisma.companySettings.findFirst()

      if (companySettings) {
        companySettings = await prisma.companySettings.update({
          where: { id: companySettings.id },
          data: validatedSettings
        })
      } else {
        companySettings = await prisma.companySettings.create({
          data: validatedSettings
        })
      }

      // Invalidate company settings cache
      cache.invalidateTag('company-settings')

      return NextResponse.json({
        success: true,
        company: companySettings,
        message: 'Company settings updated successfully'
      })
    }

    if (type === 'user') {
      // Validate user preferences
      const preferencesParse = UserPreferencesSchema.safeParse(settings)
      if (!preferencesParse.success) {
        return NextResponse.json({
          error: 'Invalid user preferences',
          details: preferencesParse.error.flatten()
        }, { status: 400 })
      }

      const validatedPreferences = preferencesParse.data

      // Convert null to undefined for Json fields (Prisma doesn't accept null directly)
      const updateData = {
        ...validatedPreferences,
        dashboardLayout: validatedPreferences.dashboardLayout === null
          ? undefined
          : validatedPreferences.dashboardLayout,
        sidebarOrder: validatedPreferences.sidebarOrder === null
          ? undefined
          : validatedPreferences.sidebarOrder,
      }

      // Update user preferences
      const userPreferences = await prisma.userPreferences.upsert({
        where: { userId: user.id },
        update: updateData,
        create: {
          userId: user.id,
          ...updateData
        }
      })

      // Invalidate user preferences cache
      cache.invalidateTag(`user-settings:${user.id}`)

      return NextResponse.json({
        success: true,
        user: userPreferences,
        message: 'Preferences updated successfully'
      })
    }

    return NextResponse.json({ error: 'Invalid settings type' }, { status: 400 })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
