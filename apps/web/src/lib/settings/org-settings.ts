import { prisma } from '@/lib/prisma'

export interface OrgSettingsData {
  id: string
  ocrEnabled: boolean
  ocrProvider: string
  updatedAt: Date
  updatedBy: string | null
}

const DEFAULT_SETTINGS: Omit<OrgSettingsData, 'id' | 'updatedAt'> = {
  ocrEnabled: true,
  ocrProvider: 'openai',
  updatedBy: null
}

/**
 * Get organization settings, creating defaults if they don't exist
 */
export async function getOrgSettings(): Promise<OrgSettingsData> {
  let settings = await prisma.orgSettings.findFirst()

  if (!settings) {
    // Create default settings
    settings = await prisma.orgSettings.create({
      data: {
        ocrEnabled: DEFAULT_SETTINGS.ocrEnabled,
        ocrProvider: DEFAULT_SETTINGS.ocrProvider
      }
    })
  }

  return settings
}

/**
 * Update organization settings
 */
export async function updateOrgSettings(
  data: Partial<Pick<OrgSettingsData, 'ocrEnabled' | 'ocrProvider'>>,
  updatedBy: string
): Promise<OrgSettingsData> {
  const existing = await prisma.orgSettings.findFirst()

  if (existing) {
    return prisma.orgSettings.update({
      where: { id: existing.id },
      data: {
        ...data,
        updatedBy
      }
    })
  }

  // Create if doesn't exist
  return prisma.orgSettings.create({
    data: {
      ocrEnabled: data.ocrEnabled ?? DEFAULT_SETTINGS.ocrEnabled,
      ocrProvider: data.ocrProvider ?? DEFAULT_SETTINGS.ocrProvider,
      updatedBy
    }
  })
}

/**
 * Check if OCR is enabled
 */
export async function isOcrEnabled(): Promise<boolean> {
  const settings = await getOrgSettings()
  return settings.ocrEnabled
}
