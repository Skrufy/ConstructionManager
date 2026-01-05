import { z } from 'zod';
import { IdSchema, DateTimeSchema, UserRefSchema, ProjectRefSchema, GpsCoordinatesSchema } from './common';
import { TimeEntryStatusEnum } from '../enums/status';

/**
 * Time entry schema - Full object
 */
export const TimeEntrySchema = z.object({
  id: IdSchema,
  clockIn: DateTimeSchema,
  clockOut: DateTimeSchema.nullable(),
  breakMinutes: z.number().int().default(0),
  status: TimeEntryStatusEnum,
  notes: z.string().nullable(),

  // GPS data
  gpsIn: GpsCoordinatesSchema.nullable(),
  gpsOut: GpsCoordinatesSchema.nullable(),

  // Relations
  user: UserRefSchema,
  project: ProjectRefSchema,
  approver: UserRefSchema.nullable(),

  // Computed
  totalHours: z.number().optional(), // Computed from clockIn/clockOut/breakMinutes

  // Timestamps
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});
export type TimeEntry = z.infer<typeof TimeEntrySchema>;

/**
 * Active time entry (currently clocked in)
 */
export const ActiveTimeEntrySchema = z.object({
  id: IdSchema,
  clockIn: DateTimeSchema,
  project: ProjectRefSchema,
  gpsIn: GpsCoordinatesSchema.nullable(),
  notes: z.string().nullable(),
  elapsedMinutes: z.number().int(), // Computed server-side
});
export type ActiveTimeEntry = z.infer<typeof ActiveTimeEntrySchema>;

/**
 * Clock in input
 */
export const ClockInInputSchema = z.object({
  projectId: IdSchema,
  gpsLatitude: z.number().nullable().optional(),
  gpsLongitude: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type ClockInInput = z.infer<typeof ClockInInputSchema>;

/**
 * Clock out input
 */
export const ClockOutInputSchema = z.object({
  gpsLatitude: z.number().nullable().optional(),
  gpsLongitude: z.number().nullable().optional(),
  breakMinutes: z.number().int().optional().default(0),
  notes: z.string().nullable().optional(),
});
export type ClockOutInput = z.infer<typeof ClockOutInputSchema>;

/**
 * Time entry summary (for reports)
 */
export const TimeEntrySummarySchema = z.object({
  userId: IdSchema,
  userName: z.string(),
  projectId: IdSchema,
  projectName: z.string(),
  date: z.string(), // YYYY-MM-DD
  totalHours: z.number(),
  status: TimeEntryStatusEnum,
});
export type TimeEntrySummary = z.infer<typeof TimeEntrySummarySchema>;
