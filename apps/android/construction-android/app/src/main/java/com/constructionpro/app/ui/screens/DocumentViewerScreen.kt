package com.constructionpro.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.DocumentDownloadWorker
import com.constructionpro.app.data.local.DownloadEntryEntity
import com.constructionpro.app.data.model.DocumentSummary
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.document.ImageDocumentViewer
import com.constructionpro.app.ui.document.SimplePdfViewer
import com.constructionpro.app.ui.document.UnsupportedFileView
import com.constructionpro.app.ui.document.VideoDocumentPlayer
import com.constructionpro.app.ui.theme.*
import com.constructionpro.app.util.FileTypeDetector
import com.constructionpro.app.util.ViewableFileType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class ViewerState(
    val loading: Boolean = true,
    val document: DocumentSummary? = null,
    val fileUrl: String? = null,
    val cachedFilePath: String? = null,
    val error: String? = null,
    val downloadProgress: Int = 0,
    val isDownloading: Boolean = false
)

/**
 * Full-screen document viewer with support for PDFs, images, videos
 * Includes prev/next navigation when viewing from a list
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentViewerScreen(
    apiService: ApiService,
    documentId: String,
    allDocumentIds: List<String> = emptyList(),
    onBack: () -> Unit,
    onNavigateToDocument: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(ViewerState()) }
    val db = remember { AppDatabase.getInstance(context) }
    val cacheDao = remember { db.documentCacheDao() }
    val downloadDao = remember { db.downloadEntryDao() }
    val workManager = remember { WorkManager.getInstance(context) }

    // Navigation helpers
    val currentIndex = allDocumentIds.indexOf(documentId)
    val hasPrevious = currentIndex > 0
    val hasNext = currentIndex < allDocumentIds.size - 1

    // Load document details
    fun loadDocument() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                // Get document details
                val response = withContext(Dispatchers.IO) {
                    apiService.getDocument(documentId)
                }
                val doc = response.document

                // Get signed URL
                val urlResponse = withContext(Dispatchers.IO) {
                    apiService.getFileUrl(documentId, download = true)
                }

                // Check cache for PDFs
                val cache = withContext(Dispatchers.IO) {
                    cacheDao.getById(documentId)
                }

                state = state.copy(
                    loading = false,
                    document = DocumentSummary(
                        id = doc.id,
                        name = doc.name,
                        type = doc.type,
                        category = doc.category,
                        description = doc.description,
                        storagePath = doc.storagePath,
                        createdAt = doc.createdAt,
                        project = doc.project,
                        metadata = doc.metadata,
                        count = doc.count
                    ),
                    fileUrl = urlResponse.url,
                    cachedFilePath = cache?.localPath
                )
            } catch (e: Exception) {
                state = state.copy(
                    loading = false,
                    error = e.message ?: "Failed to load document"
                )
            }
        }
    }

    // Download PDF for local viewing
    fun downloadPdf(url: String, fileName: String) {
        scope.launch {
            withContext(Dispatchers.IO) {
                downloadDao.upsert(
                    DownloadEntryEntity(
                        fileId = documentId,
                        fileName = fileName,
                        progress = 0,
                        status = "QUEUED",
                        updatedAt = System.currentTimeMillis()
                    )
                )
            }
        }

        val input = Data.Builder()
            .putString(DocumentDownloadWorker.KEY_FILE_ID, documentId)
            .putString(DocumentDownloadWorker.KEY_FILE_NAME, fileName)
            .putString(DocumentDownloadWorker.KEY_URL, url)
            .build()

        val request = OneTimeWorkRequestBuilder<DocumentDownloadWorker>()
            .setInputData(input)
            .addTag("download_$documentId")
            .build()

        workManager.enqueue(request)
        state = state.copy(isDownloading = true)
    }

    // Monitor download progress
    LaunchedEffect(documentId) {
        while (true) {
            val entry = withContext(Dispatchers.IO) { downloadDao.getById(documentId) }
            val cache = withContext(Dispatchers.IO) { cacheDao.getById(documentId) }

            if (entry != null) {
                state = state.copy(
                    downloadProgress = entry.progress,
                    isDownloading = entry.status == "QUEUED" || entry.status == "DOWNLOADING"
                )
            }

            if (cache != null && state.cachedFilePath == null) {
                state = state.copy(cachedFilePath = cache.localPath, isDownloading = false)
            }

            delay(1000)
        }
    }

    LaunchedEffect(documentId) {
        loadDocument()
    }

    val fileName = state.document?.name ?: "Document"
    val fileType = FileTypeDetector.detect(fileName)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.95f))
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.Black.copy(alpha = 0.8f)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = AppSpacing.sm, vertical = AppSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Close button
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color.White
                        )
                    }

                    // Previous button (if multiple documents)
                    if (allDocumentIds.size > 1) {
                        IconButton(
                            onClick = {
                                if (hasPrevious) {
                                    onNavigateToDocument(allDocumentIds[currentIndex - 1])
                                }
                            },
                            enabled = hasPrevious
                        ) {
                            Icon(
                                imageVector = Icons.Default.ChevronLeft,
                                contentDescription = "Previous",
                                tint = if (hasPrevious) Color.White else Color.White.copy(alpha = 0.3f)
                            )
                        }
                    }

                    // File info (centered)
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = fileName,
                            style = AppTypography.bodyBold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = fileType.label,
                                style = AppTypography.caption,
                                color = Color.White.copy(alpha = 0.6f)
                            )
                            if (allDocumentIds.size > 1) {
                                Text(
                                    text = "•",
                                    color = Color.White.copy(alpha = 0.4f)
                                )
                                Text(
                                    text = "${currentIndex + 1} of ${allDocumentIds.size}",
                                    style = AppTypography.caption,
                                    color = Color.White.copy(alpha = 0.6f)
                                )
                            }
                        }
                    }

                    // Next button (if multiple documents)
                    if (allDocumentIds.size > 1) {
                        IconButton(
                            onClick = {
                                if (hasNext) {
                                    onNavigateToDocument(allDocumentIds[currentIndex + 1])
                                }
                            },
                            enabled = hasNext
                        ) {
                            Icon(
                                imageVector = Icons.Default.ChevronRight,
                                contentDescription = "Next",
                                tint = if (hasNext) Color.White else Color.White.copy(alpha = 0.3f)
                            )
                        }
                    }

                    // Share button
                    IconButton(
                        onClick = {
                            state.fileUrl?.let { url ->
                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_SUBJECT, "Document: $fileName")
                                    putExtra(Intent.EXTRA_TEXT, url)
                                }
                                context.startActivity(Intent.createChooser(shareIntent, "Share"))
                            }
                        },
                        enabled = state.fileUrl != null
                    ) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "Share",
                            tint = if (state.fileUrl != null) Color.White else Color.White.copy(alpha = 0.3f)
                        )
                    }
                }
            }

            // Content area
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                when {
                    state.loading -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                            ) {
                                CircularProgressIndicator(color = Color.White)
                                Text(
                                    text = "Loading document...",
                                    style = AppTypography.secondary,
                                    color = Color.White.copy(alpha = 0.7f)
                                )
                            }
                        }
                    }
                    state.error != null -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Warning,
                                    contentDescription = null,
                                    modifier = Modifier.size(64.dp),
                                    tint = ConstructionOrange
                                )
                                Text(
                                    text = "Could not load document",
                                    style = AppTypography.heading3,
                                    color = Color.White
                                )
                                Text(
                                    text = state.error ?: "",
                                    style = AppTypography.secondary,
                                    color = Color.White.copy(alpha = 0.7f)
                                )
                                Spacer(modifier = Modifier.height(AppSpacing.md))
                                Button(
                                    onClick = { loadDocument() },
                                    colors = ButtonDefaults.buttonColors(containerColor = Primary600)
                                ) {
                                    Text("Try Again")
                                }
                            }
                        }
                    }
                    else -> {
                        // Route to appropriate viewer
                        when (fileType) {
                            ViewableFileType.PDF -> {
                                val cachedPath = state.cachedFilePath
                                if (cachedPath != null) {
                                    SimplePdfViewer(
                                        filePath = cachedPath,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                } else if (state.isDownloading) {
                                    // Show download progress
                                    Box(
                                        modifier = Modifier.fillMaxSize(),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                                        ) {
                                            CircularProgressIndicator(
                                                progress = { state.downloadProgress / 100f },
                                                color = Primary600,
                                                trackColor = Color.White.copy(alpha = 0.2f)
                                            )
                                            Text(
                                                text = "Downloading... ${state.downloadProgress}%",
                                                style = AppTypography.secondary,
                                                color = Color.White.copy(alpha = 0.8f)
                                            )
                                        }
                                    }
                                } else {
                                    // Prompt to download
                                    Box(
                                        modifier = Modifier.fillMaxSize(),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            verticalArrangement = Arrangement.spacedBy(AppSpacing.md)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.CloudDownload,
                                                contentDescription = null,
                                                modifier = Modifier.size(64.dp),
                                                tint = Primary600
                                            )
                                            Text(
                                                text = "Download Required",
                                                style = AppTypography.heading3,
                                                color = Color.White
                                            )
                                            Text(
                                                text = "Download this PDF to view it",
                                                style = AppTypography.secondary,
                                                color = Color.White.copy(alpha = 0.7f)
                                            )
                                            Spacer(modifier = Modifier.height(AppSpacing.md))
                                            state.fileUrl?.let { url ->
                                                Button(
                                                    onClick = { downloadPdf(url, fileName) },
                                                    colors = ButtonDefaults.buttonColors(containerColor = Primary600)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Download,
                                                        contentDescription = null
                                                    )
                                                    Spacer(modifier = Modifier.width(AppSpacing.sm))
                                                    Text("Download Now")
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            ViewableFileType.IMAGE -> {
                                state.fileUrl?.let { url ->
                                    ImageDocumentViewer(
                                        url = url,
                                        modifier = Modifier.fillMaxSize(),
                                        contentDescription = fileName
                                    )
                                }
                            }
                            ViewableFileType.VIDEO -> {
                                state.fileUrl?.let { url ->
                                    VideoDocumentPlayer(
                                        url = url,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                            }
                            ViewableFileType.UNSUPPORTED -> {
                                UnsupportedFileView(
                                    fileName = fileName,
                                    fileSize = null,
                                    fileUrl = state.fileUrl,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
