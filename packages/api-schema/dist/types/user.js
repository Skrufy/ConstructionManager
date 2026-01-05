import { z } from 'zod';
import { IdSchema, DateTimeSchema } from './common';
import { UserRoleEnum } from '../enums/roles';
/**
 * User schema - Full user object
 */
export const UserSchema = z.object({
    id: IdSchema,
    email: z.string().email(),
    name: z.string(),
    phone: z.string().nullable(),
    role: UserRoleEnum,
    status: z.enum(['ACTIVE', 'INACTIVE']),
    language: z.enum(['en', 'es']).default('en'),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
});
/**
 * User profile (safe for client display - no sensitive fields)
 */
export const UserProfileSchema = z.object({
    id: IdSchema,
    email: z.string().email(),
    name: z.string(),
    phone: z.string().nullable(),
    role: UserRoleEnum,
    language: z.enum(['en', 'es']),
    avatarUrl: z.string().nullable().optional(),
});
/**
 * User permissions response
 */
export const UserPermissionsSchema = z.object({
    userId: IdSchema,
    role: UserRoleEnum,
    companyPermissions: z.record(z.string(), z.string()), // tool -> level
    projectPermissions: z.record(z.string(), z.record(z.string(), z.string())), // projectId -> tool -> level
    granularPermissions: z.record(z.string(), z.array(z.string())), // tool -> actions[]
});
/**
 * Create user input
 */
export const CreateUserInputSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(8),
    phone: z.string().nullable().optional(),
    role: UserRoleEnum.optional().default('FIELD_WORKER'),
    language: z.enum(['en', 'es']).optional().default('en'),
});
/**
 * Update user input
 */
export const UpdateUserInputSchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    role: UserRoleEnum.optional(),
    language: z.enum(['en', 'es']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
//# sourceMappingURL=user.js.map