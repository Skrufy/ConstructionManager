import { z } from 'zod';
import { IdSchema, DateTimeSchema, UserRefSchema, ProjectRefSchema } from './common';
import { DocumentCategoryEnum } from '../enums/status';

/**
 * Document/File schema - Full object
 */
export const DocumentSchema = z.object({
  id: IdSchema,
  name: z.string(),
  type: z.string(), // MIME type or category: image, document, video
  storagePath: z.string(),
  category: DocumentCategoryEnum.nullable(),

  // Drawing-specific fields
  drawingNumber: z.string().nullable(),
  sheetTitle: z.string().nullable(),
  discipline: z.string().nullable(),
  revision: z.string().nullable(),
  scale: z.string().nullable(),

  // Metadata
  pageCount: z.number().int().nullable(),
  currentVersion: z.number().int(),
  isLatest: z.boolean(),
  isAdminOnly: z.boolean(),
  description: z.string().nullable(),
  tags: z.array(z.string()).nullable(),

  // GPS data (for photos)
  gpsLatitude: z.number().nullable(),
  gpsLongitude: z.number().nullable(),
  takenAt: DateTimeSchema.nullable(),

  // Relations
  project: ProjectRefSchema,
  uploader: UserRefSchema,

  // Counts
  revisionCount: z.number().int().optional(),
  annotationCount: z.number().int().optional(),

  // Timestamps
  createdAt: DateTimeSchema,
});
export type Document = z.infer<typeof DocumentSchema>;

/**
 * Document summary (for list views)
 */
export const DocumentSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  type: z.string(),
  category: DocumentCategoryEnum.nullable(),
  drawingNumber: z.string().nullable(),
  sheetTitle: z.string().nullable(),
  revisionCount: z.number().int(),
  annotationCount: z.number().int(),
  projectName: z.string().nullable(),
  createdAt: DateTimeSchema,
});
export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;

/**
 * Document revision
 */
export const DocumentRevisionSchema = z.object({
  id: IdSchema,
  version: z.number().int(),
  storagePath: z.string(),
  changeNotes: z.string().nullable(),
  uploadedBy: z.string(),
  fileSize: z.number().int().nullable(),
  createdAt: DateTimeSchema,
});
export type DocumentRevision = z.infer<typeof DocumentRevisionSchema>;

/**
 * Document annotation
 */
export const DocumentAnnotationSchema = z.object({
  id: IdSchema,
  fileId: IdSchema,
  annotationType: z.enum(['COMMENT', 'MARKUP', 'HIGHLIGHT', 'MEASUREMENT', 'CALLOUT']),
  content: z.record(z.unknown()), // Position, text, shape, etc.
  pageNumber: z.number().int().nullable(),
  createdBy: z.string(),
  createdByName: z.string().nullable(),
  resolvedAt: DateTimeSchema.nullable(),
  resolvedBy: z.string().nullable(),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});
export type DocumentAnnotation = z.infer<typeof DocumentAnnotationSchema>;

/**
 * Upload document input
 */
export const UploadDocumentInputSchema = z.object({
  projectId: IdSchema,
  name: z.string().min(1),
  category: DocumentCategoryEnum.optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  isAdminOnly: z.boolean().optional().default(false),
  dailyLogId: IdSchema.nullable().optional(),

  // GPS for photos
  gpsLatitude: z.number().nullable().optional(),
  gpsLongitude: z.number().nullable().optional(),
});
export type UploadDocumentInput = z.infer<typeof UploadDocumentInputSchema>;

/**
 * Create annotation input
 */
export const CreateAnnotationInputSchema = z.object({
  annotationType: z.enum(['COMMENT', 'MARKUP', 'HIGHLIGHT', 'MEASUREMENT', 'CALLOUT']),
  content: z.record(z.unknown()),
  pageNumber: z.number().int().nullable().optional(),
});
export type CreateAnnotationInput = z.infer<typeof CreateAnnotationInputSchema>;
