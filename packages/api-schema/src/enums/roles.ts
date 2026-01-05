import { z } from 'zod';

/**
 * User Role
 * Matches the role field in User model
 */
export const UserRoleEnum = z.enum([
  'ADMIN',
  'PROJECT_MANAGER',
  'DEVELOPER',
  'ARCHITECT',
  'FOREMAN',
  'CREW_LEADER',
  'OFFICE',
  'FIELD_WORKER',
  'VIEWER',
]);
export type UserRole = z.infer<typeof UserRoleEnum>;

/**
 * Permission Level
 * Used in Procore-style permission templates
 */
export const PermissionLevelEnum = z.enum([
  'NONE',
  'READ_ONLY',
  'STANDARD',
  'ADMIN',
]);
export type PermissionLevel = z.infer<typeof PermissionLevelEnum>;

/**
 * Permission Scope
 */
export const PermissionScopeEnum = z.enum([
  'COMPANY',
  'PROJECT',
]);
export type PermissionScope = z.infer<typeof PermissionScopeEnum>;

/**
 * Tool Names for Permission System
 */
export const ToolNameEnum = z.enum([
  'projects',
  'daily_logs',
  'time_tracking',
  'equipment',
  'documents',
  'drawings',
  'safety',
  'financials',
  'scheduling',
  'reports',
  'admin',
  'clients',
  'subcontractors',
  'certifications',
  'warnings',
  'tasks',
  'rfis',
  'materials',
]);
export type ToolName = z.infer<typeof ToolNameEnum>;
