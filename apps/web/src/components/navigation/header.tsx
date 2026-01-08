'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Menu,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Search,
  X,
  FolderKanban,
  FileText,
  Users,
  Loader2,
  Bell,
  Truck,
  Image,
  Shield,
  HardHat,
  Hash,
} from 'lucide-react'
import { NotificationBell } from '@/components/ui/notification-bell'

interface HeaderProps {
  user: {
    name: string
    email: string
    role: string
  }
}

interface SearchResult {
  type: 'project' | 'daily-log' | 'user' | 'equipment' | 'document' | 'safety' | 'subcontractor'
  id: string
  title: string
  subtitle?: string
}

// Search filter category type
interface SearchFilter {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  aliases?: string[]
  adminOnly?: boolean
}

// Search filter categories with Discord-style syntax
const SEARCH_FILTERS: SearchFilter[] = [
  { key: 'projects', label: 'Projects', icon: FolderKanban, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { key: 'logs', label: 'Daily Logs', icon: FileText, color: 'text-green-500', bgColor: 'bg-green-500/10', aliases: ['dailylogs'] },
  { key: 'users', label: 'Users', icon: Users, color: 'text-purple-500', bgColor: 'bg-purple-500/10', adminOnly: true },
  { key: 'equipment', label: 'Equipment', icon: Truck, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { key: 'documents', label: 'Documents', icon: Image, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  { key: 'safety', label: 'Safety', icon: Shield, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  { key: 'subcontractors', label: 'Subcontractors', icon: HardHat, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
]

type FilterKey = string

// Parse search query for filter prefix (e.g., "#projects search term")
function parseSearchQuery(query: string): { filter: FilterKey | null; searchTerm: string } {
  const trimmed = query.trim()

  // Check for hashtag prefix
  const hashMatch = trimmed.match(/^#(\w+)\s*(.*)$/)
  if (hashMatch) {
    const filterName = hashMatch[1].toLowerCase()
    const searchTerm = hashMatch[2].trim()

    // Find matching filter
    const filter = SEARCH_FILTERS.find(f =>
      f.key === filterName || (f.aliases && f.aliases.includes(filterName as never))
    )

    if (filter) {
      return { filter: filter.key, searchTerm }
    }
  }

  return { filter: null, searchTerm: trimmed }
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const { signOut } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showFilterHints, setShowFilterHints] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isAdmin = user.role === 'ADMIN'

  // Parse the search query for filter and search term
  const { filter: activeFilter, searchTerm } = useMemo(() =>
    parseSearchQuery(searchQuery), [searchQuery]
  )

  // Get the active filter config
  const activeFilterConfig = useMemo(() =>
    activeFilter ? SEARCH_FILTERS.find(f => f.key === activeFilter) : null,
    [activeFilter]
  )

  // Filter suggestions based on what user is typing after #
  const filterSuggestions = useMemo(() => {
    if (!searchQuery.startsWith('#')) return []

    const partial = searchQuery.slice(1).toLowerCase().split(' ')[0]
    return SEARCH_FILTERS.filter(f => {
      if (f.adminOnly && !isAdmin) return false
      if (!partial) return true
      return f.key.includes(partial) || f.label.toLowerCase().includes(partial)
    })
  }, [searchQuery, isAdmin])

  // Prevent hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show filter hints when typing # at the start
  useEffect(() => {
    setShowFilterHints(searchQuery === '#' || (searchQuery.startsWith('#') && !activeFilter && filterSuggestions.length > 0))
  }, [searchQuery, activeFilter, filterSuggestions])

  // Simple debounced search
  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return

    // If showing filter hints, don't search yet
    if (showFilterHints) {
      setSearchResults([])
      setSearching(false)
      return
    }

    // Use searchTerm (after filter is parsed) for the query
    const effectiveQuery = activeFilter ? searchTerm : searchQuery.trim()

    if (effectiveQuery.length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }

    setSearching(true)

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams({ q: effectiveQuery })
      if (activeFilter) {
        params.set('category', activeFilter)
      }

      fetch(`/api/search?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          setSearchResults(data.results || [])
          setSearching(false)
        })
        .catch(err => {
          console.error('Search error:', err)
          setSearching(false)
        })
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchTerm, activeFilter, showFilterHints])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchFocused(false)
      setSearchQuery('')
    }
  }

  const handleResultClick = (result: SearchResult) => {
    setSearchFocused(false)
    setSearchQuery('')
    switch (result.type) {
      case 'project':
        router.push(`/projects/${result.id}`)
        break
      case 'daily-log':
        router.push(`/daily-logs/${result.id}`)
        break
      case 'user':
        router.push(`/admin/users`)
        break
      case 'equipment':
        router.push(`/equipment/${result.id}`)
        break
      case 'document':
        router.push(`/documents/${result.id}`)
        break
      case 'safety':
        router.push(`/safety/${result.id}`)
        break
      case 'subcontractor':
        router.push(`/subcontractors/${result.id}`)
        break
    }
  }

  const handleFilterSelect = (filterKey: string) => {
    setSearchQuery(`#${filterKey} `)
    searchInputRef.current?.focus()
  }

  const clearFilter = () => {
    setSearchQuery(searchTerm)
    searchInputRef.current?.focus()
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderKanban className="h-4 w-4 text-blue-500" />
      case 'daily-log':
        return <FileText className="h-4 w-4 text-green-500" />
      case 'user':
        return <Users className="h-4 w-4 text-purple-500" />
      case 'equipment':
        return <Truck className="h-4 w-4 text-orange-500" />
      case 'document':
        return <Image className="h-4 w-4 text-cyan-500" />
      case 'safety':
        return <Shield className="h-4 w-4 text-red-500" />
      case 'subcontractor':
        return <HardHat className="h-4 w-4 text-amber-500" />
      default:
        return <Search className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-sm transition-colors">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Search */}
          <div className="flex-1 flex items-center justify-center px-2 lg:ml-6 lg:justify-start">
            <div className="max-w-lg w-full lg:max-w-md relative">
              <form onSubmit={handleSearchSubmit}>
                <label htmlFor="search" className="sr-only">Search</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                    {mounted && searching ? (
                      <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                    ) : activeFilterConfig ? (
                      <activeFilterConfig.icon className={`h-5 w-5 ${activeFilterConfig.color}`} />
                    ) : (
                      <Search className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <input
                    ref={searchInputRef}
                    id="search"
                    name="search"
                    className={`block w-full pl-10 pr-10 py-2 border rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                      activeFilterConfig
                        ? `${activeFilterConfig.bgColor} border-current bg-opacity-50 dark:bg-opacity-20`
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600'
                    }`}
                    placeholder={activeFilterConfig ? `Search in ${activeFilterConfig.label}...` : "Type # for filters, or search..."}
                    type="text"
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    aria-label="Search - type # for category filters"
                    suppressHydrationWarning
                  />
                  {mounted && searchQuery && (
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    </button>
                  )}
                </div>
              </form>

              {/* Filter Suggestions Dropdown */}
              {mounted && searchFocused && showFilterHints && (
                <div className="absolute mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Filter by category
                    </p>
                  </div>
                  <div className="py-1">
                    {filterSuggestions.map((filter) => (
                      <button
                        key={filter.key}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                        onClick={() => handleFilterSelect(filter.key)}
                      >
                        <div className={`p-1.5 rounded ${filter.bgColor}`}>
                          <filter.icon className={`h-4 w-4 ${filter.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">#{filter.key}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{filter.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Type <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">#projects delay</code> to search projects for &quot;delay&quot;
                    </p>
                  </div>
                </div>
              )}

              {/* Search Results Dropdown */}
              {mounted && searchFocused && !showFilterHints && (searchQuery.trim().length >= 2 || (activeFilter && searchTerm.length >= 2)) && (
                <div className="absolute mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto z-50">
                  {/* Active Filter Badge */}
                  {activeFilterConfig && (
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${activeFilterConfig.bgColor}`}>
                          <activeFilterConfig.icon className={`h-3.5 w-3.5 ${activeFilterConfig.color}`} />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Searching in {activeFilterConfig.label}
                        </span>
                      </div>
                      <button
                        onClick={clearFilter}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        Clear filter
                      </button>
                    </div>
                  )}

                  {searching ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      <span className="text-sm">Searching{activeFilterConfig ? ` ${activeFilterConfig.label}` : ''}...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.type}-${result.id}-${index}`}
                          className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                          onClick={() => handleResultClick(result)}
                        >
                          {getResultIcon(result.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{result.title}</p>
                            {result.subtitle && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</p>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 capitalize">{result.type.replace('-', ' ')}</span>
                        </button>
                      ))}
                      <div className="border-t dark:border-gray-700 mt-2 pt-2 px-4 pb-2">
                        <button
                          onClick={handleSearchSubmit}
                          className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-left"
                        >
                          See all results for &quot;{activeFilter ? searchTerm : searchQuery}&quot;
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <Search className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm">No results found{activeFilterConfig ? ` in ${activeFilterConfig.label}` : ''}</p>
                      <p className="text-xs mt-1">Try a different search term{activeFilter ? ' or clear the filter' : ''}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notifications - Real notification system */}
            <NotificationBell />

            {/* User dropdown */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.role?.replace('_', ' ')}</p>
                </div>
                <ChevronDown className="hidden md:block h-4 w-4 text-gray-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 focus:outline-none">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Your Profile
                      </Link>
                      <Link
                        href="/admin/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <button
                        onClick={async () => {
                          await signOut()
                          router.push('/login')
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu - Improved with icons and larger targets */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-3 py-4 space-y-2">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              Dashboard
            </Link>
            <Link
              href="/projects"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              Projects
            </Link>
            <Link
              href="/daily-logs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              Daily Logs
            </Link>
            <Link
              href="/time-tracking"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Time Tracking
            </Link>
            <Link
              href="/equipment"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              Equipment
            </Link>
            <Link
              href="/documents"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              Documents
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
