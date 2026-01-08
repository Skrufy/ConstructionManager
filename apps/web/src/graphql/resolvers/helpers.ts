/**
 * GraphQL resolver helper functions
 */

export interface PaginationArgs {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  edges: Array<{ node: T; cursor: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
}

/**
 * Encode an ID into a cursor
 */
export function encodeCursor(id: string): string {
  return Buffer.from(`cursor:${id}`).toString('base64');
}

/**
 * Decode a cursor back to an ID
 */
export function decodeCursor(cursor: string): string {
  const decoded = Buffer.from(cursor, 'base64').toString('utf8');
  return decoded.replace('cursor:', '');
}

/**
 * Build a where clause from optional filters
 */
export function buildWhereClause(filters: Record<string, unknown>): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      where[key] = value;
    }
  }

  return where;
}

interface PaginateOptions<T> {
  model: {
    count: (args: { where?: Record<string, unknown> }) => Promise<number>;
    findMany: (args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, string>;
      skip?: number;
      take?: number;
    }) => Promise<T[]>;
  };
  where: Record<string, unknown>;
  args: PaginationArgs;
  orderBy?: Record<string, string>;
}

/**
 * Paginate results with cursor-based pagination
 */
export async function paginateResults<T extends { id: string }>({
  model,
  where,
  args,
  orderBy = { createdAt: 'desc' },
}: PaginateOptions<T>): Promise<PaginatedResult<T>> {
  const page = args.page ?? 1;
  const pageSize = Math.min(args.pageSize ?? 25, 100); // Max 100 items per page

  const skip = (page - 1) * pageSize;
  const take = pageSize + 1; // Fetch one extra to check if there are more

  const [items, totalCount] = await Promise.all([
    model.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    model.count({ where }),
  ]);

  const hasNextPage = items.length > pageSize;
  const results = hasNextPage ? items.slice(0, -1) : items;

  const edges = results.map((item) => ({
    node: item,
    cursor: encodeCursor(item.id),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: page > 1,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    },
    totalCount,
  };
}

/**
 * Format an address object from Prisma fields
 */
export function formatAddress(project: {
  address?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  addressCountry?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
}) {
  const parts = [
    project.addressStreet,
    project.addressCity,
    project.addressState && project.addressZipCode
      ? `${project.addressState} ${project.addressZipCode}`
      : project.addressState || project.addressZipCode,
    project.addressCountry !== 'USA' ? project.addressCountry : null,
  ].filter(Boolean);

  const formatted = parts.join(', ') || project.address || '';

  return {
    street: project.addressStreet,
    city: project.addressCity,
    state: project.addressState,
    zipCode: project.addressZipCode,
    country: project.addressCountry,
    latitude: project.gpsLatitude,
    longitude: project.gpsLongitude,
    formatted,
  };
}

/**
 * Calculate total hours from a time entry
 */
export function calculateTotalHours(entry: {
  clockIn: Date;
  clockOut: Date | null;
  breakMinutes: number;
}): number | null {
  if (!entry.clockOut) return null;

  const ms = entry.clockOut.getTime() - entry.clockIn.getTime();
  const hours = ms / (1000 * 60 * 60);
  const breakHours = entry.breakMinutes / 60;

  return Math.round((hours - breakHours) * 100) / 100;
}

/**
 * Validate that a user has access to perform an action
 */
export function validateOwnershipOrRole(
  userId: string,
  resourceOwnerId: string,
  userRole: string,
  allowedRoles: string[] = ['ADMIN', 'PROJECT_MANAGER']
): boolean {
  if (userId === resourceOwnerId) return true;
  return allowedRoles.includes(userRole);
}
