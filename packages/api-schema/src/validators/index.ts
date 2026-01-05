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
export function validateSchema<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  context?: string
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorMessages = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );
    const contextMsg = context ? ` in ${context}` : '';
    throw new Error(
      `Validation failed${contextMsg}:\n${errorMessages.join('\n')}`
    );
  }

  return result.data;
}

/**
 * Safely parse data against a schema, returning undefined on failure
 * Useful for optional validation without throwing
 */
export function safeValidate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> | undefined {
  const result = schema.safeParse(data);
  return result.success ? result.data : undefined;
}

/**
 * Create a validator function for a specific schema
 * Useful for creating reusable validators
 */
export function createValidator<T extends z.ZodTypeAny>(schema: T) {
  return (data: unknown, context?: string) => validateSchema(schema, data, context);
}

/**
 * Validate API response with optional debug mode
 * Set enableValidation to true in development for schema checking
 */
export function validateApiResponse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  endpoint: string,
  enableValidation = false
): z.infer<T> {
  if (enableValidation) {
    return validateSchema(schema, data, `API response: ${endpoint}`);
  }
  return data as z.infer<T>;
}

/**
 * Transform API response to match schema (snake_case -> camelCase)
 * Uses Zod's transform capabilities
 */
export function transformResponse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}
