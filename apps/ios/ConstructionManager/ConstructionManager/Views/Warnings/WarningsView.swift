//
//  WarningsView.swift
//  ConstructionManager
//
//  Employee warnings management view
//

import SwiftUI
import Combine

struct WarningsView: View {
    @StateObject private var viewModel = WarningsViewModel()
    @State private var searchText = ""
    @State private var selectedStatus: WarningStatus?
    @State private var selectedType: WarningType?
    @State private var showingNewWarning = false
    @State private var selectedWarning: EmployeeWarning?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                searchBar

                // Filters
                filterSection

                // Stats Summary
                statsSummary

                // Warnings List
                ScrollView {
                    LazyVStack(spacing: AppSpacing.sm) {
                        ForEach(viewModel.filteredWarnings(search: searchText, status: selectedStatus, type: selectedType)) { warning in
                            WarningCard(warning: warning)
                                .onTapGesture {
                                    selectedWarning = warning
                                }
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
            .background(AppColors.background)
            .navigationTitle("Employee Warnings")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingNewWarning = true }) {
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(AppColors.primary600)
                    }
                }
            }
            .sheet(isPresented: $showingNewWarning) {
                NewWarningView()
            }
            .sheet(item: $selectedWarning) { warning in
                WarningDetailView(warning: warning)
            }
            .task {
                await viewModel.fetchWarnings()
            }
            .refreshable {
                await viewModel.fetchWarnings()
            }
        }
    }

    private var searchBar: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.gray400)
            TextField("Search by employee or title...", text: $searchText)
                .font(AppTypography.body)
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
        .background(AppColors.cardBackground)
    }

    private var filterSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                // Status Filter
                Menu {
                    Button("All Statuses") { selectedStatus = nil }
                    Divider()
                    ForEach(WarningStatus.allCases, id: \.self) { status in
                        Button(status.rawValue) { selectedStatus = status }
                    }
                } label: {
                    FilterChip(
                        title: selectedStatus?.rawValue ?? "Status",
                        isSelected: selectedStatus != nil
                    ) {}
                }

                // Type Filter
                Menu {
                    Button("All Types") { selectedType = nil }
                    Divider()
                    ForEach(WarningType.allCases, id: \.self) { type in
                        Button(type.rawValue) { selectedType = type }
                    }
                } label: {
                    FilterChip(
                        title: selectedType?.rawValue ?? "Type",
                        isSelected: selectedType != nil
                    ) {}
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.xs)
        }
    }

    private var statsSummary: some View {
        HStack(spacing: AppSpacing.sm) {
            WarningStatBadge(
                count: viewModel.pendingCount,
                label: "Pending",
                color: AppColors.warning
            )
            WarningStatBadge(
                count: viewModel.thisMonthCount,
                label: "This Month",
                color: AppColors.info
            )
            WarningStatBadge(
                count: viewModel.followUpCount,
                label: "Follow-up",
                color: AppColors.orange
            )
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.xs)
    }
}

// MARK: - Warning Stat Badge
struct WarningStatBadge: View {
    let count: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: AppSpacing.xxs) {
            Text("\(count)")
                .font(AppTypography.heading3)
                .foregroundColor(color)
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AppSpacing.sm)
        .background(color.opacity(0.1))
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

// MARK: - Warning Card
struct WarningCard: View {
    let warning: EmployeeWarning

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    // Type Badge
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: warning.type.icon)
                            .font(.system(size: 12))
                        Text(warning.type.rawValue)
                            .font(AppTypography.captionMedium)
                    }
                    .padding(.horizontal, AppSpacing.sm)
                    .padding(.vertical, AppSpacing.xxs)
                    .foregroundColor(warning.type.color)
                    .background(warning.type.color.opacity(0.1))
                    .cornerRadius(AppSpacing.radiusFull)

                    Spacer()

                    // Status Badge
                    StatusBadge(
                        text: warning.status.rawValue,
                        status: warningStatusToBadgeStatus(warning.status)
                    )
                }

                // Employee Name
                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: "person.fill")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.gray400)
                    Text(warning.employeeName)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                }

                // Title
                Text(warning.title)
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)
                    .lineLimit(2)

                // Footer
                HStack {
                    // Severity
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: warning.severity.icon)
                            .font(.system(size: 10))
                        Text(warning.severity.rawValue)
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(warning.severity.color)

                    Spacer()

                    // Date
                    Text(formatDate(warning.issuedAt))
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)

                    // Follow-up indicator
                    if warning.followUpRequired && warning.status != .resolved {
                        Image(systemName: "bell.badge")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.orange)
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }

    private func warningStatusToBadgeStatus(_ status: WarningStatus) -> BadgeStatus {
        switch status {
        case .pending: return .pending
        case .acknowledged: return .active
        case .disputed: return .warning
        case .resolved: return .completed
        case .escalated: return .warning
        }
    }
}

// MARK: - Warning Detail View
struct WarningDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let warning: EmployeeWarning

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // Header Card
                    AppCard {
                        VStack(alignment: .leading, spacing: AppSpacing.md) {
                            // Type & Status
                            HStack {
                                HStack(spacing: AppSpacing.xxs) {
                                    Image(systemName: warning.type.icon)
                                    Text(warning.type.rawValue)
                                        .font(AppTypography.secondaryMedium)
                                }
                                .foregroundColor(warning.type.color)

                                Spacer()

                                StatusBadge(
                                    text: warning.status.rawValue,
                                    status: warning.status == .acknowledged ? .active : .pending
                                )
                            }

                            // Title
                            Text(warning.title)
                                .font(AppTypography.heading3)
                                .foregroundColor(AppColors.textPrimary)

                            Divider()

                            // Employee Info
                            InfoRow(label: "Employee", value: warning.employeeName)
                            InfoRow(label: "Issued By", value: warning.issuedByName)
                            if let projectName = warning.projectName {
                                InfoRow(label: "Project", value: projectName)
                            }
                            InfoRow(label: "Incident Date", value: formatDate(warning.incidentDate))
                            InfoRow(label: "Issued Date", value: formatDate(warning.issuedAt))
                        }
                    }

                    // Description
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Description")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            Text(warning.description)
                                .font(AppTypography.body)
                                .foregroundColor(AppColors.textPrimary)
                        }
                    }

                    // Witnesses
                    if !warning.witnesses.isEmpty {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Witnesses")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                    ForEach(warning.witnesses, id: \.self) { witness in
                                        HStack(spacing: AppSpacing.xs) {
                                            Image(systemName: "person.fill")
                                                .font(.system(size: 12))
                                                .foregroundColor(AppColors.gray400)
                                            Text(witness)
                                                .font(AppTypography.body)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Employee Response
                    if let response = warning.employeeResponse {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Employee Response")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                    Text(response)
                                        .font(AppTypography.body)
                                        .foregroundColor(AppColors.textPrimary)
                                    if let acknowledgedAt = warning.acknowledgedAt {
                                        Text("Acknowledged on \(formatDate(acknowledgedAt))")
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.textTertiary)
                                    }
                                }
                            }
                        }
                    }

                    // Follow-up Section
                    if warning.followUpRequired {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Follow-up Required")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                HStack {
                                    Image(systemName: "bell.badge")
                                        .foregroundColor(AppColors.orange)
                                    if let followUpDate = warning.followUpDate {
                                        Text("Due: \(formatDate(followUpDate))")
                                            .font(AppTypography.body)
                                    } else {
                                        Text("Date not set")
                                            .font(AppTypography.body)
                                            .foregroundColor(AppColors.textSecondary)
                                    }
                                }
                            }
                        }
                    }

                    // Actions
                    if warning.status == .pending {
                        VStack(spacing: AppSpacing.sm) {
                            PrimaryButton("Acknowledge Warning", icon: "checkmark.circle") {
                                // Action
                            }

                            OutlineButton("Dispute Warning", icon: "exclamationmark.bubble") {
                                // Action
                            }
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Warning Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }
}

// MARK: - Info Row
struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
            Spacer()
            Text(value)
                .font(AppTypography.secondaryMedium)
                .foregroundColor(AppColors.textPrimary)
        }
    }
}

// MARK: - New Warning View
struct NewWarningView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedEmployee = ""
    @State private var warningType: WarningType = .verbal
    @State private var severity: WarningSeverity = .minor
    @State private var title = ""
    @State private var description = ""
    @State private var incidentDate = Date()
    @State private var witnesses = ""
    @State private var requiresFollowUp = false
    @State private var followUpDate = Date()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Employee Selection
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Employee *")
                            .font(AppTypography.label)
                        Picker("Select Employee", selection: $selectedEmployee) {
                            Text("Select Employee").tag("")
                            Text("Mike Johnson").tag("5")
                            Text("David Lee").tag("6")
                            Text("James Wilson").tag("7")
                        }
                        .pickerStyle(.menu)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(AppSpacing.sm)
                        .background(AppColors.cardBackground)
                        .cornerRadius(AppSpacing.radiusMedium)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                .stroke(AppColors.gray200, lineWidth: 1)
                        )
                    }

                    // Warning Type & Severity
                    HStack(spacing: AppSpacing.md) {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Type *")
                                .font(AppTypography.label)
                            Picker("Type", selection: $warningType) {
                                ForEach(WarningType.allCases, id: \.self) { type in
                                    Text(type.rawValue).tag(type)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        .frame(maxWidth: .infinity)

                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Severity *")
                                .font(AppTypography.label)
                            Picker("Severity", selection: $severity) {
                                ForEach(WarningSeverity.allCases, id: \.self) { sev in
                                    Text(sev.rawValue).tag(sev)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        .frame(maxWidth: .infinity)
                    }

                    // Title
                    AppTextField(label: "Title", placeholder: "Brief description of the issue", text: $title, isRequired: true)

                    // Incident Date
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Incident Date *")
                            .font(AppTypography.label)
                        DatePicker("", selection: $incidentDate, displayedComponents: .date)
                            .datePickerStyle(.compact)
                            .labelsHidden()
                    }

                    // Description
                    AppTextArea(label: "Description", placeholder: "Detailed description of the incident and circumstances...", text: $description, isRequired: true)

                    // Witnesses
                    AppTextField(label: "Witnesses", placeholder: "Names separated by commas", text: $witnesses)

                    // Follow-up
                    Toggle("Requires Follow-up", isOn: $requiresFollowUp)
                        .font(AppTypography.bodyMedium)
                        .tint(AppColors.primary600)

                    if requiresFollowUp {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Follow-up Date")
                                .font(AppTypography.label)
                            DatePicker("", selection: $followUpDate, in: Date()..., displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                        }
                    }

                    // Submit
                    PrimaryButton("Issue Warning", icon: "exclamationmark.triangle.fill") {
                        dismiss()
                    }
                    .disabled(selectedEmployee.isEmpty || title.isEmpty || description.isEmpty)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("New Warning")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

// MARK: - ViewModel
@MainActor
class WarningsViewModel: ObservableObject {
    @Published var warnings: [EmployeeWarning] = []
    @Published var isLoading = false

    private let warningService = WarningService.shared

    var pendingCount: Int {
        warnings.filter { $0.status == .pending }.count
    }

    var thisMonthCount: Int {
        let calendar = Calendar.current
        let now = Date()
        return warnings.filter { calendar.isDate($0.issuedAt, equalTo: now, toGranularity: .month) }.count
    }

    var followUpCount: Int {
        warnings.filter { $0.followUpRequired && $0.status != .resolved }.count
    }

    func fetchWarnings() async {
        isLoading = true
        defer { isLoading = false }

        await warningService.fetchWarnings()

        if !warningService.warnings.isEmpty {
            warnings = warningService.warnings
        } else {
            // Fallback to mock data if no warnings from API
            warnings = EmployeeWarning.mockWarnings
        }
    }

    func filteredWarnings(search: String, status: WarningStatus?, type: WarningType?) -> [EmployeeWarning] {
        var result = warnings

        if let status = status {
            result = result.filter { $0.status == status }
        }

        if let type = type {
            result = result.filter { $0.type == type }
        }

        if !search.isEmpty {
            result = result.filter {
                $0.employeeName.localizedCaseInsensitiveContains(search) ||
                $0.title.localizedCaseInsensitiveContains(search)
            }
        }

        return result.sorted { $0.issuedAt > $1.issuedAt }
    }
}

#Preview {
    WarningsView()
}
