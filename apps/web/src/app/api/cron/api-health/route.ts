import { NextResponse } from 'next/server'
import { runHealthCheck } from '@/lib/services/api-health-monitor'

export const dynamic = 'force-dynamic'

// GET /api/cron/api-health - Run API health check (called by Vercel Cron)
export async function GET(request: Request) {
  try {
    // Verify cron secret for Vercel Cron jobs
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run health checks
    const results = await runHealthCheck()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error) {
    console.error('API health check error:', error)
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    )
  }
}
