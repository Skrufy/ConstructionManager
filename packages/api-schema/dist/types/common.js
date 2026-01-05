import { z } from 'zod';
/**
 * Common ID schema (CUID format)
 */
export const IdSchema = z.string().min(1);
/**
 * ISO DateTime string schema
 */
export const DateTimeSchema = z.string().datetime();
/**
 * ISO Date string schema (YYYY-MM-DD)
 */
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/**
 * GPS Coordinates
 */
export const GpsCoordinatesSchema = z.object({
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
});
/**
 * Structured Address
 */
export const AddressSchema = z.object({
    street: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    zipCode: z.string().nullable(),
    country: z.string().nullable().default('USA'),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    formatted: z.string().optional(), // Computed: "123 Main St, City, ST 12345"
});
/**
 * Pagination Info (cursor-based)
 */
export const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    startCursor: z.string().nullable(),
    endCursor: z.string().nullable(),
});
/**
 * Paginated Response wrapper
 */
export function createConnectionSchema(nodeSchema) {
    const edgeSchema = z.object({
        node: nodeSchema,
        cursor: z.string(),
    });
    return z.object({
        edges: z.array(edgeSchema),
        pageInfo: PageInfoSchema,
        totalCount: z.number().int(),
    });
}
/**
 * Simple pagination params (offset-based)
 */
export const PaginationParamsSchema = z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
});
/**
 * User Reference (minimal user info for relations)
 */
export const UserRefSchema = z.object({
    id: IdSchema,
    name: z.string(),
    email: z.string().email().optional(),
});
/**
 * Project Reference (minimal project info for relations)
 */
export const ProjectRefSchema = z.object({
    id: IdSchema,
    name: z.string(),
});
//# sourceMappingURL=common.js.map