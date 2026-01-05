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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.DocumentCacheEntity
import com.constructionpro.app.data.local.DownloadEntryEntity
import com.constructionpro.app.data.local.OfflineCachePreferences
import com.constructionpro.app.data.local.OfflineCacheSettings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.delay
import java.io.File
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OfflineCacheScreen(
  onBack: () -> Unit
) {
  val scope = rememberCoroutineScope()
  val context = LocalContext.current
  val db = remember { AppDatabase.getInstance(context) }
  val cacheDao = remember { db.documentCacheDao() }
  val downloadDao = remember { db.downloadEntryDao() }
  val prefs = remember { OfflineCachePreferences(context) }

  var cached by remember { mutableStateOf<List<DocumentCacheEntity>>(emptyList()) }
  var downloads by remember { mutableStateOf<List<DownloadEntryEntity>>(emptyList()) }
  var totalSizeBytes by remember { mutableStateOf(0L) }
  var settings by remember { mutableStateOf(OfflineCacheSettings(maxSizeMb = 2048, maxAgeDays = 30)) }
  var maxSizeText by remember { mutableStateOf("2048") }
  var maxAgeText by remember { mutableStateOf("30") }
  var error by remember { mutableStateOf<String?>(null) }

  fun loadCache() {
    scope.launch {
      val cache = withContext(Dispatchers.IO) { cacheDao.getAll() }
      val downloadsList = withContext(Dispatchers.IO) { downloadDao.getAll() }
      val total = withContext(Dispatchers.IO) { cacheDao.getTotalSizeBytes() ?: 0L }
      cached = cache
      downloads = downloadsList
      totalSizeBytes = total
    }
  }

  fun applySettings() {
    val maxSize = maxSizeText.toIntOrNull()
    val maxAge = maxAgeText.toIntOrNull()
    if (maxSize == null || maxSize <= 0 || maxAge == null || maxAge <= 0) {
      error = "Enter valid cache limits."
      return
    }
    scope.launch {
      prefs.updateMaxSizeMb(maxSize)
      prefs.updateMaxAgeDays(maxAge)
      error = null
      settings = settings.copy(maxSizeMb = maxSize, maxAgeDays = maxAge)
    }
  }

  fun purgeExpired() {
    scope.launch {
      val cutoff = System.currentTimeMillis() - settings.maxAgeDays.toLong() * 24L * 60L * 60L * 1000L
      val toDelete = withContext(Dispatchers.IO) { cacheDao.getAll().filter { it.downloadedAt < cutoff } }
      withContext(Dispatchers.IO) {
        toDelete.forEach { entry ->
          runCatching { File(entry.localPath).delete() }
          cacheDao.deleteById(entry.fileId)
        }
      }
      loadCache()
    }
  }

  fun clearAll() {
    scope.launch {
      withContext(Dispatchers.IO) {
        cacheDao.getAll().forEach { entry ->
          runCatching { File(entry.localPath).delete() }
        }
        cacheDao.deleteAll()
      }
      loadCache()
    }
  }

  LaunchedEffect(Unit) {
    while (true) {
      loadCache()
      delay(2000)
    }
  }

  LaunchedEffect(Unit) {
    prefs.settingsFlow.collectLatest { value ->
      settings = value
      maxSizeText = value.maxSizeMb.toString()
      maxAgeText = value.maxAgeDays.toString()
    }
  }

  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text(stringResource(R.string.offline_cache_title)) },
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
      Text(stringResource(R.string.offline_cache_size, formatSize(totalSizeBytes)))
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(onClick = { loadCache() }) { Text(stringResource(R.string.common_refresh)) }
        Button(onClick = { purgeExpired() }) { Text(stringResource(R.string.common_delete)) }
        Button(onClick = { clearAll() }) { Text(stringResource(R.string.offline_cache_clear)) }
      }

      Text("Cache limits")
      OutlinedTextField(
        value = maxSizeText,
        onValueChange = { maxSizeText = it },
        label = { Text("Max size (MB)") },
        modifier = Modifier.fillMaxWidth()
      )
      OutlinedTextField(
        value = maxAgeText,
        onValueChange = { maxAgeText = it },
        label = { Text("Max age (days)") },
        modifier = Modifier.fillMaxWidth()
      )
      Button(onClick = { applySettings() }) { Text(stringResource(R.string.settings_apply)) }
      error?.let { Text("${stringResource(R.string.common_error)}: $it") }

      if (downloads.isNotEmpty()) {
        Text("Downloads")
        downloads.forEach { download ->
          Text("${download.fileName} - ${download.status} ${download.progress}%")
        }
      }

      Text("Cached documents")
      LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(cached) { entry ->
          CachedItem(entry = entry, onDelete = {
            scope.launch {
              withContext(Dispatchers.IO) {
                runCatching { File(entry.localPath).delete() }
                cacheDao.deleteById(entry.fileId)
              }
              loadCache()
            }
          })
        }
      }
    }
  }
}

@Composable
private fun CachedItem(entry: DocumentCacheEntity, onDelete: () -> Unit) {
  Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
    Text(entry.fileName)
    Text("Size: ${formatSize(entry.fileSizeBytes)}")
    Text("Saved: ${entry.downloadedAt}")
    Button(onClick = onDelete) { Text(stringResource(R.string.common_delete)) }
  }
}

private fun formatSize(bytes: Long): String {
  if (bytes <= 0) return "0 B"
  val kb = bytes / 1024.0
  if (kb < 1024) return "${kb.roundToInt()} KB"
  val mb = kb / 1024.0
  if (mb < 1024) return String.format("%.1f MB", mb)
  val gb = mb / 1024.0
  return String.format("%.2f GB", gb)
}
