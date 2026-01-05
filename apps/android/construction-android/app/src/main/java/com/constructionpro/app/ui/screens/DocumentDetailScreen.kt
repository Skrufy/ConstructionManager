package com.constructionpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.DocumentCalibrationEntity
import com.constructionpro.app.data.local.DocumentCacheEntity
import com.constructionpro.app.data.local.DocumentDownloadWorker
import com.constructionpro.app.data.local.PendingActionEntity
import com.constructionpro.app.data.local.PendingActionScheduler
import com.constructionpro.app.data.local.PendingActionTypes
import com.constructionpro.app.data.local.PendingAnnotationPayload
import com.constructionpro.app.data.local.PendingStatus
import com.constructionpro.app.data.local.toSummary
import com.constructionpro.app.data.model.AnnotationCreateRequest
import com.constructionpro.app.data.model.DocumentAnnotation
import com.constructionpro.app.data.model.DocumentDetail
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.pdf.AnnotationDraft
import com.constructionpro.app.ui.pdf.AnnotationTool
import com.constructionpro.app.ui.pdf.CalibrationLine
import com.constructionpro.app.ui.pdf.PageCalibration
import com.constructionpro.app.ui.pdf.PdfPageViewer
import com.constructionpro.app.ui.pdf.PdfThumbnailStrip
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import android.content.Intent
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import java.io.IOException
import java.util.UUID
import retrofit2.HttpException

private data class DocumentDetailState(
    val loading: Boolean = false,
    val document: DocumentDetail? = null,
    val error: String? = null,
    val fileUrl: String? = null,
    val cachedFile: DocumentCacheEntity? = null,
    val offline: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentDetailScreen(
    apiService: ApiService,
    documentId: String,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(DocumentDetailState(loading = true)) }
    var pageIndex by remember { mutableStateOf(0) }
    var tool by remember { mutableStateOf(AnnotationTool.PAN) }
    var annotationError by remember { mutableStateOf<String?>(null) }
    var calibration by remember { mutableStateOf<PageCalibration?>(null) }
    var pendingCalibration by remember { mutableStateOf<CalibrationLine?>(null) }
    var calibrationValue by remember { mutableStateOf("") }
    var calibrationUnit by remember { mutableStateOf("ft") }
    var pageCount by remember { mutableStateOf(1) }
    var pendingAnnotations by remember { mutableStateOf<List<AnnotationDraft>>(emptyList()) }
    var resetToken by remember { mutableStateOf(0) }
    var downloadEntry by remember { mutableStateOf<com.constructionpro.app.data.local.DownloadEntryEntity?>(null) }
    var showCalibrationDialog by remember { mutableStateOf(false) }
    val db = remember { AppDatabase.getInstance(context) }
    val cacheDao = remember { db.documentCacheDao() }
    val calibrationDao = remember { db.documentCalibrationDao() }
    val documentDao = remember { db.documentDao() }
    val pendingDao = remember { db.pendingActionDao() }
    val downloadDao = remember { db.downloadEntryDao() }
    val workManager = remember { WorkManager.getInstance(context) }
    val json = remember { Json { ignoreUnknownKeys = true; encodeDefaults = true } }

    fun loadDocument() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) { apiService.getDocument(documentId) }
                val cache = withContext(Dispatchers.IO) { cacheDao.getById(documentId) }
                state = state.copy(loading = false, document = response.document, cachedFile = cache, offline = false)
            } catch (error: Exception) {
                val cached = withContext(Dispatchers.IO) { documentDao.getById(documentId) }
                val cache = withContext(Dispatchers.IO) { cacheDao.getById(documentId) }
                val fallback = cached?.toSummary()
                state = state.copy(
                    loading = false,
                    document = fallback?.let {
                        DocumentDetail(
                            id = it.id,
                            name = it.name,
                            type = it.type,
                            category = it.category,
                            createdAt = it.createdAt,
                            project = it.project,
                            metadata = it.metadata,
                            revisions = emptyList(),
                            annotations = emptyList(),
                            count = it.count
                        )
                    },
                    cachedFile = cache,
                    offline = cache != null,
                    error = if (fallback == null) (error.message ?: "Failed to load document") else null
                )
            }
        }
    }

    fun loadFileUrl() {
        scope.launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getFileUrl(documentId, download = true)
                }
                state = state.copy(fileUrl = response.url)
            } catch (error: Exception) {
                state = state.copy(error = error.message ?: "Failed to fetch file url")
            }
        }
    }

    fun refreshCache() {
        scope.launch {
            val cache = withContext(Dispatchers.IO) { cacheDao.getById(documentId) }
            state = state.copy(cachedFile = cache)
            downloadEntry = withContext(Dispatchers.IO) { downloadDao.getById(documentId) }
        }
    }

    LaunchedEffect(documentId) {
        loadDocument()
        loadFileUrl()
    }

    LaunchedEffect(documentId) {
        while (true) {
            downloadEntry = withContext(Dispatchers.IO) { downloadDao.getById(documentId) }
            val cache = withContext(Dispatchers.IO) { cacheDao.getById(documentId) }
            if (cache != null && state.cachedFile == null) {
                state = state.copy(cachedFile = cache)
            }
            delay(2000)
        }
    }

    LaunchedEffect(pageIndex, documentId) {
        val calibrationEntity = withContext(Dispatchers.IO) {
            calibrationDao.getCalibration(documentId, pageIndex + 1)
        }
        calibration = calibrationEntity?.let {
            PageCalibration(unitsPerPoint = it.unitsPerPoint, unitLabel = it.unitLabel)
        }
    }

    LaunchedEffect(documentId, pageIndex) {
        val pending = withContext(Dispatchers.IO) {
            pendingDao.getByTypeAndResource(
                type = PendingActionTypes.ANNOTATION_CREATE,
                resourceId = documentId,
                status = PendingStatus.PENDING
            )
        }.mapNotNull { action ->
            val payload = runCatching {
                json.decodeFromString(PendingAnnotationPayload.serializer(), action.payloadJson)
            }.getOrNull()
            payload?.request?.let { request ->
                AnnotationDraft(
                    type = request.annotationType,
                    pageNumber = request.pageNumber ?: 1,
                    points = extractPoints(request.content),
                    measurement = extractMeasurement(request.content)
                )
            }
        }
        pendingAnnotations = pending
    }

    LaunchedEffect(state.cachedFile?.localPath) {
        val path = state.cachedFile?.localPath ?: return@LaunchedEffect
        val count = withContext(Dispatchers.IO) {
            val file = File(path)
            if (!file.exists()) {
                1
            } else {
                val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
                val renderer = PdfRenderer(descriptor)
                val total = renderer.pageCount
                renderer.close()
                descriptor.close()
                total
            }
        }
        pageCount = count.coerceAtLeast(1)
        if (pageIndex >= pageCount) {
            pageIndex = pageCount - 1
        }
        state.cachedFile?.let { cache ->
            withContext(Dispatchers.IO) {
                cacheDao.touch(cache.fileId, System.currentTimeMillis())
            }
        }
    }

    fun enqueueDownload(url: String, fileName: String) {
        scope.launch {
            withContext(Dispatchers.IO) {
                downloadDao.upsert(
                    com.constructionpro.app.data.local.DownloadEntryEntity(
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
        scope.launch {
            downloadEntry = withContext(Dispatchers.IO) { downloadDao.getById(documentId) }
        }
    }

    fun createAnnotation(draft: AnnotationDraft) {
        scope.launch {
            annotationError = null
            try {
                val content = buildJsonObject {
                    put("points", buildJsonArray {
                        draft.points.forEach { point ->
                            add(buildJsonObject {
                                put("x", JsonPrimitive(point.x))
                                put("y", JsonPrimitive(point.y))
                            })
                        }
                    })
                    draft.measurement?.let { measurement ->
                        put("value", JsonPrimitive(measurement.value))
                        put("unit", JsonPrimitive(measurement.unit))
                    }
                }
                val response = withContext(Dispatchers.IO) {
                    apiService.createAnnotation(
                        fileId = documentId,
                        request = AnnotationCreateRequest(
                            annotationType = draft.type,
                            content = content,
                            pageNumber = draft.pageNumber
                        )
                    )
                }
                val updatedAnnotations = state.document?.annotations?.toMutableList() ?: mutableListOf()
                response.annotation?.let { updatedAnnotations.add(it) }
                state.document?.let {
                    state = state.copy(document = it.copy(annotations = updatedAnnotations))
                }
            } catch (error: Exception) {
                if (shouldQueueOffline(error)) {
                    val payload = PendingAnnotationPayload(
                        documentId = documentId,
                        request = AnnotationCreateRequest(
                            annotationType = draft.type,
                            content = buildJsonObject {
                                put("points", buildJsonArray {
                                    draft.points.forEach { point ->
                                        add(buildJsonObject {
                                            put("x", JsonPrimitive(point.x))
                                            put("y", JsonPrimitive(point.y))
                                        })
                                    }
                                })
                                draft.measurement?.let { measurement ->
                                    put("value", JsonPrimitive(measurement.value))
                                    put("unit", JsonPrimitive(measurement.unit))
                                }
                            },
                            pageNumber = draft.pageNumber
                        )
                    )
                    val action = PendingActionEntity(
                        id = UUID.randomUUID().toString(),
                        type = PendingActionTypes.ANNOTATION_CREATE,
                        resourceId = documentId,
                        payloadJson = json.encodeToString(payload),
                        status = PendingStatus.PENDING,
                        retryCount = 0,
                        createdAt = System.currentTimeMillis()
                    )
                    withContext(Dispatchers.IO) { pendingDao.upsert(action) }
                    PendingActionScheduler.enqueue(context)
                    pendingAnnotations = pendingAnnotations + draft
                    annotationError = "Saved offline. Will sync when online."
                } else {
                    annotationError = error.message ?: "Failed to save annotation"
                }
            }
        }
    }

    fun saveCalibration(line: CalibrationLine, realValue: Double, unit: String) {
        val distance = distance(line.points.first(), line.points.last())
        if (distance == 0.0) return
        val unitsPerPoint = realValue / distance
        scope.launch {
            val entity = DocumentCalibrationEntity(
                fileId = documentId,
                pageNumber = line.pageNumber,
                unitsPerPoint = unitsPerPoint,
                unitLabel = unit,
                updatedAt = System.currentTimeMillis()
            )
            withContext(Dispatchers.IO) {
                calibrationDao.upsert(entity)
            }
            calibration = PageCalibration(unitsPerPoint = unitsPerPoint, unitLabel = unit)
        }
    }

    // Calibration Dialog
    if (showCalibrationDialog && pendingCalibration != null) {
        AlertDialog(
            onDismissRequest = { showCalibrationDialog = false },
            title = {
                Text(
                    "Set Calibration",
                    style = AppTypography.heading2
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.md)) {
                    Text(
                        "Enter the real-world distance for the line you drew:",
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                    CPTextField(
                        value = calibrationValue,
                        onValueChange = { calibrationValue = it },
                        label = "Distance",
                        placeholder = "e.g., 10",
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                    )
                    CPTextField(
                        value = calibrationUnit,
                        onValueChange = { calibrationUnit = it },
                        label = "Unit",
                        placeholder = "ft, m, in"
                    )
                }
            },
            confirmButton = {
                CPButton(
                    text = stringResource(R.string.common_save),
                    onClick = {
                        val value = calibrationValue.toDoubleOrNull()
                        if (value != null && pendingCalibration != null) {
                            saveCalibration(pendingCalibration!!, value, calibrationUnit.ifBlank { "ft" })
                            showCalibrationDialog = false
                            pendingCalibration = null
                            calibrationValue = ""
                        } else {
                            annotationError = "Enter a valid number"
                        }
                    },
                    size = CPButtonSize.Small
                )
            },
            dismissButton = {
                CPButton(
                    text = "Cancel",
                    onClick = {
                        showCalibrationDialog = false
                        pendingCalibration = null
                    },
                    style = CPButtonStyle.Outline,
                    size = CPButtonSize.Small
                )
            },
            shape = RoundedCornerShape(AppSpacing.md)
        )
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = state.document?.name ?: stringResource(R.string.documents_title),
                subtitle = state.document?.category,
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = stringResource(R.string.common_back),
                            tint = AppColors.textSecondary
                        )
                    }
                },
                actions = {
                    // Share button
                    IconButton(onClick = {
                        val shareUrl = "duggin://document/$documentId"
                        val docName = state.document?.name ?: "Document"
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, "Check out this document: $docName")
                            putExtra(Intent.EXTRA_TEXT, "Check out this document: $docName\n$shareUrl")
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Share Document"))
                    }) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "Share",
                            tint = Primary600
                        )
                    }

                    // Download/Refresh button
                    val url = state.fileUrl
                    if (state.cachedFile == null && url != null) {
                        IconButton(onClick = {
                            val name = state.document?.name ?: "document.pdf"
                            enqueueDownload(url, name)
                        }) {
                            Icon(
                                imageVector = Icons.Default.Download,
                                contentDescription = stringResource(R.string.documents_download),
                                tint = Primary600
                            )
                        }
                    } else {
                        IconButton(onClick = { refreshCache() }) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Refresh",
                                tint = AppColors.textSecondary
                            )
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Loading State
            if (state.loading) {
                CPLoadingIndicator(message = "Loading document...")
            }

            // Error Banner
            state.error?.let { error ->
                Box(modifier = Modifier.padding(AppSpacing.md)) {
                    CPErrorBanner(
                        message = error,
                        onRetry = { loadDocument() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Offline Indicator
            if (state.offline) {
                Box(modifier = Modifier.padding(horizontal = AppSpacing.md)) {
                    CPOfflineIndicator()
                }
            }

            // Download Progress
            downloadEntry?.let { entry ->
                if (entry.status == "QUEUED" || entry.status == "DOWNLOADING") {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(AppSpacing.md),
                        shape = RoundedCornerShape(AppSpacing.sm),
                        color = Primary50,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Primary200)
                    ) {
                        Column(
                            modifier = Modifier.padding(AppSpacing.md)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.CloudDownload,
                                        contentDescription = null,
                                        tint = Primary600,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(AppSpacing.xs))
                                    Text(
                                        text = "Downloading for offline use",
                                        style = AppTypography.body,
                                        fontWeight = FontWeight.Medium,
                                        color = Primary700
                                    )
                                }
                                Text(
                                    text = "${entry.progress}%",
                                    style = AppTypography.label,
                                    color = Primary600
                                )
                            }
                            Spacer(modifier = Modifier.height(AppSpacing.xs))
                            LinearProgressIndicator(
                                progress = { entry.progress / 100f },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                                color = Primary600,
                                trackColor = Primary100
                            )
                        }
                    }
                }
            }

            val cachedFile = state.cachedFile
            if (cachedFile == null && !state.loading) {
                // No cached file - show download prompt
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(AppSpacing.md),
                    contentAlignment = Alignment.Center
                ) {
                    CPEmptyState(
                        icon = Icons.Default.CloudDownload,
                        title = "Download Required",
                        description = "Download this document to view and annotate it offline",
                        actionText = if (state.fileUrl != null) "Download Now" else null,
                        onAction = state.fileUrl?.let { url ->
                            {
                                val name = state.document?.name ?: "document.pdf"
                                enqueueDownload(url, name)
                            }
                        }
                    )
                }

                // Document Info Card
                state.document?.let { document ->
                    Column(
                        modifier = Modifier.padding(AppSpacing.md),
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                    ) {
                        CPSectionHeader(title = "Document Info")
                        CPCard {
                            DocumentInfoRow(
                                icon = Icons.Default.Description,
                                label = "Name",
                                value = document.name
                            )
                            document.category?.let {
                                CPDivider()
                                DocumentInfoRow(
                                    icon = Icons.Default.Category,
                                    label = "Category",
                                    value = it
                                )
                            }
                            document.project?.name?.let {
                                CPDivider()
                                DocumentInfoRow(
                                    icon = Icons.Default.Folder,
                                    label = "Project",
                                    value = it
                                )
                            }
                            document.metadata?.drawingNumber?.let {
                                CPDivider()
                                DocumentInfoRow(
                                    icon = Icons.Default.Numbers,
                                    label = "Drawing #",
                                    value = it
                                )
                            }
                        }
                    }
                }
            } else if (cachedFile != null) {
                // Annotation Error Banner
                annotationError?.let { error ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                        shape = RoundedCornerShape(AppSpacing.xs),
                        color = if (error.contains("offline")) Color(0xFFFEF3C7) else Color(0xFFFEE2E2)
                    ) {
                        Row(
                            modifier = Modifier.padding(AppSpacing.sm),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (error.contains("offline")) Icons.Default.CloudSync else Icons.Default.Warning,
                                contentDescription = null,
                                tint = if (error.contains("offline")) Color(0xFF92400E) else ConstructionRed,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text(
                                text = error,
                                style = AppTypography.secondary,
                                color = if (error.contains("offline")) Color(0xFF92400E) else Color(0xFF991B1B),
                                modifier = Modifier.weight(1f)
                            )
                            IconButton(
                                onClick = { annotationError = null },
                                modifier = Modifier.size(AppSpacing.xl)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Dismiss",
                                    modifier = Modifier.size(AppSpacing.md),
                                    tint = AppColors.textSecondary
                                )
                            }
                        }
                    }
                }

                // Pending Annotations Banner
                if (pendingAnnotations.isNotEmpty()) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xxs),
                        shape = RoundedCornerShape(AppSpacing.xs),
                        color = Primary50
                    ) {
                        Row(
                            modifier = Modifier.padding(AppSpacing.sm),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.CloudSync,
                                contentDescription = null,
                                tint = Primary600,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text(
                                text = "${pendingAnnotations.size} pending annotations",
                                style = AppTypography.secondary,
                                color = Primary700
                            )
                        }
                    }
                }

                // Tool Bar
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = AppColors.cardBackground,
                    shadowElevation = 2.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = AppSpacing.xs, vertical = AppSpacing.xs),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        ToolButton(
                            icon = Icons.Default.PanTool,
                            label = "Pan",
                            isSelected = tool == AnnotationTool.PAN,
                            onClick = { tool = AnnotationTool.PAN }
                        )
                        ToolButton(
                            icon = Icons.Default.Straighten,
                            label = "Calibrate",
                            isSelected = tool == AnnotationTool.CALIBRATE,
                            onClick = { tool = AnnotationTool.CALIBRATE }
                        )
                        ToolButton(
                            icon = Icons.Default.Timeline,
                            label = "Line",
                            isSelected = tool == AnnotationTool.LINE,
                            onClick = { tool = AnnotationTool.LINE }
                        )
                        ToolButton(
                            icon = Icons.Default.Gesture,
                            label = "Draw",
                            isSelected = tool == AnnotationTool.FREEHAND,
                            onClick = { tool = AnnotationTool.FREEHAND }
                        )
                        ToolButton(
                            icon = Icons.Default.SquareFoot,
                            label = "Measure",
                            isSelected = tool == AnnotationTool.MEASURE,
                            onClick = { tool = AnnotationTool.MEASURE }
                        )
                        ToolButton(
                            icon = Icons.Default.CenterFocusWeak,
                            label = "Reset",
                            isSelected = false,
                            onClick = { resetToken += 1 }
                        )
                    }
                }

                // Calibration Info
                calibration?.let { cal ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xxs),
                        shape = RoundedCornerShape(AppSpacing.xs),
                        color = ConstructionGreen.copy(alpha = 0.1f)
                    ) {
                        Row(
                            modifier = Modifier.padding(AppSpacing.xs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = ConstructionGreen,
                                modifier = Modifier.size(AppSpacing.md)
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xs))
                            Text(
                                text = "Calibrated: 1px = ${String.format("%.4f", cal.unitsPerPoint)} ${cal.unitLabel}",
                                style = AppTypography.secondary,
                                color = ConstructionGreen
                            )
                        }
                    }
                }

                // PDF Viewer
                val pageAnnotations = (state.document?.annotations
                    ?.mapNotNull { it.toDraft() }
                    ?.filter { it.pageNumber == pageIndex + 1 }
                    ?: emptyList()) + pendingAnnotations.filter { it.pageNumber == pageIndex + 1 }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    PdfPageViewer(
                        filePath = cachedFile.localPath,
                        pageIndex = pageIndex,
                        tool = tool,
                        annotations = pageAnnotations,
                        calibration = calibration,
                        resetToken = resetToken,
                        onAnnotationDraft = { draft -> createAnnotation(draft) },
                        onCalibrationLine = { line ->
                            pendingCalibration = line
                            showCalibrationDialog = true
                        },
                        onMissingCalibration = { annotationError = "Set calibration before measuring" }
                    )
                }

                // Page Navigation
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = AppColors.cardBackground,
                    shadowElevation = 4.dp
                ) {
                    Column {
                        // Thumbnail Strip
                        if (pageCount > 1) {
                            PdfThumbnailStrip(
                                filePath = cachedFile.localPath,
                                pageCount = pageCount,
                                selectedPage = pageIndex,
                                onSelectPage = { pageIndex = it }
                            )
                        }

                        // Page Controls
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(AppSpacing.sm),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CPButton(
                                text = "Previous",
                                onClick = { if (pageIndex > 0) pageIndex -= 1 },
                                enabled = pageIndex > 0,
                                style = CPButtonStyle.Outline,
                                size = CPButtonSize.Small,
                                icon = Icons.Default.ChevronLeft
                            )

                            Text(
                                text = "Page ${pageIndex + 1} of $pageCount",
                                style = AppTypography.heading3,
                                color = AppColors.textPrimary
                            )

                            CPButton(
                                text = "Next",
                                onClick = { if (pageIndex < pageCount - 1) pageIndex += 1 },
                                enabled = pageIndex < pageCount - 1,
                                style = CPButtonStyle.Outline,
                                size = CPButtonSize.Small,
                                icon = Icons.Default.ChevronRight
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ToolButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(AppSpacing.xs))
            .background(if (isSelected) Primary100 else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = AppSpacing.sm, vertical = AppSpacing.xs)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isSelected) Primary600 else AppColors.textSecondary,
            modifier = Modifier.size(AppSpacing.xl)
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            style = AppTypography.caption,
            color = if (isSelected) Primary600 else AppColors.textSecondary,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
        )
    }
}

@Composable
private fun DocumentInfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = AppSpacing.xxs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = AppColors.textMuted
        )
        Spacer(modifier = Modifier.width(AppSpacing.sm))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = AppTypography.secondary,
                color = AppColors.textSecondary
            )
            Text(
                text = value,
                style = AppTypography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = AppColors.textPrimary
            )
        }
    }
}

private fun DocumentAnnotation.toDraft(): AnnotationDraft? {
    val page = pageNumber ?: return null
    val contentObj = content?.jsonObject ?: return null
    val points = contentObj["points"]?.jsonArray?.mapNotNull { pointElement ->
        val obj = pointElement.jsonObject
        val x = obj["x"]?.jsonPrimitive?.doubleOrNull
        val y = obj["y"]?.jsonPrimitive?.doubleOrNull
        if (x != null && y != null) {
            androidx.compose.ui.geometry.Offset(x.toFloat(), y.toFloat())
        } else {
            null
        }
    } ?: return null

    val measurementValue = contentObj["value"]?.jsonPrimitive?.doubleOrNull
    val measurementUnit = contentObj["unit"]?.jsonPrimitive?.contentOrNull
    val measurement = if (measurementValue != null && measurementUnit != null) {
        com.constructionpro.app.ui.pdf.MeasurementInfo(measurementValue, measurementUnit)
    } else {
        null
    }

    return AnnotationDraft(
        type = annotationType ?: "FREEHAND",
        pageNumber = page,
        points = points,
        measurement = measurement
    )
}

private fun distance(a: androidx.compose.ui.geometry.Offset, b: androidx.compose.ui.geometry.Offset): Double {
    val dx = (b.x - a.x).toDouble()
    val dy = (b.y - a.y).toDouble()
    return kotlin.math.hypot(dx, dy)
}

private fun shouldQueueOffline(error: Exception): Boolean {
    return when (error) {
        is IOException -> true
        is HttpException -> error.code() >= 500
        else -> false
    }
}

private fun extractPoints(content: kotlinx.serialization.json.JsonElement): List<androidx.compose.ui.geometry.Offset> {
    val obj = content.jsonObject
    return obj["points"]?.jsonArray?.mapNotNull { pointElement ->
        val pointObj = pointElement.jsonObject
        val x = pointObj["x"]?.jsonPrimitive?.doubleOrNull
        val y = pointObj["y"]?.jsonPrimitive?.doubleOrNull
        if (x != null && y != null) {
            androidx.compose.ui.geometry.Offset(x.toFloat(), y.toFloat())
        } else {
            null
        }
    } ?: emptyList()
}

private fun extractMeasurement(content: kotlinx.serialization.json.JsonElement): com.constructionpro.app.ui.pdf.MeasurementInfo? {
    val obj = content.jsonObject
    val value = obj["value"]?.jsonPrimitive?.doubleOrNull
    val unit = obj["unit"]?.jsonPrimitive?.contentOrNull
    return if (value != null && unit != null) {
        com.constructionpro.app.ui.pdf.MeasurementInfo(value, unit)
    } else {
        null
    }
}
