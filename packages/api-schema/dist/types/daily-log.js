import { z } from 'zod';
import { IdSchema, DateTimeSchema, DateSchema, UserRefSchema, ProjectRefSchema } from './common';
import { DailyLogStatusEnum, SyncStatusEnum } from '../enums/status';
/**
 * Photo in a daily log
 */
export const DailyLogPhotoSchema = z.object({
    id: IdSchema,
    url: z.string().url(),
    caption: z.string().nullable(),
    gpsLatitude: z.number().nullable(),
    gpsLongitude: z.number().nullable(),
    createdAt: DateTimeSchema,
});
/**
 * Crew entry in a daily log
 */
export const CrewEntrySchema = z.object({
    id: IdSchema,
    name: z.string(),
    hours: z.number(),
    trade: z.string().nullable(),
});
/**
 * Equipment usage in a daily log
 */
export const EquipmentUsageSchema = z.object({
    id: IdSchema,
    equipment: z.object({
        id: IdSchema,
        name: z.string(),
    }),
    hours: z.number(),
});
/**
 * Daily log entry (activity)
 */
export const DailyLogEntrySchema = z.object({
    id: IdSchema,
    activityLabel: z.object({
        id: IdSchema,
        name: z.string(),
    }),
    locationLabels: z.array(z.object({
        id: IdSchema,
        name: z.string(),
        category: z.string(),
    })).optional(),
    statusLabel: z.object({
        id: IdSchema,
        name: z.string(),
    }).nullable(),
    percentComplete: z.number().int().min(0).max(100).nullable(),
    notes: z.string().nullable(),
});
/**
 * Daily log schema - Full object
 */
export const DailyLogSchema = z.object({
    id: IdSchema,
    date: DateSchema,
    status: DailyLogStatusEnum,
    notes: z.string().nullable(),
    weatherDelay: z.boolean(),
    weatherDelayNotes: z.string().nullable(),
    weatherData: z.record(z.unknown()).nullable().optional(),
    gpsLatitude: z.number().nullable(),
    gpsLongitude: z.number().nullable(),
    // Relations
    project: ProjectRefSchema,
    submitter: UserRefSchema,
    approver: UserRefSchema.nullable().optional(),
    // Nested data (optional based on includes)
    photos: z.array(DailyLogPhotoSchema).optional(),
    entries: z.array(DailyLogEntrySchema).optional(),
    crewMembers: z.array(CrewEntrySchema).optional(),
    equipmentUsage: z.array(EquipmentUsageSchema).optional(),
    // Counts
    photoCount: z.number().int(),
    crewCount: z.number().int(),
    entriesCount: z.number().int().optional(),
    totalLaborHours: z.number().optional(),
    // Timestamps
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
    submittedAt: DateTimeSchema.nullable(),
    approvedAt: DateTimeSchema.nullable(),
    // Sync status (for mobile)
    syncStatus: SyncStatusEnum.optional(),
});
/**
 * Daily log summary (for list views)
 */
export const DailyLogSummarySchema = z.object({
    id: IdSchema,
    date: DateSchema,
    status: DailyLogStatusEnum,
    weatherDelay: z.boolean(),
    project: ProjectRefSchema,
    submitter: UserRefSchema,
    photoCount: z.number().int(),
    crewCount: z.number().int(),
    entriesCount: z.number().int(),
    syncStatus: SyncStatusEnum.optional(),
});
/**
 * Create daily log input
 */
export const CreateDailyLogInputSchema = z.object({
    projectId: IdSchema,
    date: DateSchema,
    notes: z.string().nullable().optional(),
    weatherDelay: z.boolean().optional().default(false),
    weatherDelayNotes: z.string().nullable().optional(),
    gpsLatitude: z.number().nullable().optional(),
    gpsLongitude: z.number().nullable().optional(),
});
/**
 * Update daily log input
 */
export const UpdateDailyLogInputSchema = z.object({
    notes: z.string().nullable().optional(),
    weatherDelay: z.boolean().optional(),
    weatherDelayNotes: z.string().nullable().optional(),
});
//# sourceMappingURL=daily-log.js.map