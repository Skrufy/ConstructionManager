import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Build ID is set at build time via environment variable
// Falls back to a timestamp-based ID if not set
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ||
                 process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
                 process.env.BUILD_TIME ||
                 'dev'

export async function GET() {
  return NextResponse.json({
    buildId: BUILD_ID,
    timestamp: new Date().toISOString()
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  })
}
