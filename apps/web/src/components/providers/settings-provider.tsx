'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react'

// Cache configuration
const CACHE_KEY = 'constructionpro_settings'
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes in milliseconds

interface CachedSettings {
  company: CompanySettings | null
  user: UserPreferences | null
  timestamp: number
}

// Helper to check if cache is still fresh
function isCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL
}

// Helper to get cached settings from localStorage
function getCachedSettings(): CachedSettings | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    return JSON.parse(cached) as CachedSettings
  } catch {
    return null
  }
}

// Helper to save settings to localStorage
function cacheSettings(company: CompanySettings | null, user: UserPreferences | null): void {
  if (typeof window === 'undefined') return
  try {
    const data: CachedSettings = { company, user, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
}

// Helper to clear cached settings
function clearCachedSettings(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // Ignore errors
  }
}

export interface ModuleSettings {
  moduleProjects: boolean
  moduleDailyLogs: boolean
  moduleTimeTracking: boolean
  moduleScheduling: boolean
  moduleEquipment: boolean
  moduleDocuments: boolean
  moduleSafety: boolean
  moduleFinancials: boolean
  moduleReports: boolean
  moduleAnalytics: boolean
  moduleSubcontractors: boolean
  moduleCertifications: boolean
  moduleDroneDeploy: boolean
  moduleApprovals: boolean
  moduleWarnings: boolean
}

// Role module overrides structure
export type RoleModuleOverrides = {
  [role: string]: Partial<ModuleSettings>
}

// Role data access structure
export type DailyLogAccessLevel = 'ALL' | 'ASSIGNED_PROJECTS' | 'OWN_ONLY'
export type RoleDataAccess = {
  [role: string]: {
    dailyLogAccess?: DailyLogAccessLevel
  }
}

interface CompanySettings extends ModuleSettings {
  id: string
  companyName: string
  companyLogo: string | null
  companyFavicon: string | null
  timezone: string
  dateFormat: string
  currency: string
  // Legacy Field Worker overrides (kept for backwards compatibility)
  allowFieldWorkerSafety: boolean
  allowFieldWorkerScheduling: boolean
  fieldWorkerDailyLogAccess: DailyLogAccessLevel
  // Role-based module visibility overrides (JSON)
  roleModuleOverrides: RoleModuleOverrides
  // Role-based data access settings (JSON)
  roleDataAccess: RoleDataAccess
  // Feature settings
  requireGpsClockIn: boolean
  requirePhotoDaily: boolean
  autoApproveTimesheet: boolean
  dailyLogReminders: boolean
  certExpiryAlertDays: number
  maxFileUploadMB: number
  autoDeleteDocuments: boolean
  autoDeleteDocumentsYears: number
  emailNotifications: boolean
  pushNotifications: boolean
  activitiesEnabled: boolean
  dailyLogApprovalRequired: boolean
  hideBuildingInfo: boolean
}

interface UserPreferences {
  id: string
  userId: string
  theme: string
  sidebarCollapsed: boolean
  dashboardLayout: string | null
  defaultProjectId: string | null
  sidebarOrder: string[] | null
  emailDailyDigest: boolean
  emailApprovals: boolean
  emailMentions: boolean
  emailCertExpiry: boolean
  pushEnabled: boolean
  itemsPerPage: number
  showCompletedTasks: boolean
  defaultView: string
}

interface SettingsError {
  message: string
  code?: string
}

interface SettingsContextType {
  company: CompanySettings | null
  user: UserPreferences | null
  loading: boolean
  error: SettingsError | null
  isModuleEnabled: (module: keyof ModuleSettings) => boolean
  isModuleVisibleForRole: (module: keyof ModuleSettings, role: string) => boolean
  getRoleDataAccess: (role: string) => { dailyLogAccess: DailyLogAccessLevel }
  isActivitiesEnabled: () => boolean
  isBuildingInfoHidden: () => boolean
  updateCompanySettings: (settings: Partial<CompanySettings>) => Promise<void>
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>
  refreshSettings: () => Promise<void>
  clearError: () => void
}

const defaultModuleSettings: ModuleSettings = {
  moduleProjects: true,
  moduleDailyLogs: true,
  moduleTimeTracking: true,
  moduleScheduling: true,
  moduleEquipment: true,
  moduleDocuments: true,
  moduleSafety: true,
  moduleFinancials: true,
  moduleReports: true,
  moduleAnalytics: true,
  moduleSubcontractors: true,
  moduleCertifications: true,
  moduleDroneDeploy: true,
  moduleApprovals: true,
  moduleWarnings: true,
}

const SettingsContext = createContext<SettingsContextType>({
  company: null,
  user: null,
  loading: true,
  error: null,
  isModuleEnabled: () => true,
  isModuleVisibleForRole: () => true,
  getRoleDataAccess: () => ({ dailyLogAccess: 'ASSIGNED_PROJECTS' }),
  isActivitiesEnabled: () => true,
  isBuildingInfoHidden: () => false,
  updateCompanySettings: async () => {},
  updateUserPreferences: async () => {},
  refreshSettings: async () => {},
  clearError: () => {},
})

export function useSettings() {
  return useContext(SettingsContext)
}

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  // Initialize with null to match server render and avoid hydration mismatch
  const [company, setCompany] = useState<CompanySettings | null>(null)
  const [user, setUser] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<SettingsError | null>(null)
  const [initialized, setInitialized] = useState(false)

  const fetchSettings = useCallback(async (force = false) => {
    // Check cache first (unless forced refresh)
    if (!force) {
      const cached = getCachedSettings()
      if (cached && isCacheFresh(cached.timestamp)) {
        // Cache is fresh, use it
        setCompany(cached.company)
        setUser(cached.user)
        setLoading(false)
        return
      }
    }

    try {
      setError(null)
      const res = await fetch('/api/settings')

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to load settings (${res.status})`)
      }

      const data = await res.json()
      setCompany(data.company)
      setUser(data.user)
      // Cache the new settings
      cacheSettings(data.company, data.user)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings'
      console.error('Error fetching settings:', err)
      setError({ message, code: 'FETCH_ERROR' })
      // Don't clear existing cached data on error - show stale data
    } finally {
      setLoading(false)
    }
  }, [])

  // Single useEffect to handle initialization after hydration
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initialized) return

    // Use requestAnimationFrame to ensure we're past the hydration phase
    const frameId = requestAnimationFrame(() => {
      setInitialized(true)

      // Check cache first
      const cached = getCachedSettings()

      if (cached?.company && isCacheFresh(cached.timestamp)) {
        // Cache is fresh, use it directly
        setCompany(cached.company)
        setUser(cached.user)
        setLoading(false)
      } else if (cached?.company) {
        // Cache exists but is stale - use stale data but refresh in background
        setCompany(cached.company)
        setUser(cached.user)
        setLoading(false) // Show UI immediately with stale data
        fetchSettings(true) // Refresh in background
      } else {
        // No cache, fetch immediately
        fetchSettings(true)
      }
    })

    return () => cancelAnimationFrame(frameId)
  }, [initialized, fetchSettings])

  const isModuleEnabled = useCallback((module: keyof ModuleSettings): boolean => {
    if (!company) return defaultModuleSettings[module]
    return company[module] ?? true
  }, [company])

  // Check if a module is visible for a specific role (considering overrides)
  const isModuleVisibleForRole = useCallback((module: keyof ModuleSettings, role: string): boolean => {
    if (!company) return defaultModuleSettings[module]

    // First check if module is globally enabled
    if (!company[module]) return false

    // Check role-specific override
    const roleOverrides = company.roleModuleOverrides as RoleModuleOverrides
    if (roleOverrides && roleOverrides[role] && module in roleOverrides[role]) {
      return roleOverrides[role][module] ?? defaultModuleSettings[module]
    }

    // For backwards compatibility, check legacy Field Worker overrides
    if (role === 'FIELD_WORKER') {
      if (module === 'moduleSafety') return company.allowFieldWorkerSafety
      if (module === 'moduleScheduling') return company.allowFieldWorkerScheduling
    }

    return defaultModuleSettings[module]
  }, [company])

  // Get data access settings for a specific role
  const getRoleDataAccess = useCallback((role: string): { dailyLogAccess: DailyLogAccessLevel } => {
    const defaultAccess: DailyLogAccessLevel = 'ASSIGNED_PROJECTS'

    if (!company) return { dailyLogAccess: defaultAccess }

    // Check role-specific data access settings
    const roleData = company.roleDataAccess as RoleDataAccess
    if (roleData && roleData[role]) {
      return {
        dailyLogAccess: roleData[role].dailyLogAccess || defaultAccess
      }
    }

    // For backwards compatibility, check legacy Field Worker setting
    if (role === 'FIELD_WORKER') {
      return { dailyLogAccess: company.fieldWorkerDailyLogAccess }
    }

    return { dailyLogAccess: defaultAccess }
  }, [company])

  // Check if activities are required in daily logs
  const isActivitiesEnabled = useCallback((): boolean => {
    if (!company) return true
    return company.activitiesEnabled ?? true
  }, [company])

  // Check if building info fields should be hidden
  const isBuildingInfoHidden = useCallback((): boolean => {
    if (!company) return false
    return company.hideBuildingInfo ?? false
  }, [company])

  const updateCompanySettings = useCallback(async (settings: Partial<CompanySettings>) => {
    const previousCompany = company

    try {
      // Optimistic update
      if (company) {
        setCompany({ ...company, ...settings })
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'company', settings })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to update settings (${res.status})`)
      }

      const data = await res.json()
      setCompany(data.company)
      // Update cache with new company settings
      cacheSettings(data.company, user)
      setError(null)
    } catch (err) {
      // Rollback on error
      setCompany(previousCompany)
      const message = err instanceof Error ? err.message : 'Failed to update company settings'
      console.error('Error updating company settings:', err)
      throw new Error(message)
    }
  }, [company, user])

  const updateUserPreferences = useCallback(async (preferences: Partial<UserPreferences>) => {
    const previousUser = user

    try {
      // Optimistic update
      if (user) {
        setUser({ ...user, ...preferences })
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'user', settings: preferences })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to update preferences (${res.status})`)
      }

      const data = await res.json()
      setUser(data.user)
      // Update cache with new user preferences
      cacheSettings(company, data.user)
      setError(null)
    } catch (err) {
      // Rollback on error
      setUser(previousUser)
      const message = err instanceof Error ? err.message : 'Failed to update user preferences'
      console.error('Error updating user preferences:', err)
      throw new Error(message)
    }
  }, [company, user])

  const refreshSettings = useCallback(async () => {
    setLoading(true)
    // Clear cache and force refresh
    clearCachedSettings()
    await fetchSettings(true)
  }, [fetchSettings])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    company,
    user,
    loading,
    error,
    isModuleEnabled,
    isModuleVisibleForRole,
    getRoleDataAccess,
    isActivitiesEnabled,
    isBuildingInfoHidden,
    updateCompanySettings,
    updateUserPreferences,
    refreshSettings,
    clearError,
  }), [
    company,
    user,
    loading,
    error,
    isModuleEnabled,
    isModuleVisibleForRole,
    getRoleDataAccess,
    isActivitiesEnabled,
    isBuildingInfoHidden,
    updateCompanySettings,
    updateUserPreferences,
    refreshSettings,
    clearError,
  ])

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}
