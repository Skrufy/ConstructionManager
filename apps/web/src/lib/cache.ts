// ============================================
// In-Memory Caching Layer
// ============================================
// For production, replace with Redis or similar

interface CacheEntry<T> {
  data: T
  expiresAt: number
  tags: string[]
}

class CacheStore {
  private store = new Map<string, CacheEntry<unknown>>()
  private tagIndex = new Map<string, Set<string>>() // tag -> keys

  // Default TTL: 5 minutes
  private defaultTTL = 5 * 60 * 1000

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined
    if (!entry) return null

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, data: T, options?: { ttl?: number; tags?: string[] }): void {
    const ttl = options?.ttl ?? this.defaultTTL
    const tags = options?.tags ?? []
    const expiresAt = Date.now() + ttl

    // Clean up old entry if exists
    this.delete(key)

    // Store the entry
    this.store.set(key, { data, expiresAt, tags })

    // Update tag index
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      this.tagIndex.get(tag)!.add(key)
    }
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const entry = this.store.get(key)
    if (!entry) return false

    // Remove from tag index
    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(key)
    }

    return this.store.delete(key)
  }

  /**
   * Invalidate all entries with a specific tag
   */
  invalidateTag(tag: string): number {
    const keys = this.tagIndex.get(tag)
    if (!keys) return 0

    let count = 0
    for (const key of keys) {
      if (this.delete(key)) count++
    }

    this.tagIndex.delete(tag)
    return count
  }

  /**
   * Invalidate multiple tags
   */
  invalidateTags(tags: string[]): number {
    let count = 0
    for (const tag of tags) {
      count += this.invalidateTag(tag)
    }
    return count
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear()
    this.tagIndex.clear()
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; tags: number } {
    return {
      size: this.store.size,
      tags: this.tagIndex.size,
    }
  }
}

// Singleton instance
const cache = new CacheStore()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of cache['store'].entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key)
    }
  }
}, 60000) // Every minute

export default cache

// ============================================
// Cache Helper Functions
// ============================================

/**
 * Cache key generators for common entities
 */
export const cacheKeys = {
  // Projects
  project: (id: string) => `project:${id}`,
  projectList: (filters?: Record<string, string>) =>
    `projects:${JSON.stringify(filters || {})}`,
  projectStats: (id: string) => `project:${id}:stats`,

  // Users
  user: (id: string) => `user:${id}`,
  userList: () => 'users:all',

  // Daily Logs
  dailyLog: (id: string) => `dailylog:${id}`,
  dailyLogList: (projectId?: string, date?: string) =>
    `dailylogs:${projectId || 'all'}:${date || 'all'}`,

  // Time Entries
  timeEntry: (id: string) => `timeentry:${id}`,
  timeEntryList: (userId?: string, projectId?: string) =>
    `timeentries:${userId || 'all'}:${projectId || 'all'}`,

  // Equipment
  equipment: (id: string) => `equipment:${id}`,
  equipmentList: () => 'equipment:all',
  equipmentStats: () => 'equipment:stats',

  // Documents
  document: (id: string) => `document:${id}`,
  documentList: (projectId?: string) => `documents:${projectId || 'all'}`,

  // Analytics
  analytics: (type: string, projectId?: string) =>
    `analytics:${type}:${projectId || 'all'}`,

  // Reports
  report: (type: string, filters?: Record<string, unknown>) =>
    `report:${type}:${JSON.stringify(filters || {})}`,

  // Settings
  companySettings: () => 'settings:company',
  userPreferences: (userId: string) => `settings:user:${userId}`,

  // Subcontractors
  subcontractor: (id: string) => `subcontractor:${id}`,
  subcontractorList: () => 'subcontractors:all',

  // Certifications
  certifications: (userId?: string, subcontractorId?: string) =>
    `certifications:${userId || 'none'}:${subcontractorId || 'none'}`,
}

/**
 * Cache tags for invalidation
 */
export const cacheTags = {
  project: (id: string) => `project:${id}`,
  projects: () => 'projects',
  user: (id: string) => `user:${id}`,
  users: () => 'users',
  dailyLogs: (projectId?: string) => projectId ? `dailylogs:${projectId}` : 'dailylogs',
  timeEntries: (userId?: string) => userId ? `timeentries:${userId}` : 'timeentries',
  equipment: () => 'equipment',
  documents: (projectId?: string) => projectId ? `documents:${projectId}` : 'documents',
  analytics: () => 'analytics',
  reports: () => 'reports',
  settings: () => 'settings',
  subcontractors: () => 'subcontractors',
  certifications: () => 'certifications',
  financials: (projectId?: string) => projectId ? `financials:${projectId}` : 'financials',
  safety: (projectId?: string) => projectId ? `safety:${projectId}` : 'safety',
}

/**
 * Cache TTL presets (in milliseconds)
 */
export const cacheTTL = {
  short: 60 * 1000,           // 1 minute - for frequently changing data
  medium: 5 * 60 * 1000,      // 5 minutes - default
  long: 30 * 60 * 1000,       // 30 minutes - for stable data
  extraLong: 60 * 60 * 1000,  // 1 hour - for rarely changing data
  settings: 10 * 60 * 1000,   // 10 minutes - for settings
}

/**
 * Higher-order function to add caching to async functions
 */
export function withCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    keyFn: (...args: TArgs) => string
    ttl?: number
    tags?: (...args: TArgs) => string[]
  }
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = options.keyFn(...args)

    // Check cache first
    const cached = cache.get<TResult>(key)
    if (cached !== null) {
      return cached
    }

    // Execute function
    const result = await fn(...args)

    // Cache the result
    cache.set(key, result, {
      ttl: options.ttl,
      tags: options.tags?.(...args),
    })

    return result
  }
}

/**
 * Invalidate cache when data changes
 */
export function invalidateOnChange(resource: string, id?: string, projectId?: string): void {
  const tagsToInvalidate: string[] = []

  switch (resource) {
    case 'project':
      tagsToInvalidate.push(cacheTags.projects())
      if (id) tagsToInvalidate.push(cacheTags.project(id))
      break

    case 'dailyLog':
      tagsToInvalidate.push(cacheTags.dailyLogs())
      if (projectId) tagsToInvalidate.push(cacheTags.dailyLogs(projectId))
      break

    case 'timeEntry':
      tagsToInvalidate.push(cacheTags.timeEntries())
      break

    case 'equipment':
      tagsToInvalidate.push(cacheTags.equipment())
      break

    case 'document':
      tagsToInvalidate.push(cacheTags.documents())
      if (projectId) tagsToInvalidate.push(cacheTags.documents(projectId))
      break

    case 'settings':
      tagsToInvalidate.push(cacheTags.settings())
      break

    case 'subcontractor':
      tagsToInvalidate.push(cacheTags.subcontractors())
      break

    case 'certification':
      tagsToInvalidate.push(cacheTags.certifications())
      break

    case 'financial':
      tagsToInvalidate.push(cacheTags.financials())
      if (projectId) tagsToInvalidate.push(cacheTags.financials(projectId))
      break

    case 'safety':
      tagsToInvalidate.push(cacheTags.safety())
      if (projectId) tagsToInvalidate.push(cacheTags.safety(projectId))
      break
  }

  // Always invalidate analytics and reports when data changes
  tagsToInvalidate.push(cacheTags.analytics(), cacheTags.reports())

  cache.invalidateTags(tagsToInvalidate)
}
