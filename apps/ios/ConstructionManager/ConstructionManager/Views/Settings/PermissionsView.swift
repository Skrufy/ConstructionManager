//
//  PermissionsView.swift
//  ConstructionManager
//
//  Permissions management view for configuring role and user permissions
//

import SwiftUI

struct PermissionsView: View {
    @State private var selectedTab = 0
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Selector - Scrollable for 4 tabs
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: AppSpacing.xs) {
                        PermissionTabButton(title: "Project", isSelected: selectedTab == 0) {
                            selectedTab = 0
                        }
                        PermissionTabButton(title: "Company", isSelected: selectedTab == 1) {
                            selectedTab = 1
                        }
                        PermissionTabButton(title: "Users", isSelected: selectedTab == 2) {
                            selectedTab = 2
                        }
                        PermissionTabButton(title: "Access", isSelected: selectedTab == 3) {
                            selectedTab = 3
                        }
                    }
                    .padding(.horizontal, AppSpacing.md)
                }
                .padding(.vertical, AppSpacing.sm)

                TabView(selection: $selectedTab) {
                    ProjectTemplatesTab()
                        .tag(0)

                    CompanyTemplatesTab()
                        .tag(1)

                    UserAssignmentsTab()
                        .tag(2)

                    ProjectAccessTab()
                        .tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .background(AppColors.background)
            .navigationTitle("Permissions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Permission Tab Button
struct PermissionTabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(isSelected ? AppTypography.bodySemibold : AppTypography.body)
                .foregroundColor(isSelected ? AppColors.primary600 : AppColors.textSecondary)
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
                .background(isSelected ? AppColors.primary100 : Color.clear)
                .cornerRadius(AppSpacing.radiusFull)
        }
    }
}

// MARK: - Project Templates Tab
struct ProjectTemplatesTab: View {
    @StateObject private var adminService = AdminService.shared
    @State private var selectedTemplate: PermissionTemplate?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                // Description
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("Project Templates")
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)

                    Text("Define what users can do within specific projects")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                // Templates List
                if adminService.isLoading {
                    HStack {
                        Spacer()
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle())
                        Spacer()
                    }
                    .padding(.vertical, AppSpacing.xl)
                } else if adminService.projectTemplates.isEmpty {
                    AppCard {
                        VStack(spacing: AppSpacing.sm) {
                            Image(systemName: "folder.badge.gearshape")
                                .font(.system(size: 32))
                                .foregroundColor(AppColors.gray400)
                            Text("No project templates")
                                .font(AppTypography.bodyMedium)
                                .foregroundColor(AppColors.textSecondary)
                            Text("Project permission templates will appear here")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textTertiary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, AppSpacing.lg)
                    }
                } else {
                    ForEach(adminService.projectTemplates) { template in
                        Button(action: { selectedTemplate = template }) {
                            PermissionTemplateCard(template: template)
                        }
                    }
                }
            }
            .padding(AppSpacing.md)
        }
        .onAppear {
            Task {
                await adminService.fetchPermissionTemplates()
            }
        }
        .sheet(item: $selectedTemplate) { template in
            PermissionTemplateDetailView(template: template)
        }
    }
}

// MARK: - Company Templates Tab
struct CompanyTemplatesTab: View {
    @StateObject private var adminService = AdminService.shared
    @State private var selectedTemplate: PermissionTemplate?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                // Description
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("Company Templates")
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)

                    Text("Define what users can do at the company level")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                // Templates List
                if adminService.isLoading {
                    HStack {
                        Spacer()
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle())
                        Spacer()
                    }
                    .padding(.vertical, AppSpacing.xl)
                } else if adminService.companyTemplates.isEmpty {
                    AppCard {
                        VStack(spacing: AppSpacing.sm) {
                            Image(systemName: "building.2.crop.circle.badge.gearshape")
                                .font(.system(size: 32))
                                .foregroundColor(AppColors.gray400)
                            Text("No company templates")
                                .font(AppTypography.bodyMedium)
                                .foregroundColor(AppColors.textSecondary)
                            Text("Company permission templates will appear here")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textTertiary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, AppSpacing.lg)
                    }
                } else {
                    ForEach(adminService.companyTemplates) { template in
                        Button(action: { selectedTemplate = template }) {
                            PermissionTemplateCard(template: template)
                        }
                    }
                }
            }
            .padding(AppSpacing.md)
        }
        .onAppear {
            Task {
                await adminService.fetchPermissionTemplates()
            }
        }
        .sheet(item: $selectedTemplate) { template in
            PermissionTemplateDetailView(template: template)
        }
    }
}

// MARK: - Permission Template Card
struct PermissionTemplateCard: View {
    let template: PermissionTemplate

    var scopeColor: Color {
        template.isCompanyScope ? AppColors.purple : AppColors.primary600
    }

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    // Icon
                    ZStack {
                        Circle()
                            .fill(scopeColor.opacity(0.2))
                            .frame(width: 44, height: 44)
                        Image(systemName: template.isCompanyScope ? "building.2.fill" : "folder.fill")
                            .font(.system(size: 18))
                            .foregroundColor(scopeColor)
                    }

                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        HStack(spacing: AppSpacing.xs) {
                            Text(template.name)
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)

                            if template.isSystemDefault {
                                Text("Default")
                                    .font(AppTypography.captionMedium)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, AppSpacing.xs)
                                    .padding(.vertical, 2)
                                    .background(scopeColor)
                                    .cornerRadius(AppSpacing.radiusSmall)
                            }
                        }

                        Text(template.isCompanyScope ? "Company Template" : "Project Template")
                            .font(AppTypography.caption)
                            .foregroundColor(scopeColor)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: AppSpacing.xxs) {
                        Text("\(template.usageCount)")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        Text("users")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.gray400)
                }

                if let description = template.description {
                    Text(description)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .lineLimit(2)
                }
            }
        }
    }
}

// MARK: - Permission Template Detail View
struct PermissionTemplateDetailView: View {
    let template: PermissionTemplate
    @Environment(\.dismiss) private var dismiss

    // Project tools
    let projectTools = ["daily_logs", "time_tracking", "equipment", "documents", "photos", "schedule", "punch_lists", "safety", "drone_flights", "rfis", "materials"]

    // Company tools
    let companyTools = ["directory", "financials", "reports", "label_library", "settings", "user_management"]

    var tools: [String] {
        template.isCompanyScope ? companyTools : projectTools
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // Header
                    AppCard {
                        VStack(alignment: .leading, spacing: AppSpacing.sm) {
                            HStack {
                                ZStack {
                                    Circle()
                                        .fill((template.isCompanyScope ? AppColors.purple : AppColors.primary600).opacity(0.2))
                                        .frame(width: 56, height: 56)
                                    Image(systemName: template.isCompanyScope ? "building.2.fill" : "folder.fill")
                                        .font(.system(size: 24))
                                        .foregroundColor(template.isCompanyScope ? AppColors.purple : AppColors.primary600)
                                }

                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text(template.name)
                                        .font(AppTypography.heading2)
                                        .foregroundColor(AppColors.textPrimary)
                                    Text(template.isCompanyScope ? "Company Permission Template" : "Project Permission Template")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(template.isCompanyScope ? AppColors.purple : AppColors.primary600)
                                }
                            }

                            if let description = template.description {
                                Text(description)
                                    .font(AppTypography.body)
                                    .foregroundColor(AppColors.textSecondary)
                            }

                            HStack(spacing: AppSpacing.lg) {
                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text("\(template.usageCount)")
                                        .font(AppTypography.heading3)
                                        .foregroundColor(AppColors.textPrimary)
                                    Text("Users Assigned")
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textTertiary)
                                }

                                if template.isSystemDefault {
                                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                        HStack(spacing: AppSpacing.xxs) {
                                            Image(systemName: "checkmark.shield.fill")
                                                .font(.system(size: 14))
                                            Text("System Default")
                                        }
                                        .font(AppTypography.captionMedium)
                                        .foregroundColor(AppColors.success)
                                        Text("Protected template")
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.textTertiary)
                                    }
                                }
                            }
                        }
                    }

                    // Tool Permissions
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("Tool Access Levels")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        ForEach(tools, id: \.self) { tool in
                            let level = template.accessLevel(for: tool)
                            ToolAccessRow(tool: tool, level: level)
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Template Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Tool Access Row
struct ToolAccessRow: View {
    let tool: String
    let level: AccessLevel

    var toolDisplayName: String {
        tool.replacingOccurrences(of: "_", with: " ").capitalized
    }

    var levelColor: Color {
        switch level {
        case .none: return AppColors.gray400
        case .readOnly: return AppColors.info
        case .standard: return AppColors.success
        case .admin: return AppColors.purple
        }
    }

    var levelIcon: String {
        switch level {
        case .none: return "xmark.circle"
        case .readOnly: return "eye"
        case .standard: return "pencil"
        case .admin: return "shield.checkered"
        }
    }

    var body: some View {
        AppCard {
            HStack {
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(toolDisplayName)
                        .font(AppTypography.bodyMedium)
                        .foregroundColor(AppColors.textPrimary)
                    Text(level.description)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                }

                Spacer()

                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: levelIcon)
                        .font(.system(size: 14))
                    Text(level.displayName)
                        .font(AppTypography.captionMedium)
                }
                .foregroundColor(levelColor)
                .padding(.horizontal, AppSpacing.sm)
                .padding(.vertical, AppSpacing.xs)
                .background(levelColor.opacity(0.1))
                .cornerRadius(AppSpacing.radiusSmall)
            }
        }
    }
}

// MARK: - User Assignments Tab
struct UserAssignmentsTab: View {
    @StateObject private var userService = UserService.shared
    @StateObject private var adminService = AdminService.shared
    @State private var searchText = ""
    @State private var selectedUser: User?
    @State private var showingAssignModal = false

    var filteredUsers: [User] {
        if searchText.isEmpty {
            return userService.users
        }
        return userService.users.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.email.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                // Description
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("User Assignments")
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)

                    Text("Assign company-wide permission templates to users")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                // Search Bar
                HStack(spacing: AppSpacing.sm) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.gray400)

                    TextField("Search users...", text: $searchText)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textPrimary)

                    if !searchText.isEmpty {
                        Button(action: { searchText = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundColor(AppColors.gray400)
                        }
                    }
                }
                .padding(AppSpacing.sm)
                .background(AppColors.gray100)
                .cornerRadius(AppSpacing.radiusMedium)

                // User List
                if userService.isLoading {
                    HStack {
                        Spacer()
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle())
                        Spacer()
                    }
                    .padding(.vertical, AppSpacing.xl)
                } else if filteredUsers.isEmpty {
                    AppCard {
                        VStack(spacing: AppSpacing.sm) {
                            Image(systemName: searchText.isEmpty ? "person.3" : "magnifyingglass")
                                .font(.system(size: 32))
                                .foregroundColor(AppColors.gray400)
                            Text(searchText.isEmpty ? "No users found" : "No matching users")
                                .font(AppTypography.bodyMedium)
                                .foregroundColor(AppColors.textSecondary)
                            Text(searchText.isEmpty ? "Users will appear here" : "Try adjusting your search")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textTertiary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, AppSpacing.lg)
                    }
                } else {
                    ForEach(filteredUsers) { user in
                        Button(action: {
                            selectedUser = user
                            showingAssignModal = true
                        }) {
                            UserAssignmentCard(user: user)
                        }
                    }
                }
            }
            .padding(AppSpacing.md)
        }
        .onAppear {
            Task {
                await userService.fetchUsers()
                await adminService.fetchPermissionTemplates()
            }
        }
        .sheet(isPresented: $showingAssignModal) {
            if let user = selectedUser {
                AssignCompanyTemplateSheet(user: user, companyTemplates: adminService.companyTemplates)
            }
        }
    }
}

// MARK: - User Assignment Card
struct UserAssignmentCard: View {
    let user: User

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                // User Avatar
                ZStack {
                    Circle()
                        .fill(user.role.color.opacity(0.2))
                        .frame(width: 44, height: 44)
                    Text(user.initials)
                        .font(AppTypography.secondaryMedium)
                        .foregroundColor(user.role.color)
                }

                // User Info
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(user.name)
                        .font(AppTypography.bodyMedium)
                        .foregroundColor(AppColors.textPrimary)
                    Text(user.email)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                // Company Template Badge
                VStack(alignment: .trailing, spacing: AppSpacing.xxs) {
                    if let templateName = user.companyTemplateName {
                        Text(templateName)
                            .font(AppTypography.captionMedium)
                            .foregroundColor(AppColors.primary600)
                            .padding(.horizontal, AppSpacing.xs)
                            .padding(.vertical, 2)
                            .background(AppColors.primary100)
                            .cornerRadius(AppSpacing.radiusSmall)
                    } else {
                        Text("Not assigned")
                            .font(AppTypography.captionMedium)
                            .foregroundColor(AppColors.warning)
                            .padding(.horizontal, AppSpacing.xs)
                            .padding(.vertical, 2)
                            .background(AppColors.warningLight)
                            .cornerRadius(AppSpacing.radiusSmall)
                    }
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.gray400)
            }
        }
    }
}

// MARK: - Assign Company Template Sheet
struct AssignCompanyTemplateSheet: View {
    let user: User
    let companyTemplates: [PermissionTemplate]

    @Environment(\.dismiss) private var dismiss
    @State private var selectedTemplateId: String = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // User Info
                    AppCard {
                        HStack(spacing: AppSpacing.md) {
                            ZStack {
                                Circle()
                                    .fill(user.role.color.opacity(0.2))
                                    .frame(width: 56, height: 56)
                                Text(user.initials)
                                    .font(AppTypography.bodySemibold)
                                    .foregroundColor(user.role.color)
                            }

                            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                Text(user.name)
                                    .font(AppTypography.heading3)
                                    .foregroundColor(AppColors.textPrimary)
                                Text(user.email)
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                            }
                        }
                    }

                    // Template Selection
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("Company Template")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textPrimary)

                        if companyTemplates.isEmpty {
                            AppCard {
                                Text("No company templates available")
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textTertiary)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, AppSpacing.md)
                            }
                        } else {
                            ForEach(companyTemplates) { template in
                                Button(action: {
                                    selectedTemplateId = template.id
                                }) {
                                    TemplateSelectionRow(
                                        template: template,
                                        isSelected: selectedTemplateId == template.id
                                    )
                                }
                            }
                        }
                    }

                    if let error = errorMessage {
                        Text(error)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.error)
                            .padding(AppSpacing.sm)
                            .frame(maxWidth: .infinity)
                            .background(AppColors.errorLight)
                            .cornerRadius(AppSpacing.radiusMedium)
                    }

                    // Save Button
                    PrimaryButton(isLoading ? "Saving..." : "Assign Template", icon: "checkmark") {
                        Task {
                            await assignTemplate()
                        }
                    }
                    .disabled(selectedTemplateId.isEmpty || isLoading)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Assign Template")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .onAppear {
            // Pre-select current template if user has one
            if let currentTemplate = companyTemplates.first(where: { $0.name == user.companyTemplateName }) {
                selectedTemplateId = currentTemplate.id
            }
        }
    }

    private func assignTemplate() async {
        isLoading = true
        errorMessage = nil

        do {
            // Call API to assign template
            try await APIClient.shared.post("/permissions/assign", body: [
                "user_id": user.id,
                "company_template_id": selectedTemplateId
            ])

            // Refresh user data
            await UserService.shared.fetchUsers()
            dismiss()
        } catch {
            errorMessage = "Failed to assign template: \(error.localizedDescription)"
        }

        isLoading = false
    }
}

// MARK: - Template Selection Row
struct TemplateSelectionRow: View {
    let template: PermissionTemplate
    let isSelected: Bool

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    HStack(spacing: AppSpacing.xs) {
                        Text(template.name)
                            .font(AppTypography.bodyMedium)
                            .foregroundColor(AppColors.textPrimary)

                        if template.isSystemDefault {
                            Text("Default")
                                .font(AppTypography.captionMedium)
                                .foregroundColor(.white)
                                .padding(.horizontal, AppSpacing.xs)
                                .padding(.vertical, 2)
                                .background(AppColors.purple)
                                .cornerRadius(AppSpacing.radiusSmall)
                        }
                    }

                    if let description = template.description {
                        Text(description)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                            .lineLimit(2)
                    }
                }

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24))
                    .foregroundColor(isSelected ? AppColors.success : AppColors.gray300)
            }
        }
    }
}

// MARK: - Role Defaults Tab
struct RoleDefaultsTab: View {
    @State private var selectedRole: UserRole = .fieldWorker

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                // Role Selector
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("Select Role")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textPrimary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: AppSpacing.xs) {
                            ForEach(UserRole.allCases, id: \.self) { role in
                                RoleChip(role: role, isSelected: selectedRole == role) {
                                    selectedRole = role
                                }
                            }
                        }
                    }
                }

                // Role Info Card
                AppCard {
                    HStack(spacing: AppSpacing.md) {
                        ZStack {
                            Circle()
                                .fill(selectedRole.color.opacity(0.2))
                                .frame(width: 48, height: 48)
                            Image(systemName: selectedRole.icon)
                                .font(.system(size: 20))
                                .foregroundColor(selectedRole.color)
                        }

                        VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                            Text(selectedRole.displayName)
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                            Text(selectedRole.description)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                            Text("Hierarchy Level: \(selectedRole.hierarchyLevel)")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        }
                    }
                }

                // Daily Log Visibility
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("Daily Log Visibility")
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)

                    AppCard {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            HStack {
                                Image(systemName: "eye.fill")
                                    .foregroundColor(AppColors.primary600)
                                Text(selectedRole.defaultDailyLogVisibility.displayName)
                                    .font(AppTypography.bodySemibold)
                            }
                            Text(selectedRole.defaultDailyLogVisibility.description)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                }

                // Permissions by Category
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("Default Permissions")
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)

                    ForEach(PermissionCategory.allCases, id: \.self) { category in
                        PermissionCategoryCard(
                            category: category,
                            enabledPermissions: selectedRole.defaultPermissions
                        )
                    }
                }
            }
            .padding(AppSpacing.md)
        }
    }
}

// MARK: - Role Chip
struct RoleChip: View {
    let role: UserRole
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.xxs) {
                Image(systemName: role.icon)
                    .font(.system(size: 12))
                Text(role.displayName)
                    .font(AppTypography.captionMedium)
            }
            .padding(.horizontal, AppSpacing.sm)
            .padding(.vertical, AppSpacing.xs)
            .foregroundColor(isSelected ? .white : role.color)
            .background(isSelected ? role.color : role.color.opacity(0.1))
            .cornerRadius(AppSpacing.radiusFull)
        }
    }
}

// MARK: - Permission Category Card
struct PermissionCategoryCard: View {
    let category: PermissionCategory
    let enabledPermissions: Set<Permission>
    @State private var isExpanded = false

    var categoryPermissions: [Permission] {
        category.permissions
    }

    var enabledCount: Int {
        categoryPermissions.filter { enabledPermissions.contains($0) }.count
    }

    var body: some View {
        VStack(spacing: 0) {
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack {
                    Text(category.rawValue)
                        .font(AppTypography.bodyMedium)
                        .foregroundColor(AppColors.textPrimary)

                    Spacer()

                    Text("\(enabledCount)/\(categoryPermissions.count)")
                        .font(AppTypography.secondary)
                        .foregroundColor(enabledCount > 0 ? AppColors.success : AppColors.textTertiary)

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.gray400)
                }
                .padding(AppSpacing.md)
                .background(AppColors.cardBackground)
            }

            if isExpanded {
                VStack(spacing: 0) {
                    ForEach(categoryPermissions, id: \.self) { permission in
                        HStack {
                            Image(systemName: enabledPermissions.contains(permission) ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 18))
                                .foregroundColor(enabledPermissions.contains(permission) ? AppColors.success : AppColors.gray300)

                            Text(permission.displayName)
                                .font(AppTypography.secondary)
                                .foregroundColor(enabledPermissions.contains(permission) ? AppColors.textPrimary : AppColors.textTertiary)

                            Spacer()
                        }
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.vertical, AppSpacing.xs)
                        .background(AppColors.cardBackground)
                    }
                }
            }
        }
        .cornerRadius(AppSpacing.radiusMedium)
        .overlay(
            RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                .stroke(AppColors.gray200, lineWidth: 1)
        )
    }
}

// MARK: - User Overrides Tab
struct UserOverridesTab: View {
    @State private var users = User.mockUsers
    @State private var selectedUser: User?
    @State private var showingUserPermissions = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                Text("User Permission Overrides")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                Text("Add or remove specific permissions for individual users, independent of their role.")
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)

                ForEach(users) { user in
                    Button(action: {
                        selectedUser = user
                        showingUserPermissions = true
                    }) {
                        UserPermissionCard(user: user)
                    }
                }
            }
            .padding(AppSpacing.md)
        }
        .sheet(isPresented: $showingUserPermissions) {
            if let user = selectedUser {
                UserPermissionEditor(user: user)
            }
        }
    }
}

// MARK: - User Permission Card
struct UserPermissionCard: View {
    let user: User
    @ObservedObject private var permissionManager = PermissionManager.shared

    var overrideCount: Int {
        permissionManager.userOverrides.filter { $0.userId == user.id }.count
    }

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                ZStack {
                    Circle()
                        .fill(user.role.color.opacity(0.2))
                        .frame(width: 44, height: 44)
                    Text(user.initials)
                        .font(AppTypography.secondaryMedium)
                        .foregroundColor(user.role.color)
                }

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(user.name)
                        .font(AppTypography.bodyMedium)
                        .foregroundColor(AppColors.textPrimary)
                    HStack(spacing: AppSpacing.xs) {
                        Text(user.role.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(user.role.color)
                        if overrideCount > 0 {
                            Text("• \(overrideCount) overrides")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.warning)
                        }
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.gray400)
            }
        }
    }
}

// MARK: - User Permission Editor
struct UserPermissionEditor: View {
    let user: User
    @Environment(\.dismiss) private var dismiss
    @State private var modifiedPermissions: Set<Permission> = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // User Info
                    AppCard {
                        HStack(spacing: AppSpacing.md) {
                            ZStack {
                                Circle()
                                    .fill(user.role.color.opacity(0.2))
                                    .frame(width: 56, height: 56)
                                Text(user.initials)
                                    .font(AppTypography.bodySemibold)
                                    .foregroundColor(user.role.color)
                            }

                            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                Text(user.name)
                                    .font(AppTypography.heading3)
                                    .foregroundColor(AppColors.textPrimary)
                                Text(user.role.displayName)
                                    .font(AppTypography.secondary)
                                    .foregroundColor(user.role.color)
                                Text("Role defaults + custom overrides below")
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textTertiary)
                            }
                        }
                    }

                    // Permission Categories
                    ForEach(PermissionCategory.allCases, id: \.self) { category in
                        EditablePermissionCategory(
                            category: category,
                            roleDefaults: user.role.defaultPermissions,
                            modifiedPermissions: $modifiedPermissions
                        )
                    }

                    // Save Button
                    PrimaryButton("Save Overrides", icon: "checkmark") {
                        // Save the overrides
                        dismiss()
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Edit Permissions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .onAppear {
            modifiedPermissions = user.role.defaultPermissions
        }
    }
}

// MARK: - Editable Permission Category
struct EditablePermissionCategory: View {
    let category: PermissionCategory
    let roleDefaults: Set<Permission>
    @Binding var modifiedPermissions: Set<Permission>
    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 0) {
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack {
                    Text(category.rawValue)
                        .font(AppTypography.bodyMedium)
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.gray400)
                }
                .padding(AppSpacing.md)
                .background(AppColors.cardBackground)
            }

            if isExpanded {
                ForEach(category.permissions, id: \.self) { permission in
                    PermissionToggleRow(
                        permission: permission,
                        isRoleDefault: roleDefaults.contains(permission),
                        isEnabled: modifiedPermissions.contains(permission),
                        onToggle: { enabled in
                            if enabled {
                                modifiedPermissions.insert(permission)
                            } else {
                                modifiedPermissions.remove(permission)
                            }
                        }
                    )
                }
            }
        }
        .cornerRadius(AppSpacing.radiusMedium)
        .overlay(
            RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                .stroke(AppColors.gray200, lineWidth: 1)
        )
    }
}

// MARK: - Permission Toggle Row
struct PermissionToggleRow: View {
    let permission: Permission
    let isRoleDefault: Bool
    let isEnabled: Bool
    let onToggle: (Bool) -> Void

    var statusColor: Color {
        if isEnabled && isRoleDefault {
            return AppColors.success  // By role
        } else if isEnabled && !isRoleDefault {
            return AppColors.primary600  // Added
        } else if !isEnabled && isRoleDefault {
            return AppColors.error  // Removed
        } else {
            return AppColors.gray400  // Not available
        }
    }

    var statusText: String {
        if isEnabled && isRoleDefault {
            return "By role"
        } else if isEnabled && !isRoleDefault {
            return "Added"
        } else if !isEnabled && isRoleDefault {
            return "Removed"
        } else {
            return ""
        }
    }

    var body: some View {
        HStack {
            Toggle("", isOn: Binding(
                get: { isEnabled },
                set: { onToggle($0) }
            ))
            .labelsHidden()
            .tint(AppColors.primary600)

            Text(permission.displayName)
                .font(AppTypography.secondary)
                .foregroundColor(isEnabled ? AppColors.textPrimary : AppColors.textTertiary)

            Spacer()

            if !statusText.isEmpty {
                Text(statusText)
                    .font(AppTypography.caption)
                    .foregroundColor(statusColor)
            }
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.xs)
        .background(AppColors.cardBackground)
    }
}

// MARK: - Project Access Tab
struct ProjectAccessTab: View {
    let projects = Project.mockProjects
    @State private var selectedProject: Project?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                Text("Project-Level Access")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                Text("Grant elevated permissions to specific users on individual projects.")
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)

                ForEach(projects) { project in
                    Button(action: { selectedProject = project }) {
                        ProjectAccessCard(project: project)
                    }
                }
            }
            .padding(AppSpacing.md)
        }
        .sheet(item: $selectedProject) { project in
            ProjectAccessEditor(project: project)
        }
    }
}

// MARK: - Project Access Card
struct ProjectAccessCard: View {
    let project: Project

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                IconCircle(
                    icon: "building.2.fill",
                    size: .medium,
                    foregroundColor: AppColors.primary600,
                    backgroundColor: AppColors.primary50
                )

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(project.name)
                        .font(AppTypography.bodyMedium)
                        .foregroundColor(AppColors.textPrimary)
                    Text(project.address)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.gray400)
            }
        }
    }
}

// MARK: - Project Access Editor
struct ProjectAccessEditor: View {
    let project: Project
    @Environment(\.dismiss) private var dismiss
    @State private var projectUsers: [User] = []
    @State private var showingUserPicker = false

    // All available users (would come from API in production)
    private let allUsers = User.mockUsers

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // Project Info
                    AppCard {
                        HStack(spacing: AppSpacing.md) {
                            IconCircle(
                                icon: "building.2.fill",
                                size: .large,
                                foregroundColor: AppColors.primary600,
                                backgroundColor: AppColors.primary50
                            )

                            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                Text(project.name)
                                    .font(AppTypography.heading3)
                                    .foregroundColor(AppColors.textPrimary)
                                Text(project.address)
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                            }
                        }
                    }

                    // Users with Access
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        HStack {
                            Text("Users with Project Access")
                                .font(AppTypography.heading3)
                                .foregroundColor(AppColors.textPrimary)

                            Spacer()

                            Text("\(projectUsers.count) users")
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textTertiary)
                        }

                        if projectUsers.isEmpty {
                            AppCard {
                                VStack(spacing: AppSpacing.sm) {
                                    Image(systemName: "person.badge.plus")
                                        .font(.system(size: 32))
                                        .foregroundColor(AppColors.gray400)
                                    Text("No users assigned")
                                        .font(AppTypography.bodyMedium)
                                        .foregroundColor(AppColors.textSecondary)
                                    Text("Add users to grant them access to this project")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textTertiary)
                                        .multilineTextAlignment(.center)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, AppSpacing.lg)
                            }
                        } else {
                            ForEach(projectUsers) { user in
                                ProjectUserAccessRow(
                                    user: user,
                                    project: project,
                                    onRemove: {
                                        removeUser(user)
                                    }
                                )
                            }
                        }
                    }

                    // Add User Button
                    OutlineButton("Add User to Project", icon: "plus") {
                        showingUserPicker = true
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Project Access")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showingUserPicker) {
                AddUserToProjectSheet(
                    allUsers: allUsers,
                    existingUsers: projectUsers,
                    onAdd: { user in
                        addUser(user)
                    }
                )
            }
        }
        .onAppear {
            // In production, fetch users assigned to this project
            // For now, start with a couple of mock users
            projectUsers = Array(allUsers.prefix(2))
        }
    }

    private func addUser(_ user: User) {
        if !projectUsers.contains(where: { $0.id == user.id }) {
            withAnimation {
                projectUsers.append(user)
            }
        }
    }

    private func removeUser(_ user: User) {
        withAnimation {
            projectUsers.removeAll { $0.id == user.id }
        }
    }
}

// MARK: - Add User to Project Sheet
struct AddUserToProjectSheet: View {
    let allUsers: [User]
    let existingUsers: [User]
    let onAdd: (User) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""

    var availableUsers: [User] {
        let existingIds = Set(existingUsers.map { $0.id })
        let filtered = allUsers.filter { !existingIds.contains($0.id) }

        if searchText.isEmpty {
            return filtered
        }
        return filtered.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.email.localizedCaseInsensitiveContains(searchText) ||
            $0.role.displayName.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                HStack(spacing: AppSpacing.sm) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.gray400)

                    TextField("Search users...", text: $searchText)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textPrimary)

                    if !searchText.isEmpty {
                        Button(action: { searchText = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundColor(AppColors.gray400)
                        }
                    }
                }
                .padding(AppSpacing.sm)
                .background(AppColors.gray100)
                .cornerRadius(AppSpacing.radiusMedium)
                .padding(AppSpacing.md)

                Divider()

                // User List
                if availableUsers.isEmpty {
                    VStack(spacing: AppSpacing.md) {
                        Spacer()
                        Image(systemName: searchText.isEmpty ? "person.crop.circle.badge.checkmark" : "magnifyingglass")
                            .font(.system(size: 48))
                            .foregroundColor(AppColors.gray300)
                        Text(searchText.isEmpty ? "All users are assigned" : "No users found")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textSecondary)
                        Text(searchText.isEmpty
                             ? "Every available user already has access to this project."
                             : "Try adjusting your search terms.")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textTertiary)
                            .multilineTextAlignment(.center)
                        Spacer()
                    }
                    .padding(AppSpacing.xl)
                } else {
                    ScrollView {
                        LazyVStack(spacing: AppSpacing.xs) {
                            ForEach(availableUsers) { user in
                                UserPickerRow(user: user) {
                                    onAdd(user)
                                    dismiss()
                                }
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
            }
            .background(AppColors.background)
            .navigationTitle("Add User")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(AppColors.textSecondary)
                }
            }
        }
    }
}

// MARK: - User Picker Row
struct UserPickerRow: View {
    let user: User
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: AppSpacing.sm) {
                ZStack {
                    Circle()
                        .fill(user.role.color.opacity(0.2))
                        .frame(width: 44, height: 44)
                    Text(user.initials)
                        .font(AppTypography.secondaryMedium)
                        .foregroundColor(user.role.color)
                }

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(user.name)
                        .font(AppTypography.bodyMedium)
                        .foregroundColor(AppColors.textPrimary)
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: user.role.icon)
                            .font(.system(size: 10))
                        Text(user.role.displayName)
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(user.role.color)
                }

                Spacer()

                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(AppColors.primary600)
            }
            .padding(AppSpacing.sm)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(AppColors.gray200, lineWidth: 1)
            )
        }
    }
}

// MARK: - Project User Access Row
struct ProjectUserAccessRow: View {
    let user: User
    let project: Project
    var onRemove: (() -> Void)? = nil
    @State private var hasElevatedAccess = false
    @State private var showingRemoveConfirm = false

    var body: some View {
        AppCard {
            VStack(spacing: AppSpacing.sm) {
                HStack(spacing: AppSpacing.sm) {
                    ZStack {
                        Circle()
                            .fill(user.role.color.opacity(0.2))
                            .frame(width: 40, height: 40)
                        Text(user.initials)
                            .font(AppTypography.secondaryMedium)
                            .foregroundColor(user.role.color)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(user.name)
                            .font(AppTypography.bodyMedium)
                            .foregroundColor(AppColors.textPrimary)
                        Text(user.role.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(user.role.color)
                    }

                    Spacer()

                    if onRemove != nil {
                        Button(action: { showingRemoveConfirm = true }) {
                            Image(systemName: "minus.circle.fill")
                                .font(.system(size: 22))
                                .foregroundColor(AppColors.error)
                        }
                    }

                    Toggle("", isOn: $hasElevatedAccess)
                        .labelsHidden()
                        .tint(AppColors.primary600)
                }

                if hasElevatedAccess {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 12))
                        Text("User has elevated access on this project")
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(AppColors.warning)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(AppSpacing.xs)
                    .background(AppColors.warningLight)
                    .cornerRadius(AppSpacing.radiusSmall)
                }
            }
        }
        .confirmationDialog(
            "Remove \(user.name) from project?",
            isPresented: $showingRemoveConfirm,
            titleVisibility: .visible
        ) {
            Button("Remove", role: .destructive) {
                onRemove?()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This user will no longer have access to this project.")
        }
    }
}

#Preview {
    PermissionsView()
}
