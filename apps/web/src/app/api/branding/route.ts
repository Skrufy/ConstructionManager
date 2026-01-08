import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import cache, { cacheTTL } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// Public branding endpoint - no auth required
// Used for login pages, favicon, etc.

export async function GET() {
  try {
    const cacheKey = 'public:branding'

    // Try cache first
    let branding = cache.get<{
      companyName: string
      companyLogo: string | null
      companyFavicon: string | null
    }>(cacheKey)

    if (!branding) {
      // Get company settings
      const settings = await prisma.companySettings.findFirst({
        select: {
          companyName: true,
          companyLogo: true,
          companyFavicon: true
        }
      })

      branding = {
        companyName: settings?.companyName ?? 'ConstructionPro',
        companyLogo: settings?.companyLogo ?? null,
        companyFavicon: settings?.companyFavicon ?? null
      }

      // Cache for 10 minutes
      cache.set(cacheKey, branding, {
        ttl: cacheTTL.settings,
        tags: ['settings', 'company-settings', 'branding']
      })
    }

    return NextResponse.json(branding)
  } catch (error) {
    console.error('Error fetching branding:', error)
    // Return defaults on error
    return NextResponse.json({
      companyName: 'ConstructionPro',
      companyLogo: null,
      companyFavicon: null
    })
  }
}
