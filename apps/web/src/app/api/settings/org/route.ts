import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { getOrgSettings, updateOrgSettings } from '@/lib/settings/org-settings'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const UpdateOrgSettingsSchema = z.object({
  ocrEnabled: z.boolean().optional(),
  ocrProvider: z.enum(['openai', 'google', 'none']).optional()
}).strict()

// GET /api/settings/org - Get organization settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const settings = await getOrgSettings()

    return NextResponse.json({
      success: true,
      settings: {
        ocrEnabled: settings.ocrEnabled,
        ocrProvider: settings.ocrProvider,
        updatedAt: settings.updatedAt
      }
    })
  } catch (error) {
    console.error('[OrgSettings] Error fetching:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT /api/settings/org - Update organization settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins can update org settings
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can update organization settings' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate request
    const parsed = UpdateOrgSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Invalid settings data',
        details: parsed.error.flatten()
      }, { status: 400 })
    }

    // Update settings
    const updated = await updateOrgSettings(parsed.data, user.id)

    return NextResponse.json({
      success: true,
      settings: {
        ocrEnabled: updated.ocrEnabled,
        ocrProvider: updated.ocrProvider,
        updatedAt: updated.updatedAt
      },
      message: 'Organization settings updated successfully'
    })
  } catch (error) {
    console.error('[OrgSettings] Error updating:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
