import { Prisma } from '@prisma/client'

export interface PrismaErrorResult {
  message: string
  code: string
  field?: string
}

/**
 * Handles Prisma errors and returns user-friendly error messages
 */
export function handlePrismaError(error: unknown): PrismaErrorResult {
  // Handle known Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = error.meta?.target as string[] | undefined
        const field = target?.[0] || 'field'
        return {
          message: `A record with this ${field} already exists`,
          code: 'DUPLICATE',
          field,
        }
      }
      case 'P2025':
        // Record not found
        return {
          message: 'Record not found',
          code: 'NOT_FOUND',
        }
      case 'P2003': {
        // Foreign key constraint violation
        const fieldName = error.meta?.field_name as string | undefined
        return {
          message: `Related record not found${fieldName ? ` (${fieldName})` : ''}`,
          code: 'FK_VIOLATION',
          field: fieldName,
        }
      }
      case 'P2014':
        // Required relation violation
        return {
          message: 'The change would violate a required relation',
          code: 'RELATION_VIOLATION',
        }
      case 'P2016':
        // Query interpretation error
        return {
          message: 'Query interpretation error',
          code: 'QUERY_ERROR',
        }
      case 'P2021':
        // Table does not exist
        return {
          message: 'Database table does not exist',
          code: 'TABLE_NOT_FOUND',
        }
      case 'P2022':
        // Column does not exist
        return {
          message: 'Database column does not exist',
          code: 'COLUMN_NOT_FOUND',
        }
      default:
        return {
          message: 'Database error occurred',
          code: error.code,
        }
    }
  }

  // Handle validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      message: 'Invalid data provided',
      code: 'VALIDATION_ERROR',
    }
  }

  // Handle initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      message: 'Database connection failed',
      code: 'CONNECTION_ERROR',
    }
  }

  // Handle Rust panic errors
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      message: 'Critical database engine error',
      code: 'ENGINE_ERROR',
    }
  }

  // Handle unknown errors
  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN',
    }
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN',
  }
}

/**
 * Check if an error is a specific Prisma error code
 */
export function isPrismaError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  )
}

/**
 * Check if an error is a unique constraint violation
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return isPrismaError(error, 'P2002')
}

/**
 * Check if an error is a not found error
 */
export function isNotFoundError(error: unknown): boolean {
  return isPrismaError(error, 'P2025')
}

/**
 * Check if an error is a foreign key violation
 */
export function isForeignKeyError(error: unknown): boolean {
  return isPrismaError(error, 'P2003')
}
