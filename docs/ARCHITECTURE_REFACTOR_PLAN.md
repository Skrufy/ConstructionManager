# ConstructionPro Architecture Refactor Plan

## Executive Summary

This document provides step-by-step instructions for refactoring ConstructionPro from a REST-based monolithic architecture to a GraphQL-powered, modular feature architecture inspired by Procore. The goal is to eliminate the API contract inconsistencies, improve offline-first capabilities, and create clear module boundaries for scalability.

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Target Architecture](#target-architecture)
3. [Phase 0: Critical Fixes (Pre-Migration)](#phase-0-critical-fixes)
4. [Phase 1: API Contract Layer](#phase-1-api-contract-layer)
5. [Phase 2: GraphQL Implementation](#phase-2-graphql-implementation)
6. [Phase 3: Android Modular Architecture](#phase-3-android-modular-architecture)
7. [Phase 4: iOS Modular Architecture + Offline](#phase-4-ios-modular-architecture--offline)
8. [Phase 5: Validation & Cleanup](#phase-5-validation--cleanup)
9. [Phase 6: Android UI Redesign](#phase-6-android-ui-redesign)
10. [Agent Usage Guide](#agent-usage-guide)
11. [File Structure Reference](#file-structure-reference)

---

## Current State Assessment

### Problems Identified

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| No API contract between server and mobile | CRITICAL | Cross-platform | Field mismatches, silent failures |
| `fallbackToDestructiveMigration()` | CRITICAL | Android AppDatabase.kt:55 | User data loss on updates |
| iOS has no offline support | HIGH | iOS app | Unusable on construction sites |
| Address stored as single string | HIGH | Prisma schema | iOS parses with ", " heuristic |
| 966-line monolithic ApiService.kt | HIGH | Android | Untestable, tightly coupled |
| 900-line MainActivity.kt | MEDIUM | Android | Navigation nightmare |
| Permission system split-brain | MEDIUM | Web + Mobile | Mobile can't enforce tool-level access |
| In-memory rate limiting | MEDIUM | Web middleware | Resets on cold start |
| `ignoreUnknownKeys = true` everywhere | LOW | Android serialization | Masks API changes |

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Current State                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐    REST (inconsistent)    ┌──────────────────┐   │
│   │ Android │ ◄────────────────────────► │                  │   │
│   │ 966-line│                            │   Next.js API    │   │
│   │ApiService│                           │   123 routes     │   │
│   └─────────┘                            │   (no schema)    │   │
│                                          │                  │   │
│   ┌─────────┐    REST (inconsistent)    │                  │   │
│   │   iOS   │ ◄────────────────────────► │                  │   │
│   │ No      │                            └──────────────────┘   │
│   │ offline │                                    │              │
│   └─────────┘                                    ▼              │
│                                          ┌──────────────────┐   │
│                                          │    PostgreSQL    │   │
│                                          │    (Supabase)    │   │
│                                          └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Target State                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐                                           │
│   │     Android     │                                           │
│   │  ┌───────────┐  │     GraphQL        ┌──────────────────┐  │
│   │  │ features/ │  │ ◄─────────────────► │                  │  │
│   │  │ daily-logs│  │   (typed client)   │  GraphQL Server  │  │
│   │  │ equipment │  │                    │  (Apollo Server) │  │
│   │  │ safety    │  │                    │                  │  │
│   │  │ ...       │  │                    │  ┌────────────┐  │  │
│   │  └───────────┘  │                    │  │  schema/   │  │  │
│   │  Apollo Client  │                    │  │ (source of │  │  │
│   │  + Room Cache   │                    │  │   truth)   │  │  │
│   └─────────────────┘                    │  └────────────┘  │  │
│                                          │        │         │  │
│   ┌─────────────────┐                    │        ▼         │  │
│   │       iOS       │                    │  ┌────────────┐  │  │
│   │  ┌───────────┐  │     GraphQL        │  │  Resolvers │  │  │
│   │  │ features/ │  │ ◄─────────────────► │  │  (Prisma)  │  │  │
│   │  │ daily-logs│  │   (typed client)   │  └────────────┘  │  │
│   │  │ equipment │  │                    │        │         │  │
│   │  │ safety    │  │                    └────────┼─────────┘  │
│   │  │ ...       │  │                            │             │
│   │  └───────────┘  │                            ▼             │
│   │  Apollo iOS     │                    ┌──────────────────┐  │
│   │  + CoreData     │                    │    PostgreSQL    │  │
│   └─────────────────┘                    │    (Supabase)    │  │
│                                          └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Critical Fixes (Pre-Migration)

**Duration**: 1-2 days
**Priority**: MUST complete before any other work

These fixes prevent data loss and crashes regardless of architecture changes.

### Task 0.1: Fix Android Database Migrations

**File**: `apps/android/construction-android/app/src/main/java/com/constructionpro/app/data/local/AppDatabase.kt`

**Current Problem** (line ~55):
```kotlin
.fallbackToDestructiveMigration() // DELETES ALL USER DATA
```

**Instructions**:
1. Remove `fallbackToDestructiveMigration()`
2. Create migration files for each version increment
3. Add migration validation tests

**Implementation**:
```kotlin
// Create: data/local/migrations/Migrations.kt
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(database: SupportSQLiteDatabase) {
        // Example: Add sync_status column
        database.execSQL(
            "ALTER TABLE daily_logs ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'SYNCED'"
        )
    }
}

// Update AppDatabase.kt
Room.databaseBuilder(context, AppDatabase::class.java, "constructionpro.db")
    .addMigrations(MIGRATION_1_2, MIGRATION_2_3, /* ... */)
    // NO fallbackToDestructiveMigration()
    .build()
```

**Validation**:
- Run `android-offline-sync-validator` agent after changes
- Test: Install old APK, add data, install new APK, verify data persists

### Task 0.2: Fix Address Schema

**File**: `apps/web/prisma/schema.prisma`

**Current Problem**: Address is a single string, iOS/Android parse with ", " heuristic

**Instructions**:
1. Add structured address fields to Project model
2. Create migration to populate from existing address string
3. Update all API routes to return structured address

**Implementation**:
```prisma
model Project {
  // Existing
  address     String?

  // Add these
  addressStreet  String?
  addressCity    String?
  addressState   String?
  addressZipCode String?
  addressCountry String?  @default("USA")

  // Keep gps fields as-is
  gpsLatitude  Float?
  gpsLongitude Float?
}
```

**Migration Script** (create `apps/web/prisma/migrations/YYYYMMDD_structured_address/migration.sql`):
```sql
ALTER TABLE "Project" ADD COLUMN "addressStreet" TEXT;
ALTER TABLE "Project" ADD COLUMN "addressCity" TEXT;
ALTER TABLE "Project" ADD COLUMN "addressState" TEXT;
ALTER TABLE "Project" ADD COLUMN "addressZipCode" TEXT;
ALTER TABLE "Project" ADD COLUMN "addressCountry" TEXT DEFAULT 'USA';

-- Parse existing addresses (best effort)
UPDATE "Project"
SET
  "addressStreet" = SPLIT_PART(address, ', ', 1),
  "addressCity" = SPLIT_PART(address, ', ', 2),
  "addressState" = SPLIT_PART(SPLIT_PART(address, ', ', 3), ' ', 1),
  "addressZipCode" = SPLIT_PART(SPLIT_PART(address, ', ', 3), ' ', 2)
WHERE address IS NOT NULL AND address != '';
```

**Validation**:
- Run `/prisma-sync` skill after schema changes
- Run `prisma-postgres-checker` agent
- Verify API responses include new fields

### Task 0.3: Standardize API Error Responses

**Location**: All files in `apps/web/src/app/api/`

**Current Problem**: Inconsistent error formats

**Instructions**:
1. Create standard error response utility
2. Update all API routes to use it
3. Document error codes

**Implementation**:
```typescript
// Create: apps/web/src/lib/api-errors.ts
export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  status: number;
}

export const ApiErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export function apiError(
  message: string,
  code: keyof typeof ApiErrorCodes,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    { error: message, code, details },
    { status }
  );
}

// Usage in routes:
// return apiError('Daily log not found', 'NOT_FOUND', 404);
```

**Validation**:
- Run `error-handler` agent on all modified routes
- Run `api-response-transformer` agent

---

## Phase 1: API Contract Layer

**Duration**: 3-5 days
**Goal**: Create single source of truth for API types

### Task 1.1: Create Shared Schema Package

**Location**: Create `packages/api-schema/`

**Instructions**:
1. Create new package directory structure
2. Define all types in TypeScript (will be source for GraphQL schema later)
3. Set up build process for generating types

**Structure**:
```
packages/
└── api-schema/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts
    │   ├── types/
    │   │   ├── project.ts
    │   │   ├── daily-log.ts
    │   │   ├── equipment.ts
    │   │   ├── safety.ts
    │   │   ├── user.ts
    │   │   ├── time-entry.ts
    │   │   ├── document.ts
    │   │   ├── financials.ts
    │   │   └── index.ts
    │   ├── enums/
    │   │   ├── status.ts
    │   │   ├── roles.ts
    │   │   └── index.ts
    │   └── validators/
    │       ├── project.ts
    │       └── daily-log.ts
    └── generated/
        ├── typescript/    # For web
        ├── kotlin/        # For Android (manual sync initially)
        └── swift/         # For iOS (manual sync initially)
```

**Example Type Definition**:
```typescript
// packages/api-schema/src/types/daily-log.ts
import { z } from 'zod';

export const DailyLogStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED'
]);
export type DailyLogStatus = z.infer<typeof DailyLogStatusEnum>;

export const DailyLogSchema = z.object({
  id: z.string().uuid(),
  date: z.string().date(),
  status: DailyLogStatusEnum,
  notes: z.string().nullable(),
  weatherDelay: z.boolean(),
  weatherDelayNotes: z.string().nullable(),
  gpsLatitude: z.number().nullable(),
  gpsLongitude: z.number().nullable(),

  // Relations (always included in responses)
  project: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  submitter: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
  }),

  // Counts
  photoCount: z.number().int(),
  crewCount: z.number().int(),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type DailyLog = z.infer<typeof DailyLogSchema>;

// Input types for mutations
export const CreateDailyLogInputSchema = z.object({
  projectId: z.string().uuid(),
  date: z.string().date(),
  notes: z.string().optional(),
  weatherDelay: z.boolean().default(false),
  weatherDelayNotes: z.string().optional(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
});

export type CreateDailyLogInput = z.infer<typeof CreateDailyLogInputSchema>;
```

### Task 1.2: Update Web API to Use Shared Types

**Instructions**:
1. Import types from `@constructionpro/api-schema`
2. Validate all responses against schemas
3. Remove ad-hoc transformation functions

**Example Update**:
```typescript
// apps/web/src/app/api/daily-logs/route.ts
import { DailyLogSchema, DailyLog } from '@constructionpro/api-schema';

// Transform Prisma result to API response
function toDailyLogResponse(prismaLog: PrismaDailyLog): DailyLog {
  const response = {
    id: prismaLog.id,
    date: prismaLog.date.toISOString().split('T')[0],
    status: prismaLog.status,
    notes: prismaLog.notes,
    weatherDelay: prismaLog.weatherDelay,
    weatherDelayNotes: prismaLog.weatherDelayNotes,
    gpsLatitude: prismaLog.gpsLatitude,
    gpsLongitude: prismaLog.gpsLongitude,
    project: {
      id: prismaLog.project.id,
      name: prismaLog.project.name,
    },
    submitter: {
      id: prismaLog.submittedBy.id,
      name: prismaLog.submittedBy.name,
      email: prismaLog.submittedBy.email,
    },
    photoCount: prismaLog._count.photos,
    crewCount: prismaLog._count.crewEntries,
    createdAt: prismaLog.createdAt.toISOString(),
    updatedAt: prismaLog.updatedAt.toISOString(),
  };

  // Validate response matches schema (dev mode only)
  if (process.env.NODE_ENV === 'development') {
    DailyLogSchema.parse(response);
  }

  return response;
}
```

**Validation**:
- Run `api-response-transformer` agent
- Run `cross-platform-parity` agent
- Run `/api-endpoint-audit` skill

---

## Phase 2: GraphQL Implementation

**Duration**: 1-2 weeks
**Goal**: Replace REST with GraphQL, generate typed clients

### Task 2.1: Set Up GraphQL Server

**Location**: `apps/web/src/app/api/graphql/`

**Instructions**:
1. Install Apollo Server dependencies
2. Create GraphQL schema from TypeScript types
3. Implement resolvers using existing Prisma logic
4. Set up authentication context

**Dependencies to Add** (`apps/web/package.json`):
```json
{
  "dependencies": {
    "@apollo/server": "^4.10.0",
    "@as-integrations/next": "^3.0.0",
    "graphql": "^16.8.0",
    "graphql-scalars": "^1.23.0"
  },
  "devDependencies": {
    "@graphql-codegen/cli": "^5.0.0",
    "@graphql-codegen/typescript": "^4.0.0",
    "@graphql-codegen/typescript-resolvers": "^4.0.0"
  }
}
```

**Schema** (`apps/web/src/graphql/schema.graphql`):
```graphql
scalar DateTime
scalar Date

type Query {
  # Projects
  projects(
    status: ProjectStatus
    search: String
    page: Int
    pageSize: Int
  ): ProjectConnection!
  project(id: ID!): Project

  # Daily Logs
  dailyLogs(
    projectId: ID
    status: DailyLogStatus
    search: String
    page: Int
    pageSize: Int
  ): DailyLogConnection!
  dailyLog(id: ID!): DailyLog

  # Equipment
  equipment(
    projectId: ID
    status: EquipmentStatus
    search: String
  ): EquipmentConnection!
  equipmentItem(id: ID!): Equipment

  # Safety
  incidents(projectId: ID, severity: Severity): IncidentConnection!
  incident(id: ID!): Incident
  inspections(projectId: ID, status: InspectionStatus): InspectionConnection!
  inspection(id: ID!): Inspection

  # Time Tracking
  timeEntries(
    projectId: ID
    userId: ID
    startDate: Date
    endDate: Date
  ): TimeEntryConnection!
  activeTimeEntry: TimeEntry

  # User
  me: User!
  myPermissions: UserPermissions!
}

type Mutation {
  # Daily Logs
  createDailyLog(input: CreateDailyLogInput!): DailyLog!
  updateDailyLog(id: ID!, input: UpdateDailyLogInput!): DailyLog!
  submitDailyLog(id: ID!): DailyLog!
  approveDailyLog(id: ID!): DailyLog!
  rejectDailyLog(id: ID!, reason: String!): DailyLog!

  # Time Tracking
  clockIn(input: ClockInInput!): TimeEntry!
  clockOut(id: ID!, input: ClockOutInput!): TimeEntry!

  # Equipment
  createEquipment(input: CreateEquipmentInput!): Equipment!
  updateEquipment(id: ID!, input: UpdateEquipmentInput!): Equipment!
  logEquipmentUsage(id: ID!, input: EquipmentUsageInput!): EquipmentLog!

  # Safety
  createIncident(input: CreateIncidentInput!): Incident!
  updateIncident(id: ID!, input: UpdateIncidentInput!): Incident!
  createInspection(input: CreateInspectionInput!): Inspection!
  completeInspection(id: ID!, input: CompleteInspectionInput!): Inspection!
}

# Types
type Project {
  id: ID!
  name: String!
  status: ProjectStatus!
  description: String
  startDate: Date
  endDate: Date
  budget: Float

  # Structured address
  address: Address!

  # Relations
  client: Client
  team: [User!]!
  dailyLogs(limit: Int): [DailyLog!]!
  equipment: [Equipment!]!
  documents: [Document!]!

  # Counts
  dailyLogCount: Int!
  documentCount: Int!
  openIncidentCount: Int!

  createdAt: DateTime!
  updatedAt: DateTime!
}

type Address {
  street: String
  city: String
  state: String
  zipCode: String
  country: String
  latitude: Float
  longitude: Float
  formatted: String!  # "123 Main St, City, ST 12345"
}

type DailyLog {
  id: ID!
  date: Date!
  status: DailyLogStatus!
  notes: String
  weatherDelay: Boolean!
  weatherDelayNotes: String
  gpsLatitude: Float
  gpsLongitude: Float

  # Relations
  project: Project!
  submitter: User!
  approver: User
  photos: [Photo!]!
  crewMembers: [CrewEntry!]!
  equipmentUsage: [EquipmentUsage!]!

  # Computed
  photoCount: Int!
  crewCount: Int!
  totalLaborHours: Float!

  createdAt: DateTime!
  updatedAt: DateTime!
  submittedAt: DateTime
  approvedAt: DateTime
}

type User {
  id: ID!
  email: String!
  name: String!
  role: UserRole!
  phone: String
  avatarUrl: String

  # Relations (limited for privacy)
  projects: [Project!]!

  createdAt: DateTime!
}

# Enums
enum ProjectStatus {
  PLANNING
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum DailyLogStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
}

enum EquipmentStatus {
  AVAILABLE
  IN_USE
  MAINTENANCE
  OUT_OF_SERVICE
}

enum Severity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum InspectionStatus {
  SCHEDULED
  IN_PROGRESS
  PASSED
  FAILED
  REQUIRES_FOLLOWUP
}

enum UserRole {
  WORKER
  FOREMAN
  SUPERINTENDENT
  PROJECT_MANAGER
  SAFETY_MANAGER
  ADMIN
  OWNER
}

# Connections (for pagination)
type ProjectConnection {
  edges: [ProjectEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ProjectEdge {
  node: Project!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Inputs
input CreateDailyLogInput {
  projectId: ID!
  date: Date!
  notes: String
  weatherDelay: Boolean
  weatherDelayNotes: String
  gpsLatitude: Float
  gpsLongitude: Float
}

input UpdateDailyLogInput {
  notes: String
  weatherDelay: Boolean
  weatherDelayNotes: String
}

input ClockInInput {
  projectId: ID!
  gpsLatitude: Float
  gpsLongitude: Float
  notes: String
}

input ClockOutInput {
  gpsLatitude: Float
  gpsLongitude: Float
  notes: String
}

# ... continue for all other inputs
```

### Task 2.2: Implement Resolvers

**Location**: `apps/web/src/graphql/resolvers/`

**Instructions**:
1. Create resolver files organized by domain
2. Reuse existing Prisma query logic
3. Implement DataLoader for N+1 prevention
4. Add authentication checks

**Structure**:
```
apps/web/src/graphql/
├── schema.graphql
├── resolvers/
│   ├── index.ts
│   ├── query/
│   │   ├── projects.ts
│   │   ├── daily-logs.ts
│   │   ├── equipment.ts
│   │   └── safety.ts
│   ├── mutation/
│   │   ├── daily-logs.ts
│   │   ├── time-tracking.ts
│   │   └── equipment.ts
│   └── types/
│       ├── Project.ts
│       ├── DailyLog.ts
│       └── User.ts
├── context.ts
├── dataloaders.ts
└── server.ts
```

**Example Resolver**:
```typescript
// apps/web/src/graphql/resolvers/query/daily-logs.ts
import { prisma } from '@/lib/prisma';
import { GraphQLContext } from '../context';
import { requireAuth, requirePermission } from '../auth';

export const dailyLogQueries = {
  dailyLogs: async (
    _: unknown,
    args: { projectId?: string; status?: string; page?: number; pageSize?: number },
    context: GraphQLContext
  ) => {
    const user = await requireAuth(context);
    await requirePermission(context, 'daily_logs', 'read');

    const page = args.page ?? 1;
    const pageSize = Math.min(args.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where = {
      ...(args.projectId && { projectId: args.projectId }),
      ...(args.status && { status: args.status }),
      // Role-based filtering
      ...(user.role === 'WORKER' && { submittedById: user.id }),
    };

    const [logs, totalCount] = await Promise.all([
      prisma.dailyLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { date: 'desc' },
        include: {
          project: { select: { id: true, name: true } },
          submittedBy: { select: { id: true, name: true, email: true } },
          _count: { select: { photos: true, crewEntries: true } },
        },
      }),
      prisma.dailyLog.count({ where }),
    ]);

    return {
      edges: logs.map((log, index) => ({
        node: log,
        cursor: Buffer.from(`${skip + index}`).toString('base64'),
      })),
      pageInfo: {
        hasNextPage: skip + logs.length < totalCount,
        hasPreviousPage: page > 1,
        startCursor: logs.length > 0 ? Buffer.from(`${skip}`).toString('base64') : null,
        endCursor: logs.length > 0 ? Buffer.from(`${skip + logs.length - 1}`).toString('base64') : null,
      },
      totalCount,
    };
  },

  dailyLog: async (
    _: unknown,
    args: { id: string },
    context: GraphQLContext
  ) => {
    await requireAuth(context);
    await requirePermission(context, 'daily_logs', 'read');

    return prisma.dailyLog.findUnique({
      where: { id: args.id },
    });
  },
};

// Type resolver for nested fields
export const DailyLogResolver = {
  project: (parent: { projectId: string }, _: unknown, context: GraphQLContext) => {
    return context.loaders.project.load(parent.projectId);
  },
  submitter: (parent: { submittedById: string }, _: unknown, context: GraphQLContext) => {
    return context.loaders.user.load(parent.submittedById);
  },
  photos: (parent: { id: string }) => {
    return prisma.photo.findMany({ where: { dailyLogId: parent.id } });
  },
  photoCount: (parent: { _count?: { photos: number } }) => {
    return parent._count?.photos ?? 0;
  },
  crewCount: (parent: { _count?: { crewEntries: number } }) => {
    return parent._count?.crewEntries ?? 0;
  },
};
```

### Task 2.3: Set Up Code Generation

**Instructions**:
1. Configure GraphQL Codegen for all platforms
2. Generate TypeScript types for web
3. Generate Kotlin types for Android
4. Generate Swift types for iOS

**Codegen Config** (`apps/web/codegen.ts`):
```typescript
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/graphql/schema.graphql',
  generates: {
    // TypeScript types for web
    './src/graphql/generated/types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../context#GraphQLContext',
        mappers: {
          Project: '@prisma/client#Project as PrismaProject',
          DailyLog: '@prisma/client#DailyLog as PrismaDailyLog',
          User: '@prisma/client#User as PrismaUser',
        },
      },
    },
  },
};

export default config;
```

### Task 2.4: Create API Route Handler

**File**: `apps/web/src/app/api/graphql/route.ts`

```typescript
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolvers } from '@/graphql/resolvers';
import { createContext } from '@/graphql/context';

const typeDefs = readFileSync(
  join(process.cwd(), 'src/graphql/schema.graphql'),
  'utf-8'
);

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const handler = startServerAndCreateNextHandler<NextRequest>(server, {
  context: async (req) => createContext(req),
});

export { handler as GET, handler as POST };

export const dynamic = 'force-dynamic';
```

**Validation**:
- Run `next-app-router-validator` agent
- Test queries in Apollo Studio/Playground
- Run `security-auditor` agent on auth flow

---

## Phase 3: Android Modular Architecture

**Duration**: 2-3 weeks
**Goal**: Restructure Android app into feature modules with Apollo Client

### Task 3.1: Add Apollo Android Dependencies

**File**: `apps/android/construction-android/app/build.gradle.kts`

```kotlin
plugins {
    id("com.apollographql.apollo3") version "3.8.2"
}

dependencies {
    // Apollo GraphQL
    implementation("com.apollographql.apollo3:apollo-runtime:3.8.2")
    implementation("com.apollographql.apollo3:apollo-normalized-cache:3.8.2")
    implementation("com.apollographql.apollo3:apollo-normalized-cache-sqlite:3.8.2")

    // Keep existing dependencies
    // ...
}

apollo {
    service("constructionpro") {
        packageName.set("com.constructionpro.app.graphql")
        schemaFile.set(file("src/main/graphql/schema.graphqls"))

        // Generate Kotlin models
        generateKotlinModels.set(true)

        // Custom scalar mappings
        mapScalar("DateTime", "java.time.OffsetDateTime")
        mapScalar("Date", "java.time.LocalDate")
    }
}
```

### Task 3.2: Create Core Module Structure

**Instructions**:
1. Create new package structure
2. Move shared code to core packages
3. Set up dependency injection with Hilt

**New Structure**:
```
app/src/main/java/com/constructionpro/app/
├── core/
│   ├── di/
│   │   ├── AppModule.kt
│   │   ├── NetworkModule.kt
│   │   └── DatabaseModule.kt
│   ├── network/
│   │   ├── ApolloClientFactory.kt
│   │   ├── AuthInterceptor.kt
│   │   └── NetworkMonitor.kt
│   ├── database/
│   │   ├── AppDatabase.kt
│   │   └── migrations/
│   ├── auth/
│   │   ├── AuthTokenStore.kt
│   │   ├── SessionManager.kt
│   │   └── AuthRepository.kt
│   ├── sync/
│   │   ├── SyncManager.kt
│   │   ├── PendingActionQueue.kt
│   │   └── SyncWorker.kt
│   └── ui/
│       ├── components/
│       │   ├── CPButton.kt
│       │   ├── CPCard.kt
│       │   ├── CPSearchBar.kt
│       │   └── ... (move existing components)
│       └── theme/
│           ├── Theme.kt
│           ├── Color.kt
│           └── Type.kt
├── features/
│   └── (created in next tasks)
└── app/
    ├── MainActivity.kt
    ├── AppNavigation.kt
    └── ConstructionProApp.kt
```

**Core Network Module**:
```kotlin
// core/di/NetworkModule.kt
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideApolloClient(
        authTokenStore: AuthTokenStore,
        @ApplicationContext context: Context
    ): ApolloClient {
        val sqlNormalizedCacheFactory = SqlNormalizedCacheFactory(context, "apollo.db")

        return ApolloClient.Builder()
            .serverUrl(BuildConfig.GRAPHQL_URL)
            .addHttpInterceptor(AuthInterceptor(authTokenStore))
            .normalizedCache(sqlNormalizedCacheFactory)
            .build()
    }
}

// core/network/AuthInterceptor.kt
class AuthInterceptor(
    private val tokenStore: AuthTokenStore
) : HttpInterceptor {
    override suspend fun intercept(
        request: HttpRequest,
        chain: HttpInterceptorChain
    ): HttpResponse {
        val token = tokenStore.getToken()

        val newRequest = if (token != null) {
            request.newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            request
        }

        return chain.proceed(newRequest)
    }
}
```

### Task 3.3: Create Daily Logs Feature Module

**Instructions**:
1. Create feature package structure
2. Move existing daily log code
3. Refactor to use ViewModel + Repository pattern
4. Connect to Apollo Client

**Structure**:
```
features/dailylogs/
├── data/
│   ├── repository/
│   │   └── DailyLogRepository.kt
│   ├── local/
│   │   ├── DailyLogEntity.kt
│   │   ├── DailyLogDao.kt
│   │   └── DailyLogLocalDataSource.kt
│   └── mapper/
│       └── DailyLogMappers.kt
├── domain/
│   ├── model/
│   │   ├── DailyLog.kt
│   │   └── DailyLogStatus.kt
│   └── usecase/
│       ├── GetDailyLogsUseCase.kt
│       ├── GetDailyLogDetailUseCase.kt
│       ├── CreateDailyLogUseCase.kt
│       ├── SubmitDailyLogUseCase.kt
│       └── SyncPendingLogsUseCase.kt
├── ui/
│   ├── list/
│   │   ├── DailyLogsScreen.kt
│   │   ├── DailyLogsViewModel.kt
│   │   └── DailyLogCard.kt
│   ├── detail/
│   │   ├── DailyLogDetailScreen.kt
│   │   └── DailyLogDetailViewModel.kt
│   ├── create/
│   │   ├── CreateDailyLogScreen.kt
│   │   └── CreateDailyLogViewModel.kt
│   └── components/
│       ├── WeatherDelayBanner.kt
│       └── CrewSection.kt
└── navigation/
    └── DailyLogsNavigation.kt
```

**GraphQL Operations** (`src/main/graphql/dailylogs/`):
```graphql
# DailyLogsQueries.graphql
query GetDailyLogs($projectId: ID, $page: Int, $pageSize: Int) {
  dailyLogs(projectId: $projectId, page: $page, pageSize: $pageSize) {
    edges {
      node {
        id
        date
        status
        weatherDelay
        project {
          id
          name
        }
        submitter {
          id
          name
        }
        photoCount
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}

query GetDailyLogDetail($id: ID!) {
  dailyLog(id: $id) {
    id
    date
    status
    notes
    weatherDelay
    weatherDelayNotes
    gpsLatitude
    gpsLongitude
    project {
      id
      name
      address {
        formatted
      }
    }
    submitter {
      id
      name
      email
      phone
    }
    approver {
      id
      name
    }
    photos {
      id
      url
      caption
      createdAt
    }
    crewMembers {
      id
      name
      hours
      trade
    }
    equipmentUsage {
      id
      equipment {
        id
        name
      }
      hours
    }
    createdAt
    submittedAt
    approvedAt
  }
}

# DailyLogsMutations.graphql
mutation CreateDailyLog($input: CreateDailyLogInput!) {
  createDailyLog(input: $input) {
    id
    date
    status
  }
}

mutation SubmitDailyLog($id: ID!) {
  submitDailyLog(id: $id) {
    id
    status
    submittedAt
  }
}
```

**Repository Implementation**:
```kotlin
// features/dailylogs/data/repository/DailyLogRepository.kt
@Singleton
class DailyLogRepository @Inject constructor(
    private val apolloClient: ApolloClient,
    private val localDataSource: DailyLogLocalDataSource,
    private val syncQueue: PendingActionQueue
) {
    fun getDailyLogs(projectId: String?): Flow<Resource<List<DailyLogSummary>>> = flow {
        emit(Resource.Loading)

        // Emit cached data first
        val cached = localDataSource.getDailyLogs(projectId).first()
        if (cached.isNotEmpty()) {
            emit(Resource.Success(cached.map { it.toDomain() }))
        }

        // Fetch from network
        try {
            val response = apolloClient
                .query(GetDailyLogsQuery(projectId = Optional.presentIfNotNull(projectId)))
                .fetchPolicy(FetchPolicy.NetworkFirst)
                .execute()

            if (response.hasErrors()) {
                emit(Resource.Error(
                    ApiException(response.errors?.firstOrNull()?.message ?: "Unknown error"),
                    cached.map { it.toDomain() }
                ))
                return@flow
            }

            val logs = response.data?.dailyLogs?.edges?.map { edge ->
                edge.node.toEntity()
            } ?: emptyList()

            localDataSource.upsertAll(logs)
            emit(Resource.Success(logs.map { it.toDomain() }))

        } catch (e: ApolloException) {
            emit(Resource.Error(e, cached.map { it.toDomain() }))
        }
    }

    suspend fun createDailyLog(input: CreateDailyLogInput): Result<DailyLog> {
        // Create local entity with pending status
        val localId = "local_${UUID.randomUUID()}"
        val entity = DailyLogEntity(
            id = localId,
            date = input.date,
            status = DailyLogStatus.DRAFT,
            notes = input.notes,
            weatherDelay = input.weatherDelay,
            weatherDelayNotes = input.weatherDelayNotes,
            projectId = input.projectId,
            syncStatus = SyncStatus.PENDING,
            localCreatedAt = System.currentTimeMillis()
        )

        localDataSource.insert(entity)

        // Queue for sync
        syncQueue.enqueue(
            PendingAction(
                type = ActionType.CREATE_DAILY_LOG,
                entityId = localId,
                payload = input.toJson(),
                createdAt = System.currentTimeMillis()
            )
        )

        // Try immediate sync
        return try {
            val response = apolloClient
                .mutation(CreateDailyLogMutation(input.toGraphQLInput()))
                .execute()

            if (response.hasErrors()) {
                // Keep in queue for retry
                Result.success(entity.toDomain())
            } else {
                val serverLog = response.data!!.createDailyLog
                // Replace local with server data
                localDataSource.replaceLocalWithServer(localId, serverLog.toEntity())
                syncQueue.markCompleted(localId)
                Result.success(serverLog.toDomain())
            }
        } catch (e: Exception) {
            // Offline - keep in queue
            Result.success(entity.toDomain())
        }
    }
}
```

**ViewModel**:
```kotlin
// features/dailylogs/ui/list/DailyLogsViewModel.kt
@HiltViewModel
class DailyLogsViewModel @Inject constructor(
    private val getDailyLogsUseCase: GetDailyLogsUseCase,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val projectId: String? = savedStateHandle["projectId"]

    private val _uiState = MutableStateFlow(DailyLogsUiState())
    val uiState: StateFlow<DailyLogsUiState> = _uiState.asStateFlow()

    init {
        loadDailyLogs()
    }

    fun loadDailyLogs() {
        viewModelScope.launch {
            getDailyLogsUseCase(projectId)
                .collect { resource ->
                    _uiState.update { state ->
                        when (resource) {
                            is Resource.Loading -> state.copy(isLoading = true)
                            is Resource.Success -> state.copy(
                                isLoading = false,
                                logs = resource.data,
                                error = null
                            )
                            is Resource.Error -> state.copy(
                                isLoading = false,
                                logs = resource.data ?: state.logs,
                                error = resource.exception.message,
                                isOffline = resource.exception is ApolloNetworkException
                            )
                        }
                    }
                }
        }
    }

    fun refresh() {
        loadDailyLogs()
    }
}

data class DailyLogsUiState(
    val isLoading: Boolean = true,
    val logs: List<DailyLogSummary> = emptyList(),
    val error: String? = null,
    val isOffline: Boolean = false,
    val pendingSyncCount: Int = 0
)
```

**Screen** (refactored):
```kotlin
// features/dailylogs/ui/list/DailyLogsScreen.kt
@Composable
fun DailyLogsScreen(
    viewModel: DailyLogsViewModel = hiltViewModel(),
    onNavigateToDetail: (String) -> Unit,
    onNavigateToCreate: () -> Unit,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    DailyLogsContent(
        state = uiState,
        onRefresh = viewModel::refresh,
        onLogClick = onNavigateToDetail,
        onCreateClick = onNavigateToCreate,
        onBack = onBack
    )
}

@Composable
private fun DailyLogsContent(
    state: DailyLogsUiState,
    onRefresh: () -> Unit,
    onLogClick: (String) -> Unit,
    onCreateClick: () -> Unit,
    onBack: () -> Unit
) {
    // Pure UI - no business logic
    // Move all existing UI code here
}
```

**Navigation**:
```kotlin
// features/dailylogs/navigation/DailyLogsNavigation.kt
fun NavGraphBuilder.dailyLogsGraph(navController: NavController) {
    navigation(
        startDestination = DailyLogsRoute.List.route,
        route = "daily-logs"
    ) {
        composable(DailyLogsRoute.List.route) {
            DailyLogsScreen(
                onNavigateToDetail = { id ->
                    navController.navigate(DailyLogsRoute.Detail.createRoute(id))
                },
                onNavigateToCreate = {
                    navController.navigate(DailyLogsRoute.Create.route)
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = DailyLogsRoute.Detail.route,
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) {
            DailyLogDetailScreen(
                onBack = { navController.popBackStack() },
                onEdit = { id -> navController.navigate(DailyLogsRoute.Edit.createRoute(id)) }
            )
        }

        composable(DailyLogsRoute.Create.route) {
            CreateDailyLogScreen(
                onBack = { navController.popBackStack() },
                onCreated = { navController.popBackStack() }
            )
        }
    }
}

sealed class DailyLogsRoute(val route: String) {
    object List : DailyLogsRoute("daily-logs/list")
    object Create : DailyLogsRoute("daily-logs/create")
    object Detail : DailyLogsRoute("daily-logs/detail/{id}") {
        fun createRoute(id: String) = "daily-logs/detail/$id"
    }
    object Edit : DailyLogsRoute("daily-logs/edit/{id}") {
        fun createRoute(id: String) = "daily-logs/edit/$id"
    }
}
```

### Task 3.4: Refactor Remaining Feature Modules

**Instructions**: Repeat Task 3.3 pattern for each feature:

| Feature | Priority | Complexity |
|---------|----------|------------|
| Projects | HIGH | Medium |
| Time Tracking | HIGH | Low |
| Equipment | MEDIUM | Medium |
| Safety (Incidents, Inspections, Punch Lists) | MEDIUM | High |
| Documents | MEDIUM | Medium |
| Drawings | LOW | High (annotations) |
| Financials | LOW | Medium |
| Scheduling | LOW | Medium |
| Admin (Users, Teams, Permissions) | LOW | High |

**Order of Implementation**:
1. Projects (needed by most other features)
2. Time Tracking (frequently used by field workers)
3. Equipment
4. Safety
5. Documents & Drawings
6. Financials & Scheduling
7. Admin

### Task 3.5: Refactor MainActivity and Navigation

**Instructions**:
1. Slim down MainActivity to just app setup
2. Move all navigation to AppNavigation.kt
3. Compose feature navigation graphs

**New MainActivity** (~50 lines):
```kotlin
// app/MainActivity.kt
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var themePreferences: ThemePreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val themeMode by themePreferences.themeModeFlow.collectAsState(initial = ThemeMode.SYSTEM)

            ConstructionProTheme(darkTheme = themeMode.isDark()) {
                Surface {
                    ConstructionProApp()
                }
            }
        }
    }
}

@Composable
fun ConstructionProApp() {
    val sessionManager: SessionManager = hiltViewModel<AppViewModel>().sessionManager
    val isLoggedIn by sessionManager.isLoggedIn.collectAsStateWithLifecycle()

    if (isLoggedIn) {
        AppNavigation()
    } else {
        LoginScreen()
    }
}
```

**AppNavigation** (composes all features):
```kotlin
// app/AppNavigation.kt
@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "dashboard"
    ) {
        composable("dashboard") {
            DashboardScreen(
                onNavigate = { route -> navController.navigate(route) }
            )
        }

        // Feature modules contribute their own navigation graphs
        dailyLogsGraph(navController)
        projectsGraph(navController)
        timeTrackingGraph(navController)
        equipmentGraph(navController)
        safetyGraph(navController)
        documentsGraph(navController)
        drawingsGraph(navController)
        financialsGraph(navController)
        schedulingGraph(navController)
        adminGraph(navController)

        // Settings & Profile
        composable("settings") { SettingsScreen(onBack = { navController.popBackStack() }) }
        composable("profile") { ProfileScreen(onBack = { navController.popBackStack() }) }
    }
}
```

**Validation**:
- Run `android-compose-reviewer` agent on all new screens
- Run `android-coroutine-auditor` agent on ViewModels
- Run `android-offline-sync-validator` agent on repositories
- Run `security-token-auditor` agent on auth code

---

## Phase 4: iOS Modular Architecture + Offline

**Duration**: 2-3 weeks
**Goal**: Mirror Android architecture, add offline support

### Task 4.1: Add Apollo iOS Dependencies

**File**: `apps/ios/ConstructionPro/Package.swift` or via Xcode SPM

```swift
dependencies: [
    .package(url: "https://github.com/apollographql/apollo-ios.git", from: "1.7.0"),
]
```

**Apollo Codegen Config** (`apps/ios/apollo-codegen-config.json`):
```json
{
  "schemaNamespace": "ConstructionProAPI",
  "input": {
    "operationSearchPaths": ["**/*.graphql"],
    "schemaSearchPaths": ["schema.graphqls"]
  },
  "output": {
    "schemaTypes": {
      "path": "./ConstructionPro/GraphQL/Generated",
      "moduleType": { "swiftPackageManager": {} }
    },
    "operations": {
      "inSchemaModule": {}
    }
  }
}
```

### Task 4.2: Create iOS Feature Module Structure

**Structure**:
```
ConstructionPro/
├── Core/
│   ├── Network/
│   │   ├── ApolloClient+Extensions.swift
│   │   ├── AuthInterceptor.swift
│   │   └── NetworkMonitor.swift
│   ├── Auth/
│   │   ├── KeychainHelper.swift
│   │   ├── SessionManager.swift
│   │   └── AuthRepository.swift
│   ├── Persistence/
│   │   ├── CoreDataStack.swift
│   │   ├── PendingActionStore.swift
│   │   └── SyncManager.swift
│   └── UI/
│       ├── Components/
│       └── Theme/
├── Features/
│   ├── DailyLogs/
│   │   ├── Data/
│   │   │   ├── DailyLogRepository.swift
│   │   │   └── DailyLogLocalDataSource.swift
│   │   ├── Domain/
│   │   │   ├── DailyLog.swift
│   │   │   └── DailyLogUseCases.swift
│   │   └── UI/
│   │       ├── DailyLogsView.swift
│   │       ├── DailyLogsViewModel.swift
│   │       ├── DailyLogDetailView.swift
│   │       └── CreateDailyLogView.swift
│   ├── Projects/
│   ├── TimeTracking/
│   ├── Equipment/
│   └── Safety/
└── App/
    ├── ConstructionProApp.swift
    └── AppNavigation.swift
```

### Task 4.3: Implement Offline Support for iOS

**Core Data Model** (`ConstructionPro.xcdatamodeld`):
```swift
// Define entities matching Room entities
// DailyLogEntity, ProjectEntity, PendingActionEntity, etc.
```

**Pending Action Store**:
```swift
// Core/Persistence/PendingActionStore.swift
actor PendingActionStore {
    private let context: NSManagedObjectContext

    func enqueue(_ action: PendingAction) async throws {
        let entity = PendingActionEntity(context: context)
        entity.id = action.id
        entity.type = action.type.rawValue
        entity.entityId = action.entityId
        entity.payload = try JSONEncoder().encode(action.payload)
        entity.createdAt = Date()
        entity.status = PendingStatus.pending.rawValue

        try context.save()
    }

    func getPending() async throws -> [PendingAction] {
        let request = PendingActionEntity.fetchRequest()
        request.predicate = NSPredicate(format: "status == %@", PendingStatus.pending.rawValue)
        request.sortDescriptors = [NSSortDescriptor(key: "createdAt", ascending: true)]

        let entities = try context.fetch(request)
        return entities.compactMap { $0.toDomain() }
    }

    func markCompleted(id: String) async throws {
        // Update status to completed
    }
}
```

**Sync Manager**:
```swift
// Core/Persistence/SyncManager.swift
@MainActor
class SyncManager: ObservableObject {
    @Published var pendingCount: Int = 0
    @Published var isSyncing: Bool = false

    private let pendingStore: PendingActionStore
    private let apollo: ApolloClient

    func syncPendingActions() async {
        guard !isSyncing else { return }
        isSyncing = true
        defer { isSyncing = false }

        do {
            let pending = try await pendingStore.getPending()

            for action in pending {
                do {
                    try await executeAction(action)
                    try await pendingStore.markCompleted(id: action.id)
                } catch {
                    // Keep in queue for retry
                    continue
                }
            }

            await updatePendingCount()
        } catch {
            print("Sync failed: \(error)")
        }
    }

    private func executeAction(_ action: PendingAction) async throws {
        switch action.type {
        case .createDailyLog:
            let input = try JSONDecoder().decode(CreateDailyLogInput.self, from: action.payload)
            _ = try await apollo.perform(mutation: CreateDailyLogMutation(input: input.toGraphQL()))
        // ... other action types
        }
    }
}
```

**Repository Pattern**:
```swift
// Features/DailyLogs/Data/DailyLogRepository.swift
class DailyLogRepository {
    private let apollo: ApolloClient
    private let localDataSource: DailyLogLocalDataSource
    private let pendingStore: PendingActionStore

    func getDailyLogs(projectId: String?) async throws -> AsyncStream<Resource<[DailyLog]>> {
        AsyncStream { continuation in
            Task {
                // Emit cached first
                let cached = try await localDataSource.getDailyLogs(projectId: projectId)
                if !cached.isEmpty {
                    continuation.yield(.success(cached))
                }

                // Fetch from network
                do {
                    let result = try await apollo.fetch(
                        query: GetDailyLogsQuery(projectId: projectId)
                    )

                    let logs = result.data?.dailyLogs.edges.map { $0.node.toDomain() } ?? []
                    try await localDataSource.upsertAll(logs.map { $0.toEntity() })
                    continuation.yield(.success(logs))
                } catch {
                    continuation.yield(.failure(error, cached))
                }

                continuation.finish()
            }
        }
    }

    func createDailyLog(_ input: CreateDailyLogInput) async throws -> DailyLog {
        // Create locally
        let localId = "local_\(UUID().uuidString)"
        let entity = DailyLogEntity(localId: localId, input: input)
        try await localDataSource.insert(entity)

        // Queue for sync
        try await pendingStore.enqueue(PendingAction(
            type: .createDailyLog,
            entityId: localId,
            payload: try JSONEncoder().encode(input)
        ))

        // Try immediate sync
        do {
            let result = try await apollo.perform(
                mutation: CreateDailyLogMutation(input: input.toGraphQL())
            )

            if let serverLog = result.data?.createDailyLog {
                try await localDataSource.replaceLocalWithServer(localId: localId, serverEntity: serverLog.toEntity())
                try await pendingStore.markCompleted(id: localId)
                return serverLog.toDomain()
            }
        } catch {
            // Offline - return local entity
        }

        return entity.toDomain()
    }
}
```

**Validation**:
- Test offline creation and sync
- Verify data persists across app restarts
- Test conflict scenarios

---

## Phase 5: Validation & Cleanup

**Duration**: 1 week
**Goal**: Ensure everything works, clean up legacy code

### Task 5.1: Run All Validation Agents

Execute these agents in sequence:

```
# Cross-platform validation
/cross-platform-api
/api-endpoint-audit
/api-response-checker

# Android validation
android-compose-reviewer (on all new screens)
android-coroutine-auditor (on all ViewModels)
android-offline-sync-validator (on all repositories)
android-field-worker-ui (on field-facing screens)
security-token-auditor (on auth code)

# Web/API validation
next-app-router-validator (on GraphQL route)
prisma-postgres-checker (on any modified queries)
error-handler (on resolvers)
security-auditor (on auth flow)

# Quality checks
quality-control-enforcer (on all new code)
performance-reviewer (if any slowness detected)
```

### Task 5.2: Remove Legacy Code

**Files to Remove/Archive**:
- `apps/android/.../data/ApiService.kt` (after full migration)
- All `transformX()` functions in web API routes (replaced by GraphQL)
- Legacy REST routes (after mobile apps fully migrated)
- Old model files replaced by generated GraphQL types

**Files to Update**:
- Remove `ignoreUnknownKeys = true` from Kotlin serialization (no longer needed)
- Update CLAUDE.md files with new architecture patterns
- Update agents to reference new module structure

### Task 5.3: Update Documentation

**Create/Update**:
- `docs/ARCHITECTURE.md` - Overview of new architecture
- `docs/GRAPHQL.md` - GraphQL schema documentation
- `docs/OFFLINE.md` - Offline-first patterns
- Update all `CLAUDE.md` files with new patterns

### Task 5.4: Performance Testing

**Test Scenarios**:
1. List screen load time with 1000+ items
2. Offline mode data persistence
3. Sync queue processing with 50+ pending items
4. Memory usage on drawing viewer
5. Cold start time

---

## Phase 6: Android UI Redesign

**Duration**: 1-2 weeks (can run in parallel with Phase 3-4)
**Goal**: Redesign Android UI to match iOS quality and patterns

### UI Strategy Overview

| Platform | Strategy |
|----------|----------|
| **iOS** | KEEP AS-IS - Already well-designed with proper design system |
| **Android** | REDESIGN - Match iOS patterns and quality |
| **Web** | OPTIONAL - Can update later if desired |

### iOS UI Strengths to Mirror

The iOS app has excellent UI patterns that should be adopted for Android:

1. **Design System**:
   - `AppColors` - Semantic color system (primary600, textPrimary, success, warning, etc.)
   - `AppTypography` - Consistent text styles (heading1, bodySemibold, caption, etc.)
   - `AppSpacing` - Standardized spacing scale (xxs, xs, sm, md, lg, xl)
   - `AppCard` - Reusable card component with consistent styling

2. **Component Library**:
   - `IconCircle` - Icon with circular background
   - `PrimaryButton`, `DestructiveButton` - Consistent button styles
   - `StatusBadge` - Status indicators
   - `StatCard`, `CompactStatCard`, `VerticalStatCard` - Data display

3. **Responsive Layout**:
   - iPad vs iPhone detection
   - Adaptive grid layouts
   - Different layouts for portrait/landscape

4. **Localization**:
   - All strings use `.localized` extension
   - Language change notifications

### Task 6.1: Create Android Design System

**Create design token files that mirror iOS**:

```kotlin
// core/ui/theme/AppColors.kt
object AppColors {
    // Primary
    val primary50 = Color(0xFFE3F2FD)
    val primary100 = Color(0xFFBBDEFB)
    val primary200 = Color(0xFF90CAF9)
    val primary500 = Color(0xFF2196F3)
    val primary600 = Color(0xFF1E88E5)
    val primary700 = Color(0xFF1976D2)

    // Semantic
    val textPrimary = Color(0xFF1A1A1A)
    val textSecondary = Color(0xFF6B7280)
    val textTertiary = Color(0xFF9CA3AF)

    val background = Color(0xFFF9FAFB)
    val cardBackground = Color(0xFFFFFFFF)

    val success = Color(0xFF10B981)
    val successLight = Color(0xFFD1FAE5)
    val warning = Color(0xFFF59E0B)
    val warningLight = Color(0xFFFEF3C7)
    val error = Color(0xFFEF4444)
    val info = Color(0xFF3B82F6)
    val infoLight = Color(0xFFDBEAFE)

    val orange = Color(0xFFF97316)
    val orangeLight = Color(0xFFFED7AA)

    val gray100 = Color(0xFFF3F4F6)
    val gray400 = Color(0xFF9CA3AF)
}

// core/ui/theme/AppTypography.kt
object AppTypography {
    val heading1 = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 34.sp
    )
    val heading2 = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        lineHeight = 28.sp
    )
    val heading3 = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 24.sp
    )
    val body = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 22.sp
    )
    val bodySemibold = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp
    )
    val secondary = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp
    )
    val secondaryMedium = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp
    )
    val caption = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp
    )
}

// core/ui/theme/AppSpacing.kt
object AppSpacing {
    val xxs = 2.dp
    val xs = 4.dp
    val sm = 8.dp
    val md = 12.dp
    val lg = 16.dp
    val xl = 24.dp
    val xxl = 32.dp

    val radiusSmall = 8.dp
    val radiusMedium = 12.dp
    val radiusLarge = 16.dp
}
```

### Task 6.2: Create Reusable Components

**Mirror iOS component library**:

```kotlin
// core/ui/components/AppCard.kt
@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(AppSpacing.radiusMedium),
        color = AppColors.cardBackground,
        shadowElevation = 2.dp,
        onClick = onClick ?: {}
    ) {
        Column(
            modifier = Modifier.padding(AppSpacing.lg),
            content = content
        )
    }
}

// core/ui/components/IconCircle.kt
enum class IconSize(val size: Dp, val iconSize: Dp) {
    Small(32.dp, 16.dp),
    Medium(40.dp, 20.dp),
    Large(52.dp, 24.dp)
}

@Composable
fun IconCircle(
    icon: ImageVector,
    size: IconSize = IconSize.Medium,
    foregroundColor: Color = AppColors.primary600,
    backgroundColor: Color = AppColors.primary50,
    contentDescription: String? = null
) {
    Box(
        modifier = Modifier
            .size(size.size)
            .background(backgroundColor, CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            modifier = Modifier.size(size.iconSize),
            tint = foregroundColor
        )
    }
}

// core/ui/components/PrimaryButton.kt
@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    isLarge: Boolean = false
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(if (isLarge) 56.dp else 48.dp),
        enabled = enabled,
        colors = ButtonDefaults.buttonColors(
            containerColor = AppColors.primary600,
            contentColor = Color.White
        ),
        shape = RoundedCornerShape(AppSpacing.radiusMedium)
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(AppSpacing.sm))
        }
        Text(
            text = text,
            style = AppTypography.bodySemibold
        )
    }
}

@Composable
fun DestructiveButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null
) {
    Button(
        onClick = onClick,
        modifier = modifier.fillMaxWidth().height(48.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = AppColors.error,
            contentColor = Color.White
        ),
        shape = RoundedCornerShape(AppSpacing.radiusMedium)
    ) {
        if (icon != null) {
            Icon(icon, null, Modifier.size(20.dp))
            Spacer(Modifier.width(AppSpacing.sm))
        }
        Text(text, style = AppTypography.bodySemibold)
    }
}

// core/ui/components/StatusBadge.kt
enum class BadgeStatus {
    Active, Warning, Error, Info, Neutral
}

@Composable
fun StatusBadge(
    text: String,
    status: BadgeStatus
) {
    val (backgroundColor, textColor) = when (status) {
        BadgeStatus.Active -> AppColors.successLight to AppColors.success
        BadgeStatus.Warning -> AppColors.warningLight to AppColors.warning
        BadgeStatus.Error -> Color(0xFFFEE2E2) to AppColors.error
        BadgeStatus.Info -> AppColors.infoLight to AppColors.info
        BadgeStatus.Neutral -> AppColors.gray100 to AppColors.textSecondary
    }

    Surface(
        color = backgroundColor,
        shape = RoundedCornerShape(20.dp)
    ) {
        Text(
            text = text,
            style = AppTypography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = textColor,
            modifier = Modifier.padding(horizontal = AppSpacing.md, vertical = AppSpacing.xs)
        )
    }
}

// core/ui/components/StatCard.kt
@Composable
fun StatCard(
    value: String,
    label: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    AppCard(modifier = modifier) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(24.dp)
            )
            Text(
                text = value,
                style = AppTypography.heading2,
                color = color
            )
            Text(
                text = label,
                style = AppTypography.caption,
                color = AppColors.textSecondary,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun CompactStatCard(
    value: String,
    label: String,
    icon: ImageVector,
    color: Color
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
        modifier = Modifier
            .fillMaxWidth()
            .padding(AppSpacing.sm)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(20.dp)
        )
        Column {
            Text(
                text = value,
                style = AppTypography.bodySemibold,
                color = AppColors.textPrimary
            )
            Text(
                text = label,
                style = AppTypography.caption,
                color = AppColors.textSecondary
            )
        }
    }
}

// core/ui/components/ActionCard.kt
@Composable
fun ActionCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    iconColor: Color,
    iconBackground: Color,
    onClick: () -> Unit
) {
    AppCard(onClick = onClick) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            IconCircle(
                icon = icon,
                size = IconSize.Medium,
                foregroundColor = iconColor,
                backgroundColor = iconBackground
            )

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
            ) {
                Text(
                    text = title,
                    style = AppTypography.bodySemibold,
                    color = AppColors.textPrimary
                )
                Text(
                    text = subtitle,
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = AppColors.gray400,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}
```

### Task 6.3: Add Tablet/Responsive Support

**Mirror iOS adaptive layout patterns**:

```kotlin
// core/ui/util/AdaptiveLayout.kt
@Composable
fun rememberWindowInfo(): WindowInfo {
    val configuration = LocalConfiguration.current
    return remember(configuration) {
        WindowInfo(
            screenWidthDp = configuration.screenWidthDp.dp,
            screenHeightDp = configuration.screenHeightDp.dp,
            isTablet = configuration.screenWidthDp >= 600,
            isLandscape = configuration.screenWidthDp > configuration.screenHeightDp
        )
    }
}

data class WindowInfo(
    val screenWidthDp: Dp,
    val screenHeightDp: Dp,
    val isTablet: Boolean,
    val isLandscape: Boolean
) {
    val isWideLayout: Boolean
        get() = screenWidthDp > 850.dp

    val gridColumns: Int
        get() = when {
            screenWidthDp > 1200.dp -> 4
            screenWidthDp > 850.dp -> 3
            screenWidthDp > 600.dp -> 2
            else -> 1
        }
}

// Usage in screens:
@Composable
fun DashboardScreen() {
    val windowInfo = rememberWindowInfo()

    if (windowInfo.isWideLayout) {
        TabletDashboardLayout()
    } else {
        PhoneDashboardLayout()
    }
}
```

### Task 6.4: Redesign Key Screens

**Priority order for screen redesign**:

| Screen | Priority | Notes |
|--------|----------|-------|
| Dashboard | 1 | First impression, most used |
| Daily Logs List | 2 | Core feature |
| Daily Log Detail | 3 | Core feature |
| Projects List | 4 | Navigation hub |
| Time Tracking | 5 | Frequently used by workers |
| All other screens | 6+ | Follow established patterns |

**Example: Redesigned Dashboard**:

```kotlin
// features/dashboard/ui/DashboardScreen.kt
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = hiltViewModel(),
    onNavigate: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val windowInfo = rememberWindowInfo()

    Scaffold(
        topBar = {
            DashboardTopBar(
                unreadCount = uiState.unreadNotifications,
                onNotificationsClick = { onNavigate("notifications") }
            )
        },
        containerColor = AppColors.background
    ) { padding ->
        if (windowInfo.isWideLayout) {
            TabletDashboardContent(
                state = uiState,
                onNavigate = onNavigate,
                modifier = Modifier.padding(padding)
            )
        } else {
            PhoneDashboardContent(
                state = uiState,
                onNavigate = onNavigate,
                modifier = Modifier.padding(padding)
            )
        }
    }
}

@Composable
private fun PhoneDashboardContent(
    state: DashboardUiState,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(AppSpacing.lg),
        verticalArrangement = Arrangement.spacedBy(AppSpacing.lg)
    ) {
        // Welcome Section
        item {
            WelcomeSection(userName = state.userName)
        }

        // Clock Card (if time tracking enabled)
        if (state.isTimeTrackingEnabled) {
            item {
                ClockCard(
                    isClockedIn = state.isClockedIn,
                    projectName = state.activeProjectName,
                    todayHours = state.todayHours,
                    weekHours = state.weekHours,
                    elapsedTime = state.elapsedTime,
                    onClockIn = { /* ... */ },
                    onClockOut = { /* ... */ }
                )
            }
        }

        // Quick Actions
        item {
            Text(
                text = stringResource(R.string.dashboard_quick_actions),
                style = AppTypography.heading3,
                color = AppColors.textPrimary
            )
        }

        item {
            QuickActionsGrid(
                activeProjectCount = state.activeProjectCount,
                onNavigate = onNavigate
            )
        }

        // Team Overview / Stats
        item {
            TeamOverviewSection(
                stats = state.teamStats,
                onNavigate = onNavigate
            )
        }
    }
}

@Composable
private fun WelcomeSection(userName: String?) {
    val dateFormatter = remember {
        DateTimeFormatter.ofPattern("EEEE, MMMM d")
    }
    val formattedDate = remember {
        LocalDate.now().format(dateFormatter)
    }

    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)) {
        Text(
            text = formattedDate,
            style = AppTypography.heading2,
            color = AppColors.textPrimary
        )
        if (userName != null) {
            val firstName = userName.split(" ").firstOrNull() ?: userName
            Text(
                text = stringResource(R.string.dashboard_welcome_back, firstName),
                style = AppTypography.body,
                color = AppColors.textSecondary
            )
        }
    }
}

@Composable
private fun ClockCard(
    isClockedIn: Boolean,
    projectName: String?,
    todayHours: String,
    weekHours: String,
    elapsedTime: String,
    onClockIn: () -> Unit,
    onClockOut: () -> Unit
) {
    AppCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
            // Status Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
            ) {
                IconCircle(
                    icon = if (isClockedIn) Icons.Filled.Schedule else Icons.Outlined.Schedule,
                    size = IconSize.Medium,
                    foregroundColor = if (isClockedIn) AppColors.success else AppColors.primary600,
                    backgroundColor = if (isClockedIn) AppColors.successLight else AppColors.primary50
                )

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (isClockedIn)
                            stringResource(R.string.dashboard_currently_working)
                        else
                            stringResource(R.string.dashboard_not_clocked_in),
                        style = AppTypography.bodySemibold,
                        color = AppColors.textPrimary
                    )
                    Text(
                        text = projectName
                            ?: stringResource(R.string.dashboard_tap_to_start),
                        style = AppTypography.caption,
                        color = AppColors.textSecondary
                    )
                }

                if (isClockedIn) {
                    StatusBadge(
                        text = stringResource(R.string.status_active),
                        status = BadgeStatus.Active
                    )
                }
            }

            // Time Stats Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                TimeStatColumn(
                    value = todayHours,
                    label = stringResource(R.string.time_today),
                    color = AppColors.primary600
                )

                VerticalDivider()

                TimeStatColumn(
                    value = if (isClockedIn) elapsedTime else weekHours,
                    label = if (isClockedIn)
                        stringResource(R.string.time_session)
                    else
                        stringResource(R.string.time_this_week),
                    color = if (isClockedIn) AppColors.success else AppColors.textPrimary
                )

                VerticalDivider()

                TimeStatColumn(
                    value = if (isClockedIn) weekHours else "--:--",
                    label = if (isClockedIn)
                        stringResource(R.string.time_this_week)
                    else
                        stringResource(R.string.time_session),
                    color = AppColors.textPrimary
                )
            }

            // Action Button
            if (isClockedIn) {
                DestructiveButton(
                    text = stringResource(R.string.dashboard_clock_out),
                    icon = Icons.Default.Close,
                    onClick = onClockOut
                )
            } else {
                PrimaryButton(
                    text = stringResource(R.string.dashboard_clock_in),
                    icon = Icons.Default.Schedule,
                    onClick = onClockIn,
                    isLarge = true
                )
            }
        }
    }
}

@Composable
private fun TimeStatColumn(
    value: String,
    label: String,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
    ) {
        Text(
            text = value,
            style = AppTypography.heading3,
            color = color
        )
        Text(
            text = label,
            style = AppTypography.caption,
            color = AppColors.textTertiary
        )
    }
}
```

### Task 6.5: Add Localization Support

**Mirror iOS localization pattern**:

```kotlin
// core/util/LocalizedString.kt
// Use Android's built-in string resources with R.string.*
// Ensure all user-facing strings are in res/values/strings.xml

// For dynamic formatting, use:
stringResource(R.string.dashboard_welcome_back, firstName)
pluralStringResource(R.plurals.projects_count, count, count)
```

### UI Redesign Checklist

For each screen, verify:

- [ ] Uses `AppColors` instead of hardcoded colors
- [ ] Uses `AppTypography` instead of inline text styles
- [ ] Uses `AppSpacing` for all padding/margins
- [ ] Uses component library (`AppCard`, `IconCircle`, etc.)
- [ ] Has tablet/responsive layout support
- [ ] All strings use string resources (localized)
- [ ] Touch targets are 56dp+ for primary actions
- [ ] Follows iOS visual hierarchy and spacing
- [ ] Loading, empty, and error states match iOS patterns

### Validation

After UI redesign:
- Run `android-compose-reviewer` agent
- Run `android-field-worker-ui` agent
- Run `construction-ui` agent
- Visually compare against iOS app on same screen size
- Test on tablet and phone form factors

---

## Agent Usage Guide

### When to Run Each Agent

| Phase | After This Action | Run These Agents |
|-------|-------------------|------------------|
| 0 | Database migration changes | `android-offline-sync-validator` |
| 0 | Prisma schema changes | `prisma-postgres-checker`, `/prisma-sync` |
| 0 | API error handling changes | `error-handler`, `api-response-transformer` |
| 1 | Shared schema creation | `cross-platform-parity` |
| 1 | API route updates | `api-response-transformer`, `next-app-router-validator` |
| 2 | GraphQL resolvers | `error-handler`, `security-auditor` |
| 2 | GraphQL route setup | `next-app-router-validator` |
| 3 | New Android screens | `android-compose-reviewer`, `android-field-worker-ui` |
| 3 | New ViewModels | `android-coroutine-auditor` |
| 3 | Repository implementations | `android-offline-sync-validator` |
| 3 | Auth code changes | `security-token-auditor` |
| 4 | iOS feature modules | Manual testing (no iOS agents) |
| 5 | All code complete | Run ALL agents |

### Proactive Agent Execution

For complex changes, run multiple agents in parallel:

```
After completing a new feature module:
1. android-compose-reviewer
2. android-offline-sync-validator
3. android-coroutine-auditor
4. quality-control-enforcer

After API changes:
1. api-response-transformer
2. cross-platform-parity
3. /api-endpoint-audit
```

---

## File Structure Reference

### Final Android Structure

```
apps/android/construction-android/app/src/main/
├── java/com/constructionpro/app/
│   ├── core/
│   │   ├── di/
│   │   │   ├── AppModule.kt
│   │   │   ├── NetworkModule.kt
│   │   │   └── DatabaseModule.kt
│   │   ├── network/
│   │   │   ├── ApolloClientFactory.kt
│   │   │   └── AuthInterceptor.kt
│   │   ├── database/
│   │   │   ├── AppDatabase.kt
│   │   │   └── migrations/
│   │   ├── auth/
│   │   │   ├── AuthTokenStore.kt
│   │   │   └── SessionManager.kt
│   │   ├── sync/
│   │   │   ├── SyncManager.kt
│   │   │   ├── PendingActionQueue.kt
│   │   │   └── SyncWorker.kt
│   │   └── ui/
│   │       ├── components/
│   │       └── theme/
│   ├── features/
│   │   ├── dailylogs/
│   │   │   ├── data/
│   │   │   ├── domain/
│   │   │   ├── ui/
│   │   │   └── navigation/
│   │   ├── projects/
│   │   ├── timetracking/
│   │   ├── equipment/
│   │   ├── safety/
│   │   ├── documents/
│   │   ├── drawings/
│   │   ├── financials/
│   │   ├── scheduling/
│   │   └── admin/
│   └── app/
│       ├── MainActivity.kt
│       ├── AppNavigation.kt
│       └── ConstructionProApp.kt
├── graphql/
│   ├── schema.graphqls
│   ├── dailylogs/
│   │   ├── DailyLogsQueries.graphql
│   │   └── DailyLogsMutations.graphql
│   ├── projects/
│   ├── equipment/
│   └── safety/
└── res/
```

### Final Web/API Structure

```
apps/web/src/
├── app/
│   ├── api/
│   │   ├── graphql/
│   │   │   └── route.ts          # Main GraphQL endpoint
│   │   └── ... (legacy REST for backward compat)
│   └── ... (pages)
├── graphql/
│   ├── schema.graphql
│   ├── resolvers/
│   │   ├── index.ts
│   │   ├── query/
│   │   ├── mutation/
│   │   └── types/
│   ├── context.ts
│   ├── dataloaders.ts
│   └── generated/
│       └── types.ts
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   └── api-errors.ts
└── ...
```

### Final iOS Structure

```
apps/ios/ConstructionPro/
├── Core/
│   ├── Network/
│   ├── Auth/
│   ├── Persistence/
│   └── UI/
├── Features/
│   ├── DailyLogs/
│   │   ├── Data/
│   │   ├── Domain/
│   │   └── UI/
│   ├── Projects/
│   ├── TimeTracking/
│   ├── Equipment/
│   ├── Safety/
│   ├── Documents/
│   ├── Drawings/
│   ├── Financials/
│   ├── Scheduling/
│   └── Admin/
├── GraphQL/
│   ├── Generated/
│   └── Operations/
│       ├── DailyLogs/
│       ├── Projects/
│       └── ...
└── App/
    ├── ConstructionProApp.swift
    └── AppNavigation.swift
```

---

## Execution Checklist

Use this checklist to track progress:

### Phase 0: Critical Fixes
- [ ] Remove `fallbackToDestructiveMigration()`
- [ ] Create Room migration files
- [ ] Add structured address fields to Prisma schema
- [ ] Run Prisma migration
- [ ] Create standardized API error utilities
- [ ] Update all API routes to use standard errors

### Phase 1: API Contract
- [ ] Create `packages/api-schema/` directory
- [ ] Define all type schemas with Zod
- [ ] Set up build process
- [ ] Update web API to import shared types
- [ ] Add response validation in dev mode

### Phase 2: GraphQL
- [ ] Install Apollo Server dependencies
- [ ] Create GraphQL schema
- [ ] Implement Query resolvers
- [ ] Implement Mutation resolvers
- [ ] Add DataLoaders for N+1 prevention
- [ ] Set up authentication context
- [ ] Create API route handler
- [ ] Set up codegen for TypeScript

### Phase 3: Android Modular
- [ ] Add Apollo Android dependencies
- [ ] Create core module structure
- [ ] Set up Hilt dependency injection
- [ ] Create Daily Logs feature module
- [ ] Create Projects feature module
- [ ] Create Time Tracking feature module
- [ ] Create Equipment feature module
- [ ] Create Safety feature module
- [ ] Create remaining feature modules
- [ ] Refactor MainActivity
- [ ] Create AppNavigation
- [ ] Run all Android validation agents

### Phase 4: iOS Modular
- [ ] Add Apollo iOS dependencies
- [ ] Set up codegen
- [ ] Create Core module structure
- [ ] Implement Core Data models
- [ ] Implement PendingActionStore
- [ ] Implement SyncManager
- [ ] Create Daily Logs feature module
- [ ] Create remaining feature modules
- [ ] Test offline functionality

### Phase 5: Validation & Cleanup
- [ ] Run all validation agents
- [ ] Remove legacy code
- [ ] Update documentation
- [ ] Performance testing
- [ ] Final review

### Phase 6: Android UI Redesign
- [ ] Create AppColors.kt matching iOS
- [ ] Create AppTypography.kt matching iOS
- [ ] Create AppSpacing.kt matching iOS
- [ ] Create AppCard component
- [ ] Create IconCircle component
- [ ] Create PrimaryButton, DestructiveButton
- [ ] Create StatusBadge component
- [ ] Create StatCard, CompactStatCard components
- [ ] Create ActionCard component
- [ ] Add WindowInfo for responsive layouts
- [ ] Redesign DashboardScreen
- [ ] Redesign DailyLogsScreen
- [ ] Redesign DailyLogDetailScreen
- [ ] Redesign ProjectsScreen
- [ ] Redesign TimeTrackingScreen
- [ ] Update remaining screens to use design system
- [ ] Run UI validation agents
- [ ] Visual comparison with iOS app

---

## Notes for Claude

1. **Work incrementally** - Complete one phase fully before moving to the next
2. **Run agents proactively** - After each significant change, run relevant agents
3. **Test offline scenarios** - Crucial for construction field workers
4. **Maintain backward compatibility** - Keep REST endpoints until mobile apps fully migrated
5. **Use skills** - `/prisma-sync`, `/cross-platform-api`, `/api-endpoint-audit` are available
6. **Reference existing code** - Existing patterns in codebase should inform new code style
7. **Ask for clarification** - If any task is ambiguous, ask before implementing

When starting work, begin with Phase 0 critical fixes as these prevent data loss and crashes. Then proceed sequentially through the phases.
