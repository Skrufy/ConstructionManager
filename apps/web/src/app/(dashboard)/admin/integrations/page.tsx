'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import {
  Link2,
  Loader2,
  Check,
  X,
  ExternalLink,
  AlertCircle,
  Settings,
  RefreshCw,
  Cloud,
  CreditCard,
  MessageSquare,
  FileText,
  Map,
  Plane,
  Truck,
  DollarSign,
  Lock,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

// Tailwind color class mappings (must be static for purging)
const COLOR_CLASSES = {
  green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', button: 'bg-green-600 hover:bg-green-700' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', button: 'bg-blue-600 hover:bg-blue-700' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', button: 'bg-purple-600 hover:bg-purple-700' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', button: 'bg-yellow-600 hover:bg-yellow-700' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', button: 'bg-orange-600 hover:bg-orange-700' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', button: 'bg-red-600 hover:bg-red-700' },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', button: 'bg-indigo-600 hover:bg-indigo-700' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', button: 'bg-violet-600 hover:bg-violet-700' },
} as const

type ColorKey = keyof typeof COLOR_CLASSES

// Integration definitions
const INTEGRATIONS: Array<{
  id: string
  name: string
  description: string
  category: string
  icon: React.ComponentType<{ className?: string }>
  color: ColorKey
  status: 'available' | 'coming_soon'
  docs: string
  envVars: Array<{ key: string; label: string; required: boolean; secret: boolean }>
  features: string[]
}> = [
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync timesheets to QuickBooks for payroll processing',
    category: 'Financial',
    icon: DollarSign,
    color: 'green',
    status: 'available',
    docs: 'https://developer.intuit.com/',
    envVars: [
      { key: 'QUICKBOOKS_CLIENT_ID', label: 'Client ID', required: true, secret: false },
      { key: 'QUICKBOOKS_CLIENT_SECRET', label: 'Client Secret', required: true, secret: true },
      { key: 'QUICKBOOKS_REALM_ID', label: 'Realm ID', required: true, secret: false },
    ],
    features: ['Timesheet Sync', 'Employee Sync', 'Expense Export'],
  },
  {
    id: 'samsara',
    name: 'Samsara',
    description: 'Track equipment locations with real-time GPS data',
    category: 'Fleet & Equipment',
    icon: Truck,
    color: 'blue',
    status: 'available',
    docs: 'https://developers.samsara.com/',
    envVars: [
      { key: 'SAMSARA_API_TOKEN', label: 'API Token', required: true, secret: true },
      { key: 'SAMSARA_ORG_ID', label: 'Organization ID', required: false, secret: false },
    ],
    features: ['Equipment GPS', 'Usage Tracking', 'Maintenance Alerts'],
  },
  {
    id: 'dronedeploy',
    name: 'DroneDeploy',
    description: 'Aerial site mapping and progress tracking with drones',
    category: 'Site Mapping',
    icon: Plane,
    color: 'purple',
    status: 'available',
    docs: 'https://www.dronedeploy.com/product/integrations/',
    envVars: [
      { key: 'DRONEDEPLOY_API_KEY', label: 'API Key', required: true, secret: true },
      { key: 'DRONEDEPLOY_ORG_ID', label: 'Organization ID', required: false, secret: false },
    ],
    features: ['Orthomosaic Maps', '3D Models', 'Progress Comparison', 'Measurement Tools'],
  },
  {
    id: 'openweather',
    name: 'OpenWeather',
    description: 'Automatic weather data for daily logs and planning',
    category: 'Weather',
    icon: Cloud,
    color: 'yellow',
    status: 'available',
    docs: 'https://openweathermap.org/api',
    envVars: [
      { key: 'OPENWEATHER_API_KEY', label: 'API Key', required: true, secret: true },
    ],
    features: ['Current Weather', 'Forecast', 'Historical Data'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'AI-powered document analysis and metadata extraction using GPT-4 Vision',
    category: 'AI & Automation',
    icon: Sparkles,
    color: 'purple',
    status: 'available',
    docs: 'https://platform.openai.com/docs/api-reference',
    envVars: [
      { key: 'OPENAI_API_KEY', label: 'API Key', required: true, secret: true },
    ],
    features: ['Document OCR', 'Metadata Extraction', 'Project Matching'],
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS notifications for alerts and reminders',
    category: 'Communications',
    icon: MessageSquare,
    color: 'red',
    status: 'coming_soon',
    docs: 'https://www.twilio.com/docs',
    envVars: [
      { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID', required: true, secret: false },
      { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', required: true, secret: true },
      { key: 'TWILIO_PHONE_NUMBER', label: 'Phone Number', required: true, secret: false },
    ],
    features: ['SMS Alerts', 'Daily Reminders', 'Safety Notifications'],
  },
  {
    id: 'googlemaps',
    name: 'Google Maps',
    description: 'Enhanced mapping and geocoding features',
    category: 'Mapping',
    icon: Map,
    color: 'blue',
    status: 'available',
    docs: 'https://developers.google.com/maps/documentation',
    envVars: [
      { key: 'GOOGLE_MAPS_API_KEY', label: 'API Key', required: true, secret: true },
    ],
    features: ['Address Autocomplete', 'Route Planning', 'Satellite View'],
  },
  {
    id: 'aws_s3',
    name: 'AWS S3',
    description: 'Cloud storage for documents, photos, and files',
    category: 'Storage',
    icon: Cloud,
    color: 'orange',
    status: 'available',
    docs: 'https://docs.aws.amazon.com/s3/',
    envVars: [
      { key: 'AWS_ACCESS_KEY_ID', label: 'Access Key ID', required: true, secret: false },
      { key: 'AWS_SECRET_ACCESS_KEY', label: 'Secret Access Key', required: true, secret: true },
      { key: 'AWS_S3_BUCKET', label: 'Bucket Name', required: true, secret: false },
      { key: 'AWS_S3_REGION', label: 'Region', required: true, secret: false },
    ],
    features: ['File Storage', 'Automatic Backups', 'CDN Delivery'],
  },
]

interface IntegrationStatus {
  configured: boolean
  connected: boolean
  lastSync: string | null
  stats: Record<string, number>
  features: Record<string, boolean>
}

interface ConfigModalProps {
  integration: typeof INTEGRATIONS[0]
  onClose: () => void
  onSave: (config: Record<string, string>) => Promise<void>
  initialValues: Record<string, string>
}

function ConfigModal({ integration, onClose, onSave, initialValues }: ConfigModalProps) {
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'instructions'>('form')
  const [envVarsText, setEnvVarsText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if at least one field is filled
    const filledFields = integration.envVars.filter(v => values[v.key]?.trim())
    if (filledFields.length === 0) {
      setError('Please fill in at least one field')
      return
    }

    // Check required fields
    const missingRequired = integration.envVars.filter(v => v.required && !values[v.key]?.trim())
    if (missingRequired.length > 0) {
      setError(`Please fill in: ${missingRequired.map(v => v.label).join(', ')}`)
      return
    }

    // Generate env vars text
    const text = integration.envVars
      .filter(v => values[v.key]?.trim())
      .map(v => `${v.key}="${values[v.key]}"`)
      .join('\n')

    setEnvVarsText(text)
    setStep('instructions')
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(envVarsText)
      setSaving(true)
      setTimeout(() => {
        setSaving(false)
        onSave(values)
        onClose()
      }, 1000)
    } catch {
      setError('Failed to copy to clipboard. Please copy manually.')
    }
  }

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const IconComponent = integration.icon
  const colorClasses = COLOR_CLASSES[integration.color]

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

        <div className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className={`bg-gradient-to-r ${
            integration.color === 'green' ? 'from-green-500 to-emerald-600' :
            integration.color === 'blue' ? 'from-blue-500 to-indigo-600' :
            integration.color === 'purple' ? 'from-purple-500 to-violet-600' :
            integration.color === 'yellow' ? 'from-yellow-500 to-orange-600' :
            integration.color === 'orange' ? 'from-orange-500 to-red-600' :
            integration.color === 'red' ? 'from-red-500 to-pink-600' :
            integration.color === 'indigo' ? 'from-indigo-500 to-purple-600' :
            'from-violet-500 to-purple-600'
          } p-6 text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                  <IconComponent className="h-8 w-8" />
                </div>
                <div>
                  <h3 id="modal-title" className="text-xl font-bold">
                    {step === 'form' ? `Connect ${integration.name}` : 'Almost Done!'}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {step === 'form' ? integration.description : 'Copy these settings to your server'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Features preview */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Features you'll unlock:</p>
                <div className="flex flex-wrap gap-2">
                  {integration.features.map((feature) => (
                    <span
                      key={feature}
                      className={`px-3 py-1 ${colorClasses.bg} ${colorClasses.text} rounded-full text-sm font-medium`}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Credential fields */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter your API credentials:</p>
                {integration.envVars.map((envVar) => (
                  <div key={envVar.key} className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {envVar.label}
                      {envVar.required && <span className="text-red-500 ml-1">*</span>}
                      {!envVar.required && <span className="text-gray-400 dark:text-gray-500 ml-1 font-normal">(optional)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={envVar.secret && !showSecrets[envVar.key] ? 'password' : 'text'}
                        value={values[envVar.key] || ''}
                        onChange={(e) => setValues({ ...values, [envVar.key]: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder={envVar.secret ? '••••••••••••••••' : `Enter ${envVar.label.toLowerCase()}`}
                        aria-label={envVar.label}
                      />
                      {envVar.secret && (
                        <button
                          type="button"
                          onClick={() => toggleSecret(envVar.key)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label={showSecrets[envVar.key] ? 'Hide value' : 'Show value'}
                        >
                          {showSecrets[envVar.key] ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Help links */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Lock className="h-4 w-4" />
                  <span>You'll copy these to your server</span>
                </div>
                {integration.docs && (
                  <a
                    href={integration.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    Get API Keys
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-6 py-3 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${colorClasses.button}`}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 space-y-6">
              {/* Success message */}
              <div className="text-center py-4">
                <div className={`inline-flex p-4 rounded-full ${colorClasses.bg} mb-4`}>
                  <CheckCircle className={`h-8 w-8 ${colorClasses.text}`} />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Great! Now add these environment variables to your server
                </p>
              </div>

              {/* Env vars display */}
              <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-green-400 overflow-x-auto">
                <pre>{envVarsText}</pre>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-3 border border-blue-100 dark:border-blue-800">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Setup Instructions
                </h4>
                <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-2 list-decimal list-inside">
                  <li>Click "Copy to Clipboard" below</li>
                  <li>Open your <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">.env</code> file in the project root</li>
                  <li>Paste the variables and save</li>
                  <li>Restart your development server</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  disabled={saving}
                  className={`flex-1 px-6 py-3 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${colorClasses.button} disabled:opacity-50`}
                >
                  {saving ? (
                    <>
                      <Check className="h-5 w-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Copy to Clipboard
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// QuickBooks OAuth Actions Component
function QuickBooksActions({
  status,
  syncing,
  onSync,
  onMessage,
  colorClasses,
}: {
  status: IntegrationStatus | undefined
  syncing: string | null
  onSync: (action: string) => void
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void
  colorClasses: { bg: string; text: string; button: string }
}) {
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch('/api/integrations/quickbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'authorize' }),
      })

      const data = await res.json()

      if (res.ok && data.authUrl) {
        // Redirect to QuickBooks OAuth
        window.location.href = data.authUrl
      } else {
        onMessage({
          type: 'error',
          text: data.message || data.error || 'Failed to start QuickBooks authorization',
        })
        setConnecting(false)
      }
    } catch {
      onMessage({ type: 'error', text: 'Failed to connect to QuickBooks' })
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks?')) return

    try {
      const res = await fetch('/api/integrations/quickbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      })

      const data = await res.json()

      if (res.ok) {
        onMessage({ type: 'success', text: 'QuickBooks disconnected successfully' })
        window.location.reload()
      } else {
        onMessage({ type: 'error', text: data.error || 'Failed to disconnect' })
      }
    } catch {
      onMessage({ type: 'error', text: 'Failed to disconnect QuickBooks' })
    }
  }

  // Not configured - show message for admin to set up env vars
  if (!status?.configured) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          QuickBooks API credentials not configured
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">
          Add QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET to your environment
        </p>
      </div>
    )
  }

  // Configured but not connected - show Connect button
  if (!status?.connected) {
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        className={`w-full px-4 py-2 text-sm font-medium rounded-md text-white ${colorClasses.button} disabled:opacity-50 flex items-center justify-center gap-2`}
      >
        {connecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" />
            Connect to QuickBooks
          </>
        )}
      </button>
    )
  }

  // Connected - show Sync and Disconnect options
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onSync('sync-timesheets')}
        disabled={syncing === 'quickbooks-sync-timesheets'}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md text-white ${colorClasses.button} disabled:opacity-50`}
      >
        {syncing === 'quickbooks-sync-timesheets' ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync Timesheets
          </span>
        )}
      </button>
      <button
        onClick={handleDisconnect}
        className="px-3 py-2 text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
        title="Disconnect QuickBooks"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function IntegrationsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [configModal, setConfigModal] = useState<typeof INTEGRATIONS[0] | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('')

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    fetchStatuses()
  }, [session, router])

  const fetchStatuses = async () => {
    try {
      const [qbRes, samRes, droneRes, owRes, oaiRes, gmRes] = await Promise.all([
        fetch('/api/integrations/quickbooks'),
        fetch('/api/integrations/samsara'),
        fetch('/api/integrations/dronedeploy'),
        fetch('/api/integrations/openweather'),
        fetch('/api/integrations/openai'),
        fetch('/api/integrations/googlemaps'),
      ])

      const newStatuses: Record<string, IntegrationStatus> = {}
      if (qbRes.ok) newStatuses.quickbooks = await qbRes.json()
      if (samRes.ok) newStatuses.samsara = await samRes.json()
      if (droneRes.ok) newStatuses.dronedeploy = await droneRes.json()
      if (owRes.ok) newStatuses.openweather = await owRes.json()
      if (oaiRes.ok) newStatuses.openai = await oaiRes.json()
      if (gmRes.ok) newStatuses.googlemaps = await gmRes.json()

      setStatuses(newStatuses)
    } catch (error) {
      console.error('Error fetching integration statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (integration: string, action: string) => {
    setSyncing(`${integration}-${action}`)
    setMessage(null)

    try {
      const res = await fetch(`/api/integrations/${integration}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
        await fetchStatuses()
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed' })
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSyncing(null)
    }
  }

  const handleSaveConfig = async (integrationId: string, config: Record<string, string>) => {
    // Generate environment variable instructions for the user
    const integration = INTEGRATIONS.find(i => i.id === integrationId)
    if (!integration) return

    // Build the env vars string for display
    const envVarsText = integration.envVars
      .filter(v => config[v.key])
      .map(v => `${v.key}="${config[v.key]}"`)
      .join('\n')

    if (!envVarsText) {
      setMessage({
        type: 'error',
        text: 'Please fill in at least one configuration field'
      })
      return
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(envVarsText)
      setMessage({
        type: 'success',
        text: `Environment variables copied to clipboard! Add them to your .env file and restart the server.`
      })
    } catch {
      // Fallback if clipboard API not available
      setMessage({
        type: 'success',
        text: `Add the following to your .env file:\n${envVarsText}\nThen restart the server.`
      })
    }
  }

  // Get unique categories
  const categories = Array.from(new Set(INTEGRATIONS.map(i => i.category)))

  // Filter integrations
  const filteredIntegrations = categoryFilter
    ? INTEGRATIONS.filter(i => i.category === categoryFilter)
    : INTEGRATIONS

  if (session?.user?.role !== 'ADMIN') return null

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Integrations</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Connect third-party services to enhance your construction management workflow
          </p>
        </div>
        <button
          onClick={fetchStatuses}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            !categoryFilter
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All ({INTEGRATIONS.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === cat
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cat} ({INTEGRATIONS.filter(i => i.category === cat).length})
          </button>
        ))}
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => {
          const status = statuses[integration.id]
          const IconComponent = integration.icon
          const isComingSoon = integration.status === 'coming_soon'
          const colorClasses = COLOR_CLASSES[integration.color]

          return (
            <div
              key={integration.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${
                isComingSoon ? 'opacity-75' : ''
              }`}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg ${colorClasses.bg} flex items-center justify-center`}>
                      <IconComponent className={`h-6 w-6 ${colorClasses.text}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{integration.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{integration.category}</p>
                    </div>
                  </div>
                  {isComingSoon ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      Coming Soon
                    </span>
                  ) : status?.configured ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Not Configured
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">{integration.description}</p>

                {/* Features */}
                <div className="flex flex-wrap gap-1">
                  {integration.features.map((feature) => {
                    const isEnabled = status?.features?.[feature.toLowerCase().replace(/ /g, '')]
                    return (
                      <span
                        key={feature}
                        className={`px-2 py-0.5 rounded text-xs ${
                          isEnabled
                            ? `${colorClasses.bg} ${colorClasses.text}`
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {feature}
                      </span>
                    )
                  })}
                </div>

                {/* Stats (if configured) */}
                {status?.configured && status.stats && Object.keys(status.stats).length > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(status.stats).slice(0, 2).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="text-gray-500 dark:text-gray-400 text-xs">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Last Sync */}
                {status?.lastSync && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">
                    Last synced: {new Date(status.lastSync).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                {isComingSoon ? (
                  <div className="text-center">
                    <a
                      href={integration.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center justify-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Documentation
                    </a>
                  </div>
                ) : integration.id === 'quickbooks' ? (
                  // Special handling for QuickBooks OAuth flow
                  <QuickBooksActions
                    status={status}
                    syncing={syncing}
                    onSync={(action) => handleSync('quickbooks', action)}
                    onMessage={setMessage}
                    colorClasses={colorClasses}
                  />
                ) : status?.configured ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSync(integration.id, 'sync')}
                      disabled={syncing === `${integration.id}-sync`}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md text-white ${colorClasses.button} disabled:opacity-50`}
                    >
                      {syncing === `${integration.id}-sync` ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Syncing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Sync Now
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setConfigModal(integration)}
                      className="px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfigModal(integration)}
                    className="w-full px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Link2 className="h-4 w-4" />
                    Configure Integration
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-100 dark:border-blue-800">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300 mb-2">Need Help Setting Up?</h3>
        <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
          Integrations require API credentials from each service. After configuring, add the environment
          variables to your <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">.env</code> file and restart the server.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <a href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Integration Guide
          </a>
          <a href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1">
            <ExternalLink className="h-4 w-4" />
            API Documentation
          </a>
        </div>
      </div>

      {/* Config Modal */}
      {configModal && (
        <ConfigModal
          integration={configModal}
          onClose={() => setConfigModal(null)}
          onSave={(config) => handleSaveConfig(configModal.id, config)}
          initialValues={{}}
        />
      )}
    </div>
  )
}
