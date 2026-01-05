import { z } from 'zod';
/**
 * Incident report schema - Full object
 */
export declare const IncidentReportSchema: z.ZodObject<{
    id: z.ZodString;
    incidentDate: z.ZodString;
    incidentTime: z.ZodNullable<z.ZodString>;
    location: z.ZodString;
    incidentType: z.ZodEnum<["INJURY", "NEAR_MISS", "PROPERTY_DAMAGE", "ENVIRONMENTAL", "OTHER"]>;
    severity: z.ZodEnum<["MINOR", "MODERATE", "SERIOUS", "CRITICAL"]>;
    description: z.ZodString;
    rootCause: z.ZodNullable<z.ZodString>;
    immediateActions: z.ZodNullable<z.ZodString>;
    witnesses: z.ZodNullable<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        contact: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        contact?: string | undefined;
    }, {
        name: string;
        contact?: string | undefined;
    }>, "many">>;
    injuredParties: z.ZodNullable<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        injury: z.ZodString;
        treatment: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        injury: string;
        treatment?: string | undefined;
    }, {
        name: string;
        injury: string;
        treatment?: string | undefined;
    }>, "many">>;
    photos: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodEnum<["REPORTED", "UNDER_INVESTIGATION", "CLOSED"]>;
    investigationNotes: z.ZodNullable<z.ZodString>;
    correctiveActions: z.ZodNullable<z.ZodString>;
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
    reporter: z.ZodObject<{
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
    closer: z.ZodNullable<z.ZodObject<{
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
    }>>;
    closedAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "REPORTED" | "UNDER_INVESTIGATION" | "CLOSED";
    id: string;
    createdAt: string;
    updatedAt: string;
    description: string;
    project: {
        id: string;
        name: string;
    };
    photos: string[] | null;
    incidentDate: string;
    incidentTime: string | null;
    location: string;
    incidentType: "INJURY" | "NEAR_MISS" | "PROPERTY_DAMAGE" | "ENVIRONMENTAL" | "OTHER";
    severity: "MINOR" | "MODERATE" | "SERIOUS" | "CRITICAL";
    rootCause: string | null;
    immediateActions: string | null;
    witnesses: {
        name: string;
        contact?: string | undefined;
    }[] | null;
    injuredParties: {
        name: string;
        injury: string;
        treatment?: string | undefined;
    }[] | null;
    investigationNotes: string | null;
    correctiveActions: string | null;
    reporter: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    closer: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null;
    closedAt: string | null;
}, {
    status: "REPORTED" | "UNDER_INVESTIGATION" | "CLOSED";
    id: string;
    createdAt: string;
    updatedAt: string;
    description: string;
    project: {
        id: string;
        name: string;
    };
    photos: string[] | null;
    incidentDate: string;
    incidentTime: string | null;
    location: string;
    incidentType: "INJURY" | "NEAR_MISS" | "PROPERTY_DAMAGE" | "ENVIRONMENTAL" | "OTHER";
    severity: "MINOR" | "MODERATE" | "SERIOUS" | "CRITICAL";
    rootCause: string | null;
    immediateActions: string | null;
    witnesses: {
        name: string;
        contact?: string | undefined;
    }[] | null;
    injuredParties: {
        name: string;
        injury: string;
        treatment?: string | undefined;
    }[] | null;
    investigationNotes: string | null;
    correctiveActions: string | null;
    reporter: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    closer: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null;
    closedAt: string | null;
}>;
export type IncidentReport = z.infer<typeof IncidentReportSchema>;
/**
 * Create incident input
 */
export declare const CreateIncidentInputSchema: z.ZodObject<{
    projectId: z.ZodString;
    incidentDate: z.ZodString;
    incidentTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    location: z.ZodString;
    incidentType: z.ZodEnum<["INJURY", "NEAR_MISS", "PROPERTY_DAMAGE", "ENVIRONMENTAL", "OTHER"]>;
    severity: z.ZodEnum<["MINOR", "MODERATE", "SERIOUS", "CRITICAL"]>;
    description: z.ZodString;
    rootCause: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    immediateActions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    projectId: string;
    incidentDate: string;
    location: string;
    incidentType: "INJURY" | "NEAR_MISS" | "PROPERTY_DAMAGE" | "ENVIRONMENTAL" | "OTHER";
    severity: "MINOR" | "MODERATE" | "SERIOUS" | "CRITICAL";
    incidentTime?: string | null | undefined;
    rootCause?: string | null | undefined;
    immediateActions?: string | null | undefined;
}, {
    description: string;
    projectId: string;
    incidentDate: string;
    location: string;
    incidentType: "INJURY" | "NEAR_MISS" | "PROPERTY_DAMAGE" | "ENVIRONMENTAL" | "OTHER";
    severity: "MINOR" | "MODERATE" | "SERIOUS" | "CRITICAL";
    incidentTime?: string | null | undefined;
    rootCause?: string | null | undefined;
    immediateActions?: string | null | undefined;
}>;
export type CreateIncidentInput = z.infer<typeof CreateIncidentInputSchema>;
/**
 * Inspection schema - Full object
 */
export declare const InspectionSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodString;
    location: z.ZodNullable<z.ZodString>;
    overallStatus: z.ZodEnum<["SCHEDULED", "PENDING", "PASSED", "FAILED", "REQUIRES_FOLLOWUP"]>;
    notes: z.ZodNullable<z.ZodString>;
    signatureUrl: z.ZodNullable<z.ZodString>;
    templateId: z.ZodNullable<z.ZodString>;
    templateName: z.ZodNullable<z.ZodString>;
    responses: z.ZodNullable<z.ZodArray<z.ZodObject<{
        itemIndex: z.ZodNumber;
        itemText: z.ZodString;
        status: z.ZodEnum<["PASS", "FAIL", "NA"]>;
        notes: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "PASS" | "FAIL" | "NA";
        notes: string | null;
        itemIndex: number;
        itemText: string;
    }, {
        status: "PASS" | "FAIL" | "NA";
        notes: string | null;
        itemIndex: number;
        itemText: string;
    }>, "many">>;
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
    inspector: z.ZodObject<{
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
    photos: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        url: z.ZodString;
        caption: z.ZodNullable<z.ZodString>;
        itemIndex: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        caption: string | null;
        itemIndex: number | null;
    }, {
        id: string;
        url: string;
        caption: string | null;
        itemIndex: number | null;
    }>, "many">>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    notes: string | null;
    project: {
        id: string;
        name: string;
    };
    location: string | null;
    overallStatus: "PENDING" | "SCHEDULED" | "PASSED" | "FAILED" | "REQUIRES_FOLLOWUP";
    signatureUrl: string | null;
    templateId: string | null;
    templateName: string | null;
    responses: {
        status: "PASS" | "FAIL" | "NA";
        notes: string | null;
        itemIndex: number;
        itemText: string;
    }[] | null;
    inspector: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    photos?: {
        id: string;
        url: string;
        caption: string | null;
        itemIndex: number | null;
    }[] | undefined;
}, {
    date: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    notes: string | null;
    project: {
        id: string;
        name: string;
    };
    location: string | null;
    overallStatus: "PENDING" | "SCHEDULED" | "PASSED" | "FAILED" | "REQUIRES_FOLLOWUP";
    signatureUrl: string | null;
    templateId: string | null;
    templateName: string | null;
    responses: {
        status: "PASS" | "FAIL" | "NA";
        notes: string | null;
        itemIndex: number;
        itemText: string;
    }[] | null;
    inspector: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    photos?: {
        id: string;
        url: string;
        caption: string | null;
        itemIndex: number | null;
    }[] | undefined;
}>;
export type Inspection = z.infer<typeof InspectionSchema>;
/**
 * Create inspection input
 */
export declare const CreateInspectionInputSchema: z.ZodObject<{
    projectId: z.ZodString;
    templateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    date: z.ZodString;
    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    date: string;
    projectId: string;
    notes?: string | null | undefined;
    location?: string | null | undefined;
    templateId?: string | null | undefined;
}, {
    date: string;
    projectId: string;
    notes?: string | null | undefined;
    location?: string | null | undefined;
    templateId?: string | null | undefined;
}>;
export type CreateInspectionInput = z.infer<typeof CreateInspectionInputSchema>;
/**
 * Complete inspection input
 */
export declare const CompleteInspectionInputSchema: z.ZodObject<{
    responses: z.ZodArray<z.ZodObject<{
        itemIndex: z.ZodNumber;
        status: z.ZodEnum<["PASS", "FAIL", "NA"]>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status: "PASS" | "FAIL" | "NA";
        itemIndex: number;
        notes?: string | null | undefined;
    }, {
        status: "PASS" | "FAIL" | "NA";
        itemIndex: number;
        notes?: string | null | undefined;
    }>, "many">;
    overallStatus: z.ZodEnum<["SCHEDULED", "PENDING", "PASSED", "FAILED", "REQUIRES_FOLLOWUP"]>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    signatureUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    overallStatus: "PENDING" | "SCHEDULED" | "PASSED" | "FAILED" | "REQUIRES_FOLLOWUP";
    responses: {
        status: "PASS" | "FAIL" | "NA";
        itemIndex: number;
        notes?: string | null | undefined;
    }[];
    notes?: string | null | undefined;
    signatureUrl?: string | null | undefined;
}, {
    overallStatus: "PENDING" | "SCHEDULED" | "PASSED" | "FAILED" | "REQUIRES_FOLLOWUP";
    responses: {
        status: "PASS" | "FAIL" | "NA";
        itemIndex: number;
        notes?: string | null | undefined;
    }[];
    notes?: string | null | undefined;
    signatureUrl?: string | null | undefined;
}>;
export type CompleteInspectionInput = z.infer<typeof CompleteInspectionInputSchema>;
/**
 * Punch list item schema
 */
export declare const PunchListItemSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    location: z.ZodNullable<z.ZodString>;
    trade: z.ZodNullable<z.ZodString>;
    priority: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
    status: z.ZodEnum<["OPEN", "IN_PROGRESS", "COMPLETED", "VERIFIED"]>;
    dueDate: z.ZodNullable<z.ZodString>;
    photos: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    notes: z.ZodNullable<z.ZodString>;
    assignee: z.ZodNullable<z.ZodObject<{
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
    }>>;
    completer: z.ZodNullable<z.ZodObject<{
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
    }>>;
    verifier: z.ZodNullable<z.ZodObject<{
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
    }>>;
    completedAt: z.ZodNullable<z.ZodString>;
    verifiedAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "COMPLETED" | "OPEN" | "IN_PROGRESS" | "VERIFIED";
    id: string;
    createdAt: string;
    updatedAt: string;
    description: string;
    trade: string | null;
    notes: string | null;
    photos: string[] | null;
    location: string | null;
    priority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
    dueDate: string | null;
    assignee: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null;
    completer: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null;
    verifier: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null;
    completedAt: string | null;
    verifiedAt: string | null;
}, {
    status: "COMPLETED" | "OPEN" | "IN_PROGRESS" | "VERIFIED";
    id: string;
    createdAt: string;
    updatedAt: string;
    description: string;
    trade: string | null;
    notes: string | null;
    photos: string[] | null;
    location: string | null;
    priority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
    dueDate: string | null;
    assignee: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null;
    completer: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null;
    verifier: {
        id: string;
        name: string;
        email?: string | undefined;
    } | null;
    completedAt: string | null;
    verifiedAt: string | null;
}>;
export type PunchListItem = z.infer<typeof PunchListItemSchema>;
/**
 * Punch list schema - Full object
 */
export declare const PunchListSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    dueDate: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["OPEN", "IN_PROGRESS", "COMPLETED"]>;
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
    creator: z.ZodObject<{
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
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        location: z.ZodNullable<z.ZodString>;
        trade: z.ZodNullable<z.ZodString>;
        priority: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
        status: z.ZodEnum<["OPEN", "IN_PROGRESS", "COMPLETED", "VERIFIED"]>;
        dueDate: z.ZodNullable<z.ZodString>;
        photos: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
        notes: z.ZodNullable<z.ZodString>;
        assignee: z.ZodNullable<z.ZodObject<{
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
        }>>;
        completer: z.ZodNullable<z.ZodObject<{
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
        }>>;
        verifier: z.ZodNullable<z.ZodObject<{
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
        }>>;
        completedAt: z.ZodNullable<z.ZodString>;
        verifiedAt: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "COMPLETED" | "OPEN" | "IN_PROGRESS" | "VERIFIED";
        id: string;
        createdAt: string;
        updatedAt: string;
        description: string;
        trade: string | null;
        notes: string | null;
        photos: string[] | null;
        location: string | null;
        priority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        dueDate: string | null;
        assignee: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        completer: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        verifier: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        completedAt: string | null;
        verifiedAt: string | null;
    }, {
        status: "COMPLETED" | "OPEN" | "IN_PROGRESS" | "VERIFIED";
        id: string;
        createdAt: string;
        updatedAt: string;
        description: string;
        trade: string | null;
        notes: string | null;
        photos: string[] | null;
        location: string | null;
        priority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        dueDate: string | null;
        assignee: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        completer: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        verifier: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        completedAt: string | null;
        verifiedAt: string | null;
    }>, "many">>;
    totalItems: z.ZodNumber;
    completedItems: z.ZodNumber;
    openItems: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "COMPLETED" | "OPEN" | "IN_PROGRESS";
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    description: string | null;
    project: {
        id: string;
        name: string;
    };
    dueDate: string | null;
    creator: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    totalItems: number;
    completedItems: number;
    openItems: number;
    items?: {
        status: "COMPLETED" | "OPEN" | "IN_PROGRESS" | "VERIFIED";
        id: string;
        createdAt: string;
        updatedAt: string;
        description: string;
        trade: string | null;
        notes: string | null;
        photos: string[] | null;
        location: string | null;
        priority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        dueDate: string | null;
        assignee: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        completer: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        verifier: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        completedAt: string | null;
        verifiedAt: string | null;
    }[] | undefined;
}, {
    status: "COMPLETED" | "OPEN" | "IN_PROGRESS";
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    description: string | null;
    project: {
        id: string;
        name: string;
    };
    dueDate: string | null;
    creator: {
        id: string;
        name: string;
        email?: string | undefined;
    };
    totalItems: number;
    completedItems: number;
    openItems: number;
    items?: {
        status: "COMPLETED" | "OPEN" | "IN_PROGRESS" | "VERIFIED";
        id: string;
        createdAt: string;
        updatedAt: string;
        description: string;
        trade: string | null;
        notes: string | null;
        photos: string[] | null;
        location: string | null;
        priority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        dueDate: string | null;
        assignee: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        completer: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        verifier: {
            id: string;
            name: string;
            email?: string | undefined;
        } | null;
        completedAt: string | null;
        verifiedAt: string | null;
    }[] | undefined;
}>;
export type PunchList = z.infer<typeof PunchListSchema>;
/**
 * Create punch list input
 */
export declare const CreatePunchListInputSchema: z.ZodObject<{
    projectId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    projectId: string;
    description?: string | null | undefined;
    dueDate?: string | null | undefined;
}, {
    name: string;
    projectId: string;
    description?: string | null | undefined;
    dueDate?: string | null | undefined;
}>;
export type CreatePunchListInput = z.infer<typeof CreatePunchListInputSchema>;
/**
 * Create punch list item input
 */
export declare const CreatePunchListItemInputSchema: z.ZodObject<{
    description: z.ZodString;
    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    trade: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>>;
    assignedTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    priority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
    trade?: string | null | undefined;
    location?: string | null | undefined;
    dueDate?: string | null | undefined;
    assignedTo?: string | null | undefined;
}, {
    description: string;
    trade?: string | null | undefined;
    location?: string | null | undefined;
    priority?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    dueDate?: string | null | undefined;
    assignedTo?: string | null | undefined;
}>;
export type CreatePunchListItemInput = z.infer<typeof CreatePunchListItemInputSchema>;
//# sourceMappingURL=safety.d.ts.map