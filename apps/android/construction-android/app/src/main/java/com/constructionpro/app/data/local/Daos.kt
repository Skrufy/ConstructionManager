package com.constructionpro.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface ProjectDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertAll(projects: List<ProjectEntity>)

  @Query("SELECT * FROM projects ORDER BY name ASC")
  suspend fun getAll(): List<ProjectEntity>

  @Query("SELECT * FROM projects WHERE name LIKE :query OR address LIKE :query ORDER BY name ASC")
  suspend fun search(query: String): List<ProjectEntity>
}

@Dao
interface DailyLogDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertAll(logs: List<DailyLogEntity>)

  @Query("SELECT * FROM daily_logs ORDER BY date DESC")
  suspend fun getAll(): List<DailyLogEntity>

  @Query("SELECT * FROM daily_logs WHERE projectId = :projectId ORDER BY date DESC")
  suspend fun getByProject(projectId: String): List<DailyLogEntity>

  @Query("SELECT * FROM daily_logs WHERE notes LIKE :query OR submitterName LIKE :query OR projectName LIKE :query ORDER BY date DESC")
  suspend fun searchAll(query: String): List<DailyLogEntity>

  @Query("SELECT * FROM daily_logs WHERE projectId = :projectId AND (notes LIKE :query OR submitterName LIKE :query) ORDER BY date DESC")
  suspend fun searchByProject(projectId: String, query: String): List<DailyLogEntity>

  @Query("SELECT * FROM daily_logs WHERE pendingSync = 1 ORDER BY date DESC")
  suspend fun getAllPending(): List<DailyLogEntity>

  @Query("SELECT * FROM daily_logs WHERE projectId = :projectId AND pendingSync = 1 ORDER BY date DESC")
  suspend fun getPendingByProject(projectId: String): List<DailyLogEntity>

  @Query("DELETE FROM daily_logs WHERE id = :logId")
  suspend fun deleteById(logId: String)
}

@Dao
interface DocumentDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertAll(documents: List<DocumentEntity>)

  @Query("SELECT * FROM documents ORDER BY createdAt DESC")
  suspend fun getAll(): List<DocumentEntity>

  @Query("SELECT * FROM documents WHERE id = :documentId LIMIT 1")
  suspend fun getById(documentId: String): DocumentEntity?

  @Query("SELECT * FROM documents WHERE name LIKE :query OR drawingNumber LIKE :query ORDER BY createdAt DESC")
  suspend fun search(query: String): List<DocumentEntity>
}

@Dao
interface DrawingDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertAll(drawings: List<DrawingEntity>)

  @Query("SELECT * FROM drawings WHERE id = :id")
  suspend fun getById(id: String): DrawingEntity?

  @Query("SELECT * FROM drawings ORDER BY createdAt DESC")
  suspend fun getAll(): List<DrawingEntity>

  @Query("SELECT * FROM drawings WHERE projectId = :projectId ORDER BY createdAt DESC")
  suspend fun getByProject(projectId: String): List<DrawingEntity>

  @Query("SELECT * FROM drawings WHERE title LIKE :query OR drawingNumber LIKE :query ORDER BY createdAt DESC")
  suspend fun search(query: String): List<DrawingEntity>
}

@Dao
interface DocumentCacheDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(entry: DocumentCacheEntity)

  @Query("SELECT * FROM document_cache WHERE fileId = :fileId")
  suspend fun getById(fileId: String): DocumentCacheEntity?

  @Query("SELECT * FROM document_cache WHERE fileId IN (:fileIds)")
  suspend fun getByIds(fileIds: List<String>): List<DocumentCacheEntity>

  @Query("SELECT * FROM document_cache ORDER BY downloadedAt DESC")
  suspend fun getAll(): List<DocumentCacheEntity>

  @Query("SELECT SUM(fileSizeBytes) FROM document_cache")
  suspend fun getTotalSizeBytes(): Long?

  @Query("SELECT * FROM document_cache ORDER BY lastAccessedAt ASC")
  suspend fun getOldestFirst(): List<DocumentCacheEntity>

  @Query("DELETE FROM document_cache WHERE fileId = :fileId")
  suspend fun deleteById(fileId: String)

  @Query("DELETE FROM document_cache")
  suspend fun deleteAll()

  @Query("DELETE FROM document_cache WHERE downloadedAt < :cutoff")
  suspend fun deleteOlderThan(cutoff: Long)

  @Query("UPDATE document_cache SET lastAccessedAt = :timestamp WHERE fileId = :fileId")
  suspend fun touch(fileId: String, timestamp: Long)
}

@Dao
interface DocumentCalibrationDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(calibration: DocumentCalibrationEntity)

  @Query("SELECT * FROM document_calibration WHERE fileId = :fileId AND pageNumber = :pageNumber")
  suspend fun getCalibration(fileId: String, pageNumber: Int): DocumentCalibrationEntity?
}

@Dao
interface PendingActionDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(action: PendingActionEntity)

  @Query("SELECT * FROM pending_actions WHERE id = :id LIMIT 1")
  suspend fun getById(id: String): PendingActionEntity?

  @Query("SELECT * FROM pending_actions WHERE status = :status ORDER BY createdAt ASC")
  suspend fun getByStatus(status: String): List<PendingActionEntity>

  @Query("SELECT * FROM pending_actions WHERE type = :type AND resourceId = :resourceId AND status = :status")
  suspend fun getByTypeAndResource(type: String, resourceId: String, status: String): List<PendingActionEntity>

  @Query("SELECT COUNT(*) FROM pending_actions WHERE type = :type AND status = :status")
  suspend fun countByType(type: String, status: String): Int

  @Query("UPDATE pending_actions SET status = :status, retryCount = :retryCount, lastAttemptAt = :lastAttemptAt, lastError = :lastError WHERE id = :id")
  suspend fun updateStatus(
    id: String,
    status: String,
    retryCount: Int,
    lastAttemptAt: Long?,
    lastError: String?
  )

  @Query("UPDATE pending_actions SET status = :status, retryCount = :retryCount, lastAttemptAt = :lastAttemptAt, lastError = :lastError, nextAttemptAt = :nextAttemptAt WHERE id = :id")
  suspend fun updateStatusWithBackoff(
    id: String,
    status: String,
    retryCount: Int,
    lastAttemptAt: Long?,
    lastError: String?,
    nextAttemptAt: Long?
  )

  @Query("UPDATE pending_actions SET status = :status, conflictDataJson = :conflictDataJson WHERE id = :id")
  suspend fun updateConflict(
    id: String,
    status: String,
    conflictDataJson: String?
  )

  @Query("SELECT * FROM pending_actions WHERE status = :status ORDER BY priority ASC, createdAt ASC")
  suspend fun getPendingOrderedByPriority(status: String): List<PendingActionEntity>

  @Query("DELETE FROM pending_actions WHERE id = :id")
  suspend fun deleteById(id: String)

  @Query("DELETE FROM pending_actions WHERE status = :status")
  suspend fun deleteByStatus(status: String)
}

@Dao
interface DownloadEntryDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(entry: DownloadEntryEntity)

  @Query("SELECT * FROM download_entries ORDER BY updatedAt DESC")
  suspend fun getAll(): List<DownloadEntryEntity>

  @Query("SELECT * FROM download_entries WHERE fileId = :fileId LIMIT 1")
  suspend fun getById(fileId: String): DownloadEntryEntity?

  @Query("SELECT * FROM download_entries WHERE fileId IN (:fileIds)")
  suspend fun getByIds(fileIds: List<String>): List<DownloadEntryEntity>

  @Query("DELETE FROM download_entries WHERE fileId = :fileId")
  suspend fun deleteById(fileId: String)
}

@Dao
interface PendingPhotoDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(entry: PendingPhotoEntity)

  @Query("SELECT * FROM pending_photos WHERE status = :status ORDER BY createdAt ASC")
  suspend fun getByStatus(status: String): List<PendingPhotoEntity>

  @Query("UPDATE pending_photos SET dailyLogId = :newId WHERE dailyLogId = :oldId")
  suspend fun updateDailyLogId(oldId: String, newId: String)

  @Query("UPDATE pending_photos SET status = :status, retryCount = :retryCount, lastError = :lastError WHERE id = :id")
  suspend fun updateStatus(id: String, status: String, retryCount: Int, lastError: String?)

  @Query("DELETE FROM pending_photos WHERE id = :id")
  suspend fun deleteById(id: String)
}

@Dao
interface PendingFileDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(entry: PendingFileEntity)

  @Query("SELECT * FROM pending_files WHERE status = :status ORDER BY createdAt ASC")
  suspend fun getByStatus(status: String): List<PendingFileEntity>

  @Query("UPDATE pending_files SET status = :status, retryCount = :retryCount, lastError = :lastError WHERE id = :id")
  suspend fun updateStatus(id: String, status: String, retryCount: Int, lastError: String?)

  @Query("DELETE FROM pending_files WHERE id = :id")
  suspend fun deleteById(id: String)
}

@Dao
interface AnnotationDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(annotation: AnnotationEntity)

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertAll(annotations: List<AnnotationEntity>)

  // Per-user queries - filter by userId to show only current user's annotations
  @Query("SELECT * FROM annotations WHERE fileId = :fileId AND userId = :userId ORDER BY createdAt DESC")
  suspend fun getByFileIdForUser(fileId: String, userId: String): List<AnnotationEntity>

  @Query("SELECT * FROM annotations WHERE fileId = :fileId AND userId = :userId AND pageNumber = :pageNumber ORDER BY createdAt DESC")
  suspend fun getByFileAndPageForUser(fileId: String, userId: String, pageNumber: Int): List<AnnotationEntity>

  // Legacy queries (kept for backwards compatibility)
  @Query("SELECT * FROM annotations WHERE fileId = :fileId ORDER BY createdAt DESC")
  suspend fun getByFileId(fileId: String): List<AnnotationEntity>

  @Query("SELECT * FROM annotations WHERE fileId = :fileId AND pageNumber = :pageNumber ORDER BY createdAt DESC")
  suspend fun getByFileAndPage(fileId: String, pageNumber: Int): List<AnnotationEntity>

  @Query("SELECT * FROM annotations WHERE id = :annotationId LIMIT 1")
  suspend fun getById(annotationId: String): AnnotationEntity?

  @Query("SELECT * FROM annotations WHERE fileId = :fileId AND isPending = 1 ORDER BY createdAt DESC")
  suspend fun getPendingByFileId(fileId: String): List<AnnotationEntity>

  @Query("SELECT * FROM annotations WHERE isPending = 1 ORDER BY createdAt DESC")
  suspend fun getAllPending(): List<AnnotationEntity>

  @Query("UPDATE annotations SET isPending = 0, id = :newId WHERE id = :oldId")
  suspend fun markSynced(oldId: String, newId: String)

  @Query("UPDATE annotations SET resolvedAt = :resolvedAt, resolvedBy = :resolvedBy, updatedAt = :updatedAt WHERE id = :annotationId")
  suspend fun updateResolved(annotationId: String, resolvedAt: String?, resolvedBy: String?, updatedAt: Long)

  @Query("DELETE FROM annotations WHERE id = :annotationId")
  suspend fun deleteById(annotationId: String)

  @Query("DELETE FROM annotations WHERE fileId = :fileId")
  suspend fun deleteByFileId(fileId: String)

  @Query("DELETE FROM annotations WHERE fileId = :fileId AND userId = :userId")
  suspend fun deleteByFileIdForUser(fileId: String, userId: String)

  @Query("DELETE FROM annotations WHERE fileId = :fileId AND isPending = 1")
  suspend fun deletePendingByFileId(fileId: String)

  @Query("SELECT COUNT(*) FROM annotations WHERE fileId = :fileId")
  suspend fun countByFileId(fileId: String): Int

  @Query("SELECT COUNT(*) FROM annotations WHERE fileId = :fileId AND isPending = 1")
  suspend fun countPendingByFileId(fileId: String): Int
}

@Dao
interface DrawingScaleDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(scale: DrawingScaleEntity)

  @Query("SELECT * FROM drawing_scales WHERE drawingId = :drawingId LIMIT 1")
  suspend fun getByDrawingId(drawingId: String): DrawingScaleEntity?

  @Query("DELETE FROM drawing_scales WHERE drawingId = :drawingId")
  suspend fun deleteByDrawingId(drawingId: String)
}

// ============ WARNINGS ============

@Dao
interface WarningDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertAll(warnings: List<WarningEntity>)

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(warning: WarningEntity)

  @Query("SELECT * FROM warnings ORDER BY incidentDate DESC")
  suspend fun getAll(): List<WarningEntity>

  @Query("SELECT * FROM warnings WHERE id = :warningId LIMIT 1")
  suspend fun getById(warningId: String): WarningEntity?

  @Query("SELECT * FROM warnings WHERE employeeId = :employeeId ORDER BY incidentDate DESC")
  suspend fun getByEmployee(employeeId: String): List<WarningEntity>

  @Query("SELECT * FROM warnings WHERE projectId = :projectId ORDER BY incidentDate DESC")
  suspend fun getByProject(projectId: String): List<WarningEntity>

  @Query("SELECT * FROM warnings WHERE status = :status ORDER BY incidentDate DESC")
  suspend fun getByStatus(status: String): List<WarningEntity>

  @Query("SELECT * FROM warnings WHERE employeeName LIKE :query OR description LIKE :query ORDER BY incidentDate DESC")
  suspend fun search(query: String): List<WarningEntity>

  @Query("DELETE FROM warnings WHERE id = :warningId")
  suspend fun deleteById(warningId: String)

  @Query("DELETE FROM warnings")
  suspend fun deleteAll()
}

// ============ CLIENTS ============

@Dao
interface ClientDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertAll(clients: List<ClientEntity>)

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(client: ClientEntity)

  @Query("SELECT * FROM clients ORDER BY companyName ASC")
  suspend fun getAll(): List<ClientEntity>

  @Query("SELECT * FROM clients WHERE id = :clientId LIMIT 1")
  suspend fun getById(clientId: String): ClientEntity?

  @Query("SELECT * FROM clients WHERE status = :status ORDER BY companyName ASC")
  suspend fun getByStatus(status: String): List<ClientEntity>

  @Query("SELECT * FROM clients WHERE industry = :industry ORDER BY companyName ASC")
  suspend fun getByIndustry(industry: String): List<ClientEntity>

  @Query("SELECT * FROM clients WHERE companyName LIKE :query OR contactName LIKE :query OR email LIKE :query ORDER BY companyName ASC")
  suspend fun search(query: String): List<ClientEntity>

  @Query("DELETE FROM clients WHERE id = :clientId")
  suspend fun deleteById(clientId: String)

  @Query("DELETE FROM clients")
  suspend fun deleteAll()
}

// ============ LABELS ============

@Dao
interface LabelDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertAll(labels: List<LabelEntity>)

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(label: LabelEntity)

  @Query("SELECT * FROM labels ORDER BY category ASC, sortOrder ASC, name ASC")
  suspend fun getAll(): List<LabelEntity>

  @Query("SELECT * FROM labels WHERE id = :labelId LIMIT 1")
  suspend fun getById(labelId: String): LabelEntity?

  @Query("SELECT * FROM labels WHERE category = :category ORDER BY sortOrder ASC, name ASC")
  suspend fun getByCategory(category: String): List<LabelEntity>

  @Query("SELECT * FROM labels WHERE category = :category AND isActive = 1 ORDER BY sortOrder ASC, name ASC")
  suspend fun getActiveByCategory(category: String): List<LabelEntity>

  @Query("SELECT * FROM labels WHERE projectId = :projectId OR projectId IS NULL ORDER BY category ASC, sortOrder ASC")
  suspend fun getByProject(projectId: String): List<LabelEntity>

  @Query("SELECT * FROM labels WHERE isActive = 1 ORDER BY category ASC, sortOrder ASC, name ASC")
  suspend fun getAllActive(): List<LabelEntity>

  @Query("DELETE FROM labels WHERE id = :labelId")
  suspend fun deleteById(labelId: String)

  @Query("DELETE FROM labels")
  suspend fun deleteAll()
}
