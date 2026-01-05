package com.constructionpro.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "projects")
data class ProjectEntity(
  @PrimaryKey val id: String,
  val name: String,
  val status: String? = null,
  val address: String? = null,
  val clientName: String? = null,
  val updatedAt: Long
)

@Entity(tableName = "daily_logs")
data class DailyLogEntity(
  @PrimaryKey val id: String,
  val projectId: String,
  val projectName: String? = null,
  val date: String,
  val status: String? = null,
  val crewCount: Int? = null,
  val totalHours: Double? = null,
  val submitterName: String? = null,
  val entriesCount: Int? = null,
  val materialsCount: Int? = null,
  val issuesCount: Int? = null,
  val notes: String? = null,
  val weatherDelay: Boolean? = null,
  val weatherDelayNotes: String? = null,
  val pendingSync: Boolean = false,
  val updatedAt: Long
)

@Entity(tableName = "documents")
data class DocumentEntity(
  @PrimaryKey val id: String,
  val projectId: String? = null,
  val projectName: String? = null,
  val name: String,
  val type: String? = null,
  val category: String? = null,
  val drawingNumber: String? = null,
  val sheetTitle: String? = null,
  val revisionCount: Int? = null,
  val annotationCount: Int? = null,
  val createdAt: String? = null,
  val updatedAt: Long
)

@Entity(tableName = "drawings")
data class DrawingEntity(
  @PrimaryKey val id: String,
  val projectId: String? = null,
  val projectName: String? = null,
  val title: String? = null,
  val drawingNumber: String? = null,
  val scale: String? = null,
  val fileUrl: String? = null,
  val annotationCount: Int? = null,
  val createdAt: String? = null,
  val updatedAt: Long
)

@Entity(tableName = "document_cache")
data class DocumentCacheEntity(
  @PrimaryKey val fileId: String,
  val fileName: String,
  val localPath: String,
  val fileSizeBytes: Long,
  val downloadedAt: Long,
  val lastAccessedAt: Long,
  val pageCount: Int? = null
)

@Entity(tableName = "document_calibration", primaryKeys = ["fileId", "pageNumber"])
data class DocumentCalibrationEntity(
  val fileId: String,
  val pageNumber: Int,
  val unitsPerPoint: Double,
  val unitLabel: String,
  val updatedAt: Long
)

@Entity(tableName = "pending_actions")
data class PendingActionEntity(
  @PrimaryKey val id: String,
  val type: String,
  val resourceId: String? = null,
  val payloadJson: String,
  val status: String,
  val retryCount: Int,
  val lastAttemptAt: Long? = null,
  val lastError: String? = null,
  val createdAt: Long,
  // New fields for enhanced sync (database version 10)
  val priority: Int = 1, // 0=HIGH, 1=NORMAL, 2=LOW
  val nextAttemptAt: Long? = null, // For exponential backoff scheduling
  val conflictDataJson: String? = null, // Stores ConflictData when status=CONFLICT
  val baseVersion: Long = 0L // Version of entity when action was created
)

@Entity(tableName = "download_entries")
data class DownloadEntryEntity(
  @PrimaryKey val fileId: String,
  val fileName: String,
  val progress: Int,
  val status: String,
  val updatedAt: Long
)

@Entity(tableName = "pending_photos")
data class PendingPhotoEntity(
  @PrimaryKey val id: String,
  val projectId: String,
  val dailyLogId: String,
  val localPath: String,
  val gpsLatitude: Double? = null,
  val gpsLongitude: Double? = null,
  val status: String,
  val retryCount: Int,
  val lastError: String? = null,
  val createdAt: Long
)

@Entity(tableName = "pending_files")
data class PendingFileEntity(
  @PrimaryKey val id: String,
  val projectId: String,
  val dailyLogId: String? = null,
  val localPath: String,
  val fileName: String,
  val category: String,
  val status: String,
  val retryCount: Int,
  val lastError: String? = null,
  val createdAt: Long
)

/**
 * Cached annotation for offline viewing
 * Stores the full annotation content as JSON for flexibility
 * Annotations are stored per-user so each user only sees their own
 */
@Entity(tableName = "annotations")
data class AnnotationEntity(
  @PrimaryKey val id: String,
  val fileId: String,
  val userId: String,            // User who created this annotation (for per-user filtering)
  val pageNumber: Int,
  val annotationType: String,
  val contentJson: String,       // Serialized content (position, shape, etc.)
  val color: String,
  val createdBy: String? = null,
  val createdByName: String? = null,
  val createdAt: String? = null,
  val resolvedAt: String? = null,
  val resolvedBy: String? = null,
  val isPending: Boolean = false, // True if created locally, awaiting sync
  val updatedAt: Long
)

/**
 * Drawing scale calibration synced with server
 */
@Entity(tableName = "drawing_scales")
data class DrawingScaleEntity(
  @PrimaryKey val drawingId: String,
  val scale: String,             // e.g., "1/4\" = 1'-0\"" or "1:100"
  val updatedAt: Long
)

// ============ WARNINGS ============

@Entity(tableName = "warnings")
data class WarningEntity(
  @PrimaryKey val id: String,
  val employeeId: String,
  val employeeName: String? = null,
  val issuedById: String,
  val issuedByName: String? = null,
  val projectId: String? = null,
  val projectName: String? = null,
  val warningType: String,
  val severity: String,
  val description: String,
  val incidentDate: String,
  val witnessNames: String? = null,
  val actionRequired: String? = null,
  val acknowledged: Boolean = false,
  val acknowledgedAt: String? = null,
  val status: String,
  val createdAt: String? = null,
  val updatedAt: Long
)

// ============ CLIENTS ============

@Entity(tableName = "clients")
data class ClientEntity(
  @PrimaryKey val id: String,
  val companyName: String,
  val contactName: String? = null,
  val email: String? = null,
  val phone: String? = null,
  val address: String? = null,
  val city: String? = null,
  val state: String? = null,
  val zip: String? = null,
  val status: String,
  val notes: String? = null,
  val website: String? = null,
  val industry: String? = null,
  val projectCount: Int = 0,
  val updatedAt: Long
)

// ============ LABELS ============

@Entity(tableName = "labels")
data class LabelEntity(
  @PrimaryKey val id: String,
  val category: String,
  val name: String,
  val projectId: String? = null,
  val projectName: String? = null,
  val isActive: Boolean = true,
  val sortOrder: Int = 0,
  val updatedAt: Long
)
