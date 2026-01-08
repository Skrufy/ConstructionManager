import { NextRequest, NextResponse } from 'next/server'
import { runFullSync } from '@/lib/services/dronedeploy-sync'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint to sync DroneDeploy data
 *
 * This endpoint should be called periodically (e.g., daily) to sync
 * new exports from DroneDeploy to the local database.
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/dronedeploy-sync",
 *     "schedule": "0 6 * * *"  // 6 AM daily
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel adds this header for cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // In production, require the cron secret
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Check if DroneDeploy is configured
    if (!process.env.DRONEDEPLOY_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'DroneDeploy API key not configured',
        skipped: true,
      })
    }

    // Run the sync
    const result = await runFullSync()

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Sync completed: ${result.plansSynced} plans, ${result.exportsCreated} new exports`
        : 'Sync failed',
      result: {
        plansSynced: result.plansSynced,
        exportsCreated: result.exportsCreated,
        errors: result.errors,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('DroneDeploy cron sync failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
