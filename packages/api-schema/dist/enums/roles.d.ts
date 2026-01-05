import { z } from 'zod';
/**
 * User Role
 * Matches the role field in User model
 */
export declare const UserRoleEnum: z.ZodEnum<["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "ARCHITECT", "FOREMAN", "CREW_LEADER", "OFFICE", "FIELD_WORKER", "VIEWER"]>;
export type UserRole = z.infer<typeof UserRoleEnum>;
/**
 * Permission Level
 * Used in Procore-style permission templates
 */
export declare const PermissionLevelEnum: z.ZodEnum<["NONE", "READ_ONLY", "STANDARD", "ADMIN"]>;
export type PermissionLevel = z.infer<typeof PermissionLevelEnum>;
/**
 * Permission Scope
 */
export declare const PermissionScopeEnum: z.ZodEnum<["COMPANY", "PROJECT"]>;
export type PermissionScope = z.infer<typeof PermissionScopeEnum>;
/**
 * Tool Names for Permission System
 */
export declare const ToolNameEnum: z.ZodEnum<["projects", "daily_logs", "time_tracking", "equipment", "documents", "drawings", "safety", "financials", "scheduling", "reports", "admin", "clients", "subcontractors", "certifications", "warnings", "tasks", "rfis", "materials"]>;
export type ToolName = z.infer<typeof ToolNameEnum>;
//# sourceMappingURL=roles.d.ts.map