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
/**
 * Daily Log Status
 */
export const DailyLogStatusEnum = z.enum([
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
]);
/**
 * Time Entry Status
 */
export const TimeEntryStatusEnum = z.enum([
    'PENDING',
    'APPROVED',
    'REJECTED',
]);
/**
 * Equipment Status
 */
export const EquipmentStatusEnum = z.enum([
    'AVAILABLE',
    'IN_USE',
    'MAINTENANCE',
    'OUT_OF_SERVICE',
]);
/**
 * Incident Severity
 */
export const SeverityEnum = z.enum([
    'MINOR',
    'MODERATE',
    'SERIOUS',
    'CRITICAL',
]);
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
/**
 * Incident Report Status
 */
export const IncidentStatusEnum = z.enum([
    'REPORTED',
    'UNDER_INVESTIGATION',
    'CLOSED',
]);
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
/**
 * Punch List Status
 */
export const PunchListStatusEnum = z.enum([
    'OPEN',
    'IN_PROGRESS',
    'COMPLETED',
]);
/**
 * Punch List Item Status
 */
export const PunchListItemStatusEnum = z.enum([
    'OPEN',
    'IN_PROGRESS',
    'COMPLETED',
    'VERIFIED',
]);
/**
 * Punch List Item Priority
 */
export const PriorityEnum = z.enum([
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
]);
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
/**
 * Warning Severity
 */
export const WarningSeverityEnum = z.enum([
    'VERBAL',
    'WRITTEN',
    'FINAL',
]);
/**
 * Sync Status (for offline-first entities)
 */
export const SyncStatusEnum = z.enum([
    'SYNCED',
    'PENDING',
    'FAILED',
    'CONFLICT',
]);
//# sourceMappingURL=status.js.map