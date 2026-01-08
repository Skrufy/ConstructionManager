/**
 * DroneDeploy Sync Service
 *
 * Syncs data from DroneDeploy to local database using GraphQL API:
 * - Fetches plans (projects) from DroneDeploy
 * - Matches them to local projects by name or GPS coordinates
 * - Syncs exports (orthomosaics, 3D models, etc.) as project documents
 *
 * DroneDeploy GraphQL API Docs:
 * - Schema: https://developer.dronedeploy.com/reference/
 * - Explorer: https://www.dronedeploy.com/graphiql/
 */

import { prisma } from '@/lib/prisma'

const DRONEDEPLOY_GRAPHQL_URL = 'https://www.dronedeploy.com/graphql'

// GraphQL Queries
const QUERIES = {
  // Fetch all plans with pagination
  PLANS: `
    query GetPlans($first: Int!, $after: String) {
      viewer {
        plans(first: $first, after: $after) {
          edges {
            node {
              id
              name
              location { lat lng }
              geometry { lat lng }
              camera
              imageCount
              dateCreated
              dateModified
              state
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `,

  // Fetch a single plan by ID
  PLAN: `
    query GetPlan($id: ID!) {
      node(id: $id) {
        ... on MapPlan {
          id
          name
          location { lat lng }
          geometry { lat lng }
          camera
          imageCount
          dateCreated
          dateModified
          state
        }
      }
    }
  `,

  // Fetch exports for a plan
  EXPORTS: `
    query GetExports($planId: ID!, $first: Int!) {
      node(id: $planId) {
        ... on MapPlan {
          id
          exports(first: $first) {
            edges {
              node {
                id
                dateCreation
                dateExpiration
                downloadPath
                status
                parameters {
                  layer
                  fileFormat
                  projection
                  merge
                }
              }
            }
          }
        }
      }
    }
  `,

  // Fetch plan with exports and tiles in one query (optimized)
  PLAN_WITH_DETAILS: `
    query GetPlanWithDetails($planId: ID!) {
      node(id: $planId) {
        ... on MapPlan {
          id
          name
          location { lat lng }
          geometry { lat lng }
          camera
          imageCount
          dateCreated
          dateModified
          state
          exports(first: 50) {
            edges {
              node {
                id
                dateCreation
                dateExpiration
                downloadPath
                status
                parameters {
                  layer
                  fileFormat
                  projection
                  merge
                }
              }
            }
          }
          tileTemplate {
            orthoUrl
            elevationUrl
            plantHealthUrl
            meshUrl
            pointCloudUrl
            expires
          }
        }
      }
    }
  `,

  // Fetch tile template for a plan
  TILE_TEMPLATE: `
    query GetTileTemplate($planId: ID!) {
      node(id: $planId) {
        ... on MapPlan {
          id
          tileTemplate {
            orthoUrl
            elevationUrl
            plantHealthUrl
            meshUrl
            pointCloudUrl
            expires
            location { lat lng }
          }
        }
      }
    }
  `,
}

// TypeScript interfaces for API responses
interface DroneDeployPlan {
  id: string
  name: string
  location: {
    lat: number
    lng: number
  } | null
  geometry?: {
    lat: number
    lng: number
  } | null
  camera?: string
  imageCount?: number
  dateCreated: string
  dateModified: string
  state?: string // 'complete', 'processing', 'pending', etc.
}

interface DroneDeployExport {
  id: string
  planId: string
  dateCreation: string
  dateExpiration?: string
  downloadPath?: string
  status: string // 'complete', 'processing', 'failed'
  parameters: {
    layer: string // 'orthomosaic', 'elevation', '3d', 'plant_health', 'point_cloud'
    fileFormat?: string
    projection?: number
    merge?: boolean
  }
}

interface DroneDeployTileTemplate {
  planId: string
  orthoUrl?: string
  elevationUrl?: string
  plantHealthUrl?: string
  meshUrl?: string
  pointCloudUrl?: string
  expires?: string
  location?: {
    lat: number
    lng: number
  }
}

interface SyncResult {
  success: boolean
  plansFound: number
  plansSynced: number
  exportsCreated: number
  errors: string[]
}

interface ProjectMatch {
  projectId: string
  projectName: string
  planId: string
  planName: string
  matchType: 'NAME' | 'GPS' | 'MANUAL'
  confidence: number
  distance?: number // For GPS matches, distance in meters
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string; path?: string[] }>
}

/**
 * Get the DroneDeploy API key from environment
 */
function getApiKey(): string | null {
  return process.env.DRONEDEPLOY_API_KEY || null
}

/**
 * Execute a GraphQL query against DroneDeploy API
 */
async function graphqlQuery<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('DRONEDEPLOY_API_KEY not configured')
  }

  const response = await fetch(DRONEDEPLOY_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DroneDeploy GraphQL error (${response.status}): ${errorText}`)
  }

  const result: GraphQLResponse<T> = await response.json()

  if (result.errors && result.errors.length > 0) {
    const errorMessages = result.errors.map(e => e.message).join(', ')
    throw new Error(`DroneDeploy GraphQL error: ${errorMessages}`)
  }

  if (!result.data) {
    throw new Error('DroneDeploy GraphQL returned no data')
  }

  return result.data
}

// Response type for plans query
interface PlansResponse {
  viewer: {
    plans: {
      edges: Array<{
        node: DroneDeployPlan
        cursor: string
      }>
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
    }
  }
}

/**
 * Fetch all plans from DroneDeploy using GraphQL with cursor pagination
 */
export async function fetchPlans(): Promise<DroneDeployPlan[]> {
  const plans: DroneDeployPlan[] = []
  let hasMore = true
  let cursor: string | null = null

  while (hasMore) {
    const data: PlansResponse = await graphqlQuery<PlansResponse>(QUERIES.PLANS, {
      first: 50,
      after: cursor,
    })

    const planEdges = data.viewer?.plans?.edges || []
    for (const edge of planEdges) {
      if (edge.node) {
        // Ensure location has default values if null
        plans.push({
          ...edge.node,
          location: edge.node.location || { lat: 0, lng: 0 },
        })
      }
    }

    hasMore = data.viewer?.plans?.pageInfo?.hasNextPage || false
    cursor = data.viewer?.plans?.pageInfo?.endCursor || null
  }

  return plans
}

/**
 * Fetch a single plan by ID using GraphQL
 */
export async function fetchPlan(planId: string): Promise<DroneDeployPlan> {
  interface PlanResponse {
    node: DroneDeployPlan | null
  }

  const data = await graphqlQuery<PlanResponse>(QUERIES.PLAN, { id: planId })

  if (!data.node) {
    throw new Error(`Plan not found: ${planId}`)
  }

  return {
    ...data.node,
    location: data.node.location || { lat: 0, lng: 0 },
  }
}

/**
 * Fetch all exports for a plan using GraphQL
 */
export async function fetchExports(planId: string): Promise<DroneDeployExport[]> {
  interface ExportsResponse {
    node: {
      id: string
      exports: {
        edges: Array<{
          node: {
            id: string
            dateCreation: string
            dateExpiration?: string
            downloadPath?: string
            status: string
            parameters: {
              layer: string
              fileFormat?: string
              projection?: number
              merge?: boolean
            }
          }
        }>
      }
    } | null
  }

  const data = await graphqlQuery<ExportsResponse>(QUERIES.EXPORTS, {
    planId,
    first: 100,
  })

  if (!data.node?.exports?.edges) {
    return []
  }

  return data.node.exports.edges.map(edge => ({
    ...edge.node,
    planId,
    parameters: {
      ...edge.node.parameters,
      file_format: edge.node.parameters.fileFormat, // Map to snake_case for compatibility
    },
  }))
}

/**
 * Fetch tile template URLs for a plan using GraphQL
 */
export async function fetchTileTemplate(planId: string): Promise<DroneDeployTileTemplate> {
  interface TileResponse {
    node: {
      id: string
      tileTemplate: {
        orthoUrl?: string
        elevationUrl?: string
        plantHealthUrl?: string
        meshUrl?: string
        pointCloudUrl?: string
        expires?: string
        location?: { lat: number; lng: number }
      } | null
    } | null
  }

  const data = await graphqlQuery<TileResponse>(QUERIES.TILE_TEMPLATE, { planId })

  if (!data.node?.tileTemplate) {
    return { planId }
  }

  return {
    planId,
    ...data.node.tileTemplate,
  }
}

/**
 * Fetch plan with all details (exports + tiles) in a single GraphQL query
 * More efficient than making separate calls
 */
export async function fetchPlanWithDetails(planId: string): Promise<{
  plan: DroneDeployPlan
  exports: DroneDeployExport[]
  tiles: DroneDeployTileTemplate
}> {
  interface PlanDetailsResponse {
    node: {
      id: string
      name: string
      location: { lat: number; lng: number } | null
      geometry?: { lat: number; lng: number } | null
      camera?: string
      imageCount?: number
      dateCreated: string
      dateModified: string
      state?: string
      exports: {
        edges: Array<{
          node: {
            id: string
            dateCreation: string
            dateExpiration?: string
            downloadPath?: string
            status: string
            parameters: {
              layer: string
              fileFormat?: string
              projection?: number
              merge?: boolean
            }
          }
        }>
      }
      tileTemplate: {
        orthoUrl?: string
        elevationUrl?: string
        plantHealthUrl?: string
        meshUrl?: string
        pointCloudUrl?: string
        expires?: string
      } | null
    } | null
  }

  const data = await graphqlQuery<PlanDetailsResponse>(QUERIES.PLAN_WITH_DETAILS, { planId })

  if (!data.node) {
    throw new Error(`Plan not found: ${planId}`)
  }

  const plan: DroneDeployPlan = {
    id: data.node.id,
    name: data.node.name,
    location: data.node.location || { lat: 0, lng: 0 },
    geometry: data.node.geometry,
    camera: data.node.camera,
    imageCount: data.node.imageCount,
    dateCreated: data.node.dateCreated,
    dateModified: data.node.dateModified,
    state: data.node.state,
  }

  const exports: DroneDeployExport[] = (data.node.exports?.edges || []).map(edge => ({
    ...edge.node,
    planId,
    parameters: {
      ...edge.node.parameters,
      file_format: edge.node.parameters.fileFormat,
    },
  }))

  const tiles: DroneDeployTileTemplate = {
    planId,
    ...(data.node.tileTemplate || {}),
  }

  return { plan, exports, tiles }
}

/**
 * Calculate distance between two GPS coordinates in meters
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Normalize a project name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .trim()
}

/**
 * Find potential matches between DroneDeploy plans and local projects
 */
export async function findProjectMatches(plans: DroneDeployPlan[]): Promise<ProjectMatch[]> {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      gpsLatitude: true,
      gpsLongitude: true,
    },
  })

  const matches: ProjectMatch[] = []
  const GPS_THRESHOLD_METERS = 500 // Within 500m is considered a match

  for (const plan of plans) {
    for (const project of projects) {
      // Check for name match
      const normalizedPlanName = normalizeName(plan.name)
      const normalizedProjectName = normalizeName(project.name)

      if (normalizedPlanName.includes(normalizedProjectName) ||
          normalizedProjectName.includes(normalizedPlanName)) {
        matches.push({
          projectId: project.id,
          projectName: project.name,
          planId: plan.id,
          planName: plan.name,
          matchType: 'NAME',
          confidence: normalizedPlanName === normalizedProjectName ? 1.0 : 0.8,
        })
        continue
      }

      // Check for GPS match
      if (project.gpsLatitude && project.gpsLongitude && plan.location) {
        const distance = calculateDistance(
          project.gpsLatitude,
          project.gpsLongitude,
          plan.location.lat,
          plan.location.lng
        )

        if (distance <= GPS_THRESHOLD_METERS) {
          matches.push({
            projectId: project.id,
            projectName: project.name,
            planId: plan.id,
            planName: plan.name,
            matchType: 'GPS',
            confidence: Math.max(0.5, 1 - distance / GPS_THRESHOLD_METERS),
            distance,
          })
        }
      }
    }
  }

  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Create or update a sync mapping between a project and a DroneDeploy plan
 */
export async function createSyncMapping(
  projectId: string,
  planId: string,
  planName: string,
  metadata?: Record<string, unknown>
) {
  return prisma.droneDeploySync.upsert({
    where: { droneDeployPlanId: planId },
    create: {
      projectId,
      droneDeployPlanId: planId,
      droneDeployPlanName: planName,
      syncEnabled: true,
      autoSync: true,
      syncExports: true,
      metadata: metadata as object | undefined,
    },
    update: {
      projectId,
      droneDeployPlanName: planName,
      metadata: metadata as object | undefined,
    },
  })
}

/**
 * Get all existing sync mappings
 */
export async function getSyncMappings() {
  return prisma.droneDeploySync.findMany({
    include: {
      project: {
        select: { id: true, name: true },
      },
      exports: {
        select: { id: true, name: true, exportType: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

/**
 * Map DroneDeploy export layer to our export type
 */
function mapLayerToExportType(layer: string): string {
  const mapping: Record<string, string> = {
    orthomosaic: 'ORTHOMOSAIC',
    elevation: 'ELEVATION',
    '3d': '3D_MODEL',
    plant_health: 'PLANT_HEALTH',
    point_cloud: 'POINT_CLOUD',
    thermal: 'THERMAL',
  }
  return mapping[layer.toLowerCase()] || layer.toUpperCase()
}

/**
 * Map export type to file category for documents
 */
function exportTypeToCategory(exportType: string): string {
  switch (exportType) {
    case 'ORTHOMOSAIC':
    case 'ELEVATION':
    case 'PLANT_HEALTH':
      return 'AERIAL_MAPS'
    case '3D_MODEL':
    case 'POINT_CLOUD':
      return 'MODELS_3D'
    case 'THERMAL':
      return 'THERMAL'
    default:
      return 'DRONE_DATA'
  }
}

/**
 * Sync exports for a specific plan mapping
 * Uses single GraphQL query for efficiency (plan + exports + tiles in one request)
 */
export async function syncExportsForMapping(syncId: string): Promise<{
  created: number
  updated: number
  errors: string[]
}> {
  const sync = await prisma.droneDeploySync.findUnique({
    where: { id: syncId },
    include: { project: true },
  })

  if (!sync) {
    throw new Error('Sync mapping not found')
  }

  const result = { created: 0, updated: 0, errors: [] as string[] }

  try {
    // Use optimized single GraphQL query for plan + exports + tiles
    const { exports, tiles } = await fetchPlanWithDetails(sync.droneDeployPlanId)

    for (const ddExport of exports) {
      // Skip if not complete
      if (ddExport.status !== 'complete') {
        continue
      }

      const exportType = mapLayerToExportType(ddExport.parameters.layer)

      // Check if we already have this export
      const existing = await prisma.droneDeployExport.findUnique({
        where: { droneDeployId: ddExport.id },
      })

      if (existing) {
        // Update if needed
        await prisma.droneDeployExport.update({
          where: { id: existing.id },
          data: {
            downloadUrl: ddExport.downloadPath,
            status: ddExport.status === 'complete' ? 'COMPLETED' : 'PENDING',
          },
        })
        result.updated++
      } else {
        // Create new export record
        await prisma.droneDeployExport.create({
          data: {
            syncId: sync.id,
            droneDeployId: ddExport.id,
            exportType,
            name: `${sync.project.name} - ${exportType} - ${new Date(ddExport.dateCreation).toLocaleDateString()}`,
            capturedAt: new Date(ddExport.dateCreation),
            processedAt: new Date(ddExport.dateCreation),
            downloadUrl: ddExport.downloadPath,
            status: ddExport.status === 'complete' ? 'COMPLETED' : 'PENDING',
            metadata: ddExport.parameters as object,
          },
        })
        result.created++
      }
    }

    // Update sync with tile URLs (already fetched in single query)
    if (tiles.orthoUrl || tiles.elevationUrl || tiles.meshUrl) {
      await prisma.droneDeploySync.update({
        where: { id: sync.id },
        data: {
          metadata: {
            ...(sync.metadata as object || {}),
            tileUrls: {
              orthomosaic: tiles.orthoUrl,
              elevation: tiles.elevationUrl,
              plantHealth: tiles.plantHealthUrl,
              mesh: tiles.meshUrl,
              pointCloud: tiles.pointCloudUrl,
              expires: tiles.expires,
            },
          },
        },
      })
    }

    // Update sync status
    await prisma.droneDeploySync.update({
      where: { id: sync.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'SUCCESS',
        lastSyncError: null,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)

    await prisma.droneDeploySync.update({
      where: { id: sync.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'FAILED',
        lastSyncError: errorMessage,
      },
    })
  }

  return result
}

/**
 * Convert a DroneDeploy export to a project document (File record)
 */
export async function exportToDocument(
  exportId: string,
  uploadedBy: string
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  const ddExport = await prisma.droneDeployExport.findUnique({
    where: { id: exportId },
    include: {
      sync: {
        include: { project: true },
      },
    },
  })

  if (!ddExport) {
    return { success: false, error: 'Export not found' }
  }

  if (!ddExport.downloadUrl) {
    return { success: false, error: 'Export does not have a download URL' }
  }

  // Create a File record for this export
  const file = await prisma.file.create({
    data: {
      projectId: ddExport.sync.projectId,
      name: ddExport.name,
      type: 'drone_export',
      storagePath: ddExport.downloadUrl, // For now, store the DD URL
      uploadedBy,
      category: exportTypeToCategory(ddExport.exportType),
      source: 'DRONEDEPLOY',
      description: `Imported from DroneDeploy: ${ddExport.exportType}`,
      tags: [ddExport.exportType, 'DroneDeploy', 'Aerial'],
      takenAt: ddExport.capturedAt,
    },
  })

  // Link the export to the file
  await prisma.droneDeployExport.update({
    where: { id: exportId },
    data: {
      localFileId: file.id,
      status: 'COMPLETED',
    },
  })

  return { success: true, fileId: file.id }
}

/**
 * Run a full sync for all enabled mappings
 */
export async function runFullSync(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    plansFound: 0,
    plansSynced: 0,
    exportsCreated: 0,
    errors: [],
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return {
      ...result,
      success: false,
      errors: ['DRONEDEPLOY_API_KEY not configured'],
    }
  }

  try {
    // Get all enabled sync mappings
    const mappings = await prisma.droneDeploySync.findMany({
      where: { syncEnabled: true },
    })

    for (const mapping of mappings) {
      try {
        const syncResult = await syncExportsForMapping(mapping.id)
        result.exportsCreated += syncResult.created
        result.plansSynced++
        result.errors.push(...syncResult.errors)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Failed to sync ${mapping.droneDeployPlanName}: ${errorMessage}`)
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.success = false
    result.errors.push(`Sync failed: ${errorMessage}`)
  }

  return result
}

/**
 * Get sync status overview
 */
export async function getSyncStatus() {
  const apiKey = getApiKey()
  const mappings = await prisma.droneDeploySync.findMany({
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { exports: true } },
    },
  })

  const exports = await prisma.droneDeployExport.groupBy({
    by: ['status'],
    _count: true,
  })

  return {
    configured: !!apiKey,
    totalMappings: mappings.length,
    enabledMappings: mappings.filter((m) => m.syncEnabled).length,
    mappings: mappings.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      projectName: m.project.name,
      planId: m.droneDeployPlanId,
      planName: m.droneDeployPlanName,
      enabled: m.syncEnabled,
      autoSync: m.autoSync,
      lastSync: m.lastSyncAt,
      lastStatus: m.lastSyncStatus,
      exportCount: m._count.exports,
    })),
    exportStats: Object.fromEntries(exports.map((e) => [e.status, e._count])),
  }
}

/**
 * Delete a sync mapping
 */
export async function deleteSyncMapping(syncId: string) {
  return prisma.droneDeploySync.delete({
    where: { id: syncId },
  })
}

/**
 * Toggle sync enabled status
 */
export async function toggleSyncEnabled(syncId: string, enabled: boolean) {
  return prisma.droneDeploySync.update({
    where: { id: syncId },
    data: { syncEnabled: enabled },
  })
}
