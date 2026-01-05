import { z } from 'zod';
import { IdSchema, DateTimeSchema, DateSchema, UserRefSchema, ProjectRefSchema } from './common';
import {
  SeverityEnum,
  IncidentTypeEnum,
  IncidentStatusEnum,
  InspectionStatusEnum,
  PunchListStatusEnum,
  PunchListItemStatusEnum,
  PriorityEnum,
} from '../enums/status';

// ============ INCIDENT REPORTS ============

/**
 * Incident report schema - Full object
 */
export const IncidentReportSchema = z.object({
  id: IdSchema,
  incidentDate: DateTimeSchema,
  incidentTime: z.string().nullable(),
  location: z.string(),
  incidentType: IncidentTypeEnum,
  severity: SeverityEnum,
  description: z.string(),
  rootCause: z.string().nullable(),
  immediateActions: z.string().nullable(),
  witnesses: z.array(z.object({
    name: z.string(),
    contact: z.string().optional(),
  })).nullable(),
  injuredParties: z.array(z.object({
    name: z.string(),
    injury: z.string(),
    treatment: z.string().optional(),
  })).nullable(),
  photos: z.array(z.string()).nullable(),
  status: IncidentStatusEnum,
  investigationNotes: z.string().nullable(),
  correctiveActions: z.string().nullable(),

  // Relations
  project: ProjectRefSchema,
  reporter: UserRefSchema,
  closer: UserRefSchema.nullable(),

  // Timestamps
  closedAt: DateTimeSchema.nullable(),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});
export type IncidentReport = z.infer<typeof IncidentReportSchema>;

/**
 * Create incident input
 */
export const CreateIncidentInputSchema = z.object({
  projectId: IdSchema,
  incidentDate: DateTimeSchema,
  incidentTime: z.string().nullable().optional(),
  location: z.string().min(1),
  incidentType: IncidentTypeEnum,
  severity: SeverityEnum,
  description: z.string().min(1),
  rootCause: z.string().nullable().optional(),
  immediateActions: z.string().nullable().optional(),
});
export type CreateIncidentInput = z.infer<typeof CreateIncidentInputSchema>;

// ============ INSPECTIONS ============

/**
 * Inspection schema - Full object
 */
export const InspectionSchema = z.object({
  id: IdSchema,
  date: DateTimeSchema,
  location: z.string().nullable(),
  overallStatus: InspectionStatusEnum,
  notes: z.string().nullable(),
  signatureUrl: z.string().nullable(),

  // Template info
  templateId: IdSchema.nullable(),
  templateName: z.string().nullable(),

  // Responses (when completed)
  responses: z.array(z.object({
    itemIndex: z.number().int(),
    itemText: z.string(),
    status: z.enum(['PASS', 'FAIL', 'NA']),
    notes: z.string().nullable(),
  })).nullable(),

  // Relations
  project: ProjectRefSchema,
  inspector: UserRefSchema,

  // Photos
  photos: z.array(z.object({
    id: IdSchema,
    url: z.string(),
    caption: z.string().nullable(),
    itemIndex: z.number().int().nullable(),
  })).optional(),

  // Timestamps
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});
export type Inspection = z.infer<typeof InspectionSchema>;

/**
 * Create inspection input
 */
export const CreateInspectionInputSchema = z.object({
  projectId: IdSchema,
  templateId: IdSchema.nullable().optional(),
  date: DateTimeSchema,
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type CreateInspectionInput = z.infer<typeof CreateInspectionInputSchema>;

/**
 * Complete inspection input
 */
export const CompleteInspectionInputSchema = z.object({
  responses: z.array(z.object({
    itemIndex: z.number().int(),
    status: z.enum(['PASS', 'FAIL', 'NA']),
    notes: z.string().nullable().optional(),
  })),
  overallStatus: InspectionStatusEnum,
  notes: z.string().nullable().optional(),
  signatureUrl: z.string().nullable().optional(),
});
export type CompleteInspectionInput = z.infer<typeof CompleteInspectionInputSchema>;

// ============ PUNCH LISTS ============

/**
 * Punch list item schema
 */
export const PunchListItemSchema = z.object({
  id: IdSchema,
  description: z.string(),
  location: z.string().nullable(),
  trade: z.string().nullable(),
  priority: PriorityEnum,
  status: PunchListItemStatusEnum,
  dueDate: DateTimeSchema.nullable(),
  photos: z.array(z.string()).nullable(),
  notes: z.string().nullable(),

  // Relations
  assignee: UserRefSchema.nullable(),
  completer: UserRefSchema.nullable(),
  verifier: UserRefSchema.nullable(),

  // Timestamps
  completedAt: DateTimeSchema.nullable(),
  verifiedAt: DateTimeSchema.nullable(),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});
export type PunchListItem = z.infer<typeof PunchListItemSchema>;

/**
 * Punch list schema - Full object
 */
export const PunchListSchema = z.object({
  id: IdSchema,
  name: z.string(),
  description: z.string().nullable(),
  dueDate: DateTimeSchema.nullable(),
  status: PunchListStatusEnum,

  // Relations
  project: ProjectRefSchema,
  creator: UserRefSchema,
  items: z.array(PunchListItemSchema).optional(),

  // Counts
  totalItems: z.number().int(),
  completedItems: z.number().int(),
  openItems: z.number().int(),

  // Timestamps
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});
export type PunchList = z.infer<typeof PunchListSchema>;

/**
 * Create punch list input
 */
export const CreatePunchListInputSchema = z.object({
  projectId: IdSchema,
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  dueDate: DateTimeSchema.nullable().optional(),
});
export type CreatePunchListInput = z.infer<typeof CreatePunchListInputSchema>;

/**
 * Create punch list item input
 */
export const CreatePunchListItemInputSchema = z.object({
  description: z.string().min(1),
  location: z.string().nullable().optional(),
  trade: z.string().nullable().optional(),
  priority: PriorityEnum.optional().default('MEDIUM'),
  assignedTo: IdSchema.nullable().optional(),
  dueDate: DateTimeSchema.nullable().optional(),
});
export type CreatePunchListItemInput = z.infer<typeof CreatePunchListItemInputSchema>;
