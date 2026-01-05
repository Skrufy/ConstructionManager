import { z } from 'zod';
/**
 * Document/File schema - Full object
 */
export declare const DocumentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    storagePath: z.ZodString;
    category: z.ZodNullable<z.ZodEnum<["DRAWINGS", "SPECIFICATIONS", "CONTRACTS", "PHOTOS", "REPORTS", "OTHER"]>>;
    drawingNumber: z.ZodNullable<z.ZodString>;
    sheetTitle: z.ZodNullable<z.ZodString>;
    discipline: z.ZodNullable<z.ZodString>;
    revision: z.ZodNullable<z.ZodString>;
    scale: z.ZodNullable<z.ZodString>;
    pageCount: z.ZodNullable<z.ZodNumber>;
    currentVersion: z.ZodNumber;
    isLatest: z.ZodBoolean;
    isAdminOnly: z.ZodBoolean;
    description: z.ZodNullable<z.ZodString>;
    tags: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    gpsLatitude: z.ZodNullable<z.ZodNumber>;
    gpsLongitude: z.ZodNullable<z.ZodNumber>;
    takenAt: z.ZodNullable<z.ZodString>;
    project: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>;
    uploader: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        email?: string | undefined;
    }, {
        id: string;
        name: string;
        email?: string | undefined;
    }>;
    revisionCount: z.ZodOptional<z.ZodNumber>;
    annotationCount: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    name: string;
    createdAt: string;
    description: string | null;
    gpsLatitude: number | null;
    gpsLongitude: number | null;
    category: "OTHER" | "DRAWINGS" | "SPECIFICATIONS" | "CONTRACTS" | "PHOTOS" | "REPORTS" | null;
    project: {
        id: string;
        name: string;
    };
    storagePath: string;
    drawingNumber: string | null;
    sheetTitle: string | null;
    discipline: string | null;
    revision: string | null;
    scale: string | null;
    pageCount: number | null;
    currentVersion: number;
    isLatest: boolean;
    isAdminOnly: boolean;
    tags: string[] | null;
    takenAt: string | null;
    uploader: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    revisionCount?: number | undefined;
    annotationCount?: number | undefined;
}, {
    type: string;
    id: string;
    name: string;
    createdAt: string;
    description: string | null;
    gpsLatitude: number | null;
    gpsLongitude: number | null;
    category: "OTHER" | "DRAWINGS" | "SPECIFICATIONS" | "CONTRACTS" | "PHOTOS" | "REPORTS" | null;
    project: {
        id: string;
        name: string;
    };
    storagePath: string;
    drawingNumber: string | null;
    sheetTitle: string | null;
    discipline: string | null;
    revision: string | null;
    scale: string | null;
    pageCount: number | null;
    currentVersion: number;
    isLatest: boolean;
    isAdminOnly: boolean;
    tags: string[] | null;
    takenAt: string | null;
    uploader: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    revisionCount?: number | undefined;
    annotationCount?: number | undefined;
}>;
export type Document = z.infer<typeof DocumentSchema>;
/**
 * Document summary (for list views)
 */
export declare const DocumentSummarySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    category: z.ZodNullable<z.ZodEnum<["DRAWINGS", "SPECIFICATIONS", "CONTRACTS", "PHOTOS", "REPORTS", "OTHER"]>>;
    drawingNumber: z.ZodNullable<z.ZodString>;
    sheetTitle: z.ZodNullable<z.ZodString>;
    revisionCount: z.ZodNumber;
    annotationCount: z.ZodNumber;
    projectName: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    name: string;
    createdAt: string;
    category: "OTHER" | "DRAWINGS" | "SPECIFICATIONS" | "CONTRACTS" | "PHOTOS" | "REPORTS" | null;
    projectName: string | null;
    drawingNumber: string | null;
    sheetTitle: string | null;
    revisionCount: number;
    annotationCount: number;
}, {
    type: string;
    id: string;
    name: string;
    createdAt: string;
    category: "OTHER" | "DRAWINGS" | "SPECIFICATIONS" | "CONTRACTS" | "PHOTOS" | "REPORTS" | null;
    projectName: string | null;
    drawingNumber: string | null;
    sheetTitle: string | null;
    revisionCount: number;
    annotationCount: number;
}>;
export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;
/**
 * Document revision
 */
export declare const DocumentRevisionSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodNumber;
    storagePath: z.ZodString;
    changeNotes: z.ZodNullable<z.ZodString>;
    uploadedBy: z.ZodString;
    fileSize: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    storagePath: string;
    version: number;
    changeNotes: string | null;
    uploadedBy: string;
    fileSize: number | null;
}, {
    id: string;
    createdAt: string;
    storagePath: string;
    version: number;
    changeNotes: string | null;
    uploadedBy: string;
    fileSize: number | null;
}>;
export type DocumentRevision = z.infer<typeof DocumentRevisionSchema>;
/**
 * Document annotation
 */
export declare const DocumentAnnotationSchema: z.ZodObject<{
    id: z.ZodString;
    fileId: z.ZodString;
    annotationType: z.ZodEnum<["COMMENT", "MARKUP", "HIGHLIGHT", "MEASUREMENT", "CALLOUT"]>;
    content: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    pageNumber: z.ZodNullable<z.ZodNumber>;
    createdBy: z.ZodString;
    createdByName: z.ZodNullable<z.ZodString>;
    resolvedAt: z.ZodNullable<z.ZodString>;
    resolvedBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    fileId: string;
    annotationType: "COMMENT" | "MARKUP" | "HIGHLIGHT" | "MEASUREMENT" | "CALLOUT";
    content: Record<string, unknown>;
    pageNumber: number | null;
    createdBy: string;
    createdByName: string | null;
    resolvedAt: string | null;
    resolvedBy: string | null;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    fileId: string;
    annotationType: "COMMENT" | "MARKUP" | "HIGHLIGHT" | "MEASUREMENT" | "CALLOUT";
    content: Record<string, unknown>;
    pageNumber: number | null;
    createdBy: string;
    createdByName: string | null;
    resolvedAt: string | null;
    resolvedBy: string | null;
}>;
export type DocumentAnnotation = z.infer<typeof DocumentAnnotationSchema>;
/**
 * Upload document input
 */
export declare const UploadDocumentInputSchema: z.ZodObject<{
    projectId: z.ZodString;
    name: z.ZodString;
    category: z.ZodOptional<z.ZodEnum<["DRAWINGS", "SPECIFICATIONS", "CONTRACTS", "PHOTOS", "REPORTS", "OTHER"]>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isAdminOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    dailyLogId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    gpsLatitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    gpsLongitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    projectId: string;
    isAdminOnly: boolean;
    description?: string | null | undefined;
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
    category?: "OTHER" | "DRAWINGS" | "SPECIFICATIONS" | "CONTRACTS" | "PHOTOS" | "REPORTS" | undefined;
    tags?: string[] | undefined;
    dailyLogId?: string | null | undefined;
}, {
    name: string;
    projectId: string;
    description?: string | null | undefined;
    gpsLatitude?: number | null | undefined;
    gpsLongitude?: number | null | undefined;
    category?: "OTHER" | "DRAWINGS" | "SPECIFICATIONS" | "CONTRACTS" | "PHOTOS" | "REPORTS" | undefined;
    isAdminOnly?: boolean | undefined;
    tags?: string[] | undefined;
    dailyLogId?: string | null | undefined;
}>;
export type UploadDocumentInput = z.infer<typeof UploadDocumentInputSchema>;
/**
 * Create annotation input
 */
export declare const CreateAnnotationInputSchema: z.ZodObject<{
    annotationType: z.ZodEnum<["COMMENT", "MARKUP", "HIGHLIGHT", "MEASUREMENT", "CALLOUT"]>;
    content: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    pageNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    annotationType: "COMMENT" | "MARKUP" | "HIGHLIGHT" | "MEASUREMENT" | "CALLOUT";
    content: Record<string, unknown>;
    pageNumber?: number | null | undefined;
}, {
    annotationType: "COMMENT" | "MARKUP" | "HIGHLIGHT" | "MEASUREMENT" | "CALLOUT";
    content: Record<string, unknown>;
    pageNumber?: number | null | undefined;
}>;
export type CreateAnnotationInput = z.infer<typeof CreateAnnotationInputSchema>;
//# sourceMappingURL=document.d.ts.map