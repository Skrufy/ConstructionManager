'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { useSettings, type DailyLogAccessLevel, type RoleDataAccess } from '@/components/providers/settings-provider'
import {
  Settings,
  Building2,
  Bell,
  Shield,
  Palette,
  LayoutGrid,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Calendar,
  Truck,
  Image,
  DollarSign,
  BarChart3,
  TrendingUp,
  HardHat,
  Award,
  Plane,
  CheckSquare,
  AlertTriangle,
  FolderKanban,
  Link2,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Users,
  Eye,
  LockKeyhole,
  Database,
  RefreshCw,
  Upload,
  X,
  ImageIcon,
} from 'lucide-react'
import Link from 'next/link'
import NextImage from 'next/image'
import { Toggle } from '@/components/ui/toggle'
import { MODULE_ROLE_DEFAULTS } from '@/lib/permissions'
import { useToast } from '@/components/ui/toast'

// Module configuration
const MODULES = [
  { key: 'moduleProjects', name: 'Projects', description: 'Project management and tracking', icon: FolderKanban },
  { key: 'moduleDailyLogs', name: 'Daily Logs', description: 'Daily work logs and reports', icon: FileText },
  { key: 'moduleTimeTracking', name: 'Time Tracking', description: 'Clock in/out and timesheet management', icon: Clock },
  { key: 'moduleScheduling', name: 'Scheduling', description: 'Crew scheduling and calendar', icon: Calendar },
  { key: 'moduleEquipment', name: 'Equipment', description: 'Equipment inventory and tracking', icon: Truck },
  { key: 'moduleDocuments', name: 'Documents', description: 'Document and photo management', icon: Image },
  { key: 'moduleSafety', name: 'Quality & Safety', description: 'Inspections, incidents, and safety meetings', icon: Shield },
  { key: 'moduleFinancials', name: 'Financials', description: 'Budgets, invoices, and expenses', icon: DollarSign },
  { key: 'moduleReports', name: 'Reports', description: 'Report generation and exports', icon: BarChart3 },
  { key: 'moduleAnalytics', name: 'Analytics', description: 'Advanced analytics and forecasting', icon: TrendingUp },
  { key: 'moduleSubcontractors', name: 'Subcontractors', description: 'Subcontractor directory and management', icon: HardHat },
  { key: 'moduleCertifications', name: 'Certifications', description: 'License and certification tracking', icon: Award },
  { key: 'moduleDroneDeploy', name: 'DroneDeploy', description: 'Drone flight logging and mapping', icon: Plane },
  { key: 'moduleApprovals', name: 'Approvals', description: 'Time and log approval workflow', icon: CheckSquare },
  { key: 'moduleWarnings', name: 'Employee Warnings', description: 'Employee discipline tracking', icon: AlertTriangle },
] as const

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'UTC' },
]

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (International)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
]

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'EUR', label: 'Euro (\u20AC)' },
  { value: 'GBP', label: 'British Pound (\u00A3)' },
  { value: 'MXN', label: 'Mexican Peso (MX$)' },
]

type TabType = 'company' | 'modules' | 'integrations' | 'roleAccess' | 'features' | 'notifications' | 'preferences'

export default function SettingsPage() {
  const { data: session } = useSession()
  const { company, user, updateCompanySettings, updateUserPreferences, loading, error } = useSettings()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('company')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Local form state
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    timezone: '',
    dateFormat: '',
    currency: '',
  })

  // Branding state
  const [brandingForm, setBrandingForm] = useState({
    companyLogo: '' as string | null,
    companyFavicon: '' as string | null,
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  const [moduleForm, setModuleForm] = useState<Record<string, boolean>>({})

  // Role-based access control state
  const [selectedRole, setSelectedRole] = useState<string>('FIELD_WORKER')
  const [roleModuleOverrides, setRoleModuleOverrides] = useState<Record<string, Record<string, boolean>>>({})
  const [roleDataAccess, setRoleDataAccess] = useState<RoleDataAccess>({})

  const [featureForm, setFeatureForm] = useState({
    allowFieldWorkerSafety: false,
    allowFieldWorkerScheduling: false,
    fieldWorkerDailyLogAccess: 'ASSIGNED_PROJECTS' as 'ALL' | 'ASSIGNED_PROJECTS' | 'OWN_ONLY',
    requireGpsClockIn: false,
    requirePhotoDaily: false,
    autoApproveTimesheet: false,
    dailyLogReminders: true,
    certExpiryAlertDays: 30,
    maxFileUploadMB: 50,
    autoDeleteDocuments: false,
    autoDeleteDocumentsYears: 2,
    activitiesEnabled: true,
    dailyLogApprovalRequired: true,
    hideBuildingInfo: false,
  })

  // OCR settings (separate from company settings)
  const [ocrSettings, setOcrSettings] = useState({
    ocrEnabled: true,
    ocrProvider: 'openai' as 'openai' | 'google' | 'none',
  })
  const [ocrLoading, setOcrLoading] = useState(true)

  // Storage health check state
  const [storageHealth, setStorageHealth] = useState<{
    checked: boolean
    loading: boolean
    result: {
      healthy: boolean
      status: string
      bucket: string
      checks: Array<{
        name: string
        status: 'pass' | 'fail' | 'warn'
        message: string
        details?: Record<string, unknown>
      }>
      summary?: { total: number; passed: number; warnings: number; failures: number }
    } | null
    error: string | null
  }>({ checked: false, loading: false, result: null, error: null })

  // Available roles for configuration
  const CONFIGURABLE_ROLES = [
    { value: 'VIEWER', label: 'Viewer', description: 'Read-only access users', icon: Eye },
    { value: 'FIELD_WORKER', label: 'Field Worker', description: 'Entry-level workers on job sites', icon: HardHat },
    { value: 'CREW_LEADER', label: 'Crew Leader', description: 'Lead a specific crew or trade', icon: HardHat },
    { value: 'OFFICE', label: 'Office Staff', description: 'Administrative and back-office tasks', icon: Clock },
    { value: 'FOREMAN', label: 'Foreman', description: 'Site supervisors overseeing operations', icon: Shield },
    { value: 'ARCHITECT', label: 'Architect/Engineer', description: 'Design professionals with document access', icon: FileText },
    { value: 'DEVELOPER', label: 'Developer', description: 'Real estate developers/clients', icon: DollarSign },
    { value: 'PROJECT_MANAGER', label: 'Project Manager', description: 'Project leads with full access', icon: FolderKanban },
  ]

  const [notificationForm, setNotificationForm] = useState({
    emailNotifications: true,
    pushNotifications: false,
  })

  const [preferenceForm, setPreferenceForm] = useState({
    theme: 'light',
    itemsPerPage: 25,
    showCompletedTasks: true,
    defaultView: 'list',
    emailDailyDigest: true,
    emailApprovals: true,
    emailCertExpiry: true,
  })

  // Initialize forms when data loads
  useEffect(() => {
    if (company) {
      setCompanyForm({
        companyName: company.companyName,
        timezone: company.timezone,
        dateFormat: company.dateFormat,
        currency: company.currency,
      })
      setBrandingForm({
        companyLogo: company.companyLogo ?? null,
        companyFavicon: company.companyFavicon ?? null,
      })
      setModuleForm({
        moduleProjects: company.moduleProjects,
        moduleDailyLogs: company.moduleDailyLogs,
        moduleTimeTracking: company.moduleTimeTracking,
        moduleScheduling: company.moduleScheduling,
        moduleEquipment: company.moduleEquipment,
        moduleDocuments: company.moduleDocuments,
        moduleSafety: company.moduleSafety,
        moduleFinancials: company.moduleFinancials,
        moduleReports: company.moduleReports,
        moduleAnalytics: company.moduleAnalytics,
        moduleSubcontractors: company.moduleSubcontractors,
        moduleCertifications: company.moduleCertifications,
        moduleDroneDeploy: company.moduleDroneDeploy,
        moduleApprovals: company.moduleApprovals,
        moduleWarnings: company.moduleWarnings,
      })
      setFeatureForm({
        allowFieldWorkerSafety: company.allowFieldWorkerSafety ?? false,
        allowFieldWorkerScheduling: company.allowFieldWorkerScheduling ?? false,
        fieldWorkerDailyLogAccess: company.fieldWorkerDailyLogAccess ?? 'ASSIGNED_PROJECTS',
        requireGpsClockIn: company.requireGpsClockIn,
        requirePhotoDaily: company.requirePhotoDaily,
        autoApproveTimesheet: company.autoApproveTimesheet,
        dailyLogReminders: company.dailyLogReminders,
        certExpiryAlertDays: company.certExpiryAlertDays,
        maxFileUploadMB: company.maxFileUploadMB,
        autoDeleteDocuments: company.autoDeleteDocuments ?? false,
        autoDeleteDocumentsYears: company.autoDeleteDocumentsYears ?? 2,
        activitiesEnabled: company.activitiesEnabled ?? true,
        dailyLogApprovalRequired: company.dailyLogApprovalRequired ?? true,
        hideBuildingInfo: company.hideBuildingInfo ?? false,
      })
      setNotificationForm({
        emailNotifications: company.emailNotifications,
        pushNotifications: company.pushNotifications,
      })
      // Initialize role overrides from company settings
      const overrides = company.roleModuleOverrides as Record<string, Record<string, boolean>> | undefined
      if (overrides && typeof overrides === 'object') {
        setRoleModuleOverrides(overrides)
      }
      const dataAccess = company.roleDataAccess as RoleDataAccess | undefined
      if (dataAccess && typeof dataAccess === 'object') {
        setRoleDataAccess(dataAccess)
      }
    }
    if (user) {
      setPreferenceForm({
        theme: user.theme,
        itemsPerPage: user.itemsPerPage,
        showCompletedTasks: user.showCompletedTasks,
        defaultView: user.defaultView,
        emailDailyDigest: user.emailDailyDigest,
        emailApprovals: user.emailApprovals,
        emailCertExpiry: user.emailCertExpiry,
      })
    }
  }, [company, user])

  // Load OCR settings separately
  useEffect(() => {
    async function loadOcrSettings() {
      try {
        const response = await fetch('/api/settings/org')
        if (response.ok) {
          const data = await response.json()
          if (data.settings) {
            setOcrSettings({
              ocrEnabled: data.settings.ocrEnabled ?? true,
              ocrProvider: data.settings.ocrProvider ?? 'openai',
            })
          }
        }
      } catch (error) {
        console.error('Failed to load OCR settings:', error)
      } finally {
        setOcrLoading(false)
      }
    }
    loadOcrSettings()
  }, [])

  // Save OCR settings
  const saveOcrSettings = async () => {
    try {
      const response = await fetch('/api/settings/org', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ocrSettings),
      })
      if (!response.ok) {
        throw new Error('Failed to save OCR settings')
      }
      return true
    } catch (error) {
      console.error('Failed to save OCR settings:', error)
      throw error
    }
  }

  // Check storage health
  const checkStorageHealth = async () => {
    setStorageHealth(prev => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch('/api/storage/health')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to check storage health')
      }
      const data = await response.json()
      setStorageHealth({ checked: true, loading: false, result: data, error: null })
    } catch (error) {
      setStorageHealth({
        checked: true,
        loading: false,
        result: null,
        error: error instanceof Error ? error.message : 'Failed to check storage health',
      })
    }
  }

  const isAdmin = session?.user?.role === 'ADMIN'

  // Set default tab to 'preferences' for non-admin users
  useEffect(() => {
    if (session && !isAdmin && activeTab === 'company') {
      setActiveTab('preferences')
    }
  }, [session, isAdmin, activeTab])

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)

    try {
      if (activeTab === 'company' && isAdmin) {
        await updateCompanySettings({
          ...companyForm,
          ...brandingForm,
        })
      } else if (activeTab === 'modules' && isAdmin) {
        await updateCompanySettings(moduleForm)
      } else if (activeTab === 'roleAccess' && isAdmin) {
        // Save all role access settings
        await updateCompanySettings({
          // Legacy Field Worker overrides (for backwards compatibility)
          allowFieldWorkerSafety: roleModuleOverrides['FIELD_WORKER']?.moduleSafety ?? featureForm.allowFieldWorkerSafety,
          allowFieldWorkerScheduling: roleModuleOverrides['FIELD_WORKER']?.moduleScheduling ?? featureForm.allowFieldWorkerScheduling,
          fieldWorkerDailyLogAccess: (roleDataAccess['FIELD_WORKER']?.dailyLogAccess as 'ALL' | 'ASSIGNED_PROJECTS' | 'OWN_ONLY') ?? featureForm.fieldWorkerDailyLogAccess,
          // New role-based overrides
          roleModuleOverrides,
          roleDataAccess,
        })
      } else if (activeTab === 'features' && isAdmin) {
        await updateCompanySettings(featureForm)
        // Also save OCR settings
        await saveOcrSettings()
      } else if (activeTab === 'notifications' && isAdmin) {
        await updateCompanySettings(notificationForm)
      } else if (activeTab === 'preferences') {
        await updateUserPreferences(preferenceForm)
      }

      // No need for refreshSettings - optimistic updates already applied
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings. Please try again.'
      setSaveMessage({ type: 'error', text: message })
    } finally {
      setSaving(false)
    }
  }

  const toggleModule = (key: string) => {
    setModuleForm(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Handle image upload for branding
  const handleBrandingUpload = async (
    file: File,
    type: 'logo' | 'favicon'
  ) => {
    if (type === 'logo') setUploadingLogo(true)
    else setUploadingFavicon(true)

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      // Upload to storage
      const response = await fetch('/api/storage/branding', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const { url } = await response.json()

      // Update form state
      if (type === 'logo') {
        setBrandingForm(prev => ({ ...prev, companyLogo: url }))
      } else {
        setBrandingForm(prev => ({ ...prev, companyFavicon: url }))
      }

      toast.success('Upload complete', `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      toast.error('Upload failed', message)
    } finally {
      if (type === 'logo') setUploadingLogo(false)
      else setUploadingFavicon(false)
    }
  }

  const removeBrandingImage = (type: 'logo' | 'favicon') => {
    if (type === 'logo') {
      setBrandingForm(prev => ({ ...prev, companyLogo: null }))
    } else {
      setBrandingForm(prev => ({ ...prev, companyFavicon: null }))
    }
  }

  const tabs: { id: TabType; name: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] = [
    { id: 'company', name: 'Company', icon: Building2, adminOnly: true },
    { id: 'modules', name: 'Modules', icon: LayoutGrid, adminOnly: true },
    { id: 'integrations', name: 'Integrations', icon: Link2, adminOnly: true },
    { id: 'roleAccess', name: 'Role Access', icon: Users, adminOnly: true },
    { id: 'features', name: 'Features', icon: Settings, adminOnly: true },
    { id: 'notifications', name: 'Notifications', icon: Bell, adminOnly: true },
    { id: 'preferences', name: 'My Preferences', icon: Palette },
  ]

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Failed to Load Settings</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error.message}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-primary-100">
                Manage your application settings and preferences
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-6 py-3 bg-white text-primary-700 font-semibold text-base rounded-xl hover:bg-primary-50 disabled:opacity-50 transition-colors shadow-sm min-h-[48px]"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${
          saveMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {saveMessage.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {saveMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6 px-4 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-5 px-2 border-b-2 font-semibold text-base flex items-center gap-3 whitespace-nowrap min-h-[48px] ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Company Settings */}
          {activeTab === 'company' && isAdmin && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Company Information</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={companyForm.companyName}
                      onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                      className="input"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">This name appears in the sidebar and reports</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                    <select
                      value={companyForm.timezone}
                      onChange={(e) => setCompanyForm({ ...companyForm, timezone: e.target.value })}
                      className="input"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Format</label>
                    <select
                      value={companyForm.dateFormat}
                      onChange={(e) => setCompanyForm({ ...companyForm, dateFormat: e.target.value })}
                      className="input"
                    >
                      {DATE_FORMATS.map((df) => (
                        <option key={df.value} value={df.value}>{df.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                    <select
                      value={companyForm.currency}
                      onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                      className="input"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Branding Section */}
              <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Branding</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Customize your company logo and favicon. These will appear in the app navigation and browser tab.
                </p>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  {/* Company Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Company Logo</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Recommended: 400x120px, PNG or SVG with transparent background
                    </p>
                    {brandingForm.companyLogo ? (
                      <div className="relative inline-block">
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800">
                          <NextImage
                            src={brandingForm.companyLogo}
                            alt="Company Logo"
                            width={200}
                            height={60}
                            className="h-15 w-auto object-contain"
                          />
                        </div>
                        <button
                          onClick={() => removeBrandingImage('logo')}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                          title="Remove logo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {uploadingLogo ? (
                            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                          ) : (
                            <>
                              <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG up to 2MB</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/png,image/jpeg,image/svg+xml"
                          disabled={uploadingLogo}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleBrandingUpload(file, 'logo')
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Favicon Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Favicon</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Recommended: 32x32px or 64x64px, PNG or ICO format
                    </p>
                    {brandingForm.companyFavicon ? (
                      <div className="relative inline-block">
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800">
                          <NextImage
                            src={brandingForm.companyFavicon}
                            alt="Favicon"
                            width={64}
                            height={64}
                            className="h-16 w-16 object-contain"
                          />
                        </div>
                        <button
                          onClick={() => removeBrandingImage('favicon')}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                          title="Remove favicon"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {uploadingFavicon ? (
                            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                          ) : (
                            <>
                              <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-medium text-primary-600">Click to upload</span>
                              </p>
                              <p className="text-xs text-gray-400 mt-1">PNG, ICO up to 500KB</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/png,image/x-icon,image/vnd.microsoft.icon"
                          disabled={uploadingFavicon}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleBrandingUpload(file, 'favicon')
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  Note: Click &quot;Save Changes&quot; after uploading to apply your branding across the app.
                </p>
              </div>
            </div>
          )}

          {/* Module Settings */}
          {activeTab === 'modules' && isAdmin && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Enable/Disable Modules</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Toggle modules on or off to customize the application for your workflow. Disabled modules will be hidden from the navigation.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {MODULES.map((module) => {
                    const isEnabled = moduleForm[module.key] ?? true
                    return (
                      <div
                        key={module.key}
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          isEnabled
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-gray-50 opacity-75'
                        }`}
                        onClick={() => toggleModule(module.key)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary-100' : 'bg-gray-200'}`}>
                              <module.icon className={`h-5 w-5 ${isEnabled ? 'text-primary-600' : 'text-gray-400'}`} />
                            </div>
                            <div>
                              <h4 className={`font-medium ${isEnabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
                                {module.name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{module.description}</p>
                            </div>
                          </div>
                          {isEnabled ? (
                            <ToggleRight className="h-6 w-6 text-primary-600 flex-shrink-0" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && isAdmin && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Third-Party Integrations</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Connect your favorite tools and services to streamline your workflow.
                </p>

                <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-6 border border-primary-200">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <Link2 className="h-8 w-8 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Manage All Integrations</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Configure QuickBooks, DroneDeploy, Samsara, and more from the dedicated integrations page.
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/admin/integrations"
                      className="btn btn-primary inline-flex items-center gap-2"
                    >
                      Open Integrations
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: 'QuickBooks', desc: 'Accounting & invoicing', status: 'available' },
                    { name: 'DroneDeploy', desc: 'Aerial mapping', status: 'available' },
                    { name: 'Samsara', desc: 'Fleet tracking', status: 'available' },
                    { name: 'Google Maps', desc: 'Location services', status: 'available' },
                    { name: 'AWS S3', desc: 'File storage', status: 'available' },
                    { name: 'OpenWeather', desc: 'Weather data', status: 'available' },
                  ].map((integration) => (
                    <div
                      key={integration.name}
                      className="p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">{integration.name}</h5>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{integration.desc}</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          Available
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  Visit the <Link href="/admin/integrations" className="text-primary-600 hover:underline">Integrations page</Link> to configure these services.
                </p>
              </div>
            </div>
          )}

          {/* Role Access Settings */}
          {activeTab === 'roleAccess' && isAdmin && (
            <div className="space-y-6">
              {/* Introduction */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Role-Based Access Control</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Control which features and data each role level can access. Select a role below to customize their permissions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Role Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {CONFIGURABLE_ROLES.map((role) => {
                  const RoleIcon = role.icon
                  const isSelected = selectedRole === role.value
                  return (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`p-2 rounded-lg w-fit mb-2 ${isSelected ? 'bg-primary-100' : 'bg-gray-100'}`}>
                        <RoleIcon className={`h-5 w-5 ${isSelected ? 'text-primary-600' : 'text-gray-500'}`} />
                      </div>
                      <h4 className={`font-semibold text-sm ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                        {role.label}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{role.description}</p>
                    </button>
                  )
                })}
              </div>

              {/* Selected Role Configuration */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const roleConfig = CONFIGURABLE_ROLES.find(r => r.value === selectedRole)
                      const RoleIcon = roleConfig?.icon || Users
                      return (
                        <>
                          <div className="p-2 bg-primary-100 rounded-lg">
                            <RoleIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              {roleConfig?.label || selectedRole} Access
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Configure which modules and data this role can access
                            </p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  {/* Module Visibility */}
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      Module Visibility
                    </h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Toggle which modules are visible to users with the {CONFIGURABLE_ROLES.find(r => r.value === selectedRole)?.label} role.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {MODULES.map((module) => {
                        const defaultEnabled = MODULE_ROLE_DEFAULTS[selectedRole]?.[module.key] ?? true
                        const overrideValue = roleModuleOverrides[selectedRole]?.[module.key]
                        const isEnabled = overrideValue !== undefined ? overrideValue : defaultEnabled
                        const isOverridden = overrideValue !== undefined && overrideValue !== defaultEnabled

                        const toggleModuleForRole = () => {
                          setRoleModuleOverrides(prev => {
                            const roleOverrides = prev[selectedRole] || {}
                            const newValue = !isEnabled
                            // If setting back to default, remove the override
                            if (newValue === defaultEnabled) {
                              const { [module.key]: _, ...rest } = roleOverrides
                              if (Object.keys(rest).length === 0) {
                                const { [selectedRole]: __, ...otherRoles } = prev
                                return otherRoles
                              }
                              return { ...prev, [selectedRole]: rest }
                            }
                            return {
                              ...prev,
                              [selectedRole]: { ...roleOverrides, [module.key]: newValue }
                            }
                          })
                        }

                        return (
                          <div
                            key={module.key}
                            className={`border rounded-xl p-3 cursor-pointer transition-all ${
                              isEnabled
                                ? 'border-primary-300 bg-primary-50'
                                : 'border-gray-200 bg-gray-50 opacity-75'
                            } ${isOverridden ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
                            onClick={toggleModuleForRole}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${isEnabled ? 'bg-primary-100' : 'bg-gray-200'}`}>
                                  <module.icon className={`h-4 w-4 ${isEnabled ? 'text-primary-600' : 'text-gray-400'}`} />
                                </div>
                                <div>
                                  <h6 className={`font-medium text-sm ${isEnabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
                                    {module.name}
                                  </h6>
                                  {isOverridden && (
                                    <span className="text-xs text-yellow-600">Custom</span>
                                  )}
                                </div>
                              </div>
                              {isEnabled ? (
                                <ToggleRight className="h-5 w-5 text-primary-600 flex-shrink-0" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-gray-400 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      <span className="inline-block w-3 h-3 rounded border-2 border-yellow-400 mr-1"></span>
                      Yellow border indicates a custom override from the default role settings.
                    </p>
                  </div>

                  {/* Data Access */}
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Daily Log Visibility
                    </h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Control which daily logs users with the {CONFIGURABLE_ROLES.find(r => r.value === selectedRole)?.label} role can view.
                    </p>
                    <div className="space-y-3">
                      {[
                        { value: 'ALL', label: 'All Daily Logs', description: 'Can see all daily logs in the company' },
                        { value: 'ASSIGNED_PROJECTS', label: 'Assigned Projects Only', description: 'Can only see logs from projects they\'re assigned to', recommended: true },
                        { value: 'OWN_ONLY', label: 'Own Submissions Only', description: 'Can only see daily logs they have submitted' },
                      ].map((option) => {
                        const currentAccess = roleDataAccess[selectedRole]?.dailyLogAccess || 'ASSIGNED_PROJECTS'
                        const isSelected = currentAccess === option.value

                        const selectAccess = () => {
                          setRoleDataAccess(prev => ({
                            ...prev,
                            [selectedRole]: { ...prev[selectedRole], dailyLogAccess: option.value as DailyLogAccessLevel }
                          }))
                        }

                        return (
                          <label
                            key={option.value}
                            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-300 bg-white hover:border-gray-400'
                            }`}
                            onClick={selectAccess}
                          >
                            <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                              isSelected
                                ? 'border-primary-500 bg-primary-500'
                                : 'border-gray-400'
                            }`}>
                              {isSelected && (
                                <div className="w-2.5 h-2.5 bg-white rounded-full" />
                              )}
                            </div>
                            <div className="flex-1">
                              <span className="block font-medium text-gray-900 dark:text-gray-100">{option.label}</span>
                              <span className="block text-sm text-gray-600 dark:text-gray-400">{option.description}</span>
                              {option.recommended && (
                                <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Recommended</span>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Note */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">Admin Role Note</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Administrators always have full access to all modules and data. These settings only affect non-admin roles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feature Settings */}
          {activeTab === 'features' && isAdmin && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Feature Configuration</h3>
                <div className="space-y-1">
                  <Toggle
                    checked={featureForm.requireGpsClockIn}
                    onChange={(checked) => setFeatureForm({ ...featureForm, requireGpsClockIn: checked })}
                    label="Require GPS for Clock In/Out"
                    description="Employees must enable location services when clocking in"
                  />
                  <Toggle
                    checked={featureForm.requirePhotoDaily}
                    onChange={(checked) => setFeatureForm({ ...featureForm, requirePhotoDaily: checked })}
                    label="Require Photo in Daily Logs"
                    description="Daily logs must include at least one photo"
                  />
                  <Toggle
                    checked={featureForm.autoApproveTimesheet}
                    onChange={(checked) => setFeatureForm({ ...featureForm, autoApproveTimesheet: checked })}
                    label="Auto-Approve Timesheets"
                    description="Automatically approve time entries (skip approval queue)"
                  />
                  <Toggle
                    checked={featureForm.dailyLogReminders}
                    onChange={(checked) => setFeatureForm({ ...featureForm, dailyLogReminders: checked })}
                    label="Daily Log Reminders"
                    description="Send reminders for incomplete daily logs"
                  />
                  <Toggle
                    checked={featureForm.activitiesEnabled}
                    onChange={(checked) => setFeatureForm({ ...featureForm, activitiesEnabled: checked })}
                    label="Require Activities in Daily Logs"
                    description="When disabled, the activities section becomes optional in daily log forms"
                  />
                  <Toggle
                    checked={featureForm.dailyLogApprovalRequired}
                    onChange={(checked) => setFeatureForm({ ...featureForm, dailyLogApprovalRequired: checked })}
                    label="Require Daily Log Approval"
                    description="When disabled, daily logs do not require approval and are finalized immediately"
                  />
                  <Toggle
                    checked={featureForm.hideBuildingInfo}
                    onChange={(checked) => setFeatureForm({ ...featureForm, hideBuildingInfo: checked })}
                    label="Hide Building/Location Info"
                    description="Hide building, floor, room, and zone fields across the app (daily logs, materials, documents)"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 pt-6 mt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certification Expiry Alert (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={featureForm.certExpiryAlertDays}
                      onChange={(e) => setFeatureForm({ ...featureForm, certExpiryAlertDays: parseInt(e.target.value) || 30 })}
                      className="input"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Days before expiry to send alerts</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max File Upload Size (MB)</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={featureForm.maxFileUploadMB}
                      onChange={(e) => setFeatureForm({ ...featureForm, maxFileUploadMB: parseInt(e.target.value) || 50 })}
                      className="input"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Maximum file size for uploads</p>
                  </div>
                </div>

                {/* Document Storage Settings */}
                <div className="pt-6 mt-4 border-t">
                  <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Document Storage</h4>
                  <Toggle
                    checked={featureForm.autoDeleteDocuments}
                    onChange={(checked) => setFeatureForm({ ...featureForm, autoDeleteDocuments: checked })}
                    label="Auto-Delete Old Documents"
                    description="Automatically delete project documents after a project has been completed for a set period"
                  />
                  {featureForm.autoDeleteDocuments && (
                    <div className="mt-4 ml-0 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-yellow-800 font-medium mb-3">
                            Documents will be permanently deleted after projects are marked complete for:
                          </p>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={featureForm.autoDeleteDocumentsYears}
                              onChange={(e) => setFeatureForm({ ...featureForm, autoDeleteDocumentsYears: parseInt(e.target.value) || 2 })}
                              className="input w-24"
                            />
                            <span className="text-sm text-yellow-800 font-medium">years</span>
                          </div>
                          <p className="text-xs text-yellow-700 mt-2">
                            This helps reduce storage costs for old project files. Make sure to backup important documents before enabling.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Storage Health Check */}
                  <div className="mt-6 pt-4 border-t border-dashed">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Storage Health</h5>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Verify Supabase Storage configuration</p>
                        </div>
                      </div>
                      <button
                        onClick={checkStorageHealth}
                        disabled={storageHealth.loading}
                        className="btn btn-secondary inline-flex items-center gap-2"
                      >
                        {storageHealth.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {storageHealth.checked ? 'Check Again' : 'Check Storage'}
                      </button>
                    </div>

                    {storageHealth.error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-red-800 font-medium">Storage Check Failed</p>
                            <p className="text-xs text-red-700 mt-1">{storageHealth.error}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {storageHealth.result && (
                      <div className={`p-4 rounded-xl border ${
                        storageHealth.result.healthy
                          ? 'bg-green-50 border-green-200'
                          : storageHealth.result.status === 'degraded'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-start gap-3 mb-4">
                          {storageHealth.result.healthy ? (
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : storageHealth.result.status === 'degraded' ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className={`text-sm font-medium ${
                              storageHealth.result.healthy
                                ? 'text-green-800'
                                : storageHealth.result.status === 'degraded'
                                ? 'text-yellow-800'
                                : 'text-red-800'
                            }`}>
                              {storageHealth.result.healthy ? 'Storage is Healthy' :
                               storageHealth.result.status === 'degraded' ? 'Storage has Warnings' :
                               'Storage is Unhealthy'}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              Bucket: <span className="font-mono">{storageHealth.result.bucket}</span>
                            </p>
                          </div>
                        </div>

                        {storageHealth.result.checks && storageHealth.result.checks.length > 0 && (
                          <div className="space-y-2">
                            {storageHealth.result.checks.map((check, i) => (
                              <div
                                key={i}
                                className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                                  check.status === 'pass' ? 'bg-green-100/50' :
                                  check.status === 'warn' ? 'bg-yellow-100/50' :
                                  'bg-red-100/50'
                                }`}
                              >
                                {check.status === 'pass' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                ) : check.status === 'warn' ? (
                                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{check.name}:</span>
                                  <span className="ml-1 text-gray-700 dark:text-gray-300">{check.message}</span>
                                  {typeof check.details?.hint === 'string' && (
                                    <p className="text-xs text-gray-600 mt-0.5">{check.details.hint}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {storageHealth.result.summary && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                            <span className="text-green-700">{storageHealth.result.summary.passed} passed</span>
                            {storageHealth.result.summary.warnings > 0 && (
                              <span className="text-yellow-700">{storageHealth.result.summary.warnings} warnings</span>
                            )}
                            {storageHealth.result.summary.failures > 0 && (
                              <span className="text-red-700">{storageHealth.result.summary.failures} failures</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Features */}
                <div className="pt-6 mt-4 border-t">
                  <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">AI Features</h4>
                  {ocrLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading AI settings...</span>
                    </div>
                  ) : (
                    <>
                      <Toggle
                        checked={ocrSettings.ocrEnabled}
                        onChange={(checked) => setOcrSettings({ ...ocrSettings, ocrEnabled: checked })}
                        label="Document Analysis (OCR)"
                        description="Automatically extract metadata from uploaded documents using AI vision"
                      />
                      {ocrSettings.ocrEnabled && (
                        <div className="mt-4 ml-0 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <Eye className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-purple-800 font-medium mb-2">
                                AI Document Analysis
                              </p>
                              <p className="text-xs text-purple-700 mb-3">
                                When enabled, uploaded PDFs and images are analyzed using OpenAI Vision to automatically extract:
                              </p>
                              <ul className="text-xs text-purple-700 list-disc list-inside space-y-1 mb-3">
                                <li>Project identification and matching</li>
                                <li>Drawing numbers, revisions, and scales</li>
                                <li>Location information (building, floor, room)</li>
                                <li>Document dates and approval stamps</li>
                              </ul>
                              <p className="text-xs text-purple-600 font-medium">
                                Cost: ~$0.01-0.03 per document analyzed
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && isAdmin && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Notification Settings</h3>
                <div className="space-y-1">
                  <Toggle
                    checked={notificationForm.emailNotifications}
                    onChange={(checked) => setNotificationForm({ ...notificationForm, emailNotifications: checked })}
                    label="Email Notifications"
                    description="Send email notifications for important events"
                  />
                  <Toggle
                    checked={notificationForm.pushNotifications}
                    onChange={(checked) => setNotificationForm({ ...notificationForm, pushNotifications: checked })}
                    label="Push Notifications"
                    description="Enable browser push notifications (requires permission)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* User Preferences */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Display Preferences</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
                    <select
                      value={preferenceForm.theme}
                      onChange={(e) => setPreferenceForm({ ...preferenceForm, theme: e.target.value })}
                      className="input"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default View</label>
                    <select
                      value={preferenceForm.defaultView}
                      onChange={(e) => setPreferenceForm({ ...preferenceForm, defaultView: e.target.value })}
                      className="input"
                    >
                      <option value="list">List View</option>
                      <option value="grid">Grid View</option>
                      <option value="calendar">Calendar View</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Items Per Page</label>
                    <select
                      value={preferenceForm.itemsPerPage}
                      onChange={(e) => setPreferenceForm({ ...preferenceForm, itemsPerPage: parseInt(e.target.value) })}
                      className="input"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t dark:border-gray-700">
                  <Toggle
                    checked={preferenceForm.showCompletedTasks}
                    onChange={(checked) => setPreferenceForm({ ...preferenceForm, showCompletedTasks: checked })}
                    label="Show Completed Tasks"
                    description="Display completed items in task lists"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Email Preferences</h3>
                <div className="space-y-1">
                  <Toggle
                    checked={preferenceForm.emailDailyDigest}
                    onChange={(checked) => setPreferenceForm({ ...preferenceForm, emailDailyDigest: checked })}
                    label="Daily Digest"
                    description="Receive a daily summary email"
                  />
                  <Toggle
                    checked={preferenceForm.emailApprovals}
                    onChange={(checked) => setPreferenceForm({ ...preferenceForm, emailApprovals: checked })}
                    label="Approval Notifications"
                    description="Get notified when items need your approval"
                  />
                  {/* Only show certification alerts if user has access to certifications module */}
                  {(() => {
                    const userRole = session?.user?.role || 'VIEWER'
                    const globalEnabled = company?.moduleCertifications ?? true
                    if (!globalEnabled) return null

                    const roleOverrides = (company?.roleModuleOverrides as Record<string, Record<string, boolean>> | null) ?? {}
                    const userOverrides = roleOverrides[userRole]
                    if (userOverrides && 'moduleCertifications' in userOverrides) {
                      if (!userOverrides.moduleCertifications) return null
                    }

                    return (
                      <Toggle
                        checked={preferenceForm.emailCertExpiry}
                        onChange={(checked) => setPreferenceForm({ ...preferenceForm, emailCertExpiry: checked })}
                        label="Certification Expiry Alerts"
                        description="Get notified before certifications expire"
                      />
                    )
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dev-only Toast Testing Section */}
      {process.env.NODE_ENV === 'development' && isAdmin && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Development Testing
          </h3>
          <p className="text-sm text-yellow-700 mb-4">
            These controls are only visible in development mode.
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Toast Notifications</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toast.success('Success Toast', 'This is a success message')}
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Test Success
                </button>
                <button
                  onClick={() => toast.error('Error Toast', 'This is an error message')}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Test Error
                </button>
                <button
                  onClick={() => toast.warning('Warning Toast', 'This is a warning message')}
                  className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
                >
                  Test Warning
                </button>
                <button
                  onClick={() => toast.info('Info Toast', 'This is an info message')}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Test Info
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Push Notifications (requires backend)</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/notifications/test', { method: 'POST' })
                      if (res.ok) {
                        toast.success('Test Sent', 'Check your mobile device for the notification')
                      } else {
                        const data = await res.json()
                        toast.error('Test Failed', data.error || 'Could not send test notification')
                      }
                    } catch {
                      toast.error('Test Failed', 'Network error')
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Send Test Push
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
