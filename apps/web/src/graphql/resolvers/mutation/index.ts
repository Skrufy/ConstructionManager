import { GraphQLContext, requireAuth, requireRole, canAccessProject } from '../../context';
import { validateOwnershipOrRole } from '../helpers';

interface CreateDailyLogInput {
  projectId: string;
  date: string;
  notes?: string;
  weatherDelay?: boolean;
  weatherDelayNotes?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
}

interface UpdateDailyLogInput {
  notes?: string;
  weatherDelay?: boolean;
  weatherDelayNotes?: string;
}

interface ClockInInput {
  projectId: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  notes?: string;
}

interface ClockOutInput {
  gpsLatitude?: number;
  gpsLongitude?: number;
  breakMinutes?: number;
  notes?: string;
}

interface CreateEquipmentInput {
  name: string;
  type: string;
  status?: string;
  samsaraId?: string;
}

interface UpdateEquipmentInput {
  name?: string;
  type?: string;
  status?: string;
  samsaraId?: string;
}

interface LogEquipmentUsageInput {
  date?: string;
  hoursUsed?: number;
  fuelUsed?: number;
  notes?: string;
}

interface CreateIncidentInput {
  projectId: string;
  incidentDate: string;
  incidentTime?: string;
  location: string;
  incidentType: string;
  severity: string;
  description: string;
  rootCause?: string;
  immediateActions?: string;
}

interface UpdateIncidentInput {
  location?: string;
  incidentType?: string;
  severity?: string;
  description?: string;
  rootCause?: string;
  immediateActions?: string;
  investigationNotes?: string;
  correctiveActions?: string;
}

interface CreateInspectionInput {
  projectId: string;
  templateId?: string;
  date: string;
  location?: string;
  notes?: string;
}

interface CompleteInspectionInput {
  responses: Array<{
    itemIndex: number;
    status: string;
    notes?: string;
  }>;
  overallStatus: string;
  notes?: string;
  signatureUrl?: string;
}

interface CreatePunchListInput {
  projectId: string;
  name: string;
  description?: string;
  dueDate?: string;
}

interface CreatePunchListItemInput {
  description: string;
  location?: string;
  trade?: string;
  priority?: string;
  assignedTo?: string;
  dueDate?: string;
}

interface UpdatePunchListItemInput {
  description?: string;
  location?: string;
  trade?: string;
  priority?: string;
  assignedTo?: string;
  dueDate?: string;
  notes?: string;
}

interface CreateAnnotationInput {
  annotationType: string;
  content: string;
  pageNumber?: number;
  color?: string;
}

export const Mutation = {
  // ============================================
  // DAILY LOGS
  // ============================================

  createDailyLog: async (
    _: unknown,
    { input }: { input: CreateDailyLogInput },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const canAccess = await canAccessProject(context, input.projectId);
    if (!canAccess) {
      throw new Error('Access denied to this project');
    }

    return context.prisma.dailyLog.create({
      data: {
        projectId: input.projectId,
        date: new Date(input.date),
        submittedBy: user.id,
        notes: input.notes,
        weatherDelay: input.weatherDelay ?? false,
        weatherDelayNotes: input.weatherDelayNotes,
        status: 'DRAFT',
      },
    });
  },

  updateDailyLog: async (
    _: unknown,
    { id, input }: { id: string; input: UpdateDailyLogInput },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const log = await context.prisma.dailyLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new Error('Daily log not found');
    }

    // Only owner or admin can update
    if (!validateOwnershipOrRole(user.id, log.submittedBy, user.role)) {
      throw new Error('Access denied');
    }

    // Cannot update after submitted (unless admin)
    if (log.status !== 'DRAFT' && user.role !== 'ADMIN') {
      throw new Error('Cannot update a submitted daily log');
    }

    return context.prisma.dailyLog.update({
      where: { id },
      data: {
        notes: input.notes,
        weatherDelay: input.weatherDelay,
        weatherDelayNotes: input.weatherDelayNotes,
      },
    });
  },

  submitDailyLog: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const log = await context.prisma.dailyLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new Error('Daily log not found');
    }

    if (!validateOwnershipOrRole(user.id, log.submittedBy, user.role)) {
      throw new Error('Access denied');
    }

    if (log.status !== 'DRAFT') {
      throw new Error('Daily log already submitted');
    }

    return context.prisma.dailyLog.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  },

  approveDailyLog: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    const user = requireRole(context, ['ADMIN', 'PROJECT_MANAGER', 'FOREMAN']);

    const log = await context.prisma.dailyLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new Error('Daily log not found');
    }

    if (log.status !== 'SUBMITTED') {
      throw new Error('Daily log is not pending approval');
    }

    return context.prisma.dailyLog.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  },

  rejectDailyLog: async (
    _: unknown,
    { id, reason }: { id: string; reason: string },
    context: GraphQLContext
  ) => {
    const user = requireRole(context, ['ADMIN', 'PROJECT_MANAGER', 'FOREMAN']);

    const log = await context.prisma.dailyLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new Error('Daily log not found');
    }

    if (log.status !== 'SUBMITTED') {
      throw new Error('Daily log is not pending approval');
    }

    return context.prisma.dailyLog.update({
      where: { id },
      data: {
        status: 'DRAFT', // Return to draft for corrections
        notes: log.notes ? `${log.notes}\n\n[REJECTED: ${reason}]` : `[REJECTED: ${reason}]`,
      },
    });
  },

  // ============================================
  // TIME TRACKING
  // ============================================

  clockIn: async (
    _: unknown,
    { input }: { input: ClockInInput },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    // Check for existing active entry
    const activeEntry = await context.prisma.timeEntry.findFirst({
      where: {
        userId: user.id,
        clockOut: null,
      },
    });

    if (activeEntry) {
      throw new Error('Already clocked in. Please clock out first.');
    }

    const canAccess = await canAccessProject(context, input.projectId);
    if (!canAccess) {
      throw new Error('Access denied to this project');
    }

    return context.prisma.timeEntry.create({
      data: {
        userId: user.id,
        projectId: input.projectId,
        clockIn: new Date(),
        gpsInLat: input.gpsLatitude,
        gpsInLng: input.gpsLongitude,
        notes: input.notes,
        status: 'PENDING',
      },
    });
  },

  clockOut: async (
    _: unknown,
    { id, input }: { id: string; input: ClockOutInput },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const entry = await context.prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new Error('Time entry not found');
    }

    if (entry.userId !== user.id && user.role !== 'ADMIN') {
      throw new Error('Access denied');
    }

    if (entry.clockOut) {
      throw new Error('Already clocked out');
    }

    return context.prisma.timeEntry.update({
      where: { id },
      data: {
        clockOut: new Date(),
        gpsOutLat: input.gpsLatitude,
        gpsOutLng: input.gpsLongitude,
        breakMinutes: input.breakMinutes ?? 0,
        notes: input.notes ?? entry.notes,
      },
    });
  },

  // ============================================
  // EQUIPMENT
  // ============================================

  createEquipment: async (
    _: unknown,
    { input }: { input: CreateEquipmentInput },
    context: GraphQLContext
  ) => {
    requireRole(context, ['ADMIN', 'PROJECT_MANAGER']);

    return context.prisma.equipment.create({
      data: {
        name: input.name,
        type: input.type,
        status: input.status ?? 'AVAILABLE',
        samsaraId: input.samsaraId,
      },
    });
  },

  updateEquipment: async (
    _: unknown,
    { id, input }: { id: string; input: UpdateEquipmentInput },
    context: GraphQLContext
  ) => {
    requireRole(context, ['ADMIN', 'PROJECT_MANAGER']);

    return context.prisma.equipment.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        status: input.status,
        samsaraId: input.samsaraId,
      },
    });
  },

  assignEquipment: async (
    _: unknown,
    { id, projectId }: { id: string; projectId: string },
    context: GraphQLContext
  ) => {
    requireRole(context, ['ADMIN', 'PROJECT_MANAGER']);

    // Create assignment
    await context.prisma.equipmentAssignment.create({
      data: {
        equipmentId: id,
        projectId,
        startDate: new Date(),
      },
    });

    // Update equipment status
    return context.prisma.equipment.update({
      where: { id },
      data: { status: 'IN_USE' },
    });
  },

  logEquipmentUsage: async (
    _: unknown,
    { id, input }: { id: string; input: LogEquipmentUsageInput },
    context: GraphQLContext
  ) => {
    requireAuth(context);

    return context.prisma.equipmentLog.create({
      data: {
        equipmentId: id,
        date: input.date ? new Date(input.date) : new Date(),
        hoursUsed: input.hoursUsed,
        fuelUsed: input.fuelUsed,
        notes: input.notes,
      },
    });
  },

  // ============================================
  // INCIDENTS
  // ============================================

  createIncident: async (
    _: unknown,
    { input }: { input: CreateIncidentInput },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const canAccess = await canAccessProject(context, input.projectId);
    if (!canAccess) {
      throw new Error('Access denied to this project');
    }

    return context.prisma.incidentReport.create({
      data: {
        projectId: input.projectId,
        reportedBy: user.id,
        incidentDate: new Date(input.incidentDate),
        incidentTime: input.incidentTime,
        location: input.location,
        incidentType: input.incidentType,
        severity: input.severity,
        description: input.description,
        rootCause: input.rootCause,
        immediateActions: input.immediateActions,
        status: 'REPORTED',
      },
    });
  },

  updateIncident: async (
    _: unknown,
    { id, input }: { id: string; input: UpdateIncidentInput },
    context: GraphQLContext
  ) => {
    requireRole(context, ['ADMIN', 'PROJECT_MANAGER', 'FOREMAN']);

    return context.prisma.incidentReport.update({
      where: { id },
      data: {
        location: input.location,
        incidentType: input.incidentType,
        severity: input.severity,
        description: input.description,
        rootCause: input.rootCause,
        immediateActions: input.immediateActions,
        investigationNotes: input.investigationNotes,
        correctiveActions: input.correctiveActions,
      },
    });
  },

  closeIncident: async (
    _: unknown,
    { id, notes }: { id: string; notes?: string },
    context: GraphQLContext
  ) => {
    const user = requireRole(context, ['ADMIN', 'PROJECT_MANAGER']);

    return context.prisma.incidentReport.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedBy: user.id,
        closedAt: new Date(),
        investigationNotes: notes,
      },
    });
  },

  // ============================================
  // INSPECTIONS
  // ============================================

  createInspection: async (
    _: unknown,
    { input }: { input: CreateInspectionInput },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const canAccess = await canAccessProject(context, input.projectId);
    if (!canAccess) {
      throw new Error('Access denied to this project');
    }

    return context.prisma.inspection.create({
      data: {
        projectId: input.projectId,
        templateId: input.templateId,
        inspectorId: user.id,
        date: new Date(input.date),
        location: input.location,
        notes: input.notes,
        overallStatus: 'SCHEDULED',
      },
    });
  },

  completeInspection: async (
    _: unknown,
    { id, input }: { id: string; input: CompleteInspectionInput },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const inspection = await context.prisma.inspection.findUnique({
      where: { id },
    });

    if (!inspection) {
      throw new Error('Inspection not found');
    }

    if (inspection.inspectorId !== user.id && user.role !== 'ADMIN') {
      throw new Error('Only the assigned inspector can complete this inspection');
    }

    return context.prisma.inspection.update({
      where: { id },
      data: {
        responses: input.responses,
        overallStatus: input.overallStatus,
        notes: input.notes,
        signatureUrl: input.signatureUrl,
      },
    });
  },

  // ============================================
  // PUNCH LISTS
  // ============================================

  createPunchList: async (
    _: unknown,
    { input }: { input: CreatePunchListInput },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const canAccess = await canAccessProject(context, input.projectId);
    if (!canAccess) {
      throw new Error('Access denied to this project');
    }

    return context.prisma.punchList.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        description: input.description,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        createdBy: user.id,
        status: 'OPEN',
      },
    });
  },

  createPunchListItem: async (
    _: unknown,
    { punchListId, input }: { punchListId: string; input: CreatePunchListItemInput },
    context: GraphQLContext
  ) => {
    requireAuth(context);

    const punchList = await context.prisma.punchList.findUnique({
      where: { id: punchListId },
    });

    if (!punchList) {
      throw new Error('Punch list not found');
    }

    return context.prisma.punchListItem.create({
      data: {
        punchListId,
        description: input.description,
        location: input.location,
        trade: input.trade,
        priority: input.priority ?? 'MEDIUM',
        assignedTo: input.assignedTo,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        status: 'OPEN',
      },
    });
  },

  updatePunchListItem: async (
    _: unknown,
    { id, input }: { id: string; input: UpdatePunchListItemInput },
    context: GraphQLContext
  ) => {
    requireAuth(context);

    return context.prisma.punchListItem.update({
      where: { id },
      data: {
        description: input.description,
        location: input.location,
        trade: input.trade,
        priority: input.priority,
        assignedTo: input.assignedTo,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        notes: input.notes,
      },
    });
  },

  completePunchListItem: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    return context.prisma.punchListItem.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedBy: user.id,
      },
    });
  },

  verifyPunchListItem: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    const user = requireRole(context, ['ADMIN', 'PROJECT_MANAGER', 'FOREMAN']);

    const item = await context.prisma.punchListItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new Error('Punch list item not found');
    }

    if (item.status !== 'COMPLETED') {
      throw new Error('Item must be completed before verification');
    }

    return context.prisma.punchListItem.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: user.id,
      },
    });
  },

  // ============================================
  // DOCUMENTS
  // ============================================

  uploadDocument: async (
    _: unknown,
    { input }: {
      input: {
        projectId: string;
        name: string;
        category?: string;
        description?: string;
        tags?: string[];
        isAdminOnly?: boolean;
        dailyLogId?: string;
        gpsLatitude?: number;
        gpsLongitude?: number;
      };
    },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const canAccess = await canAccessProject(context, input.projectId);
    if (!canAccess) {
      throw new Error('Access denied to this project');
    }

    // Note: Actual file upload is handled separately via Supabase Storage
    // This creates the database record
    return context.prisma.file.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        type: 'document',
        storagePath: '', // Set by upload handler
        uploadedBy: user.id,
        category: input.category,
        description: input.description,
        tags: input.tags,
        isAdminOnly: input.isAdminOnly ?? false,
        dailyLogId: input.dailyLogId,
        gpsLatitude: input.gpsLatitude,
        gpsLongitude: input.gpsLongitude,
      },
    });
  },

  createAnnotation: async (
    _: unknown,
    { documentId, input }: { documentId: string; input: CreateAnnotationInput },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const doc = await context.prisma.file.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new Error('Document not found');
    }

    return context.prisma.documentAnnotation.create({
      data: {
        fileId: documentId,
        annotationType: input.annotationType,
        content: { text: input.content, color: input.color ?? '#FF0000' },
        pageNumber: input.pageNumber,
        createdBy: user.id,
      },
    });
  },

  resolveAnnotation: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    return context.prisma.documentAnnotation.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolvedBy: user.id,
      },
    });
  },
};
