import { GraphQLContext, requireAuth, canAccessProject } from '../../context';
import {
  paginateResults,
  buildWhereClause,
  encodeCursor,
  PaginationArgs,
} from '../helpers';

export const Query = {
  // ============================================
  // USER & AUTH
  // ============================================

  me: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const user = requireAuth(context);
    return context.prisma.user.findUnique({
      where: { id: user.id },
    });
  },

  myPermissions: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const user = requireAuth(context);

    // Get company permissions
    const companyPermission = await context.prisma.userCompanyPermission.findUnique({
      where: { userId: user.id },
      include: { companyTemplate: true },
    });

    // Get project assignments with permissions
    const projectAssignments = await context.prisma.projectAssignment.findMany({
      where: { userId: user.id },
      include: { projectTemplate: true },
    });

    return {
      userId: user.id,
      role: user.role,
      companyPermissions: companyPermission?.companyTemplate
        ? Object.entries(companyPermission.companyTemplate.toolPermissions as Record<string, string>)
            .map(([tool, level]) => ({ tool, level }))
        : [],
      projectPermissions: projectAssignments.map(pa => ({
        projectId: pa.projectId,
        permissions: pa.projectTemplate
          ? Object.entries(pa.projectTemplate.toolPermissions as Record<string, string>)
              .map(([tool, level]) => ({ tool, level }))
          : [],
      })),
    };
  },

  // ============================================
  // PROJECTS
  // ============================================

  projects: async (
    _: unknown,
    args: PaginationArgs & { status?: string; search?: string },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const where = buildWhereClause({
      status: args.status,
      search: args.search ? {
        OR: [
          { name: { contains: args.search, mode: 'insensitive' } },
          { address: { contains: args.search, mode: 'insensitive' } },
          { addressCity: { contains: args.search, mode: 'insensitive' } },
        ],
      } : undefined,
    });

    // Non-admins only see assigned projects
    if (user.role !== 'ADMIN') {
      const assignments = await context.prisma.projectAssignment.findMany({
        where: { userId: user.id },
        select: { projectId: true },
      });
      where.id = { in: assignments.map(a => a.projectId) };
    }

    return paginateResults({
      model: context.prisma.project,
      where,
      args,
      orderBy: { name: 'asc' },
    });
  },

  project: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);

    const canAccess = await canAccessProject(context, id);
    if (!canAccess) {
      throw new Error('Access denied to this project');
    }

    return context.prisma.project.findUnique({
      where: { id },
    });
  },

  // ============================================
  // DAILY LOGS
  // ============================================

  dailyLogs: async (
    _: unknown,
    args: PaginationArgs & {
      projectId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    // Verify project access if projectId provided
    if (args.projectId) {
      const canAccess = await canAccessProject(context, args.projectId);
      if (!canAccess) {
        throw new Error('Access denied to this project');
      }
    }

    const where: Record<string, unknown> = {};

    if (args.projectId) where.projectId = args.projectId;
    if (args.status) where.status = args.status;
    if (args.startDate || args.endDate) {
      where.date = {};
      if (args.startDate) (where.date as Record<string, unknown>).gte = new Date(args.startDate);
      if (args.endDate) (where.date as Record<string, unknown>).lte = new Date(args.endDate);
    }

    // Non-admins only see their logs or logs from assigned projects
    if (user.role !== 'ADMIN' && !args.projectId) {
      const assignments = await context.prisma.projectAssignment.findMany({
        where: { userId: user.id },
        select: { projectId: true },
      });
      where.projectId = { in: assignments.map(a => a.projectId) };
    }

    return paginateResults({
      model: context.prisma.dailyLog,
      where,
      args,
      orderBy: { date: 'desc' },
    });
  },

  dailyLog: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);

    const log = await context.prisma.dailyLog.findUnique({
      where: { id },
    });

    if (log) {
      const canAccess = await canAccessProject(context, log.projectId);
      if (!canAccess) {
        throw new Error('Access denied to this daily log');
      }
    }

    return log;
  },

  // ============================================
  // TIME TRACKING
  // ============================================

  timeEntries: async (
    _: unknown,
    args: PaginationArgs & {
      projectId?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const where: Record<string, unknown> = {};

    if (args.projectId) where.projectId = args.projectId;
    if (args.status) where.status = args.status;

    // Non-admins can only see their own time entries (unless they're a PM)
    if (user.role !== 'ADMIN' && user.role !== 'PROJECT_MANAGER') {
      where.userId = user.id;
    } else if (args.userId) {
      where.userId = args.userId;
    }

    if (args.startDate || args.endDate) {
      where.clockIn = {};
      if (args.startDate) (where.clockIn as Record<string, unknown>).gte = new Date(args.startDate);
      if (args.endDate) (where.clockIn as Record<string, unknown>).lte = new Date(args.endDate);
    }

    return paginateResults({
      model: context.prisma.timeEntry,
      where,
      args,
      orderBy: { clockIn: 'desc' },
    });
  },

  activeTimeEntry: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const user = requireAuth(context);

    return context.prisma.timeEntry.findFirst({
      where: {
        userId: user.id,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
    });
  },

  // ============================================
  // EQUIPMENT
  // ============================================

  equipment: async (
    _: unknown,
    args: PaginationArgs & {
      projectId?: string;
      status?: string;
      search?: string;
    },
    context: GraphQLContext
  ) => {
    requireAuth(context);

    const where: Record<string, unknown> = {};

    if (args.status) where.status = args.status;
    if (args.search) {
      where.OR = [
        { name: { contains: args.search, mode: 'insensitive' } },
        { type: { contains: args.search, mode: 'insensitive' } },
      ];
    }

    // If projectId, filter to equipment assigned to that project
    if (args.projectId) {
      const assignments = await context.prisma.equipmentAssignment.findMany({
        where: {
          projectId: args.projectId,
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
        select: { equipmentId: true },
      });
      where.id = { in: assignments.map(a => a.equipmentId) };
    }

    return paginateResults({
      model: context.prisma.equipment,
      where,
      args,
      orderBy: { name: 'asc' },
    });
  },

  equipmentItem: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);
    return context.prisma.equipment.findUnique({ where: { id } });
  },

  // ============================================
  // SAFETY - INCIDENTS
  // ============================================

  incidents: async (
    _: unknown,
    args: PaginationArgs & {
      projectId?: string;
      severity?: string;
      status?: string;
    },
    context: GraphQLContext
  ) => {
    requireAuth(context);

    const where: Record<string, unknown> = {};

    if (args.projectId) where.projectId = args.projectId;
    if (args.severity) where.severity = args.severity;
    if (args.status) where.status = args.status;

    return paginateResults({
      model: context.prisma.incidentReport,
      where,
      args,
      orderBy: { incidentDate: 'desc' },
    });
  },

  incident: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);
    return context.prisma.incidentReport.findUnique({ where: { id } });
  },

  // ============================================
  // SAFETY - INSPECTIONS
  // ============================================

  inspections: async (
    _: unknown,
    args: PaginationArgs & {
      projectId?: string;
      status?: string;
    },
    context: GraphQLContext
  ) => {
    requireAuth(context);

    const where: Record<string, unknown> = {};

    if (args.projectId) where.projectId = args.projectId;
    if (args.status) where.overallStatus = args.status;

    return paginateResults({
      model: context.prisma.inspection,
      where,
      args,
      orderBy: { date: 'desc' },
    });
  },

  inspection: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);
    return context.prisma.inspection.findUnique({ where: { id } });
  },

  // ============================================
  // SAFETY - PUNCH LISTS
  // ============================================

  punchLists: async (
    _: unknown,
    args: PaginationArgs & {
      projectId?: string;
      status?: string;
    },
    context: GraphQLContext
  ) => {
    requireAuth(context);

    const where: Record<string, unknown> = {};

    if (args.projectId) where.projectId = args.projectId;
    if (args.status) where.status = args.status;

    return paginateResults({
      model: context.prisma.punchList,
      where,
      args,
      orderBy: { createdAt: 'desc' },
    });
  },

  punchList: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);
    return context.prisma.punchList.findUnique({
      where: { id },
      include: { items: true },
    });
  },

  // ============================================
  // DOCUMENTS
  // ============================================

  documents: async (
    _: unknown,
    args: PaginationArgs & {
      projectId?: string;
      category?: string;
      search?: string;
    },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const where: Record<string, unknown> = {
      isLatest: true,
    };

    if (args.projectId) where.projectId = args.projectId;
    if (args.category) where.category = args.category;
    if (args.search) {
      where.OR = [
        { name: { contains: args.search, mode: 'insensitive' } },
        { description: { contains: args.search, mode: 'insensitive' } },
      ];
    }

    // Hide admin-only docs from non-admins
    if (user.role !== 'ADMIN') {
      where.isAdminOnly = false;
    }

    return paginateResults({
      model: context.prisma.file,
      where,
      args,
      orderBy: { createdAt: 'desc' },
    });
  },

  document: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    const user = requireAuth(context);

    const doc = await context.prisma.file.findUnique({
      where: { id },
    });

    // Check admin-only access
    if (doc?.isAdminOnly && user.role !== 'ADMIN') {
      throw new Error('Access denied to this document');
    }

    return doc;
  },
};
