// Offline data management for Construction Management Platform
// Uses IndexedDB for local storage and background sync for data synchronization

const DB_NAME = 'ConstructionProOffline'
const DB_VERSION = 1

interface OfflineDB {
  db: IDBDatabase | null
  isReady: boolean
}

const state: OfflineDB = {
  db: null,
  isReady: false
}

// Store definitions
const STORES = {
  pendingDailyLogs: 'pendingDailyLogs',
  pendingTimeEntries: 'pendingTimeEntries',
  cachedProjects: 'cachedProjects',
  cachedLabels: 'cachedLabels',
  syncQueue: 'syncQueue',
  offlinePhotos: 'offlinePhotos',
}

// Initialize IndexedDB
export async function initOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (state.db && state.isReady) {
      resolve(state.db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      state.db = request.result
      state.isReady = true
      resolve(state.db)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Pending daily logs store
      if (!db.objectStoreNames.contains(STORES.pendingDailyLogs)) {
        const store = db.createObjectStore(STORES.pendingDailyLogs, { keyPath: 'id', autoIncrement: true })
        store.createIndex('projectId', 'projectId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Pending time entries store
      if (!db.objectStoreNames.contains(STORES.pendingTimeEntries)) {
        const store = db.createObjectStore(STORES.pendingTimeEntries, { keyPath: 'id', autoIncrement: true })
        store.createIndex('userId', 'userId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Cached projects store
      if (!db.objectStoreNames.contains(STORES.cachedProjects)) {
        db.createObjectStore(STORES.cachedProjects, { keyPath: 'id' })
      }

      // Cached labels store
      if (!db.objectStoreNames.contains(STORES.cachedLabels)) {
        const store = db.createObjectStore(STORES.cachedLabels, { keyPath: 'id' })
        store.createIndex('category', 'category', { unique: false })
      }

      // Sync queue store
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const store = db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('status', 'status', { unique: false })
      }

      // Offline photos store
      if (!db.objectStoreNames.contains(STORES.offlinePhotos)) {
        const store = db.createObjectStore(STORES.offlinePhotos, { keyPath: 'id', autoIncrement: true })
        store.createIndex('logId', 'logId', { unique: false })
      }
    }
  })
}

// Generic store operations
async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await initOfflineDB()
  const tx = db.transaction(storeName, mode)
  return tx.objectStore(storeName)
}

// Add item to store
async function addToStore<T>(storeName: string, data: T): Promise<IDBValidKey> {
  const store = await getStore(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const request = store.add(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Get all items from store
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName, 'readonly')
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Get item by key
async function getFromStore<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const store = await getStore(storeName, 'readonly')
  return new Promise((resolve, reject) => {
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Delete item from store
async function deleteFromStore(storeName: string, key: IDBValidKey): Promise<void> {
  const store = await getStore(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Put (upsert) item in store
async function putInStore<T>(storeName: string, data: T): Promise<IDBValidKey> {
  const store = await getStore(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const request = store.put(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Clear all items from store
async function clearStore(storeName: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ====================================
// Daily Logs Offline Operations
// ====================================

export interface OfflineDailyLog {
  id?: number
  projectId: string
  date: string
  entries: Array<{
    activityLabelId: string
    locationLabels: string[]
    statusLabelId?: string
    percentComplete?: number
    notes?: string
  }>
  materials: Array<{
    materialLabelId: string
    quantity: number
    unit?: string
    notes?: string
  }>
  issues: Array<{
    issueLabelId: string
    delayHours?: number
    description?: string
  }>
  visitors: Array<{
    visitorLabelId: string
    visitTime?: string
    result?: string
    notes?: string
  }>
  notes?: string
  weatherData?: string
  photos?: string[]
  createdAt: string
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed'
}

export async function saveDailyLogOffline(log: Omit<OfflineDailyLog, 'id'>): Promise<IDBValidKey> {
  const data = {
    ...log,
    syncStatus: 'pending' as const,
    createdAt: new Date().toISOString()
  }
  return addToStore(STORES.pendingDailyLogs, data)
}

export async function getPendingDailyLogs(): Promise<OfflineDailyLog[]> {
  return getAllFromStore<OfflineDailyLog>(STORES.pendingDailyLogs)
}

export async function removePendingDailyLog(id: number): Promise<void> {
  return deleteFromStore(STORES.pendingDailyLogs, id)
}

// ====================================
// Time Entries Offline Operations
// ====================================

export interface OfflineTimeEntry {
  id?: number
  projectId: string
  clockIn: string
  clockOut?: string
  gpsInLat?: number
  gpsInLng?: number
  gpsOutLat?: number
  gpsOutLng?: number
  notes?: string
  createdAt: string
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed'
  action: 'clockIn' | 'clockOut'
}

export async function saveTimeEntryOffline(entry: Omit<OfflineTimeEntry, 'id'>): Promise<IDBValidKey> {
  const data = {
    ...entry,
    syncStatus: 'pending' as const,
    createdAt: new Date().toISOString()
  }
  return addToStore(STORES.pendingTimeEntries, data)
}

export async function getPendingTimeEntries(): Promise<OfflineTimeEntry[]> {
  return getAllFromStore<OfflineTimeEntry>(STORES.pendingTimeEntries)
}

export async function removePendingTimeEntry(id: number): Promise<void> {
  return deleteFromStore(STORES.pendingTimeEntries, id)
}

// ====================================
// Project Cache Operations
// ====================================

export interface CachedProject {
  id: string
  name: string
  address?: string
  status: string
  cachedAt: string
}

export async function cacheProjects(projects: CachedProject[]): Promise<void> {
  await clearStore(STORES.cachedProjects)
  for (const project of projects) {
    await putInStore(STORES.cachedProjects, {
      ...project,
      cachedAt: new Date().toISOString()
    })
  }
}

export async function getCachedProjects(): Promise<CachedProject[]> {
  return getAllFromStore<CachedProject>(STORES.cachedProjects)
}

// ====================================
// Labels Cache Operations
// ====================================

export interface CachedLabel {
  id: string
  category: string
  name: string
  projectId?: string
  cachedAt: string
}

export async function cacheLabels(labels: CachedLabel[]): Promise<void> {
  await clearStore(STORES.cachedLabels)
  for (const label of labels) {
    await putInStore(STORES.cachedLabels, {
      ...label,
      cachedAt: new Date().toISOString()
    })
  }
}

export async function getCachedLabels(category?: string): Promise<CachedLabel[]> {
  const labels = await getAllFromStore<CachedLabel>(STORES.cachedLabels)
  if (category) {
    return labels.filter(l => l.category === category)
  }
  return labels
}

// ====================================
// Offline Photos Operations
// ====================================

export interface OfflinePhoto {
  id?: number
  logId?: number
  blob: Blob
  filename: string
  gpsLatitude?: number
  gpsLongitude?: number
  takenAt: string
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed'
}

export async function savePhotoOffline(photo: Omit<OfflinePhoto, 'id'>): Promise<IDBValidKey> {
  return addToStore(STORES.offlinePhotos, {
    ...photo,
    syncStatus: 'pending' as const,
    takenAt: new Date().toISOString()
  })
}

export async function getOfflinePhotos(logId?: number): Promise<OfflinePhoto[]> {
  const photos = await getAllFromStore<OfflinePhoto>(STORES.offlinePhotos)
  if (logId !== undefined) {
    return photos.filter(p => p.logId === logId)
  }
  return photos
}

export async function removeOfflinePhoto(id: number): Promise<void> {
  return deleteFromStore(STORES.offlinePhotos, id)
}

// ====================================
// Sync Status and Queue
// ====================================

export interface SyncQueueItem {
  id?: number
  type: 'dailyLog' | 'timeEntry' | 'photo'
  action: 'create' | 'update' | 'delete'
  data: unknown
  status: 'pending' | 'syncing' | 'failed'
  retryCount: number
  createdAt: string
  lastAttempt?: string
  error?: string
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<IDBValidKey> {
  return addToStore(STORES.syncQueue, {
    ...item,
    retryCount: 0,
    createdAt: new Date().toISOString()
  })
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getAllFromStore<SyncQueueItem>(STORES.syncQueue)
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<IDBValidKey> {
  return putInStore(STORES.syncQueue, item)
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  return deleteFromStore(STORES.syncQueue, id)
}

// ====================================
// Sync Status Helpers
// ====================================

export async function getPendingItemsCount(): Promise<{
  dailyLogs: number
  timeEntries: number
  photos: number
  total: number
}> {
  const [dailyLogs, timeEntries, photos] = await Promise.all([
    getPendingDailyLogs(),
    getPendingTimeEntries(),
    getOfflinePhotos()
  ])

  return {
    dailyLogs: dailyLogs.filter(l => l.syncStatus === 'pending').length,
    timeEntries: timeEntries.filter(e => e.syncStatus === 'pending').length,
    photos: photos.filter(p => p.syncStatus === 'pending').length,
    total: dailyLogs.length + timeEntries.length + photos.length
  }
}

// ====================================
// Service Worker Registration
// ====================================

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered:', registration.scope)

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('New version available')
          }
        })
      }
    })

    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

// Request background sync
export async function requestSync(tag: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    console.log('Background Sync not supported')
    return
  }

  const registration = await navigator.serviceWorker.ready
  await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag)
}

// Check online status
export function isOnline(): boolean {
  return navigator.onLine
}

// Listen for online/offline events
export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

// ====================================
// Conflict Resolution
// ====================================

export type ConflictResolutionStrategy = 'server-wins' | 'client-wins' | 'merge' | 'manual'

export interface ConflictInfo<T> {
  localData: T
  serverData: T
  localTimestamp: string
  serverTimestamp: string
}

export interface ConflictResolution<T> {
  resolved: boolean
  data?: T
  strategy: ConflictResolutionStrategy
}

/**
 * Detect if there's a conflict between local and server data
 */
export function detectConflict<T extends { updatedAt?: string }>(
  localData: T,
  serverData: T,
  localTimestamp: string
): boolean {
  if (!serverData.updatedAt) return false
  const serverUpdated = new Date(serverData.updatedAt).getTime()
  const localCreated = new Date(localTimestamp).getTime()
  return serverUpdated > localCreated
}

/**
 * Resolve conflict based on strategy
 */
export function resolveConflict<T extends Record<string, unknown>>(
  conflict: ConflictInfo<T>,
  strategy: ConflictResolutionStrategy = 'server-wins'
): ConflictResolution<T> {
  switch (strategy) {
    case 'server-wins':
      return { resolved: true, data: conflict.serverData, strategy }

    case 'client-wins':
      return { resolved: true, data: conflict.localData, strategy }

    case 'merge':
      // Merge strategy: combine fields, prefer newer values for each field
      const merged: Record<string, unknown> = { ...conflict.serverData }
      const localTime = new Date(conflict.localTimestamp).getTime()
      const serverTime = new Date(conflict.serverTimestamp).getTime()

      for (const key of Object.keys(conflict.localData)) {
        // If local is newer, use local value for this field
        if (localTime > serverTime) {
          merged[key] = conflict.localData[key]
        }
      }
      return { resolved: true, data: merged as T, strategy }

    case 'manual':
      // Return unresolved for manual intervention
      return { resolved: false, strategy }

    default:
      return { resolved: true, data: conflict.serverData, strategy: 'server-wins' }
  }
}

// ====================================
// Exponential Backoff Retry
// ====================================

export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterPercent: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterPercent: 0.2,
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Calculate exponential delay
  let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt)

  // Cap at max delay
  delay = Math.min(delay, config.maxDelayMs)

  // Add jitter
  const jitter = delay * config.jitterPercent * (Math.random() * 2 - 1)
  delay = delay + jitter

  return Math.floor(delay)
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | null = null

  for (let attempt = 0; attempt < fullConfig.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error
      }

      // Check if we've exceeded max retries
      if (attempt >= fullConfig.maxRetries - 1) {
        throw error
      }

      // Wait before retry
      const delay = calculateBackoffDelay(attempt, fullConfig)
      console.log(`Retry attempt ${attempt + 1}/${fullConfig.maxRetries} in ${delay}ms`)
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('offline')
    ) {
      return true
    }

    // Rate limiting
    if (message.includes('429') || message.includes('rate limit')) {
      return true
    }

    // Server errors (5xx)
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true
    }
  }

  return false
}

// ====================================
// Enhanced Sync Queue Processing
// ====================================

export interface SyncResult {
  success: boolean
  itemId: number
  error?: string
  conflict?: boolean
  conflictData?: unknown
}

/**
 * Process sync queue with conflict resolution and retry
 */
export async function processSyncQueue(
  conflictStrategy: ConflictResolutionStrategy = 'server-wins'
): Promise<SyncResult[]> {
  const queue = await getSyncQueue()
  const results: SyncResult[] = []

  // Sort by creation time (FIFO)
  queue.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const item of queue) {
    if (item.status === 'syncing') continue // Skip items already being synced
    if (!item.id) continue

    // Check if max retries exceeded
    if (item.retryCount >= DEFAULT_RETRY_CONFIG.maxRetries) {
      results.push({
        success: false,
        itemId: item.id,
        error: 'Max retries exceeded',
      })
      continue
    }

    // Update status to syncing
    await updateSyncQueueItem({
      ...item,
      status: 'syncing',
      lastAttempt: new Date().toISOString(),
    })

    try {
      const result = await syncItem(item, conflictStrategy)
      results.push(result)

      if (result.success) {
        // Remove from queue on success
        await removeSyncQueueItem(item.id)
      } else {
        // Update retry count and status
        await updateSyncQueueItem({
          ...item,
          status: 'failed',
          retryCount: item.retryCount + 1,
          error: result.error,
          lastAttempt: new Date().toISOString(),
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.push({
        success: false,
        itemId: item.id,
        error: errorMessage,
      })

      await updateSyncQueueItem({
        ...item,
        status: 'failed',
        retryCount: item.retryCount + 1,
        error: errorMessage,
        lastAttempt: new Date().toISOString(),
      })
    }
  }

  return results
}

/**
 * Sync a single item
 */
async function syncItem(
  item: SyncQueueItem,
  conflictStrategy: ConflictResolutionStrategy
): Promise<SyncResult> {
  if (!item.id) {
    return { success: false, itemId: 0, error: 'Invalid item ID' }
  }

  const itemId = item.id // Capture for closure - TypeScript knows it's a number after the check

  return withRetry(async () => {
    const endpoint = getSyncEndpoint(item.type, item.action)
    const method = item.action === 'delete' ? 'DELETE' : item.action === 'create' ? 'POST' : 'PUT'

    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: item.action !== 'delete' ? JSON.stringify(item.data) : undefined,
    })

    if (response.status === 409) {
      // Conflict detected
      const serverData = await response.json()
      const conflict: ConflictInfo<typeof item.data & Record<string, unknown>> = {
        localData: item.data as typeof item.data & Record<string, unknown>,
        serverData: serverData.data,
        localTimestamp: item.createdAt,
        serverTimestamp: serverData.updatedAt,
      }

      const resolution = resolveConflict(conflict, conflictStrategy)

      if (!resolution.resolved) {
        return {
          success: false,
          itemId,
          conflict: true,
          conflictData: conflict,
          error: 'Manual conflict resolution required',
        }
      }

      // Retry with resolved data
      const retryResponse = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolution.data),
      })

      if (!retryResponse.ok) {
        throw new Error(`Sync failed after conflict resolution: ${retryResponse.status}`)
      }

      return { success: true, itemId }
    }

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`)
    }

    return { success: true, itemId }
  })
}

/**
 * Get the API endpoint for a sync item
 */
function getSyncEndpoint(type: string, action: string): string {
  const baseUrl = '/api'
  const endpoints: Record<string, string> = {
    dailyLog: `${baseUrl}/daily-logs`,
    timeEntry: `${baseUrl}/time-entries`,
    photo: `${baseUrl}/upload`,
  }

  return endpoints[type] || `${baseUrl}/${type}`
}

/**
 * Start automatic sync when online
 */
export function startAutoSync(intervalMs: number = 30000): () => void {
  let syncInterval: NodeJS.Timeout | null = null

  const sync = async () => {
    if (!isOnline()) return

    try {
      const count = await getPendingItemsCount()
      if (count.total > 0) {
        console.log(`Auto-syncing ${count.total} pending items...`)
        await processSyncQueue()
      }
    } catch (error) {
      console.error('Auto-sync failed:', error)
    }
  }

  // Start periodic sync
  syncInterval = setInterval(sync, intervalMs)

  // Sync immediately when coming online
  const handleOnline = () => {
    console.log('Connection restored, syncing...')
    sync()
  }
  window.addEventListener('online', handleOnline)

  // Return cleanup function
  return () => {
    if (syncInterval) clearInterval(syncInterval)
    window.removeEventListener('online', handleOnline)
  }
}

/**
 * Get sync status summary
 */
export async function getSyncStatus(): Promise<{
  pending: number
  syncing: number
  failed: number
  lastSync?: string
}> {
  const queue = await getSyncQueue()

  return {
    pending: queue.filter(i => i.status === 'pending').length,
    syncing: queue.filter(i => i.status === 'syncing').length,
    failed: queue.filter(i => i.status === 'failed').length,
    lastSync: queue
      .filter(i => i.lastAttempt)
      .sort((a, b) => new Date(b.lastAttempt!).getTime() - new Date(a.lastAttempt!).getTime())[0]
      ?.lastAttempt,
  }
}
