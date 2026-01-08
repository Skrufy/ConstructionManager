import useSWR, { SWRConfiguration, mutate } from 'swr'

// Default fetcher for SWR
export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }
  return res.json()
}

// App-wide SWR defaults
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false, // Don't refetch when window regains focus (construction workers switch apps often)
  revalidateOnReconnect: true, // Refetch when network reconnects
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  keepPreviousData: true, // Show stale data while loading new data
}

// Cache key prefixes for organized invalidation
export const CACHE_KEYS = {
  projects: '/api/projects',
  project: (id: string) => `/api/projects/${id}`,
  dailyLogs: '/api/daily-logs',
  dailyLog: (id: string) => `/api/daily-logs/${id}`,
  users: '/api/users',
  labels: '/api/labels',
  settings: '/api/settings',
  documents: '/api/documents',
  timeEntries: '/api/time-entries',
  equipment: '/api/equipment',
  notifications: '/api/notifications',
  analytics: '/api/analytics',
} as const

// Invalidation helpers - call these after mutations
export const invalidate = {
  projects: () => mutate(CACHE_KEYS.projects),
  project: (id: string) => mutate(CACHE_KEYS.project(id)),
  dailyLogs: () => mutate(CACHE_KEYS.dailyLogs),
  dailyLog: (id: string) => mutate(CACHE_KEYS.dailyLog(id)),
  users: () => mutate(CACHE_KEYS.users),
  labels: () => mutate(CACHE_KEYS.labels),
  settings: () => mutate(CACHE_KEYS.settings),
  documents: () => mutate(CACHE_KEYS.documents),
  timeEntries: () => mutate(CACHE_KEYS.timeEntries),
  equipment: () => mutate(CACHE_KEYS.equipment),
  notifications: () => mutate(CACHE_KEYS.notifications),
  analytics: () => mutate(CACHE_KEYS.analytics),
  // Invalidate all caches (use sparingly)
  all: () => mutate(() => true, undefined, { revalidate: true }),
}

// ============================================
// CUSTOM HOOKS WITH CACHING
// ============================================

interface Project {
  id: string
  name: string
  address: string | null
  status: string
  startDate: string | null
  endDate: string | null
  description: string | null
}

interface Label {
  id: string
  category: string
  name: string
  projectId: string | null
  isActive: boolean
  sortOrder: number
}

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
}

// Hook for fetching projects list
export function useProjects(options?: { status?: string }) {
  const params = new URLSearchParams()
  if (options?.status) params.set('status', options.status)
  const queryString = params.toString()
  const url = queryString ? `${CACHE_KEYS.projects}?${queryString}` : CACHE_KEYS.projects

  return useSWR<Project[]>(url, fetcher, {
    ...swrConfig,
    revalidateIfStale: true,
    revalidateOnMount: true,
  })
}

// Hook for fetching a single project
export function useProject(id: string | null) {
  return useSWR<Project>(
    id ? CACHE_KEYS.project(id) : null,
    fetcher,
    swrConfig
  )
}

// Hook for fetching labels
export function useLabels(options?: { category?: string; projectId?: string }) {
  const params = new URLSearchParams()
  if (options?.category) params.set('category', options.category)
  if (options?.projectId) params.set('projectId', options.projectId)
  const queryString = params.toString()
  const url = queryString ? `${CACHE_KEYS.labels}?${queryString}` : CACHE_KEYS.labels

  return useSWR<Label[]>(url, fetcher, {
    ...swrConfig,
    dedupingInterval: 30000, // Labels change rarely, dedupe for 30s
  })
}

// Hook for fetching users list
export function useUsers() {
  return useSWR<User[]>(CACHE_KEYS.users, fetcher, {
    ...swrConfig,
    dedupingInterval: 30000, // Users change rarely
  })
}

// Hook for fetching daily logs
export function useDailyLogs(options?: { projectId?: string; status?: string; date?: string }) {
  const params = new URLSearchParams()
  if (options?.projectId) params.set('projectId', options.projectId)
  if (options?.status) params.set('status', options.status)
  if (options?.date) params.set('date', options.date)
  const queryString = params.toString()
  const url = queryString ? `${CACHE_KEYS.dailyLogs}?${queryString}` : CACHE_KEYS.dailyLogs

  return useSWR(url, fetcher, swrConfig)
}

// Hook for fetching a single daily log
export function useDailyLog(id: string | null) {
  return useSWR(
    id ? CACHE_KEYS.dailyLog(id) : null,
    fetcher,
    swrConfig
  )
}

// Hook for notifications with more frequent updates
export function useNotifications() {
  return useSWR(CACHE_KEYS.notifications, fetcher, {
    ...swrConfig,
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: true, // Check for new notifications when user returns
  })
}

// Hook for time entries
export function useTimeEntries(options?: { userId?: string; projectId?: string; status?: string }) {
  const params = new URLSearchParams()
  if (options?.userId) params.set('userId', options.userId)
  if (options?.projectId) params.set('projectId', options.projectId)
  if (options?.status) params.set('status', options.status)
  const queryString = params.toString()
  const url = queryString ? `${CACHE_KEYS.timeEntries}?${queryString}` : CACHE_KEYS.timeEntries

  return useSWR(url, fetcher, swrConfig)
}

// Generic hook for custom endpoints
export function useData<T>(url: string | null, options?: SWRConfiguration) {
  return useSWR<T>(url, fetcher, { ...swrConfig, ...options })
}
