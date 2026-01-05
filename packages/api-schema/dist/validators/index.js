/**
 * Response validation utilities
 *
 * These helpers validate that API responses match the expected schema,
 * catching mismatches early in development.
 */
/**
 * Validate data against a Zod schema
 * Returns the parsed data or throws a descriptive error
 */
export function validateSchema(schema, data, context) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errorMessages = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
        const contextMsg = context ? ` in ${context}` : '';
        throw new Error(`Validation failed${contextMsg}:\n${errorMessages.join('\n')}`);
    }
    return result.data;
}
/**
 * Safely parse data against a schema, returning undefined on failure
 * Useful for optional validation without throwing
 */
export function safeValidate(schema, data) {
    const result = schema.safeParse(data);
    return result.success ? result.data : undefined;
}
/**
 * Create a validator function for a specific schema
 * Useful for creating reusable validators
 */
export function createValidator(schema) {
    return (data, context) => validateSchema(schema, data, context);
}
/**
 * Validate API response with optional debug mode
 * Set enableValidation to true in development for schema checking
 */
export function validateApiResponse(schema, data, endpoint, enableValidation = false) {
    if (enableValidation) {
        return validateSchema(schema, data, `API response: ${endpoint}`);
    }
    return data;
}
/**
 * Transform API response to match schema (snake_case -> camelCase)
 * Uses Zod's transform capabilities
 */
export function transformResponse(schema, data) {
    return schema.parse(data);
}
//# sourceMappingURL=index.js.map