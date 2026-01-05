import { z } from 'zod';
/**
 * User schema - Full user object
 */
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    phone: z.ZodNullable<z.ZodString>;
    role: z.ZodEnum<["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "ARCHITECT", "FOREMAN", "CREW_LEADER", "OFFICE", "FIELD_WORKER", "VIEWER"]>;
    status: z.ZodEnum<["ACTIVE", "INACTIVE"]>;
    language: z.ZodDefault<z.ZodEnum<["en", "es"]>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "INACTIVE";
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" | "ARCHITECT" | "FOREMAN" | "CREW_LEADER" | "OFFICE" | "FIELD_WORKER" | "VIEWER";
    language: "en" | "es";
    createdAt: string;
    updatedAt: string;
}, {
    status: "ACTIVE" | "INACTIVE";
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" | "ARCHITECT" | "FOREMAN" | "CREW_LEADER" | "OFFICE" | "FIELD_WORKER" | "VIEWER";
    createdAt: string;
    updatedAt: string;
    language?: "en" | "es" | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
/**
 * User profile (safe for client display - no sensitive fields)
 */
export declare const UserProfileSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    phone: z.ZodNullable<z.ZodString>;
    role: z.ZodEnum<["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "ARCHITECT", "FOREMAN", "CREW_LEADER", "OFFICE", "FIELD_WORKER", "VIEWER"]>;
    language: z.ZodEnum<["en", "es"]>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" | "ARCHITECT" | "FOREMAN" | "CREW_LEADER" | "OFFICE" | "FIELD_WORKER" | "VIEWER";
    language: "en" | "es";
    avatarUrl?: string | null | undefined;
}, {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" | "ARCHITECT" | "FOREMAN" | "CREW_LEADER" | "OFFICE" | "FIELD_WORKER" | "VIEWER";
    language: "en" | "es";
    avatarUrl?: string | null | undefined;
}>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
/**
 * User permissions response
 */
export declare const UserPermissionsSchema: z.ZodObject<{
    userId: z.ZodString;
    role: z.ZodEnum<["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "ARCHITECT", "FOREMAN", "CREW_LEADER", "OFFICE", "FIELD_WORKER", "VIEWER"]>;
    companyPermissions: z.ZodRecord<z.ZodString, z.ZodString>;
    projectPermissions: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>>;
    granularPermissions: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" | "ARCHITECT" | "FOREMAN" | "CREW_LEADER" | "OFFICE" | "FIELD_WORKER" | "VIEWER";
    userId: string;
    companyPermissions: Record<string, string>;
    projectPermissions: Record<string, Record<string, string>>;
    granularPermissions: Record<string, string[]>;
}, {
    role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" | "ARCHITECT" | "FOREMAN" | "CREW_LEADER" | "OFFICE" | "FIELD_WORKER" | "VIEWER";
    userId: string;
    companyPermissions: Record<string, string>;
    projectPermissions: Record<string, Record<string, string>>;
    granularPermissions: Record<string, string[]>;
}>;
export type UserPermissions = z.infer<typeof UserPermissionsSchema>;
/**
 * Create user input
 */
export declare const CreateUserInputSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    password: z.ZodString;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    role: z.ZodDefault<z.ZodOptional<z.ZodEnum<["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "ARCHITECT", "FOREMAN", "CREW_LEADER", "OFFICE", "FIELD_WORKER", "VIEWER"]>>>;
    language: z.ZodDefault<z.ZodOptional<z.ZodEnum<["en", "es"]>>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" | "ARCHITECT" | "FOREMAN" | "CREW_LEADER" | "OFFICE" | "FIELD_WORKER" | "VIEWER";
    language: "en" | "es";
    password: string;
    phone?: string | null | undefined;
}, {
    name: string;
    email: string;
    password: string;
    phone?: string | null | undefined;
    role?: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" | "ARCHITECT" | "FOREMAN" | "CREW_LEADER" | "OFFICE" | "FIELD_WORKER" | "VIEWER" | undefined;
    language?: "en" | "es" | undefined;
}>;
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
/**
 * Update user input
 */
export declare const UpdateUserInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    role: z.ZodOptional<z.ZodEnum<["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "ARCHITECT", "FOREMAN", "CREW_LEADER", "OFFICE", "FIELD_WORKER", "VIEWER"]>>;
    language: z.ZodOptional<z.ZodEnum<["en", "es"]>>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "INACTIVE" | undefined;
    name?: string | undefined;
    phone?: string | null | undefined;
    role?: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" | "ARCHITECT" | "FOREMAN" | "CREW_LEADER" | "OFFICE" | "FIELD_WORKER" | "VIEWER" | undefined;
    language?: "en" | "es" | undefined;
}, {
    status?: "ACTIVE" | "INACTIVE" | undefined;
    name?: string | undefined;
    phone?: string | null | undefined;
    role?: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER" | "ARCHITECT" | "FOREMAN" | "CREW_LEADER" | "OFFICE" | "FIELD_WORKER" | "VIEWER" | undefined;
    language?: "en" | "es" | undefined;
}>;
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;
//# sourceMappingURL=user.d.ts.map