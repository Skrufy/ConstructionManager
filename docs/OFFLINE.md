# Offline-First Architecture

## Overview

ConstructionPro is designed for construction site workers who often have limited or no connectivity. The offline-first architecture ensures:
- Data is available even without network
- Changes are queued and synced when connectivity returns
- Conflicts are detected and resolved appropriately

## Architecture Components

### Android

```
┌─────────────────────────────────────────────────────────┐
│                     Android App                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  UI Layer   │───►│ Repository  │───►│  API/Cache  │ │
│  │  (Compose)  │◄───│  Pattern    │◄───│  Decision   │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
│                            │                            │
│                            ▼                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │                  Room Database                    │   │
│  │  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │   │
│  │  │ Entities  │  │ Pending   │  │ Cache       │  │   │
│  │  │ (cached)  │  │ Actions   │  │ Metadata    │  │   │
│  │  └───────────┘  └───────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                            │                            │
│                            ▼                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │               SyncManager                         │   │
│  │  • Processes pending actions                      │   │
│  │  • Exponential backoff on failures               │   │
│  │  • Conflict detection & resolution               │   │
│  └─────────────────────────────────────────────────┘   │
│                            │                            │
│                            ▼                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │             WorkManager Workers                   │   │
│  │  • SyncQueueWorker (periodic sync)               │   │
│  │  • PhotoUploadWorker (background uploads)        │   │
│  │  • PrefetchDrawingsWorker (preload content)      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### iOS

```
┌─────────────────────────────────────────────────────────┐
│                      iOS App                             │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  UI Layer   │───►│ Repository  │───►│  API/Cache  │ │
│  │  (SwiftUI)  │◄───│  Pattern    │◄───│  Decision   │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
│                            │                            │
│                            ▼                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │             OfflineDataStore                      │   │
│  │  • JSON file storage in caches directory         │   │
│  │  • Codable models for type safety                │   │
│  │  • Automatic expiration handling                 │   │
│  └─────────────────────────────────────────────────┘   │
│                            │                            │
│                            ▼                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │                 SyncQueue                         │   │
│  │  • Queues pending operations                      │   │
│  │  • Persists to local storage                      │   │
│  │  • Retry with backoff                            │   │
│  └─────────────────────────────────────────────────┘   │
│                            │                            │
│                            ▼                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │              NetworkMonitor                       │   │
│  │  • NWPathMonitor for connectivity                │   │
│  │  • Triggers sync on reconnection                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Key Patterns

### 1. Cache-First Reading

When fetching data, always try cache first:

```kotlin
// Android Repository
fun getDailyLogs(projectId: String?): Flow<DailyLogsResult<List<DailyLogSummary>>> = flow {
    emit(DailyLogsResult.Loading)

    // 1. Emit cached data first
    val cached = if (projectId != null) {
        dailyLogDao.getByProject(projectId)
    } else {
        dailyLogDao.getAll()
    }

    if (cached.isNotEmpty()) {
        emit(DailyLogsResult.Success(cached.map { it.toSummary() }))
    }

    // 2. Then fetch from network
    try {
        val response = apolloClient.query(GetDailyLogsQuery(...)).execute()
        // Update cache with fresh data
        dailyLogDao.insertAll(response.data?.dailyLogs?.map { it.toEntity() } ?: emptyList())
        emit(DailyLogsResult.Success(response.data?.dailyLogs?.map { it.toSummary() } ?: emptyList()))
    } catch (e: Exception) {
        // Already emitted cached data, just log error
        if (cached.isEmpty()) {
            emit(DailyLogsResult.Error(e.message ?: "Network error", isOffline = true))
        }
    }
}.flowOn(Dispatchers.IO)
```

```swift
// iOS Repository
func fetchProjects(forceRefresh: Bool = false) async {
    isLoading = true
    defer { isLoading = false }

    // 1. Check network
    guard networkMonitor.isConnected else {
        loadFromOfflineCache()
        return
    }

    // 2. Fetch from network
    do {
        let response = try await graphQLClient.apollo.fetch(query: GetProjectsQuery())
        self.projects = response.data?.projects.edges.map { $0.node.toProjectSummary() } ?? []

        // 3. Update cache
        cacheProjects(projects)
    } catch {
        // Fall back to cache
        loadFromOfflineCache()
    }
}
```

### 2. Optimistic Updates

Create local entries immediately, sync in background:

```kotlin
// Android: Create daily log
suspend fun createDailyLog(projectId: String, date: LocalDate, notes: String?): DailyLogsResult<String> {
    // 1. Generate local ID
    val localId = "local_${UUID.randomUUID()}"

    // 2. Save locally immediately
    dailyLogDao.insertAll(listOf(
        DailyLogEntity(
            id = localId,
            projectId = projectId,
            date = date.toString(),
            status = "DRAFT",
            notes = notes,
            pendingSync = true,  // Mark as pending
            updatedAt = System.currentTimeMillis()
        )
    ))

    // 3. Queue for sync
    pendingActionDao.upsert(PendingActionEntity(
        id = localId,
        type = "CREATE_DAILY_LOG",
        resourceId = localId,
        payloadJson = json.encodeToString(payload),
        status = "pending",
        createdAt = System.currentTimeMillis()
    ))

    // 4. Return immediately with local ID
    return DailyLogsResult.Success(localId)
}
```

### 3. ID Replacement

After sync, replace local IDs with server IDs:

```kotlin
// SyncManager: After successful creation
private suspend fun syncDailyLogCreate(action: PendingActionEntity): SyncResult {
    val payload = json.decodeFromString(PendingDailyLogCreatePayload.serializer(), action.payloadJson)
    val response = api.createDailyLog(payload.request)

    // Replace local ID with server ID
    dailyLogDao.deleteById(payload.localId)           // Remove local entry
    dailyLogDao.insertAll(listOf(response.toEntity())) // Insert with server ID

    // Update related records (photos, etc.)
    pendingPhotoDao.updateDailyLogId(payload.localId, response.dailyLog.id)

    return SyncResult.Success(response.dailyLog.id)
}
```

### 4. Conflict Detection

Detect when server data has changed since local modification:

```kotlin
// Version-based conflict detection
private suspend fun syncDailyLogUpdate(action: PendingActionEntity): SyncResult {
    val payload = json.decodeFromString(PendingDailyLogUpdatePayload.serializer(), action.payloadJson)

    // Fetch current server version
    val serverLog = api.getDailyLog(payload.logId)
    val serverVersion = serverLog.dailyLog.updatedAt?.let {
        java.time.Instant.parse(it).toEpochMilli()
    } ?: 0L

    // Compare with our base version
    if (serverVersion > payload.baseVersion && payload.baseVersion > 0) {
        return SyncResult.Conflict(
            localVersion = payload.baseVersion,
            serverVersion = serverVersion,
            serverData = json.encodeToString(serverLog.dailyLog)
        )
    }

    // No conflict, proceed with update
    val response = api.updateDailyLog(payload.logId, payload.request)
    return SyncResult.Success(response.dailyLog.id)
}
```

### 5. Exponential Backoff

Prevent overwhelming the server on failures:

```kotlin
// SyncStatus.kt
fun calculateBackoffDelay(
    attempt: Int,
    baseDelayMs: Long = 1000L,
    maxDelayMs: Long = 300000L,  // 5 minute cap
    jitterFactor: Double = 0.1
): Long {
    val exponentialDelay = baseDelayMs * (1L shl minOf(attempt, 10))
    val cappedDelay = minOf(exponentialDelay, maxDelayMs)
    val jitter = (cappedDelay * jitterFactor * Math.random()).toLong()
    return cappedDelay + jitter
}

// Retry pattern: 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 300s (capped)
```

### 6. Conflict Resolution

Provide UI for user to resolve conflicts:

```kotlin
enum class ConflictResolution {
    SERVER_WINS,   // Discard local changes
    CLIENT_WINS,   // Force push local changes
    MERGE,         // Attempt field-level merge
    KEEP_BOTH      // Mark for manual resolution
}

suspend fun resolveConflict(actionId: String, resolution: ConflictResolution): Boolean {
    when (resolution) {
        ConflictResolution.SERVER_WINS -> {
            // Delete pending action, update local with server data
            pendingDao.deleteById(actionId)
            if (conflictData.serverDataJson != null) {
                val serverLog = json.decodeFromString(DailyLogDetail.serializer(), conflictData.serverDataJson)
                serverLog.toEntity()?.let { dailyLogDao.insertAll(listOf(it)) }
            }
        }
        ConflictResolution.CLIENT_WINS -> {
            // Reset to pending, retry sync
            pendingDao.updateStatus(actionId, status = SyncStatus.PENDING, retryCount = 0)
        }
        // ...
    }
}
```

## Sync Status Indicators

### Visual States

| State | Android | iOS | Description |
|-------|---------|-----|-------------|
| Syncing | 🔄 Rotating icon | Activity indicator | Active sync |
| Pending | 🔵 Blue badge | Count badge | Queued changes |
| Conflict | 🟠 Orange badge | Warning icon | Needs resolution |
| Failed | 🔴 Red badge | Error icon | Max retries reached |
| Synced | ✅ Green check | None | All synced |
| Offline | 📴 Banner | Banner | No connectivity |

### UI Components

```kotlin
// Android: SyncStatusIndicator.kt
@Composable
fun SyncStatusBadge(state: SyncManager.SyncState) {
    when {
        state.isSyncing -> AnimatedSyncIcon()
        state.conflictCount > 0 -> ConflictBadge(state.conflictCount)
        state.failedCount > 0 -> FailedBadge(state.failedCount)
        state.pendingCount > 0 -> PendingBadge(state.pendingCount)
        else -> SyncedIcon()
    }
}
```

## Best Practices

1. **Always cache after network success** - Keep local data fresh
2. **Show cached data immediately** - Don't wait for network
3. **Mark pending items visually** - Users should know what's not synced
4. **Use WorkManager/Background Tasks** - Don't tie sync to UI lifecycle
5. **Implement proper migrations** - Never lose cached data on app updates
6. **Test offline scenarios** - Simulate airplane mode, poor connectivity
7. **Log sync operations** - Debugging offline issues is hard without logs
8. **Respect battery** - Use appropriate WorkManager constraints

## Troubleshooting

### Android

```kotlin
// Enable sync logging
SyncManager.getInstance(context).also { manager ->
    manager.syncState.collect { state ->
        Log.d("SyncDebug", "Pending: ${state.pendingCount}, Failed: ${state.failedCount}")
    }
}

// Force sync
WorkManager.getInstance(context)
    .enqueue(OneTimeWorkRequestBuilder<SyncQueueWorker>().build())
```

### iOS

```swift
// Check sync queue
SyncQueue.shared.pendingOperations.forEach { op in
    print("Pending: \(op.displayDescription), Retries: \(op.retryCount)")
}

// Force sync
Task {
    await SyncQueue.shared.processPendingOperations()
}
```
