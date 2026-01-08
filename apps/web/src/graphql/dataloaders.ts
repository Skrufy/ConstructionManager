import DataLoader from 'dataloader';
import { PrismaClient, User, Project, DailyLog, Equipment, File } from '@prisma/client';

/**
 * DataLoaders for efficient batched data fetching
 * These prevent N+1 query problems by batching and caching database requests
 */
export interface DataLoaders {
  // Core entities
  userLoader: DataLoader<string, User | null>;
  projectLoader: DataLoader<string, Project | null>;
  dailyLogLoader: DataLoader<string, DailyLog | null>;
  equipmentLoader: DataLoader<string, Equipment | null>;
  fileLoader: DataLoader<string, File | null>;

  // Relation loaders
  projectsByUserLoader: DataLoader<string, Project[]>;
  dailyLogsByProjectLoader: DataLoader<string, DailyLog[]>;
  equipmentByProjectLoader: DataLoader<string, Equipment[]>;
  filesByProjectLoader: DataLoader<string, File[]>;
  filesByDailyLogLoader: DataLoader<string, File[]>;

  // Count loaders
  dailyLogCountByProjectLoader: DataLoader<string, number>;
  documentCountByProjectLoader: DataLoader<string, number>;
  openIncidentCountByProjectLoader: DataLoader<string, number>;
}

/**
 * Creates all dataloaders with the given Prisma client
 * A new set of loaders should be created for each request
 */
export function createDataLoaders(prisma: PrismaClient): DataLoaders {
  return {
    // User loader - batch fetch users by ID
    userLoader: new DataLoader<string, User | null>(async (ids) => {
      const users = await prisma.user.findMany({
        where: { id: { in: [...ids] } },
      });
      const userMap = new Map(users.map(u => [u.id, u]));
      return ids.map(id => userMap.get(id) || null);
    }),

    // Project loader
    projectLoader: new DataLoader<string, Project | null>(async (ids) => {
      const projects = await prisma.project.findMany({
        where: { id: { in: [...ids] } },
      });
      const projectMap = new Map(projects.map(p => [p.id, p]));
      return ids.map(id => projectMap.get(id) || null);
    }),

    // DailyLog loader
    dailyLogLoader: new DataLoader<string, DailyLog | null>(async (ids) => {
      const logs = await prisma.dailyLog.findMany({
        where: { id: { in: [...ids] } },
      });
      const logMap = new Map(logs.map(l => [l.id, l]));
      return ids.map(id => logMap.get(id) || null);
    }),

    // Equipment loader
    equipmentLoader: new DataLoader<string, Equipment | null>(async (ids) => {
      const equipment = await prisma.equipment.findMany({
        where: { id: { in: [...ids] } },
      });
      const equipmentMap = new Map(equipment.map(e => [e.id, e]));
      return ids.map(id => equipmentMap.get(id) || null);
    }),

    // File loader
    fileLoader: new DataLoader<string, File | null>(async (ids) => {
      const files = await prisma.file.findMany({
        where: { id: { in: [...ids] } },
      });
      const fileMap = new Map(files.map(f => [f.id, f]));
      return ids.map(id => fileMap.get(id) || null);
    }),

    // Projects by user (through assignments)
    projectsByUserLoader: new DataLoader<string, Project[]>(async (userIds) => {
      const assignments = await prisma.projectAssignment.findMany({
        where: { userId: { in: [...userIds] } },
        include: { project: true },
      });

      const projectsByUser = new Map<string, Project[]>();
      for (const userId of userIds) {
        projectsByUser.set(userId, []);
      }
      for (const assignment of assignments) {
        const projects = projectsByUser.get(assignment.userId) || [];
        projects.push(assignment.project);
        projectsByUser.set(assignment.userId, projects);
      }

      return userIds.map(id => projectsByUser.get(id) || []);
    }),

    // Daily logs by project
    dailyLogsByProjectLoader: new DataLoader<string, DailyLog[]>(async (projectIds) => {
      const logs = await prisma.dailyLog.findMany({
        where: { projectId: { in: [...projectIds] } },
        orderBy: { date: 'desc' },
        take: 100, // Limit for performance
      });

      const logsByProject = new Map<string, DailyLog[]>();
      for (const projectId of projectIds) {
        logsByProject.set(projectId, []);
      }
      for (const log of logs) {
        const projectLogs = logsByProject.get(log.projectId) || [];
        projectLogs.push(log);
        logsByProject.set(log.projectId, projectLogs);
      }

      return projectIds.map(id => logsByProject.get(id) || []);
    }),

    // Equipment by project (through assignments)
    equipmentByProjectLoader: new DataLoader<string, Equipment[]>(async (projectIds) => {
      const assignments = await prisma.equipmentAssignment.findMany({
        where: {
          projectId: { in: [...projectIds] },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } },
          ],
        },
        include: { equipment: true },
      });

      const equipmentByProject = new Map<string, Equipment[]>();
      for (const projectId of projectIds) {
        equipmentByProject.set(projectId, []);
      }
      for (const assignment of assignments) {
        const projectEquipment = equipmentByProject.get(assignment.projectId) || [];
        projectEquipment.push(assignment.equipment);
        equipmentByProject.set(assignment.projectId, projectEquipment);
      }

      return projectIds.map(id => equipmentByProject.get(id) || []);
    }),

    // Files by project
    filesByProjectLoader: new DataLoader<string, File[]>(async (projectIds) => {
      const files = await prisma.file.findMany({
        where: {
          projectId: { in: [...projectIds] },
          isLatest: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const filesByProject = new Map<string, File[]>();
      for (const projectId of projectIds) {
        filesByProject.set(projectId, []);
      }
      for (const file of files) {
        if (file.projectId) {
          const projectFiles = filesByProject.get(file.projectId) || [];
          projectFiles.push(file);
          filesByProject.set(file.projectId, projectFiles);
        }
      }

      return projectIds.map(id => filesByProject.get(id) || []);
    }),

    // Files by daily log
    filesByDailyLogLoader: new DataLoader<string, File[]>(async (dailyLogIds) => {
      const files = await prisma.file.findMany({
        where: { dailyLogId: { in: [...dailyLogIds] } },
        orderBy: { createdAt: 'desc' },
      });

      const filesByLog = new Map<string, File[]>();
      for (const logId of dailyLogIds) {
        filesByLog.set(logId, []);
      }
      for (const file of files) {
        if (file.dailyLogId) {
          const logFiles = filesByLog.get(file.dailyLogId) || [];
          logFiles.push(file);
          filesByLog.set(file.dailyLogId, logFiles);
        }
      }

      return dailyLogIds.map(id => filesByLog.get(id) || []);
    }),

    // Count loaders for aggregations
    dailyLogCountByProjectLoader: new DataLoader<string, number>(async (projectIds) => {
      const counts = await prisma.dailyLog.groupBy({
        by: ['projectId'],
        where: { projectId: { in: [...projectIds] } },
        _count: { id: true },
      });

      const countMap = new Map(counts.map(c => [c.projectId, c._count.id]));
      return projectIds.map(id => countMap.get(id) || 0);
    }),

    documentCountByProjectLoader: new DataLoader<string, number>(async (projectIds) => {
      const counts = await prisma.file.groupBy({
        by: ['projectId'],
        where: {
          projectId: { in: [...projectIds] },
          isLatest: true,
        },
        _count: { id: true },
      });

      const countMap = new Map(counts.map(c => [c.projectId, c._count.id]));
      return projectIds.map(id => countMap.get(id) || 0);
    }),

    openIncidentCountByProjectLoader: new DataLoader<string, number>(async (projectIds) => {
      const counts = await prisma.incidentReport.groupBy({
        by: ['projectId'],
        where: {
          projectId: { in: [...projectIds] },
          status: { not: 'CLOSED' },
        },
        _count: { id: true },
      });

      const countMap = new Map(counts.map(c => [c.projectId, c._count.id]));
      return projectIds.map(id => countMap.get(id) || 0);
    }),
  };
}
