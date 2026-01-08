'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  FolderKanban,
  FileText,
  Users,
  Loader2,
  ArrowLeft,
  Truck,
  Image,
  Shield,
  HardHat,
} from 'lucide-react'

interface SearchResult {
  type: 'project' | 'daily-log' | 'user' | 'equipment' | 'document' | 'safety' | 'subcontractor'
  id: string
  title: string
  subtitle?: string
}

// Search filter categories matching the header
const SEARCH_FILTERS = [
  { key: 'projects', label: 'Projects', aliases: [] },
  { key: 'logs', label: 'Daily Logs', aliases: ['dailylogs'] },
  { key: 'users', label: 'Users', aliases: [] },
  { key: 'equipment', label: 'Equipment', aliases: [] },
  { key: 'documents', label: 'Documents', aliases: [] },
  { key: 'safety', label: 'Safety', aliases: [] },
  { key: 'subcontractors', label: 'Subcontractors', aliases: [] },
]

// Parse search query for filter prefix (e.g., "#projects search term")
function parseSearchQuery(query: string): { filter: string | null; searchTerm: string } {
  const trimmed = query.trim()
  const hashMatch = trimmed.match(/^#(\w+)\s*(.*)$/)
  if (hashMatch) {
    const filterName = hashMatch[1].toLowerCase()
    const searchTerm = hashMatch[2].trim()
    const filter = SEARCH_FILTERS.find(f =>
      f.key === filterName || f.aliases.includes(filterName)
    )
    if (filter) {
      return { filter: filter.key, searchTerm }
    }
  }
  return { filter: null, searchTerm: trimmed }
}

function SearchResults() {
  const searchParams = useSearchParams()
  const rawQuery = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Parse the query for filter prefix
  const { filter: activeFilter, searchTerm: query } = useMemo(() =>
    parseSearchQuery(rawQuery), [rawQuery]
  )

  // Get filter label for display
  const activeFilterLabel = useMemo(() =>
    activeFilter ? SEARCH_FILTERS.find(f => f.key === activeFilter)?.label : null,
    [activeFilter]
  )

  useEffect(() => {
    const fetchResults = async () => {
      if (!query || query.length < 2) {
        setResults([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Build URL with category filter if present
        const params = new URLSearchParams({ q: query })
        if (activeFilter) {
          params.set('category', activeFilter)
        }

        const response = await fetch(`/api/search?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Search failed')
        }
        const data = await response.json()
        setResults(data.results || [])
      } catch (err) {
        console.error('Search error:', err)
        setError('Failed to search. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query, activeFilter])

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderKanban className="h-6 w-6 text-blue-500" />
      case 'daily-log':
        return <FileText className="h-6 w-6 text-green-500" />
      case 'user':
        return <Users className="h-6 w-6 text-purple-500" />
      case 'equipment':
        return <Truck className="h-6 w-6 text-orange-500" />
      case 'document':
        return <Image className="h-6 w-6 text-cyan-500" />
      case 'safety':
        return <Shield className="h-6 w-6 text-red-500" />
      case 'subcontractor':
        return <HardHat className="h-6 w-6 text-amber-500" />
      default:
        return <Search className="h-6 w-6 text-gray-400" />
    }
  }

  const getResultLink = (result: SearchResult) => {
    switch (result.type) {
      case 'project':
        return `/projects/${result.id}`
      case 'daily-log':
        return `/daily-logs/${result.id}`
      case 'user':
        return `/admin/users`
      case 'equipment':
        return `/equipment/${result.id}`
      case 'document':
        return `/documents/${result.id}`
      case 'safety':
        return `/safety/${result.id}`
      case 'subcontractor':
        return `/subcontractors/${result.id}`
      default:
        return '#'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project':
        return 'Project'
      case 'daily-log':
        return 'Daily Log'
      case 'user':
        return 'User'
      case 'equipment':
        return 'Equipment'
      case 'document':
        return 'Document'
      case 'safety':
        return 'Safety'
      case 'subcontractor':
        return 'Subcontractor'
      default:
        return type
    }
  }

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Search Results
        </h1>
        {query && (
          <p className="text-gray-500 mt-1">
            Showing results for &quot;{query}&quot;
            {activeFilterLabel && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                in {activeFilterLabel}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Searching...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      ) : !query || query.length < 2 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center">
          <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Enter at least 2 characters to search</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center">
          <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-900 dark:text-gray-100 font-medium">No results found</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Try searching with different keywords
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedResults).map(([type, typeResults]) => (
            <div key={type}>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {getTypeLabel(type)}s ({typeResults.length})
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {typeResults.map((result) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={getResultLink(result)}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-shrink-0 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {getTypeLabel(result.type)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Search Results</h1>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-500 dark:text-gray-400">Loading...</span>
          </div>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  )
}
