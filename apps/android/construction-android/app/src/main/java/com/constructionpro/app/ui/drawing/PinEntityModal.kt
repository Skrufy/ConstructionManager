package com.constructionpro.app.ui.drawing

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.LinkOff
import androidx.compose.material.icons.filled.QuestionAnswer
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SheetState
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.constructionpro.app.data.model.AnnotationColors
import com.constructionpro.app.data.model.AnnotationDraft
import com.constructionpro.app.data.model.EntitySearchResult
import com.constructionpro.app.data.model.LinkedEntity
import com.constructionpro.app.data.model.LinkedEntityType
import com.constructionpro.app.data.model.NormalizedPoint

/**
 * Modal bottom sheet for configuring PIN annotations.
 * Features: entity type tabs, search, label input, color picker.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PinEntityModal(
    isVisible: Boolean,
    pinPosition: NormalizedPoint,
    pageNumber: Int,
    currentColor: String,
    existingPin: AnnotationDraft? = null,
    projectId: String,
    entities: List<EntitySearchResult>,
    isSearching: Boolean,
    onSearch: (entityType: String, query: String) -> Unit,
    onSave: (AnnotationDraft) -> Unit,
    onDelete: (() -> Unit)? = null,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    if (isVisible) {
        ModalBottomSheet(
            onDismissRequest = onDismiss,
            sheetState = sheetState,
            dragHandle = { BottomSheetDragHandle() }
        ) {
            PinConfigurationContent(
                pinPosition = pinPosition,
                pageNumber = pageNumber,
                currentColor = currentColor,
                existingPin = existingPin,
                projectId = projectId,
                entities = entities,
                isSearching = isSearching,
                onSearch = onSearch,
                onSave = onSave,
                onDelete = onDelete,
                onDismiss = onDismiss
            )
        }
    }
}

@Composable
private fun BottomSheetDragHandle() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .width(40.dp)
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
        )
    }
}

@Composable
private fun PinConfigurationContent(
    pinPosition: NormalizedPoint,
    pageNumber: Int,
    currentColor: String,
    existingPin: AnnotationDraft?,
    projectId: String,
    entities: List<EntitySearchResult>,
    isSearching: Boolean,
    onSearch: (entityType: String, query: String) -> Unit,
    onSave: (AnnotationDraft) -> Unit,
    onDelete: (() -> Unit)?,
    onDismiss: () -> Unit
) {
    // State
    var selectedTab by remember { mutableIntStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedEntity by remember { mutableStateOf<EntitySearchResult?>(null) }
    var customLabel by remember { mutableStateOf(existingPin?.label ?: "") }
    var selectedColor by remember { mutableStateOf(existingPin?.color ?: currentColor) }
    var customComment by remember { mutableStateOf(existingPin?.text ?: "") }

    // Initialize from existing PIN
    LaunchedEffect(existingPin) {
        existingPin?.linkedEntity?.let { linked ->
            LinkedEntityType.fromValue(linked.type)?.let { type ->
                selectedTab = EntityTab.entries.indexOfFirst { it.entityType == type }
            }
        }
    }

    val entityTabs = EntityTab.entries
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(scrollState)
            .padding(horizontal = 16.dp)
            .padding(bottom = 24.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (existingPin != null) "Edit Pin" else "Add Pin",
                style = MaterialTheme.typography.titleLarge
            )

            IconButton(onClick = onDismiss) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Close"
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Label input
        OutlinedTextField(
            value = customLabel,
            onValueChange = { customLabel = it.take(20) },
            label = { Text("Label (optional)") },
            placeholder = { Text("e.g., 'Fix tile', 'Review'") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            supportingText = { Text("${customLabel.length}/20 characters") }
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Color picker
        Text(
            text = "Color",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            AnnotationColors.ALL.forEach { color ->
                ColorOption(
                    color = color,
                    isSelected = color == selectedColor,
                    onClick = { selectedColor = color }
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Entity linking section
        Text(
            text = "Link to Entity (optional)",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Entity type tabs
        TabRow(
            selectedTabIndex = selectedTab,
            modifier = Modifier.clip(RoundedCornerShape(8.dp))
        ) {
            entityTabs.forEachIndexed { index, tab ->
                Tab(
                    selected = selectedTab == index,
                    onClick = {
                        selectedTab = index
                        selectedEntity = null
                        searchQuery = ""
                    },
                    text = { Text(tab.label) },
                    icon = {
                        Icon(
                            imageVector = tab.icon,
                            contentDescription = tab.label,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Search input
        val keyboardController = LocalSoftwareKeyboardController.current
        val focusRequester = remember { FocusRequester() }

        OutlinedTextField(
            value = searchQuery,
            onValueChange = {
                searchQuery = it
                if (it.length >= 2) {
                    onSearch(entityTabs[selectedTab].entityType.value, it)
                }
            },
            label = { Text("Search ${entityTabs[selectedTab].label}s") },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search"
                )
            },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { searchQuery = "" }) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Clear"
                        )
                    }
                }
            },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(focusRequester),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(
                onSearch = {
                    keyboardController?.hide()
                    onSearch(entityTabs[selectedTab].entityType.value, searchQuery)
                }
            )
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Selected entity display
        selectedEntity?.let { entity ->
            SelectedEntityCard(
                entity = entity,
                onRemove = { selectedEntity = null }
            )
        }

        // Search results
        if (searchQuery.length >= 2) {
            AnimatedVisibility(
                visible = true,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    if (isSearching) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    } else if (entities.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No ${entityTabs[selectedTab].label}s found",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.height(200.dp)
                        ) {
                            items(entities) { entity ->
                                EntitySearchResultItem(
                                    entity = entity,
                                    isSelected = entity.id == selectedEntity?.id,
                                    onClick = {
                                        selectedEntity = entity
                                        searchQuery = ""
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

        // Create new entity option
        TextButton(
            onClick = { /* TODO: Navigate to create new entity */ },
            modifier = Modifier.align(Alignment.Start)
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text("Create new ${entityTabs[selectedTab].label}")
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Comment input (for PIN-only comment)
        OutlinedTextField(
            value = customComment,
            onValueChange = { customComment = it },
            label = { Text("Comment (optional)") },
            placeholder = { Text("Add a comment to this pin...") },
            minLines = 2,
            maxLines = 4,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Action buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Delete button (only for existing pins)
            if (onDelete != null) {
                OutlinedButton(
                    onClick = onDelete,
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Delete")
                }
            }

            // Cancel button
            OutlinedButton(
                onClick = onDismiss,
                modifier = Modifier.weight(1f)
            ) {
                Text("Cancel")
            }

            // Save button
            Button(
                onClick = {
                    val linkedEntity = selectedEntity?.let { entity ->
                        LinkedEntity(
                            type = entity.type,
                            id = entity.id,
                            title = entity.title,
                            status = entity.status
                        )
                    }

                    val pin = AnnotationDraft(
                        id = existingPin?.id,
                        type = com.constructionpro.app.data.model.AnnotationType.PIN,
                        pageNumber = pageNumber,
                        position = pinPosition,
                        color = selectedColor,
                        label = customLabel.takeIf { it.isNotBlank() },
                        text = customComment.takeIf { it.isNotBlank() },
                        linkedEntity = linkedEntity,
                        isPending = true,
                        createdAt = existingPin?.createdAt,
                        createdBy = existingPin?.createdBy
                    )
                    onSave(pin)
                },
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(if (existingPin != null) "Update" else "Add Pin")
            }
        }
    }
}

@Composable
private fun ColorOption(
    color: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(AnnotationRenderer.parseColor(color))
            .border(
                width = if (isSelected) 3.dp else 1.dp,
                color = if (isSelected) Color.White else Color.Gray.copy(alpha = 0.3f),
                shape = CircleShape
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = "Selected",
                tint = Color.White,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
private fun SelectedEntityCard(
    entity: EntitySearchResult,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    imageVector = Icons.Default.Link,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Column {
                    Text(
                        text = entity.title,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    entity.status?.let { status ->
                        StatusBadge(status = status)
                    }
                }
            }

            IconButton(onClick = onRemove) {
                Icon(
                    imageVector = Icons.Default.LinkOff,
                    contentDescription = "Remove link"
                )
            }
        }
    }
}

@Composable
private fun EntitySearchResultItem(
    entity: EntitySearchResult,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        color = if (isSelected)
            MaterialTheme.colorScheme.primaryContainer
        else
            Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Type icon
            val icon = when (LinkedEntityType.fromValue(entity.type)) {
                LinkedEntityType.COMMENT -> Icons.Default.ChatBubble
                LinkedEntityType.ISSUE -> Icons.Default.BugReport
                LinkedEntityType.RFI -> Icons.Default.QuestionAnswer
                LinkedEntityType.PUNCH_LIST_ITEM -> Icons.Default.Assignment
                null -> Icons.Default.Description
            }

            Icon(
                imageVector = icon,
                contentDescription = entity.type,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = entity.title,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                entity.projectName?.let { projectName ->
                    Text(
                        text = projectName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            entity.status?.let { status ->
                StatusBadge(status = status)
            }

            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "Selected",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier
) {
    val (color, icon) = when (status.lowercase()) {
        "open", "pending", "in_progress" -> MaterialTheme.colorScheme.tertiary to Icons.Default.Warning
        "resolved", "completed", "closed" -> Color(0xFF22C55E) to Icons.Default.CheckCircle
        "rejected", "failed" -> MaterialTheme.colorScheme.error to Icons.Default.Error
        else -> MaterialTheme.colorScheme.onSurfaceVariant to null
    }

    Surface(
        modifier = modifier,
        color = color.copy(alpha = 0.15f),
        shape = RoundedCornerShape(4.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            icon?.let {
                Icon(
                    imageVector = it,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(12.dp)
                )
            }
            Text(
                text = status.replace("_", " ").replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.labelSmall,
                color = color
            )
        }
    }
}

/**
 * Entity type tabs for the PIN modal
 */
private enum class EntityTab(
    val label: String,
    val icon: ImageVector,
    val entityType: LinkedEntityType
) {
    COMMENT("Comment", Icons.Default.ChatBubble, LinkedEntityType.COMMENT),
    ISSUE("Issue", Icons.Default.BugReport, LinkedEntityType.ISSUE),
    RFI("RFI", Icons.Default.QuestionAnswer, LinkedEntityType.RFI),
    PUNCH_LIST("Punch List", Icons.Default.Assignment, LinkedEntityType.PUNCH_LIST_ITEM)
}

/**
 * Quick PIN creation dialog (simplified version for fast PIN drops)
 */
@Composable
fun QuickPinDialog(
    isVisible: Boolean,
    pinPosition: NormalizedPoint,
    pageNumber: Int,
    currentColor: String,
    onSave: (AnnotationDraft) -> Unit,
    onAdvanced: () -> Unit,
    onDismiss: () -> Unit
) {
    if (!isVisible) return

    Card(
        modifier = Modifier
            .width(280.dp)
            .padding(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Quick Pin",
                style = MaterialTheme.typography.titleMedium
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Quick color selection
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                var selectedColor by remember { mutableStateOf(currentColor) }

                AnnotationColors.ALL.take(4).forEach { color ->
                    ColorOption(
                        color = color,
                        isSelected = color == selectedColor,
                        onClick = { selectedColor = color }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onAdvanced,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("More")
                }

                Button(
                    onClick = {
                        val pin = AnnotationDraft(
                            type = com.constructionpro.app.data.model.AnnotationType.PIN,
                            pageNumber = pageNumber,
                            position = pinPosition,
                            color = currentColor,
                            isPending = true
                        )
                        onSave(pin)
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Add")
                }
            }
        }
    }
}

/**
 * Confirmation dialog for resolving/unresolving a PIN
 */
@Composable
fun PinResolveDialog(
    isVisible: Boolean,
    pin: AnnotationDraft,
    isResolved: Boolean,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    if (!isVisible) return

    Card(
        modifier = Modifier
            .width(300.dp)
            .padding(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = if (isResolved) Icons.Default.CheckCircle else Icons.Default.Warning,
                contentDescription = null,
                tint = if (isResolved) Color(0xFF22C55E) else MaterialTheme.colorScheme.tertiary,
                modifier = Modifier.size(48.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = if (isResolved) "Unresolve Pin?" else "Resolve Pin?",
                style = MaterialTheme.typography.titleMedium
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = if (isResolved)
                    "This will mark the pin as open again."
                else
                    "This will mark the pin as resolved.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Cancel")
                }

                Button(
                    onClick = onConfirm,
                    modifier = Modifier.weight(1f)
                ) {
                    Text(if (isResolved) "Unresolve" else "Resolve")
                }
            }
        }
    }
}
