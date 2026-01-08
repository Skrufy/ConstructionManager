'use client'

import { useEffect } from 'react'
import { useBranding } from '@/hooks/use-branding'

export function DynamicFavicon() {
  const { branding } = useBranding()

  useEffect(() => {
    if (branding.companyFavicon) {
      // Update favicon
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = branding.companyFavicon

      // Also update apple-touch-icon if present
      let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null
      if (appleLink) {
        appleLink.href = branding.companyFavicon
      }
    }
  }, [branding.companyFavicon])

  return null
}
