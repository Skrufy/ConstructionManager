package com.constructionpro.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.constructionpro.app.R
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.PendingActionEntity
import com.constructionpro.app.data.local.PendingActionScheduler
import com.constructionpro.app.data.local.PendingPhotoEntity
import com.constructionpro.app.data.local.PendingPhotoStatus
import com.constructionpro.app.data.local.PendingFileEntity
import com.constructionpro.app.data.local.PendingFileStatus
import com.constructionpro.app.data.local.PendingStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncQueueScreen(
  onBack: () -> Unit,
  onResolveDailyLogUpdate: (String) -> Unit
) {
  val context = androidx.compose.ui.platform.LocalContext.current
  val scope = rememberCoroutineScope()
  val db = remember { AppDatabase.getInstance(context) }
  val pendingDao = remember { db.pendingActionDao() }
  val pendingPhotoDao = remember { db.pendingPhotoDao() }
  val pendingFileDao = remember { db.pendingFileDao() }

  var pending by remember { mutableStateOf<List<PendingActionEntity>>(emptyList()) }
  var failed by remember { mutableStateOf<List<PendingActionEntity>>(emptyList()) }
  var pendingPhotos by remember { mutableStateOf<List<PendingPhotoEntity>>(emptyList()) }
  var failedPhotos by remember { mutableStateOf<List<PendingPhotoEntity>>(emptyList()) }
  var pendingFiles by remember { mutableStateOf<List<PendingFileEntity>>(emptyList()) }
  var failedFiles by remember { mutableStateOf<List<PendingFileEntity>>(emptyList()) }

  fun loadQueue() {
    scope.launch {
      val pendingItems = withContext(Dispatchers.IO) { pendingDao.getByStatus(PendingStatus.PENDING) }
      val failedItems = withContext(Dispatchers.IO) { pendingDao.getByStatus(PendingStatus.FAILED) }
      val pendingPhotoItems = withContext(Dispatchers.IO) { pendingPhotoDao.getByStatus(PendingPhotoStatus.PENDING) }
      val failedPhotoItems = withContext(Dispatchers.IO) { pendingPhotoDao.getByStatus(PendingPhotoStatus.FAILED) }
      val pendingFileItems = withContext(Dispatchers.IO) { pendingFileDao.getByStatus(PendingFileStatus.PENDING) }
      val failedFileItems = withContext(Dispatchers.IO) { pendingFileDao.getByStatus(PendingFileStatus.FAILED) }
      pending = pendingItems
      failed = failedItems
      pendingPhotos = pendingPhotoItems
      failedPhotos = failedPhotoItems
      pendingFiles = pendingFileItems
      failedFiles = failedFileItems
    }
  }

  fun retryAction(action: PendingActionEntity) {
    scope.launch {
      withContext(Dispatchers.IO) {
        pendingDao.updateStatus(
          id = action.id,
          status = PendingStatus.PENDING,
          retryCount = 0,
          lastAttemptAt = null,
          lastError = null
        )
      }
      PendingActionScheduler.enqueue(context)
      loadQueue()
    }
  }

  fun deleteAction(action: PendingActionEntity) {
    scope.launch {
      withContext(Dispatchers.IO) { pendingDao.deleteById(action.id) }
      loadQueue()
    }
  }

  fun retryAllFailed() {
    scope.launch {
      withContext(Dispatchers.IO) {
        failed.forEach { action ->
          pendingDao.updateStatus(
            id = action.id,
            status = PendingStatus.PENDING,
            retryCount = 0,
            lastAttemptAt = null,
            lastError = null
          )
        }
      }
      PendingActionScheduler.enqueue(context)
      loadQueue()
    }
  }

  fun clearFailed() {
    scope.launch {
      withContext(Dispatchers.IO) {
        failed.forEach { pendingDao.deleteById(it.id) }
      }
      loadQueue()
    }
  }

  fun retryPhoto(photo: PendingPhotoEntity) {
    scope.launch {
      withContext(Dispatchers.IO) {
        pendingPhotoDao.updateStatus(photo.id, PendingPhotoStatus.PENDING, 0, null)
      }
      PendingActionScheduler.enqueue(context)
      loadQueue()
    }
  }

  fun deletePhoto(photo: PendingPhotoEntity) {
    scope.launch {
      withContext(Dispatchers.IO) {
        runCatching { java.io.File(photo.localPath).delete() }
        pendingPhotoDao.deleteById(photo.id)
      }
      loadQueue()
    }
  }

  fun retryFile(entry: PendingFileEntity) {
    scope.launch {
      withContext(Dispatchers.IO) {
        pendingFileDao.updateStatus(entry.id, PendingFileStatus.PENDING, 0, null)
      }
      PendingActionScheduler.enqueue(context)
      loadQueue()
    }
  }

  fun deleteFile(entry: PendingFileEntity) {
    scope.launch {
      withContext(Dispatchers.IO) {
        runCatching { java.io.File(entry.localPath).delete() }
        pendingFileDao.deleteById(entry.id)
      }
      loadQueue()
    }
  }

  LaunchedEffect(Unit) {
    while (true) {
      loadQueue()
      delay(2000)
    }
  }

  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text(stringResource(R.string.sync_queue_title)) },
        navigationIcon = {
          TextButton(onClick = onBack) {
            Text(stringResource(R.string.common_back))
          }
        }
      )
    }
  ) { padding ->
    Column(
      modifier = Modifier
        .padding(padding)
        .fillMaxSize()
        .padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(onClick = { PendingActionScheduler.enqueue(context) }) { Text(stringResource(R.string.settings_sync_now)) }
        Button(onClick = { retryAllFailed() }, enabled = failed.isNotEmpty()) { Text(stringResource(R.string.sync_queue_retry)) }
        Button(onClick = { clearFailed() }, enabled = failed.isNotEmpty()) { Text(stringResource(R.string.offline_cache_clear)) }
      }

      Text(stringResource(R.string.sync_queue_pending, pending.size) + "  " + stringResource(R.string.sync_queue_failed, failed.size))
      Text(stringResource(R.string.sync_queue_pending, pendingPhotos.size) + "  " + stringResource(R.string.sync_queue_failed, failedPhotos.size))
      Text(stringResource(R.string.sync_queue_pending, pendingFiles.size) + "  " + stringResource(R.string.sync_queue_failed, failedFiles.size))

      if (pending.isNotEmpty()) {
        Text("Pending actions")
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          items(pending) { action ->
            QueueItem(action, onRetry = { retryAction(action) }, onDelete = { deleteAction(action) })
          }
        }
      }

      if (failed.isNotEmpty()) {
        Text("Failed actions")
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          items(failed) { action ->
            val resolve = if (action.type == com.constructionpro.app.data.local.PendingActionTypes.DAILY_LOG_UPDATE) {
              { onResolveDailyLogUpdate(action.id) }
            } else {
              null
            }
            QueueItem(
              action = action,
              onRetry = { retryAction(action) },
              onDelete = { deleteAction(action) },
              onResolve = resolve
            )
          }
        }
      }

      if (pendingPhotos.isNotEmpty()) {
        Text("Pending photos")
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          items(pendingPhotos) { photo ->
            PhotoQueueItem(photo, onRetry = { retryPhoto(photo) }, onDelete = { deletePhoto(photo) })
          }
        }
      }

      if (failedPhotos.isNotEmpty()) {
        Text("Failed photos")
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          items(failedPhotos) { photo ->
            PhotoQueueItem(photo, onRetry = { retryPhoto(photo) }, onDelete = { deletePhoto(photo) })
          }
        }
      }

      if (pendingFiles.isNotEmpty()) {
        Text("Pending files")
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          items(pendingFiles) { entry ->
            FileQueueItem(entry, onRetry = { retryFile(entry) }, onDelete = { deleteFile(entry) })
          }
        }
      }

      if (failedFiles.isNotEmpty()) {
        Text("Failed files")
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          items(failedFiles) { entry ->
            FileQueueItem(entry, onRetry = { retryFile(entry) }, onDelete = { deleteFile(entry) })
          }
        }
      }
    }
  }
}

@Composable
private fun QueueItem(
  action: PendingActionEntity,
  onRetry: () -> Unit,
  onDelete: () -> Unit,
  onResolve: (() -> Unit)? = null
) {
  Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
    Text("${action.type} (${action.status})")
    action.resourceId?.let { Text("Resource: $it") }
    Text("Retries: ${action.retryCount}")
    action.lastError?.let { Text("Error: $it") }
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      Button(onClick = onRetry) { Text(stringResource(R.string.sync_queue_retry)) }
      if (onResolve != null) {
        Button(onClick = onResolve) { Text(stringResource(R.string.common_view)) }
      }
      Button(onClick = onDelete) { Text(stringResource(R.string.sync_queue_delete)) }
    }
  }
}

@Composable
private fun PhotoQueueItem(
  photo: PendingPhotoEntity,
  onRetry: () -> Unit,
  onDelete: () -> Unit
) {
  Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
    Text("Photo (${photo.status})")
    Text("Log: ${photo.dailyLogId}")
    Text("Retries: ${photo.retryCount}")
    photo.lastError?.let { Text("Error: $it") }
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      Button(onClick = onRetry) { Text(stringResource(R.string.sync_queue_retry)) }
      Button(onClick = onDelete) { Text(stringResource(R.string.sync_queue_delete)) }
    }
  }
}

@Composable
private fun FileQueueItem(
  entry: PendingFileEntity,
  onRetry: () -> Unit,
  onDelete: () -> Unit
) {
  Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
    Text("File (${entry.status})")
    Text("Project: ${entry.projectId}")
    Text("Category: ${entry.category}")
    Text("Retries: ${entry.retryCount}")
    entry.lastError?.let { Text("Error: $it") }
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      Button(onClick = onRetry) { Text(stringResource(R.string.sync_queue_retry)) }
      Button(onClick = onDelete) { Text(stringResource(R.string.sync_queue_delete)) }
    }
  }
}
