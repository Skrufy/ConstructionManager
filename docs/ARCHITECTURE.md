# ConstructionPro Architecture

## Overview

ConstructionPro is a construction project management platform with a multi-platform architecture:
- **Web + API Backend**: Next.js 14 with App Router
- **Android**: Kotlin + Jetpack Compose
- **iOS**: Swift + SwiftUI
- **Database**: PostgreSQL via Supabase

## Target Architecture (Post-Refactor)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Architecture                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐                                           │
│   │     Android     │                                           │
│   │  ┌───────────┐  │     GraphQL        ┌──────────────────┐  │
│   │  │ features/ │  │ ◄─────────────────► │                  │  │
│   │  │ daily-logs│  │   (typed client)   │  GraphQL Server  │  │
│   │  │ projects  │  │                    │  (Apollo Server) │  │
│   │  │ equipment │  │                    │                  │  │
│   │  │ ...       │  │                    │  ┌────────────┐  │  │
│   │  └───────────┘  │                    │  │  schema/   │  │  │
│   │  Apollo Client  │                    │  │ (source of │  │  │
│   │  + Room Cache   │                    │  │   truth)   │  │  │
│   └─────────────────┘                    │  └────────────┘  │  │
│                                          │        │         │  │
│   ┌─────────────────┐                    │        ▼         │  │
│   │       iOS       │                    │  ┌────────────┐  │  │
│   │  ┌───────────┐  │     GraphQL        │  │  Resolvers │  │  │
│   │  │ Features/ │  │ ◄─────────────────► │  │  (Prisma)  │  │  │
│   │  │ DailyLogs │  │   (typed client)   │  └────────────┘  │  │
│   │  │ Projects  │  │                    │        │         │  │
│   │  │ ...       │  │                    └────────┼─────────┘  │
│   │  └───────────┘  │                            │             │
│   │  Apollo iOS     │                            ▼             │
│   │  + File Cache   │                    ┌──────────────────┐  │
│   └─────────────────┘                    │    PostgreSQL    │  │
│                                          │    (Supabase)    │  │
└──────────────────────────────────────────┴──────────────────┴───┘
```

## Module Structure

### Android (`apps/android/construction-android/`)

```
app/src/main/java/com/constructionpro/app/
├── core/                     # Shared infrastructure
│   ├── di/                   # Dependency injection (Hilt)
│   └── navigation/           # Type-safe routes
│
├── data/                     # Data layer
│   ├── model/                # API response models
│   ├── local/                # Room database & sync
│   │   ├── AppDatabase.kt
│   │   ├── SyncManager.kt
│   │   └── Migrations.kt
│   └── ApiService.kt         # REST API client
│
├── features/                 # Feature modules
│   ├── projects/
│   │   ├── data/             # ProjectsRepository
│   │   └── ui/               # Compose screens
│   ├── dailylogs/
│   │   ├── data/             # DailyLogsRepository
│   │   └── ui/               # Compose screens
│   └── ...
│
├── graphql/                  # Apollo GraphQL
│   ├── schema.graphqls
│   └── operations/
│       ├── Projects/
│       ├── DailyLogs/
│       └── ...
│
└── ui/                       # Shared UI
    ├── screens/
    ├── components/
    └── theme/
```

### iOS (`apps/ios/ConstructionManager/`)

```
ConstructionManager/
├── Core/                     # Shared infrastructure
│   ├── Network/              # GraphQL client
│   └── Database/             # Local storage
│
├── GraphQL/                  # Apollo GraphQL
│   ├── schema.graphqls
│   ├── ApolloClient.swift
│   └── Operations/
│       ├── Projects/
│       ├── DailyLogs/
│       └── TimeTracking/
│
├── Features/                 # Feature modules
│   ├── Projects/
│   │   ├── Data/             # ProjectsRepository
│   │   └── UI/               # SwiftUI views
│   ├── DailyLogs/
│   │   ├── Data/             # DailyLogsRepository
│   │   └── UI/               # SwiftUI views
│   └── TimeTracking/
│       ├── Data/             # TimeTrackingRepository
│       └── UI/               # SwiftUI views
│
├── Services/                 # Legacy services (to migrate)
│   └── Offline/              # Offline support
│       ├── SyncQueue.swift
│       ├── OfflineManager.swift
│       └── NetworkMonitor.swift
│
├── Models/                   # Shared models
├── Views/                    # Shared views
└── ViewModels/               # Legacy ViewModels
```

### Web (`apps/web/`)

```
apps/web/
├── src/
│   ├── app/
│   │   ├── api/              # REST API routes
│   │   │   ├── projects/
│   │   │   ├── daily-logs/
│   │   │   ├── graphql/      # GraphQL endpoint
│   │   │   └── ...
│   │   └── (routes)/         # Page routes
│   │
│   ├── graphql/              # GraphQL definitions
│   │   ├── schema.graphql    # Source of truth
│   │   └── resolvers/
│   │
│   ├── lib/                  # Shared utilities
│   └── components/           # React components
│
└── prisma/
    └── schema.prisma         # Database schema
```

## Key Patterns

### Repository Pattern (Mobile)

Each feature has a Repository that:
1. Handles GraphQL queries/mutations
2. Manages local cache (Room/FileManager)
3. Queues offline operations
4. Provides observable state

```kotlin
// Android
@Singleton
class ProjectsRepository @Inject constructor(
    private val apolloClient: ApolloClient,
    private val projectDao: ProjectDao
) {
    fun getProjects(forceRefresh: Boolean): Flow<ProjectsResult<List<ProjectSummary>>>
    suspend fun getProject(id: String): ProjectsResult<ProjectDetail>
}
```

```swift
// iOS
@MainActor
class ProjectsRepository: ObservableObject {
    @Published private(set) var projects: [ProjectSummary] = []
    @Published private(set) var isLoading = false
    @Published private(set) var isUsingCachedData = false

    func fetchProjects(forceRefresh: Bool) async
    func getProject(id: String) async -> ProjectsResult<ProjectDetail>
}
```

### Offline-First Architecture

1. **Local Storage**: Room (Android) / FileManager+Cache (iOS)
2. **Sync Queue**: Pending operations stored locally
3. **Conflict Detection**: Version-based with resolution UI
4. **Network Monitoring**: Real-time connectivity detection

See [OFFLINE.md](./OFFLINE.md) for detailed patterns.

### GraphQL Integration

1. **Schema Source**: `apps/web/src/graphql/schema.graphql`
2. **Code Generation**:
   - Android: Apollo Kotlin codegen
   - iOS: Apollo iOS codegen
3. **Type Safety**: Generated types ensure API contract

See [GRAPHQL.md](./GRAPHQL.md) for schema documentation.

## Dependencies

### Android
- Jetpack Compose + Material3
- Apollo Kotlin 4.0.0
- Room 2.6.1
- Hilt 2.51.1
- WorkManager 2.9.0
- Kotlinx Serialization

### iOS
- SwiftUI
- Apollo iOS 1.12.0+
- Combine
- URLSession with async/await

### Web
- Next.js 14 (App Router)
- Prisma ORM
- Apollo Server 4.10.0
- PostgreSQL (Supabase)

## Migration Status

| Feature | Android | iOS | Notes |
|---------|---------|-----|-------|
| GraphQL Client | ✅ | ✅ | Apollo configured |
| Feature Modules | ✅ | ✅ | Repository pattern |
| Offline Support | ✅ | ✅ | Sync queue + caching |
| Type-Safe Nav | ✅ | Partial | Routes.kt implemented |
| Hilt/DI | ✅ | N/A | iOS uses singletons |

## References

- [GRAPHQL.md](./GRAPHQL.md) - GraphQL schema documentation
- [OFFLINE.md](./OFFLINE.md) - Offline-first patterns
- [ARCHITECTURE_REFACTOR_PLAN.md](./ARCHITECTURE_REFACTOR_PLAN.md) - Full refactor plan
