'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react'
import {
  isOnline,
  onOnlineStatusChange,
  getPendingItemsCount,
  requestSync
} from '@/lib/offline'

interface PendingCounts {
  dailyLogs: number
  timeEntries: number
  photos: number
  total: number
}

export function OfflineIndicator() {
  const [mounted, setMounted] = useState(false)
  const [online, setOnline] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({
    dailyLogs: 0,
    timeEntries: 0,
    photos: 0,
    total: 0
  })
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  useEffect(() => {
    setMounted(true)
    setOnline(isOnline())

    const unsubscribe = onOnlineStatusChange((isOnline) => {
      setOnline(isOnline)
      if (isOnline) {
        // Trigger sync when coming back online
        handleSync()
      }
    })

    // Check pending items
    checkPendingItems()

    // Listen for sync complete messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          checkPendingItems()
          setLastSynced(new Date())
        }
      })
    }

    return unsubscribe
  }, [])

  async function checkPendingItems() {
    try {
      const counts = await getPendingItemsCount()
      setPendingCounts(counts)
    } catch (error) {
      console.error('Failed to get pending items:', error)
    }
  }

  async function handleSync() {
    if (!online || syncing) return

    setSyncing(true)
    try {
      await requestSync('sync-daily-logs')
      await requestSync('sync-time-entries')
      await checkPendingItems()
      setLastSynced(new Date())
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  // Don't render until mounted to avoid hydration issues
  // Don't show if online and no pending items
  if (!mounted || (online && pendingCounts.total === 0)) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        {/* Main indicator button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-colors ${
            online
              ? pendingCounts.total > 0
                ? 'bg-yellow-500 text-white'
                : 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {syncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : online ? (
            pendingCounts.total > 0 ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Wifi className="h-4 w-4" />
            )
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {syncing
              ? 'Syncing...'
              : online
              ? pendingCounts.total > 0
                ? `${pendingCounts.total} pending`
                : 'Online'
              : 'Offline'}
          </span>
        </button>

        {/* Details panel */}
        {showDetails && (
          <div className="absolute bottom-full right-0 mb-2 w-72 bg-white rounded-lg shadow-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sync Status</h3>
              <span
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {online ? (
                  <>
                    <Check className="h-3 w-3" /> Online
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" /> Offline
                  </>
                )}
              </span>
            </div>

            {pendingCounts.total > 0 ? (
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600 mb-2">Pending items to sync:</p>
                {pendingCounts.dailyLogs > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Daily Logs</span>
                    <span className="font-medium">{pendingCounts.dailyLogs}</span>
                  </div>
                )}
                {pendingCounts.timeEntries > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Time Entries</span>
                    <span className="font-medium">{pendingCounts.timeEntries}</span>
                  </div>
                )}
                {pendingCounts.photos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Photos</span>
                    <span className="font-medium">{pendingCounts.photos}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-4">All data is synced!</p>
            )}

            {lastSynced && (
              <p className="text-xs text-gray-500 mb-3">
                Last synced: {lastSynced.toLocaleTimeString()}
              </p>
            )}

            {online && pendingCounts.total > 0 && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync Now
                  </>
                )}
              </button>
            )}

            {!online && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  You're offline. Data will sync automatically when you're back online.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
