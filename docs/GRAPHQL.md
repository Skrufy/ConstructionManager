# GraphQL API Documentation

## Overview

ConstructionPro uses GraphQL as the primary API layer for mobile clients. The GraphQL schema serves as the single source of truth for the API contract between server and clients.

## Schema Location

- **Source of Truth**: `apps/web/src/graphql/schema.graphql`
- **Android Copy**: `apps/android/construction-android/app/src/main/graphql/schema.graphqls`
- **iOS Copy**: `apps/ios/ConstructionManager/ConstructionManager/GraphQL/schema.graphqls`

## Endpoint

```
POST /api/graphql
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Core Types

### Queries

| Query | Description | Parameters |
|-------|-------------|------------|
| `projects` | List projects with filtering | `status`, `search`, `page`, `pageSize` |
| `project(id)` | Get single project | `id` |
| `dailyLogs` | List daily logs | `projectId`, `status`, `startDate`, `endDate`, `page`, `pageSize` |
| `dailyLog(id)` | Get single daily log | `id` |
| `timeEntries` | List time entries | `projectId`, `userId`, `startDate`, `endDate`, `status`, `page`, `pageSize` |
| `activeTimeEntry` | Get current active time entry | none |
| `equipment` | List equipment | `projectId`, `status`, `search`, `page`, `pageSize` |
| `incidents` | List safety incidents | `projectId`, `severity`, `status`, `page`, `pageSize` |
| `inspections` | List inspections | `projectId`, `status`, `page`, `pageSize` |
| `punchLists` | List punch lists | `projectId`, `status`, `page`, `pageSize` |
| `documents` | List documents | `projectId`, `category`, `search`, `page`, `pageSize` |
| `me` | Current user info | none |
| `myPermissions` | Current user permissions | none |

### Mutations

| Mutation | Description | Input |
|----------|-------------|-------|
| `createDailyLog` | Create new daily log | `CreateDailyLogInput` |
| `updateDailyLog` | Update daily log | `id`, `UpdateDailyLogInput` |
| `submitDailyLog` | Submit for approval | `id` |
| `approveDailyLog` | Approve submitted log | `id` |
| `rejectDailyLog` | Reject with reason | `id`, `reason` |
| `clockIn` | Start time entry | `ClockInInput` |
| `clockOut` | End time entry | `id`, `ClockOutInput` |
| `createEquipment` | Add equipment | `CreateEquipmentInput` |
| `updateEquipment` | Update equipment | `id`, `UpdateEquipmentInput` |
| `createIncident` | Report incident | `CreateIncidentInput` |
| `createInspection` | Create inspection | `CreateInspectionInput` |
| `uploadDocument` | Upload document | `UploadDocumentInput` |
| `createAnnotation` | Add annotation | `documentId`, `CreateAnnotationInput` |

## Pagination

All list queries return connections with cursor-based pagination:

```graphql
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
```

### Example Query

```graphql
query GetProjects($page: Int, $pageSize: Int) {
  projects(page: $page, pageSize: $pageSize) {
    edges {
      node {
        id
        name
        status
        address {
          formatted
        }
        dailyLogCount
      }
    }
    pageInfo {
      hasNextPage
    }
    totalCount
  }
}
```

## Enums

### ProjectStatus
- `PLANNING`
- `ACTIVE`
- `ON_HOLD`
- `COMPLETED`
- `CANCELLED`
- `ARCHIVED`

### DailyLogStatus
- `DRAFT`
- `SUBMITTED`
- `APPROVED`
- `REJECTED`

### TimeEntryStatus
- `PENDING`
- `APPROVED`
- `REJECTED`

### UserRole
- `ADMIN`
- `PROJECT_MANAGER`
- `DEVELOPER`
- `ARCHITECT`
- `FOREMAN`
- `CREW_LEADER`
- `OFFICE`
- `FIELD_WORKER`
- `VIEWER`

## Custom Scalars

| Scalar | Description | Format |
|--------|-------------|--------|
| `DateTime` | Full timestamp | ISO 8601 (e.g., `2024-01-15T10:30:00Z`) |
| `Date` | Date only | ISO 8601 date (e.g., `2024-01-15`) |

## Code Generation

### Android (Apollo Kotlin)

Configuration in `build.gradle.kts`:

```kotlin
apollo {
    service("service") {
        packageName.set("com.constructionpro.app.graphql")
        schemaFile.set(file("src/main/graphql/schema.graphqls"))
        srcDir("src/main/graphql/operations")
    }
}
```

Generate types:
```bash
./gradlew generateApolloSources
```

### iOS (Apollo iOS)

Configuration in `apollo-codegen-config.json`:

```json
{
  "schemaNamespace": "ConstructionProAPI",
  "input": {
    "operationSearchPaths": ["./ConstructionManager/GraphQL/Operations/**/*.graphql"],
    "schemaSearchPaths": ["./ConstructionManager/GraphQL/schema.graphqls"]
  },
  "output": {
    "schemaTypes": {
      "path": "./ConstructionManager/GraphQL/Generated",
      "moduleType": { "swiftPackageManager": {} }
    }
  }
}
```

Generate types:
```bash
apollo-ios-cli generate
```

## Usage Examples

### Android (Kotlin)

```kotlin
// Inject Apollo client
@Inject lateinit var apolloClient: ApolloClient

// Query
suspend fun getProjects(): List<ProjectSummary> {
    val response = apolloClient.query(
        GetProjectsQuery(
            status = Optional.presentIfNotNull(ProjectStatus.ACTIVE),
            page = Optional.present(1),
            pageSize = Optional.present(50)
        )
    ).execute()

    return response.data?.projects?.edges?.map { edge ->
        ProjectSummary(
            id = edge.node.id,
            name = edge.node.name,
            status = edge.node.status.name,
            address = edge.node.address.formatted
        )
    } ?: emptyList()
}

// Mutation
suspend fun createDailyLog(projectId: String, date: String): String {
    val response = apolloClient.mutation(
        CreateDailyLogMutation(
            input = CreateDailyLogInput(
                projectId = projectId,
                date = date
            )
        )
    ).execute()

    return response.data?.createDailyLog?.id
        ?: throw Exception(response.errors?.firstOrNull()?.message)
}
```

### iOS (Swift)

```swift
// Query
func fetchProjects() async throws -> [ProjectSummary] {
    let query = GetProjectsQuery(
        status: .case(.active),
        page: .some(1),
        pageSize: .some(50)
    )

    let result = try await apollo.fetch(query: query)

    guard let data = result.data else {
        throw GraphQLError.noData
    }

    return data.projects.edges.map { edge in
        ProjectSummary(
            id: edge.node.id,
            name: edge.node.name,
            status: edge.node.status.rawValue,
            address: edge.node.address.formatted
        )
    }
}

// Mutation
func createDailyLog(projectId: String, date: String) async throws -> String {
    let mutation = CreateDailyLogMutation(
        input: CreateDailyLogInput(
            projectId: projectId,
            date: date
        )
    )

    let result = try await apollo.perform(mutation: mutation)

    guard let id = result.data?.createDailyLog.id else {
        throw GraphQLError.mutationFailed
    }

    return id
}
```

## Error Handling

GraphQL errors are returned in the `errors` array:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Not authorized to access this resource",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["project"],
      "extensions": {
        "code": "UNAUTHORIZED"
      }
    }
  ]
}
```

Common error codes:
- `UNAUTHORIZED` - Invalid or expired token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Invalid input data

## Caching

### Apollo Cache Policies

| Policy | Use Case |
|--------|----------|
| `CacheFirst` | Default - use cache, fetch if stale |
| `NetworkOnly` | Always fetch fresh data |
| `CacheOnly` | Offline mode only |
| `NetworkFirst` | Fetch first, fall back to cache |

```kotlin
// Android
apolloClient.query(GetProjectsQuery())
    .fetchPolicy(FetchPolicy.CacheFirst)
    .execute()

// Force refresh
apolloClient.query(GetProjectsQuery())
    .fetchPolicy(FetchPolicy.NetworkOnly)
    .execute()
```

## Schema Updates

When updating the GraphQL schema:

1. Update `apps/web/src/graphql/schema.graphql`
2. Copy to mobile projects:
   ```bash
   cp apps/web/src/graphql/schema.graphql apps/android/construction-android/app/src/main/graphql/schema.graphqls
   cp apps/web/src/graphql/schema.graphql apps/ios/ConstructionManager/ConstructionManager/GraphQL/schema.graphqls
   ```
3. Regenerate types on each platform
4. Update operations files if needed
5. Run cross-platform validation:
   ```bash
   # Use the cross-platform-api skill
   /cross-platform-api
   ```
