package com.constructionpro.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.R
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.text.DecimalFormat

private data class UploadScreenState(
    val step: Int = 1, // 1 = type, 2 = project, 3 = file, 4 = uploading, 5 = complete
    val uploadType: String? = null, // DOCUMENTS or DRAWINGS
    val projects: List<ProjectSummary> = emptyList(),
    val selectedProject: ProjectSummary? = null,
    val selectedFileUri: Uri? = null,
    val selectedFileName: String = "",
    val selectedFileSize: Long = 0,
    val description: String = "",
    val uploadProgress: UploadProgress = UploadProgress(),
    val error: String? = null,
    val loadingProjects: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SecureUploadScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onUploadComplete: (fileId: String) -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(UploadScreenState()) }

    // File picker launcher
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            val cursor = context.contentResolver.query(it, null, null, null, null)
            cursor?.use { c ->
                if (c.moveToFirst()) {
                    val nameIndex = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                    val sizeIndex = c.getColumnIndex(android.provider.OpenableColumns.SIZE)
                    val name = if (nameIndex >= 0) c.getString(nameIndex) else "Unknown"
                    val size = if (sizeIndex >= 0) c.getLong(sizeIndex) else 0L
                    state = state.copy(
                        selectedFileUri = it,
                        selectedFileName = name,
                        selectedFileSize = size,
                        step = 3
                    )
                }
            }
        }
    }

    fun loadProjects() {
        scope.launch {
            state = state.copy(loadingProjects = true)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getProjects()
                }
                state = state.copy(
                    projects = response.projects,
                    loadingProjects = false
                )
            } catch (e: Exception) {
                state = state.copy(
                    error = e.message ?: "Failed to load projects",
                    loadingProjects = false
                )
            }
        }
    }

    fun performUpload() {
        val uri = state.selectedFileUri ?: return
        val project = state.selectedProject ?: return

        scope.launch {
            state = state.copy(
                step = 4,
                uploadProgress = UploadProgress(step = UploadStep.REQUESTING_URL),
                error = null
            )

            try {
                // Step 1: Get signed URL
                val signedUrlResponse = withContext(Dispatchers.IO) {
                    apiService.getSignedUploadUrl(
                        SignedUrlRequest(
                            fileName = state.selectedFileName,
                            fileSize = state.selectedFileSize,
                            projectId = project.id,
                            category = state.uploadType
                        )
                    )
                }

                state = state.copy(
                    uploadProgress = UploadProgress(
                        step = UploadStep.UPLOADING,
                        progress = 0f,
                        totalBytes = state.selectedFileSize
                    )
                )

                // Step 2: Upload to Supabase using signed URL
                val inputStream = context.contentResolver.openInputStream(uri)
                val fileBytes = inputStream?.readBytes() ?: throw Exception("Could not read file")
                inputStream.close()

                val client = OkHttpClient()
                val mediaType = context.contentResolver.getType(uri)?.toMediaType()
                    ?: "application/octet-stream".toMediaType()

                val request = Request.Builder()
                    .url(signedUrlResponse.signedUrl)
                    .put(fileBytes.toRequestBody(mediaType))
                    .build()

                val uploadResponse = withContext(Dispatchers.IO) {
                    client.newCall(request).execute()
                }

                if (!uploadResponse.isSuccessful) {
                    throw Exception("Upload failed: ${uploadResponse.code}")
                }

                state = state.copy(
                    uploadProgress = UploadProgress(
                        step = UploadStep.CONFIRMING,
                        progress = 0.9f,
                        bytesUploaded = state.selectedFileSize,
                        totalBytes = state.selectedFileSize
                    )
                )

                // Step 3: Confirm upload
                val confirmResponse = withContext(Dispatchers.IO) {
                    apiService.confirmUpload(
                        ConfirmUploadRequest(
                            projectId = project.id,
                            storagePath = signedUrlResponse.storagePath,
                            originalFileName = state.selectedFileName,
                            fileSize = state.selectedFileSize,
                            category = state.uploadType,
                            description = state.description.ifBlank { null }
                        )
                    )
                }

                state = state.copy(
                    step = 5,
                    uploadProgress = UploadProgress(
                        step = UploadStep.COMPLETE,
                        progress = 1f,
                        bytesUploaded = state.selectedFileSize,
                        totalBytes = state.selectedFileSize
                    )
                )

                confirmResponse.file?.id?.let { fileId ->
                    onUploadComplete(fileId)
                }

            } catch (e: Exception) {
                state = state.copy(
                    uploadProgress = UploadProgress(
                        step = UploadStep.ERROR,
                        errorMessage = e.message ?: "Upload failed"
                    ),
                    error = e.message ?: "Upload failed"
                )
            }
        }
    }

    // Load projects when entering step 2
    LaunchedEffect(state.step) {
        if (state.step == 2 && state.projects.isEmpty()) {
            loadProjects()
        }
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.card_upload_file),
                subtitle = when (state.step) {
                    1 -> stringResource(R.string.common_select)
                    2 -> stringResource(R.string.nav_projects)
                    3 -> stringResource(R.string.common_view)
                    4 -> stringResource(R.string.common_loading)
                    5 -> stringResource(R.string.status_completed)
                    else -> null
                },
                navigationIcon = {
                    IconButton(onClick = {
                        when (state.step) {
                            1 -> onBack()
                            2 -> state = state.copy(step = 1, uploadType = null)
                            3 -> state = state.copy(step = 2, selectedFileUri = null)
                            4 -> {} // Can't go back during upload
                            5 -> onBack()
                            else -> onBack()
                        }
                    }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.common_back)
                        )
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
            // Progress indicator
            if (state.step in 1..3) {
                LinearProgressIndicator(
                    progress = { state.step / 3f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp),
                    color = Primary600,
                    trackColor = Primary100
                )
            }

            // Error banner
            state.error?.let { error ->
                CPErrorBanner(
                    message = error,
                    onDismiss = { state = state.copy(error = null) },
                    onRetry = if (state.step == 4) {{ performUpload() }} else null
                )
            }

            // Content based on step
            when (state.step) {
                1 -> TypeSelectionStep(
                    onSelectType = { type ->
                        state = state.copy(uploadType = type, step = 2)
                    }
                )
                2 -> ProjectSelectionStep(
                    projects = state.projects,
                    loading = state.loadingProjects,
                    selectedProject = state.selectedProject,
                    onSelectProject = { project ->
                        state = state.copy(selectedProject = project)
                    },
                    onContinue = {
                        filePickerLauncher.launch("*/*")
                    }
                )
                3 -> ReviewStep(
                    uploadType = state.uploadType ?: "",
                    project = state.selectedProject,
                    fileName = state.selectedFileName,
                    fileSize = state.selectedFileSize,
                    description = state.description,
                    onDescriptionChange = { state = state.copy(description = it) },
                    onChangeFile = { filePickerLauncher.launch("*/*") },
                    onUpload = { performUpload() }
                )
                4 -> UploadingStep(
                    progress = state.uploadProgress,
                    fileName = state.selectedFileName
                )
                5 -> CompleteStep(
                    uploadType = state.uploadType ?: "",
                    fileName = state.selectedFileName,
                    onDone = onBack,
                    onUploadAnother = {
                        state = UploadScreenState()
                    }
                )
            }
        }
    }
}

@Composable
private fun TypeSelectionStep(
    onSelectType: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(AppSpacing.xl),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = Icons.Default.CloudUpload,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = Primary600
        )

        Spacer(modifier = Modifier.height(AppSpacing.xl))

        Text(
            text = stringResource(R.string.documents_upload_type),
            style = AppTypography.heading2,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(AppSpacing.xs))

        Text(
            text = stringResource(R.string.card_upload_file_desc),
            style = AppTypography.body,
            color = AppColors.textSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(AppSpacing.xxl))

        // Document option
        UploadTypeCard(
            title = stringResource(R.string.documents_general),
            description = stringResource(R.string.card_documents_desc),
            icon = Icons.Default.Description,
            iconColor = Primary600,
            onClick = { onSelectType(UploadType.DOCUMENT) }
        )

        Spacer(modifier = Modifier.height(AppSpacing.md))

        // Drawing option
        UploadTypeCard(
            title = stringResource(R.string.nav_drawings),
            description = stringResource(R.string.card_drawings_desc),
            icon = Icons.Default.Layers,
            iconColor = ConstructionOrange,
            onClick = { onSelectType(UploadType.DRAWING) }
        )
    }
}

@Composable
private fun UploadTypeCard(
    title: String,
    description: String,
    icon: ImageVector,
    iconColor: Color,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(AppSpacing.md),
        colors = CardDefaults.cardColors(
            containerColor = AppColors.cardBackground
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.lg),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(AppSpacing.sm))
                    .background(iconColor.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.width(AppSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = AppTypography.heading3,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = description,
                    style = AppTypography.secondary,
                    color = AppColors.textSecondary
                )
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = AppColors.textSecondary
            )
        }
    }
}

@Composable
private fun ProjectSelectionStep(
    projects: List<ProjectSummary>,
    loading: Boolean,
    selectedProject: ProjectSummary?,
    onSelectProject: (ProjectSummary) -> Unit,
    onContinue: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(AppSpacing.md)
    ) {
        Text(
            text = stringResource(R.string.time_tracking_select_project),
            style = AppTypography.heading3,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(bottom = AppSpacing.md)
        )

        if (loading) {
            CPLoadingIndicator(message = stringResource(R.string.projects_loading))
        } else if (projects.isEmpty()) {
            CPEmptyState(
                icon = Icons.Default.FolderOff,
                title = stringResource(R.string.projects_no_projects),
                description = stringResource(R.string.projects_empty)
            )
        } else {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
            ) {
                projects.forEach { project ->
                    val isSelected = selectedProject?.id == project.id
                    Card(
                        onClick = { onSelectProject(project) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .then(
                                if (isSelected) Modifier.border(
                                    2.dp,
                                    Primary600,
                                    RoundedCornerShape(AppSpacing.sm)
                                ) else Modifier
                            ),
                        shape = RoundedCornerShape(AppSpacing.sm),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) Primary100.copy(alpha = 0.5f)
                            else AppColors.cardBackground
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(AppSpacing.md),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = isSelected,
                                onClick = { onSelectProject(project) },
                                colors = RadioButtonDefaults.colors(
                                    selectedColor = Primary600
                                )
                            )

                            Spacer(modifier = Modifier.width(AppSpacing.sm))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = project.name,
                                    style = AppTypography.bodyLarge,
                                    fontWeight = FontWeight.Medium
                                )
                                project.address?.let { address ->
                                    Text(
                                        text = address,
                                        style = AppTypography.secondary,
                                        color = AppColors.textSecondary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(AppSpacing.md))

            Button(
                onClick = onContinue,
                enabled = selectedProject != null,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(AppSpacing.sm),
                colors = ButtonDefaults.buttonColors(containerColor = Primary600)
            ) {
                Icon(
                    imageVector = Icons.Default.FileOpen,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(AppSpacing.xs))
                Text(stringResource(R.string.common_select))
            }
        }
    }
}

@Composable
private fun ReviewStep(
    uploadType: String,
    project: ProjectSummary?,
    fileName: String,
    fileSize: Long,
    description: String,
    onDescriptionChange: (String) -> Unit,
    onChangeFile: () -> Unit,
    onUpload: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(AppSpacing.md)
            .verticalScroll(rememberScrollState())
    ) {
        // File info card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(AppSpacing.md),
            colors = CardDefaults.cardColors(
                containerColor = AppColors.cardBackground
            )
        ) {
            Column(
                modifier = Modifier.padding(AppSpacing.md)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Row(modifier = Modifier.weight(1f)) {
                        Icon(
                            imageVector = if (uploadType == UploadType.DRAWING)
                                Icons.Default.Layers else Icons.Default.Description,
                            contentDescription = null,
                            tint = if (uploadType == UploadType.DRAWING)
                                ConstructionOrange else Primary600,
                            modifier = Modifier.size(40.dp)
                        )

                        Spacer(modifier = Modifier.width(AppSpacing.sm))

                        Column {
                            Text(
                                text = fileName,
                                style = AppTypography.heading3,
                                fontWeight = FontWeight.Medium,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = formatFileSize(fileSize),
                                style = AppTypography.secondary,
                                color = AppColors.textSecondary
                            )
                        }
                    }

                    TextButton(onClick = onChangeFile) {
                        Text(stringResource(R.string.common_edit), color = Primary600)
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = AppSpacing.sm))

                // Type
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Type",
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                    Text(
                        text = UploadType.displayName(uploadType),
                        style = AppTypography.body,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(AppSpacing.xs))

                // Project
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Project",
                        style = AppTypography.body,
                        color = AppColors.textSecondary
                    )
                    Text(
                        text = project?.name ?: "Unknown",
                        style = AppTypography.body,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(AppSpacing.md))

        // Description field
        OutlinedTextField(
            value = description,
            onValueChange = onDescriptionChange,
            label = { Text(stringResource(R.string.projects_description)) },
            placeholder = { Text(stringResource(R.string.card_upload_file_desc)) },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3,
            shape = RoundedCornerShape(AppSpacing.sm)
        )

        Spacer(modifier = Modifier.weight(1f))

        // Upload button
        Button(
            onClick = onUpload,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(AppSpacing.sm),
            colors = ButtonDefaults.buttonColors(containerColor = Primary600)
        ) {
            Icon(
                imageVector = Icons.Default.CloudUpload,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(AppSpacing.xs))
            Text(stringResource(R.string.documents_upload))
        }
    }
}

@Composable
private fun UploadingStep(
    progress: UploadProgress,
    fileName: String
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(AppSpacing.xxl),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Circular progress
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(120.dp)
        ) {
            CircularProgressIndicator(
                progress = { progress.progress },
                modifier = Modifier.size(120.dp),
                color = Primary600,
                strokeWidth = 8.dp,
                trackColor = Primary100,
                strokeCap = StrokeCap.Round
            )

            Text(
                text = "${(progress.progress * 100).toInt()}%",
                style = AppTypography.heading2,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(AppSpacing.xxl))

        Text(
            text = when (progress.step) {
                UploadStep.REQUESTING_URL -> stringResource(R.string.common_loading)
                UploadStep.UPLOADING -> stringResource(R.string.common_loading)
                UploadStep.CONFIRMING -> stringResource(R.string.common_loading)
                UploadStep.ERROR -> stringResource(R.string.documents_upload_failed)
                else -> stringResource(R.string.common_loading)
            },
            style = AppTypography.heading3,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(AppSpacing.xs))

        Text(
            text = fileName,
            style = AppTypography.body,
            color = AppColors.textSecondary,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        if (progress.totalBytes > 0) {
            Spacer(modifier = Modifier.height(AppSpacing.xs))
            Text(
                text = "${formatFileSize(progress.bytesUploaded)} / ${formatFileSize(progress.totalBytes)}",
                style = AppTypography.secondary,
                color = AppColors.textSecondary
            )
        }
    }
}

@Composable
private fun CompleteStep(
    uploadType: String,
    fileName: String,
    onDone: () -> Unit,
    onUploadAnother: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(AppSpacing.xxl),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(RoundedCornerShape(40.dp))
                .background(ConstructionGreen.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                tint = ConstructionGreen,
                modifier = Modifier.size(48.dp)
            )
        }

        Spacer(modifier = Modifier.height(AppSpacing.xl))

        Text(
            text = stringResource(R.string.common_success),
            style = AppTypography.heading2,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(AppSpacing.xs))

        Text(
            text = stringResource(R.string.success_submitted),
            style = AppTypography.body,
            color = AppColors.textSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(AppSpacing.xs))

        Text(
            text = fileName,
            style = AppTypography.secondary,
            color = AppColors.textSecondary,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        Spacer(modifier = Modifier.height(AppSpacing.xxl))

        Button(
            onClick = onDone,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(AppSpacing.sm),
            colors = ButtonDefaults.buttonColors(containerColor = Primary600)
        ) {
            Text(stringResource(R.string.common_done))
        }

        Spacer(modifier = Modifier.height(AppSpacing.sm))

        OutlinedButton(
            onClick = onUploadAnother,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(AppSpacing.sm)
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(AppSpacing.xs))
            Text(stringResource(R.string.common_add))
        }
    }
}

private fun formatFileSize(bytes: Long): String {
    if (bytes <= 0) return "0 B"
    val units = arrayOf("B", "KB", "MB", "GB")
    val digitGroups = (Math.log10(bytes.toDouble()) / Math.log10(1024.0)).toInt()
    val df = DecimalFormat("#,##0.#")
    return "${df.format(bytes / Math.pow(1024.0, digitGroups.toDouble()))} ${units[digitGroups]}"
}
