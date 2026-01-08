import { prisma } from '@/lib/prisma'
import { notifyAdmins } from './notification-service'

export interface APIStatus {
  name: string
  configured: boolean
  connected: boolean
  lastChecked: Date
  error?: string
}

export interface HealthCheckResult {
  [key: string]: APIStatus
}

// Store previous states to detect changes (in-memory for serverless)
// In production, you might want to persist this to the database
const previousStates: Map<string, boolean> = new Map()

/**
 * Check OpenWeather API status
 */
async function checkOpenWeather(): Promise<APIStatus> {
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    return {
      name: 'OpenWeather',
      configured: false,
      connected: false,
      lastChecked: new Date(),
    }
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=39.8283&lon=-98.5795&appid=${apiKey}&units=imperial`,
      { cache: 'no-store' }
    )

    return {
      name: 'OpenWeather',
      configured: true,
      connected: response.ok,
      lastChecked: new Date(),
      error: response.ok ? undefined : `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      name: 'OpenWeather',
      configured: true,
      connected: false,
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}

/**
 * Check QuickBooks integration status
 */
async function checkQuickBooks(): Promise<APIStatus> {
  try {
    const credential = await prisma.integrationCredential.findFirst({
      where: { provider: 'quickbooks' },
    })

    if (!credential) {
      return {
        name: 'QuickBooks',
        configured: false,
        connected: false,
        lastChecked: new Date(),
      }
    }

    // Check if token is expired
    const isExpired = credential.expiresAt
      ? new Date() > credential.expiresAt
      : false

    return {
      name: 'QuickBooks',
      configured: true,
      connected: !isExpired,
      lastChecked: new Date(),
      error: isExpired ? 'Token expired - needs re-authentication' : undefined,
    }
  } catch (error) {
    return {
      name: 'QuickBooks',
      configured: false,
      connected: false,
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : 'Check failed',
    }
  }
}

/**
 * Check Samsara integration status
 */
async function checkSamsara(): Promise<APIStatus> {
  const apiToken = process.env.SAMSARA_API_TOKEN

  if (!apiToken) {
    return {
      name: 'Samsara',
      configured: false,
      connected: false,
      lastChecked: new Date(),
    }
  }

  // Samsara doesn't have a simple health check endpoint
  // For now, assume connected if token is present
  // In production, you could make a test API call
  return {
    name: 'Samsara',
    configured: true,
    connected: true,
    lastChecked: new Date(),
  }
}

/**
 * Check DroneDeploy integration status
 */
async function checkDroneDeploy(): Promise<APIStatus> {
  const apiKey = process.env.DRONEDEPLOY_API_KEY

  return {
    name: 'DroneDeploy',
    configured: !!apiKey,
    connected: !!apiKey,
    lastChecked: new Date(),
  }
}

/**
 * Run health checks for all configured APIs
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  const results: HealthCheckResult = {}

  const checks = await Promise.all([
    checkOpenWeather(),
    checkQuickBooks(),
    checkSamsara(),
    checkDroneDeploy(),
  ])

  for (const check of checks) {
    results[check.name] = check

    // Only notify if API is configured
    if (!check.configured) {
      previousStates.set(check.name, false)
      continue
    }

    // Check for state changes and notify
    const previouslyConnected = previousStates.get(check.name)

    // Only notify on state changes (not on first check)
    if (previouslyConnected !== undefined) {
      if (previouslyConnected && !check.connected) {
        // API disconnected - notify admins
        console.log(`API Disconnected: ${check.name}`)
        await notifyAdmins({
          type: 'API_DISCONNECT',
          title: `${check.name} API Disconnected`,
          message:
            check.error ||
            `The ${check.name} integration has lost connection. Please check the configuration.`,
          severity: 'ERROR',
          category: 'API',
          data: { api: check.name, error: check.error },
          actionUrl: '/admin/integrations',
        })
      } else if (!previouslyConnected && check.connected) {
        // API reconnected - notify admins
        console.log(`API Reconnected: ${check.name}`)
        await notifyAdmins({
          type: 'API_RECONNECT',
          title: `${check.name} API Reconnected`,
          message: `The ${check.name} integration is now connected and working.`,
          severity: 'INFO',
          category: 'API',
          data: { api: check.name },
        })
      }
    }

    previousStates.set(check.name, check.connected)
  }

  return results
}

/**
 * Get current health status without triggering notifications
 */
export async function getHealthStatus(): Promise<HealthCheckResult> {
  const results: HealthCheckResult = {}

  const checks = await Promise.all([
    checkOpenWeather(),
    checkQuickBooks(),
    checkSamsara(),
    checkDroneDeploy(),
  ])

  for (const check of checks) {
    results[check.name] = check
  }

  return results
}
