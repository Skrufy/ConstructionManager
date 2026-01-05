/**
 * @constructionpro/api-schema
 *
 * Shared API types and validators for ConstructionPro
 * This package provides the single source of truth for API contracts
 * across web, iOS, and Android platforms.
 *
 * @example
 * ```typescript
 * import { ProjectSchema, Project, ProjectStatusEnum } from '@constructionpro/api-schema';
 *
 * // Validate API response
 * const project = ProjectSchema.parse(apiResponse);
 *
 * // Use the type
 * function displayProject(project: Project) { ... }
 *
 * // Check enum values
 * if (project.status === 'ACTIVE') { ... }
 * ```
 */
export * from './types';
export * from './enums';
export * from './validators';
export { UserSchema, UserProfileSchema, CreateUserInputSchema, UpdateUserInputSchema, type User, type UserProfile, type CreateUserInput, type UpdateUserInput, ProjectSchema, ProjectSummarySchema, CreateProjectInputSchema, UpdateProjectInputSchema, type Project, type ProjectSummary, type CreateProjectInput, type UpdateProjectInput, DailyLogSchema, DailyLogSummarySchema, CreateDailyLogInputSchema, UpdateDailyLogInputSchema, type DailyLog, type DailyLogSummary, type CreateDailyLogInput, type UpdateDailyLogInput, TimeEntrySchema, ClockInInputSchema, ClockOutInputSchema, type TimeEntry, type ClockInInput, type ClockOutInput, EquipmentSchema, EquipmentSummarySchema, CreateEquipmentInputSchema, UpdateEquipmentInputSchema, type Equipment, type EquipmentSummary, type CreateEquipmentInput, type UpdateEquipmentInput, IncidentReportSchema, CreateIncidentInputSchema, InspectionSchema, CreateInspectionInputSchema, CompleteInspectionInputSchema, PunchListSchema, PunchListItemSchema, CreatePunchListInputSchema, CreatePunchListItemInputSchema, type IncidentReport, type CreateIncidentInput, type Inspection, type CreateInspectionInput, type CompleteInspectionInput, type PunchList, type PunchListItem, type CreatePunchListInput, type CreatePunchListItemInput, DocumentSchema, DocumentSummarySchema, DocumentAnnotationSchema, UploadDocumentInputSchema, CreateAnnotationInputSchema, type Document, type DocumentSummary, type DocumentAnnotation, type UploadDocumentInput, type CreateAnnotationInput, AddressSchema, GpsCoordinatesSchema, PageInfoSchema, PaginationParamsSchema, UserRefSchema, ProjectRefSchema, type Address, type GpsCoordinates, type PageInfo, type PaginationParams, type UserRef, type ProjectRef, } from './types';
export { ProjectStatusEnum, DailyLogStatusEnum, TimeEntryStatusEnum, EquipmentStatusEnum, SeverityEnum, IncidentTypeEnum, IncidentStatusEnum, InspectionStatusEnum, PunchListStatusEnum, PunchListItemStatusEnum, PriorityEnum, DocumentCategoryEnum, WarningTypeEnum, WarningSeverityEnum, SyncStatusEnum, type ProjectStatus, type DailyLogStatus, type TimeEntryStatus, type EquipmentStatus, type Severity, type IncidentType, type IncidentStatus, type InspectionStatus, type PunchListStatus, type PunchListItemStatus, type Priority, type DocumentCategory, type WarningType, type WarningSeverity, type SyncStatus, UserRoleEnum, PermissionLevelEnum, PermissionScopeEnum, ToolNameEnum, type UserRole, type PermissionLevel, type PermissionScope, type ToolName, } from './enums';
//# sourceMappingURL=index.d.ts.map