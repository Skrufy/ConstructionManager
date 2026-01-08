import { NextResponse } from 'next/server';

/**
 * Standardized API Error Response Interface
 * All API routes should return this format for errors
 */
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Standard API Error Codes
 * Use these codes consistently across all API routes
 */
export const ApiErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',           // 401 - Not authenticated
  FORBIDDEN: 'FORBIDDEN',                 // 403 - Authenticated but not allowed
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',         // 401 - Token has expired
  INVALID_TOKEN: 'INVALID_TOKEN',         // 401 - Token is malformed or invalid

  // Resource Errors
  NOT_FOUND: 'NOT_FOUND',                 // 404 - Resource not found
  ALREADY_EXISTS: 'ALREADY_EXISTS',       // 409 - Resource already exists
  CONFLICT: 'CONFLICT',                   // 409 - State conflict

  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',   // 400 - Request body validation failed
  INVALID_INPUT: 'INVALID_INPUT',         // 400 - Invalid query params or path params
  MISSING_FIELD: 'MISSING_FIELD',         // 400 - Required field is missing

  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',       // 500 - Unexpected server error
  DATABASE_ERROR: 'DATABASE_ERROR',       // 500 - Database operation failed
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR', // 502 - External API failed

  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',           // 429 - Too many requests

  // Business Logic
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED', // 403 - Business rule violation
  INVALID_STATE: 'INVALID_STATE',         // 400 - Resource in wrong state for operation
} as const;

export type ApiErrorCode = keyof typeof ApiErrorCodes;

/**
 * Create a standardized API error response
 *
 * @param message - Human-readable error message
 * @param code - Error code from ApiErrorCodes
 * @param status - HTTP status code
 * @param details - Optional additional error details
 * @returns NextResponse with standardized error format
 *
 * @example
 * // Simple error
 * return apiError('Daily log not found', 'NOT_FOUND', 404);
 *
 * @example
 * // Error with details
 * return apiError('Validation failed', 'VALIDATION_ERROR', 400, {
 *   fields: { email: 'Invalid email format' }
 * });
 */
export function apiError(
  message: string,
  code: ApiErrorCode,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    error: message,
    code: ApiErrorCodes[code],
  };

  if (details) {
    body.details = details;
  }

  return NextResponse.json(body, { status });
}

/**
 * Common error response helpers
 */
export const ApiErrors = {
  /** 401 - User is not authenticated */
  unauthorized: (message = 'Authentication required') =>
    apiError(message, 'UNAUTHORIZED', 401),

  /** 403 - User lacks permission for this action */
  forbidden: (message = 'You do not have permission to perform this action') =>
    apiError(message, 'FORBIDDEN', 403),

  /** 404 - Resource not found */
  notFound: (resource = 'Resource') =>
    apiError(`${resource} not found`, 'NOT_FOUND', 404),

  /** 400 - Validation error with field details */
  validationError: (message: string, fields?: Record<string, string>) =>
    apiError(message, 'VALIDATION_ERROR', 400, fields ? { fields } : undefined),

  /** 400 - Missing required field */
  missingField: (fieldName: string) =>
    apiError(`Missing required field: ${fieldName}`, 'MISSING_FIELD', 400, { field: fieldName }),

  /** 400 - Invalid input parameter */
  invalidInput: (message: string, details?: Record<string, unknown>) =>
    apiError(message, 'INVALID_INPUT', 400, details),

  /** 409 - Resource already exists */
  alreadyExists: (resource = 'Resource') =>
    apiError(`${resource} already exists`, 'ALREADY_EXISTS', 409),

  /** 409 - Conflict with current state */
  conflict: (message: string) =>
    apiError(message, 'CONFLICT', 409),

  /** 429 - Rate limit exceeded */
  rateLimited: (retryAfterSeconds?: number) =>
    apiError('Too many requests. Please try again later.', 'RATE_LIMITED', 429,
      retryAfterSeconds ? { retryAfter: retryAfterSeconds } : undefined),

  /** 500 - Internal server error */
  internalError: (message = 'An unexpected error occurred') =>
    apiError(message, 'INTERNAL_ERROR', 500),

  /** 500 - Database error (don't expose details to client) */
  databaseError: () =>
    apiError('A database error occurred', 'DATABASE_ERROR', 500),

  /** 502 - External service error */
  externalServiceError: (serviceName: string) =>
    apiError(`External service error: ${serviceName}`, 'EXTERNAL_SERVICE_ERROR', 502),

  /** 403 - Operation not allowed by business rules */
  operationNotAllowed: (reason: string) =>
    apiError(reason, 'OPERATION_NOT_ALLOWED', 403),

  /** 400 - Resource in invalid state for operation */
  invalidState: (message: string) =>
    apiError(message, 'INVALID_STATE', 400),
};

/**
 * Type guard to check if an error is a Prisma error
 */
export function isPrismaError(error: unknown): error is { code: string; meta?: Record<string, unknown> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

/**
 * Handle Prisma errors and return appropriate API error responses
 */
export function handlePrismaError(error: unknown): NextResponse<ApiErrorResponse> {
  if (!isPrismaError(error)) {
    console.error('Unexpected error:', error);
    return ApiErrors.internalError();
  }

  switch (error.code) {
    case 'P2002': // Unique constraint violation
      return ApiErrors.alreadyExists('Record');
    case 'P2025': // Record not found
      return ApiErrors.notFound('Record');
    case 'P2003': // Foreign key constraint violation
      return apiError('Related record not found', 'NOT_FOUND', 404);
    case 'P2014': // Required relation violation
      return apiError('Required relation constraint violated', 'VALIDATION_ERROR', 400);
    default:
      console.error('Prisma error:', error.code, error.meta);
      return ApiErrors.databaseError();
  }
}
