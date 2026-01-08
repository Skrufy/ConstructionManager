import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema for mobile module visibility
const mobileModuleVisibilitySchema = z.object({
  projectsVisible: z.boolean().optional(),
  timeTrackingVisible: z.boolean().optional(),
  dailyLogsVisible: z.boolean().optional(),
  tasksVisible: z.boolean().optional(),
  schedulingVisible: z.boolean().optional(),
  drawingsVisible: z.boolean().optional(),
  documentsVisible: z.boolean().optional(),
  equipmentVisible: z.boolean().optional(),
  safetyVisible: z.boolean().optional(),
  financialsVisible: z.boolean().optional(),
  reportsVisible: z.boolean().optional(),
  analyticsVisible: z.boolean().optional(),
  subcontractorsVisible: z.boolean().optional(),
  certificationsVisible: z.boolean().optional(),
  approvalsVisible: z.boolean().optional(),
  warningsVisible: z.boolean().optional(),
  droneDeployVisible: z.boolean().optional(),
  clientsVisible: z.boolean().optional(),
  materialsVisible: z.boolean().optional(),
}).optional()

// Schema for user preferences - all fields optional for partial updates
const preferencesSchema = z.object({
  // Display preferences
  theme: z.enum(['light', 'dark', 'system']).optional(),
  sidebarCollapsed: z.boolean().optional(),
  dashboardLayout: z.record(z.unknown()).nullable().optional(),
  defaultProjectId: z.string().nullable().optional(),
  sidebarOrder: z.array(z.string()).nullable().optional(),

  // Notification preferences
  emailDailyDigest: z.boolean().optional(),
  emailApprovals: z.boolean().optional(),
  emailMentions: z.boolean().optional(),
  emailCertExpiry: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),

  // Display settings
  itemsPerPage: z.number().int().min(10).max(100).optional(),
  showCompletedTasks: z.boolean().optional(),
  defaultView: z.enum(['list', 'grid', 'calendar']).optional(),

  // Mobile-specific settings
  mobileModuleVisibility: mobileModuleVisibilitySchema.nullable().optional(),
})

// GET /api/users/me/preferences - Get current user preferences
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user: authUser } = authResult

    console.log('[Preferences GET] Fetching for user:', authUser.id)

    // Get or create preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: authUser.id },
    })

    // If no preferences exist, create default preferences
    if (!preferences) {
      console.log('[Preferences GET] No preferences found, creating defaults')
      preferences = await prisma.userPreferences.create({
        data: {
          userId: authUser.id,
        },
      })
    }

    console.log('[Preferences GET] mobileModuleVisibility from DB:', preferences.mobileModuleVisibility)

    return NextResponse.json({
      preferences: {
        theme: preferences.theme,
        sidebarCollapsed: preferences.sidebarCollapsed,
        dashboardLayout: preferences.dashboardLayout,
        defaultProjectId: preferences.defaultProjectId,
        sidebarOrder: preferences.sidebarOrder,
        emailDailyDigest: preferences.emailDailyDigest,
        emailApprovals: preferences.emailApprovals,
        emailMentions: preferences.emailMentions,
        emailCertExpiry: preferences.emailCertExpiry,
        pushEnabled: preferences.pushEnabled,
        itemsPerPage: preferences.itemsPerPage,
        showCompletedTasks: preferences.showCompletedTasks,
        defaultView: preferences.defaultView,
        mobileModuleVisibility: preferences.mobileModuleVisibility,
      },
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/users/me/preferences - Update user preferences
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user: authUser } = authResult

    const body = await request.json()

    // Debug logging
    console.log('[Preferences PATCH] Received body:', JSON.stringify(body, null, 2))
    console.log('[Preferences PATCH] mobileModuleVisibility in body:', body.mobileModuleVisibility ? 'present' : 'missing')

    const validation = preferencesSchema.safeParse(body)

    if (!validation.success) {
      console.log('[Preferences PATCH] Validation failed:', validation.error.flatten())
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.flatten(),
      }, { status: 400 })
    }

    const validatedData = validation.data
    console.log('[Preferences PATCH] Validated updateData:', JSON.stringify(validatedData, null, 2))

    // Transform null JSON values to Prisma.DbNull for proper handling
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(validatedData)) {
      if (value === null && ['dashboardLayout', 'sidebarOrder', 'mobileModuleVisibility'].includes(key)) {
        updateData[key] = Prisma.DbNull
      } else if (value !== undefined) {
        updateData[key] = value
      }
    }

    // Upsert preferences (create if doesn't exist, update if does)
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: authUser.id },
      create: {
        userId: authUser.id,
        ...updateData,
      } as Prisma.UserPreferencesUncheckedCreateInput,
      update: updateData as Prisma.UserPreferencesUncheckedUpdateInput,
    })

    console.log('[Preferences PATCH] Saved preferences.mobileModuleVisibility:', preferences.mobileModuleVisibility)

    return NextResponse.json({
      preferences: {
        theme: preferences.theme,
        sidebarCollapsed: preferences.sidebarCollapsed,
        dashboardLayout: preferences.dashboardLayout,
        defaultProjectId: preferences.defaultProjectId,
        sidebarOrder: preferences.sidebarOrder,
        emailDailyDigest: preferences.emailDailyDigest,
        emailApprovals: preferences.emailApprovals,
        emailMentions: preferences.emailMentions,
        emailCertExpiry: preferences.emailCertExpiry,
        pushEnabled: preferences.pushEnabled,
        itemsPerPage: preferences.itemsPerPage,
        showCompletedTasks: preferences.showCompletedTasks,
        defaultView: preferences.defaultView,
        mobileModuleVisibility: preferences.mobileModuleVisibility,
      },
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
