import { z } from 'zod';
/**
 * Time entry schema - Full object
 */
export declare const TimeEntrySchema: z.ZodObject<{
    id: z.ZodString;
    clockIn: z.ZodString;
    clockOut: z.ZodNullable<z.ZodString>;
    breakMinutes: z.ZodDefault<z.ZodNumber>;
    status: z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>;
    notes: z.ZodNullable<z.ZodString>;
    gpsIn: z.ZodNullable<z.ZodObject<{
        latitude: z.ZodNullable<z.ZodNumber>;
        longitude: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        latitude: number | null;
        longitude: number | null;
    }, {
        latitude: number | null;
        longitude: number | null;
    }>>;
    gpsOut: z.ZodNullable<z.ZodObject<{
        latitude: z.ZodNullable<z.ZodNumber>;
        longitude: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        latitude: number | null;
        longitude: number | null;
    }, {
        latitude: number | null;
        longitude: number | null;
    }>>;
    user: z.ZodObject<{
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
    project: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>;
    approver: z.ZodNullable<z.ZodObject<{
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
    }>>;
    totalHours: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "APPROVED" | "REJECTED" | "PENDING";
    id: string;
    createdAt: string;
    updatedAt: string;
    notes: string | null;
    project: {
        id: string;
        name: string;
    };
    approver: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null;
    clockIn: string;
    clockOut: string | null;
    breakMinutes: number;
    gpsIn: {
        latitude: number | null;
        longitude: number | null;
    } | null;
    gpsOut: {
        latitude: number | null;
        longitude: number | null;
    } | null;
    user: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    totalHours?: number | undefined;
}, {
    status: "APPROVED" | "REJECTED" | "PENDING";
    id: string;
    createdAt: string;
    updatedAt: string;
    notes: string | null;
    project: {
        id: string;
        name: string;
    };
    approver: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null;
    clockIn: string;
    clockOut: string | null;
    gpsIn: {
        latitude: number | null;
        longitude: number | null;
    } | null;
    gpsOut: {
        latitude: number | null;
        longitude: number | null;
    } | null;
    user: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    breakMinutes?: number | undefined;
    totalHours?: number | undefined;
}>;
export type TimeEntry = z.infer<typeof TimeEntrySchema>;
/**
 * Active time entry (currently clocked in)
 */
export declare const ActiveTimeEntrySchema: z.ZodObject<{
    id: z.ZodString;
    clockIn: z.ZodString;
    project: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>;
    gpsIn: z.ZodNullable<z.ZodObject<{
        latitude: z.ZodNullable<z.ZodNumber>;
        longitude: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        latitude: number | null;
        longitude: number | null;
    }, {
        latitude: number | null;
        longitude: number | null;
    }>>;
    notes: z.ZodNullable<z.ZodString>;
    elapsedMinutes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    notes: string | null;
    project: {
        id: string;
        name: string;
    };
    clockIn: string;
    gpsIn: {
        latitude: number | null;
        longitude: number | null;
    } | null;
    elapsedMinutes: number;
}, {
    id: string;
    notes: string | null;
    project: {
        id: string;
        name: string;
    };
    clockIn: string;
    gpsIn: {
        latitude: number | null;
        longitude: number | null;
    } | null;
    elapsedMinutes: number;
}>;
export type ActiveTimeEntry = z.infer<typeof ActiveTimeEntrySchema>;
/**
 * Clock in input
 */
export declare const ClockInInputSchema: z.ZodObject<{
    projectId: z.ZodString;
    gpsLatitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    gpsLongitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
    notes?: string | null | undefined;
}, {
    projectId: string;
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
    notes?: string | null | undefined;
}>;
export type ClockInInput = z.infer<typeof ClockInInputSchema>;
/**
 * Clock out input
 */
export declare const ClockOutInputSchema: z.ZodObject<{
    gpsLatitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    gpsLongitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    breakMinutes: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    breakMinutes: number;
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
    notes?: string | null | undefined;
}, {
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
    notes?: string | null | undefined;
    breakMinutes?: number | undefined;
}>;
export type ClockOutInput = z.infer<typeof ClockOutInputSchema>;
/**
 * Time entry summary (for reports)
 */
export declare const TimeEntrySummarySchema: z.ZodObject<{
    userId: z.ZodString;
    userName: z.ZodString;
    projectId: z.ZodString;
    projectName: z.ZodString;
    date: z.ZodString;
    totalHours: z.ZodNumber;
    status: z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>;
}, "strip", z.ZodTypeAny, {
    status: "APPROVED" | "REJECTED" | "PENDING";
    date: string;
    userId: string;
    projectId: string;
    totalHours: number;
    userName: string;
    projectName: string;
}, {
    status: "APPROVED" | "REJECTED" | "PENDING";
    date: string;
    userId: string;
    projectId: string;
    totalHours: number;
    userName: string;
    projectName: string;
}>;
export type TimeEntrySummary = z.infer<typeof TimeEntrySummarySchema>;
//# sourceMappingURL=time-entry.d.ts.map