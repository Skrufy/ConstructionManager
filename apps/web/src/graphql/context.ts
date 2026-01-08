import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-helpers';
import { createDataLoaders, DataLoaders } from './dataloaders';

// Singleton Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export interface GraphQLContext {
  prisma: PrismaClient;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
  loaders: DataLoaders;
}

/**
 * Creates the GraphQL context for each request
 * This is called on every request to provide auth and data loaders
 */
export async function createContext(): Promise<GraphQLContext> {
  // Get the authenticated user from Supabase session
  const authUser = await getCurrentUser();

  const user = authUser ? {
    id: authUser.id,
    email: authUser.email,
    name: authUser.name,
    role: authUser.role,
  } : null;

  // Create fresh dataloaders for each request to prevent caching issues
  const loaders = createDataLoaders(prisma);

  return {
    prisma,
    user,
    loaders,
  };
}

/**
 * Helper to require authentication in resolvers
 */
export function requireAuth(context: GraphQLContext) {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  return context.user;
}

/**
 * Helper to require specific roles
 */
export function requireRole(context: GraphQLContext, allowedRoles: string[]) {
  const user = requireAuth(context);
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
  }
  return user;
}

/**
 * Helper to check if user is admin
 */
export function isAdmin(context: GraphQLContext): boolean {
  return context.user?.role === 'ADMIN';
}

/**
 * Helper to check if user can access a project
 */
export async function canAccessProject(
  context: GraphQLContext,
  projectId: string
): Promise<boolean> {
  const user = context.user;
  if (!user) return false;

  // Admins can access all projects
  if (user.role === 'ADMIN') return true;

  // Check if user is assigned to this project
  const assignment = await context.prisma.projectAssignment.findUnique({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId: projectId,
      },
    },
  });

  return assignment !== null;
}
