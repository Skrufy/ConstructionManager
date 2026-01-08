import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Samsara Integration Placeholder
// This can be connected to Samsara Fleet API for equipment tracking

interface SamsaraConfig {
  apiToken: string | undefined
  orgId: string | undefined
}

function getSamsaraConfig(): SamsaraConfig {
  return {
    apiToken: process.env.SAMSARA_API_TOKEN,
    orgId: process.env.SAMSARA_ORG_ID
  }
}

function isConfigured(): boolean {
  const config = getSamsaraConfig()
  return !!(config.apiToken)
}

// Fetch real equipment data from Samsara API
async function getSamsaraEquipmentData(apiToken: string): Promise<Array<{
  samsaraId: string
  name: string
  latitude: number
  longitude: number
  speed: number
  engineHours: number
  fuelLevel: number
  lastUpdate: string
}> | null> {
  try {
    const response = await fetch('https://api.samsara.com/fleet/vehicles/locations', {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    })

    if (!response.ok) {
      console.error('Samsara API error:', response.status)
      return null
    }

    const data = await response.json()
    // Transform Samsara response to our format
    return data.data?.map((vehicle: Record<string, unknown>) => ({
      samsaraId: vehicle.id as string,
      name: vehicle.name as string,
      latitude: (vehicle.gps as Record<string, number>)?.latitude || 0,
      longitude: (vehicle.gps as Record<string, number>)?.longitude || 0,
      speed: (vehicle.gps as Record<string, number>)?.speedMilesPerHour || 0,
      engineHours: (vehicle.engineState as Record<string, number>)?.engineHours || 0,
      fuelLevel: (vehicle.fuelPercent as Record<string, number>)?.value || 0,
      lastUpdate: new Date().toISOString()
    })) || []
  } catch (error) {
    console.error('Error fetching Samsara data:', error)
    return null
  }
}

// GET /api/integrations/samsara - Get integration status and equipment data
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const configured = isConfigured()

    // Get equipment stats
    const equipmentStats = await prisma.equipment.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    if (action === 'locations') {
      const config = getSamsaraConfig()

      if (!config.apiToken) {
        return NextResponse.json({
          configured: false,
          error: 'Samsara integration not configured. Add SAMSARA_API_TOKEN to environment variables.',
          equipment: [],
          lastUpdate: null
        })
      }

      const equipmentData = await getSamsaraEquipmentData(config.apiToken)

      if (!equipmentData) {
        return NextResponse.json({
          configured: true,
          error: 'Failed to fetch data from Samsara API',
          equipment: [],
          lastUpdate: null
        })
      }

      return NextResponse.json({
        configured: true,
        equipment: equipmentData,
        lastUpdate: new Date().toISOString()
      })
    }

    return NextResponse.json({
      configured,
      connected: configured,
      lastSync: null,
      stats: {
        totalEquipment: equipmentStats.reduce((acc, s) => acc + s._count.status, 0),
        byStatus: Object.fromEntries(equipmentStats.map(s => [s.status, s._count.status]))
      },
      features: {
        liveGPS: true,
        engineHours: true,
        fuelTracking: true,
        maintenanceAlerts: true
      }
    })
  } catch (error) {
    console.error('Samsara status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/integrations/samsara - Sync equipment data
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!['ADMIN', 'PROJECT_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'sync' || action === 'sync-equipment') {
      const config = getSamsaraConfig()

      if (!config.apiToken) {
        return NextResponse.json({
          error: 'Samsara integration not configured. Add SAMSARA_API_TOKEN to environment variables.'
        }, { status: 400 })
      }

      const equipmentData = await getSamsaraEquipmentData(config.apiToken)

      if (!equipmentData || equipmentData.length === 0) {
        return NextResponse.json({
          error: 'Failed to fetch equipment data from Samsara API'
        }, { status: 500 })
      }

      // Update equipment records with GPS data from Samsara
      const results = await Promise.all(
        equipmentData.map(async (eq) => {
          try {
            const updated = await prisma.equipment.updateMany({
              where: { samsaraId: eq.samsaraId },
              data: {
                currentLat: eq.latitude,
                currentLng: eq.longitude,
                lastUpdated: new Date()
              }
            })
            return { samsaraId: eq.samsaraId, success: true, updated: updated.count }
          } catch (err) {
            return { samsaraId: eq.samsaraId, success: false, error: 'Update failed' }
          }
        })
      )

      return NextResponse.json({
        success: true,
        message: 'Equipment sync completed',
        results,
        syncedCount: results.filter(r => r.success).length
      })
    }

    if (action === 'sync-usage') {
      const config = getSamsaraConfig()

      if (!config.apiToken) {
        return NextResponse.json({
          error: 'Samsara integration not configured. Add SAMSARA_API_TOKEN to environment variables.'
        }, { status: 400 })
      }

      const equipmentData = await getSamsaraEquipmentData(config.apiToken)

      if (!equipmentData || equipmentData.length === 0) {
        return NextResponse.json({
          error: 'Failed to fetch equipment data from Samsara API'
        }, { status: 500 })
      }

      // Create equipment log entries from real Samsara data
      const logs = await Promise.all(
        equipmentData.map(async (eq) => {
          const equipment = await prisma.equipment.findFirst({
            where: { samsaraId: eq.samsaraId }
          })

          if (equipment) {
            return prisma.equipmentLog.create({
              data: {
                equipmentId: equipment.id,
                date: new Date(),
                hoursUsed: eq.engineHours,
                fuelUsed: null,
                gpsData: { lat: eq.latitude, lng: eq.longitude },
                notes: 'Auto-synced from Samsara'
              }
            })
          }
          return null
        })
      )

      return NextResponse.json({
        success: true,
        message: 'Usage data synced',
        logsCreated: logs.filter(Boolean).length
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Samsara sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
