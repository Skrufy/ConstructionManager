import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { exchangeCodeForTokens, validateAndConsumeOAuthState } from '@/lib/quickbooks'

export const dynamic = 'force-dynamic'

/**
 * OAuth callback handler for QuickBooks
 *
 * After the user authorizes access in QuickBooks, they are redirected here
 * with an authorization code. We exchange this code for access/refresh tokens.
 *
 * Tokens are stored encrypted in the database automatically.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const realmId = searchParams.get('realmId')
    const error = searchParams.get('error')

    // Handle OAuth errors from QuickBooks
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Authorization was denied'
      return NextResponse.redirect(
        new URL(`/admin/integrations?error=${encodeURIComponent(errorDescription)}`, request.url)
      )
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/integrations?error=Missing%20authorization%20code', request.url)
      )
    }

    if (!state) {
      return NextResponse.redirect(
        new URL('/admin/integrations?error=Missing%20state%20parameter', request.url)
      )
    }

    // Validate OAuth state to prevent CSRF attacks
    const isValidState = await validateAndConsumeOAuthState(state, user.id)
    if (!isValidState) {
      return NextResponse.redirect(
        new URL('/admin/integrations?error=Invalid%20or%20expired%20authorization%20request', request.url)
      )
    }

    // Exchange code for tokens (tokens are automatically stored encrypted in database)
    await exchangeCodeForTokens(code, realmId || undefined)

    // Redirect to integrations page with success message
    return NextResponse.redirect(
      new URL('/admin/integrations?success=QuickBooks%20connected%20successfully!', request.url)
    )
  } catch (error) {
    console.error('QuickBooks callback error:', error)
    const message = error instanceof Error ? error.message : 'Connection failed'
    return NextResponse.redirect(
      new URL(`/admin/integrations?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
