//
//  AdminView.swift
//  ConstructionManager
//
//  Admin hub - User Management, Audit Logs, Settings
//

import SwiftUI

struct AdminView: View {
    @EnvironmentObject var appState: AppState

    // Only admins can view and manage users
    private var isAdmin: Bool {
        appState.isAdmin
    }

    private var canViewAuditLogs: Bool {
        appState.hasPermission(.viewAuditLogs)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.md) {
                // User Management Section - Admin Only
                if isAdmin {
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("admin.sectionUserManagement".localized)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                            .textCase(.uppercase)
                            .padding(.horizontal, AppSpacing.md)

                        VStack(spacing: 0) {
                            NavigationLink {
                                UserManagementView()
                            } label: {
                                AdminMenuRow(
                                    icon: "person.3.fill",
                                    iconColor: AppColors.primary600,
                                    title: "admin.usersTitle".localized,
                                    subtitle: "admin.usersSubtitle".localized
                                )
                            }

                            Divider()
                                .padding(.leading, 56)

                            NavigationLink {
                                InvitationsListView()
                            } label: {
                                AdminMenuRow(
                                    icon: "envelope.badge.fill",
                                    iconColor: AppColors.info,
                                    title: "admin.invitationsTitle".localized,
                                    subtitle: "admin.invitationsSubtitle".localized
                                )
                            }

                            Divider()
                                .padding(.leading, 56)

                            NavigationLink {
                                RolesPermissionsView()
                            } label: {
                                AdminMenuRow(
                                    icon: "lock.shield.fill",
                                    iconColor: AppColors.warning,
                                    title: "admin.rolesTitle".localized,
                                    subtitle: "admin.rolesSubtitle".localized
                                )
                            }
                        }
                        .background(AppColors.cardBackground)
                        .cornerRadius(AppSpacing.radiusMedium)
                        .padding(.horizontal, AppSpacing.md)
                    }
                }

                if canViewAuditLogs {
                    // Logs & Audit Section
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("admin.sectionLogsAudit".localized)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                            .textCase(.uppercase)
                            .padding(.horizontal, AppSpacing.md)

                        VStack(spacing: 0) {
                            NavigationLink {
                                AuditLogsView()
                            } label: {
                                AdminMenuRow(
                                    icon: "list.bullet.clipboard.fill",
                                    iconColor: AppColors.info,
                                    title: "admin.auditLogsTitle".localized,
                                    subtitle: "admin.auditLogsSubtitle".localized
                                )
                            }
                        }
                        .background(AppColors.cardBackground)
                        .cornerRadius(AppSpacing.radiusMedium)
                        .padding(.horizontal, AppSpacing.md)
                    }
                }

                if isAdmin {
                    // Organization Section
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("admin.sectionOrganization".localized)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                            .textCase(.uppercase)
                            .padding(.horizontal, AppSpacing.md)

                        VStack(spacing: 0) {
                            NavigationLink {
                                CompanySettingsView()
                            } label: {
                                AdminMenuRow(
                                    icon: "building.2.fill",
                                    iconColor: AppColors.primary600,
                                    title: "admin.companySettingsTitle".localized,
                                    subtitle: "admin.companySettingsSubtitle".localized
                                )
                            }

                            Divider()
                                .padding(.leading, 56)

                            NavigationLink {
                                ModuleSettingsView()
                            } label: {
                                AdminMenuRow(
                                    icon: "square.grid.2x2.fill",
                                    iconColor: AppColors.orange,
                                    title: "admin.moduleSettingsTitle".localized,
                                    subtitle: "admin.moduleSettingsSubtitle".localized
                                )
                            }

                            Divider()
                                .padding(.leading, 56)

                            NavigationLink {
                                LabelsManagementView()
                            } label: {
                                AdminMenuRow(
                                    icon: "tag.fill",
                                    iconColor: AppColors.purple,
                                    title: "admin.labelsTitle".localized,
                                    subtitle: "admin.labelsSubtitle".localized
                                )
                            }
                        }
                        .background(AppColors.cardBackground)
                        .cornerRadius(AppSpacing.radiusMedium)
                        .padding(.horizontal, AppSpacing.md)
                    }
                }
            }
            .padding(.vertical, AppSpacing.md)
        }
        .background(AppColors.background)
        .navigationTitle("admin.title".localized)
    }
}

// MARK: - Admin Menu Row
struct AdminMenuRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: AppSpacing.sm) {
            ZStack {
                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                    .fill(iconColor.opacity(0.12))
                    .frame(width: 40, height: 40)
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(iconColor)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
                Text(subtitle)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(AppColors.gray400)
        }
        .padding(AppSpacing.md)
        .contentShape(Rectangle())
    }
}

// MARK: - User Management View
struct UserManagementView: View {
    @StateObject private var adminService = AdminService.shared
    @State private var searchText = ""
    @State private var selectedRole: UserRole?
    @State private var showingInviteUser = false
    @State private var selectedUser: User?

    private var filteredUsers: [User] {
        var result = adminService.users

        if let role = selectedRole {
            result = result.filter { $0.role == role }
        }

        if !searchText.isEmpty {
            result = result.filter {
                $0.fullName.localizedCaseInsensitiveContains(searchText) ||
                $0.email.localizedCaseInsensitiveContains(searchText)
            }
        }

        return result.sorted { $0.fullName < $1.fullName }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Search
            searchBar

            // Role filter
            roleFilter

            // Stats
            statsBar

            // Users list
            if adminService.isLoading && adminService.users.isEmpty {
                loadingView
            } else if filteredUsers.isEmpty {
                emptyView
            } else {
                usersList
            }
        }
        .background(AppColors.background)
        .navigationTitle("admin.usersTitle".localized)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showingInviteUser = true }) {
                    Image(systemName: "person.badge.plus")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(AppColors.primary600)
                }
            }
        }
        .sheet(isPresented: $showingInviteUser) {
            InviteUserView()
        }
        .sheet(item: $selectedUser) { user in
            UserDetailView(user: user)
        }
        .task {
            await adminService.fetchUsers()
        }
    }

    private var searchBar: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.gray400)
            TextField("admin.searchUsersPlaceholder".localized, text: $searchText)
                .font(AppTypography.body)
        }
        .padding(AppSpacing.sm)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusMedium)
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.sm)
    }

    private var roleFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                FilterChip(title: "common.all".localized, isSelected: selectedRole == nil) {
                    selectedRole = nil
                }
                ForEach(UserRole.allCases, id: \.self) { role in
                    FilterChip(title: role.displayName, isSelected: selectedRole == role) {
                        selectedRole = role
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.bottom, AppSpacing.sm)
        }
    }

    private var statsBar: some View {
        HStack(spacing: AppSpacing.sm) {
            StatPill(count: adminService.activeUsersCount, label: "admin.activeCount".localized, color: AppColors.success)
            StatPill(count: adminService.adminCount, label: "admin.adminsCount".localized, color: AppColors.primary600)
            StatPill(count: adminService.users.count, label: "admin.totalCount".localized, color: AppColors.gray500)
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.bottom, AppSpacing.sm)
    }

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
            Spacer()
        }
    }

    private var emptyView: some View {
        VStack(spacing: AppSpacing.md) {
            Spacer()
            Image(systemName: "person.3")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray300)
            Text("admin.noUsersFound".localized)
                .font(AppTypography.heading3)
            Spacer()
        }
    }

    private var usersList: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.sm) {
                ForEach(filteredUsers) { user in
                    UserCard(user: user)
                        .onTapGesture {
                            selectedUser = user
                        }
                }
            }
            .padding(AppSpacing.md)
        }
        .refreshable {
            await adminService.fetchUsers()
        }
    }
}

// MARK: - User Card
struct UserCard: View {
    let user: User

    private var statusColor: Color {
        switch user.status {
        case .active: return AppColors.success
        case .inactive: return AppColors.gray500
        case .pending: return AppColors.warning
        case .suspended: return AppColors.error
        }
    }

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(AppColors.primary100)
                        .frame(width: 48, height: 48)
                    Text(user.initials)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(AppColors.primary600)
                }

                // Info
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(user.fullName)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text(user.email)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                    HStack(spacing: AppSpacing.xs) {
                        Text(user.role.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(user.role.color)
                            .padding(.horizontal, AppSpacing.xs)
                            .padding(.vertical, 2)
                            .background(user.role.color.opacity(0.15))
                            .cornerRadius(4)

                        Circle()
                            .fill(statusColor)
                            .frame(width: 8, height: 8)
                        Text(user.status.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(statusColor)
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

// MARK: - Audit Logs View
struct AuditLogsView: View {
    @StateObject private var adminService = AdminService.shared
    @State private var selectedAction: AuditAction?
    @State private var selectedResourceType: AuditResourceType?

    private var filteredLogs: [AuditLog] {
        var result = adminService.auditLogs

        if let action = selectedAction {
            result = result.filter { $0.action == action }
        }

        if let resourceType = selectedResourceType {
            result = result.filter { $0.resourceType == resourceType }
        }

        return result
    }

    var body: some View {
        VStack(spacing: 0) {
            // Filters
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "admin.allActions".localized, isSelected: selectedAction == nil) {
                        selectedAction = nil
                    }
                    ForEach([AuditAction.create, .update, .delete, .approve, .login], id: \.self) { action in
                        FilterChip(title: action.displayName, isSelected: selectedAction == action) {
                            selectedAction = action
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
            }

            // Logs list
            if adminService.isLoading && adminService.auditLogs.isEmpty {
                VStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            } else if filteredLogs.isEmpty {
                VStack {
                    Spacer()
                    Image(systemName: "list.bullet.clipboard")
                        .font(.system(size: 48))
                        .foregroundColor(AppColors.gray300)
                    Text("admin.noAuditLogs".localized)
                        .font(AppTypography.heading3)
                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: AppSpacing.sm) {
                        ForEach(filteredLogs) { log in
                            AuditLogCard(log: log)
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
        }
        .background(AppColors.background)
        .navigationTitle("admin.auditLogsTitle".localized)
        .task {
            await adminService.fetchAuditLogs()
        }
    }
}

// MARK: - Audit Log Card
struct AuditLogCard: View {
    let log: AuditLog

    private var actionColor: Color {
        switch log.action {
        case .create: return AppColors.success
        case .update: return AppColors.info
        case .delete: return AppColors.error
        case .approve: return AppColors.success
        case .reject: return AppColors.error
        case .login, .logout: return AppColors.gray500
        default: return AppColors.warning
        }
    }

    var body: some View {
        AppCard {
            HStack(alignment: .top, spacing: AppSpacing.sm) {
                // Icon
                ZStack {
                    Circle()
                        .fill(actionColor.opacity(0.15))
                        .frame(width: 36, height: 36)
                    Image(systemName: log.action.icon)
                        .font(.system(size: 14))
                        .foregroundColor(actionColor)
                }

                // Content
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(log.summary)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)

                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: log.resourceType.icon)
                            .font(.system(size: 10))
                        Text(log.resourceType.displayName)
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(AppColors.textSecondary)

                    Text(log.formattedDate)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)

                    // Changes
                    if let changes = log.changes, !changes.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            ForEach(changes, id: \.field) { change in
                                HStack(spacing: AppSpacing.xs) {
                                    Text(change.field)
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textSecondary)
                                    if let oldValue = change.oldValue {
                                        Text(oldValue)
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.error)
                                            .strikethrough()
                                    }
                                    Image(systemName: "arrow.right")
                                        .font(.system(size: 8))
                                        .foregroundColor(AppColors.textTertiary)
                                    if let newValue = change.newValue {
                                        Text(newValue)
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.success)
                                    }
                                }
                            }
                        }
                        .padding(.top, AppSpacing.xxs)
                    }
                }

                Spacer()
            }
        }
    }
}

// MARK: - Labels Management View
struct LabelsManagementView: View {
    @StateObject private var labelService = LabelService.shared
    @EnvironmentObject var appState: AppState
    @State private var selectedCategory: LabelCategory?
    @State private var showingNewLabel = false

    private var isAdmin: Bool {
        appState.isAdmin
    }

    private var filteredLabels: [ProjectLabel] {
        if let category = selectedCategory {
            return labelService.labels.filter { $0.category == category }
        }
        return labelService.labels
    }

    var body: some View {
        VStack(spacing: 0) {
            // Category filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "common.all".localized, isSelected: selectedCategory == nil) {
                        selectedCategory = nil
                    }
                    ForEach(LabelCategory.allCases, id: \.self) { category in
                        FilterChip(title: category.displayName, isSelected: selectedCategory == category) {
                            selectedCategory = category
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
            }

            // Labels list
            if filteredLabels.isEmpty {
                VStack {
                    Spacer()
                    Image(systemName: "tag")
                        .font(.system(size: 48))
                        .foregroundColor(AppColors.gray300)
                    Text("admin.noLabels".localized)
                        .font(AppTypography.heading3)
                    if isAdmin {
                        PrimaryButton("admin.createLabel".localized, icon: "plus") {
                            showingNewLabel = true
                        }
                        .padding(.top, AppSpacing.sm)
                    }
                    Spacer()
                }
                .padding(AppSpacing.xl)
            } else {
                ScrollView {
                    LazyVStack(spacing: AppSpacing.sm) {
                        ForEach(filteredLabels) { label in
                            LabelCard(label: label)
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
        }
        .background(AppColors.background)
        .navigationTitle("admin.labelsTitle".localized)
        .toolbar {
            if isAdmin {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingNewLabel = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .sheet(isPresented: $showingNewLabel) {
            NewLabelView(labelService: labelService)
        }
        .task {
            await labelService.fetchLabels()
        }
    }
}

// MARK: - New Label View
struct NewLabelView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var labelService: LabelService
    @State private var name = ""
    @State private var selectedCategory: LabelCategory = .status
    @State private var selectedScope: LabelScope = .global
    @State private var selectedColor: String = "blue"
    @State private var isSaving = false
    @State private var errorMessage: String?

    private let colors = ["blue", "green", "red", "yellow", "orange", "purple", "pink", "gray", "cyan", "indigo"]

    private func colorForName(_ name: String) -> Color {
        switch name {
        case "blue": return .blue
        case "green": return .green
        case "red": return .red
        case "yellow": return .yellow
        case "orange": return .orange
        case "purple": return .purple
        case "pink": return .pink
        case "gray": return .gray
        case "cyan": return .cyan
        case "indigo": return .indigo
        default: return .blue
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Name Input
                    AppTextField(label: "admin.labelName".localized, placeholder: "admin.enterLabelName".localized, text: $name)

                    // Category Selection
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("admin.labelCategory".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: AppSpacing.sm) {
                            ForEach(LabelCategory.allCases, id: \.self) { category in
                                Button(action: { selectedCategory = category }) {
                                    Text(category.displayName)
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(selectedCategory == category ? .white : AppColors.textPrimary)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, AppSpacing.sm)
                                        .background(selectedCategory == category ? AppColors.primary600 : AppColors.cardBackground)
                                        .cornerRadius(AppSpacing.radiusMedium)
                                }
                            }
                        }
                    }

                    // Scope Selection
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("admin.labelScope".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        HStack(spacing: AppSpacing.sm) {
                            ForEach(LabelScope.allCases, id: \.self) { scope in
                                Button(action: { selectedScope = scope }) {
                                    Text(scope.displayName)
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(selectedScope == scope ? .white : AppColors.textPrimary)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, AppSpacing.sm)
                                        .background(selectedScope == scope ? AppColors.primary600 : AppColors.cardBackground)
                                        .cornerRadius(AppSpacing.radiusMedium)
                                }
                            }
                        }
                    }

                    // Color Selection
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("admin.labelColor".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: AppSpacing.sm) {
                            ForEach(colors, id: \.self) { color in
                                Button(action: { selectedColor = color }) {
                                    ZStack {
                                        Circle()
                                            .fill(colorForName(color))
                                            .frame(width: 44, height: 44)
                                        if selectedColor == color {
                                            Image(systemName: "checkmark")
                                                .font(.system(size: 16, weight: .bold))
                                                .foregroundColor(.white)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Preview
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("admin.labelPreview".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        HStack(spacing: AppSpacing.xs) {
                            Circle()
                                .fill(colorForName(selectedColor))
                                .frame(width: 12, height: 12)
                            Text(name.isEmpty ? "admin.labelNamePlaceholder".localized : name)
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                        }
                        .padding(AppSpacing.md)
                        .background(AppColors.cardBackground)
                        .cornerRadius(AppSpacing.radiusMedium)
                    }

                    // Error
                    if let error = errorMessage {
                        Text(error)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.error)
                            .padding(AppSpacing.sm)
                            .frame(maxWidth: .infinity)
                            .background(AppColors.error.opacity(0.1))
                            .cornerRadius(AppSpacing.radiusSmall)
                    }

                    // Submit
                    PrimaryButton("admin.createLabel".localized, icon: "tag.fill", isLoading: isSaving) {
                        Task {
                            await createLabel()
                        }
                    }
                    .disabled(name.isEmpty)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("admin.newLabel".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }

    private func createLabel() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        let success = await labelService.createLabel(
            name: name,
            category: selectedCategory,
            scope: selectedScope,
            color: selectedColor
        )

        if success {
            dismiss()
        } else {
            errorMessage = labelService.error ?? "admin.failedToCreateLabel".localized
        }
    }
}

// MARK: - Label Card
struct LabelCard: View {
    let label: ProjectLabel

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                Circle()
                    .fill(label.displayColor)
                    .frame(width: 12, height: 12)

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(label.name)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)

                    HStack(spacing: AppSpacing.xs) {
                        Text(label.category.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                        Text("•")
                            .foregroundColor(AppColors.textTertiary)
                        Text(label.scope.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                }

                Spacer()

                if let count = label.usageCount, count > 0 {
                    Text("\(count)")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(AppColors.gray100)
                        .cornerRadius(4)
                }
            }
        }
    }
}

// MARK: - Invitations List View
struct InvitationsListView: View {
    @StateObject private var adminService = AdminService.shared
    @State private var selectedStatus: InvitationStatus?
    @State private var showingInviteUser = false

    private var filteredInvitations: [Invitation] {
        if let status = selectedStatus {
            return adminService.invitations.filter { $0.status == status }
        }
        return adminService.invitations
    }

    var body: some View {
        VStack(spacing: 0) {
            // Status filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "common.all".localized, isSelected: selectedStatus == nil) {
                        selectedStatus = nil
                    }
                    ForEach(InvitationStatus.allCases, id: \.self) { status in
                        FilterChip(title: status.displayName, isSelected: selectedStatus == status) {
                            selectedStatus = status
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
            }

            // Stats bar
            HStack(spacing: AppSpacing.sm) {
                StatPill(count: adminService.pendingInvitationsCount, label: "admin.pendingCount".localized, color: AppColors.warning)
                StatPill(count: adminService.invitations.count, label: "admin.totalCount".localized, color: AppColors.gray500)
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.bottom, AppSpacing.sm)

            // Invitations list
            if adminService.isLoading && adminService.invitations.isEmpty {
                VStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            } else if filteredInvitations.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Spacer()
                    Image(systemName: "envelope.open")
                        .font(.system(size: 48))
                        .foregroundColor(AppColors.gray300)
                    Text("admin.noInvitations".localized)
                        .font(AppTypography.heading3)
                    Text("admin.inviteUsersToJoin".localized)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textSecondary)
                    PrimaryButton("admin.inviteUser".localized, icon: "person.badge.plus") {
                        showingInviteUser = true
                    }
                    .padding(.horizontal, AppSpacing.xl)
                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: AppSpacing.sm) {
                        ForEach(filteredInvitations) { invitation in
                            InvitationCard(invitation: invitation, adminService: adminService)
                        }
                    }
                    .padding(AppSpacing.md)
                }
                .refreshable {
                    await adminService.fetchInvitations()
                }
            }
        }
        .background(AppColors.background)
        .navigationTitle("admin.invitationsTitle".localized)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showingInviteUser = true }) {
                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(AppColors.primary600)
                }
            }
        }
        .sheet(isPresented: $showingInviteUser) {
            InviteUserView()
        }
        .task {
            await adminService.fetchInvitations()
        }
    }
}

// MARK: - Invitation Card
struct InvitationCard: View {
    let invitation: Invitation
    @ObservedObject var adminService: AdminService
    @State private var showingActions = false

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    // Email and role
                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(invitation.email)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        HStack(spacing: AppSpacing.xs) {
                            Text(invitation.roleEnum.displayName)
                                .font(AppTypography.caption)
                                .foregroundColor(invitation.roleEnum.color)
                                .padding(.horizontal, AppSpacing.xs)
                                .padding(.vertical, 2)
                                .background(invitation.roleEnum.color.opacity(0.15))
                                .cornerRadius(4)

                            StatusBadge(text: invitation.status.displayName, status: invitation.status.color)
                        }
                    }

                    Spacer()

                    // Actions button for pending invites
                    if invitation.status == .pending {
                        Menu {
                            Button(action: { resendInvitation() }) {
                                Label("admin.resendInvitation".localized, systemImage: "envelope.arrow.triangle.branch")
                            }
                            Button(role: .destructive, action: { cancelInvitation() }) {
                                Label("admin.cancelInvitation".localized, systemImage: "xmark.circle")
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                                .font(.system(size: 20))
                                .foregroundColor(AppColors.gray500)
                        }
                    }
                }

                // Meta info
                HStack(spacing: AppSpacing.md) {
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "person.fill")
                            .font(.system(size: 10))
                        Text(String(format: "admin.invitedBy".localized, invitation.invitedBy.name))
                    }
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)

                    if invitation.status == .pending {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "clock")
                                .font(.system(size: 10))
                            if invitation.isExpired {
                                Text("admin.expired".localized)
                                    .foregroundColor(AppColors.error)
                            } else {
                                Text(String(format: "admin.expiresInDays".localized, invitation.daysUntilExpiry))
                            }
                        }
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                    }
                }
            }
        }
    }

    private func resendInvitation() {
        Task {
            _ = await adminService.resendInvitation(id: invitation.id)
        }
    }

    private func cancelInvitation() {
        Task {
            _ = await adminService.cancelInvitation(id: invitation.id)
        }
    }
}

// MARK: - Invite User View
struct InviteUserView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var adminService = AdminService.shared
    @State private var email = ""
    @State private var selectedRole: UserRole = .fieldWorker
    @State private var message = ""
    @State private var isSending = false
    @State private var errorMessage: String?
    @State private var showSuccess = false

    private var isValidEmail: Bool {
        let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return email.wholeMatch(of: emailRegex) != nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Email Input
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("admin.emailAddress".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        TextField("admin.enterEmail".localized, text: $email)
                            .font(AppTypography.body)
                            .padding(AppSpacing.md)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }

                    // Role Selection
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("admin.roleLabel".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        VStack(spacing: 0) {
                            ForEach(UserRole.allCases, id: \.self) { role in
                                Button {
                                    selectedRole = role
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(role.displayName)
                                                .font(AppTypography.body)
                                                .foregroundColor(AppColors.textPrimary)
                                            Text(role.description)
                                                .font(AppTypography.caption)
                                                .foregroundColor(AppColors.textSecondary)
                                                .lineLimit(1)
                                        }
                                        Spacer()
                                        if selectedRole == role {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(AppColors.primary600)
                                        } else {
                                            Image(systemName: "circle")
                                                .foregroundColor(AppColors.gray300)
                                        }
                                    }
                                    .padding(AppSpacing.md)
                                }

                                if role != UserRole.allCases.last {
                                    Divider()
                                        .padding(.leading, AppSpacing.md)
                                }
                            }
                        }
                        .background(AppColors.cardBackground)
                        .cornerRadius(AppSpacing.radiusMedium)
                    }

                    // Optional message
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("admin.personalMessage".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        TextEditor(text: $message)
                            .font(AppTypography.body)
                            .frame(height: 80)
                            .padding(AppSpacing.sm)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                    }

                    // Error message
                    if let error = errorMessage {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                            Text(error)
                        }
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.error)
                        .padding(AppSpacing.sm)
                        .frame(maxWidth: .infinity)
                        .background(AppColors.error.opacity(0.1))
                        .cornerRadius(AppSpacing.radiusSmall)
                    }

                    Spacer(minLength: AppSpacing.lg)

                    // Send button
                    PrimaryButton("admin.sendInvitation".localized, icon: "envelope.fill", isLoading: isSending) {
                        Task { await sendInvitation() }
                    }
                    .disabled(!isValidEmail || isSending)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("admin.inviteUser".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                        .foregroundColor(AppColors.textSecondary)
                }
            }
            .alert("admin.invitationSent".localized, isPresented: $showSuccess) {
                Button("common.ok".localized) { dismiss() }
            } message: {
                Text(String(format: "admin.invitationSentMessage".localized, email))
            }
        }
    }

    private func sendInvitation() async {
        isSending = true
        errorMessage = nil

        let success = await adminService.inviteUser(
            email: email,
            role: selectedRole,
            message: message.isEmpty ? nil : message
        )

        isSending = false

        if success {
            showSuccess = true
        } else {
            errorMessage = adminService.error ?? "admin.failedToSendInvitation".localized
        }
    }
}

struct UserDetailView: View {
    let user: User
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    @StateObject private var adminService = AdminService.shared
    @State private var selectedRole: UserRole
    @State private var selectedStatus: UserStatus
    @State private var showingRolePicker = false
    @State private var showingStatusPicker = false
    @State private var showingDeactivateConfirm = false
    @State private var showingResetPasswordConfirm = false
    @State private var isSaving = false
    @State private var showSuccessAlert = false
    @State private var successMessage = ""
    @State private var errorMessage: String?

    init(user: User) {
        self.user = user
        _selectedRole = State(initialValue: user.role)
        _selectedStatus = State(initialValue: user.status)
    }

    private var isAdmin: Bool {
        appState.isAdmin
    }

    private var hasChanges: Bool {
        selectedRole != user.role || selectedStatus != user.status
    }

    private var statusColor: Color {
        switch selectedStatus {
        case .active: return AppColors.success
        case .inactive: return AppColors.gray500
        case .pending: return AppColors.warning
        case .suspended: return AppColors.error
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Avatar
                    ZStack {
                        Circle()
                            .fill(AppColors.primary100)
                            .frame(width: 80, height: 80)
                        Text(user.initials)
                            .font(.system(size: 28, weight: .semibold))
                            .foregroundColor(AppColors.primary600)
                    }
                    .padding(.top, AppSpacing.lg)

                    // Name & Email
                    VStack(spacing: AppSpacing.xs) {
                        Text(user.fullName)
                            .font(AppTypography.heading2)
                            .foregroundColor(AppColors.textPrimary)
                        Text(user.email)
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textSecondary)
                    }

                    // Basic Info Card
                    VStack(spacing: AppSpacing.sm) {
                        if let phone = user.phone {
                            UserInfoRow(label: "admin.phone".localized, value: phone)
                        }
                        UserInfoRow(label: "admin.memberSince".localized, value: user.createdAt.formatted(date: .abbreviated, time: .omitted))
                    }
                    .padding(AppSpacing.md)
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppSpacing.radiusMedium)
                    .padding(.horizontal, AppSpacing.md)

                    // Role & Status Section (Admin Only)
                    if isAdmin {
                        VStack(alignment: .leading, spacing: AppSpacing.sm) {
                            Text("admin.roleAndStatus".localized)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                                .textCase(.uppercase)
                                .padding(.horizontal, AppSpacing.md)

                            VStack(spacing: 0) {
                                // Role Picker
                                Button {
                                    showingRolePicker = true
                                } label: {
                                    HStack {
                                        ZStack {
                                            Circle()
                                                .fill(selectedRole.color.opacity(0.15))
                                                .frame(width: 36, height: 36)
                                            Image(systemName: selectedRole.icon)
                                                .font(.system(size: 14))
                                                .foregroundColor(selectedRole.color)
                                        }

                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("admin.role".localized)
                                                .font(AppTypography.caption)
                                                .foregroundColor(AppColors.textSecondary)
                                            Text(selectedRole.displayName)
                                                .font(AppTypography.bodySemibold)
                                                .foregroundColor(AppColors.textPrimary)
                                        }

                                        Spacer()

                                        if selectedRole != user.role {
                                            Text("admin.modified".localized)
                                                .font(AppTypography.caption)
                                                .foregroundColor(AppColors.warning)
                                                .padding(.horizontal, AppSpacing.xs)
                                                .padding(.vertical, 2)
                                                .background(AppColors.warning.opacity(0.15))
                                                .cornerRadius(4)
                                        }

                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 14))
                                            .foregroundColor(AppColors.gray400)
                                    }
                                    .padding(AppSpacing.md)
                                }

                                Divider().padding(.leading, 56)

                                // Status Picker
                                Button {
                                    showingStatusPicker = true
                                } label: {
                                    HStack {
                                        ZStack {
                                            Circle()
                                                .fill(statusColor.opacity(0.15))
                                                .frame(width: 36, height: 36)
                                            Circle()
                                                .fill(statusColor)
                                                .frame(width: 12, height: 12)
                                        }

                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("admin.status".localized)
                                                .font(AppTypography.caption)
                                                .foregroundColor(AppColors.textSecondary)
                                            Text(selectedStatus.displayName)
                                                .font(AppTypography.bodySemibold)
                                                .foregroundColor(AppColors.textPrimary)
                                        }

                                        Spacer()

                                        if selectedStatus != user.status {
                                            Text("admin.modified".localized)
                                                .font(AppTypography.caption)
                                                .foregroundColor(AppColors.warning)
                                                .padding(.horizontal, AppSpacing.xs)
                                                .padding(.vertical, 2)
                                                .background(AppColors.warning.opacity(0.15))
                                                .cornerRadius(4)
                                        }

                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 14))
                                            .foregroundColor(AppColors.gray400)
                                    }
                                    .padding(AppSpacing.md)
                                }
                            }
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .padding(.horizontal, AppSpacing.md)
                        }

                        // Save Changes Button
                        if hasChanges {
                            PrimaryButton("admin.saveChanges".localized, icon: "checkmark.circle.fill", isLoading: isSaving) {
                                Task { await saveChanges() }
                            }
                            .padding(.horizontal, AppSpacing.md)
                        }

                        // Error Message
                        if let error = errorMessage {
                            HStack(spacing: AppSpacing.sm) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(AppColors.error)
                                Text(error)
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.error)
                            }
                            .padding(AppSpacing.md)
                            .frame(maxWidth: .infinity)
                            .background(AppColors.error.opacity(0.1))
                            .cornerRadius(AppSpacing.radiusMedium)
                            .padding(.horizontal, AppSpacing.md)
                        }

                        // Actions Section
                        VStack(alignment: .leading, spacing: AppSpacing.sm) {
                            Text("admin.actions".localized)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                                .textCase(.uppercase)
                                .padding(.horizontal, AppSpacing.md)

                            VStack(spacing: 0) {
                                // Send Password Reset
                                Button {
                                    showingResetPasswordConfirm = true
                                } label: {
                                    HStack(spacing: AppSpacing.sm) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                                .fill(AppColors.info.opacity(0.12))
                                                .frame(width: 36, height: 36)
                                            Image(systemName: "key.fill")
                                                .font(.system(size: 14))
                                                .foregroundColor(AppColors.info)
                                        }

                                        Text("admin.sendPasswordReset".localized)
                                            .font(AppTypography.bodySemibold)
                                            .foregroundColor(AppColors.textPrimary)

                                        Spacer()

                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 14))
                                            .foregroundColor(AppColors.gray400)
                                    }
                                    .padding(AppSpacing.md)
                                }

                                Divider().padding(.leading, 56)

                                // Deactivate User
                                if user.status == .active {
                                    Button {
                                        showingDeactivateConfirm = true
                                    } label: {
                                        HStack(spacing: AppSpacing.sm) {
                                            ZStack {
                                                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                                    .fill(AppColors.error.opacity(0.12))
                                                    .frame(width: 36, height: 36)
                                                Image(systemName: "person.crop.circle.badge.xmark")
                                                    .font(.system(size: 14))
                                                    .foregroundColor(AppColors.error)
                                            }

                                            Text("admin.deactivateUser".localized)
                                                .font(AppTypography.bodySemibold)
                                                .foregroundColor(AppColors.error)

                                            Spacer()

                                            Image(systemName: "chevron.right")
                                                .font(.system(size: 14))
                                                .foregroundColor(AppColors.gray400)
                                        }
                                        .padding(AppSpacing.md)
                                    }
                                }
                            }
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .padding(.horizontal, AppSpacing.md)
                        }
                    } else {
                        // Non-admin view - just show info
                        VStack(spacing: AppSpacing.sm) {
                            UserInfoRow(label: "admin.role".localized, value: user.role.displayName)
                            UserInfoRow(label: "admin.status".localized, value: user.status.displayName)
                        }
                        .padding(AppSpacing.md)
                        .background(AppColors.cardBackground)
                        .cornerRadius(AppSpacing.radiusMedium)
                        .padding(.horizontal, AppSpacing.md)
                    }

                    Spacer()
                }
            }
            .background(AppColors.background)
            .navigationTitle("admin.userDetails".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("admin.done".localized) { dismiss() }
                        .foregroundColor(AppColors.primary600)
                }
            }
            .sheet(isPresented: $showingRolePicker) {
                RolePickerSheet(selectedRole: $selectedRole)
            }
            .sheet(isPresented: $showingStatusPicker) {
                StatusPickerSheet(selectedStatus: $selectedStatus)
            }
            .alert("admin.sendPasswordResetQuestion".localized, isPresented: $showingResetPasswordConfirm) {
                Button("common.cancel".localized, role: .cancel) {}
                Button("admin.sendResetEmail".localized) {
                    Task { await sendPasswordReset() }
                }
            } message: {
                Text(String(format: "admin.passwordResetMessage".localized, user.email))
            }
            .alert("admin.deactivateUserQuestion".localized, isPresented: $showingDeactivateConfirm) {
                Button("common.cancel".localized, role: .cancel) {}
                Button("admin.deactivate".localized, role: .destructive) {
                    Task { await deactivateUser() }
                }
            } message: {
                Text("admin.deactivateUserMessage".localized)
            }
            .alert("admin.success".localized, isPresented: $showSuccessAlert) {
                Button("common.ok".localized) {
                    if successMessage.contains("deactivated") {
                        dismiss()
                    }
                }
            } message: {
                Text(successMessage)
            }
        }
    }

    // MARK: - Actions
    private func saveChanges() async {
        isSaving = true
        errorMessage = nil

        // Update role if changed
        if selectedRole != user.role {
            let success = await adminService.updateUserRole(userId: user.id, role: selectedRole)
            if !success {
                errorMessage = "admin.failedToUpdateRole".localized
                isSaving = false
                return
            }
        }

        // Update status if changed
        if selectedStatus != user.status {
            let success = await adminService.updateUserStatus(userId: user.id, status: selectedStatus)
            if !success {
                errorMessage = "admin.failedToUpdateStatus".localized
                isSaving = false
                return
            }
        }

        isSaving = false
        successMessage = "admin.userUpdated".localized
        showSuccessAlert = true
    }

    private func sendPasswordReset() async {
        let success = await adminService.sendPasswordReset(userId: user.id)
        if success {
            successMessage = String(format: "admin.passwordResetSent".localized, user.email)
        } else {
            successMessage = "admin.failedToSendPasswordReset".localized
        }
        showSuccessAlert = true
    }

    private func deactivateUser() async {
        let success = await adminService.updateUserStatus(userId: user.id, status: .inactive)
        if success {
            successMessage = "admin.userDeactivated".localized
            selectedStatus = .inactive
        } else {
            successMessage = "admin.failedToDeactivateUser".localized
        }
        showSuccessAlert = true
    }
}

// MARK: - Role Picker Sheet
struct RolePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedRole: UserRole

    var body: some View {
        NavigationStack {
            List {
                ForEach(UserRole.allCases, id: \.self) { role in
                    Button {
                        selectedRole = role
                        dismiss()
                    } label: {
                        HStack(spacing: AppSpacing.sm) {
                            ZStack {
                                Circle()
                                    .fill(role.color.opacity(0.15))
                                    .frame(width: 40, height: 40)
                                Image(systemName: role.icon)
                                    .font(.system(size: 16))
                                    .foregroundColor(role.color)
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                Text(role.displayName)
                                    .font(AppTypography.bodySemibold)
                                    .foregroundColor(AppColors.textPrimary)
                                Text(role.description)
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textSecondary)
                                    .lineLimit(1)
                            }

                            Spacer()

                            if selectedRole == role {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(AppColors.primary600)
                            }
                        }
                    }
                }
            }
            .navigationTitle("admin.selectRole".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }
}

// MARK: - Status Picker Sheet
struct StatusPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedStatus: UserStatus

    private var statuses: [(UserStatus, Color, String)] {
        [
            (.active, AppColors.success, "admin.statusActiveDesc".localized),
            (.inactive, AppColors.gray500, "admin.statusInactiveDesc".localized),
            (.pending, AppColors.warning, "admin.statusPendingDesc".localized),
            (.suspended, AppColors.error, "admin.statusSuspendedDesc".localized)
        ]
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(statuses, id: \.0) { status, color, description in
                    Button {
                        selectedStatus = status
                        dismiss()
                    } label: {
                        HStack(spacing: AppSpacing.sm) {
                            Circle()
                                .fill(color)
                                .frame(width: 12, height: 12)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(status.displayName)
                                    .font(AppTypography.bodySemibold)
                                    .foregroundColor(AppColors.textPrimary)
                                Text(description)
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textSecondary)
                            }

                            Spacer()

                            if selectedStatus == status {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(AppColors.primary600)
                            }
                        }
                    }
                }
            }
            .navigationTitle("admin.selectStatus".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }
}

// MARK: - User Info Row
private struct UserInfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textSecondary)
            Spacer()
            Text(value)
                .font(AppTypography.bodySemibold)
                .foregroundColor(AppColors.textPrimary)
        }
    }
}

struct RolesPermissionsView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.lg) {
                // Header
                VStack(spacing: AppSpacing.sm) {
                    Image(systemName: "lock.shield.fill")
                        .font(.system(size: 40))
                        .foregroundColor(AppColors.warning)

                    Text("admin.rolesDescription".localized)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, AppSpacing.md)
                .padding(.horizontal, AppSpacing.lg)

                // Role list
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("admin.availableRoles".localized)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                        .textCase(.uppercase)
                        .padding(.horizontal, AppSpacing.md)

                    VStack(spacing: 0) {
                        ForEach(UserRole.allCases, id: \.self) { role in
                            NavigationLink {
                                RoleDetailView(role: role)
                            } label: {
                                HStack(spacing: AppSpacing.sm) {
                                    // Role icon
                                    ZStack {
                                        Circle()
                                            .fill(role.color.opacity(0.15))
                                            .frame(width: 40, height: 40)
                                        Image(systemName: role.icon)
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundColor(role.color)
                                    }

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(role.displayName)
                                            .font(AppTypography.bodySemibold)
                                            .foregroundColor(AppColors.textPrimary)
                                        Text(role.description)
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.textSecondary)
                                            .lineLimit(1)
                                    }

                                    Spacer()

                                    // Permission count badge
                                    Text("\(role.defaultPermissions.count)")
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textSecondary)
                                        .padding(.horizontal, AppSpacing.xs)
                                        .padding(.vertical, 2)
                                        .background(AppColors.gray100)
                                        .cornerRadius(4)

                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14))
                                        .foregroundColor(AppColors.gray400)
                                }
                                .padding(AppSpacing.md)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)

                            if role != UserRole.allCases.last {
                                Divider()
                                    .padding(.leading, 56)
                            }
                        }
                    }
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppSpacing.radiusMedium)
                    .padding(.horizontal, AppSpacing.md)
                }
            }
            .padding(.vertical, AppSpacing.md)
        }
        .background(AppColors.background)
        .navigationTitle("admin.rolesTitle".localized)
    }
}

// MARK: - Role Detail View
struct RoleDetailView: View {
    let role: UserRole

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.lg) {
                // Role Header
                VStack(spacing: AppSpacing.sm) {
                    ZStack {
                        Circle()
                            .fill(role.color.opacity(0.15))
                            .frame(width: 72, height: 72)
                        Image(systemName: role.icon)
                            .font(.system(size: 28, weight: .semibold))
                            .foregroundColor(role.color)
                    }

                    Text(role.displayName)
                        .font(AppTypography.heading2)
                        .foregroundColor(AppColors.textPrimary)

                    Text(role.description)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textSecondary)
                        .multilineTextAlignment(.center)

                    // Stats row
                    HStack(spacing: AppSpacing.lg) {
                        VStack(spacing: 2) {
                            Text("\(role.defaultPermissions.count)")
                                .font(AppTypography.heading3)
                                .foregroundColor(role.color)
                            Text("admin.permissions".localized)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                        }

                        VStack(spacing: 2) {
                            Text(String(format: "admin.levelFormat".localized, role.hierarchyLevel))
                                .font(AppTypography.heading3)
                                .foregroundColor(role.color)
                            Text("admin.hierarchy".localized)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                    .padding(.top, AppSpacing.xs)
                }
                .padding(.top, AppSpacing.md)
                .padding(.horizontal, AppSpacing.lg)

                // Permissions by Category
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    Text("admin.permissions".localized)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                        .textCase(.uppercase)
                        .padding(.horizontal, AppSpacing.md)

                    ForEach(PermissionCategory.allCases, id: \.self) { category in
                        let categoryPermissions = category.permissions
                        let rolePermissions = role.defaultPermissions
                        let grantedPermissions = categoryPermissions.filter { rolePermissions.contains($0) }

                        if !grantedPermissions.isEmpty {
                            VStack(alignment: .leading, spacing: 0) {
                                // Category header
                                HStack {
                                    Text(category.rawValue)
                                        .font(AppTypography.bodySemibold)
                                        .foregroundColor(AppColors.textPrimary)
                                    Spacer()
                                    Text("\(grantedPermissions.count)/\(categoryPermissions.count)")
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textTertiary)
                                }
                                .padding(AppSpacing.md)
                                .background(AppColors.gray50)

                                // Permissions list
                                ForEach(categoryPermissions, id: \.self) { permission in
                                    let isGranted = rolePermissions.contains(permission)
                                    HStack {
                                        Image(systemName: isGranted ? "checkmark.circle.fill" : "xmark.circle")
                                            .font(.system(size: 16))
                                            .foregroundColor(isGranted ? AppColors.success : AppColors.gray300)

                                        Text(permission.displayName)
                                            .font(AppTypography.body)
                                            .foregroundColor(isGranted ? AppColors.textPrimary : AppColors.textTertiary)

                                        Spacer()
                                    }
                                    .padding(.horizontal, AppSpacing.md)
                                    .padding(.vertical, AppSpacing.sm)

                                    if permission != categoryPermissions.last {
                                        Divider()
                                            .padding(.leading, 44)
                                    }
                                }
                            }
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .padding(.horizontal, AppSpacing.md)
                        }
                    }
                }
            }
            .padding(.bottom, AppSpacing.xl)
        }
        .background(AppColors.background)
        .navigationTitle(role.displayName)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Module Settings View (Company-Wide)
struct ModuleSettingsView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var isSaving = false
    @State private var showingSavedAlert = false

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    var body: some View {
        ScrollView {
            VStack(spacing: isCompact ? AppSpacing.lg : AppSpacing.md) {
                // Warning banner
                HStack(spacing: AppSpacing.sm) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(AppColors.warning)
                    Text("admin.moduleSettingsWarning".localized)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }
                .padding(AppSpacing.md)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppColors.warning.opacity(0.1))
                .cornerRadius(AppSpacing.radiusMedium)

                // Core Work Modules
                ModuleSectionCard(title: "admin.coreSection".localized) {
                    VStack(spacing: 0) {
                        ModuleToggle(title: "admin.moduleTimeTracking".localized, subtitle: "admin.moduleTimeTrackingDesc".localized, icon: "clock.fill", iconColor: AppColors.primary600, isOn: $appState.moduleSettings.timeTrackingEnabled)
                        SettingsDivider()
                        ModuleToggle(title: "admin.moduleDailyLogs".localized, subtitle: "admin.moduleDailyLogsDesc".localized, icon: "doc.text.fill", iconColor: AppColors.success, isOn: $appState.moduleSettings.dailyLogsEnabled)
                        SettingsDivider()
                        ModuleToggle(title: "admin.moduleTasks".localized, subtitle: "admin.moduleTasksDesc".localized, icon: "checklist", iconColor: AppColors.info, isOn: $appState.moduleSettings.tasksEnabled)
                        SettingsDivider()
                        ModuleToggle(title: "admin.moduleScheduling".localized, subtitle: "admin.moduleSchedulingDesc".localized, icon: "calendar", iconColor: AppColors.purple, isOn: $appState.moduleSettings.schedulingEnabled)
                        SettingsDivider()
                        ModuleToggle(title: "admin.moduleDrawings".localized, subtitle: "admin.moduleDrawingsDesc".localized, icon: "doc.richtext", iconColor: AppColors.primary600, isOn: $appState.moduleSettings.drawingsEnabled)
                        SettingsDivider()
                        ModuleToggle(title: "admin.moduleDocuments".localized, subtitle: "admin.moduleDocumentsDesc".localized, icon: "doc.fill", iconColor: AppColors.info, isOn: $appState.moduleSettings.documentsEnabled)
                    }
                }

                // Resources Section
                ModuleSectionCard(title: "admin.resourcesSection".localized) {
                    VStack(spacing: 0) {
                        ModuleToggle(title: "admin.moduleEquipment".localized, subtitle: "admin.moduleEquipmentDesc".localized, icon: "wrench.and.screwdriver.fill", iconColor: AppColors.warning, isOn: $appState.moduleSettings.equipmentEnabled)
                        SettingsDivider()
                        ModuleToggle(title: "admin.moduleMaterials".localized, subtitle: "admin.moduleMaterialsDesc".localized, icon: "shippingbox.fill", iconColor: AppColors.warning, isOn: $appState.moduleSettings.materialsEnabled)
                        SettingsDivider()
                        ModuleToggle(title: "admin.moduleSubcontractors".localized, subtitle: "admin.moduleSubcontractorsDesc".localized, icon: "person.2.badge.gearshape", iconColor: AppColors.info, isOn: $appState.moduleSettings.subcontractorsEnabled)
                        SettingsDivider()
                        ModuleToggle(title: "admin.moduleCertifications".localized, subtitle: "admin.moduleCertificationsDesc".localized, icon: "checkmark.seal.fill", iconColor: AppColors.success, isOn: $appState.moduleSettings.certificationsEnabled)
                    }
                }

                // Safety Section
                ModuleSectionCard(title: "admin.safetyQualitySection".localized) {
                    VStack(spacing: 0) {
                        ModuleToggle(title: "admin.moduleSafety".localized, subtitle: "admin.moduleSafetyDesc".localized, icon: "shield.checkered", iconColor: AppColors.error, isOn: $appState.moduleSettings.safetyEnabled)
                        SettingsDivider()
                        ModuleToggle(title: "admin.moduleApprovals".localized, subtitle: "admin.moduleApprovalsDesc".localized, icon: "checkmark.circle.fill", iconColor: AppColors.info, isOn: $appState.moduleSettings.approvalsEnabled)
                        SettingsDivider()
                        ModuleToggle(title: "admin.moduleWarnings".localized, subtitle: "admin.moduleWarningsDesc".localized, icon: "exclamationmark.triangle.fill", iconColor: AppColors.warning, isOn: $appState.moduleSettings.warningsEnabled)
                    }
                }

                // Finance Section
                ModuleSectionCard(title: "admin.financeReportsSection".localized) {
                    VStack(spacing: 0) {
                        ModuleToggle(title: "admin.moduleFinancials".localized, subtitle: "admin.moduleFinancialsDesc".localized, icon: "dollarsign.circle.fill", iconColor: AppColors.success, isOn: $appState.moduleSettings.financialsEnabled)
                        SettingsDivider()
                        ModuleToggle(title: "admin.moduleReports".localized, subtitle: "admin.moduleReportsDesc".localized, icon: "chart.bar.fill", iconColor: AppColors.purple, isOn: $appState.moduleSettings.reportsEnabled)
                    }
                }

                // Business Section
                ModuleSectionCard(title: "admin.businessSection".localized) {
                    VStack(spacing: 0) {
                        ModuleToggle(title: "admin.moduleClients".localized, subtitle: "admin.moduleClientsDesc".localized, icon: "building.2.fill", iconColor: AppColors.info, isOn: $appState.moduleSettings.clientsEnabled)
                    }
                }

                // Integrations Section
                ModuleSectionCard(title: "admin.integrationsSection".localized) {
                    VStack(spacing: 0) {
                        ModuleToggle(title: "admin.moduleDroneDeploy".localized, subtitle: "admin.moduleDroneDeployDesc".localized, icon: "airplane", iconColor: AppColors.purple, isOn: $appState.moduleSettings.droneDeployEnabled)
                    }
                }

                // Save Button
                PrimaryButton(isSaving ? "admin.saving".localized : "admin.saveModuleSettings".localized, icon: "checkmark", isLoading: isSaving) {
                    Task {
                        await saveModuleSettings()
                    }
                }
                .disabled(isSaving)
                .padding(.top, AppSpacing.md)
            }
            .padding(AppSpacing.md)
            .padding(.bottom, AppSpacing.xl)
        }
        .background(AppColors.background)
        .navigationTitle("admin.moduleSettingsTitle".localized)
        .navigationBarTitleDisplayMode(.inline)
        .alert("admin.settingsSaved".localized, isPresented: $showingSavedAlert) {
            Button("common.ok".localized) {}
        } message: {
            Text("admin.moduleSettingsSavedMessage".localized)
        }
    }

    private func saveModuleSettings() async {
        isSaving = true
        defer { isSaving = false }

        do {
            // Build the request matching API schema
            let request = ModuleSettingsUpdateRequest(
                type: "company",
                settings: ModuleSettingsPayload(
                    moduleProjects: appState.moduleSettings.projectsEnabled,
                    moduleDailyLogs: appState.moduleSettings.dailyLogsEnabled,
                    moduleTimeTracking: appState.moduleSettings.timeTrackingEnabled,
                    moduleTasks: appState.moduleSettings.tasksEnabled,
                    moduleScheduling: appState.moduleSettings.schedulingEnabled,
                    moduleEquipment: appState.moduleSettings.equipmentEnabled,
                    moduleDocuments: appState.moduleSettings.documentsEnabled,
                    moduleDrawings: appState.moduleSettings.drawingsEnabled,
                    moduleSafety: appState.moduleSettings.safetyEnabled,
                    moduleFinancials: appState.moduleSettings.financialsEnabled,
                    moduleReports: appState.moduleSettings.reportsEnabled,
                    moduleAnalytics: appState.moduleSettings.analyticsEnabled,
                    moduleSubcontractors: appState.moduleSettings.subcontractorsEnabled,
                    moduleCertifications: appState.moduleSettings.certificationsEnabled,
                    moduleDroneDeploy: appState.moduleSettings.droneDeployEnabled,
                    moduleApprovals: appState.moduleSettings.approvalsEnabled,
                    moduleWarnings: appState.moduleSettings.warningsEnabled,
                    moduleClients: appState.moduleSettings.clientsEnabled,
                    moduleMaterials: appState.moduleSettings.materialsEnabled
                )
            )

            let _: ModuleSettingsSaveResponse = try await APIClient.shared.put("/settings", body: request)
            showingSavedAlert = true
            print("[ModuleSettingsView] ✅ Module settings saved successfully")
        } catch {
            print("[ModuleSettingsView] ❌ Failed to save module settings: \(error)")
        }
    }
}

// MARK: - Module Settings API Request/Response
private struct ModuleSettingsUpdateRequest: Encodable {
    let type: String
    let settings: ModuleSettingsPayload
}

private struct ModuleSettingsPayload: Encodable {
    let moduleProjects: Bool
    let moduleDailyLogs: Bool
    let moduleTimeTracking: Bool
    let moduleTasks: Bool
    let moduleScheduling: Bool
    let moduleEquipment: Bool
    let moduleDocuments: Bool
    let moduleDrawings: Bool
    let moduleSafety: Bool
    let moduleFinancials: Bool
    let moduleReports: Bool
    let moduleAnalytics: Bool
    let moduleSubcontractors: Bool
    let moduleCertifications: Bool
    let moduleDroneDeploy: Bool
    let moduleApprovals: Bool
    let moduleWarnings: Bool
    let moduleClients: Bool
    let moduleMaterials: Bool
}

private struct ModuleSettingsSaveResponse: Decodable {
    let success: Bool?
    let message: String?
}

// MARK: - Module Section Card
private struct ModuleSectionCard<Content: View>: View {
    let title: String
    let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(title)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textTertiary)
                .textCase(.uppercase)

            content
                .padding(AppSpacing.sm)
                .background(AppColors.cardBackground)
                .cornerRadius(AppSpacing.radiusMedium)
        }
    }
}

#Preview {
    NavigationStack {
        AdminView()
            .environmentObject(AppState())
    }
}
