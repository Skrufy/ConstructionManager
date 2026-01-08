import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import {
  getSyncStatus,
  getSyncMappings,
  createSyncMapping,
  deleteSyncMapping,
  toggleSyncEnabled,
  syncExportsForMapping,
  runFullSync,
  fetchPlans,
  findProjectMatches,
  exportToDocument,
} from '@/lib/services/dronedeploy-sync'

export const dynamic = 'force-dynamic'

// GET /api/integrations/dronedeploy/sync - Get sync status and mappings
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'status') {
      const status = await getSyncStatus()
      return NextResponse.json(status)
    }

    if (action === 'mappings') {
      const mappings = await getSyncMappings()
      return NextResponse.json({ mappings })
    }

    if (action === 'plans') {
      // Fetch plans from DroneDeploy
      try {
        const plans = await fetchPlans()
        return NextResponse.json({ plans })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch plans'
        return NextResponse.json({ error: message, plans: [] }, { status: 200 })
      }
    }

    if (action === 'matches') {
      // Find potential matches between DD plans and local projects
      try {
        const plans = await fetchPlans()
        const matches = await findProjectMatches(plans)
        return NextResponse.json({ matches, plansCount: plans.length })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to find matches'
        return NextResponse.json({ error: message, matches: [] }, { status: 200 })
      }
    }

    // Default: return status
    const status = await getSyncStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error in DroneDeploy sync GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/integrations/dronedeploy/sync - Create mapping or trigger sync
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins and project managers can manage sync
    if (!['ADMIN', 'PROJECT_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    // Run full sync on all enabled mappings
    if (action === 'sync-all') {
      const result = await runFullSync()
      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Synced ${result.plansSynced} plans, created ${result.exportsCreated} exports`
          : 'Sync failed',
        result,
      })
    }

    // Sync a specific mapping
    if (action === 'sync-one' && body.syncId) {
      const result = await syncExportsForMapping(body.syncId)
      return NextResponse.json({
        success: result.errors.length === 0,
        message: `Created ${result.created} exports, updated ${result.updated}`,
        result,
      })
    }

    // Create a new mapping
    if (action === 'create-mapping') {
      const { projectId, planId, planName, metadata } = body

      if (!projectId || !planId) {
        return NextResponse.json(
          { error: 'projectId and planId are required' },
          { status: 400 }
        )
      }

      const mapping = await createSyncMapping(projectId, planId, planName, metadata)
      return NextResponse.json({
        success: true,
        message: 'Mapping created successfully',
        mapping,
      }, { status: 201 })
    }

    // Auto-create mappings from matches
    if (action === 'auto-map') {
      const { minConfidence = 0.8 } = body

      try {
        const plans = await fetchPlans()
        const matches = await findProjectMatches(plans)

        // Filter by confidence and remove duplicates (prefer highest confidence)
        const bestMatches = new Map<string, typeof matches[0]>()
        for (const match of matches) {
          if (match.confidence >= minConfidence) {
            const existing = bestMatches.get(match.planId)
            if (!existing || match.confidence > existing.confidence) {
              bestMatches.set(match.planId, match)
            }
          }
        }

        const created: string[] = []
        for (const match of bestMatches.values()) {
          await createSyncMapping(match.projectId, match.planId, match.planName)
          created.push(match.planName)
        }

        return NextResponse.json({
          success: true,
          message: `Created ${created.length} mappings`,
          mappings: created,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to auto-map'
        return NextResponse.json({ error: message }, { status: 500 })
      }
    }

    // Export to document
    if (action === 'export-to-document' && body.exportId) {
      const result = await exportToDocument(body.exportId, user.id)
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Export added to project documents',
          fileId: result.fileId,
        })
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in DroneDeploy sync POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/integrations/dronedeploy/sync - Update mapping
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!['ADMIN', 'PROJECT_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { syncId, enabled } = body

    if (!syncId) {
      return NextResponse.json({ error: 'syncId is required' }, { status: 400 })
    }

    if (typeof enabled === 'boolean') {
      const updated = await toggleSyncEnabled(syncId, enabled)
      return NextResponse.json({
        success: true,
        message: enabled ? 'Sync enabled' : 'Sync disabled',
        mapping: updated,
      })
    }

    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  } catch (error) {
    console.error('Error in DroneDeploy sync PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/integrations/dronedeploy/sync - Delete mapping
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!['ADMIN', 'PROJECT_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const syncId = searchParams.get('syncId')

    if (!syncId) {
      return NextResponse.json({ error: 'syncId is required' }, { status: 400 })
    }

    await deleteSyncMapping(syncId)
    return NextResponse.json({
      success: true,
      message: 'Mapping deleted successfully',
    })
  } catch (error) {
    console.error('Error in DroneDeploy sync DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
