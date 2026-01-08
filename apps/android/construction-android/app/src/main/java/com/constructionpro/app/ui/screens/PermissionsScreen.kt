package com.constructionpro.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.constructionpro.app.data.ApiService
import com.constructionpro.app.data.model.*
import com.constructionpro.app.ui.components.*
import com.constructionpro.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class PermissionsState(
    val loading: Boolean = false,
    val error: String? = null,
    val selectedTab: Int = 0,
    val projectTemplates: List<PermissionTemplate> = emptyList(),
    val companyTemplates: List<PermissionTemplate> = emptyList(),
    val users: List<UserDetail> = emptyList(),
    val loadingUsers: Boolean = false,
    val searchQuery: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PermissionsScreen(
    apiService: ApiService,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(PermissionsState(loading = true)) }
    var selectedUser by remember { mutableStateOf<UserDetail?>(null) }

    fun loadTemplates() {
        scope.launch {
            state = state.copy(loading = true, error = null)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getPermissionTemplates()
                }
                state = state.copy(
                    loading = false,
                    projectTemplates = response.templates.filter { it.scope == "project" },
                    companyTemplates = response.templates.filter { it.scope == "company" }
                )
            } catch (e: Exception) {
                state = state.copy(
                    loading = false,
                    error = e.message ?: "Failed to load templates"
                )
            }
        }
    }

    fun loadUsers() {
        scope.launch {
            state = state.copy(loadingUsers = true)
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getAdminUsers()
                }
                state = state.copy(
                    loadingUsers = false,
                    users = response.users
                )
            } catch (e: Exception) {
                state = state.copy(loadingUsers = false)
            }
        }
    }

    LaunchedEffect(Unit) {
        loadTemplates()
    }

    LaunchedEffect(state.selectedTab) {
        if (state.selectedTab == 2 && state.users.isEmpty()) {
            loadUsers()
        }
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            CPTopAppBar(
                title = "Permissions",
                navigationIcon = {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.size(56.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
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
            // Tab Row
            ScrollableTabRow(
                selectedTabIndex = state.selectedTab,
                containerColor = Color.White,
                edgePadding = AppSpacing.md
            ) {
                Tab(
                    selected = state.selectedTab == 0,
                    onClick = { state = state.copy(selectedTab = 0) },
                    modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                ) {
                    Text(
                        "Project",
                        modifier = Modifier.padding(AppSpacing.sm),
                        style = if (state.selectedTab == 0) AppTypography.bodySemibold else AppTypography.body
                    )
                }
                Tab(
                    selected = state.selectedTab == 1,
                    onClick = { state = state.copy(selectedTab = 1) },
                    modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                ) {
                    Text(
                        "Company",
                        modifier = Modifier.padding(AppSpacing.sm),
                        style = if (state.selectedTab == 1) AppTypography.bodySemibold else AppTypography.body
                    )
                }
                Tab(
                    selected = state.selectedTab == 2,
                    onClick = { state = state.copy(selectedTab = 2) },
                    modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                ) {
                    Text(
                        "Users",
                        modifier = Modifier.padding(AppSpacing.sm),
                        style = if (state.selectedTab == 2) AppTypography.bodySemibold else AppTypography.body
                    )
                }
                Tab(
                    selected = state.selectedTab == 3,
                    onClick = { state = state.copy(selectedTab = 3) },
                    modifier = Modifier.defaultMinSize(minHeight = 56.dp)
                ) {
                    Text(
                        "Access",
                        modifier = Modifier.padding(AppSpacing.sm),
                        style = if (state.selectedTab == 3) AppTypography.bodySemibold else AppTypography.body
                    )
                }
            }

            Divider()

            // Tab Content
            when (state.selectedTab) {
                0 -> ProjectTemplatesTab(
                    templates = state.projectTemplates,
                    loading = state.loading,
                    error = state.error
                )
                1 -> CompanyTemplatesTab(
                    templates = state.companyTemplates,
                    loading = state.loading,
                    error = state.error
                )
                2 -> UserAssignmentsTab(
                    users = state.users,
                    loading = state.loadingUsers,
                    searchQuery = state.searchQuery,
                    onSearchChange = { state = state.copy(searchQuery = it) },
                    onUserClick = { selectedUser = it }
                )
                3 -> ProjectAccessTab()
            }
        }
    }

    // User Assignment Sheet
    selectedUser?.let { user ->
        AssignCompanyTemplateSheet(
            user = user,
            companyTemplates = state.companyTemplates,
            apiService = apiService,
            onDismiss = { selectedUser = null },
            onSuccess = { loadUsers() }
        )
    }
}

@Composable
private fun ProjectTemplatesTab(
    templates: List<PermissionTemplate>,
    loading: Boolean,
    error: String?
) {
    Box(modifier = Modifier.fillMaxSize()) {
        when {
            loading -> {
                CPLoadingIndicator(message = "Loading templates...")
            }
            error != null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(AppSpacing.md)
                ) {
                    CPErrorBanner(
                        message = error,
                        onDismiss = {}
                    )
                }
            }
            templates.isEmpty() -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(AppSpacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.FolderOff,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = AppColors.gray400
                    )
                    Spacer(modifier = Modifier.height(AppSpacing.md))
                    Text(
                        "No project templates",
                        style = AppTypography.heading3,
                        color = AppColors.textPrimary
                    )
                    Text(
                        "Project permission templates will appear here",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(AppSpacing.md),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    item {
                        Text(
                            "Project Templates",
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(bottom = AppSpacing.xs)
                        )
                        Text(
                            "Define what users can do within specific projects",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary,
                            modifier = Modifier.padding(bottom = AppSpacing.md)
                        )
                    }
                    
                    items(templates) { template ->
                        PermissionTemplateCard(template = template)
                    }
                }
            }
        }
    }
}

@Composable
private fun CompanyTemplatesTab(
    templates: List<PermissionTemplate>,
    loading: Boolean,
    error: String?
) {
    Box(modifier = Modifier.fillMaxSize()) {
        when {
            loading -> {
                CPLoadingIndicator(message = "Loading templates...")
            }
            error != null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(AppSpacing.md)
                ) {
                    CPErrorBanner(
                        message = error,
                        onDismiss = {}
                    )
                }
            }
            templates.isEmpty() -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(AppSpacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.BusinessCenter,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = AppColors.gray400
                    )
                    Spacer(modifier = Modifier.height(AppSpacing.md))
                    Text(
                        "No company templates",
                        style = AppTypography.heading3,
                        color = AppColors.textPrimary
                    )
                    Text(
                        "Company permission templates will appear here",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(AppSpacing.md),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    item {
                        Text(
                            "Company Templates",
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(bottom = AppSpacing.xs)
                        )
                        Text(
                            "Define what users can do at the company level",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary,
                            modifier = Modifier.padding(bottom = AppSpacing.md)
                        )
                    }
                    
                    items(templates) { template ->
                        PermissionTemplateCard(template = template)
                    }
                }
            }
        }
    }
}

@Composable
private fun UserAssignmentsTab(
    users: List<UserDetail>,
    loading: Boolean,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onUserClick: (UserDetail) -> Unit
) {
    val filteredUsers = remember(users, searchQuery) {
        if (searchQuery.isBlank()) users
        else users.filter {
            it.name.contains(searchQuery, ignoreCase = true) ||
            it.email.contains(searchQuery, ignoreCase = true)
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Search Bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md),
            placeholder = { Text("Search users...") },
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = null)
            },
            trailingIcon = {
                if (searchQuery.isNotBlank()) {
                    IconButton(onClick = { onSearchChange("") }) {
                        Icon(Icons.Default.Close, contentDescription = "Clear")
                    }
                }
            },
            singleLine = true
        )

        when {
            loading -> {
                CPLoadingIndicator(message = "Loading users...")
            }
            filteredUsers.isEmpty() -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(AppSpacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = if (searchQuery.isBlank()) Icons.Default.People else Icons.Default.SearchOff,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = AppColors.gray400
                    )
                    Spacer(modifier = Modifier.height(AppSpacing.md))
                    Text(
                        if (searchQuery.isBlank()) "No users found" else "No matching users",
                        style = AppTypography.heading3,
                        color = AppColors.textPrimary
                    )
                    Text(
                        if (searchQuery.isBlank()) "Users will appear here" else "Try adjusting your search",
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(AppSpacing.md),
                    verticalArrangement = Arrangement.spacedBy(AppSpacing.sm)
                ) {
                    item {
                        Text(
                            "User Assignments",
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(bottom = AppSpacing.xs)
                        )
                        Text(
                            "Assign company-wide permission templates to users",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary,
                            modifier = Modifier.padding(bottom = AppSpacing.md)
                        )
                    }
                    
                    items(filteredUsers) { user ->
                        UserAssignmentCard(
                            user = user,
                            onClick = { onUserClick(user) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProjectAccessTab() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(AppSpacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Lock,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = AppColors.gray400
        )
        Spacer(modifier = Modifier.height(AppSpacing.md))
        Text(
            "Project Access",
            style = AppTypography.heading3,
            color = AppColors.textPrimary
        )
        Text(
            "Project-level permissions will appear here",
            style = AppTypography.secondary,
            color = AppColors.textSecondary
        )
    }
}

@Composable
private fun PermissionTemplateCard(template: PermissionTemplate) {
    CPCard {
        Column(
            modifier = Modifier.padding(AppSpacing.md)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        Text(
                            template.name,
                            style = AppTypography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = AppColors.textPrimary
                        )
                        
                        if (template.isSystemDefault) {
                            Surface(
                                shape = RoundedCornerShape(AppSpacing.xxs),
                                color = Purple.copy(alpha = 0.1f)
                            ) {
                                Text(
                                    "Default",
                                    style = AppTypography.captionMedium,
                                    color = Purple,
                                    modifier = Modifier.padding(horizontal = AppSpacing.xs, vertical = 2.dp)
                                )
                            }
                        }
                    }
                    
                    template.description?.let { desc ->
                        Text(
                            desc,
                            style = AppTypography.caption,
                            color = AppColors.textSecondary,
                            modifier = Modifier.padding(top = AppSpacing.xxs)
                        )
                    }
                }
                
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = AppColors.gray400
                )
            }
            
            if (template.usageCount > 0) {
                Text(
                    "${template.usageCount} user${if (template.usageCount != 1) "s" else ""}",
                    style = AppTypography.caption,
                    color = AppColors.textTertiary,
                    modifier = Modifier.padding(top = AppSpacing.sm)
                )
            }
        }
    }
}

@Composable
private fun UserAssignmentCard(
    user: UserDetail,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Avatar
            CPAvatar(
                name = user.name,
                size = 44.dp,
                backgroundColor = Primary600
            )
            
            // User Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    user.name,
                    style = AppTypography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = AppColors.textPrimary
                )
                Text(
                    user.email,
                    style = AppTypography.caption,
                    color = AppColors.textSecondary
                )
            }
            
            // Template Badge or Not Assigned
            Column(horizontalAlignment = Alignment.End) {
                // Show company template name if assigned
                // For now, showing placeholder
                Surface(
                    shape = RoundedCornerShape(AppSpacing.xxs),
                    color = ConstructionOrange.copy(alpha = 0.1f)
                ) {
                    Text(
                        "Not assigned",
                        style = AppTypography.captionMedium,
                        color = ConstructionOrange,
                        modifier = Modifier.padding(horizontal = AppSpacing.xs, vertical = 2.dp)
                    )
                }
            }
            
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = AppColors.gray400,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AssignCompanyTemplateSheet(
    user: UserDetail,
    companyTemplates: List<PermissionTemplate>,
    apiService: ApiService,
    onDismiss: () -> Unit,
    onSuccess: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var selectedTemplateId by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md)
        ) {
            Text(
                "Assign Template",
                style = AppTypography.heading2,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = AppSpacing.md)
            )

            // User Info Card
            CPCard {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(AppSpacing.md),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.md)
                ) {
                    CPAvatar(
                        name = user.name,
                        size = 56.dp,
                        backgroundColor = Primary600
                    )
                    
                    Column {
                        Text(
                            user.name,
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            user.email,
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(AppSpacing.md))

            Text(
                "Company Template",
                style = AppTypography.label,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(bottom = AppSpacing.sm)
            )

            if (companyTemplates.isEmpty()) {
                CPCard {
                    Text(
                        "No company templates available",
                        style = AppTypography.secondary,
                        color = AppColors.textTertiary,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(AppSpacing.md)
                    )
                }
            } else {
                companyTemplates.forEach { template ->
                    TemplateSelectionRow(
                        template = template,
                        isSelected = selectedTemplateId == template.id,
                        onClick = { selectedTemplateId = template.id }
                    )
                    Spacer(modifier = Modifier.height(AppSpacing.xs))
                }
            }

            errorMessage?.let { error ->
                Spacer(modifier = Modifier.height(AppSpacing.sm))
                Text(
                    error,
                    style = AppTypography.secondary,
                    color = ConstructionRed,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(AppSpacing.sm)
                )
            }

            Spacer(modifier = Modifier.height(AppSpacing.md))

            CPButton(
                text = if (isLoading) "Assigning..." else "Assign Template",
                onClick = {
                    selectedTemplateId?.let { templateId ->
                        scope.launch {
                            isLoading = true
                            errorMessage = null
                            try {
                                withContext(Dispatchers.IO) {
                                    apiService.assignCompanyTemplate(
                                        AssignCompanyTemplateRequest(
                                            userId = user.id,
                                            companyTemplateId = templateId
                                        )
                                    )
                                }
                                onSuccess()
                                onDismiss()
                            } catch (e: Exception) {
                                errorMessage = e.message ?: "Failed to assign template"
                            } finally {
                                isLoading = false
                            }
                        }
                    }
                },
                enabled = selectedTemplateId != null && !isLoading,
                loading = isLoading,
                icon = Icons.Default.Check,
                size = CPButtonSize.Large,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(AppSpacing.xl))
        }
    }
}

@Composable
private fun TemplateSelectionRow(
    template: PermissionTemplate,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                ) {
                    Text(
                        template.name,
                        style = AppTypography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = AppColors.textPrimary
                    )
                    
                    if (template.isSystemDefault) {
                        Surface(
                            shape = RoundedCornerShape(AppSpacing.xxs),
                            color = Purple.copy(alpha = 0.1f)
                        ) {
                            Text(
                                "Default",
                                style = AppTypography.captionMedium,
                                color = Purple,
                                modifier = Modifier.padding(horizontal = AppSpacing.xs, vertical = 2.dp)
                            )
                        }
                    }
                }
                
                template.description?.let { desc ->
                    Text(
                        desc,
                        style = AppTypography.caption,
                        color = AppColors.textSecondary,
                        maxLines = 2,
                        modifier = Modifier.padding(top = AppSpacing.xxs)
                    )
                }
            }
            
            Icon(
                imageVector = if (isSelected) Icons.Default.CheckCircle else Icons.Default.Circle,
                contentDescription = null,
                tint = if (isSelected) ConstructionGreen else AppColors.gray300,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}
