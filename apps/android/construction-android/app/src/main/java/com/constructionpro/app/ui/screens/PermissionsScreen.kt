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
    val searchQuery: String = "",
    val projects: List<ProjectSummary> = emptyList(),
    val loadingProjects: Boolean = false,
    val projectSearchQuery: String = ""
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
    var selectedProject by remember { mutableStateOf<ProjectSummary?>(null) }

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
                val users = withContext(Dispatchers.IO) {
                    apiService.getAdminUsers()
                }
                state = state.copy(
                    loadingUsers = false,
                    users = users
                )
            } catch (e: Exception) {
                state = state.copy(loadingUsers = false)
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
                    loadingProjects = false,
                    projects = response.projects
                )
            } catch (e: Exception) {
                state = state.copy(loadingProjects = false)
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
        if (state.selectedTab == 3 && state.projects.isEmpty()) {
            loadProjects()
            // Also load users for the project access editor
            if (state.users.isEmpty()) {
                loadUsers()
            }
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
                containerColor = MaterialTheme.colorScheme.surface,
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
                3 -> ProjectAccessTab(
                    projects = state.projects,
                    loading = state.loadingProjects,
                    searchQuery = state.projectSearchQuery,
                    onSearchChange = { state = state.copy(projectSearchQuery = it) },
                    onProjectClick = { selectedProject = it }
                )
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

    // Project Access Editor Sheet
    selectedProject?.let { project ->
        ProjectAccessEditorSheet(
            project = project,
            allUsers = state.users,
            apiService = apiService,
            onDismiss = { selectedProject = null },
            onSuccess = { loadProjects() }
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
private fun ProjectAccessTab(
    projects: List<ProjectSummary>,
    loading: Boolean,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    onProjectClick: (ProjectSummary) -> Unit
) {
    val filteredProjects = remember(projects, searchQuery) {
        if (searchQuery.isBlank()) projects
        else projects.filter {
            it.name.contains(searchQuery, ignoreCase = true) ||
            (it.address?.contains(searchQuery, ignoreCase = true) == true)
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
            placeholder = { Text("Search projects...") },
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
                CPLoadingIndicator(message = "Loading projects...")
            }
            filteredProjects.isEmpty() -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(AppSpacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = if (searchQuery.isBlank()) Icons.Default.FolderOff else Icons.Default.SearchOff,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = AppColors.gray400
                    )
                    Spacer(modifier = Modifier.height(AppSpacing.md))
                    Text(
                        if (searchQuery.isBlank()) "No projects found" else "No matching projects",
                        style = AppTypography.heading3,
                        color = AppColors.textPrimary
                    )
                    Text(
                        if (searchQuery.isBlank()) "Projects will appear here" else "Try adjusting your search",
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
                            "Project Access",
                            style = AppTypography.heading3,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(bottom = AppSpacing.xs)
                        )
                        Text(
                            "Manage which users have access to each project",
                            style = AppTypography.secondary,
                            color = AppColors.textSecondary,
                            modifier = Modifier.padding(bottom = AppSpacing.md)
                        )
                    }

                    items(filteredProjects) { project ->
                        ProjectAccessCard(
                            project = project,
                            onClick = { onProjectClick(project) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProjectAccessCard(
    project: ProjectSummary,
    onClick: () -> Unit
) {
    val teamCount = project.teamCount

    CPCard(onClick = onClick) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            // Project Icon
            Surface(
                shape = RoundedCornerShape(AppSpacing.sm),
                color = Primary600.copy(alpha = 0.1f),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(
                        imageVector = Icons.Default.Folder,
                        contentDescription = null,
                        tint = Primary600,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            // Project Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    project.name,
                    style = AppTypography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = AppColors.textPrimary
                )
                project.address?.let { address ->
                    Text(
                        address,
                        style = AppTypography.caption,
                        color = AppColors.textSecondary,
                        maxLines = 1
                    )
                }
            }

            // Team Count Badge
            Surface(
                shape = RoundedCornerShape(AppSpacing.xxs),
                color = if (teamCount > 0) ConstructionGreen.copy(alpha = 0.1f) else AppColors.gray100
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = AppSpacing.sm, vertical = AppSpacing.xxs),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.xxs)
                ) {
                    Icon(
                        imageVector = Icons.Default.People,
                        contentDescription = null,
                        tint = if (teamCount > 0) ConstructionGreen else AppColors.gray400,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        "$teamCount",
                        style = AppTypography.captionMedium,
                        color = if (teamCount > 0) ConstructionGreen else AppColors.gray400
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
        containerColor = MaterialTheme.colorScheme.surface
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProjectAccessEditorSheet(
    project: ProjectSummary,
    allUsers: List<UserDetail>,
    apiService: ApiService,
    onDismiss: () -> Unit,
    onSuccess: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var projectDetail by remember { mutableStateOf<ProjectDetail?>(null) }
    var selectedUserIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var searchQuery by remember { mutableStateOf("") }

    // Load project detail to get current team assignments
    LaunchedEffect(project.id) {
        isLoading = true
        try {
            val response = withContext(Dispatchers.IO) {
                apiService.getProject(project.id)
            }
            projectDetail = response.project
            selectedUserIds = response.project.assignments
                ?.mapNotNull { it.user?.id ?: it.userId }
                ?.toSet() ?: emptySet()
        } catch (e: Exception) {
            errorMessage = e.message ?: "Failed to load project details"
        } finally {
            isLoading = false
        }
    }

    val filteredUsers = remember(allUsers, searchQuery) {
        if (searchQuery.isBlank()) allUsers
        else allUsers.filter {
            it.name.contains(searchQuery, ignoreCase = true) ||
            it.email.contains(searchQuery, ignoreCase = true)
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
                .padding(horizontal = AppSpacing.md)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "Project Access",
                        style = AppTypography.heading2,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        project.name,
                        style = AppTypography.secondary,
                        color = AppColors.textSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(AppSpacing.md))

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search users...") },
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = null)
                },
                trailingIcon = {
                    if (searchQuery.isNotBlank()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true
            )

            Spacer(modifier = Modifier.height(AppSpacing.sm))

            // Selected count
            Text(
                "${selectedUserIds.size} user${if (selectedUserIds.size != 1) "s" else ""} selected",
                style = AppTypography.caption,
                color = AppColors.textSecondary
            )

            Spacer(modifier = Modifier.height(AppSpacing.sm))

            errorMessage?.let { error ->
                CPErrorBanner(
                    message = error,
                    onDismiss = { errorMessage = null }
                )
                Spacer(modifier = Modifier.height(AppSpacing.sm))
            }

            when {
                isLoading -> {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                filteredUsers.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.SearchOff,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = AppColors.gray400
                            )
                            Spacer(modifier = Modifier.height(AppSpacing.sm))
                            Text(
                                "No users found",
                                style = AppTypography.body,
                                color = AppColors.textSecondary
                            )
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.xs)
                    ) {
                        items(filteredUsers) { user ->
                            val isSelected = selectedUserIds.contains(user.id)
                            UserAccessRow(
                                user = user,
                                isSelected = isSelected,
                                onClick = {
                                    selectedUserIds = if (isSelected) {
                                        selectedUserIds - user.id
                                    } else {
                                        selectedUserIds + user.id
                                    }
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(AppSpacing.md))

            // Save Button
            CPButton(
                text = if (isSaving) "Saving..." else "Save Changes",
                onClick = {
                    scope.launch {
                        isSaving = true
                        errorMessage = null
                        try {
                            val detail = projectDetail
                            if (detail != null) {
                                withContext(Dispatchers.IO) {
                                    apiService.updateProject(
                                        projectId = project.id,
                                        update = ProjectUpdateRequest(
                                            name = detail.name,
                                            address = detail.address,
                                            description = detail.description,
                                            status = detail.status,
                                            assignedUserIds = selectedUserIds.toList()
                                        )
                                    )
                                }
                                onSuccess()
                                onDismiss()
                            }
                        } catch (e: Exception) {
                            errorMessage = e.message ?: "Failed to save changes"
                        } finally {
                            isSaving = false
                        }
                    }
                },
                enabled = !isSaving && !isLoading,
                loading = isSaving,
                icon = Icons.Default.Check,
                size = CPButtonSize.Large,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(AppSpacing.xl))
        }
    }
}

@Composable
private fun UserAccessRow(
    user: UserDetail,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(AppSpacing.sm),
        color = if (isSelected) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.sm),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.sm)
        ) {
            CPAvatar(
                name = user.name,
                size = 40.dp,
                backgroundColor = Primary600
            )

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    user.name,
                    style = AppTypography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    user.email,
                    style = AppTypography.caption,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Role Badge
            Surface(
                shape = RoundedCornerShape(AppSpacing.xxs),
                color = Primary600.copy(alpha = 0.1f)
            ) {
                Text(
                    UserRole.displayName(user.role),
                    style = AppTypography.captionMedium,
                    color = Primary600,
                    modifier = Modifier.padding(horizontal = AppSpacing.xs, vertical = 2.dp)
                )
            }

            Checkbox(
                checked = isSelected,
                onCheckedChange = { onClick() },
                colors = CheckboxDefaults.colors(
                    checkedColor = ConstructionGreen,
                    uncheckedColor = AppColors.gray400
                )
            )
        }
    }
}
