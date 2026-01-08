'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from '@/hooks/useSession'
import {
  ArrowLeft,
  Package,
  ShoppingCart,
  TrendingDown,
  Plus,
  Trash2,
  Pencil,
  Calendar,
  User,
  Loader2,
  AlertCircle,
  Check,
  X,
  AlertTriangle,
  DollarSign,
  Truck,
  MapPin,
  Building2,
  Clock,
  FileText,
  ChevronRight,
  ChevronLeft,
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

interface MaterialOrder {
  id: string
  material_id: string
  material_name: string | null
  quantity: number
  cost_per_unit: number
  total_cost: number
  supplier: string
  order_date: string
  expected_delivery_date: string | null
  actual_delivery_date: string | null
  status: string
  ordered_by_name: string | null
  notes: string | null
}

interface MaterialUsage {
  id: string
  material_id: string
  project_id: string
  project_name: string | null
  quantity: number
  cost_per_unit: number
  total_cost: number
  used_by_name: string | null
  usage_date: string
  daily_log_id: string | null
  notes: string | null
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

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'SHIPPED', label: 'Shipped', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'DELIVERED', label: 'Delivered', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
]

const getCategoryConfig = (category: string) => {
  return CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1]
}

const getOrderStatusConfig = (status: string) => {
  return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0]
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface MaterialDetailClientProps {
  materialId: string
}

export function MaterialDetailClient({ materialId }: MaterialDetailClientProps) {
  const { data: session } = useSession()
  const [material, setMaterial] = useState<Material | null>(null)
  const [orders, setOrders] = useState<MaterialOrder[]>([])
  const [usages, setUsages] = useState<MaterialUsage[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [usagesLoading, setUsagesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'orders' | 'usage'>('details')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Order modal
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderSaving, setOrderSaving] = useState(false)
  const [orderForm, setOrderForm] = useState({
    quantity: '',
    costPerUnit: '',
    supplier: '',
    expectedDeliveryDate: '',
    notes: '',
  })

  // Usage modal
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [usageSaving, setUsageSaving] = useState(false)
  const [usageForm, setUsageForm] = useState({
    projectId: '',
    quantity: '',
    notes: '',
  })

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: '',
    sku: '',
    unit: '',
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
  const [deleteType, setDeleteType] = useState<'order' | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = session?.user?.role === 'ADMIN'
  const isProjectManager = session?.user?.role === 'PROJECT_MANAGER'
  const canManage = isAdmin || isProjectManager

  // Show success message
  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Fetch material
  const fetchMaterial = useCallback(async () => {
    try {
      const res = await fetch(`/api/materials/${materialId}`)
      if (!res.ok) {
        setError(res.status === 404 ? 'Material not found' : 'Failed to load material')
        return
      }
      const data = await res.json()
      setMaterial(data)
    } catch {
      setError('Failed to load material')
    } finally {
      setLoading(false)
    }
  }, [materialId])

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const res = await fetch(`/api/materials/orders?materialId=${materialId}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (e) {
      console.error('Error fetching orders:', e)
    } finally {
      setOrdersLoading(false)
    }
  }, [materialId])

  // Fetch usage
  const fetchUsages = useCallback(async () => {
    setUsagesLoading(true)
    try {
      const res = await fetch(`/api/materials/usage?materialId=${materialId}`)
      if (res.ok) {
        const data = await res.json()
        setUsages(data.usages || [])
      }
    } catch (e) {
      console.error('Error fetching usage:', e)
    } finally {
      setUsagesLoading(false)
    }
  }, [materialId])

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || data || [])
      }
    } catch (e) {
      console.error('Error fetching projects:', e)
    }
  }, [])

  useEffect(() => {
    if (materialId) {
      fetchMaterial()
      fetchOrders()
      fetchUsages()
      fetchProjects()
    }
  }, [materialId, fetchMaterial, fetchOrders, fetchUsages, fetchProjects])

  // Initialize edit form when material loads
  useEffect(() => {
    if (material) {
      setEditForm({
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
      setOrderForm(prev => ({
        ...prev,
        costPerUnit: material.cost_per_unit.toString(),
        supplier: material.supplier || '',
      }))
    }
  }, [material])

  // Handle order submission
  const handleOrderSubmit = async () => {
    if (!orderForm.quantity || !orderForm.supplier) return
    setOrderSaving(true)

    try {
      const body: Record<string, unknown> = {
        materialId,
        quantity: parseFloat(orderForm.quantity),
        supplier: orderForm.supplier,
      }
      if (orderForm.costPerUnit) body.costPerUnit = parseFloat(orderForm.costPerUnit)
      if (orderForm.expectedDeliveryDate) body.expectedDeliveryDate = orderForm.expectedDeliveryDate
      if (orderForm.notes) body.notes = orderForm.notes

      const res = await fetch('/api/materials/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchOrders()
        await fetchMaterial()
        setShowOrderModal(false)
        setOrderForm({
          quantity: '',
          costPerUnit: material?.cost_per_unit.toString() || '',
          supplier: material?.supplier || '',
          expectedDeliveryDate: '',
          notes: '',
        })
        showSuccess('Order created successfully')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create order')
      }
    } catch (e) {
      console.error('Error creating order:', e)
      setError('Failed to create order')
    } finally {
      setOrderSaving(false)
    }
  }

  // Handle order status update
  const handleOrderStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/materials/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        await fetchOrders()
        await fetchMaterial()
        showSuccess(`Order marked as ${newStatus.toLowerCase()}`)
      }
    } catch (e) {
      console.error('Error updating order:', e)
    }
  }

  // Handle order delete
  const handleOrderDelete = async (orderId: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/materials/orders/${orderId}`, { method: 'DELETE' })
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId))
        setDeleteConfirmId(null)
        setDeleteType(null)
        showSuccess('Order deleted')
      }
    } catch (e) {
      console.error('Error deleting order:', e)
    } finally {
      setDeleting(false)
    }
  }

  // Handle usage submission
  const handleUsageSubmit = async () => {
    if (!usageForm.projectId || !usageForm.quantity) return
    setUsageSaving(true)

    try {
      const body: Record<string, unknown> = {
        materialId,
        projectId: usageForm.projectId,
        quantity: parseFloat(usageForm.quantity),
      }
      if (usageForm.notes) body.notes = usageForm.notes

      const res = await fetch('/api/materials/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchUsages()
        await fetchMaterial()
        setShowUsageModal(false)
        setUsageForm({ projectId: '', quantity: '', notes: '' })
        showSuccess('Usage recorded successfully')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to record usage')
      }
    } catch (e) {
      console.error('Error recording usage:', e)
      setError('Failed to record usage')
    } finally {
      setUsageSaving(false)
    }
  }

  // Handle edit submission
  const handleEditSubmit = async () => {
    if (!editForm.name) return
    setEditSaving(true)

    try {
      const res = await fetch(`/api/materials/${materialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (res.ok) {
        await fetchMaterial()
        setShowEditModal(false)
        showSuccess('Material updated successfully')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update material')
      }
    } catch (e) {
      console.error('Error updating material:', e)
      setError('Failed to update material')
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error || !material) {
    return (
      <div className="space-y-6">
        <Link href="/materials" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
          <ArrowLeft className="h-4 w-4" /> Back to Materials
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{error || 'Material not found'}</h3>
          <p className="text-gray-600 dark:text-gray-400">The material does not exist or you do not have permission to view it.</p>
        </div>
      </div>
    )
  }

  const categoryConfig = getCategoryConfig(material.category)
  const CategoryIcon = categoryConfig.icon

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/materials" className="p-2 rounded-lg hover:bg-white/20 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <CategoryIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{material.name}</h1>
                <div className="flex items-center gap-3 text-emerald-100 text-sm mt-1">
                  <span>{categoryConfig.label}</span>
                  {material.sku && (
                    <>
                      <span>|</span>
                      <span className="font-mono">{material.sku}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {material.is_out_of_stock ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-red-500/20 text-white">
                <AlertTriangle className="h-4 w-4" />
                Out of Stock
              </span>
            ) : material.is_low_stock ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-amber-500/20 text-white">
                <TrendingDown className="h-4 w-4" />
                Low Stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white">
                <Check className="h-4 w-4" />
                In Stock
              </span>
            )}
            {canManage && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl font-medium hover:bg-white/30 transition-all"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {material.quantity_on_hand}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{material.unit} on hand</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {material.minimum_quantity}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Min quantity</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(material.cost_per_unit)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">per {material.unit}</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(material.total_value)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total value</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Details
              </div>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'orders'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Orders
                {orders.length > 0 && (
                  <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                    {orders.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'usage'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Usage History
                {usages.length > 0 && (
                  <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                    {usages.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Material Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Category</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{categoryConfig.label}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">SKU</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100">{material.sku || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Unit</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{material.unit}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Supplier</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{material.supplier || '-'}</span>
                    </div>
                    {material.project_name && (
                      <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">Project</span>
                        <span className="flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100">
                          <Building2 className="h-4 w-4" />
                          {material.project_name}
                        </span>
                      </div>
                    )}
                    {material.location && (
                      <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">Location</span>
                        <span className="flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100">
                          <MapPin className="h-4 w-4" />
                          {material.location}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Inventory Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Quantity on Hand</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {material.quantity_on_hand} {material.unit}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Minimum Quantity</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {material.minimum_quantity} {material.unit}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Cost per Unit</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(material.cost_per_unit)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Total Value</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(material.total_value)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Last Order</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(material.last_order_date)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Last Delivery</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(material.last_delivery_date)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description and Notes */}
              {(material.description || material.notes) && (
                <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  {material.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                      <p className="text-gray-600 dark:text-gray-400">{material.description}</p>
                    </div>
                  )}
                  {material.notes && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</h4>
                      <p className="text-gray-600 dark:text-gray-400">{material.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              {canManage && (
                <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Create Order
                  </button>
                  <button
                    onClick={() => setShowUsageModal(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
                  >
                    <TrendingDown className="h-5 w-5" />
                    Record Usage
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Order History</h3>
                {canManage && (
                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    New Order
                  </button>
                )}
              </div>

              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No orders yet</p>
                  {canManage && (
                    <button
                      onClick={() => setShowOrderModal(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                      Create first order
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map(order => {
                    const statusConfig = getOrderStatusConfig(order.status)
                    return (
                      <div
                        key={order.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                              <Truck className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatDate(order.order_date)}
                                </span>
                              </div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {order.quantity} {material.unit} from {order.supplier}
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4" />
                                  {formatCurrency(order.total_cost)}
                                </span>
                                {order.expected_delivery_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Expected: {formatDate(order.expected_delivery_date)}
                                  </span>
                                )}
                                {order.ordered_by_name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {order.ordered_by_name}
                                  </span>
                                )}
                              </div>
                              {order.notes && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{order.notes}</p>
                              )}
                            </div>
                          </div>

                          {canManage && (
                            <div className="flex items-center gap-2">
                              {order.status === 'PENDING' && (
                                <button
                                  onClick={() => handleOrderStatusUpdate(order.id, 'CONFIRMED')}
                                  className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                >
                                  Confirm
                                </button>
                              )}
                              {order.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleOrderStatusUpdate(order.id, 'SHIPPED')}
                                  className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                >
                                  Mark Shipped
                                </button>
                              )}
                              {order.status === 'SHIPPED' && (
                                <button
                                  onClick={() => handleOrderStatusUpdate(order.id, 'DELIVERED')}
                                  className="px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50"
                                >
                                  Mark Delivered
                                </button>
                              )}
                              {deleteConfirmId === order.id && deleteType === 'order' ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleOrderDelete(order.id)}
                                    disabled={deleting}
                                    className="text-red-600 text-sm font-medium"
                                  >
                                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                                  </button>
                                  <button
                                    onClick={() => { setDeleteConfirmId(null); setDeleteType(null); }}
                                    className="text-gray-500 text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setDeleteConfirmId(order.id); setDeleteType('order'); }}
                                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Usage Tab */}
          {activeTab === 'usage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Usage History</h3>
                {canManage && (
                  <button
                    onClick={() => setShowUsageModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Record Usage
                  </button>
                )}
              </div>

              {usagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : usages.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingDown className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No usage recorded yet</p>
                  {canManage && (
                    <button
                      onClick={() => setShowUsageModal(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                      Record first usage
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {usages.map(usage => (
                    <div
                      key={usage.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {usage.quantity} {material.unit} used
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(usage.usage_date)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {usage.project_name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {usage.project_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {formatCurrency(usage.total_cost)}
                            </span>
                            {usage.used_by_name && (
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {usage.used_by_name}
                              </span>
                            )}
                            {usage.daily_log_id && (
                              <Link
                                href={`/daily-logs/${usage.daily_log_id}`}
                                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                              >
                                <FileText className="h-4 w-4" />
                                View Daily Log
                              </Link>
                            )}
                          </div>
                          {usage.notes && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{usage.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Order</h2>
              <button onClick={() => setShowOrderModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-400 dark:text-gray-300" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={orderForm.quantity}
                  onChange={e => setOrderForm(p => ({ ...p, quantity: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder={`Enter quantity in ${material.unit}`}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cost per Unit ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderForm.costPerUnit}
                  onChange={e => setOrderForm(p => ({ ...p, costPerUnit: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Supplier *</label>
                <input
                  type="text"
                  value={orderForm.supplier}
                  onChange={e => setOrderForm(p => ({ ...p, supplier: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Expected Delivery Date</label>
                <input
                  type="date"
                  value={orderForm.expectedDeliveryDate}
                  onChange={e => setOrderForm(p => ({ ...p, expectedDeliveryDate: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea
                  value={orderForm.notes}
                  onChange={e => setOrderForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowOrderModal(false)}
                className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleOrderSubmit}
                disabled={orderSaving || !orderForm.quantity || !orderForm.supplier}
                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {orderSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Modal */}
      {showUsageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Record Usage</h2>
              <button onClick={() => setShowUsageModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-400 dark:text-gray-300" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Project *</label>
                <select
                  value={usageForm.projectId}
                  onChange={e => setUsageForm(p => ({ ...p, projectId: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Quantity * <span className="font-normal text-gray-500">(Available: {material.quantity_on_hand} {material.unit})</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={material.quantity_on_hand}
                  step="any"
                  value={usageForm.quantity}
                  onChange={e => setUsageForm(p => ({ ...p, quantity: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder={`Enter quantity in ${material.unit}`}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea
                  value={usageForm.notes}
                  onChange={e => setUsageForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="What was this material used for?"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUsageModal(false)}
                className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleUsageSubmit}
                disabled={usageSaving || !usageForm.projectId || !usageForm.quantity}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {usageSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                Record Usage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Material</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-400 dark:text-gray-300" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">SKU</label>
                <input
                  type="text"
                  value={editForm.sku}
                  onChange={e => setEditForm(p => ({ ...p, sku: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quantity on Hand</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editForm.quantityOnHand}
                  onChange={e => setEditForm(p => ({ ...p, quantityOnHand: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Unit</label>
                <input
                  type="text"
                  value={editForm.unit}
                  onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Minimum Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editForm.minimumQuantity}
                  onChange={e => setEditForm(p => ({ ...p, minimumQuantity: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cost per Unit ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.costPerUnit}
                  onChange={e => setEditForm(p => ({ ...p, costPerUnit: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Supplier</label>
                <input
                  type="text"
                  value={editForm.supplier}
                  onChange={e => setEditForm(p => ({ ...p, supplier: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Project</label>
                <select
                  value={editForm.projectId}
                  onChange={e => setEditForm(p => ({ ...p, projectId: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">No Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Storage Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editSaving || !editForm.name}
                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
