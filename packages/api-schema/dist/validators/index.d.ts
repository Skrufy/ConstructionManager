/**
 * Response validation utilities
 *
 * These helpers validate that API responses match the expected schema,
 * catching mismatches early in development.
 */
import { z } from 'zod';
/**
 * Validate data against a Zod schema
 * Returns the parsed data or throws a descriptive error
 */
export declare function validateSchema<T extends z.ZodTypeAny>(schema: T, data: unknown, context?: string): z.infer<T>;
/**
 * Safely parse data against a schema, returning undefined on failure
 * Useful for optional validation without throwing
 */
export declare function safeValidate<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> | undefined;
/**
 * Create a validator function for a specific schema
 * Useful for creating reusable validators
 */
export declare function createValidator<T extends z.ZodTypeAny>(schema: T): (data: unknown, context?: string) => z.TypeOf<T>;
/**
 * Validate API response with optional debug mode
 * Set enableValidation to true in development for schema checking
 */
export declare function validateApiResponse<T extends z.ZodTypeAny>(schema: T, data: unknown, endpoint: string, enableValidation?: boolean): z.infer<T>;
/**
 * Transform API response to match schema (snake_case -> camelCase)
 * Uses Zod's transform capabilities
 */
export declare function transformResponse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T>;
//# sourceMappingURL=index.d.ts.map