import { z } from 'zod';
/**
 * Equipment schema - Full object
 */
export declare const EquipmentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    status: z.ZodEnum<["AVAILABLE", "IN_USE", "MAINTENANCE", "OUT_OF_SERVICE"]>;
    samsaraId: z.ZodNullable<z.ZodString>;
    currentLat: z.ZodNullable<z.ZodNumber>;
    currentLng: z.ZodNullable<z.ZodNumber>;
    lastUpdated: z.ZodNullable<z.ZodString>;
    currentProject: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_SERVICE";
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    samsaraId: string | null;
    currentLat: number | null;
    currentLng: number | null;
    lastUpdated: string | null;
    currentProject?: {
        id: string;
        name: string;
    } | null | undefined;
}, {
    type: string;
    status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_SERVICE";
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    samsaraId: string | null;
    currentLat: number | null;
    currentLng: number | null;
    lastUpdated: string | null;
    currentProject?: {
        id: string;
        name: string;
    } | null | undefined;
}>;
export type Equipment = z.infer<typeof EquipmentSchema>;
/**
 * Equipment summary (for list views)
 */
export declare const EquipmentSummarySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    status: z.ZodEnum<["AVAILABLE", "IN_USE", "MAINTENANCE", "OUT_OF_SERVICE"]>;
    currentProjectName: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_SERVICE";
    id: string;
    name: string;
    currentProjectName: string | null;
}, {
    type: string;
    status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_SERVICE";
    id: string;
    name: string;
    currentProjectName: string | null;
}>;
export type EquipmentSummary = z.infer<typeof EquipmentSummarySchema>;
/**
 * Equipment assignment
 */
export declare const EquipmentAssignmentSchema: z.ZodObject<{
    id: z.ZodString;
    equipmentId: z.ZodString;
    projectId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    startDate: string;
    endDate: string | null;
    projectId: string;
    equipmentId: string;
}, {
    id: string;
    createdAt: string;
    startDate: string;
    endDate: string | null;
    projectId: string;
    equipmentId: string;
}>;
export type EquipmentAssignment = z.infer<typeof EquipmentAssignmentSchema>;
/**
 * Equipment log entry
 */
export declare const EquipmentLogSchema: z.ZodObject<{
    id: z.ZodString;
    equipmentId: z.ZodString;
    date: z.ZodString;
    hoursUsed: z.ZodNullable<z.ZodNumber>;
    fuelUsed: z.ZodNullable<z.ZodNumber>;
    notes: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    id: string;
    createdAt: string;
    notes: string | null;
    equipmentId: string;
    hoursUsed: number | null;
    fuelUsed: number | null;
}, {
    date: string;
    id: string;
    createdAt: string;
    notes: string | null;
    equipmentId: string;
    hoursUsed: number | null;
    fuelUsed: number | null;
}>;
export type EquipmentLog = z.infer<typeof EquipmentLogSchema>;
/**
 * Service log
 */
export declare const ServiceLogSchema: z.ZodObject<{
    id: z.ZodString;
    equipmentId: z.ZodString;
    serviceType: z.ZodEnum<["OIL_CHANGE", "FILTER_REPLACEMENT", "INSPECTION", "REPAIR", "TIRE_SERVICE", "BRAKE_SERVICE", "HYDRAULIC_SERVICE", "ELECTRICAL", "SCHEDULED_MAINTENANCE", "OTHER"]>;
    date: z.ZodString;
    meterReading: z.ZodNullable<z.ZodNumber>;
    cost: z.ZodNullable<z.ZodNumber>;
    partsUsed: z.ZodNullable<z.ZodString>;
    technician: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
    nextServiceDue: z.ZodNullable<z.ZodString>;
    nextServiceHours: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    notes: string | null;
    equipmentId: string;
    serviceType: "OTHER" | "OIL_CHANGE" | "FILTER_REPLACEMENT" | "INSPECTION" | "REPAIR" | "TIRE_SERVICE" | "BRAKE_SERVICE" | "HYDRAULIC_SERVICE" | "ELECTRICAL" | "SCHEDULED_MAINTENANCE";
    meterReading: number | null;
    cost: number | null;
    partsUsed: string | null;
    technician: string | null;
    nextServiceDue: string | null;
    nextServiceHours: number | null;
}, {
    date: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    notes: string | null;
    equipmentId: string;
    serviceType: "OTHER" | "OIL_CHANGE" | "FILTER_REPLACEMENT" | "INSPECTION" | "REPAIR" | "TIRE_SERVICE" | "BRAKE_SERVICE" | "HYDRAULIC_SERVICE" | "ELECTRICAL" | "SCHEDULED_MAINTENANCE";
    meterReading: number | null;
    cost: number | null;
    partsUsed: string | null;
    technician: string | null;
    nextServiceDue: string | null;
    nextServiceHours: number | null;
}>;
export type ServiceLog = z.infer<typeof ServiceLogSchema>;
/**
 * Create equipment input
 */
export declare const CreateEquipmentInputSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodString;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["AVAILABLE", "IN_USE", "MAINTENANCE", "OUT_OF_SERVICE"]>>>;
    samsaraId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_SERVICE";
    name: string;
    samsaraId?: string | null | undefined;
}, {
    type: string;
    name: string;
    status?: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_SERVICE" | undefined;
    samsaraId?: string | null | undefined;
}>;
export type CreateEquipmentInput = z.infer<typeof CreateEquipmentInputSchema>;
/**
 * Update equipment input
 */
export declare const UpdateEquipmentInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodEnum<["AVAILABLE", "IN_USE", "MAINTENANCE", "OUT_OF_SERVICE"]>>>>;
    samsaraId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    type?: string | undefined;
    status?: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_SERVICE" | undefined;
    name?: string | undefined;
    samsaraId?: string | null | undefined;
}, {
    type?: string | undefined;
    status?: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_SERVICE" | undefined;
    name?: string | undefined;
    samsaraId?: string | null | undefined;
}>;
export type UpdateEquipmentInput = z.infer<typeof UpdateEquipmentInputSchema>;
/**
 * Log equipment usage input
 */
export declare const LogEquipmentUsageInputSchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    hoursUsed: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    fuelUsed: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    date?: string | undefined;
    notes?: string | null | undefined;
    hoursUsed?: number | null | undefined;
    fuelUsed?: number | null | undefined;
}, {
    date?: string | undefined;
    notes?: string | null | undefined;
    hoursUsed?: number | null | undefined;
    fuelUsed?: number | null | undefined;
}>;
export type LogEquipmentUsageInput = z.infer<typeof LogEquipmentUsageInputSchema>;
//# sourceMappingURL=equipment.d.ts.map