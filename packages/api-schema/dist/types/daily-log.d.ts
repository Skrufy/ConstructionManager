import { z } from 'zod';
/**
 * Photo in a daily log
 */
export declare const DailyLogPhotoSchema: z.ZodObject<{
    id: z.ZodString;
    url: z.ZodString;
    caption: z.ZodNullable<z.ZodString>;
    gpsLatitude: z.ZodNullable<z.ZodNumber>;
    gpsLongitude: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    url: string;
    gpsLatitude: number | null;
    gpsLongitude: number | null;
    caption: string | null;
}, {
    id: string;
    createdAt: string;
    url: string;
    gpsLatitude: number | null;
    gpsLongitude: number | null;
    caption: string | null;
}>;
export type DailyLogPhoto = z.infer<typeof DailyLogPhotoSchema>;
/**
 * Crew entry in a daily log
 */
export declare const CrewEntrySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    hours: z.ZodNumber;
    trade: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    hours: number;
    trade: string | null;
}, {
    id: string;
    name: string;
    hours: number;
    trade: string | null;
}>;
export type CrewEntry = z.infer<typeof CrewEntrySchema>;
/**
 * Equipment usage in a daily log
 */
export declare const EquipmentUsageSchema: z.ZodObject<{
    id: z.ZodString;
    equipment: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>;
    hours: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    equipment: {
        id: string;
        name: string;
    };
    hours: number;
}, {
    id: string;
    equipment: {
        id: string;
        name: string;
    };
    hours: number;
}>;
export type EquipmentUsage = z.infer<typeof EquipmentUsageSchema>;
/**
 * Daily log entry (activity)
 */
export declare const DailyLogEntrySchema: z.ZodObject<{
    id: z.ZodString;
    activityLabel: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>;
    locationLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        category: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        category: string;
    }, {
        id: string;
        name: string;
        category: string;
    }>, "many">>;
    statusLabel: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>>;
    percentComplete: z.ZodNullable<z.ZodNumber>;
    notes: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    activityLabel: {
        id: string;
        name: string;
    };
    statusLabel: {
        id: string;
        name: string;
    } | null;
    percentComplete: number | null;
    notes: string | null;
    locationLabels?: {
        id: string;
        name: string;
        category: string;
    }[] | undefined;
}, {
    id: string;
    activityLabel: {
        id: string;
        name: string;
    };
    statusLabel: {
        id: string;
        name: string;
    } | null;
    percentComplete: number | null;
    notes: string | null;
    locationLabels?: {
        id: string;
        name: string;
        category: string;
    }[] | undefined;
}>;
export type DailyLogEntry = z.infer<typeof DailyLogEntrySchema>;
/**
 * Daily log schema - Full object
 */
export declare const DailyLogSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodString;
    status: z.ZodEnum<["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]>;
    notes: z.ZodNullable<z.ZodString>;
    weatherDelay: z.ZodBoolean;
    weatherDelayNotes: z.ZodNullable<z.ZodString>;
    weatherData: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    gpsLatitude: z.ZodNullable<z.ZodNumber>;
    gpsLongitude: z.ZodNullable<z.ZodNumber>;
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
    submitter: z.ZodObject<{
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
    approver: z.ZodOptional<z.ZodNullable<z.ZodObject<{
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
    }>>>;
    photos: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        url: z.ZodString;
        caption: z.ZodNullable<z.ZodString>;
        gpsLatitude: z.ZodNullable<z.ZodNumber>;
        gpsLongitude: z.ZodNullable<z.ZodNumber>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        url: string;
        gpsLatitude: number | null;
        gpsLongitude: number | null;
        caption: string | null;
    }, {
        id: string;
        createdAt: string;
        url: string;
        gpsLatitude: number | null;
        gpsLongitude: number | null;
        caption: string | null;
    }>, "many">>;
    entries: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        activityLabel: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>;
        locationLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            category: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            category: string;
        }, {
            id: string;
            name: string;
            category: string;
        }>, "many">>;
        statusLabel: z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>>;
        percentComplete: z.ZodNullable<z.ZodNumber>;
        notes: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        activityLabel: {
            id: string;
            name: string;
        };
        statusLabel: {
            id: string;
            name: string;
        } | null;
        percentComplete: number | null;
        notes: string | null;
        locationLabels?: {
            id: string;
            name: string;
            category: string;
        }[] | undefined;
    }, {
        id: string;
        activityLabel: {
            id: string;
            name: string;
        };
        statusLabel: {
            id: string;
            name: string;
        } | null;
        percentComplete: number | null;
        notes: string | null;
        locationLabels?: {
            id: string;
            name: string;
            category: string;
        }[] | undefined;
    }>, "many">>;
    crewMembers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        hours: z.ZodNumber;
        trade: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        hours: number;
        trade: string | null;
    }, {
        id: string;
        name: string;
        hours: number;
        trade: string | null;
    }>, "many">>;
    equipmentUsage: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        equipment: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>;
        hours: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        equipment: {
            id: string;
            name: string;
        };
        hours: number;
    }, {
        id: string;
        equipment: {
            id: string;
            name: string;
        };
        hours: number;
    }>, "many">>;
    photoCount: z.ZodNumber;
    crewCount: z.ZodNumber;
    entriesCount: z.ZodOptional<z.ZodNumber>;
    totalLaborHours: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    submittedAt: z.ZodNullable<z.ZodString>;
    approvedAt: z.ZodNullable<z.ZodString>;
    syncStatus: z.ZodOptional<z.ZodEnum<["SYNCED", "PENDING", "FAILED", "CONFLICT"]>>;
}, "strip", z.ZodTypeAny, {
    status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
    date: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    gpsLatitude: number | null;
    gpsLongitude: number | null;
    notes: string | null;
    weatherDelay: boolean;
    weatherDelayNotes: string | null;
    project: {
        id: string;
        name: string;
    };
    submitter: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    photoCount: number;
    crewCount: number;
    submittedAt: string | null;
    approvedAt: string | null;
    entries?: {
        id: string;
        activityLabel: {
            id: string;
            name: string;
        };
        statusLabel: {
            id: string;
            name: string;
        } | null;
        percentComplete: number | null;
        notes: string | null;
        locationLabels?: {
            id: string;
            name: string;
            category: string;
        }[] | undefined;
    }[] | undefined;
    weatherData?: Record<string, unknown> | null | undefined;
    approver?: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null | undefined;
    photos?: {
        id: string;
        createdAt: string;
        url: string;
        gpsLatitude: number | null;
        gpsLongitude: number | null;
        caption: string | null;
    }[] | undefined;
    crewMembers?: {
        id: string;
        name: string;
        hours: number;
        trade: string | null;
    }[] | undefined;
    equipmentUsage?: {
        id: string;
        equipment: {
            id: string;
            name: string;
        };
        hours: number;
    }[] | undefined;
    entriesCount?: number | undefined;
    totalLaborHours?: number | undefined;
    syncStatus?: "PENDING" | "FAILED" | "SYNCED" | "CONFLICT" | undefined;
}, {
    status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
    date: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    gpsLatitude: number | null;
    gpsLongitude: number | null;
    notes: string | null;
    weatherDelay: boolean;
    weatherDelayNotes: string | null;
    project: {
        id: string;
        name: string;
    };
    submitter: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    photoCount: number;
    crewCount: number;
    submittedAt: string | null;
    approvedAt: string | null;
    entries?: {
        id: string;
        activityLabel: {
            id: string;
            name: string;
        };
        statusLabel: {
            id: string;
            name: string;
        } | null;
        percentComplete: number | null;
        notes: string | null;
        locationLabels?: {
            id: string;
            name: string;
            category: string;
        }[] | undefined;
    }[] | undefined;
    weatherData?: Record<string, unknown> | null | undefined;
    approver?: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null | undefined;
    photos?: {
        id: string;
        createdAt: string;
        url: string;
        gpsLatitude: number | null;
        gpsLongitude: number | null;
        caption: string | null;
    }[] | undefined;
    crewMembers?: {
        id: string;
        name: string;
        hours: number;
        trade: string | null;
    }[] | undefined;
    equipmentUsage?: {
        id: string;
        equipment: {
            id: string;
            name: string;
        };
        hours: number;
    }[] | undefined;
    entriesCount?: number | undefined;
    totalLaborHours?: number | undefined;
    syncStatus?: "PENDING" | "FAILED" | "SYNCED" | "CONFLICT" | undefined;
}>;
export type DailyLog = z.infer<typeof DailyLogSchema>;
/**
 * Daily log summary (for list views)
 */
export declare const DailyLogSummarySchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodString;
    status: z.ZodEnum<["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]>;
    weatherDelay: z.ZodBoolean;
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
    submitter: z.ZodObject<{
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
    photoCount: z.ZodNumber;
    crewCount: z.ZodNumber;
    entriesCount: z.ZodNumber;
    syncStatus: z.ZodOptional<z.ZodEnum<["SYNCED", "PENDING", "FAILED", "CONFLICT"]>>;
}, "strip", z.ZodTypeAny, {
    status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
    date: string;
    id: string;
    weatherDelay: boolean;
    project: {
        id: string;
        name: string;
    };
    submitter: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    photoCount: number;
    crewCount: number;
    entriesCount: number;
    syncStatus?: "PENDING" | "FAILED" | "SYNCED" | "CONFLICT" | undefined;
}, {
    status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
    date: string;
    id: string;
    weatherDelay: boolean;
    project: {
        id: string;
        name: string;
    };
    submitter: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    photoCount: number;
    crewCount: number;
    entriesCount: number;
    syncStatus?: "PENDING" | "FAILED" | "SYNCED" | "CONFLICT" | undefined;
}>;
export type DailyLogSummary = z.infer<typeof DailyLogSummarySchema>;
/**
 * Create daily log input
 */
export declare const CreateDailyLogInputSchema: z.ZodObject<{
    projectId: z.ZodString;
    date: z.ZodString;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    weatherDelay: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    weatherDelayNotes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    gpsLatitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    gpsLongitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    date: string;
    weatherDelay: boolean;
    projectId: string;
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
    notes?: string | null | undefined;
    weatherDelayNotes?: string | null | undefined;
}, {
    date: string;
    projectId: string;
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
    notes?: string | null | undefined;
    weatherDelay?: boolean | undefined;
    weatherDelayNotes?: string | null | undefined;
}>;
export type CreateDailyLogInput = z.infer<typeof CreateDailyLogInputSchema>;
/**
 * Update daily log input
 */
export declare const UpdateDailyLogInputSchema: z.ZodObject<{
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    weatherDelay: z.ZodOptional<z.ZodBoolean>;
    weatherDelayNotes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    notes?: string | null | undefined;
    weatherDelay?: boolean | undefined;
    weatherDelayNotes?: string | null | undefined;
}, {
    notes?: string | null | undefined;
    weatherDelay?: boolean | undefined;
    weatherDelayNotes?: string | null | undefined;
}>;
export type UpdateDailyLogInput = z.infer<typeof UpdateDailyLogInputSchema>;
//# sourceMappingURL=daily-log.d.ts.map