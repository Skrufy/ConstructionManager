/**
 * QuickBooks Online Integration Service
 *
 * This module handles OAuth authentication and timesheet sync with QuickBooks Online.
 *
 * Required environment variables:
 * - QUICKBOOKS_CLIENT_ID: Your QuickBooks app client ID
 * - QUICKBOOKS_CLIENT_SECRET: Your QuickBooks app client secret
 * - QUICKBOOKS_REDIRECT_URI: OAuth redirect URI (default: http://localhost:3000/api/integrations/quickbooks/callback)
 * - QUICKBOOKS_ENVIRONMENT: 'sandbox' or 'production' (default: sandbox)
 *
 * Tokens are stored encrypted in the database (IntegrationCredential table)
 */

import { prisma } from './prisma'
import { encrypt, decrypt, generateSecureToken } from './encryption'
import crypto from 'crypto'

// QuickBooks API base URLs
const QB_SANDBOX_BASE = 'https://sandbox-quickbooks.api.intuit.com'
const QB_PRODUCTION_BASE = 'https://quickbooks.api.intuit.com'
const QB_OAUTH_BASE = 'https://oauth.platform.intuit.com/oauth2/v1'

interface QuickBooksConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  environment: 'sandbox' | 'production'
}

interface StoredCredentials {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  realmId: string | null
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface TimeActivityPayload {
  TxnDate: string
  NameOf: 'Employee' | 'Vendor'
  EmployeeRef?: { value: string; name?: string }
  VendorRef?: { value: string; name?: string }
  CustomerRef?: { value: string; name?: string }
  ItemRef?: { value: string; name?: string }
  StartTime?: string
  EndTime?: string
  Hours?: number
  Minutes?: number
  Description?: string
  Taxable?: boolean
  HourlyRate?: number
  BillableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled'
}

interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors: Array<{ entryId: string; error: string }>
  details: Array<{ entryId: string; qbId: string }>
}

export function getQuickBooksConfig(): QuickBooksConfig {
  return {
    clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:3000/api/integrations/quickbooks/callback',
    environment: (process.env.QUICKBOOKS_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  }
}

export function isQuickBooksConfigured(): boolean {
  const config = getQuickBooksConfig()
  return !!(config.clientId && config.clientSecret)
}

/**
 * Get stored credentials from database
 */
async function getStoredCredentials(): Promise<StoredCredentials | null> {
  const credential = await prisma.integrationCredential.findUnique({
    where: { provider: 'quickbooks' },
  })

  if (!credential) return null

  try {
    return {
      accessToken: decrypt(credential.accessToken),
      refreshToken: credential.refreshToken ? decrypt(credential.refreshToken) : null,
      expiresAt: credential.expiresAt,
      realmId: credential.realmId,
    }
  } catch {
    // If decryption fails, credentials are invalid
    return null
  }
}

/**
 * Store credentials in database (encrypted)
 */
async function storeCredentials(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  realmId?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  await prisma.integrationCredential.upsert({
    where: { provider: 'quickbooks' },
    update: {
      accessToken: encrypt(accessToken),
      refreshToken: encrypt(refreshToken),
      expiresAt,
      realmId: realmId || undefined,
    },
    create: {
      provider: 'quickbooks',
      accessToken: encrypt(accessToken),
      refreshToken: encrypt(refreshToken),
      expiresAt,
      realmId: realmId || undefined,
    },
  })
}

export async function isQuickBooksConnected(): Promise<boolean> {
  const creds = await getStoredCredentials()
  if (!creds?.accessToken || !creds.expiresAt) return false
  // Token is valid if it expires in more than 5 minutes
  return creds.expiresAt.getTime() > Date.now() + 5 * 60 * 1000
}

/**
 * Generate cryptographically secure OAuth state and store it
 */
export async function createOAuthState(userId: string): Promise<string> {
  const state = generateSecureToken(32)

  // Clean up expired states
  await prisma.oAuthState.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })

  // Store new state with 10 minute expiry
  await prisma.oAuthState.create({
    data: {
      state,
      userId,
      provider: 'quickbooks',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  })

  return state
}

/**
 * Validate OAuth state and consume it (one-time use)
 */
export async function validateAndConsumeOAuthState(state: string, userId: string): Promise<boolean> {
  const savedState = await prisma.oAuthState.findFirst({
    where: {
      state,
      userId,
      provider: 'quickbooks',
      expiresAt: { gt: new Date() },
    },
  })

  if (!savedState) return false

  // Delete the state (one-time use)
  await prisma.oAuthState.delete({ where: { id: savedState.id } })

  return true
}

/**
 * Generate OAuth authorization URL for QuickBooks
 */
export function getAuthorizationUrl(state: string): string {
  const config = getQuickBooksConfig()
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: config.redirectUri,
    state,
  })
  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(code: string, realmId?: string): Promise<TokenResponse> {
  const config = getQuickBooksConfig()
  const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

  const response = await fetch(`${QB_OAUTH_BASE}/tokens/bearer`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  const tokens: TokenResponse = await response.json()

  // Store tokens securely in database
  await storeCredentials(tokens.access_token, tokens.refresh_token, tokens.expires_in, realmId)

  return tokens
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string> {
  const creds = await getStoredCredentials()
  if (!creds?.refreshToken) {
    throw new Error('No refresh token available. Please re-authenticate with QuickBooks.')
  }

  const config = getQuickBooksConfig()
  const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

  const response = await fetch(`${QB_OAUTH_BASE}/tokens/bearer`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: creds.refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${error}`)
  }

  const tokens: TokenResponse = await response.json()

  // Store new tokens
  await storeCredentials(tokens.access_token, tokens.refresh_token, tokens.expires_in, creds.realmId || undefined)

  return tokens.access_token
}

/**
 * Get a valid access token, refreshing if necessary
 */
async function getValidAccessToken(): Promise<{ token: string; realmId: string }> {
  const creds = await getStoredCredentials()

  if (!creds) {
    throw new Error('No QuickBooks credentials found. Please connect to QuickBooks first.')
  }

  if (!creds.realmId) {
    throw new Error('No QuickBooks company (realm) ID found. Please reconnect to QuickBooks.')
  }

  // If token is still valid (more than 1 minute remaining), use it
  if (creds.expiresAt && creds.expiresAt.getTime() > Date.now() + 60000) {
    return { token: creds.accessToken, realmId: creds.realmId }
  }

  // Try to refresh
  const newToken = await refreshAccessToken()
  return { token: newToken, realmId: creds.realmId }
}

/**
 * Make an authenticated API request to QuickBooks
 */
async function qbApiRequest(
  method: string,
  endpoint: string,
  body?: object
): Promise<any> {
  const config = getQuickBooksConfig()
  const baseUrl = config.environment === 'production' ? QB_PRODUCTION_BASE : QB_SANDBOX_BASE
  const { token, realmId } = await getValidAccessToken()

  const url = `${baseUrl}/v3/company/${realmId}${endpoint}`

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`QuickBooks API error (${response.status}): ${error}`)
  }

  return response.json()
}

/**
 * Get list of employees from QuickBooks
 */
export async function getEmployees(): Promise<any[]> {
  const response = await qbApiRequest('GET', '/query?query=SELECT * FROM Employee MAXRESULTS 1000')
  return response.QueryResponse?.Employee || []
}

/**
 * Get list of customers/jobs from QuickBooks
 */
export async function getCustomers(): Promise<any[]> {
  const response = await qbApiRequest('GET', '/query?query=SELECT * FROM Customer MAXRESULTS 1000')
  return response.QueryResponse?.Customer || []
}

/**
 * Create a time activity (timesheet entry) in QuickBooks
 */
export async function createTimeActivity(payload: TimeActivityPayload): Promise<any> {
  const response = await qbApiRequest('POST', '/timeactivity', payload)
  return response.TimeActivity
}

/**
 * Calculate hours and minutes from two dates
 */
function calculateDuration(clockIn: Date, clockOut: Date): { hours: number; minutes: number } {
  const diffMs = clockOut.getTime() - clockIn.getTime()
  const totalMinutes = Math.floor(diffMs / 60000)
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  }
}

/**
 * Sync approved time entries to QuickBooks
 */
export async function syncTimesheetsToQuickBooks(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    failedCount: 0,
    errors: [],
    details: [],
  }

  if (!isQuickBooksConfigured()) {
    throw new Error('QuickBooks is not configured. Please add API credentials.')
  }

  // Get approved entries that haven't been synced
  const entries = await prisma.timeEntry.findMany({
    where: {
      status: 'APPROVED',
      clockOut: { not: null },
      qbSynced: false,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { clockIn: 'asc' },
  })

  if (entries.length === 0) {
    return result
  }

  // Get employees from QuickBooks to map users
  let qbEmployees: any[] = []
  try {
    qbEmployees = await getEmployees()
  } catch (error) {
    // Continue without employee mapping
  }

  // Create employee mapping (by email match)
  const employeeMap = new Map<string, string>()
  for (const emp of qbEmployees) {
    if (emp.PrimaryEmailAddr?.Address) {
      employeeMap.set(emp.PrimaryEmailAddr.Address.toLowerCase(), emp.Id)
    }
    if (emp.DisplayName) {
      employeeMap.set(emp.DisplayName.toLowerCase(), emp.Id)
    }
  }

  // Process each entry
  for (const entry of entries) {
    try {
      if (!entry.clockOut) continue

      const duration = calculateDuration(new Date(entry.clockIn), new Date(entry.clockOut))

      const qbEmployeeId =
        employeeMap.get(entry.user.email?.toLowerCase() || '') ||
        employeeMap.get(entry.user.name?.toLowerCase() || '')

      const payload: TimeActivityPayload = {
        TxnDate: new Date(entry.clockIn).toISOString().split('T')[0],
        NameOf: 'Employee',
        Hours: duration.hours,
        Minutes: duration.minutes,
        Description: `Time entry from ConstructionPro - ${entry.project.name}${entry.notes ? ': ' + entry.notes : ''}`,
        BillableStatus: 'Billable',
      }

      if (qbEmployeeId) {
        payload.EmployeeRef = {
          value: qbEmployeeId,
          name: entry.user.name || undefined,
        }
      }

      const timeActivity = await createTimeActivity(payload)

      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          qbSynced: true,
          qbSyncedAt: new Date(),
          qbTimeActivityId: timeActivity.Id,
          qbSyncError: null,
        },
      })

      result.syncedCount++
      result.details.push({ entryId: entry.id, qbId: timeActivity.Id })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: { qbSyncError: errorMessage },
      })

      result.failedCount++
      result.errors.push({ entryId: entry.id, error: errorMessage })
    }
  }

  result.success = result.failedCount === 0
  return result
}

/**
 * Get sync status summary
 */
export async function getSyncStatus(): Promise<{
  totalApproved: number
  synced: number
  pendingSync: number
  failed: number
  lastSyncTime: Date | null
}> {
  const [totalApproved, synced, failed, lastSynced] = await Promise.all([
    prisma.timeEntry.count({
      where: { status: 'APPROVED', clockOut: { not: null } },
    }),
    prisma.timeEntry.count({
      where: { qbSynced: true },
    }),
    prisma.timeEntry.count({
      where: { qbSyncError: { not: null } },
    }),
    prisma.timeEntry.findFirst({
      where: { qbSynced: true },
      orderBy: { qbSyncedAt: 'desc' },
      select: { qbSyncedAt: true },
    }),
  ])

  return {
    totalApproved,
    synced,
    pendingSync: totalApproved - synced,
    failed,
    lastSyncTime: lastSynced?.qbSyncedAt || null,
  }
}

/**
 * Disconnect QuickBooks (remove stored credentials)
 */
export async function disconnectQuickBooks(): Promise<void> {
  await prisma.integrationCredential.deleteMany({
    where: { provider: 'quickbooks' },
  })
}
