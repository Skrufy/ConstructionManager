import { z } from 'zod';
/**
 * Project Status
 */
export declare const ProjectStatusEnum: z.ZodEnum<["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"]>;
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;
/**
 * Daily Log Status
 */
export declare const DailyLogStatusEnum: z.ZodEnum<["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]>;
export type DailyLogStatus = z.infer<typeof DailyLogStatusEnum>;
/**
 * Time Entry Status
 */
export declare const TimeEntryStatusEnum: z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>;
export type TimeEntryStatus = z.infer<typeof TimeEntryStatusEnum>;
/**
 * Equipment Status
 */
export declare const EquipmentStatusEnum: z.ZodEnum<["AVAILABLE", "IN_USE", "MAINTENANCE", "OUT_OF_SERVICE"]>;
export type EquipmentStatus = z.infer<typeof EquipmentStatusEnum>;
/**
 * Incident Severity
 */
export declare const SeverityEnum: z.ZodEnum<["MINOR", "MODERATE", "SERIOUS", "CRITICAL"]>;
export type Severity = z.infer<typeof SeverityEnum>;
/**
 * Incident Type
 */
export declare const IncidentTypeEnum: z.ZodEnum<["INJURY", "NEAR_MISS", "PROPERTY_DAMAGE", "ENVIRONMENTAL", "OTHER"]>;
export type IncidentType = z.infer<typeof IncidentTypeEnum>;
/**
 * Incident Report Status
 */
export declare const IncidentStatusEnum: z.ZodEnum<["REPORTED", "UNDER_INVESTIGATION", "CLOSED"]>;
export type IncidentStatus = z.infer<typeof IncidentStatusEnum>;
/**
 * Inspection Status
 */
export declare const InspectionStatusEnum: z.ZodEnum<["SCHEDULED", "PENDING", "PASSED", "FAILED", "REQUIRES_FOLLOWUP"]>;
export type InspectionStatus = z.infer<typeof InspectionStatusEnum>;
/**
 * Punch List Status
 */
export declare const PunchListStatusEnum: z.ZodEnum<["OPEN", "IN_PROGRESS", "COMPLETED"]>;
export type PunchListStatus = z.infer<typeof PunchListStatusEnum>;
/**
 * Punch List Item Status
 */
export declare const PunchListItemStatusEnum: z.ZodEnum<["OPEN", "IN_PROGRESS", "COMPLETED", "VERIFIED"]>;
export type PunchListItemStatus = z.infer<typeof PunchListItemStatusEnum>;
/**
 * Punch List Item Priority
 */
export declare const PriorityEnum: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
export type Priority = z.infer<typeof PriorityEnum>;
/**
 * Document Category
 */
export declare const DocumentCategoryEnum: z.ZodEnum<["DRAWINGS", "SPECIFICATIONS", "CONTRACTS", "PHOTOS", "REPORTS", "OTHER"]>;
export type DocumentCategory = z.infer<typeof DocumentCategoryEnum>;
/**
 * Warning Type
 */
export declare const WarningTypeEnum: z.ZodEnum<["TARDINESS", "SAFETY_VIOLATION", "INSUBORDINATION", "POOR_WORK_QUALITY", "NO_SHOW", "DRESS_CODE", "EQUIPMENT_MISUSE", "UNPROFESSIONAL_CONDUCT"]>;
export type WarningType = z.infer<typeof WarningTypeEnum>;
/**
 * Warning Severity
 */
export declare const WarningSeverityEnum: z.ZodEnum<["VERBAL", "WRITTEN", "FINAL"]>;
export type WarningSeverity = z.infer<typeof WarningSeverityEnum>;
/**
 * Sync Status (for offline-first entities)
 */
export declare const SyncStatusEnum: z.ZodEnum<["SYNCED", "PENDING", "FAILED", "CONFLICT"]>;
export type SyncStatus = z.infer<typeof SyncStatusEnum>;
//# sourceMappingURL=status.d.ts.map