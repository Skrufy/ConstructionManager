import { GraphQLContext } from '../../context';
import { formatAddress, calculateTotalHours } from '../helpers';
import {
  User as PrismaUser,
  Project as PrismaProject,
  DailyLog as PrismaDailyLog,
  TimeEntry as PrismaTimeEntry,
  Equipment as PrismaEquipment,
  IncidentReport as PrismaIncident,
  Inspection as PrismaInspection,
  PunchList as PrismaPunchList,
  PunchListItem as PrismaPunchListItem,
  File as PrismaFile,
  DocumentAnnotation as PrismaAnnotation,
} from '@prisma/client';

/**
 * Type resolvers for nested field resolution
 * These handle relationships and computed fields
 */

export const User = {
  projects: async (parent: PrismaUser, _: unknown, context: GraphQLContext) => {
    return context.loaders.projectsByUserLoader.load(parent.id);
  },
};

export const Project = {
  address: (parent: PrismaProject) => {
    return formatAddress(parent);
  },

  client: async (parent: PrismaProject, _: unknown, context: GraphQLContext) => {
    if (!parent.clientId) return null;
    return context.prisma.client.findUnique({
      where: { id: parent.clientId },
    });
  },

  team: async (parent: PrismaProject, _: unknown, context: GraphQLContext) => {
    const assignments = await context.prisma.projectAssignment.findMany({
      where: { projectId: parent.id },
      include: { user: true },
    });
    return assignments.map(a => a.user);
  },

  dailyLogs: async (
    parent: PrismaProject,
    { limit }: { limit?: number },
    context: GraphQLContext
  ) => {
    const logs = await context.loaders.dailyLogsByProjectLoader.load(parent.id);
    return limit ? logs.slice(0, limit) : logs;
  },

  equipment: async (parent: PrismaProject, _: unknown, context: GraphQLContext) => {
    return context.loaders.equipmentByProjectLoader.load(parent.id);
  },

  documents: async (parent: PrismaProject, _: unknown, context: GraphQLContext) => {
    return context.loaders.filesByProjectLoader.load(parent.id);
  },

  dailyLogCount: async (parent: PrismaProject, _: unknown, context: GraphQLContext) => {
    return context.loaders.dailyLogCountByProjectLoader.load(parent.id);
  },

  documentCount: async (parent: PrismaProject, _: unknown, context: GraphQLContext) => {
    return context.loaders.documentCountByProjectLoader.load(parent.id);
  },

  openIncidentCount: async (parent: PrismaProject, _: unknown, context: GraphQLContext) => {
    return context.loaders.openIncidentCountByProjectLoader.load(parent.id);
  },
};

export const DailyLog = {
  project: async (parent: PrismaDailyLog, _: unknown, context: GraphQLContext) => {
    return context.loaders.projectLoader.load(parent.projectId);
  },

  submitter: async (parent: PrismaDailyLog, _: unknown, context: GraphQLContext) => {
    return context.loaders.userLoader.load(parent.submittedBy);
  },

  photos: async (parent: PrismaDailyLog, _: unknown, context: GraphQLContext) => {
    const files = await context.loaders.filesByDailyLogLoader.load(parent.id);
    return files.filter(f => f.type === 'image').map(f => ({
      id: f.id,
      url: f.storagePath,
      caption: f.description,
      gpsLatitude: f.gpsLatitude,
      gpsLongitude: f.gpsLongitude,
      takenAt: f.takenAt,
      createdAt: f.createdAt,
    }));
  },

  entries: async (parent: PrismaDailyLog, _: unknown, context: GraphQLContext) => {
    const entries = await context.prisma.dailyLogEntry.findMany({
      where: { dailyLogId: parent.id },
      include: {
        activityLabel: true,
        statusLabel: true,
      },
    });

    return entries.map(e => ({
      id: e.id,
      activityLabel: e.activityLabel,
      locationLabels: [], // Parsed from e.locationLabels JSON
      statusLabel: e.statusLabel,
      percentComplete: e.percentComplete,
      notes: e.notes,
    }));
  },

  crewMembers: () => [], // Implement based on your crew tracking model

  equipmentUsage: () => [], // Implement based on your equipment usage model

  materials: async (parent: PrismaDailyLog, _: unknown, context: GraphQLContext) => {
    const materials = await context.prisma.dailyLogMaterial.findMany({
      where: { dailyLogId: parent.id },
      include: { materialLabel: true },
    });

    return materials.map(m => ({
      id: m.id,
      name: m.materialLabel.name,
      quantity: m.quantity,
      unit: m.unit,
      notes: m.notes,
    }));
  },

  issues: async (parent: PrismaDailyLog, _: unknown, context: GraphQLContext) => {
    const issues = await context.prisma.dailyLogIssue.findMany({
      where: { dailyLogId: parent.id },
      include: { issueLabel: true },
    });

    return issues.map(i => ({
      id: i.id,
      description: i.description ?? i.issueLabel.name,
      severity: 'MEDIUM', // Default
      resolved: false,
    }));
  },

  photoCount: async (parent: PrismaDailyLog, _: unknown, context: GraphQLContext) => {
    const files = await context.loaders.filesByDailyLogLoader.load(parent.id);
    return files.filter(f => f.type === 'image').length;
  },

  crewCount: (parent: PrismaDailyLog) => parent.crewCount,

  entriesCount: async (parent: PrismaDailyLog, _: unknown, context: GraphQLContext) => {
    return context.prisma.dailyLogEntry.count({
      where: { dailyLogId: parent.id },
    });
  },

  totalLaborHours: (parent: PrismaDailyLog) => parent.totalHours,
};

export const TimeEntry = {
  user: async (parent: PrismaTimeEntry, _: unknown, context: GraphQLContext) => {
    return context.loaders.userLoader.load(parent.userId);
  },

  project: async (parent: PrismaTimeEntry, _: unknown, context: GraphQLContext) => {
    return context.loaders.projectLoader.load(parent.projectId);
  },

  approver: async (parent: PrismaTimeEntry, _: unknown, context: GraphQLContext) => {
    if (!parent.approvedBy) return null;
    return context.loaders.userLoader.load(parent.approvedBy);
  },

  totalHours: (parent: PrismaTimeEntry) => {
    return calculateTotalHours(parent);
  },

  gpsInLatitude: (parent: PrismaTimeEntry) => parent.gpsInLat,
  gpsInLongitude: (parent: PrismaTimeEntry) => parent.gpsInLng,
  gpsOutLatitude: (parent: PrismaTimeEntry) => parent.gpsOutLat,
  gpsOutLongitude: (parent: PrismaTimeEntry) => parent.gpsOutLng,
};

export const Equipment = {
  currentProject: async (parent: PrismaEquipment, _: unknown, context: GraphQLContext) => {
    const assignment = await context.prisma.equipmentAssignment.findFirst({
      where: {
        equipmentId: parent.id,
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      orderBy: { startDate: 'desc' },
    });

    if (!assignment) return null;
    return context.loaders.projectLoader.load(assignment.projectId);
  },

  assignments: async (parent: PrismaEquipment, _: unknown, context: GraphQLContext) => {
    return context.prisma.equipmentAssignment.findMany({
      where: { equipmentId: parent.id },
      include: { project: true },
      orderBy: { startDate: 'desc' },
    });
  },

  usageLogs: async (parent: PrismaEquipment, _: unknown, context: GraphQLContext) => {
    return context.prisma.equipmentLog.findMany({
      where: { equipmentId: parent.id },
      orderBy: { date: 'desc' },
      take: 50,
    });
  },
};

export const Incident = {
  project: async (parent: PrismaIncident, _: unknown, context: GraphQLContext) => {
    return context.loaders.projectLoader.load(parent.projectId);
  },

  reporter: async (parent: PrismaIncident, _: unknown, context: GraphQLContext) => {
    return context.loaders.userLoader.load(parent.reportedBy);
  },

  closer: async (parent: PrismaIncident, _: unknown, context: GraphQLContext) => {
    if (!parent.closedBy) return null;
    return context.loaders.userLoader.load(parent.closedBy);
  },

  photos: (parent: PrismaIncident) => {
    return parent.photos as string[] | null;
  },
};

export const Inspection = {
  project: async (parent: PrismaInspection, _: unknown, context: GraphQLContext) => {
    return context.loaders.projectLoader.load(parent.projectId);
  },

  inspector: async (parent: PrismaInspection, _: unknown, context: GraphQLContext) => {
    return context.loaders.userLoader.load(parent.inspectorId);
  },

  templateName: async (parent: PrismaInspection, _: unknown, context: GraphQLContext) => {
    if (!parent.templateId) return null;
    const template = await context.prisma.inspectionTemplate.findUnique({
      where: { id: parent.templateId },
    });
    return template?.name ?? null;
  },

  responses: (parent: PrismaInspection) => {
    return parent.responses as unknown as Array<{
      itemIndex: number;
      itemText: string;
      status: string;
      notes?: string;
    }> | null;
  },

  photos: async (parent: PrismaInspection, _: unknown, context: GraphQLContext) => {
    return context.prisma.inspectionPhoto.findMany({
      where: { inspectionId: parent.id },
    });
  },
};

export const PunchList = {
  project: async (parent: PrismaPunchList, _: unknown, context: GraphQLContext) => {
    return context.loaders.projectLoader.load(parent.projectId);
  },

  creator: async (parent: PrismaPunchList, _: unknown, context: GraphQLContext) => {
    return context.loaders.userLoader.load(parent.createdBy);
  },

  items: async (parent: PrismaPunchList, _: unknown, context: GraphQLContext) => {
    return context.prisma.punchListItem.findMany({
      where: { punchListId: parent.id },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  },

  totalItems: async (parent: PrismaPunchList, _: unknown, context: GraphQLContext) => {
    return context.prisma.punchListItem.count({
      where: { punchListId: parent.id },
    });
  },

  completedItems: async (parent: PrismaPunchList, _: unknown, context: GraphQLContext) => {
    return context.prisma.punchListItem.count({
      where: {
        punchListId: parent.id,
        status: { in: ['COMPLETED', 'VERIFIED'] },
      },
    });
  },

  openItems: async (parent: PrismaPunchList, _: unknown, context: GraphQLContext) => {
    return context.prisma.punchListItem.count({
      where: {
        punchListId: parent.id,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });
  },
};

export const PunchListItem = {
  assignee: async (parent: PrismaPunchListItem, _: unknown, context: GraphQLContext) => {
    if (!parent.assignedTo) return null;
    return context.loaders.userLoader.load(parent.assignedTo);
  },

  completer: async (parent: PrismaPunchListItem, _: unknown, context: GraphQLContext) => {
    if (!parent.completedBy) return null;
    return context.loaders.userLoader.load(parent.completedBy);
  },

  verifier: async (parent: PrismaPunchListItem, _: unknown, context: GraphQLContext) => {
    if (!parent.verifiedBy) return null;
    return context.loaders.userLoader.load(parent.verifiedBy);
  },

  photos: (parent: PrismaPunchListItem) => {
    return parent.photos as string[] | null;
  },
};

export const Document = {
  project: async (parent: PrismaFile, _: unknown, context: GraphQLContext) => {
    if (!parent.projectId) return null;
    return context.loaders.projectLoader.load(parent.projectId);
  },

  uploader: async (parent: PrismaFile, _: unknown, context: GraphQLContext) => {
    return context.loaders.userLoader.load(parent.uploadedBy);
  },

  revisions: async (parent: PrismaFile, _: unknown, context: GraphQLContext) => {
    return context.prisma.documentRevision.findMany({
      where: { fileId: parent.id },
      orderBy: { version: 'desc' },
    });
  },

  annotations: async (parent: PrismaFile, _: unknown, context: GraphQLContext) => {
    return context.prisma.documentAnnotation.findMany({
      where: { fileId: parent.id },
      orderBy: { createdAt: 'desc' },
    });
  },

  revisionCount: async (parent: PrismaFile, _: unknown, context: GraphQLContext) => {
    return context.prisma.documentRevision.count({
      where: { fileId: parent.id },
    });
  },

  annotationCount: async (parent: PrismaFile, _: unknown, context: GraphQLContext) => {
    return context.prisma.documentAnnotation.count({
      where: { fileId: parent.id },
    });
  },

  tags: (parent: PrismaFile) => {
    return parent.tags as string[] | null;
  },

  // Map metadata fields from DocumentMetadata if exists
  drawingNumber: async (parent: PrismaFile, _: unknown, context: GraphQLContext) => {
    const metadata = await context.prisma.documentMetadata.findUnique({
      where: { fileId: parent.id },
    });
    return metadata?.drawingNumber ?? null;
  },

  sheetTitle: async (parent: PrismaFile, _: unknown, context: GraphQLContext) => {
    const metadata = await context.prisma.documentMetadata.findUnique({
      where: { fileId: parent.id },
    });
    return metadata?.sheetTitle ?? null;
  },

  discipline: async (parent: PrismaFile, _: unknown, context: GraphQLContext) => {
    const metadata = await context.prisma.documentMetadata.findUnique({
      where: { fileId: parent.id },
    });
    return metadata?.discipline ?? null;
  },

  revision: async (parent: PrismaFile, _: unknown, context: GraphQLContext) => {
    const metadata = await context.prisma.documentMetadata.findUnique({
      where: { fileId: parent.id },
    });
    return metadata?.revision ?? null;
  },

  scale: async (parent: PrismaFile, _: unknown, context: GraphQLContext) => {
    const metadata = await context.prisma.documentMetadata.findUnique({
      where: { fileId: parent.id },
    });
    return metadata?.scale ?? null;
  },
};

export const Annotation = {
  createdBy: async (parent: PrismaAnnotation, _: unknown, context: GraphQLContext) => {
    return context.loaders.userLoader.load(parent.createdBy);
  },

  resolvedBy: async (parent: PrismaAnnotation, _: unknown, context: GraphQLContext) => {
    if (!parent.resolvedBy) return null;
    return context.loaders.userLoader.load(parent.resolvedBy);
  },

  content: (parent: PrismaAnnotation) => {
    const content = parent.content as { text?: string } | null;
    return content?.text ?? '';
  },

  color: (parent: PrismaAnnotation) => {
    const content = parent.content as { color?: string } | null;
    return content?.color ?? '#FF0000';
  },
};

// Connection types don't need special resolvers as they're built in paginateResults
