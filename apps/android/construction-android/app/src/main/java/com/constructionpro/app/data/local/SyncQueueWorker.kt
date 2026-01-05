package com.constructionpro.app.data.local

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.constructionpro.app.data.ApiClient
import com.constructionpro.app.data.AuthTokenStore
import com.constructionpro.app.data.model.DailyLogDetail
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import kotlinx.serialization.json.Json
import kotlinx.serialization.decodeFromString
import retrofit2.HttpException
import java.io.IOException
import java.io.File

class SyncQueueWorker(
  appContext: Context,
  params: WorkerParameters
) : CoroutineWorker(appContext, params) {

  private val json = Json { ignoreUnknownKeys = true }

  override suspend fun doWork(): Result {
    val db = AppDatabase.getInstance(applicationContext)
    val pendingDao = db.pendingActionDao()
    val dailyLogDao = db.dailyLogDao()
    val pendingPhotoDao = db.pendingPhotoDao()
    val pendingFileDao = db.pendingFileDao()
    val api = ApiClient(AuthTokenStore(applicationContext)).apiService

    val pending = pendingDao.getByStatus(PendingStatus.PENDING)
    val pendingPhotos = pendingPhotoDao.getByStatus(PendingPhotoStatus.PENDING)
    val pendingFiles = pendingFileDao.getByStatus(PendingFileStatus.PENDING)
    if (pending.isEmpty() && pendingPhotos.isEmpty() && pendingFiles.isEmpty()) return Result.success()

    for (action in pending) {
      val now = System.currentTimeMillis()
      try {
        when (action.type) {
          PendingActionTypes.DAILY_LOG_CREATE -> {
            val payload = json.decodeFromString(PendingDailyLogCreatePayload.serializer(), action.payloadJson)
            val response = api.createDailyLog(payload.request)
            val entity = response.dailyLog.toEntity()
            if (entity != null) {
              dailyLogDao.deleteById(payload.localId)
              dailyLogDao.insertAll(listOf(entity))
              pendingPhotoDao.updateDailyLogId(payload.localId, response.dailyLog.id)
              pendingDao.deleteById(action.id)
            } else {
              // Failed to convert response to entity - project data missing
              throw IllegalStateException("API response missing required project data for daily log ${response.dailyLog.id}")
            }
          }
          PendingActionTypes.DAILY_LOG_UPDATE -> {
            val payload = json.decodeFromString(PendingDailyLogUpdatePayload.serializer(), action.payloadJson)
            val response = api.updateDailyLog(payload.logId, payload.request)
            val entity = response.dailyLog.toEntity()
            if (entity != null) {
              dailyLogDao.insertAll(listOf(entity.copy(pendingSync = false)))
              pendingDao.deleteById(action.id)
            } else {
              // Failed to convert response to entity - project data missing
              throw IllegalStateException("API response missing required project data for daily log ${response.dailyLog.id}")
            }
          }
          PendingActionTypes.ANNOTATION_CREATE -> {
            val payload = json.decodeFromString(PendingAnnotationPayload.serializer(), action.payloadJson)
            api.createAnnotation(payload.documentId, payload.request)
            pendingDao.deleteById(action.id)
          }
        }
      } catch (error: Exception) {
        val nextCount = action.retryCount + 1
        val canRetry = shouldRetry(error) && nextCount < PendingActionScheduler.MAX_RETRY_COUNT
        val nextStatus = if (canRetry) PendingStatus.PENDING else PendingStatus.FAILED
        pendingDao.updateStatus(
          id = action.id,
          status = nextStatus,
          retryCount = nextCount,
          lastAttemptAt = now,
          lastError = error.message
        )
        if (canRetry) {
          return Result.retry()
        }
      }
    }

    for (photo in pendingPhotos) {
      if (photo.dailyLogId.startsWith("local_")) {
        continue
      }
      try {
        val file = File(photo.localPath)
        if (!file.exists()) {
          pendingPhotoDao.updateStatus(photo.id, PendingPhotoStatus.FAILED, photo.retryCount + 1, "Missing file")
          continue
        }
        val fileBody = file.readBytes().toRequestBody("image/*".toMediaType())
        val filePart = MultipartBody.Part.createFormData("file", file.name, fileBody)
        val textType = "text/plain".toMediaType()
        val projectBody = photo.projectId.toRequestBody(textType)
        val logBody = photo.dailyLogId.toRequestBody(textType)
        val categoryBody = "PHOTOS".toRequestBody(textType)
        val latBody = photo.gpsLatitude?.toString()?.toRequestBody(textType)
        val lngBody = photo.gpsLongitude?.toString()?.toRequestBody(textType)

        api.uploadDailyLogPhoto(
          file = filePart,
          projectId = projectBody,
          dailyLogId = logBody,
          category = categoryBody,
          gpsLatitude = latBody,
          gpsLongitude = lngBody
        )

        pendingPhotoDao.deleteById(photo.id)
        runCatching { file.delete() }
      } catch (error: Exception) {
        val nextCount = photo.retryCount + 1
        val canRetry = shouldRetry(error) && nextCount < PendingActionScheduler.MAX_RETRY_COUNT
        val status = if (canRetry) PendingPhotoStatus.PENDING else PendingPhotoStatus.FAILED
        pendingPhotoDao.updateStatus(photo.id, status, nextCount, error.message)
        if (canRetry) {
          return Result.retry()
        }
      }
    }

    for (fileEntry in pendingFiles) {
      try {
        val file = File(fileEntry.localPath)
        if (!file.exists()) {
          pendingFileDao.updateStatus(fileEntry.id, PendingFileStatus.FAILED, fileEntry.retryCount + 1, "Missing file")
          continue
        }
        val fileBody = file.readBytes().toRequestBody("application/octet-stream".toMediaType())
        val filePart = MultipartBody.Part.createFormData("file", fileEntry.fileName, fileBody)
        val textType = "text/plain".toMediaType()
        val projectBody = fileEntry.projectId.toRequestBody(textType)
        val logBody = fileEntry.dailyLogId?.toRequestBody(textType)
        val categoryBody = fileEntry.category.toRequestBody(textType)

        api.uploadFile(
          file = filePart,
          projectId = projectBody,
          dailyLogId = logBody,
          category = categoryBody,
          gpsLatitude = null,
          gpsLongitude = null
        )

        pendingFileDao.deleteById(fileEntry.id)
        runCatching { file.delete() }
      } catch (error: Exception) {
        val nextCount = fileEntry.retryCount + 1
        val canRetry = shouldRetry(error) && nextCount < PendingActionScheduler.MAX_RETRY_COUNT
        val status = if (canRetry) PendingFileStatus.PENDING else PendingFileStatus.FAILED
        pendingFileDao.updateStatus(fileEntry.id, status, nextCount, error.message)
        if (canRetry) {
          return Result.retry()
        }
      }
    }

    return Result.success()
  }

  private fun shouldRetry(error: Exception): Boolean {
    return when (error) {
      is IOException -> true
      is HttpException -> error.code() >= 500
      else -> false
    }
  }
}

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
