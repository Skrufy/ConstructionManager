'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, X } from 'lucide-react'

// Check interval: 5 minutes
const CHECK_INTERVAL = 5 * 60 * 1000

// Storage key for current version
const VERSION_KEY = 'app-build-id'

// Skip entire component in development - buildId changes on every compile
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

export function VersionCheck() {
  // CRITICAL: Return null immediately in development to prevent any side effects
  // This must be before any hooks to avoid hydration issues, so we use a workaround
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const checkForUpdate = useCallback(async () => {
    // Skip in development mode completely
    if (IS_DEVELOPMENT) return

    try {
      // Fetch the version endpoint with cache-busting
      const response = await fetch(`/api/version?t=${Date.now()}`, {
        cache: 'no-store'
      })

      if (!response.ok) return

      const data = await response.json()
      const serverVersion = data.buildId

      if (!serverVersion) return

      // Get stored version
      const storedVersion = localStorage.getItem(VERSION_KEY)

      if (!storedVersion) {
        // First visit - store current version
        localStorage.setItem(VERSION_KEY, serverVersion)
        return
      }

      // Check if version changed
      if (storedVersion !== serverVersion && !dismissed) {
        setShowUpdateBanner(true)
      }
    } catch (error) {
      // Silent fail - don't bother user if check fails
      console.debug('[VersionCheck] Check failed:', error)
    }
  }, [dismissed])

  useEffect(() => {
    // CRITICAL: Skip all version checking in development mode
    if (IS_DEVELOPMENT) return

    // Initial check after a short delay (let page load first)
    const initialTimeout = setTimeout(checkForUpdate, 3000)

    // Periodic checks
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL)

    // Also check when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkForUpdate])

  const handleRefresh = () => {
    // Update stored version before refresh
    fetch(`/api/version?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.buildId) {
          localStorage.setItem(VERSION_KEY, data.buildId)
        }
      })
      .finally(() => {
        window.location.reload()
      })
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowUpdateBanner(false)
  }

  // Never render anything in development mode
  if (IS_DEVELOPMENT) return null

  if (!showUpdateBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 animate-slide-up">
      <div className="bg-blue-600 text-white rounded-xl shadow-lg p-4 flex items-center gap-3">
        <RefreshCw className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">New version available</p>
          <p className="text-blue-100 text-xs">Refresh to get the latest features</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors min-h-[44px]"
          >
            Refresh
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-blue-500 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
