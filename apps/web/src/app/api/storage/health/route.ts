import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { supabaseStorage } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'construction-files'

/**
 * GET /api/storage/health
 * Check if Supabase Storage is properly configured and accessible
 * Only accessible by admins
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication - admin only
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const checks: {
      name: string
      status: 'pass' | 'fail' | 'warn'
      message: string
      details?: Record<string, unknown>
    }[] = []

    // Check 1: Environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      checks.push({
        name: 'SUPABASE_URL',
        status: 'fail',
        message: 'Environment variable not set',
        details: { hint: 'Add SUPABASE_URL to your .env file' }
      })
    } else {
      checks.push({
        name: 'SUPABASE_URL',
        status: 'pass',
        message: 'Configured',
        details: { url: supabaseUrl.replace(/\/\/.*@/, '//***@') } // Mask credentials
      })
    }

    if (!serviceKey) {
      checks.push({
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        status: 'fail',
        message: 'Environment variable not set',
        details: { hint: 'Add SUPABASE_SERVICE_ROLE_KEY to your .env file (use service_role key, not anon)' }
      })
    } else {
      // Check if it looks like a service role key (starts with eyJ)
      const isJwt = serviceKey.startsWith('eyJ')
      checks.push({
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        status: isJwt ? 'pass' : 'warn',
        message: isJwt ? 'Configured (JWT format)' : 'Set but may be invalid format',
        details: { format: isJwt ? 'JWT' : 'Unknown', length: serviceKey.length }
      })
    }

    checks.push({
      name: 'SUPABASE_STORAGE_BUCKET',
      status: 'pass',
      message: `Using bucket: ${BUCKET_NAME}`,
      details: { bucket: BUCKET_NAME }
    })

    // Check 2: Try to list files in the bucket (verifies bucket exists and auth works)
    let bucketAccessible = false
    try {
      const { data, error } = await supabaseStorage.storage
        .from(BUCKET_NAME)
        .list('', { limit: 1 })

      if (error) {
        checks.push({
          name: 'Bucket Access',
          status: 'fail',
          message: `Cannot access bucket: ${error.message}`,
          details: {
            bucket: BUCKET_NAME,
            errorCode: (error as { statusCode?: string }).statusCode,
            hint: 'Check bucket name and RLS policies'
          }
        })
      } else {
        bucketAccessible = true
        checks.push({
          name: 'Bucket Access',
          status: 'pass',
          message: 'Bucket is accessible',
          details: { bucket: BUCKET_NAME, filesFound: data?.length || 0 }
        })
      }
    } catch (err) {
      checks.push({
        name: 'Bucket Access',
        status: 'fail',
        message: `Connection error: ${err instanceof Error ? err.message : 'Unknown'}`,
        details: { bucket: BUCKET_NAME }
      })
    }

    // Check 3: Try to create a signed URL (verifies URL generation works)
    if (bucketAccessible) {
      try {
        const testPath = `__health_check_${Date.now()}.txt`
        const { data, error } = await supabaseStorage.storage
          .from(BUCKET_NAME)
          .createSignedUrl(testPath, 60)

        if (error) {
          // This is expected if the file doesn't exist, but the URL generation should work
          if (error.message.includes('not found')) {
            checks.push({
              name: 'Signed URL Generation',
              status: 'pass',
              message: 'URL generation works (test file not found, as expected)',
              details: { bucket: BUCKET_NAME }
            })
          } else {
            checks.push({
              name: 'Signed URL Generation',
              status: 'warn',
              message: `URL generation issue: ${error.message}`,
              details: { bucket: BUCKET_NAME }
            })
          }
        } else if (data?.signedUrl) {
          checks.push({
            name: 'Signed URL Generation',
            status: 'pass',
            message: 'URL generation works',
            details: { bucket: BUCKET_NAME, urlFormat: 'valid' }
          })
        }
      } catch (err) {
        checks.push({
          name: 'Signed URL Generation',
          status: 'fail',
          message: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
          details: { bucket: BUCKET_NAME }
        })
      }
    }

    // Calculate overall health
    const failCount = checks.filter(c => c.status === 'fail').length
    const warnCount = checks.filter(c => c.status === 'warn').length
    const healthy = failCount === 0

    return NextResponse.json({
      healthy,
      status: failCount > 0 ? 'unhealthy' : warnCount > 0 ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      bucket: BUCKET_NAME,
      checks,
      summary: {
        total: checks.length,
        passed: checks.filter(c => c.status === 'pass').length,
        warnings: warnCount,
        failures: failCount
      }
    })
  } catch (error) {
    console.error('[StorageHealth] Error:', error)
    return NextResponse.json({
      healthy: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
