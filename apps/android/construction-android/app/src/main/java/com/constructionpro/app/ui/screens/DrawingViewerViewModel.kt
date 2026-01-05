package com.constructionpro.app.ui.screens

import android.content.Context
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.AuthTokenStore
import com.constructionpro.app.data.local.AnnotationDao
import com.constructionpro.app.data.local.AnnotationEntity
import com.constructionpro.app.data.local.DocumentCacheDao
import com.constructionpro.app.data.local.DocumentCacheEntity
import com.constructionpro.app.data.local.DrawingDao
import com.constructionpro.app.data.local.DrawingEntity
import com.constructionpro.app.data.local.DrawingScaleDao
import com.constructionpro.app.data.local.DrawingScaleEntity
import com.constructionpro.app.data.local.PendingActionDao
import com.constructionpro.app.data.local.PendingActionEntity
import okhttp3.OkHttpClient
import okhttp3.Request
import com.constructionpro.app.data.model.AnnotationColors
import com.constructionpro.app.data.model.AnnotationCreateRequest
import com.constructionpro.app.data.model.AnnotationDraft
import com.constructionpro.app.data.model.AnnotationTool
import com.constructionpro.app.data.model.AnnotationType
import com.constructionpro.app.data.model.AnnotationUpdateRequest
import com.constructionpro.app.data.model.DocumentAnnotation
import com.constructionpro.app.data.model.DrawingState
import com.constructionpro.app.data.model.EntitySearchResult
import com.constructionpro.app.data.model.NormalizedPoint
import com.constructionpro.app.data.model.NormalizedPointJson
import com.constructionpro.app.data.model.PinContentJson
import com.constructionpro.app.data.model.PinCreateRequest
import com.constructionpro.app.data.model.ScaleUpdateRequest
import com.constructionpro.app.ui.drawing.AnnotationHistoryManager
import com.constructionpro.app.ui.drawing.HistoryAction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.io.File
import java.util.UUID

/**
 * ViewModel for the Drawing Viewer screen.
 * Manages PDF rendering, annotations, scale, and offline sync.
 */
class DrawingViewerViewModel(
    private val apiService: ApiService,
    private val annotationDao: AnnotationDao,
    private val drawingDao: DrawingDao,
    private val drawingScaleDao: DrawingScaleDao,
    private val documentCacheDao: DocumentCacheDao,
    private val pendingActionDao: PendingActionDao,
    private val authTokenStore: AuthTokenStore,
    private val json: Json
) : ViewModel() {

    // Current user ID for per-user annotation storage
    private var currentUserId: String? = null

    // Drawing info
    var drawingId by mutableStateOf("")
        private set
    var drawingTitle by mutableStateOf("")
        private set
    var drawingNumber by mutableStateOf("")
        private set
    var projectId by mutableStateOf("")
        private set
    var fileId by mutableStateOf("")
        private set

    // PDF state
    private var pdfRenderer: PdfRenderer? = null
    var pageCount by mutableIntStateOf(0)
        private set
    var currentPage by mutableIntStateOf(0)
        private set
    var pdfFile: File? by mutableStateOf(null)
        private set

    // Loading states
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    // Download state
    var isDownloading by mutableStateOf(false)
        private set
    var downloadProgress by mutableIntStateOf(0)
        private set
    var downloadError by mutableStateOf<String?>(null)
        private set

    // Annotations
    val historyManager = AnnotationHistoryManager()
    private val _annotations = mutableStateListOf<AnnotationDraft>()
    val annotations: List<AnnotationDraft> get() = _annotations.toList()

    // Current tool and color
    var currentTool by mutableStateOf(AnnotationTool.PAN)
        private set
    var currentColor by mutableStateOf(AnnotationColors.DEFAULT)
        private set

    // Drawing state (for previews)
    var drawingState by mutableStateOf<DrawingState?>(null)
        private set

    // Selected annotation
    var selectedAnnotationId by mutableStateOf<String?>(null)
        private set

    // Visibility
    var showAnnotations by mutableStateOf(true)
        private set
    var showResolvedAnnotations by mutableStateOf(true)
        private set

    // Scale
    var currentScale by mutableStateOf<String?>(null)
        private set
    var isCalibrating by mutableStateOf(false)
        private set
    var calibrationStart by mutableStateOf<NormalizedPoint?>(null)
    var calibrationEnd by mutableStateOf<NormalizedPoint?>(null)

    // PIN modal
    var showPinModal by mutableStateOf(false)
        private set
    var pendingPinPosition by mutableStateOf<NormalizedPoint?>(null)
        private set
    var editingPin by mutableStateOf<AnnotationDraft?>(null)
        private set

    // Entity search
    private val _entitySearchResults = mutableStateListOf<EntitySearchResult>()
    val entitySearchResults: List<EntitySearchResult> get() = _entitySearchResults.toList()
    var isSearchingEntities by mutableStateOf(false)
        private set

    // Calibration dialog
    var showCalibrationDialog by mutableStateOf(false)

    // Area polygon state
    private val areaPoints = mutableStateListOf<NormalizedPoint>()

    // Offline status
    var isOffline by mutableStateOf(false)
        private set
    var pendingChangesCount by mutableIntStateOf(0)
        private set

    // Callout numbering
    private var nextCalloutNumber = 1

    // Project drawings for navigation (state so UI updates when loaded)
    private var projectDrawings by mutableStateOf<List<DrawingEntity>>(emptyList())

    // Navigation callback
    var onNavigateToDrawing: ((String) -> Unit)? = null

    // Helper properties to check if navigation to other drawings is available
    val hasNextDrawing: Boolean
        get() {
            val currentIndex = projectDrawings.indexOfFirst { it.id == drawingId }
            return currentIndex >= 0 && currentIndex < projectDrawings.size - 1
        }

    val hasPreviousDrawing: Boolean
        get() {
            val currentIndex = projectDrawings.indexOfFirst { it.id == drawingId }
            return currentIndex > 0
        }

    /**
     * Initialize the viewer with a drawing
     */
    fun initialize(
        drawingId: String,
        title: String,
        projectId: String,
        fileId: String,
        context: Context
    ) {
        this.drawingId = drawingId
        this.drawingTitle = title
        this.projectId = projectId
        // Use drawingId as fileId if fileId is not provided (they're often the same)
        this.fileId = fileId.ifBlank { drawingId }

        viewModelScope.launch {
            _isLoading.value = true
            try {
                // Get current user ID for per-user annotation storage
                currentUserId = authTokenStore.getUserId()

                // Load project drawings for navigation
                loadProjectDrawings()

                // Load cached PDF if available
                loadCachedPdf(context)

                // Load annotations from local DB first (per-user)
                loadAnnotationsFromLocalDb()

                // Load scale
                loadScale()

                // Update pending count
                updatePendingCount()
            } catch (e: Exception) {
                _error.value = "Failed to load drawing: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    private suspend fun loadProjectDrawings() {
        withContext(Dispatchers.IO) {
            try {
                // Load all drawings for this project
                projectDrawings = drawingDao.getByProject(projectId)

                // Update current drawing number from the loaded list
                projectDrawings.find { it.id == drawingId }?.let { currentDrawing ->
                    drawingNumber = currentDrawing.drawingNumber ?: ""
                    // Also update title if it wasn't provided
                    if (drawingTitle.isEmpty()) {
                        drawingTitle = currentDrawing.title ?: ""
                    }
                }
            } catch (e: Exception) {
                // If loading fails, set empty list
                projectDrawings = emptyList()
            }
        }
    }

    private suspend fun loadCachedPdf(context: Context) {
        withContext(Dispatchers.IO) {
            // Check if we have a cached PDF
            val cache = documentCacheDao.getById(fileId)
            if (cache != null) {
                val file = File(cache.localPath)
                if (file.exists()) {
                    pdfFile = file
                    openPdfRenderer(file)
                    return@withContext
                }
            }

            // No cache - get signed URL from server and download
            val drawing = drawingDao.getById(drawingId)
            val fileName = drawing?.title ?: "drawing.pdf"

            try {
                // Get signed download URL from server
                android.util.Log.d("DrawingViewer", "Getting URL for fileId: $fileId (drawingId: $drawingId)")
                val urlResponse = apiService.getFileUrl(fileId, download = true)
                val signedUrl = urlResponse.url
                android.util.Log.d("DrawingViewer", "Got signed URL: $signedUrl")

                if (signedUrl.isNullOrBlank()) {
                    withContext(Dispatchers.Main) {
                        downloadError = "Could not get download URL"
                    }
                    return@withContext
                }

                // Download the PDF from signed URL
                downloadPdf(context, signedUrl, fileName)
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    downloadError = "Download failed: ${e.message}"
                }
            }
        }
    }

    private suspend fun downloadPdf(context: Context, url: String, fileName: String) {
        withContext(Dispatchers.Main) {
            isDownloading = true
            downloadProgress = 0
            downloadError = null
        }

        withContext(Dispatchers.IO) {
            try {
                val targetDir = File(context.filesDir, "offline_docs")
                if (!targetDir.exists()) targetDir.mkdirs()

                val safeName = fileName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
                val targetFile = File(targetDir, "${fileId}_$safeName.pdf")

                android.util.Log.d("DrawingViewer", "Starting download from URL: $url")
                android.util.Log.d("DrawingViewer", "Target file: ${targetFile.absolutePath}")

                // URL should be a complete signed URL from the server
                val client = OkHttpClient.Builder()
                    .followRedirects(true)
                    .followSslRedirects(true)
                    .build()
                val request = Request.Builder().url(url).build()

                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        val errorBody = response.body?.string() ?: "No response body"
                        android.util.Log.e("DrawingViewer", "Download failed: ${response.code} - $errorBody")
                        android.util.Log.e("DrawingViewer", "URL was: $url")
                        val userMessage = when {
                            response.code == 400 && errorBody.contains("InvalidJWT") ->
                                "Download link expired. Please restart the backend server and try again."
                            response.code == 400 ->
                                "File not found in storage. It may have been deleted or not properly uploaded."
                            response.code in listOf(401, 403) -> "Access denied to this file."
                            response.code == 404 -> "File not found."
                            else -> "Download failed: ${response.code}"
                        }
                        withContext(Dispatchers.Main) {
                            downloadError = userMessage
                            isDownloading = false
                        }
                        return@withContext
                    }

                    val body = response.body ?: run {
                        withContext(Dispatchers.Main) {
                            downloadError = "Empty response"
                            isDownloading = false
                        }
                        return@withContext
                    }

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
                                    withContext(Dispatchers.Main) {
                                        downloadProgress = progress
                                    }
                                }
                            }
                        }
                    }

                    // Save to cache
                    val now = System.currentTimeMillis()
                    val cacheEntry = DocumentCacheEntity(
                        fileId = fileId,
                        fileName = safeName,
                        localPath = targetFile.absolutePath,
                        fileSizeBytes = targetFile.length(),
                        downloadedAt = now,
                        lastAccessedAt = now,
                        pageCount = null
                    )
                    documentCacheDao.upsert(cacheEntry)

                    // Open the PDF
                    withContext(Dispatchers.Main) {
                        pdfFile = targetFile
                        isDownloading = false
                        downloadProgress = 100
                    }
                    openPdfRenderer(targetFile)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    downloadError = "Download failed: ${e.message}"
                    isDownloading = false
                }
            }
        }
    }

    private fun openPdfRenderer(file: File) {
        try {
            val fileDescriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            pdfRenderer = PdfRenderer(fileDescriptor)
            pageCount = pdfRenderer?.pageCount ?: 0
        } catch (e: Exception) {
            _error.value = "Failed to open PDF: ${e.message}"
        }
    }

    /**
     * Load annotations from local Room database (per-user)
     * This is the primary source of annotations for persistence
     */
    private suspend fun loadAnnotationsFromLocalDb() {
        val userId = currentUserId ?: return
        withContext(Dispatchers.IO) {
            try {
                val entities = annotationDao.getByFileIdForUser(fileId, userId)
                val drafts = entities.mapNotNull { entity ->
                    try {
                        entityToDraft(entity)
                    } catch (e: Exception) {
                        null
                    }
                }
                withContext(Dispatchers.Main) {
                    _annotations.clear()
                    _annotations.addAll(drafts)
                    historyManager.initialize(drafts)
                    updateCalloutNumbering()
                }
            } catch (e: Exception) {
                // Start with empty list on error
                withContext(Dispatchers.Main) {
                    _annotations.clear()
                    historyManager.initialize(emptyList())
                    updateCalloutNumbering()
                }
            }
        }
    }

    private fun entityToDraft(entity: AnnotationEntity): AnnotationDraft {
        // Parse content from JSON
        val contentObj = try {
            json.parseToJsonElement(entity.contentJson).jsonObject
        } catch (e: Exception) {
            null
        }

        return AnnotationDraft(
            id = entity.id,
            type = AnnotationType.fromValue(entity.annotationType) ?: AnnotationType.PIN,
            pageNumber = entity.pageNumber,
            position = contentObj?.get("position")?.jsonObject?.let { posObj ->
                NormalizedPoint(
                    posObj["x"]?.jsonPrimitive?.doubleOrNull?.toFloat() ?: 0f,
                    posObj["y"]?.jsonPrimitive?.doubleOrNull?.toFloat() ?: 0f
                )
            } ?: NormalizedPoint.ZERO,
            endPoint = contentObj?.get("endPoint")?.jsonObject?.let { epObj ->
                NormalizedPoint(
                    epObj["x"]?.jsonPrimitive?.doubleOrNull?.toFloat() ?: 0f,
                    epObj["y"]?.jsonPrimitive?.doubleOrNull?.toFloat() ?: 0f
                )
            },
            width = contentObj?.get("width")?.jsonPrimitive?.doubleOrNull?.toFloat(),
            height = contentObj?.get("height")?.jsonPrimitive?.doubleOrNull?.toFloat(),
            points = try {
                contentObj?.get("points")?.let { pointsJson ->
                    (pointsJson as? kotlinx.serialization.json.JsonArray)?.mapNotNull { pt ->
                        pt.jsonObject.let { ptObj ->
                            NormalizedPoint(
                                ptObj["x"]?.jsonPrimitive?.doubleOrNull?.toFloat() ?: 0f,
                                ptObj["y"]?.jsonPrimitive?.doubleOrNull?.toFloat() ?: 0f
                            )
                        }
                    }
                } ?: emptyList()
            } catch (e: Exception) { emptyList() },
            color = entity.color,
            text = contentObj?.get("text")?.jsonPrimitive?.contentOrNull,
            label = contentObj?.get("label")?.jsonPrimitive?.contentOrNull,
            number = contentObj?.get("number")?.jsonPrimitive?.intOrNull,
            createdBy = entity.createdBy,
            createdByName = entity.createdByName,
            createdAt = entity.createdAt,
            resolvedAt = entity.resolvedAt,
            resolvedBy = entity.resolvedBy,
            isPending = entity.isPending
        )
    }

    private suspend fun loadAnnotations() {
        withContext(Dispatchers.IO) {
            try {
                // Load annotations from API (filtered by user on server side)
                val response = apiService.getAnnotations(fileId)
                val drafts = response.annotations.mapNotNull { ann ->
                    try {
                        val contentObj = ann.content?.jsonObject
                        AnnotationDraft(
                            id = ann.id,
                            type = AnnotationType.fromValue(contentObj?.get("type")?.jsonPrimitive?.contentOrNull ?: "PIN") ?: AnnotationType.PIN,
                            pageNumber = ann.pageNumber ?: 0,
                            position = contentObj?.get("position")?.jsonObject?.let { posObj ->
                                NormalizedPoint(
                                    posObj["x"]?.jsonPrimitive?.doubleOrNull?.toFloat() ?: 0f,
                                    posObj["y"]?.jsonPrimitive?.doubleOrNull?.toFloat() ?: 0f
                                )
                            } ?: NormalizedPoint.ZERO,
                            endPoint = contentObj?.get("endPoint")?.jsonObject?.let { epObj ->
                                NormalizedPoint(
                                    epObj["x"]?.jsonPrimitive?.doubleOrNull?.toFloat() ?: 0f,
                                    epObj["y"]?.jsonPrimitive?.doubleOrNull?.toFloat() ?: 0f
                                )
                            },
                            color = contentObj?.get("color")?.jsonPrimitive?.contentOrNull ?: "#FF0000",
                            text = contentObj?.get("text")?.jsonPrimitive?.contentOrNull,
                            isPending = false,
                            resolvedAt = ann.resolvedAt
                        )
                    } catch (e: Exception) {
                        null
                    }
                }
                withContext(Dispatchers.Main) {
                    _annotations.clear()
                    _annotations.addAll(drafts)
                    historyManager.initialize(drafts)
                    updateCalloutNumbering()
                }
            } catch (e: Exception) {
                // Offline or error - start with empty list
                withContext(Dispatchers.Main) {
                    _annotations.clear()
                    historyManager.initialize(emptyList())
                    updateCalloutNumbering()
                }
            }
        }
    }

    /**
     * Clear all annotations from server and locally
     */
    fun clearAllAnnotationsFromServer() {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    apiService.deleteAnnotation(fileId, clearAll = true)
                }
                // Clear local annotations
                withContext(Dispatchers.Main) {
                    _annotations.clear()
                    historyManager.initialize(emptyList())
                    selectedAnnotationId = null
                    updateCalloutNumbering()
                }
            } catch (e: Exception) {
                _error.value = "Failed to clear annotations: ${e.message}"
            }
        }
    }

    private suspend fun loadScale() {
        withContext(Dispatchers.IO) {
            try {
                // Load from cache first (cached by fileId)
                val cached = drawingScaleDao.getByDrawingId(fileId)
                cached?.let {
                    withContext(Dispatchers.Main) {
                        currentScale = it.scale
                    }
                }

                // Try to fetch from server using fileId
                try {
                    val response = apiService.getScale(fileId)
                    response.scale?.let { scale ->
                        drawingScaleDao.upsert(DrawingScaleEntity(
                            drawingId = fileId,
                            scale = scale,
                            updatedAt = System.currentTimeMillis()
                        ))
                        withContext(Dispatchers.Main) {
                            currentScale = scale
                        }
                    }
                } catch (e: Exception) {
                    // Offline - use cached
                }
            } catch (e: Exception) {
                // Ignore scale loading errors
            }
        }
    }

    private suspend fun updatePendingCount() {
        // No longer needed - annotations are local-only
        pendingChangesCount = 0
    }

    /**
     * Clear all annotations (called when leaving the page)
     */
    fun clearAnnotations() {
        _annotations.clear()
        historyManager.initialize(emptyList())
        selectedAnnotationId = null
        drawingState = null
        nextCalloutNumber = 1
    }

    private fun updateCalloutNumbering() {
        val callouts = _annotations.filter { it.type == AnnotationType.CALLOUT }
        nextCalloutNumber = (callouts.maxOfOrNull { it.number ?: 0 } ?: 0) + 1
    }

    // ============ TOOL ACTIONS ============

    fun selectTool(tool: AnnotationTool) {
        currentTool = tool
        selectedAnnotationId = null
        drawingState = null

        if (tool == AnnotationTool.CALIBRATE) {
            startCalibration()
        } else {
            isCalibrating = false
            calibrationStart = null
            calibrationEnd = null
        }
    }

    fun selectColor(color: String) {
        currentColor = color
    }

    fun toggleAnnotationsVisibility() {
        showAnnotations = !showAnnotations
    }

    fun toggleResolvedVisibility() {
        showResolvedAnnotations = !showResolvedAnnotations
    }

    // ============ ANNOTATION ACTIONS ============

    fun addAnnotation(draft: AnnotationDraft) {
        val userId = currentUserId ?: return
        val annotationWithId = if (draft.id == null) {
            draft.copy(
                id = "local_${UUID.randomUUID()}",
                isPending = false,
                number = if (draft.type == AnnotationType.CALLOUT) nextCalloutNumber++ else draft.number
            )
        } else {
            draft
        }

        _annotations.add(annotationWithId)
        historyManager.addAnnotation(annotationWithId)

        // Persist to local DB for the current user
        viewModelScope.launch(Dispatchers.IO) {
            try {
                annotationDao.upsert(draftToEntity(annotationWithId, userId))
            } catch (e: Exception) {
                android.util.Log.e("DrawingViewer", "Failed to save annotation: ${e.message}")
            }
        }
    }

    fun updateAnnotation(annotation: AnnotationDraft) {
        val userId = currentUserId ?: return
        val index = _annotations.indexOfFirst { it.id == annotation.id }
        if (index >= 0) {
            val oldAnnotation = _annotations[index]
            _annotations[index] = annotation
            historyManager.updateAnnotation(oldAnnotation, annotation)

            // Persist update to local DB
            viewModelScope.launch(Dispatchers.IO) {
                try {
                    annotationDao.upsert(draftToEntity(annotation, userId))
                } catch (e: Exception) {
                    android.util.Log.e("DrawingViewer", "Failed to update annotation: ${e.message}")
                }
            }
        }
    }

    fun deleteAnnotation(annotationId: String) {
        val annotation = _annotations.find { it.id == annotationId } ?: return
        _annotations.removeAll { it.id == annotationId }
        historyManager.deleteAnnotation(annotation)

        // Delete from local DB
        viewModelScope.launch(Dispatchers.IO) {
            try {
                annotationDao.deleteById(annotationId)
            } catch (e: Exception) {
                android.util.Log.e("DrawingViewer", "Failed to delete annotation: ${e.message}")
            }
        }
    }

    private fun draftToEntity(draft: AnnotationDraft, userId: String): AnnotationEntity {
        // Build content JSON based on annotation type
        val contentJson = buildJsonObject {
            put("type", draft.type.value)
            put("position", buildJsonObject {
                put("x", draft.position.x.toDouble())
                put("y", draft.position.y.toDouble())
            })
            draft.endPoint?.let { ep ->
                put("endPoint", buildJsonObject {
                    put("x", ep.x.toDouble())
                    put("y", ep.y.toDouble())
                })
            }
            draft.width?.let { put("width", it.toDouble()) }
            draft.height?.let { put("height", it.toDouble()) }
            draft.points?.let { pts ->
                put("points", kotlinx.serialization.json.JsonArray(pts.map { pt ->
                    buildJsonObject {
                        put("x", pt.x.toDouble())
                        put("y", pt.y.toDouble())
                    }
                }))
            }
            put("color", draft.color)
            draft.text?.let { put("text", it) }
            draft.label?.let { put("label", it) }
            draft.number?.let { put("number", it) }
        }.toString()

        return AnnotationEntity(
            id = draft.id ?: "local_${UUID.randomUUID()}",
            fileId = fileId,
            userId = userId,
            pageNumber = draft.pageNumber,
            annotationType = draft.type.value,
            contentJson = contentJson,
            color = draft.color,
            createdBy = draft.createdBy,
            createdByName = draft.createdByName,
            createdAt = draft.createdAt ?: java.time.Instant.now().toString(),
            resolvedAt = draft.resolvedAt,
            resolvedBy = draft.resolvedBy,
            isPending = draft.isPending,
            updatedAt = System.currentTimeMillis()
        )
    }

    fun selectAnnotation(annotationId: String?) {
        selectedAnnotationId = annotationId
        if (annotationId != null) {
            currentTool = AnnotationTool.SELECT
        }
    }

    fun resolveAnnotation(annotationId: String, resolve: Boolean) {
        val index = _annotations.indexOfFirst { it.id == annotationId }
        if (index >= 0) {
            val annotation = _annotations[index]
            val updated = annotation.copy(
                resolvedAt = if (resolve) java.time.Instant.now().toString() else null,
                resolvedBy = if (resolve) "current_user" else null
            )
            _annotations[index] = updated
            // No DB or API sync - annotations are local-only
        }
    }

    // Sync functions removed - annotations are now local-only and not persisted

    private suspend fun queuePendingAction(type: String, resourceId: String, payloadJson: String) {
        pendingActionDao.upsert(PendingActionEntity(
            id = UUID.randomUUID().toString(),
            type = type,
            resourceId = resourceId,
            payloadJson = payloadJson,
            status = "pending",
            retryCount = 0,
            createdAt = System.currentTimeMillis()
        ))
    }

    // ============ UNDO/REDO ============

    fun undo() {
        val action = historyManager.undo()
        if (action != null) {
            _annotations.clear()
            _annotations.addAll(historyManager.annotations)
        }
    }

    fun redo() {
        val action = historyManager.redo()
        if (action != null) {
            _annotations.clear()
            _annotations.addAll(historyManager.annotations)
        }
    }

    // ============ DRAWING STATE ============

    fun updateDrawingState(state: DrawingState?) {
        drawingState = state
    }

    // ============ PAGE NAVIGATION ============

    fun goToPage(page: Int) {
        if (page in 0 until pageCount) {
            currentPage = page
        }
    }

    fun nextPage() {
        if (currentPage < pageCount - 1) {
            currentPage++
        } else {
            // At last page - try to navigate to next drawing
            navigateToNextDrawing()
        }
    }

    fun previousPage() {
        if (currentPage > 0) {
            currentPage--
        } else {
            // At first page - try to navigate to previous drawing
            navigateToPreviousDrawing()
        }
    }

    private fun navigateToNextDrawing() {
        val currentIndex = projectDrawings.indexOfFirst { it.id == drawingId }
        if (currentIndex >= 0 && currentIndex < projectDrawings.size - 1) {
            val nextDrawing = projectDrawings[currentIndex + 1]
            onNavigateToDrawing?.invoke(nextDrawing.id)
        }
    }

    private fun navigateToPreviousDrawing() {
        val currentIndex = projectDrawings.indexOfFirst { it.id == drawingId }
        if (currentIndex > 0) {
            val previousDrawing = projectDrawings[currentIndex - 1]
            onNavigateToDrawing?.invoke(previousDrawing.id)
        }
    }

    // ============ PIN MODAL ============

    fun showPinModalForPosition(position: NormalizedPoint) {
        pendingPinPosition = position
        editingPin = null
        showPinModal = true
    }

    fun showPinModalForEditing(pin: AnnotationDraft) {
        pendingPinPosition = pin.position
        editingPin = pin
        showPinModal = true
    }

    fun dismissPinModal() {
        showPinModal = false
        pendingPinPosition = null
        editingPin = null
    }

    fun searchEntities(entityType: String, query: String) {
        viewModelScope.launch {
            isSearchingEntities = true
            try {
                // TODO: Implement entity search API
                // For now, return empty list
                _entitySearchResults.clear()
            } catch (e: Exception) {
                // Ignore search errors
            } finally {
                isSearchingEntities = false
            }
        }
    }

    // ============ CALIBRATION ============

    fun startCalibration() {
        isCalibrating = true
        calibrationStart = null
        calibrationEnd = null
        currentTool = AnnotationTool.CALIBRATE
    }

    fun setCalibrationPoint(point: NormalizedPoint) {
        if (calibrationStart == null) {
            calibrationStart = point
        } else {
            calibrationEnd = point
            showCalibrationDialog = true
        }
    }

    fun dismissCalibrationDialog() {
        showCalibrationDialog = false
    }

    // ============ AREA POLYGON ============

    fun addAreaPoint(point: NormalizedPoint) {
        areaPoints.add(point)
        // Update drawing state to show preview
        if (areaPoints.size >= 2) {
            updateDrawingState(
                DrawingState.Polygon(
                    points = areaPoints.toList(),
                    type = AnnotationType.AREA,
                    color = currentColor,
                    isClosed = false
                )
            )
        }
    }

    fun completeAreaAnnotation() {
        if (areaPoints.size >= 3) {
            // Create the area annotation
            val annotation = AnnotationDraft(
                type = AnnotationType.AREA,
                pageNumber = currentPage,
                position = areaPoints.first(), // Use first point as position
                points = areaPoints.toList(),
                color = currentColor,
                isPending = true
            )
            addAnnotation(annotation)
            areaPoints.clear()
            updateDrawingState(null)
        }
    }

    fun applyScale(scale: String) {
        currentScale = scale

        viewModelScope.launch(Dispatchers.IO) {
            try {
                // Save locally (using fileId as key)
                drawingScaleDao.upsert(DrawingScaleEntity(
                    drawingId = fileId,
                    scale = scale,
                    updatedAt = System.currentTimeMillis()
                ))

                // Sync to server using fileId
                try {
                    apiService.updateScale(fileId, ScaleUpdateRequest(scale))
                } catch (e: Exception) {
                    val payloadJson = buildJsonObject {
                        put("scale", scale)
                    }.toString()
                    queuePendingAction("scale_update", fileId, payloadJson)
                }
            } catch (e: Exception) {
                _error.value = "Failed to save scale: ${e.message}"
            }
        }

        // Reset calibration
        isCalibrating = false
        calibrationStart = null
        calibrationEnd = null
        showCalibrationDialog = false
        currentTool = AnnotationTool.PAN
    }

    // ============ CLEANUP ============

    override fun onCleared() {
        super.onCleared()
        pdfRenderer?.close()
    }

    fun clearError() {
        _error.value = null
    }
}

// ============ EXTENSION FUNCTIONS ============

private fun AnnotationEntity.toDraft(): AnnotationDraft {
    return AnnotationDraft(
        id = id,
        type = AnnotationType.fromValue(annotationType) ?: AnnotationType.PIN,
        pageNumber = pageNumber,
        position = NormalizedPoint(0f, 0f), // Will be parsed from contentJson
        color = color,
        createdBy = createdBy,
        createdByName = createdByName,
        createdAt = createdAt,
        resolvedAt = resolvedAt,
        resolvedBy = resolvedBy,
        isPending = isPending
    )
}

private fun DocumentAnnotation.toDraft(fileId: String): AnnotationDraft? {
    val type = annotationType?.let { AnnotationType.fromValue(it) } ?: return null
    return AnnotationDraft(
        id = id,
        type = type,
        pageNumber = pageNumber ?: 0,
        position = NormalizedPoint(0f, 0f), // Parse from content
        color = AnnotationColors.DEFAULT,
        createdBy = createdBy,
        createdAt = createdAt,
        resolvedAt = resolvedAt,
        resolvedBy = resolvedBy,
        isPending = false
    )
}

private fun AnnotationDraft.toEntity(fileId: String, userId: String): AnnotationEntity {
    return AnnotationEntity(
        id = id ?: "local_${UUID.randomUUID()}",
        fileId = fileId,
        userId = userId,
        pageNumber = pageNumber,
        annotationType = type.value,
        contentJson = "", // TODO: Serialize content
        color = color,
        createdBy = createdBy,
        createdByName = createdByName,
        createdAt = createdAt,
        resolvedAt = resolvedAt,
        resolvedBy = resolvedBy,
        isPending = isPending,
        updatedAt = System.currentTimeMillis()
    )
}

private fun AnnotationDraft.toContentJson(json: Json): JsonElement {
    // Create content based on type
    val contentString = when (type) {
        AnnotationType.PIN -> json.encodeToString(PinContentJson(
            position = NormalizedPointJson(position.x, position.y),
            color = color,
            label = label,
            text = text,
            linkedEntity = linkedEntity?.let {
                com.constructionpro.app.data.model.LinkedEntityJson(
                    type = it.type,
                    id = it.id,
                    title = it.title,
                    status = it.status
                )
            }
        ))
        else -> "{}"
    }
    return json.parseToJsonElement(contentString)
}
