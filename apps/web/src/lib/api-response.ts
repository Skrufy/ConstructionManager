import { NextResponse } from 'next/server';

// Type definitions for API responses
export interface Address {
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  formatted?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  address: Address;
  clientName: string | null;
  dailyLogCount: number;
  updatedAt: string;
}

export interface DailyLogSummary {
  id: string;
  date: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  weatherDelay: boolean;
  project: {
    id: string;
    name: string;
  };
  submitter: {
    id: string;
    name: string;
  };
  photoCount: number;
  crewCount: number;
  entriesCount: number;
}

/**
 * Transform a Prisma Project record to ProjectSummary API response
 */
export function transformProjectSummary(project: {
  id: string;
  name: string;
  status: string;
  address?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  addressCountry?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  client?: { companyName: string } | null;
  _count?: { dailyLogs?: number };
  updatedAt: Date;
}): ProjectSummary {
  // Build structured address
  const address: Address = {
    street: project.addressStreet ?? null,
    city: project.addressCity ?? null,
    state: project.addressState ?? null,
    zipCode: project.addressZipCode ?? null,
    country: project.addressCountry ?? 'USA',
    latitude: project.gpsLatitude ?? null,
    longitude: project.gpsLongitude ?? null,
    formatted: formatAddress(project),
  };

  return {
    id: project.id,
    name: project.name,
    status: project.status as ProjectSummary['status'],
    address,
    clientName: project.client?.companyName ?? null,
    dailyLogCount: project._count?.dailyLogs ?? 0,
    updatedAt: project.updatedAt.toISOString(),
  };
}

/**
 * Transform a Prisma DailyLog record to DailyLogSummary API response
 */
export function transformDailyLogSummary(log: {
  id: string;
  date: Date;
  status: string;
  weatherDelay: boolean;
  project: { id: string; name: string };
  submitter: { id: string; name: string };
  _count?: { photos?: number; entries?: number };
  crewCount: number;
}): DailyLogSummary {
  return {
    id: log.id,
    date: log.date.toISOString().split('T')[0], // YYYY-MM-DD
    status: log.status as DailyLogSummary['status'],
    weatherDelay: log.weatherDelay,
    project: {
      id: log.project.id,
      name: log.project.name,
    },
    submitter: {
      id: log.submitter.id,
      name: log.submitter.name,
    },
    photoCount: log._count?.photos ?? 0,
    crewCount: log.crewCount,
    entriesCount: log._count?.entries ?? 0,
  };
}

/**
 * Format address into a single line string
 */
function formatAddress(project: {
  address?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
}): string | undefined {
  // If we have structured address fields, use them
  if (project.addressStreet || project.addressCity) {
    const parts = [
      project.addressStreet,
      project.addressCity,
      [project.addressState, project.addressZipCode].filter(Boolean).join(' '),
    ].filter(Boolean);
    return parts.join(', ') || undefined;
  }
  // Fall back to legacy address field
  return project.address ?? undefined;
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  totalCount: number
) {
  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      hasNextPage: page * pageSize < totalCount,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Validate response against schema in development (optional)
 * Pass a Zod schema or null to skip validation
 */
export function validateResponse<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; error?: { issues: Array<{ path: (string | number)[]; message: string }> } } } | null,
  data: T,
  endpoint: string
): T {
  // Only validate in development for debugging
  if (process.env.NODE_ENV === 'development' && schema) {
    const result = schema.safeParse(data);
    if (!result.success && result.error) {
      console.warn(
        `[API Schema Warning] ${endpoint}:`,
        result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      );
    }
  }
  return data;
}
