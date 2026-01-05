import { z } from 'zod';
/**
 * Common ID schema (CUID format)
 */
export declare const IdSchema: z.ZodString;
/**
 * ISO DateTime string schema
 */
export declare const DateTimeSchema: z.ZodString;
/**
 * ISO Date string schema (YYYY-MM-DD)
 */
export declare const DateSchema: z.ZodString;
/**
 * GPS Coordinates
 */
export declare const GpsCoordinatesSchema: z.ZodObject<{
    latitude: z.ZodNullable<z.ZodNumber>;
    longitude: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    latitude: number | null;
    longitude: number | null;
}, {
    latitude: number | null;
    longitude: number | null;
}>;
export type GpsCoordinates = z.infer<typeof GpsCoordinatesSchema>;
/**
 * Structured Address
 */
export declare const AddressSchema: z.ZodObject<{
    street: z.ZodNullable<z.ZodString>;
    city: z.ZodNullable<z.ZodString>;
    state: z.ZodNullable<z.ZodString>;
    zipCode: z.ZodNullable<z.ZodString>;
    country: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    formatted: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    street: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    country: string | null;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    formatted?: string | undefined;
}, {
    street: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    country?: string | null | undefined;
    formatted?: string | undefined;
}>;
export type Address = z.infer<typeof AddressSchema>;
/**
 * Pagination Info (cursor-based)
 */
export declare const PageInfoSchema: z.ZodObject<{
    hasNextPage: z.ZodBoolean;
    hasPreviousPage: z.ZodBoolean;
    startCursor: z.ZodNullable<z.ZodString>;
    endCursor: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
}, {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
}>;
export type PageInfo = z.infer<typeof PageInfoSchema>;
/**
 * Paginated Response wrapper
 */
export declare function createConnectionSchema<T extends z.ZodTypeAny>(nodeSchema: T): z.ZodObject<{
    edges: z.ZodArray<z.ZodObject<{
        node: T;
        cursor: z.ZodString;
    }, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
        node: T;
        cursor: z.ZodString;
    }>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
        node: T;
        cursor: z.ZodString;
    }> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>, "many">;
    pageInfo: z.ZodObject<{
        hasNextPage: z.ZodBoolean;
        hasPreviousPage: z.ZodBoolean;
        startCursor: z.ZodNullable<z.ZodString>;
        endCursor: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
    }, {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
    }>;
    totalCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    edges: (z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
        node: T;
        cursor: z.ZodString;
    }>, any> extends infer T_3 ? { [k in keyof T_3]: T_3[k]; } : never)[];
    pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
    };
    totalCount: number;
}, {
    edges: (z.baseObjectInputType<{
        node: T;
        cursor: z.ZodString;
    }> extends infer T_4 ? { [k_1 in keyof T_4]: T_4[k_1]; } : never)[];
    pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
    };
    totalCount: number;
}>;
/**
 * Simple pagination params (offset-based)
 */
export declare const PaginationParamsSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
/**
 * User Reference (minimal user info for relations)
 */
export declare const UserRefSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    email?: string | undefined;
}, {
    id: string;
    name: string;
    email?: string | undefined;
}>;
export type UserRef = z.infer<typeof UserRefSchema>;
/**
 * Project Reference (minimal project info for relations)
 */
export declare const ProjectRefSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name: string;
}>;
export type ProjectRef = z.infer<typeof ProjectRefSchema>;
//# sourceMappingURL=common.d.ts.map