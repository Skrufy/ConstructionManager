package com.constructionpro.app.ui.screens

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.local.AppDatabase
import com.constructionpro.app.data.local.toSummary
import com.constructionpro.app.data.local.toEntity
import com.constructionpro.app.data.model.DocumentProject
import com.constructionpro.app.data.model.DocumentSummary
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream

private data class DocumentsState(
    val loading: Boolean = false,
    val documents: List<DocumentSummary> = emptyList(),
    val error: String? = null,
    val page: Int = 1,
    val pages: Int = 1,
    val total: Int = 0,
    val categories: Map<String, Int> = emptyMap(),
    val offline: Boolean = false,
    val selectedCategory: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenDocument: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(DocumentsState(loading = true)) }
    var searchQuery by remember { mutableStateOf("") }
    val pageSize = 20
    val documentDao = remember { AppDatabase.getInstance(context).documentDao() }

    var uploadingFile by remember { mutableStateOf(false) }
    var uploadError by remember { mutableStateOf<String?>(null) }
    var selectedDocumentType by remember { mutableStateOf<String?>(null) }
    var triggerReload by remember { mutableStateOf(0) }

    // Localized strings for use in coroutines
    val loadFailedMsg = stringResource(R.string.documents_load_failed)
    val uploadFailedMsg = stringResource(R.string.documents_upload_failed)

    fun loadDocuments(
        targetPage: Int = state.page,
        query: String = searchQuery,
        category: String? = state.selectedCategory
    ) {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getDocuments(
                        search = query.takeIf { it.isNotBlank() },
                        page = targetPage,
                        limit = pageSize
                    )
                }
                val entities = response.documents.map { it.toEntity() }
                withContext(Dispatchers.IO) {
                    documentDao.insertAll(entities)
                }
                val pagination = response.pagination
                // Filter out drawings (shown in separate Drawings page) and by selected category
                val filteredDocs = response.documents
                    .filter { doc ->
                        // Exclude drawing-related categories
                        val cat = doc.category?.uppercase() ?: ""
                        cat != "DRAWINGS" && cat != "DRAWING"
                    }
                    .filter { doc ->
                        // Apply selected category filter if any
                        category == null || doc.category == category
                    }
                // Also filter categories to exclude drawings
                val filteredCategories = response.categories.filterKeys { key ->
                    val cat = key.uppercase()
                    cat != "DRAWINGS" && cat != "DRAWING"
                }

                state = state.copy(
                    loading = false,
                    documents = filteredDocs,
                    page = pagination?.page ?: targetPage,
                    pages = pagination?.pages ?: 1,
                    total = filteredDocs.size,
                    categories = filteredCategories,
                    offline = false
                )
            } catch (error: Exception) {
                val cached = withContext(Dispatchers.IO) {
                    if (query.isBlank()) {
                        documentDao.getAll()
                    } else {
                        documentDao.search("%$query%")
                    }
                }.map { it.toSummary() }
                    .filter { doc ->
                        // Exclude drawings from cached results too
                        val cat = doc.category?.uppercase() ?: ""
                        cat != "DRAWINGS" && cat != "DRAWING"
                    }

                state = state.copy(
                    loading = false,
                    documents = cached,
                    page = 1,
                    pages = 1,
                    total = cached.size,
                    categories = emptyMap(),
                    offline = true,
                    error = if (cached.isEmpty()) error.message ?: loadFailedMsg else null
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        loadDocuments(1, searchQuery)
    }

    LaunchedEffect(searchQuery) {
        delay(300)
        loadDocuments(1, searchQuery)
    }

    LaunchedEffect(triggerReload) {
        if (triggerReload > 0) {
            loadDocuments(1, searchQuery)
        }
    }

    // File picker launcher
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: android.net.Uri? ->
        uri?.let {
            scope.launch {
                uploadingFile = true
                uploadError = null
                try {
                    uploadFile(
                        context = context,
                        apiService = apiService,
                        uri = it,
                        documentType = selectedDocumentType ?: "DOCUMENT"
                    )
                    // Trigger reload
                    triggerReload++
                    uploadingFile = false
                } catch (e: Exception) {
                    uploadError = e.message ?: uploadFailedMsg
                    uploadingFile = false
                }
            }
        }
        selectedDocumentType = null
    }

    var showUploadDialog by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.documents_title),
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
                    IconButton(onClick = { loadDocuments() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = AppColors.textSecondary
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showUploadDialog = true },
                containerColor = AppColors.primary600,
                contentColor = androidx.compose.ui.graphics.Color.White
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = stringResource(R.string.documents_upload)
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Search Bar
            Box(modifier = Modifier.padding(horizontal = AppSpacing.md, vertical = AppSpacing.sm)) {
                CPSearchBar(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    placeholder = stringResource(R.string.documents_search),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Category Filter Chips
            if (state.categories.isNotEmpty()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = AppSpacing.md),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                    modifier = Modifier.padding(bottom = AppSpacing.sm)
                ) {
                    item {
                        FilterChip(
                            selected = state.selectedCategory == null,
                            onClick = {
                                state = state.copy(selectedCategory = null)
                                loadDocuments(1, searchQuery, null)
                            },
                            label = { Text(stringResource(R.string.documents_all)) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Primary600,
                                selectedLabelColor = androidx.compose.ui.graphics.Color.White
                            )
                        )
                    }
                    items(state.categories.keys.toList()) { category ->
                        val count = state.categories[category] ?: 0
                        FilterChip(
                            selected = state.selectedCategory == category,
                            onClick = {
                                val newCategory = if (state.selectedCategory == category) null else category
                                state = state.copy(selectedCategory = newCategory)
                                loadDocuments(1, searchQuery, newCategory)
                            },
                            label = { Text("$category ($count)") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Primary600,
                                selectedLabelColor = androidx.compose.ui.graphics.Color.White
                            )
                        )
                    }
                }
            }

            // Offline Banner
            if (state.offline) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xxs),
                    shape = RoundedCornerShape(AppSpacing.xs),
                    color = ConstructionOrange.copy(alpha = 0.1f)
                ) {
                    Row(
                        modifier = Modifier.padding(AppSpacing.sm),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudOff,
                            contentDescription = null,
                            tint = ConstructionOrange,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(
                            text = stringResource(R.string.documents_showing_cached),
                            style = AppTypography.body,
                            color = ConstructionOrange
                        )
                    }
                }
            }

            // Error Banner
            if (state.error != null) {
                Box(modifier = Modifier.padding(horizontal = AppSpacing.md)) {
                    CPErrorBanner(
                        message = state.error ?: loadFailedMsg,
                        onRetry = { loadDocuments() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading State
            if (state.loading) {
                CPLoadingIndicator(message = stringResource(R.string.documents_loading))
            }

            // Results Count and Pagination
            if (!state.loading && state.documents.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stringResource(R.string.documents_count, state.total),
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                    if (state.pages > 1) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(
                                onClick = { loadDocuments(state.page - 1, searchQuery) },
                                enabled = state.page > 1
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ChevronLeft,
                                    contentDescription = stringResource(R.string.documents_previous_page),
                                    tint = if (state.page > 1) AppColors.primary600 else AppColors.textMuted
                                )
                            }
                            Text(
                                text = "${state.page}/${state.pages}",
                                style = AppTypography.body,
                                color = AppColors.textSecondary
                            )
                            IconButton(
                                onClick = { loadDocuments(state.page + 1, searchQuery) },
                                enabled = state.page < state.pages
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ChevronRight,
                                    contentDescription = stringResource(R.string.documents_next_page),
                                    tint = if (state.page < state.pages) AppColors.primary600 else AppColors.textMuted
                                )
                            }
                        }
                    }
                }
            }

            // Empty State
            if (!state.loading && state.documents.isEmpty() && state.error == null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(AppSpacing.xxl),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.FolderOpen,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = AppColors.textMuted
                        )
                        Spacer(modifier = Modifier.height(AppSpacing.md))
                        Text(
                            text = stringResource(R.string.documents_no_documents),
                            style = AppTypography.heading3,
                            color = AppColors.textSecondary
                        )
                        Text(
                            text = stringResource(R.string.documents_empty_desc),
                            style = AppTypography.body,
                            color = AppColors.textMuted
                        )
                    }
                }
            }

            // Documents List
            if (!state.loading && state.documents.isNotEmpty()) {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    items(state.documents) { document ->
                        DocumentCard(
                            document = document,
                            onClick = { onOpenDocument(document.id) }
                        )
                    }
                    item {
                        Spacer(modifier = Modifier.height(AppSpacing.md))
                    }
                }
            }
        }
    }

    // Upload Document Dialog
    if (showUploadDialog) {
        AlertDialog(
            onDismissRequest = { showUploadDialog = false },
            title = { Text(stringResource(R.string.documents_upload)) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    Text(
                        stringResource(R.string.documents_upload_type),
                        style = AppTypography.body
                    )

                    Button(
                        onClick = {
                            selectedDocumentType = "DOCUMENT"
                            showUploadDialog = false
                            filePickerLauncher.launch("*/*")
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = AppColors.primary600
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.Description,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(stringResource(R.string.documents_general))
                    }

                    Button(
                        onClick = {
                            selectedDocumentType = "COMPLIANCE"
                            showUploadDialog = false
                            filePickerLauncher.launch("*/*")
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ConstructionGreen
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.VerifiedUser,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xs))
                        Text(stringResource(R.string.documents_compliance))
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showUploadDialog = false }) {
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }
}

/**
 * Upload a file from URI to the server
 */
private suspend fun uploadFile(
    context: Context,
    apiService: ApiService,
    uri: Uri,
    documentType: String
): Unit = withContext(Dispatchers.IO) {
    // Get file name from URI
    val fileName = context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
        cursor.moveToFirst()
        cursor.getString(nameIndex)
    } ?: "document_${System.currentTimeMillis()}"

    // Copy URI content to temp file
    val tempFile = File(context.cacheDir, fileName)
    context.contentResolver.openInputStream(uri)?.use { input ->
        FileOutputStream(tempFile).use { output ->
            input.copyTo(output)
        }
    }

    try {
        // Determine MIME type
        val mimeType = context.contentResolver.getType(uri) ?: "application/octet-stream"

        // Create multipart request parts
        val filePart = MultipartBody.Part.createFormData(
            "file",
            fileName,
            tempFile.asRequestBody(mimeType.toMediaTypeOrNull())
        )

        // Create request body parts for form fields
        val projectIdPart = "default".toRequestBody("text/plain".toMediaTypeOrNull())
        val namePart = fileName.toRequestBody("text/plain".toMediaTypeOrNull())
        val typePart = documentType.toRequestBody("text/plain".toMediaTypeOrNull())
        val categoryPart = (if (documentType == "COMPLIANCE") "COMPLIANCE" else "DOCUMENTS")
            .toRequestBody("text/plain".toMediaTypeOrNull())

        // Upload to server
        apiService.uploadDocumentFile(
            file = filePart,
            projectId = projectIdPart,
            name = namePart,
            type = typePart,
            category = categoryPart
        )
    } finally {
        // Clean up temp file
        tempFile.delete()
    }
}

@Composable
private fun DocumentCard(
    document: DocumentSummary,
    onClick: () -> Unit
) {
    // Determine icon and color based on category
    val (icon, iconColor, iconBgColor) = when (document.category?.lowercase()) {
        "license", "licenses" -> Triple(Icons.Default.Badge, ConstructionGreen, ConstructionGreen.copy(alpha = 0.1f))
        "certificate", "certificates", "certification" -> Triple(Icons.Default.WorkspacePremium, AppColors.primary600, Primary100)
        "permit", "permits" -> Triple(Icons.Default.VerifiedUser, AppColors.primary600, Primary100)
        "insurance" -> Triple(Icons.Default.Shield, ConstructionOrange, ConstructionOrange.copy(alpha = 0.1f))
        "safety" -> Triple(Icons.Default.HealthAndSafety, ConstructionRed, ConstructionRed.copy(alpha = 0.1f))
        "contract", "contracts" -> Triple(Icons.Default.Description, AppColors.textSecondary, AppColors.gray100)
        else -> Triple(Icons.Default.InsertDriveFile, AppColors.textSecondary, AppColors.gray100)
    }

    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            // Document Icon
            Surface(
                modifier = Modifier.size(AppSpacing.iconCircleLarge),
                shape = RoundedCornerShape(AppSpacing.sm),
                color = iconBgColor
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        modifier = Modifier.size(28.dp),
                        tint = iconColor
                    )
                }
            }

            // Document Info
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
            ) {
                // Category Badge
                document.category?.let { category ->
                    CPBadge(
                        text = category,
                        color = iconColor,
                        backgroundColor = iconBgColor
                    )
                }

                // Document Name
                Text(
                    text = document.name,
                    style = AppTypography.heading3,
                    color = AppColors.textPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                // Project Name
                document.project?.name?.let { projectName ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Folder,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = AppColors.textMuted
                        )
                        Spacer(modifier = Modifier.width(AppSpacing.xxs))
                        Text(
                            text = projectName,
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Metadata Row
                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // File type indicator
                    document.type?.let { docType ->
                        val fileType = when {
                            docType.contains("pdf", ignoreCase = true) -> "PDF"
                            docType.contains("word", ignoreCase = true) || docType.contains("doc", ignoreCase = true) -> "DOC"
                            docType.contains("image", ignoreCase = true) -> "IMG"
                            docType.contains("spreadsheet", ignoreCase = true) || docType.contains("excel", ignoreCase = true) -> "XLS"
                            else -> docType.take(4).uppercase()
                        }
                        Surface(
                            shape = RoundedCornerShape(AppSpacing.xxs),
                            color = AppColors.gray100
                        ) {
                            Text(
                                text = fileType,
                                style = AppTypography.caption,
                                color = AppColors.textSecondary,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    // Revision count
                    document.count?.revisions?.let { revisions ->
                        if (revisions > 0) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.History,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = AppColors.textMuted
                                )
                                Spacer(modifier = Modifier.width(AppSpacing.xxs))
                                Text(
                                    text = "v$revisions",
                                    style = AppTypography.caption,
                                    color = AppColors.textSecondary
                                )
                            }
                        }
                    }
                }
            }

            // Chevron
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = stringResource(R.string.documents_view),
                tint = AppColors.textMuted,
                modifier = Modifier.align(Alignment.CenterVertically)
            )
        }
    }
}
