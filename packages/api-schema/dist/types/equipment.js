import { z } from 'zod';
import { IdSchema, DateTimeSchema, ProjectRefSchema } from './common';
import { EquipmentStatusEnum } from '../enums/status';
/**
 * Equipment schema - Full object
 */
export const EquipmentSchema = z.object({
    id: IdSchema,
    name: z.string(),
    type: z.string(),
    status: EquipmentStatusEnum,
    samsaraId: z.string().nullable(),
    // Current location
    currentLat: z.number().nullable(),
    currentLng: z.number().nullable(),
    lastUpdated: DateTimeSchema.nullable(),
    // Current assignment
    currentProject: ProjectRefSchema.nullable().optional(),
    // Timestamps
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
});
/**
 * Equipment summary (for list views)
 */
export const EquipmentSummarySchema = z.object({
    id: IdSchema,
    name: z.string(),
    type: z.string(),
    status: EquipmentStatusEnum,
    currentProjectName: z.string().nullable(),
});
/**
 * Equipment assignment
 */
export const EquipmentAssignmentSchema = z.object({
    id: IdSchema,
    equipmentId: IdSchema,
    projectId: IdSchema,
    startDate: DateTimeSchema,
    endDate: DateTimeSchema.nullable(),
    createdAt: DateTimeSchema,
});
/**
 * Equipment log entry
 */
export const EquipmentLogSchema = z.object({
    id: IdSchema,
    equipmentId: IdSchema,
    date: DateTimeSchema,
    hoursUsed: z.number().nullable(),
    fuelUsed: z.number().nullable(),
    notes: z.string().nullable(),
    createdAt: DateTimeSchema,
});
/**
 * Service log
 */
export const ServiceLogSchema = z.object({
    id: IdSchema,
    equipmentId: IdSchema,
    serviceType: z.enum([
        'OIL_CHANGE',
        'FILTER_REPLACEMENT',
        'INSPECTION',
        'REPAIR',
        'TIRE_SERVICE',
        'BRAKE_SERVICE',
        'HYDRAULIC_SERVICE',
        'ELECTRICAL',
        'SCHEDULED_MAINTENANCE',
        'OTHER',
    ]),
    date: DateTimeSchema,
    meterReading: z.number().nullable(),
    cost: z.number().nullable(),
    partsUsed: z.string().nullable(),
    technician: z.string().nullable(),
    notes: z.string().nullable(),
    nextServiceDue: DateTimeSchema.nullable(),
    nextServiceHours: z.number().nullable(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
});
/**
 * Create equipment input
 */
export const CreateEquipmentInputSchema = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    status: EquipmentStatusEnum.optional().default('AVAILABLE'),
    samsaraId: z.string().nullable().optional(),
});
/**
 * Update equipment input
 */
export const UpdateEquipmentInputSchema = CreateEquipmentInputSchema.partial();
/**
 * Log equipment usage input
 */
export const LogEquipmentUsageInputSchema = z.object({
    date: DateTimeSchema.optional(),
    hoursUsed: z.number().nullable().optional(),
    fuelUsed: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
});
//# sourceMappingURL=equipment.js.map