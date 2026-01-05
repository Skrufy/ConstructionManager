package com.constructionpro.app.ui.screens

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
import com.constructionpro.app.data.local.toEntity
import com.constructionpro.app.data.local.toSummary
import com.constructionpro.app.data.model.DrawingSummary
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class DrawingsState(
    val loading: Boolean = false,
    val drawings: List<DrawingSummary> = emptyList(),
    val error: String? = null,
    val disciplines: List<String> = emptyList(),
    val projects: List<com.constructionpro.app.data.model.DrawingProjectSummary> = emptyList(),
    val offline: Boolean = false,
    val selectedDiscipline: String? = null,
    val selectedProjectId: String? = null
)

// Sorting comparator for drawing numbers (C0.00, C0.01, A1.01, etc.)
private fun parseDrawingNumber(drawingNumber: String?): Pair<String, Double> {
    if (drawingNumber.isNullOrBlank()) return Pair("ZZZ", 999999.0)

    // Extract letter prefix and numeric parts (e.g., "C0.01" -> "C", 0.01)
    val regex = Regex("^([A-Za-z]+)(\\d+(?:\\.\\d+)?)$")
    val match = regex.find(drawingNumber.trim())

    return if (match != null) {
        val prefix = match.groupValues[1].uppercase()
        val number = match.groupValues[2].toDoubleOrNull() ?: 999999.0
        Pair(prefix, number)
    } else {
        // Fallback: use the string as-is with high number
        Pair(drawingNumber.uppercase(), 0.0)
    }
}

private fun sortDrawingsByNumber(drawings: List<DrawingSummary>): List<DrawingSummary> {
    return drawings.sortedWith(compareBy(
        { parseDrawingNumber(it.drawingNumber).first },  // Sort by prefix (A, C, E, M, P, S)
        { parseDrawingNumber(it.drawingNumber).second }  // Then by number
    ))
}

// Valid discipline names for construction drawings
private val validDisciplines = setOf(
    "ARCHITECTURAL", "STRUCTURAL", "MECHANICAL", "ELECTRICAL",
    "PLUMBING", "CIVIL", "FIRE PROTECTION", "LANDSCAPE",
    "INTERIOR", "SITE", "GENERAL", "SPECIFICATIONS"
)

// Display names for disciplines
private val disciplineDisplayNames = mapOf(
    "ARCHITECTURAL" to "Architectural",
    "STRUCTURAL" to "Structural",
    "MECHANICAL" to "Mechanical",
    "ELECTRICAL" to "Electrical",
    "PLUMBING" to "Plumbing",
    "CIVIL" to "Civil",
    "FIRE PROTECTION" to "Fire Protection",
    "LANDSCAPE" to "Landscape",
    "INTERIOR" to "Interior",
    "SITE" to "Site",
    "GENERAL" to "General",
    "SPECIFICATIONS" to "Specifications"
)

// Filter and clean disciplines (remove IDs and invalid values)
private fun filterValidDisciplines(disciplines: List<String>): List<String> {
    return disciplines.filter { discipline ->
        // Filter out strings that look like IDs (contain alphanumerics and are long)
        val cleaned = discipline.uppercase().trim()
        cleaned.length <= 20 && !discipline.contains("-") &&
        (validDisciplines.contains(cleaned) || discipline.all { it.isLetter() || it.isWhitespace() })
    }.distinctBy { it.uppercase() }
}

private fun formatDisciplineName(discipline: String): String {
    val upper = discipline.uppercase().trim()
    return disciplineDisplayNames[upper] ?: discipline.split("_", " ")
        .joinToString(" ") { it.lowercase().replaceFirstChar { c -> c.uppercase() } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DrawingsScreen(
    apiService: ApiService,
    onBack: () -> Unit,
    onOpenDrawing: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(DrawingsState(loading = true)) }
    var searchQuery by remember { mutableStateOf("") }
    val drawingDao = remember { AppDatabase.getInstance(context).drawingDao() }

    // Localized strings for use in coroutines
    val loadFailedMsg = stringResource(R.string.drawings_load_failed)

    fun loadDrawings(
        query: String = searchQuery,
        discipline: String? = state.selectedDiscipline,
        projectId: String? = state.selectedProjectId
    ) {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getDrawings(
                        search = query.takeIf { it.isNotBlank() },
                        discipline = discipline,
                        projectId = projectId
                    )
                }
                val entities = response.drawings.map { it.toEntity() }
                withContext(Dispatchers.IO) {
                    drawingDao.insertAll(entities)
                }
                // Sort drawings by drawing number (C0.00, C0.01, A1.01, etc.)
                val sortedDrawings = sortDrawingsByNumber(response.drawings)
                // Filter and clean discipline list
                val cleanedDisciplines = filterValidDisciplines(response.disciplines)
                state = state.copy(
                    loading = false,
                    drawings = sortedDrawings,
                    disciplines = cleanedDisciplines,
                    projects = response.projects,
                    offline = false
                )
            } catch (error: Exception) {
                val cached = withContext(Dispatchers.IO) {
                    if (query.isBlank()) {
                        drawingDao.getAll()
                    } else {
                        drawingDao.search("%$query%")
                    }
                }.map { it.toSummary() }
                // Sort cached results too
                val sortedCached = sortDrawingsByNumber(cached)
                state = state.copy(
                    loading = false,
                    drawings = sortedCached,
                    disciplines = emptyList(),
                    projects = emptyList(),
                    offline = cached.isNotEmpty(),
                    error = if (cached.isEmpty()) (error.message ?: loadFailedMsg) else null
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        loadDrawings(searchQuery)
    }

    LaunchedEffect(searchQuery) {
        delay(300)
        loadDrawings(searchQuery)
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = stringResource(R.string.drawings_title),
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
                    IconButton(onClick = { loadDrawings() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.common_refresh),
                            tint = AppColors.textSecondary
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
            // Search Bar
            Box(modifier = Modifier.padding(horizontal = AppSpacing.md, vertical = AppSpacing.sm)) {
                CPSearchBar(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    placeholder = stringResource(R.string.drawings_search),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Project Filter Chips
            if (state.projects.isNotEmpty()) {
                Column(modifier = Modifier.padding(bottom = AppSpacing.xs)) {
                    Text(
                        text = stringResource(R.string.drawings_project),
                        style = AppTypography.secondaryMedium,
                        color = AppColors.textSecondary,
                        modifier = Modifier.padding(horizontal = AppSpacing.md, vertical = AppSpacing.xxs)
                    )
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = AppSpacing.md),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        item {
                            FilterChip(
                                selected = state.selectedProjectId == null,
                                onClick = {
                                    state = state.copy(selectedProjectId = null)
                                    loadDrawings(searchQuery, state.selectedDiscipline, null)
                                },
                                label = { Text(stringResource(R.string.drawings_all_projects)) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = ConstructionOrange,
                                    selectedLabelColor = androidx.compose.ui.graphics.Color.White
                                )
                            )
                        }
                        items(state.projects) { project ->
                            FilterChip(
                                selected = state.selectedProjectId == project.id,
                                onClick = {
                                    val newProjectId = if (state.selectedProjectId == project.id) null else project.id
                                    state = state.copy(selectedProjectId = newProjectId)
                                    loadDrawings(searchQuery, state.selectedDiscipline, newProjectId)
                                },
                                label = { Text(project.name ?: stringResource(R.string.drawings_unknown)) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = ConstructionOrange,
                                    selectedLabelColor = androidx.compose.ui.graphics.Color.White
                                )
                            )
                        }
                    }
                }
            }

            // Discipline Filter Chips
            if (state.disciplines.isNotEmpty()) {
                Column(modifier = Modifier.padding(bottom = AppSpacing.xs)) {
                    Text(
                        text = stringResource(R.string.drawings_discipline),
                        style = AppTypography.secondaryMedium,
                        color = AppColors.textSecondary,
                        modifier = Modifier.padding(horizontal = AppSpacing.md, vertical = AppSpacing.xxs)
                    )
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = AppSpacing.md),
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        item {
                            FilterChip(
                                selected = state.selectedDiscipline == null,
                                onClick = {
                                    state = state.copy(selectedDiscipline = null)
                                    loadDrawings(searchQuery, null, state.selectedProjectId)
                                },
                                label = { Text(stringResource(R.string.documents_all)) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Primary600,
                                    selectedLabelColor = androidx.compose.ui.graphics.Color.White
                                )
                            )
                        }
                        items(state.disciplines) { discipline ->
                            FilterChip(
                                selected = state.selectedDiscipline == discipline,
                                onClick = {
                                    val newDiscipline = if (state.selectedDiscipline == discipline) null else discipline
                                    state = state.copy(selectedDiscipline = newDiscipline)
                                    loadDrawings(searchQuery, newDiscipline, state.selectedProjectId)
                                },
                                label = { Text(formatDisciplineName(discipline)) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Primary600,
                                    selectedLabelColor = androidx.compose.ui.graphics.Color.White
                                )
                            )
                        }
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
                            text = stringResource(R.string.drawings_showing_cached),
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
                        onRetry = { loadDrawings() },
                        onDismiss = { state = state.copy(error = null) }
                    )
                }
            }

            // Loading State
            if (state.loading) {
                CPLoadingIndicator(message = stringResource(R.string.drawings_loading))
            }

            // Empty State
            if (!state.loading && state.drawings.isEmpty() && state.error == null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(AppSpacing.xxl),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Architecture,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = AppColors.textMuted
                        )
                        Spacer(modifier = Modifier.height(AppSpacing.md))
                        Text(
                            text = stringResource(R.string.drawings_no_drawings),
                            style = AppTypography.heading3,
                            color = AppColors.textSecondary
                        )
                        Text(
                            text = stringResource(R.string.drawings_empty_desc),
                            style = AppTypography.body,
                            color = AppColors.textMuted
                        )
                    }
                }
            }

            // Drawings List
            if (!state.loading && state.drawings.isNotEmpty()) {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = AppSpacing.md, vertical = AppSpacing.xs),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    items(state.drawings) { drawing ->
                        DrawingCard(
                            drawing = drawing,
                            onClick = { drawing.id?.let { onOpenDrawing(it) } }
                        )
                    }
                    item {
                        Spacer(modifier = Modifier.height(AppSpacing.md))
                    }
                }
            }
        }
    }
}

@Composable
private fun DrawingCard(
    drawing: DrawingSummary,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
        ) {
            // Drawing Icon/Thumbnail
            Surface(
                modifier = Modifier.size(72.dp),
                shape = RoundedCornerShape(AppSpacing.xs),
                color = Primary100
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Architecture,
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = Primary600
                    )
                }
            }

            // Drawing Info
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
            ) {
                // Drawing Number Badge
                drawing.drawingNumber?.let { number ->
                    CPBadge(
                        text = number,
                        color = Primary700,
                        backgroundColor = Primary100
                    )
                }

                // Title or Drawing Number
                // Show title if it exists and is different from drawing number
                // Otherwise show drawing number as the title
                val untitledDrawing = stringResource(R.string.drawings_untitled)
                val displayTitle = when {
                    !drawing.title.isNullOrBlank() && drawing.title != drawing.drawingNumber -> drawing.title
                    !drawing.drawingNumber.isNullOrBlank() -> drawing.drawingNumber
                    else -> untitledDrawing
                }

                Text(
                    text = displayTitle,
                    style = AppTypography.heading3,
                    color = AppColors.textPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                // Project Name
                drawing.project?.name?.let { projectName ->
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
                    // Discipline/Subcategory
                    drawing.subcategory?.let { subcategory ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Category,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = AppColors.textMuted
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xxs))
                            Text(
                                text = subcategory,
                                style = AppTypography.caption,
                                color = AppColors.textSecondary
                            )
                        }
                    }

                    // Scale
                    drawing.scale?.let { scale ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Straighten,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = AppColors.textMuted
                            )
                            Spacer(modifier = Modifier.width(AppSpacing.xxs))
                            Text(
                                text = scale,
                                style = AppTypography.caption,
                                color = AppColors.textSecondary
                            )
                        }
                    }

                    // Annotation count removed - annotations are now local-only and not persisted
                }
            }

            // Chevron
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = stringResource(R.string.drawings_view),
                tint = AppColors.textMuted,
                modifier = Modifier.align(Alignment.CenterVertically)
            )
        }
    }
}
