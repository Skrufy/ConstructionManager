package com.constructionpro.app.data.local

import com.constructionpro.app.data.model.AnnotationCreateRequest
import com.constructionpro.app.data.model.DailyLogUpsertRequest
import kotlinx.serialization.Serializable

object PendingActionTypes {
  const val DAILY_LOG_CREATE = "DAILY_LOG_CREATE"
  const val DAILY_LOG_UPDATE = "DAILY_LOG_UPDATE"
  const val ANNOTATION_CREATE = "ANNOTATION_CREATE"
  const val ANNOTATION_UPDATE = "ANNOTATION_UPDATE"
  const val ANNOTATION_DELETE = "ANNOTATION_DELETE"
  const val TIME_ENTRY_CREATE = "TIME_ENTRY_CREATE"
  const val TIME_ENTRY_UPDATE = "TIME_ENTRY_UPDATE"
}

// Legacy status objects - kept for backwards compatibility
// Use SyncStatus for new code
object PendingStatus {
  const val PENDING = SyncStatus.PENDING
  const val FAILED = SyncStatus.FAILED
}

object PendingPhotoStatus {
  const val PENDING = SyncStatus.PENDING
  const val FAILED = SyncStatus.FAILED
}

object PendingFileStatus {
  const val PENDING = SyncStatus.PENDING
  const val FAILED = SyncStatus.FAILED
}

/**
 * Base payload with version tracking for conflict detection
 */
@Serializable
sealed class VersionedPayload {
  /** Version of the entity when changes were made locally */
  abstract val baseVersion: Long

  /** Timestamp when the action was created */
  abstract val createdAtMs: Long
}

@Serializable
data class PendingDailyLogCreatePayload(
  val localId: String,
  val request: DailyLogUpsertRequest,
  override val baseVersion: Long = 0L,
  override val createdAtMs: Long = System.currentTimeMillis()
) : VersionedPayload()

@Serializable
data class PendingDailyLogUpdatePayload(
  val logId: String,
  val request: DailyLogUpsertRequest,
  override val baseVersion: Long,
  override val createdAtMs: Long = System.currentTimeMillis()
) : VersionedPayload()

@Serializable
data class PendingAnnotationPayload(
  val documentId: String,
  val request: AnnotationCreateRequest,
  val localAnnotationId: String? = null,
  override val baseVersion: Long = 0L,
  override val createdAtMs: Long = System.currentTimeMillis()
) : VersionedPayload()

/**
 * Conflict data stored when server has newer version
 */
@Serializable
data class ConflictData(
  val localVersion: Long,
  val serverVersion: Long,
  val serverDataJson: String?,
  val detectedAt: Long = System.currentTimeMillis()
)
