'use client'

import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  Search,
  Calendar,
  Clock,
  Image as ImageIcon,
  MapPin,
  User,
  ChevronDown,
  X,
  Plane,
  Camera,
  Map,
  BarChart3,
  CheckCircle2,
  Clock4,
  AlertCircle,
  Filter,
  Columns,
  Maximize2,
  Eye,
} from 'lucide-react'

// Lazy load heavy components
const MapViewer = lazy(() => import('@/components/dronedeploy/map-viewer').then(m => ({ default: m.MapViewer })))
const FlightComparison = lazy(() => import('@/components/dronedeploy/flight-comparison').then(m => ({ default: m.FlightComparison })))
const ExportMenu = lazy(() => import('@/components/dronedeploy/export-menu').then(m => ({ default: m.ExportMenu })))

interface Flight {
  id: string
  projectId: string
  flightDate: string
  pilotName: string
  droneModel: string
  duration: number
  area: number
  images: number
  mapUrl: string
  status: string
  notes: string
}

interface DroneMap {
  id: string
  name: string
  type: string
  createdAt: string
  resolution: string
  embedUrl: string
}

interface Progress {
  baseline: {
    date: string
    flightId: string
  } | null
  current: {
    date: string
    flightId: string
  } | null
  totalFlights: number
  weeklyProgress: Array<{ week: number; date: string; images: number; area: number }>
}

interface Project {
  id: string
  name: string
}

// Status filter options
const STATUS_FILTERS = [
  { value: 'ALL', label: 'All', icon: Filter },
  { value: 'PROCESSED', label: 'Processed', icon: CheckCircle2, color: 'green' },
  { value: 'PENDING_UPLOAD', label: 'Pending', icon: Clock4, color: 'yellow' },
  { value: 'FAILED', label: 'Failed', icon: AlertCircle, color: 'red' },
]

export default function DroneDeployPage() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [configMessage, setConfigMessage] = useState('')
  const [flights, setFlights] = useState<Flight[]>([])
  const [maps, setMaps] = useState<DroneMap[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)
  const [activeTab, setActiveTab] = useState<'flights' | 'maps' | 'progress'>('flights')
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)
  const [flightStats, setFlightStats] = useState({ totalFlights: 0, totalImages: 0, totalArea: 0 })

  // New filter/search state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)

  // Phase 2 features state
  const [showComparison, setShowComparison] = useState(false)
  const [selectedMap, setSelectedMap] = useState<DroneMap | null>(null)
  const [showMapViewer, setShowMapViewer] = useState(false)

  // Log flight form state
  const [flightForm, setFlightForm] = useState({
    flightDate: new Date().toISOString().split('T')[0],
    pilotName: '',
    droneModel: '',
    duration: '',
    area: '',
    images: '',
    notes: ''
  })

  useEffect(() => {
    checkConfiguration()
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchData()
    }
  }, [selectedProject, activeTab])

  async function checkConfiguration() {
    try {
      const res = await fetch('/api/integrations/dronedeploy?type=status')
      if (res.ok) {
        const data = await res.json()
        setIsConfigured(data.configured)
        setConfigMessage(data.message)
      }
    } catch (error) {
      console.error('Error checking configuration:', error)
    }
  }

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || data)
        if ((data.projects || data).length > 0) {
          setSelectedProject((data.projects || data)[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchData() {
    setLoading(true)
    try {
      if (activeTab === 'flights') {
        const res = await fetch(`/api/integrations/dronedeploy?type=flights&projectId=${selectedProject}`)
        if (res.ok) {
          const data = await res.json()
          setFlights(data.flights || [])
          setFlightStats({
            totalFlights: data.totalFlights || 0,
            totalImages: data.totalImages || 0,
            totalArea: data.totalArea || 0
          })
        }
      } else if (activeTab === 'maps') {
        const res = await fetch(`/api/integrations/dronedeploy?type=maps&projectId=${selectedProject}`)
        if (res.ok) {
          const data = await res.json()
          setMaps(data.maps || [])
        }
      } else if (activeTab === 'progress') {
        const res = await fetch(`/api/integrations/dronedeploy?type=progress&projectId=${selectedProject}`)
        if (res.ok) {
          const data = await res.json()
          setProgress(data.progress || null)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogFlight(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/integrations/dronedeploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          ...flightForm,
          duration: parseInt(flightForm.duration) || 0,
          area: parseFloat(flightForm.area) || 0,
          images: parseInt(flightForm.images) || 0
        })
      })

      if (res.ok) {
        setShowLogModal(false)
        setFlightForm({
          flightDate: new Date().toISOString().split('T')[0],
          pilotName: '',
          droneModel: '',
          duration: '',
          area: '',
          images: '',
          notes: ''
        })
        fetchData()
      }
    } catch (error) {
      console.error('Error logging flight:', error)
    }
  }

  // Filter flights based on search and status
  const filteredFlights = useMemo(() => {
    return flights.filter((flight) => {
      // Status filter
      if (statusFilter !== 'ALL' && flight.status !== statusFilter) {
        return false
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          flight.pilotName.toLowerCase().includes(query) ||
          flight.droneModel.toLowerCase().includes(query) ||
          flight.notes?.toLowerCase().includes(query) ||
          new Date(flight.flightDate).toLocaleDateString().includes(query)
        )
      }
      return true
    })
  }, [flights, statusFilter, searchQuery])

  // Get status counts for filter badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: flights.length }
    flights.forEach((f) => {
      counts[f.status] = (counts[f.status] || 0) + 1
    })
    return counts
  }, [flights])

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', icon: CheckCircle2 }
      case 'PENDING_UPLOAD':
        return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', icon: Clock4 }
      case 'FAILED':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', icon: AlertCircle }
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', icon: Clock4 }
    }
  }

  const userRole = session?.user?.role
  const canLogFlights = userRole && ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT'].includes(userRole)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">DroneDeploy</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Aerial mapping, site surveys, and progress tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Project Selector */}
          <div className="relative">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {canLogFlights && selectedProject && (
            <button
              onClick={() => setShowLogModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plane className="h-4 w-4 mr-2" />
              Log Flight
            </button>
          )}
        </div>
      </div>

      {/* Configuration Status */}
      <div className={`rounded-lg p-4 ${isConfigured ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}`}>
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${isConfigured ? 'text-green-500' : 'text-yellow-500'}`}>
            {isConfigured ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${isConfigured ? 'text-green-800 dark:text-green-400' : 'text-yellow-800 dark:text-yellow-400'}`}>
              {isConfigured ? 'DroneDeploy Connected' : 'DroneDeploy Not Configured'}
            </h3>
            <p className={`text-sm ${isConfigured ? 'text-green-700 dark:text-green-500' : 'text-yellow-700 dark:text-yellow-500'}`}>
              {configMessage}
            </p>
          </div>
        </div>
      </div>

      {selectedProject && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Plane className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Flights</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{flightStats.totalFlights}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Camera className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Images</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{flightStats.totalImages.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Area Covered</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{flightStats.totalArea} acres</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8 px-6">
                {[
                  { id: 'flights', label: 'Flights', icon: Plane },
                  { id: 'maps', label: 'Maps', icon: Map },
                  { id: 'progress', label: 'Progress', icon: BarChart3 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Flights Tab */}
                  {activeTab === 'flights' && (
                    <div className="space-y-4">
                      {/* Search and Filters */}
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by pilot, drone, or date..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Compare Button */}
                        {flights.filter(f => f.status === 'PROCESSED').length >= 2 && (
                          <button
                            onClick={() => setShowComparison(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                          >
                            <Columns className="h-4 w-4" />
                            Compare
                          </button>
                        )}

                        {/* Status Filter Chips */}
                        <div className="flex flex-wrap gap-2">
                          {STATUS_FILTERS.map((filter) => {
                            const count = statusCounts[filter.value] || 0
                            const isActive = statusFilter === filter.value
                            return (
                              <button
                                key={filter.value}
                                onClick={() => setStatusFilter(filter.value)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                  isActive
                                    ? filter.value === 'ALL'
                                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                                      : filter.color === 'green'
                                        ? 'bg-green-600 text-white'
                                        : filter.color === 'yellow'
                                          ? 'bg-yellow-500 text-white'
                                          : 'bg-red-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                <filter.icon className="h-3.5 w-3.5" />
                                {filter.label}
                                <span className={`px-1.5 py-0.5 rounded text-xs ${isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'}`}>
                                  {count}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Flight Cards Grid */}
                      {filteredFlights.length === 0 ? (
                        <div className="text-center py-12">
                          <Plane className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No flights found</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {searchQuery || statusFilter !== 'ALL'
                              ? 'Try adjusting your search or filters'
                              : 'Get started by logging your first flight'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredFlights.map((flight) => {
                            const statusConfig = getStatusConfig(flight.status)
                            const StatusIcon = statusConfig.icon
                            return (
                              <div
                                key={flight.id}
                                onClick={() => setSelectedFlight(flight)}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
                              >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                      <Plane className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-gray-100">
                                        {new Date(flight.flightDate).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">{flight.droneModel || 'Unknown Drone'}</p>
                                    </div>
                                  </div>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {flight.status.replace('_', ' ')}
                                  </span>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                  <div className="text-center">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{flight.duration}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">mins</p>
                                  </div>
                                  <div className="text-center border-x border-gray-200 dark:border-gray-700">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{flight.images}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">images</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{flight.area}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">acres</p>
                                  </div>
                                </div>

                                {/* Pilot */}
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <User className="h-4 w-4" />
                                  <span>{flight.pilotName || 'Unknown Pilot'}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Maps Tab */}
                  {activeTab === 'maps' && (
                    <div className="space-y-6">
                      {/* Map Viewer */}
                      {showMapViewer && selectedMap && (
                        <div className="relative">
                          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                            <Suspense fallback={null}>
                              <ExportMenu mapName={selectedMap.name} mapId={selectedMap.id} />
                            </Suspense>
                            <button
                              onClick={() => {
                                setShowMapViewer(false)
                                setSelectedMap(null)
                              }}
                              className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                            </button>
                          </div>
                          <Suspense fallback={
                            <div className="h-[500px] bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                          }>
                            <MapViewer
                              className="h-[500px] rounded-lg"
                              showLayerControl={true}
                              showAnnotations={true}
                            />
                          </Suspense>
                          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{selectedMap.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mt-1">
                              {selectedMap.type.replace('_', ' ')} • {selectedMap.resolution}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Maps Grid */}
                      {!showMapViewer && (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                          {maps.length === 0 ? (
                            <div className="text-center py-12 col-span-full">
                              <Map className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No maps available</h3>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Process flights to generate orthomosaic maps
                              </p>
                            </div>
                          ) : (
                            maps.map((map) => (
                              <div
                                key={map.id}
                                className="border dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all bg-white dark:bg-gray-800 cursor-pointer group"
                                onClick={() => {
                                  setSelectedMap(map)
                                  setShowMapViewer(true)
                                }}
                              >
                                <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
                                  <Map className="h-16 w-16 text-gray-400" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
                                        <Eye className="h-6 w-6 text-blue-600" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-4">
                                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{map.name}</h3>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{map.type.replace('_', ' ')}</p>
                                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                                    <span>{map.resolution}</span>
                                    <span>{new Date(map.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress Tab */}
                  {activeTab === 'progress' && (
                    <div className="space-y-6">
                      {!progress || !progress.baseline ? (
                        <div className="text-center py-12">
                          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No progress data</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Log and process flights to track progress over time.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Flights</h3>
                              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                                {progress.totalFlights}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Processed flights</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Baseline Date</h3>
                              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                                {new Date(progress.baseline.date).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">First processed flight</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Latest Update</h3>
                              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                                {progress.current ? new Date(progress.current.date).toLocaleDateString() : 'N/A'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Most recent flight</p>
                            </div>
                          </div>

                          {progress.weeklyProgress.length > 0 && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Flight History - Images Captured</h3>
                              <div className="flex items-end space-x-2 h-40">
                                {progress.weeklyProgress.map((week) => {
                                  const maxImages = Math.max(...progress.weeklyProgress.map(w => w.images))
                                  const heightPercent = maxImages > 0 ? (week.images / maxImages) * 100 : 0
                                  return (
                                    <div key={week.week} className="flex-1 flex flex-col items-center">
                                      <div
                                        className="w-full bg-blue-500 rounded-t transition-all"
                                        style={{ height: `${(heightPercent / 100) * 140}px`, minHeight: week.images > 0 ? '8px' : '0' }}
                                        title={`${week.images} images`}
                                      ></div>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">#{week.week}</span>
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Flight</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Images</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Area (acres)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {progress.weeklyProgress.map((w) => (
                                      <tr key={w.week}>
                                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">#{w.week}</td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{new Date(w.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{w.images}</td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{w.area}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Flight Detail Modal */}
      {selectedFlight && (
        <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Flight Details</h3>
              <button
                onClick={() => setSelectedFlight(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Date and Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(selectedFlight.flightDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${getStatusConfig(selectedFlight.status).bg} ${getStatusConfig(selectedFlight.status).text}`}>
                  {selectedFlight.status.replace('_', ' ')}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <Clock className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedFlight.duration}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">minutes</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <ImageIcon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedFlight.images}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">images</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <MapPin className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedFlight.area}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">acres</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pilot</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{selectedFlight.pilotName || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Plane className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Drone Model</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{selectedFlight.droneModel || 'Unknown'}</p>
                  </div>
                </div>
                {selectedFlight.notes && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      {selectedFlight.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedFlight(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Flight Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <form onSubmit={handleLogFlight}>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Log Flight</h3>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flight Date</label>
                  <input
                    type="date"
                    value={flightForm.flightDate}
                    onChange={(e) => setFlightForm({ ...flightForm, flightDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilot Name</label>
                  <input
                    type="text"
                    value={flightForm.pilotName}
                    onChange={(e) => setFlightForm({ ...flightForm, pilotName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Drone Model</label>
                  <input
                    type="text"
                    value={flightForm.droneModel}
                    onChange={(e) => setFlightForm({ ...flightForm, droneModel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., DJI Phantom 4 RTK"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={flightForm.duration}
                      onChange={(e) => setFlightForm({ ...flightForm, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Area (acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={flightForm.area}
                      onChange={(e) => setFlightForm({ ...flightForm, area: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Images</label>
                    <input
                      type="number"
                      value={flightForm.images}
                      onChange={(e) => setFlightForm({ ...flightForm, images: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={flightForm.notes}
                    onChange={(e) => setFlightForm({ ...flightForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Log Flight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flight Comparison Modal */}
      {showComparison && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-gray-900/90 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        }>
          <FlightComparison
            flights={flights.filter(f => f.status === 'PROCESSED')}
            onClose={() => setShowComparison(false)}
          />
        </Suspense>
      )}
    </div>
  )
}
