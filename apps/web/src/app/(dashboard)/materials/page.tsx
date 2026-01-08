'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/hooks/useSession'
import {
  Package,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  X,
  Filter,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  DollarSign,
  Warehouse,
  TrendingDown,
  ShoppingCart,
  Pencil,
  Trash2,
  Eye,
  TreePine,
  Zap,
  Droplets,
  Fan,
  Home,
  Square,
  Paintbrush,
  Grid3X3,
  Wrench,
  Shield,
  Package2,
  Layers,
  Ruler,
  MapPin,
  Building2,
} from 'lucide-react'

interface Material {
  id: string
  name: string
  description: string | null
  category: string
  sku: string | null
  unit: string
  quantity_on_hand: number
  minimum_quantity: number
  cost_per_unit: number
  supplier: string | null
  project_id: string | null
  project_name: string | null
  location: string | null
  status: string
  last_order_date: string | null
  last_delivery_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  total_value: number
  is_low_stock: boolean
  is_out_of_stock: boolean
}

interface Stats {
  total_count: number
  in_stock: number
  low_stock: number
  out_of_stock: number
  on_order: number
  total_value: number
}

interface Project {
  id: string
  name: string
}

// Category configurations
const CATEGORIES = [
  { value: 'LUMBER', label: 'Lumber', icon: TreePine, color: 'amber' },
  { value: 'CONCRETE', label: 'Concrete', icon: Layers, color: 'gray' },
  { value: 'STEEL', label: 'Steel', icon: Ruler, color: 'slate' },
  { value: 'ELECTRICAL', label: 'Electrical', icon: Zap, color: 'yellow' },
  { value: 'PLUMBING', label: 'Plumbing', icon: Droplets, color: 'blue' },
  { value: 'HVAC', label: 'HVAC', icon: Fan, color: 'cyan' },
  { value: 'ROOFING', label: 'Roofing', icon: Home, color: 'orange' },
  { value: 'DRYWALL', label: 'Drywall', icon: Square, color: 'stone' },
  { value: 'PAINT', label: 'Paint', icon: Paintbrush, color: 'purple' },
  { value: 'FLOORING', label: 'Flooring', icon: Grid3X3, color: 'brown' },
  { value: 'HARDWARE', label: 'Hardware', icon: Wrench, color: 'zinc' },
  { value: 'SAFETY', label: 'Safety', icon: Shield, color: 'red' },
  { value: 'OTHER', label: 'Other', icon: Package2, color: 'gray' },
]

const STATUSES = [
  { value: 'IN_STOCK', label: 'In Stock', color: 'green' },
  { value: 'LOW_STOCK', label: 'Low Stock', color: 'amber' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock', color: 'red' },
  { value: 'ON_ORDER', label: 'On Order', color: 'blue' },
  { value: 'DELIVERED', label: 'Delivered', color: 'green' },
]

const getCategoryConfig = (category: string) => {
  return CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1]
}

const getStatusConfig = (status: string) => {
  return STATUSES.find(s => s.value === status) || STATUSES[0]
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function MaterialsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [materials, setMaterials] = useState<Material[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'OTHER',
    sku: '',
    unit: 'each',
    quantityOnHand: 0,
    minimumQuantity: 0,
    costPerUnit: 0,
    supplier: '',
    projectId: '',
    location: '',
    notes: '',
  })

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = session?.user?.role === 'ADMIN'
  const isProjectManager = session?.user?.role === 'PROJECT_MANAGER'
  const canManage = isAdmin || isProjectManager

  // Fetch projects for filter
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || data || [])
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Fetch materials
  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', '25')

      if (searchQuery) params.set('search', searchQuery)
      if (categoryFilter) params.set('category', categoryFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (projectFilter) params.set('projectId', projectFilter)

      const response = await fetch(`/api/materials?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch materials')

      const data = await response.json()
      setMaterials(data.materials)
      setStats(data.stats)
      setTotalPages(data.total_pages)
      setTotal(data.total)
    } catch (err) {
      console.error('Error fetching materials:', err)
      setError('Failed to load materials')
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery, categoryFilter, statusFilter, projectFilter])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  // Show success message
  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Open modal for creating
  const handleCreateClick = () => {
    setFormData({
      name: '',
      description: '',
      category: 'OTHER',
      sku: '',
      unit: 'each',
      quantityOnHand: 0,
      minimumQuantity: 0,
      costPerUnit: 0,
      supplier: '',
      projectId: '',
      location: '',
      notes: '',
    })
    setSelectedMaterial(null)
    setModalMode('create')
    setFormError(null)
    setShowModal(true)
  }

  // Open modal for editing
  const handleEditClick = (material: Material) => {
    setFormData({
      name: material.name,
      description: material.description || '',
      category: material.category,
      sku: material.sku || '',
      unit: material.unit,
      quantityOnHand: material.quantity_on_hand,
      minimumQuantity: material.minimum_quantity,
      costPerUnit: material.cost_per_unit,
      supplier: material.supplier || '',
      projectId: material.project_id || '',
      location: material.location || '',
      notes: material.notes || '',
    })
    setSelectedMaterial(material)
    setModalMode('edit')
    setFormError(null)
    setShowModal(true)
  }

  // Navigate to material detail page
  const handleViewClick = (material: Material) => {
    router.push(`/materials/${material.id}`)
  }

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedMaterial(null)
    setFormError(null)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSaving(true)

    try {
      const url = modalMode === 'edit' && selectedMaterial
        ? `/api/materials/${selectedMaterial.id}`
        : '/api/materials'
      const method = modalMode === 'edit' ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save material')

      handleCloseModal()
      fetchMaterials()
      showSuccess(modalMode === 'create' ? 'Material added!' : 'Material updated!')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save material')
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/materials/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete material')
      }

      setDeleteConfirmId(null)
      fetchMaterials()
      showSuccess('Material deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete material')
    } finally {
      setDeleting(false)
    }
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('')
    setStatusFilter('')
    setProjectFilter('')
    setPage(1)
  }

  if (loading && materials.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading materials...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold">Materials</h1>
            </div>
            <p className="text-emerald-100">
              Track and manage construction materials inventory
            </p>
          </div>
          {canManage && (
            <button
              onClick={handleCreateClick}
              className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-600 rounded-xl font-semibold hover:bg-emerald-50 transition-all shadow-lg"
            >
              <Plus className="h-5 w-5" />
              Add Material
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Warehouse className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total_count}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Items</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.in_stock}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">In Stock</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.low_stock}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Low Stock</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.out_of_stock}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(stats.total_value)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Value</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 shadow-sm border border-red-100 dark:border-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 p-4 rounded-xl flex items-center gap-3 shadow-sm border border-green-100 dark:border-green-800 animate-pulse">
          <Check className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${
              showFilters || categoryFilter || statusFilter || projectFilter
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-5 w-5" />
            Filters
            {(categoryFilter || statusFilter || projectFilter) && (
              <span className="bg-white text-emerald-600 text-xs px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Statuses</option>
                  {STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project</label>
                <select
                  value={projectFilter}
                  onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Projects</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {(categoryFilter || statusFilter || projectFilter) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 text-sm font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Materials Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {materials.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No materials found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery || categoryFilter || statusFilter || projectFilter
                ? 'Try adjusting your filters'
                : 'Get started by adding your first material'}
            </p>
            {canManage && !searchQuery && !categoryFilter && !statusFilter && !projectFilter && (
              <button
                onClick={handleCreateClick}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all"
              >
                <Plus className="h-5 w-5" />
                Add Material
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {materials.map((material) => {
              const categoryConfig = getCategoryConfig(material.category)
              const statusConfig = getStatusConfig(material.status)
              const CategoryIcon = categoryConfig.icon

              return (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer"
                  onClick={() => handleViewClick(material)}
                >
                  <div className="flex items-center gap-4">
                    {/* Category Icon */}
                    <div className={`w-12 h-12 rounded-xl bg-${categoryConfig.color}-100 dark:bg-${categoryConfig.color}-900/30 flex items-center justify-center`}>
                      <CategoryIcon className={`h-6 w-6 text-${categoryConfig.color}-600 dark:text-${categoryConfig.color}-400`} />
                    </div>

                    {/* Material Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{material.name}</h3>
                        {material.is_out_of_stock && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium rounded-full">
                            Out of Stock
                          </span>
                        )}
                        {material.is_low_stock && !material.is_out_of_stock && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium rounded-full">
                            Low Stock
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>{categoryConfig.label}</span>
                        {material.sku && (
                          <span className="font-mono">{material.sku}</span>
                        )}
                        {material.project_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {material.project_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Quantity */}
                    <div className="text-right hidden md:block">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {material.quantity_on_hand} {material.unit}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Min: {material.minimum_quantity}
                      </div>
                    </div>

                    {/* Value */}
                    <div className="text-right hidden lg:block">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(material.cost_per_unit)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Total: {formatCurrency(material.total_value)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canManage && deleteConfirmId === material.id ? (
                        <>
                          <span className="text-sm text-red-600 dark:text-red-400 mr-2">Delete?</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(material.id); }}
                            disabled={deleting}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                          >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/materials/${material.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {canManage && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditClick(material); }}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-400"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(material.id); }}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 dark:text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((page - 1) * 25) + 1} to {Math.min(page * 25, total)} of {total} materials
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (modalMode === 'create' || modalMode === 'edit') && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => { if (e.key === 'Escape') handleCloseModal(); }}
        >
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal} />

            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      {modalMode === 'create' ? <Plus className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
                    </div>
                    <h3 className="text-xl font-bold">
                      {modalMode === 'create' ? 'Add Material' : 'Edit Material'}
                    </h3>
                  </div>
                  <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {formError && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2 border border-red-100">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="2x4x8 Lumber"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="LUM-2x4x8"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Quantity on Hand
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.quantityOnHand}
                      onChange={(e) => setFormData({ ...formData, quantityOnHand: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="each, linear ft, sq ft..."
                    />
                  </div>

                  {/* Minimum Quantity */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.minimumQuantity}
                      onChange={(e) => setFormData({ ...formData, minimumQuantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {/* Cost per Unit */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Cost per Unit ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPerUnit}
                      onChange={(e) => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Supplier
                    </label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Home Depot Pro"
                    />
                  </div>

                  {/* Project */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Project
                    </label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">No Project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Storage Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Lot A - North Side"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Additional details about this material..."
                    />
                  </div>

                  {/* Notes */}
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Internal notes..."
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        {modalMode === 'create' ? 'Add Material' : 'Save Changes'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
