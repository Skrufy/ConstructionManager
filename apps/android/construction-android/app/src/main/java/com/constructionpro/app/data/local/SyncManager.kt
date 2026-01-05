package com.constructionpro.app.data.local

import android.content.Context
import android.util.Log
import com.constructionpro.app.data.ApiClient
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.AuthTokenStore
import com.constructionpro.app.data.model.DailyLogDetail
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import retrofit2.HttpException
import java.io.IOException

/**
 * Manages offline sync operations with conflict detection and resolution
 */
class SyncManager(
    private val context: Context,
    private val db: AppDatabase = AppDatabase.getInstance(context),
    private val api: ApiService = ApiClient(AuthTokenStore(context)).apiService
) {
    companion object {
        private const val TAG = "SyncManager"
        const val MAX_RETRY_COUNT = 5

        @Volatile
        private var INSTANCE: SyncManager? = null

        fun getInstance(context: Context): SyncManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: SyncManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    private val json = Json { ignoreUnknownKeys = true }
    private val syncMutex = Mutex()

    // Observable sync state
    private val _syncState = MutableStateFlow(SyncState())
    val syncState: StateFlow<SyncState> = _syncState

    /**
     * Current sync state
     */
    data class SyncState(
        val isSyncing: Boolean = false,
        val pendingCount: Int = 0,
        val failedCount: Int = 0,
        val conflictCount: Int = 0,
        val lastSyncAt: Long? = null,
        val lastError: String? = null
    )

    /**
     * Update sync state counts from database
     */
    suspend fun refreshSyncState() {
        val pendingDao = db.pendingActionDao()
        val pending = pendingDao.getByStatus(SyncStatus.PENDING)
        val failed = pendingDao.getByStatus(SyncStatus.FAILED)
        val conflicts = pendingDao.getByStatus(SyncStatus.CONFLICT)

        _syncState.value = _syncState.value.copy(
            pendingCount = pending.size,
            failedCount = failed.size,
            conflictCount = conflicts.size
        )
    }

    /**
     * Process all pending sync actions
     * Returns true if all actions were processed successfully
     */
    suspend fun syncAll(): Boolean {
        if (!syncMutex.tryLock()) {
            Log.d(TAG, "Sync already in progress")
            return false
        }

        try {
            _syncState.value = _syncState.value.copy(isSyncing = true, lastError = null)
            val pendingDao = db.pendingActionDao()
            val now = System.currentTimeMillis()

            // Get pending actions ordered by priority and creation time
            val pendingActions = pendingDao.getPendingOrderedByPriority(SyncStatus.PENDING)

            var allSuccessful = true
            for (action in pendingActions) {
                // Skip if not ready for retry (exponential backoff)
                if (action.nextAttemptAt != null && action.nextAttemptAt > now) {
                    continue
                }

                // Mark as syncing
                pendingDao.updateStatus(
                    id = action.id,
                    status = SyncStatus.SYNCING,
                    retryCount = action.retryCount,
                    lastAttemptAt = now,
                    lastError = null
                )

                val result = processSingleAction(action)
                when (result) {
                    is SyncResult.Success -> {
                        pendingDao.deleteById(action.id)
                        Log.d(TAG, "Synced action ${action.id} successfully")
                    }
                    is SyncResult.Retry -> {
                        val nextAttempt = now + result.nextAttemptMs
                        pendingDao.updateStatusWithBackoff(
                            id = action.id,
                            status = SyncStatus.PENDING,
                            retryCount = action.retryCount + 1,
                            lastAttemptAt = now,
                            lastError = result.error,
                            nextAttemptAt = nextAttempt
                        )
                        allSuccessful = false
                    }
                    is SyncResult.Failed -> {
                        pendingDao.updateStatus(
                            id = action.id,
                            status = SyncStatus.FAILED,
                            retryCount = action.retryCount + 1,
                            lastAttemptAt = now,
                            lastError = result.error
                        )
                        allSuccessful = false
                    }
                    is SyncResult.Conflict -> {
                        val conflictData = ConflictData(
                            localVersion = result.localVersion,
                            serverVersion = result.serverVersion,
                            serverDataJson = result.serverData
                        )
                        pendingDao.updateConflict(
                            id = action.id,
                            status = SyncStatus.CONFLICT,
                            conflictDataJson = json.encodeToString(conflictData)
                        )
                        allSuccessful = false
                    }
                }
            }

            _syncState.value = _syncState.value.copy(
                isSyncing = false,
                lastSyncAt = System.currentTimeMillis()
            )
            refreshSyncState()
            return allSuccessful

        } finally {
            syncMutex.unlock()
        }
    }

    /**
     * Process a single pending action
     */
    private suspend fun processSingleAction(action: PendingActionEntity): SyncResult {
        return try {
            when (action.type) {
                PendingActionTypes.DAILY_LOG_CREATE -> syncDailyLogCreate(action)
                PendingActionTypes.DAILY_LOG_UPDATE -> syncDailyLogUpdate(action)
                PendingActionTypes.ANNOTATION_CREATE -> syncAnnotationCreate(action)
                else -> SyncResult.Failed("Unknown action type: ${action.type}")
            }
        } catch (e: Exception) {
            handleSyncError(e, action.retryCount)
        }
    }

    private suspend fun syncDailyLogCreate(action: PendingActionEntity): SyncResult {
        val payload = json.decodeFromString(PendingDailyLogCreatePayload.serializer(), action.payloadJson)
        val response = api.createDailyLog(payload.request)
        val entity = response.dailyLog.toEntity()

        if (entity != null) {
            val dailyLogDao = db.dailyLogDao()
            val pendingPhotoDao = db.pendingPhotoDao()

            // Replace local ID with server ID
            dailyLogDao.deleteById(payload.localId)
            dailyLogDao.insertAll(listOf(entity))
            pendingPhotoDao.updateDailyLogId(payload.localId, response.dailyLog.id)

            return SyncResult.Success(response.dailyLog.id)
        } else {
            return SyncResult.Failed("API response missing required project data")
        }
    }

    private suspend fun syncDailyLogUpdate(action: PendingActionEntity): SyncResult {
        val payload = json.decodeFromString(PendingDailyLogUpdatePayload.serializer(), action.payloadJson)

        // Check for conflict - fetch current server version
        try {
            val serverLog = api.getDailyLog(payload.logId)
            val serverVersion = serverLog.dailyLog.updatedAt?.let {
                // Parse ISO date to timestamp for comparison
                try { java.time.Instant.parse(it).toEpochMilli() } catch (e: Exception) { 0L }
            } ?: 0L

            // If server is newer than our base version, we have a conflict
            if (serverVersion > payload.baseVersion && payload.baseVersion > 0) {
                return SyncResult.Conflict(
                    localVersion = payload.baseVersion,
                    serverVersion = serverVersion,
                    serverData = json.encodeToString(serverLog.dailyLog)
                )
            }
        } catch (e: HttpException) {
            if (e.code() == 404) {
                return SyncResult.Failed("Daily log no longer exists on server")
            }
            throw e
        }

        // No conflict, proceed with update
        val response = api.updateDailyLog(payload.logId, payload.request)
        val entity = response.dailyLog.toEntity()

        if (entity != null) {
            val dailyLogDao = db.dailyLogDao()
            dailyLogDao.insertAll(listOf(entity.copy(pendingSync = false)))
            return SyncResult.Success(response.dailyLog.id)
        } else {
            return SyncResult.Failed("API response missing required project data")
        }
    }

    private suspend fun syncAnnotationCreate(action: PendingActionEntity): SyncResult {
        val payload = json.decodeFromString(PendingAnnotationPayload.serializer(), action.payloadJson)
        api.createAnnotation(payload.documentId, payload.request)
        return SyncResult.Success()
    }

    /**
     * Handle sync errors and determine retry strategy
     */
    private fun handleSyncError(error: Exception, currentRetryCount: Int): SyncResult {
        Log.e(TAG, "Sync error: ${error.message}", error)

        val canRetry = when (error) {
            is IOException -> true // Network error, always retry
            is HttpException -> error.code() >= 500 // Server error, retry
            else -> false
        }

        return if (canRetry && currentRetryCount < MAX_RETRY_COUNT) {
            val backoffDelay = calculateBackoffDelay(currentRetryCount)
            SyncResult.Retry(error.message ?: "Unknown error", backoffDelay)
        } else {
            SyncResult.Failed(error.message ?: "Unknown error")
        }
    }

    /**
     * Resolve a conflict using the specified strategy
     */
    suspend fun resolveConflict(
        actionId: String,
        resolution: ConflictResolution
    ): Boolean {
        val pendingDao = db.pendingActionDao()
        val action = pendingDao.getById(actionId) ?: return false

        if (action.status != SyncStatus.CONFLICT) {
            Log.w(TAG, "Action $actionId is not in conflict state")
            return false
        }

        val conflictData = action.conflictDataJson?.let {
            json.decodeFromString(ConflictData.serializer(), it)
        } ?: return false

        when (resolution) {
            ConflictResolution.SERVER_WINS -> {
                // Discard local changes, delete the pending action
                pendingDao.deleteById(actionId)

                // If we have server data, update local cache
                if (conflictData.serverDataJson != null && action.type == PendingActionTypes.DAILY_LOG_UPDATE) {
                    val serverLog = json.decodeFromString(DailyLogDetail.serializer(), conflictData.serverDataJson)
                    serverLog.toEntity()?.let { db.dailyLogDao().insertAll(listOf(it)) }
                }
                return true
            }
            ConflictResolution.CLIENT_WINS -> {
                // Reset to pending with updated base version
                pendingDao.updateStatus(
                    id = actionId,
                    status = SyncStatus.PENDING,
                    retryCount = 0,
                    lastAttemptAt = null,
                    lastError = null
                )
                // Note: The actual "force push" logic would need API support
                // for now, we just retry and hope the server accepts it
                return true
            }
            ConflictResolution.MERGE -> {
                // Merge is complex and would need field-level merging logic
                // For now, treat as server wins with a warning
                Log.w(TAG, "MERGE resolution not fully implemented, treating as SERVER_WINS")
                pendingDao.deleteById(actionId)
                return true
            }
            ConflictResolution.KEEP_BOTH -> {
                // Keep both means marking as failed for manual review
                pendingDao.updateStatus(
                    id = actionId,
                    status = SyncStatus.FAILED,
                    retryCount = action.retryCount,
                    lastAttemptAt = action.lastAttemptAt,
                    lastError = "Conflict requires manual resolution"
                )
                return true
            }
        }
    }

    /**
     * Retry all failed actions
     */
    suspend fun retryFailed() {
        val pendingDao = db.pendingActionDao()
        val failed = pendingDao.getByStatus(SyncStatus.FAILED)

        for (action in failed) {
            pendingDao.updateStatus(
                id = action.id,
                status = SyncStatus.PENDING,
                retryCount = 0,
                lastAttemptAt = null,
                lastError = null
            )
        }

        refreshSyncState()
    }

    /**
     * Clear all failed actions
     */
    suspend fun clearFailed() {
        val pendingDao = db.pendingActionDao()
        pendingDao.deleteByStatus(SyncStatus.FAILED)
        refreshSyncState()
    }
}

// Extension to convert DailyLogDetail to entity
private fun DailyLogDetail.toEntity(): DailyLogEntity? {
    val projectDetail = project ?: return null
    val projectId = projectDetail.id ?: return null
    return DailyLogEntity(
        id = id,
        projectId = projectId,
        projectName = projectDetail.name,
        date = date,
        status = status,
        crewCount = crewCount,
        totalHours = totalHours,
        submitterName = submitter?.name,
        entriesCount = entries.size,
        materialsCount = materials.size,
        issuesCount = issues.size,
        notes = notes,
        pendingSync = false,
        updatedAt = System.currentTimeMillis()
    )
}
