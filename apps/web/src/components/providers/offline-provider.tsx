'use client'

import { useEffect } from 'react'
import { OfflineIndicator } from '@/components/ui/offline-indicator'
import { registerServiceWorker, initOfflineDB } from '@/lib/offline'

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize offline support
    async function init() {
      try {
        // Only register service worker in production
        // In development, the SW caches stale JS bundles causing webpack errors
        if (process.env.NODE_ENV === 'production') {
          await registerServiceWorker()
        } else {
          // Unregister any existing service worker in development
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations()
            for (const registration of registrations) {
              await registration.unregister()
              console.log('[Dev] Unregistered service worker to prevent caching issues')
            }
          }
        }

        // Initialize IndexedDB (still useful in development for testing)
        await initOfflineDB()

        console.log('Offline support initialized')
      } catch (error) {
        console.error('Failed to initialize offline support:', error)
      }
    }

    init()
  }, [])

  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  )
}
