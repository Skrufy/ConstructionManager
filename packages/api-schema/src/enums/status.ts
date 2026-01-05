import { z } from 'zod';

/**
 * Project Status
 */
export const ProjectStatusEnum = z.enum([
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
]);
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

/**
 * Daily Log Status
 */
export const DailyLogStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
]);
export type DailyLogStatus = z.infer<typeof DailyLogStatusEnum>;

/**
 * Time Entry Status
 */
export const TimeEntryStatusEnum = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
]);
export type TimeEntryStatus = z.infer<typeof TimeEntryStatusEnum>;

/**
 * Equipment Status
 */
export const EquipmentStatusEnum = z.enum([
  'AVAILABLE',
  'IN_USE',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
]);
export type EquipmentStatus = z.infer<typeof EquipmentStatusEnum>;

/**
 * Incident Severity
 */
export const SeverityEnum = z.enum([
  'MINOR',
  'MODERATE',
  'SERIOUS',
  'CRITICAL',
]);
export type Severity = z.infer<typeof SeverityEnum>;

/**
 * Incident Type
 */
export const IncidentTypeEnum = z.enum([
  'INJURY',
  'NEAR_MISS',
  'PROPERTY_DAMAGE',
  'ENVIRONMENTAL',
  'OTHER',
]);
export type IncidentType = z.infer<typeof IncidentTypeEnum>;

/**
 * Incident Report Status
 */
export const IncidentStatusEnum = z.enum([
  'REPORTED',
  'UNDER_INVESTIGATION',
  'CLOSED',
]);
export type IncidentStatus = z.infer<typeof IncidentStatusEnum>;

/**
 * Inspection Status
 */
export const InspectionStatusEnum = z.enum([
  'SCHEDULED',
  'PENDING',
  'PASSED',
  'FAILED',
  'REQUIRES_FOLLOWUP',
]);
export type InspectionStatus = z.infer<typeof InspectionStatusEnum>;

/**
 * Punch List Status
 */
export const PunchListStatusEnum = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
]);
export type PunchListStatus = z.infer<typeof PunchListStatusEnum>;

/**
 * Punch List Item Status
 */
export const PunchListItemStatusEnum = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'VERIFIED',
]);
export type PunchListItemStatus = z.infer<typeof PunchListItemStatusEnum>;

/**
 * Punch List Item Priority
 */
export const PriorityEnum = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);
export type Priority = z.infer<typeof PriorityEnum>;

/**
 * Document Category
 */
export const DocumentCategoryEnum = z.enum([
  'DRAWINGS',
  'SPECIFICATIONS',
  'CONTRACTS',
  'PHOTOS',
  'REPORTS',
  'OTHER',
]);
export type DocumentCategory = z.infer<typeof DocumentCategoryEnum>;

/**
 * Warning Type
 */
export const WarningTypeEnum = z.enum([
  'TARDINESS',
  'SAFETY_VIOLATION',
  'INSUBORDINATION',
  'POOR_WORK_QUALITY',
  'NO_SHOW',
  'DRESS_CODE',
  'EQUIPMENT_MISUSE',
  'UNPROFESSIONAL_CONDUCT',
]);
export type WarningType = z.infer<typeof WarningTypeEnum>;

/**
 * Warning Severity
 */
export const WarningSeverityEnum = z.enum([
  'VERBAL',
  'WRITTEN',
  'FINAL',
]);
export type WarningSeverity = z.infer<typeof WarningSeverityEnum>;

/**
 * Sync Status (for offline-first entities)
 */
export const SyncStatusEnum = z.enum([
  'SYNCED',
  'PENDING',
  'FAILED',
  'CONFLICT',
]);
export type SyncStatus = z.infer<typeof SyncStatusEnum>;
