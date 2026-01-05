import { z } from 'zod';
import { IdSchema, DateTimeSchema, DateSchema, AddressSchema, UserRefSchema } from './common';
import { ProjectStatusEnum } from '../enums/status';

/**
 * Client reference for projects
 */
export const ClientRefSchema = z.object({
  id: IdSchema,
  companyName: z.string(),
  contactName: z.string().nullable(),
});
export type ClientRef = z.infer<typeof ClientRefSchema>;

/**
 * Project schema - Full project object
 */
export const ProjectSchema = z.object({
  id: IdSchema,
  name: z.string(),
  status: ProjectStatusEnum,
  description: z.string().nullable(),
  startDate: DateSchema.nullable(),
  endDate: DateSchema.nullable(),

  // Address (structured)
  address: AddressSchema,

  // Client relation
  client: ClientRefSchema.nullable(),

  // Team members (optional, depending on include)
  team: z.array(UserRefSchema).optional(),

  // Counts
  dailyLogCount: z.number().int().optional(),
  documentCount: z.number().int().optional(),
  openIncidentCount: z.number().int().optional(),

  // Timestamps
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});
export type Project = z.infer<typeof ProjectSchema>;

/**
 * Project summary (for list views)
 */
export const ProjectSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  status: ProjectStatusEnum,
  address: AddressSchema,
  clientName: z.string().nullable(),
  dailyLogCount: z.number().int(),
  updatedAt: DateTimeSchema,
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

/**
 * Create project input
 */
export const CreateProjectInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  status: ProjectStatusEnum.optional().default('ACTIVE'),
  startDate: DateSchema.nullable().optional(),
  endDate: DateSchema.nullable().optional(),
  clientId: IdSchema.nullable().optional(),

  // Address fields
  address: z.string().nullable().optional(), // Legacy single-line
  addressStreet: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),
  addressZipCode: z.string().nullable().optional(),
  addressCountry: z.string().nullable().optional(),
  gpsLatitude: z.number().nullable().optional(),
  gpsLongitude: z.number().nullable().optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

/**
 * Update project input
 */
export const UpdateProjectInputSchema = CreateProjectInputSchema.partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
