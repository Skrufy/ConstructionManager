'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSettings, type ModuleSettings } from '@/components/providers/settings-provider'
import {
  LayoutDashboard,
  Clock,
  FileText,
  Menu,
  X,
  FolderKanban,
  Image,
  Calendar,
  Settings,
  PenTool,
} from 'lucide-react'
import { useState } from 'react'

interface MobileNavProps {
  userRole: string
}

export function MobileNav({ userRole }: MobileNavProps) {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const { isModuleEnabled, isModuleVisibleForRole } = useSettings()

  // Hide bottom nav on drawings page to maximize viewing area
  if (pathname.startsWith('/drawings')) {
    return null
  }

  // Check if module is visible for this user's role
  const canAccessModule = (module: string) => {
    return isModuleEnabled(module as keyof ModuleSettings) &&
           isModuleVisibleForRole(module as keyof ModuleSettings, userRole)
  }

  // Only admins should see admin documents and settings
  const isAdmin = userRole === 'ADMIN'
  const canAccessAdminDocuments = isAdmin

  // Build primary nav items based on module settings and role visibility
  const primaryNavItems = [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard, module: null },
    ...(canAccessModule('moduleTimeTracking') ? [{ name: 'Clock', href: '/time-tracking', icon: Clock, module: 'moduleTimeTracking' }] : []),
    ...(canAccessModule('moduleDailyLogs') ? [{ name: 'Logs', href: '/daily-logs', icon: FileText, module: 'moduleDailyLogs' }] : []),
  ]

  // Build more nav items based on module settings and role
  const moreNavItems = [
    ...(canAccessModule('moduleProjects') ? [{ name: 'Projects', href: '/projects', icon: FolderKanban }] : []),
    // Drawings - available to all users who can access documents (FIELD_WORKER and up)
    ...(canAccessModule('moduleDocuments') ? [{ name: 'Drawings', href: '/drawings', icon: PenTool }] : []),
    ...(canAccessModule('moduleDocuments') && canAccessAdminDocuments ? [{ name: 'Documents', href: '/documents', icon: Image }] : []),
    ...(canAccessModule('moduleScheduling') ? [{ name: 'Scheduling', href: '/scheduling', icon: Calendar }] : []),
    ...(isAdmin ? [{ name: 'Settings', href: '/admin/settings', icon: Settings }] : []),
  ].filter(Boolean)

  // Calculate grid columns based on number of primary items
  const gridCols = primaryNavItems.length + 1 // +1 for More button

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-20 left-4 right-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 safe-area-inset-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">More Options</h3>
              <button
                onClick={() => setShowMore(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {moreNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl transition-colors',
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="mobile-nav">
        <div
          className="grid gap-1 px-2 py-1"
          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
        >
          {primaryNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'mobile-nav-item',
                  isActive && 'mobile-nav-item-active'
                )}
              >
                <item.icon className={cn(
                  'h-7 w-7',
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                )} />
                <span className={cn(
                  'text-xs mt-1 font-medium',
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              'mobile-nav-item',
              showMore && 'mobile-nav-item-active'
            )}
          >
            <Menu className={cn(
              'h-7 w-7',
              showMore ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
            )} />
            <span className={cn(
              'text-xs mt-1 font-medium',
              showMore ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'
            )}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
