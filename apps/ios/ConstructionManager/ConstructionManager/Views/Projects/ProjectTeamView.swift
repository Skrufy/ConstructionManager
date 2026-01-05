//
//  ProjectTeamView.swift
//  ConstructionManager
//
//  View for managing project team members
//

import SwiftUI

struct ProjectTeamView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    @ObservedObject private var teamService = ProjectTeamService.shared

    let project: Project

    @State private var showingAddMember = false
    @State private var memberToRemove: TeamMember?
    @State private var memberToEdit: TeamMember?
    @State private var searchText = ""

    private var canManageTeam: Bool {
        guard let user = appState.currentUser else { return false }
        return user.role == .admin || user.role == .projectManager
    }

    var filteredMembers: [TeamMember] {
        if searchText.isEmpty {
            return teamService.teamMembers
        }
        return teamService.teamMembers.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.email.localizedCaseInsensitiveContains(searchText) ||
            $0.role.displayName.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                if !teamService.teamMembers.isEmpty {
                    searchBar
                }

                // Content
                if teamService.isLoading && teamService.teamMembers.isEmpty {
                    loadingView
                } else if teamService.teamMembers.isEmpty {
                    emptyState
                } else {
                    teamList
                }
            }
            .background(AppColors.background)
            .navigationTitle("Team Members")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
                if canManageTeam {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button(action: { showingAddMember = true }) {
                            Image(systemName: "plus")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(AppColors.primary600)
                        }
                    }
                }
            }
            .task {
                await teamService.fetchTeamMembers(projectId: project.id)
            }
            .refreshable {
                await teamService.fetchTeamMembers(projectId: project.id)
            }
            .sheet(isPresented: $showingAddMember) {
                AddTeamMemberView(project: project)
                    .environmentObject(appState)
            }
            .sheet(item: $memberToEdit) { member in
                EditTeamMemberRoleView(project: project, member: member)
                    .environmentObject(appState)
            }
            .confirmationDialog(
                "Remove Team Member?",
                isPresented: Binding(
                    get: { memberToRemove != nil },
                    set: { if !$0 { memberToRemove = nil } }
                ),
                titleVisibility: .visible
            ) {
                if let member = memberToRemove {
                    Button("Remove \(member.name)", role: .destructive) {
                        Task {
                            await teamService.removeTeamMember(
                                projectId: project.id,
                                assignmentId: member.assignmentId
                            )
                        }
                        memberToRemove = nil
                    }
                }
                Button("Cancel", role: .cancel) {
                    memberToRemove = nil
                }
            } message: {
                if let member = memberToRemove {
                    Text("This will remove \(member.name) from the project. They will no longer have access to this project's data.")
                }
            }
            .alert("Error", isPresented: Binding(
                get: { teamService.error != nil },
                set: { if !$0 { teamService.error = nil } }
            )) {
                Button("OK") { teamService.error = nil }
            } message: {
                Text(teamService.error ?? "An error occurred")
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.gray400)
            TextField("Search team members...", text: $searchText)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textPrimary)
        }
        .padding(AppSpacing.sm)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusMedium)
        .overlay(
            RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                .stroke(AppColors.gray200, lineWidth: 1)
        )
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.sm)
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: AppSpacing.md) {
            ProgressView()
            Text("Loading team members...")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: AppSpacing.lg) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray400)

            VStack(spacing: AppSpacing.xs) {
                Text("No Team Members")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)
                Text("Add team members to collaborate on this project")
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            if canManageTeam {
                PrimaryButton("Add Team Member", icon: "plus.circle") {
                    showingAddMember = true
                }
                .padding(.horizontal, AppSpacing.xl)
            }
        }
        .padding(AppSpacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Team List

    private var teamList: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.sm) {
                // Team count header
                HStack {
                    Text("\(teamService.teamMembers.count) team member\(teamService.teamMembers.count == 1 ? "" : "s")")
                        .font(AppTypography.secondaryMedium)
                        .foregroundColor(AppColors.textSecondary)
                    Spacer()
                }
                .padding(.horizontal, AppSpacing.md)

                ForEach(filteredMembers) { member in
                    TeamMemberCard(
                        member: member,
                        canManage: canManageTeam,
                        onEdit: { memberToEdit = member },
                        onRemove: { memberToRemove = member }
                    )
                }
            }
            .padding(AppSpacing.md)
        }
    }
}

// MARK: - Team Member Card

struct TeamMemberCard: View {
    let member: TeamMember
    let canManage: Bool
    let onEdit: () -> Void
    let onRemove: () -> Void

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.md) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(member.role.color.opacity(0.15))
                        .frame(width: 48, height: 48)
                    Text(member.initials)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(member.role.color)
                }

                // Info
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(member.name)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text(member.email)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .lineLimit(1)

                    // Role Badge
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: member.role.icon)
                            .font(.system(size: 12))
                        Text(member.effectiveRoleDisplay)
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(member.role.color)
                    .padding(.horizontal, AppSpacing.xs)
                    .padding(.vertical, 4)
                    .background(member.role.color.opacity(0.1))
                    .cornerRadius(AppSpacing.radiusSmall)
                }

                Spacer()

                // Actions Menu
                if canManage {
                    Menu {
                        Button(action: onEdit) {
                            Label("Change Role", systemImage: "person.badge.key")
                        }
                        Button(role: .destructive, action: onRemove) {
                            Label("Remove from Project", systemImage: "person.badge.minus")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(AppColors.gray500)
                            .frame(width: 44, height: 44)
                    }
                }
            }
        }
    }
}

// MARK: - Add Team Member View

struct AddTeamMemberView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var teamService = ProjectTeamService.shared

    let project: Project

    @State private var searchText = ""
    @State private var selectedUserId: String?
    @State private var selectedRoleOverride: String = ""
    @State private var isAdding = false

    private let roleOptions = [
        ("", "Default (use user role)"),
        ("LEAD", "Project Lead"),
        ("MEMBER", "Team Member"),
        ("VIEWER", "View Only")
    ]

    var filteredUsers: [APIUserListItem] {
        let unassigned = teamService.getUnassignedUsers()
        if searchText.isEmpty {
            return unassigned
        }
        return unassigned.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.email.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search
                searchBar

                // Role Picker (only if user selected)
                if selectedUserId != nil {
                    rolePickerSection
                }

                // Users List
                if teamService.isLoading && teamService.availableUsers.isEmpty {
                    loadingView
                } else if filteredUsers.isEmpty {
                    emptyState
                } else {
                    usersList
                }
            }
            .background(AppColors.background)
            .navigationTitle("Add Team Member")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") {
                        addSelectedMember()
                    }
                    .disabled(selectedUserId == nil || isAdding)
                    .font(AppTypography.bodyMedium)
                }
            }
            .task {
                await teamService.fetchAvailableUsers()
            }
        }
    }

    // MARK: - Components

    private var searchBar: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.gray400)
            TextField("Search users...", text: $searchText)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textPrimary)
        }
        .padding(AppSpacing.sm)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusMedium)
        .overlay(
            RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                .stroke(AppColors.gray200, lineWidth: 1)
        )
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.sm)
    }

    private var rolePickerSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text("Project Role")
                .font(AppTypography.label)
                .foregroundColor(AppColors.textSecondary)

            Picker("Role", selection: $selectedRoleOverride) {
                ForEach(roleOptions, id: \.0) { value, label in
                    Text(label).tag(value)
                }
            }
            .pickerStyle(.menu)
            .padding(.horizontal, AppSpacing.sm)
            .padding(.vertical, AppSpacing.xs)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(AppColors.gray200, lineWidth: 1)
            )
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.bottom, AppSpacing.sm)
    }

    private var loadingView: some View {
        VStack(spacing: AppSpacing.md) {
            ProgressView()
            Text("Loading users...")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "person.slash")
                .font(.system(size: 40))
                .foregroundColor(AppColors.gray400)
            Text(searchText.isEmpty ? "All users are already assigned" : "No users match your search")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var usersList: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.xs) {
                ForEach(filteredUsers, id: \.id) { user in
                    UserSelectionRow(
                        user: user,
                        isSelected: selectedUserId == user.id,
                        onSelect: {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                selectedUserId = user.id
                            }
                        }
                    )
                }
            }
            .padding(AppSpacing.md)
        }
    }

    // MARK: - Actions

    private func addSelectedMember() {
        guard let userId = selectedUserId else { return }

        isAdding = true
        Task {
            let roleOverride = selectedRoleOverride.isEmpty ? nil : selectedRoleOverride
            let result = await teamService.addTeamMember(
                projectId: project.id,
                userId: userId,
                roleOverride: roleOverride
            )

            await MainActor.run {
                isAdding = false
                if result != nil {
                    dismiss()
                }
            }
        }
    }
}

// MARK: - User Selection Row

struct UserSelectionRow: View {
    let user: APIUserListItem
    let isSelected: Bool
    let onSelect: () -> Void

    var role: UserRole {
        UserRole(rawValue: user.role) ?? .fieldWorker
    }

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: AppSpacing.md) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(role.color.opacity(0.15))
                        .frame(width: 44, height: 44)
                    Text(initials)
                        .font(AppTypography.secondaryMedium)
                        .foregroundColor(role.color)
                }

                // Info
                VStack(alignment: .leading, spacing: 2) {
                    Text(user.name)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text(user.email)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                        .lineLimit(1)
                }

                Spacer()

                // Role Badge
                Text(role.displayName)
                    .font(AppTypography.caption)
                    .foregroundColor(role.color)
                    .padding(.horizontal, AppSpacing.xs)
                    .padding(.vertical, 4)
                    .background(role.color.opacity(0.1))
                    .cornerRadius(AppSpacing.radiusSmall)

                // Selection Indicator
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundColor(isSelected ? AppColors.primary600 : AppColors.gray300)
            }
            .padding(AppSpacing.sm)
            .background(isSelected ? AppColors.primary50 : AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(isSelected ? AppColors.primary600 : AppColors.gray200, lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var initials: String {
        let components = user.name.split(separator: " ")
        if components.count >= 2 {
            return String(components[0].prefix(1)) + String(components[1].prefix(1))
        }
        return String(user.name.prefix(2)).uppercased()
    }
}

// MARK: - Edit Team Member Role View

struct EditTeamMemberRoleView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var teamService = ProjectTeamService.shared

    let project: Project
    let member: TeamMember

    @State private var selectedRole: String
    @State private var isSaving = false

    private let roleOptions = [
        ("", "Default (use user role)"),
        ("LEAD", "Project Lead"),
        ("MEMBER", "Team Member"),
        ("VIEWER", "View Only")
    ]

    init(project: Project, member: TeamMember) {
        self.project = project
        self.member = member
        _selectedRole = State(initialValue: member.roleOverride ?? "")
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: AppSpacing.lg) {
                // Member Info
                VStack(spacing: AppSpacing.sm) {
                    ZStack {
                        Circle()
                            .fill(member.role.color.opacity(0.15))
                            .frame(width: 64, height: 64)
                        Text(member.initials)
                            .font(AppTypography.heading2)
                            .foregroundColor(member.role.color)
                    }

                    Text(member.name)
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)

                    Text(member.email)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)

                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: member.role.icon)
                            .font(.system(size: 12))
                        Text("Base role: \(member.role.displayName)")
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(member.role.color)
                }
                .padding(.top, AppSpacing.lg)

                Divider()

                // Role Selection
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("Project Role Override")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textSecondary)

                    VStack(spacing: AppSpacing.xs) {
                        ForEach(roleOptions, id: \.0) { value, label in
                            RoleOptionRow(
                                label: label,
                                isSelected: selectedRole == value,
                                onSelect: { selectedRole = value }
                            )
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)

                Spacer()

                // Save Button
                PrimaryButton("Save Changes", isLoading: isSaving) {
                    saveChanges()
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.bottom, AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Edit Role")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func saveChanges() {
        isSaving = true
        Task {
            let roleOverride = selectedRole.isEmpty ? nil : selectedRole
            let success = await teamService.updateTeamMemberRole(
                projectId: project.id,
                assignmentId: member.assignmentId,
                roleOverride: roleOverride
            )

            await MainActor.run {
                isSaving = false
                if success {
                    dismiss()
                }
            }
        }
    }
}

// MARK: - Role Option Row

struct RoleOptionRow: View {
    let label: String
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack {
                Text(label)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
                Spacer()
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundColor(isSelected ? AppColors.primary600 : AppColors.gray300)
            }
            .padding(AppSpacing.md)
            .background(isSelected ? AppColors.primary50 : AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(isSelected ? AppColors.primary600 : AppColors.gray200, lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ProjectTeamView(project: Project.mockProjects[0])
        .environmentObject(AppState())
}
