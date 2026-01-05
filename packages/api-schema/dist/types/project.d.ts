import { z } from 'zod';
/**
 * Client reference for projects
 */
export declare const ClientRefSchema: z.ZodObject<{
    id: z.ZodString;
    companyName: z.ZodString;
    contactName: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    companyName: string;
    contactName: string | null;
}, {
    id: string;
    companyName: string;
    contactName: string | null;
}>;
export type ClientRef = z.infer<typeof ClientRefSchema>;
/**
 * Project schema - Full project object
 */
export declare const ProjectSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    status: z.ZodEnum<["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"]>;
    description: z.ZodNullable<z.ZodString>;
    startDate: z.ZodNullable<z.ZodString>;
    endDate: z.ZodNullable<z.ZodString>;
    address: z.ZodObject<{
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
    client: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        companyName: z.ZodString;
        contactName: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        companyName: string;
        contactName: string | null;
    }, {
        id: string;
        companyName: string;
        contactName: string | null;
    }>>;
    team: z.ZodOptional<z.ZodArray<z.ZodObject<{
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
    }>, "many">>;
    dailyLogCount: z.ZodOptional<z.ZodNumber>;
    documentCount: z.ZodOptional<z.ZodNumber>;
    openIncidentCount: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "PLANNING" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    address: {
        street: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        country: string | null;
        latitude?: number | null | undefined;
        longitude?: number | null | undefined;
        formatted?: string | undefined;
    };
    client: {
        id: string;
        companyName: string;
        contactName: string | null;
    } | null;
    team?: {
        id: string;
        name: string;
        email?: string | undefined;
    }[] | undefined;
    dailyLogCount?: number | undefined;
    documentCount?: number | undefined;
    openIncidentCount?: number | undefined;
}, {
    status: "ACTIVE" | "PLANNING" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    address: {
        street: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        latitude?: number | null | undefined;
        longitude?: number | null | undefined;
        country?: string | null | undefined;
        formatted?: string | undefined;
    };
    client: {
        id: string;
        companyName: string;
        contactName: string | null;
    } | null;
    team?: {
        id: string;
        name: string;
        email?: string | undefined;
    }[] | undefined;
    dailyLogCount?: number | undefined;
    documentCount?: number | undefined;
    openIncidentCount?: number | undefined;
}>;
export type Project = z.infer<typeof ProjectSchema>;
/**
 * Project summary (for list views)
 */
export declare const ProjectSummarySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    status: z.ZodEnum<["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"]>;
    address: z.ZodObject<{
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
    clientName: z.ZodNullable<z.ZodString>;
    dailyLogCount: z.ZodNumber;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "PLANNING" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
    id: string;
    name: string;
    updatedAt: string;
    address: {
        street: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        country: string | null;
        latitude?: number | null | undefined;
        longitude?: number | null | undefined;
        formatted?: string | undefined;
    };
    dailyLogCount: number;
    clientName: string | null;
}, {
    status: "ACTIVE" | "PLANNING" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
    id: string;
    name: string;
    updatedAt: string;
    address: {
        street: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        latitude?: number | null | undefined;
        longitude?: number | null | undefined;
        country?: string | null | undefined;
        formatted?: string | undefined;
    };
    dailyLogCount: number;
    clientName: string | null;
}>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
/**
 * Create project input
 */
export declare const CreateProjectInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"]>>>;
    startDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clientId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    addressStreet: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    addressCity: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    addressState: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    addressZipCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    addressCountry: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    gpsLatitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    gpsLongitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "PLANNING" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
    name: string;
    description?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    address?: string | null | undefined;
    clientId?: string | null | undefined;
    addressStreet?: string | null | undefined;
    addressCity?: string | null | undefined;
    addressState?: string | null | undefined;
    addressZipCode?: string | null | undefined;
    addressCountry?: string | null | undefined;
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
}, {
    name: string;
    status?: "ACTIVE" | "PLANNING" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED" | undefined;
    description?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    address?: string | null | undefined;
    clientId?: string | null | undefined;
    addressStreet?: string | null | undefined;
    addressCity?: string | null | undefined;
    addressState?: string | null | undefined;
    addressZipCode?: string | null | undefined;
    addressCountry?: string | null | undefined;
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
}>;
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
/**
 * Update project input
 */
export declare const UpdateProjectInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodEnum<["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"]>>>>;
    startDate: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    endDate: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    clientId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    address: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    addressStreet: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    addressCity: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    addressState: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    addressZipCode: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    addressCountry: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    gpsLatitude: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    gpsLongitude: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "PLANNING" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED" | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    address?: string | null | undefined;
    clientId?: string | null | undefined;
    addressStreet?: string | null | undefined;
    addressCity?: string | null | undefined;
    addressState?: string | null | undefined;
    addressZipCode?: string | null | undefined;
    addressCountry?: string | null | undefined;
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
}, {
    status?: "ACTIVE" | "PLANNING" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED" | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    address?: string | null | undefined;
    clientId?: string | null | undefined;
    addressStreet?: string | null | undefined;
    addressCity?: string | null | undefined;
    addressState?: string | null | undefined;
    addressZipCode?: string | null | undefined;
    addressCountry?: string | null | undefined;
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
}>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
//# sourceMappingURL=project.d.ts.map