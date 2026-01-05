package com.constructionpro.app.data.local

/**
 * Sync status for pending actions and entities
 */
object SyncStatus {
    /** Action is queued and waiting to sync */
    const val PENDING = "PENDING"

    /** Action is currently being synced */
    const val SYNCING = "SYNCING"

    /** Action synced successfully */
    const val SYNCED = "SYNCED"

    /** Action failed after max retries */
    const val FAILED = "FAILED"

    /** Server has newer version - requires conflict resolution */
    const val CONFLICT = "CONFLICT"
}

/**
 * Conflict resolution strategy
 */
enum class ConflictResolution {
    /** Server data wins - discard local changes */
    SERVER_WINS,

    /** Local data wins - overwrite server */
    CLIENT_WINS,

    /** Merge changes (field-level) */
    MERGE,

    /** Keep both versions for manual resolution */
    KEEP_BOTH
}

/**
 * Sync priority for ordering pending actions
 */
object SyncPriority {
    const val HIGH = 0      // User-initiated, time-sensitive
    const val NORMAL = 1    // Standard sync
    const val LOW = 2       // Background sync, can wait
}

/**
 * Result of a sync operation
 */
sealed class SyncResult {
    /** Sync completed successfully */
    data class Success(val serverId: String? = null) : SyncResult()

    /** Sync failed, may retry */
    data class Retry(val error: String, val nextAttemptMs: Long) : SyncResult()

    /** Sync failed permanently */
    data class Failed(val error: String) : SyncResult()

    /** Conflict detected with server */
    data class Conflict(
        val localVersion: Long,
        val serverVersion: Long,
        val serverData: String? = null
    ) : SyncResult()
}

/**
 * Calculate exponential backoff delay
 * @param attempt Current attempt number (0-indexed)
 * @param baseDelayMs Base delay in milliseconds (default 1 second)
 * @param maxDelayMs Maximum delay in milliseconds (default 5 minutes)
 * @param jitterFactor Random jitter factor 0-1 (default 0.1 = 10%)
 */
fun calculateBackoffDelay(
    attempt: Int,
    baseDelayMs: Long = 1000L,
    maxDelayMs: Long = 300000L,
    jitterFactor: Double = 0.1
): Long {
    // Exponential: base * 2^attempt
    val exponentialDelay = baseDelayMs * (1L shl minOf(attempt, 10))
    val cappedDelay = minOf(exponentialDelay, maxDelayMs)

    // Add jitter to prevent thundering herd
    val jitter = (cappedDelay * jitterFactor * Math.random()).toLong()
    return cappedDelay + jitter
}
