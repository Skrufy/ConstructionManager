//
//  EditDailyLogView.swift
//  ConstructionManager
//
//  Comprehensive daily log editing view
//

import SwiftUI

struct EditDailyLogView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel: EditDailyLogViewModel

    @State private var showDiscardAlert = false

    init(log: DailyLog) {
        _viewModel = StateObject(wrappedValue: EditDailyLogViewModel(log: log))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: AppSpacing.lg) {
                        // Project Header (read-only)
                        projectHeader

                        // Weather Section
                        if let weather = viewModel.weather {
                            weatherCard(weather)
                        }

                        // Weather Delay Section
                        weatherDelaySection

                        // Notes Section
                        notesSection

                        // Work Entries Section
                        workEntriesSection

                        // Materials Section (if enabled)
                        if appState.shouldShowModule(.materials) {
                            materialsSection
                        }

                        // Issues Section
                        issuesSection

                        // Visitors Section
                        visitorsSection

                        // Photos Section
                        photosSection

                        // Spacer for bottom button
                        Spacer().frame(height: 80)
                    }
                    .padding(AppSpacing.md)
                }

                // Bottom Save Button
                VStack {
                    Spacer()
                    saveButton
                }
            }
            .navigationTitle("Edit Daily Log")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        if viewModel.hasChanges {
                            showDiscardAlert = true
                        } else {
                            dismiss()
                        }
                    }
                    .foregroundColor(AppColors.textSecondary)
                }
            }
            .alert("Discard Changes?", isPresented: $showDiscardAlert) {
                Button("Discard", role: .destructive) {
                    dismiss()
                }
                Button("Keep Editing", role: .cancel) {}
            } message: {
                Text("You have unsaved changes that will be lost.")
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage)
            }
            .overlay {
                if viewModel.isSaving {
                    savingOverlay
                }
            }
            .onChange(of: viewModel.didSaveSuccessfully) { _, success in
                if success {
                    dismiss()
                }
            }
        }
    }

    // MARK: - Project Header
    private var projectHeader: some View {
        AppCard {
            HStack(spacing: AppSpacing.md) {
                IconCircle(
                    icon: "building.2.fill",
                    size: .medium,
                    foregroundColor: AppColors.primary600,
                    backgroundColor: AppColors.primary50
                )

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(viewModel.originalLog.projectName ?? "Unknown Project")
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)

                    Text(formattedDate)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                // Status Badge
                StatusBadge(text: statusText, status: statusBadgeType)
            }
        }
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d, yyyy"
        return formatter.string(from: viewModel.selectedDate)
    }

    private var statusText: String {
        switch viewModel.originalLog.status {
        case .draft: return "Draft"
        case .submitted: return "Submitted"
        case .approved: return "Approved"
        case .rejected: return "Rejected"
        }
    }

    private var statusBadgeType: BadgeStatus {
        switch viewModel.originalLog.status {
        case .draft: return .pending
        case .submitted: return .info
        case .approved: return .active
        case .rejected: return .warning
        }
    }

    // MARK: - Weather Card
    private func weatherCard(_ weather: WeatherData) -> some View {
        AppCard {
            VStack(spacing: AppSpacing.sm) {
                HStack {
                    Text("Weather")
                        .font(AppTypography.labelSmall)
                        .foregroundColor(AppColors.textSecondary)
                    Spacer()
                    if viewModel.isLoadingWeather {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Button(action: {
                            Task {
                                await viewModel.refreshWeather()
                            }
                        }) {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 14))
                                .foregroundColor(AppColors.primary600)
                        }
                    }
                }

                HStack(spacing: AppSpacing.lg) {
                    HStack(spacing: AppSpacing.sm) {
                        Image(systemName: weather.conditionIcon)
                            .font(.system(size: 32))
                            .foregroundColor(AppColors.primary500)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(weather.temperatureFormatted)
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(AppColors.textPrimary)
                            Text(weather.condition)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: AppSpacing.xs) {
                        Label("\(weather.humidity)%", systemImage: "humidity.fill")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                        Label("\(Int(weather.windSpeed)) mph", systemImage: "wind")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }
            }
        }
    }

    // MARK: - Weather Delay Section
    private var weatherDelaySection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Text("Weather Delays")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)

                HStack(spacing: AppSpacing.sm) {
                    // No Delay Button
                    Button(action: { viewModel.weatherDelay = false }) {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: viewModel.weatherDelay ? "circle" : "checkmark.circle.fill")
                                .font(.system(size: 20))
                            Text("No delays")
                                .font(AppTypography.buttonSmall)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .foregroundColor(viewModel.weatherDelay ? AppColors.textSecondary : AppColors.success)
                        .background(viewModel.weatherDelay ? AppColors.gray100 : AppColors.successLight)
                        .cornerRadius(AppSpacing.radiusLarge)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                                .stroke(viewModel.weatherDelay ? AppColors.gray200 : AppColors.success, lineWidth: 1.5)
                        )
                    }

                    // Weather Delay Button
                    Button(action: { viewModel.weatherDelay = true }) {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: viewModel.weatherDelay ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 20))
                            Text("Weather delay")
                                .font(AppTypography.buttonSmall)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .foregroundColor(viewModel.weatherDelay ? AppColors.warning : AppColors.textSecondary)
                        .background(viewModel.weatherDelay ? AppColors.warningLight : AppColors.gray100)
                        .cornerRadius(AppSpacing.radiusLarge)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                                .stroke(viewModel.weatherDelay ? AppColors.warning : AppColors.gray200, lineWidth: 1.5)
                        )
                    }
                }

                if viewModel.weatherDelay {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 14))
                        Text("Please describe the weather delay in the notes below.")
                            .font(AppTypography.secondary)
                    }
                    .foregroundColor(AppColors.warning)
                    .padding(AppSpacing.sm)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppColors.warningLight)
                    .cornerRadius(AppSpacing.radiusMedium)
                }
            }
        }
    }

    // MARK: - Notes Section
    private var notesSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack(spacing: 4) {
                    Text("Notes")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textPrimary)
                    if viewModel.weatherDelay {
                        Text("*")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.error)
                        Text("(Required)")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.error)
                    }
                }

                ZStack(alignment: .topLeading) {
                    if viewModel.notes.isEmpty {
                        Text(viewModel.weatherDelay
                             ? "Describe the weather conditions and impact on work..."
                             : "Any additional notes about today's work...")
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textTertiary)
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.vertical, AppSpacing.sm + 2)
                    }

                    TextEditor(text: $viewModel.notes)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textPrimary)
                        .scrollContentBackground(.hidden)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, AppSpacing.xxs)
                }
                .frame(minHeight: 120)
                .background(AppColors.gray50)
                .cornerRadius(AppSpacing.radiusMedium)
            }
        }
    }

    // MARK: - Work Entries Section
    private var workEntriesSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                HStack {
                    Text("Work Entries")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                    Button(action: { viewModel.addWorkEntry() }) {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 18))
                            Text("Add Entry")
                                .font(AppTypography.buttonSmall)
                        }
                        .foregroundColor(AppColors.primary600)
                    }
                }

                if viewModel.workEntries.isEmpty {
                    emptyStateView(
                        icon: "list.bullet.clipboard",
                        text: "No work entries added"
                    )
                } else {
                    ForEach(Array(viewModel.workEntries.enumerated()), id: \.element.id) { index, entry in
                        WorkEntryFormView(
                            entry: $viewModel.workEntries[index],
                            hideBuildingInfo: appState.hideBuildingInfo,
                            onDelete: { viewModel.removeWorkEntry(at: index) }
                        )
                    }
                }
            }
        }
    }

    // MARK: - Materials Section
    private var materialsSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                HStack {
                    Text("Materials Used")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                    Button(action: { viewModel.addMaterial() }) {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 18))
                            Text("Add Material")
                                .font(AppTypography.buttonSmall)
                        }
                        .foregroundColor(AppColors.primary600)
                    }
                }

                if viewModel.materials.isEmpty {
                    emptyStateView(
                        icon: "shippingbox",
                        text: "No materials recorded"
                    )
                } else {
                    ForEach(Array(viewModel.materials.enumerated()), id: \.element.id) { index, material in
                        MaterialEntryFormView(
                            material: $viewModel.materials[index],
                            onDelete: { viewModel.removeMaterial(at: index) }
                        )
                    }
                }
            }
        }
    }

    // MARK: - Issues Section
    private var issuesSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                HStack {
                    Text("Issues")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                    Button(action: { viewModel.addIssue() }) {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 18))
                            Text("Add Issue")
                                .font(AppTypography.buttonSmall)
                        }
                        .foregroundColor(AppColors.primary600)
                    }
                }

                if viewModel.issues.isEmpty {
                    emptyStateView(
                        icon: "exclamationmark.triangle",
                        text: "No issues reported"
                    )
                } else {
                    ForEach(Array(viewModel.issues.enumerated()), id: \.element.id) { index, issue in
                        IssueEntryFormView(
                            issue: $viewModel.issues[index],
                            onDelete: { viewModel.removeIssue(at: index) }
                        )
                    }
                }
            }
        }
    }

    // MARK: - Visitors Section
    private var visitorsSection: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                HStack {
                    Text("Site Visitors")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                    Button(action: { viewModel.addVisitor() }) {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 18))
                            Text("Add Visitor")
                                .font(AppTypography.buttonSmall)
                        }
                        .foregroundColor(AppColors.primary600)
                    }
                }

                if viewModel.visitors.isEmpty {
                    emptyStateView(
                        icon: "person.badge.clock",
                        text: "No visitors logged"
                    )
                } else {
                    ForEach(Array(viewModel.visitors.enumerated()), id: \.element.id) { index, visitor in
                        VisitorEntryFormView(
                            visitor: $viewModel.visitors[index],
                            onDelete: { viewModel.removeVisitor(at: index) }
                        )
                    }
                }
            }
        }
    }

    // MARK: - Photos Section
    private var photosSection: some View {
        PhotoCaptureView(
            selectedPhotos: $viewModel.newPhotos,
            maxPhotos: 10
        )
    }

    // MARK: - Save Button
    private var saveButton: some View {
        VStack(spacing: 0) {
            Divider()
            HStack {
                PrimaryButton(
                    "Save Changes",
                    icon: "checkmark",
                    isLoading: viewModel.isSaving
                ) {
                    Task { await viewModel.saveChanges() }
                }
            }
            .padding(AppSpacing.md)
            .background(AppColors.cardBackground)
        }
    }

    // MARK: - Saving Overlay
    private var savingOverlay: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: AppSpacing.md) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.white)
                Text(viewModel.savingMessage)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(.white)
            }
            .padding(AppSpacing.xl)
            .background(AppColors.gray800)
            .cornerRadius(AppSpacing.radiusLarge)
        }
    }

    // MARK: - Empty State
    private func emptyStateView(icon: String, text: String) -> some View {
        VStack(spacing: AppSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundColor(AppColors.gray300)
            Text(text)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppSpacing.lg)
        .background(AppColors.gray50)
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

// MARK: - Work Entry Form View
struct WorkEntryFormView: View {
    @Binding var entry: WorkEntryForm
    let hideBuildingInfo: Bool
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            // Header with delete button
            HStack {
                Text("Work Entry")
                    .font(AppTypography.secondaryMedium)
                    .foregroundColor(AppColors.textSecondary)
                Spacer()
                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.error)
                }
            }

            // Activity (required)
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Activity *")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                TextField("e.g., Framing, Electrical, Plumbing", text: $entry.activity)
                    .font(AppTypography.body)
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
            }

            // Status
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Status")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                TextField("e.g., In Progress, Completed", text: $entry.status)
                    .font(AppTypography.body)
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
            }

            // Location fields in a row (hidden if hideBuildingInfo is enabled)
            if !hideBuildingInfo {
                HStack(spacing: AppSpacing.sm) {
                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text("Building")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                        TextField("Building", text: $entry.locationBuilding)
                            .font(AppTypography.body)
                            .padding(AppSpacing.sm)
                            .background(AppColors.gray50)
                            .cornerRadius(AppSpacing.radiusMedium)
                    }

                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text("Floor")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                        TextField("Floor", text: $entry.locationFloor)
                            .font(AppTypography.body)
                            .padding(AppSpacing.sm)
                            .background(AppColors.gray50)
                            .cornerRadius(AppSpacing.radiusMedium)
                    }

                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text("Zone")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                        TextField("Zone", text: $entry.locationZone)
                            .font(AppTypography.body)
                            .padding(AppSpacing.sm)
                            .background(AppColors.gray50)
                            .cornerRadius(AppSpacing.radiusMedium)
                    }
                }
            }

            // Percent Complete
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Percent Complete: \(entry.percentComplete)%")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                Slider(value: Binding(
                    get: { Double(entry.percentComplete) },
                    set: { entry.percentComplete = Int($0) }
                ), in: 0...100, step: 5)
                .tint(AppColors.primary600)
            }

            // Notes
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Notes")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                TextField("Additional notes...", text: $entry.notes)
                    .font(AppTypography.body)
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
            }
        }
        .padding(AppSpacing.md)
        .background(AppColors.gray50)
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

// MARK: - Material Entry Form View
struct MaterialEntryFormView: View {
    @Binding var material: MaterialEntryForm
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            // Header with delete button
            HStack {
                Text("Material")
                    .font(AppTypography.secondaryMedium)
                    .foregroundColor(AppColors.textSecondary)
                Spacer()
                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.error)
                }
            }

            // Material name (required)
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Material Name *")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                TextField("e.g., 2x4 Lumber, Concrete", text: $material.name)
                    .font(AppTypography.body)
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
            }

            // Quantity and Unit in a row
            HStack(spacing: AppSpacing.sm) {
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text("Quantity")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                    TextField("0", value: $material.quantity, format: .number)
                        .font(AppTypography.body)
                        .keyboardType(.decimalPad)
                        .padding(AppSpacing.sm)
                        .background(AppColors.gray50)
                        .cornerRadius(AppSpacing.radiusMedium)
                }
                .frame(maxWidth: .infinity)

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text("Unit")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                    TextField("e.g., each, ft, lbs", text: $material.unit)
                        .font(AppTypography.body)
                        .padding(AppSpacing.sm)
                        .background(AppColors.gray50)
                        .cornerRadius(AppSpacing.radiusMedium)
                }
                .frame(maxWidth: .infinity)
            }

            // Notes
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Notes")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                TextField("Additional notes...", text: $material.notes)
                    .font(AppTypography.body)
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
            }
        }
        .padding(AppSpacing.md)
        .background(AppColors.gray50)
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

// MARK: - Issue Entry Form View
struct IssueEntryFormView: View {
    @Binding var issue: IssueEntryForm
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            // Header with delete button
            HStack {
                Text("Issue")
                    .font(AppTypography.secondaryMedium)
                    .foregroundColor(AppColors.textSecondary)
                Spacer()
                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.error)
                }
            }

            // Issue Type (required)
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Issue Type *")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                TextField("e.g., Safety, Equipment, Weather", text: $issue.issueType)
                    .font(AppTypography.body)
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
            }

            // Delay Hours
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Delay Hours")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                TextField("0", value: $issue.delayHours, format: .number)
                    .font(AppTypography.body)
                    .keyboardType(.decimalPad)
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
            }

            // Description
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Description")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                TextField("Describe the issue...", text: $issue.description)
                    .font(AppTypography.body)
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
            }
        }
        .padding(AppSpacing.md)
        .background(AppColors.gray50)
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

// MARK: - Visitor Entry Form View
struct VisitorEntryFormView: View {
    @Binding var visitor: VisitorEntryForm
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            // Header with delete button
            HStack {
                Text("Visitor")
                    .font(AppTypography.secondaryMedium)
                    .foregroundColor(AppColors.textSecondary)
                Spacer()
                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.error)
                }
            }

            // Visitor Type (required)
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Visitor Type *")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                TextField("e.g., Inspector, Client, Subcontractor", text: $visitor.visitorType)
                    .font(AppTypography.body)
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
            }

            // Time and Result in a row
            HStack(spacing: AppSpacing.sm) {
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text("Time")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                    TextField("e.g., 10:30", text: $visitor.time)
                        .font(AppTypography.body)
                        .padding(AppSpacing.sm)
                        .background(AppColors.gray50)
                        .cornerRadius(AppSpacing.radiusMedium)
                }
                .frame(maxWidth: .infinity)

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text("Result")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                    TextField("e.g., Passed, Failed", text: $visitor.result)
                        .font(AppTypography.body)
                        .padding(AppSpacing.sm)
                        .background(AppColors.gray50)
                        .cornerRadius(AppSpacing.radiusMedium)
                }
                .frame(maxWidth: .infinity)
            }

            // Notes
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Notes")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                TextField("Additional notes...", text: $visitor.notes)
                    .font(AppTypography.body)
                    .padding(AppSpacing.sm)
                    .background(AppColors.gray50)
                    .cornerRadius(AppSpacing.radiusMedium)
            }
        }
        .padding(AppSpacing.md)
        .background(AppColors.gray50)
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

#Preview {
    EditDailyLogView(log: DailyLog.mockLogs[0])
        .environmentObject(AppState())
}
