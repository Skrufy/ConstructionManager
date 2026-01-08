'use client'

import Link from 'next/link'
import NextImage from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/components/providers/settings-provider'
import { canAccessNavItem, hasRole, SPECIALIZED_NAV_ACCESS, type UserRole } from '@/lib/permissions'
import {
  Building2,
  LayoutDashboard,
  FolderKanban,
  FileText,
  Clock,
  Truck,
  Image,
  Layers,
  Settings,
  Tags,
  Users,
  AlertTriangle,
  CheckSquare,
  Link2,
  Shield,
  DollarSign,
  BarChart3,
  HardHat,
  Calendar,
  Award,
  Plane,
  TrendingUp,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  UserCheck,
} from 'lucide-react'

// Module key mapping to navigation items
type ModuleKey =
  | 'moduleProjects'
  | 'moduleDailyLogs'
  | 'moduleTimeTracking'
  | 'moduleScheduling'
  | 'moduleEquipment'
  | 'moduleDocuments'
  | 'moduleSafety'
  | 'moduleFinancials'
  | 'moduleReports'
  | 'moduleAnalytics'
  | 'moduleSubcontractors'
  | 'moduleCertifications'
  | 'moduleDroneDeploy'
  | 'moduleApprovals'
  | 'moduleWarnings'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  moduleKey?: ModuleKey
  minRole?: UserRole
}

interface SidebarProps {
  userRole: string
}

// Navigation items with role requirements
// Note: Safety and Scheduling are SUPERINTENDENT by default, but can be enabled for Field Workers in settings
const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, minRole: 'VIEWER' },
  { name: 'Projects', href: '/projects', icon: FolderKanban, moduleKey: 'moduleProjects', minRole: 'FIELD_WORKER' },
  { name: 'Daily Logs', href: '/daily-logs', icon: FileText, moduleKey: 'moduleDailyLogs', minRole: 'FIELD_WORKER' },
  { name: 'Time Tracking', href: '/time-tracking', icon: Clock, moduleKey: 'moduleTimeTracking', minRole: 'FIELD_WORKER' },
  { name: 'Scheduling', href: '/scheduling', icon: Calendar, moduleKey: 'moduleScheduling', minRole: 'SUPERINTENDENT' },
  { name: 'Equipment', href: '/equipment', icon: Truck, moduleKey: 'moduleEquipment', minRole: 'SUPERINTENDENT' },
  { name: 'Documents', href: '/documents', icon: Image, moduleKey: 'moduleDocuments', minRole: 'PROJECT_MANAGER' },
  { name: 'Drawings', href: '/drawings', icon: Layers, moduleKey: 'moduleDocuments', minRole: 'FIELD_WORKER' },
  { name: 'Quality & Safety', href: '/safety', icon: Shield, moduleKey: 'moduleSafety', minRole: 'SUPERINTENDENT' },
  { name: 'Financials', href: '/financials', icon: DollarSign, moduleKey: 'moduleFinancials', minRole: 'PROJECT_MANAGER' },
  { name: 'Reports', href: '/reports', icon: BarChart3, moduleKey: 'moduleReports', minRole: 'SUPERINTENDENT' },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp, moduleKey: 'moduleAnalytics', minRole: 'PROJECT_MANAGER' },
]

// Resources section - requires at least Superintendent level
const resourceNavigation: NavItem[] = [
  { name: 'Subcontractors', href: '/subcontractors', icon: HardHat, moduleKey: 'moduleSubcontractors', minRole: 'SUPERINTENDENT' },
  { name: 'Certifications', href: '/certifications', icon: Award, moduleKey: 'moduleCertifications', minRole: 'SUPERINTENDENT' },
  { name: 'DroneDeploy', href: '/dronedeploy', icon: Plane, moduleKey: 'moduleDroneDeploy', minRole: 'SUPERINTENDENT' },
]

// Supervision section - requires at least Superintendent level
const supervisionNavigation: NavItem[] = [
  { name: 'Approvals', href: '/approvals', icon: CheckSquare, moduleKey: 'moduleApprovals', minRole: 'SUPERINTENDENT' },
  { name: 'Employee Warnings', href: '/warnings', icon: AlertTriangle, moduleKey: 'moduleWarnings', minRole: 'SUPERINTENDENT' },
]

// Admin section - requires Admin role only
const adminNavigation: NavItem[] = [
  { name: 'Integrations', href: '/admin/integrations', icon: Link2, minRole: 'ADMIN' },
  { name: 'Labels', href: '/admin/labels', icon: Tags, minRole: 'ADMIN' },
  { name: 'Permissions', href: '/admin/permissions', icon: Shield, minRole: 'ADMIN' },
  { name: 'Users', href: '/admin/users', icon: Users, minRole: 'ADMIN' },
  { name: 'Employee Roster', href: '/admin/employees', icon: UserCheck, minRole: 'ADMIN' },
  { name: 'Settings', href: '/admin/settings', icon: Settings, minRole: 'ADMIN' },
]

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const { isModuleEnabled, loading, company, user, updateUserPreferences } = useSettings()
  const [isReordering, setIsReordering] = useState(false)
  const [tempOrder, setTempOrder] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Track mount state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading state until mounted AND settings are fully loaded
  // Using mounted ensures we don't render different content during hydration
  const isSettingsReady = mounted && !loading && company !== null

  // Get saved sidebar order from user preferences
  const savedOrder = (user?.sidebarOrder as unknown as string[] | null) || null

  // Get role module overrides from company settings
  const getRoleModuleOverride = (moduleKey: string): boolean | undefined => {
    if (!company) return undefined
    const overrides = company.roleModuleOverrides as Record<string, Record<string, boolean>> | undefined
    if (overrides && overrides[userRole] && moduleKey in overrides[userRole]) {
      return overrides[userRole][moduleKey]
    }
    // Legacy Field Worker overrides for backwards compatibility
    if (userRole === 'FIELD_WORKER') {
      if (moduleKey === 'moduleSafety') return company.allowFieldWorkerSafety
      if (moduleKey === 'moduleScheduling') return company.allowFieldWorkerScheduling
    }
    return undefined
  }

  // Filter navigation items based on enabled modules AND user role
  const filterByModuleAndRole = (items: NavItem[]) => {
    return items.filter(item => {
      // Check module is enabled globally (if specified)
      if (item.moduleKey && !isModuleEnabled(item.moduleKey)) return false

      // Check for specialized role access (e.g., MECHANIC always sees equipment)
      const specializedAccess = SPECIALIZED_NAV_ACCESS[userRole]
      if (specializedAccess?.includes(item.href)) {
        return true
      }

      // Check for role-specific module overrides (from admin settings)
      if (item.moduleKey) {
        const roleOverride = getRoleModuleOverride(item.moduleKey)
        if (roleOverride === true) {
          return true // Admin explicitly enabled for this role
        }
        if (roleOverride === false) {
          return false // Admin explicitly disabled for this role
        }
      }

      // Check user has required role (default behavior)
      if (item.minRole && !hasRole(userRole, item.minRole)) return false
      return true
    })
  }

  const filteredNavigation = filterByModuleAndRole(navigation)
  const filteredResourceNavigation = filterByModuleAndRole(resourceNavigation)
  const filteredSupervisionNavigation = filterByModuleAndRole(supervisionNavigation)
  const filteredAdminNavigation = filterByModuleAndRole(adminNavigation)

  // Sort main navigation by saved order (memoized to prevent infinite re-renders)
  const orderedNavigation = useMemo(() => {
    const order = isReordering ? tempOrder : savedOrder
    if (!order || order.length === 0) return filteredNavigation
    return [...filteredNavigation].sort((a, b) => {
      const indexA = order.indexOf(a.href)
      const indexB = order.indexOf(b.href)
      // Items not in order go to the end
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
  }, [filteredNavigation, isReordering, tempOrder, savedOrder])

  // Start reordering mode
  const handleStartReorder = () => {
    // Initialize temp order with current order (filtered items only)
    const currentOrder = orderedNavigation.map(item => item.href)
    setTempOrder(currentOrder)
    setIsReordering(true)
  }

  // Move item up in the list
  const handleMoveUp = (href: string) => {
    setTempOrder(prev => {
      const index = prev.indexOf(href)
      if (index <= 0) return prev
      const newOrder = [...prev]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      return newOrder
    })
  }

  // Move item down in the list
  const handleMoveDown = (href: string) => {
    setTempOrder(prev => {
      const index = prev.indexOf(href)
      if (index === -1 || index >= prev.length - 1) return prev
      const newOrder = [...prev]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      return newOrder
    })
  }

  // Save the new order
  const handleSaveOrder = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await updateUserPreferences({ sidebarOrder: tempOrder } as Record<string, unknown>)
      setIsReordering(false)
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to save. Please try again.'
      console.error('Failed to save sidebar order:', error)
      setSaveError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // Cancel reordering
  const handleCancelReorder = () => {
    setTempOrder([])
    setSaveError(null)
    setIsReordering(false)
  }

  // Check if user can see entire sections
  const canSeeResources = hasRole(userRole, 'SUPERINTENDENT')
  const canSeeSupervision = hasRole(userRole, 'SUPERINTENDENT')
  const canSeeAdmin = hasRole(userRole, 'ADMIN')

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col" suppressHydrationWarning>
      <div className="flex flex-col flex-grow bg-gray-900 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
          <Link href="/dashboard" className="flex items-center gap-2">
            {company?.companyLogo ? (
              <NextImage
                src={company.companyLogo}
                alt={company.companyName || 'Company Logo'}
                width={140}
                height={40}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <>
                <Building2 className="h-8 w-8 text-primary-400" />
                <span className="text-xl font-bold text-white" suppressHydrationWarning>
                  {company?.companyName || 'ConstructionPro'}
                </span>
              </>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col px-2 py-4 space-y-1">
          {!isSettingsReady ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Reorder Controls */}
              {isReordering && (
                <div className="flex flex-col gap-2 px-3 py-2 mb-2 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300 flex-1">Reorder menu</span>
                    <button
                      onClick={handleSaveOrder}
                      disabled={saving}
                      className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                      title="Save order"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={handleCancelReorder}
                      disabled={saving}
                      className="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {saveError && (
                    <div className="flex items-start gap-2 px-2 py-1.5 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>{saveError}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                {orderedNavigation.map((item, index) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <div key={item.name} className="flex items-center gap-1">
                      {isReordering ? (
                        <>
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleMoveUp(item.href)}
                              disabled={index === 0}
                              className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(item.href)}
                              disabled={index === orderedNavigation.length - 1}
                              className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                          <div
                            className={cn(
                              'flex-1 flex items-center px-3 py-2.5 text-sm font-medium rounded-lg bg-gray-800',
                              'text-gray-200 cursor-move'
                            )}
                          >
                            <item.icon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-300" />
                            {item.name}
                          </div>
                        </>
                      ) : (
                        <Link
                          href={item.href}
                          className={cn(
                            'flex-1 group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors',
                            isActive
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-200 hover:bg-gray-700 hover:text-white'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'mr-3 h-6 w-6 flex-shrink-0',
                              isActive ? 'text-primary-400' : 'text-gray-300 group-hover:text-white'
                            )}
                          />
                          {item.name}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Resources Section - Only for Superintendent+ */}
              {canSeeResources && filteredResourceNavigation.length > 0 && (
                <div className="pt-6">
                  <p className="px-3 text-sm font-bold text-gray-400 uppercase tracking-wider">
                    Resources
                  </p>
                  <div className="mt-2 space-y-1">
                    {filteredResourceNavigation.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            'group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors',
                            isActive
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-200 hover:bg-gray-700 hover:text-white'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'mr-3 h-6 w-6 flex-shrink-0',
                              isActive ? 'text-orange-400' : 'text-gray-300 group-hover:text-white'
                            )}
                          />
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Supervision Section - Only for Superintendent+ */}
              {canSeeSupervision && filteredSupervisionNavigation.length > 0 && (
                <div className="pt-6">
                  <p className="px-3 text-sm font-bold text-gray-400 uppercase tracking-wider">
                    Supervision
                  </p>
                  <div className="mt-2 space-y-1">
                    {filteredSupervisionNavigation.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            'group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors',
                            isActive
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-200 hover:bg-gray-700 hover:text-white'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'mr-3 h-6 w-6 flex-shrink-0',
                              isActive ? 'text-red-400' : 'text-gray-300 group-hover:text-white'
                            )}
                          />
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Admin Section - Only for Admin role */}
              {canSeeAdmin && filteredAdminNavigation.length > 0 && (
                <div className="pt-6">
                  <p className="px-3 text-sm font-bold text-gray-400 uppercase tracking-wider">
                    Administration
                  </p>
                  <div className="mt-2 space-y-1">
                    {filteredAdminNavigation.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            'group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors',
                            isActive
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-200 hover:bg-gray-700 hover:text-white'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'mr-3 h-6 w-6 flex-shrink-0',
                              isActive ? 'text-primary-400' : 'text-gray-300 group-hover:text-white'
                            )}
                          />
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </nav>

        {/* Version & Reorder Button */}
        <div className="flex-shrink-0 p-4 space-y-2">
          {!isReordering && isSettingsReady && (
            <button
              onClick={handleStartReorder}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
              title="Customize menu order"
            >
              <GripVertical className="h-4 w-4" />
              Reorder Menu
            </button>
          )}
          <p className="text-xs text-gray-500 text-center">Version 0.2.0 (Dev Build)</p>
        </div>
      </div>
    </div>
  )
}
