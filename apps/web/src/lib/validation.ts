import { z } from 'zod'
import { NextResponse } from 'next/server'

// ============================================
// Common Validation Schemas
// ============================================

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Date range base schema (for merging with other schemas)
export const dateRangeBaseSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// Date range schema with validation (for standalone use)
export const dateRangeSchema = dateRangeBaseSchema.refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate)
    }
    return true
  },
  { message: 'Start date must be before end date' }
)

// Search query schema - sanitizes input to prevent injection
export const searchQuerySchema = z.object({
  search: z.string()
    .max(200, 'Search query too long')
    .transform(val => val.trim())
    .transform(val => val.replace(/[<>'"%;()&+]/g, '')) // Remove dangerous characters
    .optional(),
})

// ID parameter schema
export const idSchema = z.string().min(1, 'ID is required').max(50)

// UUID schema
export const uuidSchema = z.string().uuid('Invalid UUID format')

// ============================================
// Project Validation Schemas
// ============================================

export const projectQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
  search: searchQuerySchema.shape.search,
}).merge(paginationSchema)

export const projectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  address: z.string().max(500).optional().nullable(),
  gpsLatitude: z.number().min(-90).max(90).optional().nullable(),
  gpsLongitude: z.number().min(-180).max(180).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
  description: z.string().max(2000).optional().nullable(),
})

// ============================================
// Daily Log Validation Schemas
// ============================================

export const dailyLogQuerySchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED']).optional(),
  date: z.string().optional(),
}).merge(paginationSchema).merge(searchQuerySchema)

export const dailyLogCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  date: z.string().datetime(),
  weatherTemp: z.number().optional(),
  weatherCondition: z.string().max(100).optional(),
  weatherHumidity: z.number().min(0).max(100).optional(),
  weatherWind: z.number().min(0).optional(),
  crewCount: z.number().int().min(0).optional(),
  totalHours: z.number().min(0).optional(),
  notes: z.string().max(5000).optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED']).default('DRAFT'),
})

// ============================================
// Time Entry Validation Schemas
// ============================================

export const timeEntryQuerySchema = z.object({
  projectId: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
}).merge(paginationSchema).merge(dateRangeBaseSchema)

export const timeEntryCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  clockIn: z.string().datetime(),
  clockOut: z.string().datetime().optional().nullable(),
  gpsLatitude: z.number().min(-90).max(90).optional().nullable(),
  gpsLongitude: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().max(1000).optional(),
})

// ============================================
// Equipment Validation Schemas
// ============================================

export const equipmentQuerySchema = z.object({
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE']).optional(),
  type: z.string().max(100).optional(),
}).merge(paginationSchema).merge(searchQuerySchema)

export const equipmentCreateSchema = z.object({
  name: z.string().min(1, 'Equipment name is required').max(200),
  type: z.string().min(1, 'Equipment type is required').max(100),
  identifier: z.string().max(100).optional(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE']).default('AVAILABLE'),
  gpsLatitude: z.number().min(-90).max(90).optional().nullable(),
  gpsLongitude: z.number().min(-180).max(180).optional().nullable(),
  currentProjectId: z.string().optional().nullable(),
  totalHours: z.number().min(0).optional(),
  fuelLevel: z.number().min(0).max(100).optional(),
})

// ============================================
// Document Validation Schemas
// ============================================

export const documentQuerySchema = z.object({
  projectId: z.string().optional(),
  category: z.enum(['DRAWINGS', 'SPECIFICATIONS', 'CONTRACTS', 'PHOTOS', 'REPORTS', 'BIM', 'OTHER']).optional(),
  type: z.string().max(50).optional(),
}).merge(paginationSchema).merge(searchQuerySchema)

export const documentCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  name: z.string().min(1, 'Document name is required').max(255),
  storagePath: z.string().min(1, 'Storage path is required'),
  type: z.string().max(50).optional(),
  category: z.enum(['DRAWINGS', 'SPECIFICATIONS', 'CONTRACTS', 'PHOTOS', 'REPORTS', 'BIM', 'OTHER']).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  gpsLatitude: z.number().min(-90).max(90).optional().nullable(),
  gpsLongitude: z.number().min(-180).max(180).optional().nullable(),
})

// ============================================
// Safety Module Validation Schemas
// ============================================

export const incidentQuerySchema = z.object({
  projectId: z.string().optional(),
  type: z.enum(['INJURY', 'NEAR_MISS', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL', 'THEFT', 'FIRE', 'EQUIPMENT_FAILURE', 'OTHER']).optional(),
  severity: z.enum(['MINOR', 'MODERATE', 'SERIOUS', 'CRITICAL']).optional(),
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']).optional(),
}).merge(paginationSchema).merge(dateRangeBaseSchema)

export const incidentCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  type: z.enum(['INJURY', 'NEAR_MISS', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL', 'THEFT', 'FIRE', 'EQUIPMENT_FAILURE', 'OTHER']),
  severity: z.enum(['MINOR', 'MODERATE', 'SERIOUS', 'CRITICAL']),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  location: z.string().max(500).optional(),
  occurredAt: z.string().datetime(),
  witnesses: z.array(z.string()).max(20).optional(),
  isOshaRecordable: z.boolean().optional(),
})

// ============================================
// Financial Validation Schemas
// ============================================

export const financialQuerySchema = z.object({
  projectId: z.string().optional(),
  category: z.enum(['LABOR', 'MATERIALS', 'EQUIPMENT', 'SUBCONTRACTOR', 'OVERHEAD', 'OTHER']).optional(),
  status: z.string().optional(),
}).merge(paginationSchema).merge(dateRangeBaseSchema)

export const budgetCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  totalBudget: z.number().min(0, 'Budget must be positive'),
  laborBudget: z.number().min(0).optional(),
  materialsBudget: z.number().min(0).optional(),
  equipmentBudget: z.number().min(0).optional(),
  subcontractorBudget: z.number().min(0).optional(),
  overheadBudget: z.number().min(0).optional(),
  contingencyBudget: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
})

export const invoiceCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required').max(50),
  vendor: z.string().min(1, 'Vendor is required').max(200),
  category: z.enum(['LABOR', 'MATERIALS', 'EQUIPMENT', 'SUBCONTRACTOR', 'OVERHEAD', 'OTHER']),
  amount: z.number().min(0, 'Amount must be positive'),
  taxAmount: z.number().min(0).optional(),
  dueDate: z.string().datetime(),
  description: z.string().max(1000).optional(),
})

export const expenseCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  category: z.enum(['FUEL', 'SUPPLIES', 'MEALS', 'TRAVEL', 'TOOLS', 'RENTALS', 'PERMITS', 'UTILITIES', 'OTHER']),
  amount: z.number().min(0, 'Amount must be positive'),
  date: z.string().datetime(),
  description: z.string().max(1000).optional(),
  paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'CHECK', 'TRANSFER', 'OTHER']).optional(),
  isBillable: z.boolean().optional(),
  receiptPath: z.string().optional(),
})

// ============================================
// Analytics Validation Schemas
// ============================================

export const analyticsQuerySchema = z.object({
  type: z.enum(['overview', 'productivity', 'budget', 'schedule', 'forecast']).default('overview'),
  projectId: z.string().optional(),
}).merge(dateRangeBaseSchema)

// ============================================
// Reports Validation Schemas
// ============================================

export const reportQuerySchema = z.object({
  type: z.enum(['project-health', 'labor', 'equipment', 'safety']).optional(),
  projectId: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json'),
}).merge(dateRangeBaseSchema)

// ============================================
// Subcontractor Validation Schemas
// ============================================

export const subcontractorQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'PREFERRED', 'BLACKLISTED']).optional(),
  trade: z.string().max(100).optional(),
}).merge(paginationSchema).merge(searchQuerySchema)

export const subcontractorCreateSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  contactName: z.string().max(200).optional(),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().max(20).optional(),
  trades: z.array(z.string().max(100)).max(20).optional(),
  licenseNumber: z.string().max(100).optional(),
  insuranceExpiry: z.string().datetime().optional().nullable(),
  rating: z.number().min(1).max(5).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PREFERRED', 'BLACKLISTED']).default('ACTIVE'),
  notes: z.string().max(2000).optional(),
})

// ============================================
// Warning Validation Schemas
// ============================================

export const warningQuerySchema = z.object({
  userId: z.string().optional(),
  type: z.enum(['TARDINESS', 'SAFETY_VIOLATION', 'INSUBORDINATION', 'POOR_WORK_QUALITY', 'NO_SHOW', 'DRESS_CODE', 'EQUIPMENT_MISUSE', 'UNPROFESSIONAL_CONDUCT']).optional(),
  severity: z.enum(['VERBAL', 'WRITTEN', 'FINAL']).optional(),
  status: z.enum(['ACTIVE', 'RESOLVED', 'APPEALED', 'VOID']).optional(),
}).merge(paginationSchema)

export const warningCreateSchema = z.object({
  userId: z.string().min(1, 'Employee is required'),
  projectId: z.string().optional(),
  type: z.enum(['TARDINESS', 'SAFETY_VIOLATION', 'INSUBORDINATION', 'POOR_WORK_QUALITY', 'NO_SHOW', 'DRESS_CODE', 'EQUIPMENT_MISUSE', 'UNPROFESSIONAL_CONDUCT']),
  severity: z.enum(['VERBAL', 'WRITTEN', 'FINAL']),
  incidentDate: z.string().datetime(),
  description: z.string().min(1, 'Description is required').max(5000),
  correctiveAction: z.string().max(2000).optional(),
  witnesses: z.array(z.string()).max(10).optional(),
})

// ============================================
// Scheduling Validation Schemas
// ============================================

export const scheduleQuerySchema = z.object({
  projectId: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED']).optional(),
}).merge(paginationSchema).merge(dateRangeBaseSchema)

export const scheduleCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  date: z.string().datetime(),
  startTime: z.string(),
  endTime: z.string(),
  crewMembers: z.array(z.string()).min(1, 'At least one crew member is required'),
  notes: z.string().max(1000).optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED']).default('SCHEDULED'),
})

// ============================================
// Certification Validation Schemas
// ============================================

export const certificationQuerySchema = z.object({
  userId: z.string().optional(),
  subcontractorId: z.string().optional(),
  type: z.enum(['LICENSE', 'CERTIFICATION', 'TRAINING', 'OSHA', 'SAFETY', 'EQUIPMENT', 'INSURANCE', 'BOND', 'OTHER']).optional(),
  status: z.enum(['VALID', 'EXPIRING_SOON', 'EXPIRED']).optional(),
}).merge(paginationSchema)

export const certificationCreateSchema = z.object({
  userId: z.string().optional(),
  subcontractorId: z.string().optional(),
  type: z.enum(['LICENSE', 'CERTIFICATION', 'TRAINING', 'OSHA', 'SAFETY', 'EQUIPMENT', 'INSURANCE', 'BOND', 'OTHER']),
  name: z.string().min(1, 'Certification name is required').max(200),
  issuingAuthority: z.string().max(200).optional(),
  certificationNumber: z.string().max(100).optional(),
  issueDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime(),
  documentPath: z.string().optional(),
}).refine(
  (data) => data.userId || data.subcontractorId,
  { message: 'Either userId or subcontractorId is required' }
)

// ============================================
// Validation Helper Functions
// ============================================

export function validateSearchParams<T extends z.ZodSchema>(
  schema: T,
  searchParams: URLSearchParams
): z.infer<T> | { error: string } {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }
  return result.data
}

export function validateBody<T extends z.ZodSchema>(
  schema: T,
  body: unknown
): z.infer<T> | { error: string } {
  const result = schema.safeParse(body)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }
  return result.data
}

export function createValidationErrorResponse(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 })
}

// Type guard to check if validation result is an error
export function isValidationError<T>(result: T | { error: string }): result is { error: string } {
  return typeof result === 'object' && result !== null && 'error' in result
}
