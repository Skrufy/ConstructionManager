import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/integrations/openai - Get OpenAI integration status
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    // Check if API key is configured
    const apiKeyConfigured = !!process.env.OPENAI_API_KEY

    // Get OCR settings
    const orgSettings = await prisma.orgSettings.findFirst()
    const ocrEnabled = orgSettings?.ocrEnabled ?? true

    // Get usage stats (count of documents analyzed)
    const documentsAnalyzed = await prisma.documentMetadata.count()

    return NextResponse.json({
      configured: apiKeyConfigured,
      connected: apiKeyConfigured,
      lastSync: null,
      stats: {
        documentsAnalyzed,
        ocrEnabled: ocrEnabled ? 1 : 0,
      },
      features: {
        documentocr: apiKeyConfigured && ocrEnabled,
        metadataextraction: apiKeyConfigured && ocrEnabled,
        projectmatching: apiKeyConfigured && ocrEnabled,
      },
    })
  } catch (error) {
    console.error('[OpenAI Integration] GET Error:', error)
    return NextResponse.json({
      error: 'Failed to get integration status',
      code: 'STATUS_FETCH_FAILED',
    }, { status: 500 })
  }
}

// POST /api/integrations/openai - Test or configure OpenAI
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins can manage integrations
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'sync' || action === 'test') {
      // Test the API key by making a simple request
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({
          success: false,
          message: 'OpenAI API key not configured. Add OPENAI_API_KEY to your environment variables.',
          code: 'NOT_CONFIGURED',
        })
      }

      // Add timeout for the API test (10 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          return NextResponse.json({
            success: true,
            message: 'OpenAI API key verified successfully! Document OCR is ready to use.',
          })
        } else {
          const errorData = await response.json()
          return NextResponse.json({
            success: false,
            error: errorData.error?.message || 'API key validation failed',
            code: 'VALIDATION_FAILED',
          }, { status: 400 })
        }
      } catch (error) {
        clearTimeout(timeoutId)
        console.error('[OpenAI Integration] API test failed:', error)

        // Handle specific error types
        if (error instanceof Error) {
          // Timeout/abort errors
          if (error.name === 'AbortError') {
            return NextResponse.json({
              success: false,
              error: 'OpenAI API connection timed out after 10 seconds. Please try again.',
              code: 'TIMEOUT',
            }, { status: 504 })
          }

          const message = error.message.toLowerCase()

          // Network/connection errors
          if (message.includes('fetch') || message.includes('network') ||
              message.includes('econnrefused') || message.includes('enotfound')) {
            return NextResponse.json({
              success: false,
              error: 'Cannot reach OpenAI API. Please check your internet connection and firewall settings.',
              code: 'NETWORK_ERROR',
            }, { status: 503 })
          }
        }

        return NextResponse.json({
          success: false,
          error: 'Failed to connect to OpenAI API. Please verify your API key and network settings.',
          code: 'CONNECTION_FAILED',
        }, { status: 500 })
      }
    }

    if (action === 'toggle-ocr') {
      // Toggle OCR feature
      const orgSettings = await prisma.orgSettings.findFirst()
      const currentEnabled = orgSettings?.ocrEnabled ?? true

      if (orgSettings) {
        await prisma.orgSettings.update({
          where: { id: orgSettings.id },
          data: { ocrEnabled: !currentEnabled },
        })
      } else {
        await prisma.orgSettings.create({
          data: {
            ocrEnabled: !currentEnabled,
            ocrProvider: 'openai',
          },
        })
      }

      return NextResponse.json({
        success: true,
        message: `Document OCR ${!currentEnabled ? 'enabled' : 'disabled'}`,
        ocrEnabled: !currentEnabled,
      })
    }

    return NextResponse.json({ error: 'Invalid action', code: 'INVALID_ACTION' }, { status: 400 })
  } catch (error) {
    console.error('[OpenAI Integration] POST Error:', error)
    return NextResponse.json({
      error: 'Operation failed',
      code: 'OPERATION_FAILED',
    }, { status: 500 })
  }
}
