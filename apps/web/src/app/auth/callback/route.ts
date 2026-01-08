import { createServerSupabaseClient } from '@/lib/supabase-auth'
import { syncUserToPrisma } from '@/lib/auth-helpers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * OAuth callback handler
 *
 * This route handles the OAuth redirect from providers (Google, Apple).
 * It exchanges the authorization code for a session and creates/links
 * the Prisma user record.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    try {
      const supabase = await createServerSupabaseClient()

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('OAuth callback error:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_failed`)
      }

      if (data.user) {
        // Sync user to Prisma database
        // This creates or links the Prisma user record
        await syncUserToPrisma(
          data.user.id,
          data.user.email!,
          data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            data.user.email?.split('@')[0]
        )

        // Redirect to the dashboard or intended destination
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      console.error('OAuth callback exception:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }
  }

  // No code provided
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
