package com.constructionpro.app.data.local

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.withContext

class DocumentDownloadWorker(
  appContext: Context,
  params: WorkerParameters
) : CoroutineWorker(appContext, params) {

  override suspend fun doWork(): Result {
    val fileId = inputData.getString(KEY_FILE_ID) ?: return Result.failure()
    val fileName = inputData.getString(KEY_FILE_NAME) ?: "document.pdf"
    val url = inputData.getString(KEY_URL) ?: return Result.failure()

    val db = AppDatabase.getInstance(applicationContext)
    val cacheDao = db.documentCacheDao()
    val downloadDao = db.downloadEntryDao()
    val prefs = OfflineCachePreferences(applicationContext)

    val targetDir = File(applicationContext.filesDir, "offline_docs")
    if (!targetDir.exists() && !targetDir.mkdirs()) {
      return Result.failure()
    }

    val safeName = fileName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
    val targetFile = File(targetDir, "${fileId}_$safeName")

    val client = OkHttpClient()
    val request = Request.Builder().url(url).build()

    downloadDao.upsert(
      DownloadEntryEntity(
        fileId = fileId,
        fileName = fileName,
        progress = 0,
        status = STATUS_DOWNLOADING,
        updatedAt = System.currentTimeMillis()
      )
    )

    val result = withContext(Dispatchers.IO) {
      client.newCall(request).execute().use { response ->
        if (!response.isSuccessful) {
          return@withContext false
        }
        val body = response.body ?: return@withContext false
        val totalBytes = body.contentLength().takeIf { it > 0L }
        var bytesRead = 0L
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)

        targetFile.outputStream().use { output ->
          body.byteStream().use { input ->
            while (true) {
              val read = input.read(buffer)
              if (read == -1) break
              output.write(buffer, 0, read)
              bytesRead += read
              totalBytes?.let { total ->
                val progress = ((bytesRead.toDouble() / total.toDouble()) * 100).toInt().coerceIn(0, 100)
                downloadDao.upsert(
                  DownloadEntryEntity(
                    fileId = fileId,
                    fileName = fileName,
                    progress = progress,
                    status = STATUS_DOWNLOADING,
                    updatedAt = System.currentTimeMillis()
                  )
                )
              }
            }
          }
        }
        true
      }
    }

    if (!result) {
      downloadDao.upsert(
        DownloadEntryEntity(
          fileId = fileId,
          fileName = fileName,
          progress = 0,
          status = STATUS_FAILED,
          updatedAt = System.currentTimeMillis()
        )
      )
      return Result.retry()
    }

    val now = System.currentTimeMillis()
    val cacheEntry = DocumentCacheEntity(
      fileId = fileId,
      fileName = fileName,
      localPath = targetFile.absolutePath,
      fileSizeBytes = targetFile.length(),
      downloadedAt = now,
      lastAccessedAt = now,
      pageCount = null
    )

    cacheDao.upsert(cacheEntry)
    downloadDao.upsert(
      DownloadEntryEntity(
        fileId = fileId,
        fileName = fileName,
        progress = 100,
        status = STATUS_COMPLETE,
        updatedAt = System.currentTimeMillis()
      )
    )

    cleanupCache(cacheDao, prefs)

    return Result.success()
  }

  private suspend fun cleanupCache(
    cacheDao: DocumentCacheDao,
    prefs: OfflineCachePreferences
  ) {
    val settings = prefs.settingsFlow.firstOrNull() ?: return
    val maxBytes = settings.maxSizeMb.toLong() * 1024L * 1024L
    val maxAgeMs = settings.maxAgeDays.toLong() * 24L * 60L * 60L * 1000L
    val cutoff = System.currentTimeMillis() - maxAgeMs

    cacheDao.getAll().forEach { entry ->
      if (entry.downloadedAt < cutoff) {
        deleteFileAndEntry(cacheDao, entry)
      }
    }

    var total = cacheDao.getTotalSizeBytes() ?: 0L
    if (total <= maxBytes) return

    val oldest = cacheDao.getOldestFirst()
    for (entry in oldest) {
      if (total <= maxBytes) break
      deleteFileAndEntry(cacheDao, entry)
      total = cacheDao.getTotalSizeBytes() ?: 0L
    }
  }

  private suspend fun deleteFileAndEntry(cacheDao: DocumentCacheDao, entry: DocumentCacheEntity) {
    runCatching { File(entry.localPath).delete() }
    cacheDao.deleteById(entry.fileId)
  }

  companion object {
    const val KEY_FILE_ID = "fileId"
    const val KEY_FILE_NAME = "fileName"
    const val KEY_URL = "url"
    private const val STATUS_DOWNLOADING = "DOWNLOADING"
    private const val STATUS_COMPLETE = "COMPLETE"
    private const val STATUS_FAILED = "FAILED"
  }
}
