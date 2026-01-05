//
//  EquipmentView.swift
//  ConstructionManager
//
//  Equipment list and management view
//

import SwiftUI
import Combine

struct EquipmentView: View {
    @StateObject private var viewModel = EquipmentViewModel()
    @EnvironmentObject var appState: AppState
    @State private var searchText = ""
    @State private var selectedStatus: EquipmentStatus?
    @State private var showingNewEquipment = false
    @State private var selectedEquipment: Equipment?

    private var canManageEquipment: Bool {
        appState.hasPermission(.manageEquipment)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                searchBar

                // Filters
                filterSection

                // Stats Summary
                statsSummary

                // Equipment List
                ScrollView {
                    if viewModel.isLoading && viewModel.equipment.isEmpty {
                        ProgressView()
                            .padding(.top, AppSpacing.xl)
                    } else if viewModel.filteredEquipment(search: searchText, status: selectedStatus).isEmpty {
                        emptyState
                    } else {
                        LazyVStack(spacing: AppSpacing.sm) {
                            ForEach(viewModel.filteredEquipment(search: searchText, status: selectedStatus)) { equipment in
                                EquipmentCard(equipment: equipment)
                                    .onTapGesture {
                                        selectedEquipment = equipment
                                    }
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
            }
            .background(AppColors.background)
            .navigationTitle("Equipment")
            .toolbar {
                if canManageEquipment {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button(action: { showingNewEquipment = true }) {
                            Image(systemName: "plus")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(AppColors.primary600)
                        }
                    }
                }
            }
            .sheet(isPresented: $showingNewEquipment) {
                NewEquipmentView(viewModel: viewModel)
            }
            .sheet(item: $selectedEquipment) { equipment in
                EquipmentDetailView(equipment: equipment, viewModel: viewModel)
            }
            .task {
                await viewModel.fetchEquipment()
            }
            .refreshable {
                await viewModel.fetchEquipment()
            }
        }
    }

    private var searchBar: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.gray400)
            TextField("Search equipment...", text: $searchText)
                .font(AppTypography.body)
            if !searchText.isEmpty {
                Button(action: { searchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(AppColors.gray400)
                }
            }
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

    private var filterSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                FilterChip(title: "All", isSelected: selectedStatus == nil) {
                    selectedStatus = nil
                }
                ForEach(EquipmentStatus.allCases, id: \.self) { status in
                    FilterChip(
                        title: status.displayName,
                        isSelected: selectedStatus == status
                    ) {
                        selectedStatus = status
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.xs)
        }
    }

    private var statsSummary: some View {
        HStack(spacing: AppSpacing.sm) {
            EquipmentStatBadge(
                count: viewModel.availableCount,
                label: "Available",
                color: AppColors.success
            )
            EquipmentStatBadge(
                count: viewModel.inUseCount,
                label: "In Use",
                color: AppColors.info
            )
            EquipmentStatBadge(
                count: viewModel.maintenanceCount,
                label: "Maintenance",
                color: AppColors.warning
            )
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.xs)
    }

    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "wrench.and.screwdriver.fill")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray400)
            Text("No Equipment")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("Add equipment to track your assets and their usage")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
            PrimaryButton("Add Equipment", icon: "plus") {
                showingNewEquipment = true
            }
            .padding(.top, AppSpacing.sm)
        }
        .padding(AppSpacing.xl)
    }
}

// MARK: - Equipment Stat Badge
struct EquipmentStatBadge: View {
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

// MARK: - Equipment Card
struct EquipmentCard: View {
    let equipment: Equipment

    private var equipmentType: EquipmentType? {
        EquipmentType.allCases.first { $0.rawValue.lowercased() == equipment.type.lowercased() }
    }

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    // Icon
                    ZStack {
                        Circle()
                            .fill((equipmentType?.color ?? AppColors.primary600).opacity(0.15))
                            .frame(width: 44, height: 44)
                        Image(systemName: equipmentType?.icon ?? "wrench.and.screwdriver.fill")
                            .font(.system(size: 20))
                            .foregroundColor(equipmentType?.color ?? AppColors.primary600)
                    }

                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(equipment.name)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        Text(equipment.type)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    Spacer()
                    StatusBadge(
                        text: equipment.status.displayName,
                        status: equipment.status.badgeStatus
                    )
                }

                Divider()

                // Stats Row
                HStack(spacing: AppSpacing.lg) {
                    // Samsara ID if available
                    if equipment.samsaraId != nil {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "antenna.radiowaves.left.and.right")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.success)
                            Text("Tracked")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        }
                    }

                    // Assignment count
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "folder.fill")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text("\(equipment.assignmentCount) projects")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }

                    // Log count
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text("\(equipment.logCount) logs")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }

                    Spacer()

                    // Location indicator
                    if equipment.hasLocation {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "location.fill")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.info)
                            if let lastUpdate = equipment.lastLocationUpdate {
                                Text(lastUpdate)
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textTertiary)
                            }
                        }
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
    }
}

// MARK: - Equipment Detail View
struct EquipmentDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let equipment: Equipment
    @ObservedObject var viewModel: EquipmentViewModel
    @State private var showingStatusChange = false
    @State private var showingLogUsage = false
    @State private var showingLogService = false
    @State private var showingAssignToProject = false
    @State private var isUpdating = false
    @State private var serviceLogs: [ServiceLog] = []
    @State private var isLoadingServiceLogs = false

    private var equipmentType: EquipmentType? {
        EquipmentType.allCases.first { $0.rawValue.lowercased() == equipment.type.lowercased() }
    }

    private var nextServiceDue: ServiceLog? {
        serviceLogs
            .filter { $0.nextServiceDue != nil || $0.nextServiceHours != nil }
            .sorted { ($0.nextServiceDue ?? .distantFuture) < ($1.nextServiceDue ?? .distantFuture) }
            .first
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // Header Card
                    AppCard {
                        VStack(alignment: .leading, spacing: AppSpacing.md) {
                            HStack {
                                // Icon
                                ZStack {
                                    Circle()
                                        .fill((equipmentType?.color ?? AppColors.primary600).opacity(0.15))
                                        .frame(width: 56, height: 56)
                                    Image(systemName: equipmentType?.icon ?? "wrench.and.screwdriver.fill")
                                        .font(.system(size: 24))
                                        .foregroundColor(equipmentType?.color ?? AppColors.primary600)
                                }

                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text(equipment.name)
                                        .font(AppTypography.heading3)
                                        .foregroundColor(AppColors.textPrimary)
                                    Text(equipment.type)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                }
                                Spacer()
                            }

                            // Status
                            HStack {
                                Text("Status")
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                                Spacer()
                                Button(action: { showingStatusChange = true }) {
                                    HStack(spacing: AppSpacing.xxs) {
                                        StatusBadge(
                                            text: equipment.status.displayName,
                                            status: equipment.status.badgeStatus
                                        )
                                        Image(systemName: "chevron.down")
                                            .font(.system(size: 10))
                                            .foregroundColor(AppColors.gray400)
                                    }
                                }
                            }
                        }
                    }

                    // Next Service Due Alert
                    if let nextService = nextServiceDue {
                        nextServiceDueCard(nextService)
                    }

                    // Tracking Info
                    if equipment.samsaraId != nil || equipment.hasLocation {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Tracking")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                VStack(spacing: AppSpacing.sm) {
                                    if let samsaraId = equipment.samsaraId {
                                        HStack {
                                            HStack(spacing: AppSpacing.xs) {
                                                Image(systemName: "antenna.radiowaves.left.and.right")
                                                    .foregroundColor(AppColors.success)
                                                Text("Samsara ID")
                                                    .font(AppTypography.secondary)
                                                    .foregroundColor(AppColors.textSecondary)
                                            }
                                            Spacer()
                                            Text(samsaraId)
                                                .font(AppTypography.secondaryMedium)
                                                .foregroundColor(AppColors.textPrimary)
                                        }
                                    }

                                    if equipment.hasLocation {
                                        HStack {
                                            HStack(spacing: AppSpacing.xs) {
                                                Image(systemName: "location.fill")
                                                    .foregroundColor(AppColors.info)
                                                Text("GPS Location")
                                                    .font(AppTypography.secondary)
                                                    .foregroundColor(AppColors.textSecondary)
                                            }
                                            Spacer()
                                            VStack(alignment: .trailing, spacing: 2) {
                                                Text("Available")
                                                    .font(AppTypography.secondaryMedium)
                                                    .foregroundColor(AppColors.textPrimary)
                                                if let lastUpdate = equipment.lastLocationUpdate {
                                                    Text("Updated \(lastUpdate)")
                                                        .font(AppTypography.caption)
                                                        .foregroundColor(AppColors.textTertiary)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Statistics
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Statistics")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        HStack(spacing: AppSpacing.sm) {
                            StatCard(
                                value: String(equipment.assignmentCount),
                                label: "Projects",
                                icon: "folder.fill",
                                color: AppColors.primary600
                            )
                            StatCard(
                                value: String(serviceLogs.count),
                                label: "Service Logs",
                                icon: "wrench.fill",
                                color: AppColors.orange
                            )
                        }
                    }

                    // Actions
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Actions")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        VStack(spacing: AppSpacing.sm) {
                            Button(action: { showingLogService = true }) {
                                HStack {
                                    Image(systemName: "wrench.and.screwdriver.fill")
                                        .foregroundColor(AppColors.orange)
                                    Text("Log Service")
                                        .font(AppTypography.bodyMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12))
                                        .foregroundColor(AppColors.gray400)
                                }
                                .padding(AppSpacing.md)
                                .background(AppColors.cardBackground)
                                .cornerRadius(AppSpacing.radiusMedium)
                            }

                            Button(action: { showingLogUsage = true }) {
                                HStack {
                                    Image(systemName: "clock.fill")
                                        .foregroundColor(AppColors.primary600)
                                    Text("Log Usage")
                                        .font(AppTypography.bodyMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12))
                                        .foregroundColor(AppColors.gray400)
                                }
                                .padding(AppSpacing.md)
                                .background(AppColors.cardBackground)
                                .cornerRadius(AppSpacing.radiusMedium)
                            }

                            Button(action: { showingAssignToProject = true }) {
                                HStack {
                                    Image(systemName: "folder.badge.plus")
                                        .foregroundColor(AppColors.success)
                                    Text("Assign to Project")
                                        .font(AppTypography.bodyMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12))
                                        .foregroundColor(AppColors.gray400)
                                }
                                .padding(AppSpacing.md)
                                .background(AppColors.cardBackground)
                                .cornerRadius(AppSpacing.radiusMedium)
                            }
                        }
                    }

                    // Service History
                    serviceHistorySection

                    // Timestamps
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Details")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            VStack(spacing: AppSpacing.sm) {
                                HStack {
                                    Text("Created")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(formatDate(equipment.createdAt))
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                                HStack {
                                    Text("Last Updated")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(formatDate(equipment.updatedAt))
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                            }
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Equipment Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .confirmationDialog("Change Status", isPresented: $showingStatusChange, titleVisibility: .visible) {
                ForEach(EquipmentStatus.allCases, id: \.self) { status in
                    Button(status.displayName) {
                        Task {
                            await changeStatus(to: status)
                        }
                    }
                }
                Button("Cancel", role: .cancel) {}
            }
            .sheet(isPresented: $showingLogUsage) {
                LogEquipmentUsageView(equipment: equipment, viewModel: viewModel)
            }
            .sheet(isPresented: $showingLogService) {
                LogServiceView(equipment: equipment, viewModel: viewModel, onSave: { newLog in
                    serviceLogs.insert(newLog, at: 0)
                })
            }
            .sheet(isPresented: $showingAssignToProject) {
                AssignEquipmentToProjectView(equipment: equipment, viewModel: viewModel)
            }
            .task {
                await loadServiceLogs()
            }
        }
    }

    // MARK: - Next Service Due Card
    @ViewBuilder
    private func nextServiceDueCard(_ serviceLog: ServiceLog) -> some View {
        let isOverdue = (serviceLog.nextServiceDue ?? .distantFuture) < Date()

        AppCard {
            HStack(spacing: AppSpacing.md) {
                ZStack {
                    Circle()
                        .fill(isOverdue ? AppColors.error.opacity(0.15) : AppColors.warning.opacity(0.15))
                        .frame(width: 44, height: 44)
                    Image(systemName: isOverdue ? "exclamationmark.triangle.fill" : "calendar.badge.clock")
                        .font(.system(size: 20))
                        .foregroundColor(isOverdue ? AppColors.error : AppColors.warning)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(isOverdue ? "Service Overdue" : "Service Due Soon")
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(isOverdue ? AppColors.error : AppColors.warning)

                    Text("\(serviceLog.serviceType.displayName)")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)

                    if let dueDate = serviceLog.nextServiceDue {
                        Text(formatDate(dueDate))
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                    if let dueHours = serviceLog.nextServiceHours {
                        Text("at \(Int(dueHours)) hours")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                }

                Spacer()

                Button(action: { showingLogService = true }) {
                    Text("Log")
                        .font(AppTypography.secondaryMedium)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.vertical, AppSpacing.xs)
                        .background(isOverdue ? AppColors.error : AppColors.warning)
                        .cornerRadius(AppSpacing.radiusSmall)
                }
            }
        }
    }

    // MARK: - Service History Section
    private var serviceHistorySection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            HStack {
                Text("Service History")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textSecondary)
                Spacer()
                if !serviceLogs.isEmpty {
                    Text("\(serviceLogs.count) records")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                }
            }

            if isLoadingServiceLogs {
                AppCard {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .padding(AppSpacing.lg)
                }
            } else if serviceLogs.isEmpty {
                AppCard {
                    VStack(spacing: AppSpacing.sm) {
                        Image(systemName: "wrench.and.screwdriver")
                            .font(.system(size: 32))
                            .foregroundColor(AppColors.gray400)
                        Text("No Service Records")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textSecondary)
                        Text("Log your first service to track maintenance history")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                            .multilineTextAlignment(.center)
                        Button(action: { showingLogService = true }) {
                            HStack(spacing: AppSpacing.xs) {
                                Image(systemName: "plus.circle.fill")
                                Text("Log Service")
                            }
                            .font(AppTypography.secondaryMedium)
                            .foregroundColor(AppColors.primary600)
                        }
                        .padding(.top, AppSpacing.xs)
                    }
                    .padding(AppSpacing.md)
                }
            } else {
                VStack(spacing: AppSpacing.sm) {
                    ForEach(serviceLogs.prefix(5)) { log in
                        ServiceLogCard(serviceLog: log)
                    }

                    if serviceLogs.count > 5 {
                        Button(action: { /* View all service logs */ }) {
                            Text("View All (\(serviceLogs.count) records)")
                                .font(AppTypography.secondaryMedium)
                                .foregroundColor(AppColors.primary600)
                        }
                        .padding(.top, AppSpacing.xs)
                    }
                }
            }
        }
    }

    private func loadServiceLogs() async {
        isLoadingServiceLogs = true
        defer { isLoadingServiceLogs = false }

        do {
            serviceLogs = try await viewModel.fetchServiceLogs(equipmentId: equipment.id)
        } catch {
            print("Failed to load service logs: \(error)")
        }
    }

    private func changeStatus(to status: EquipmentStatus) async {
        isUpdating = true
        defer { isUpdating = false }

        do {
            _ = try await viewModel.updateStatus(equipmentId: equipment.id, status: status)
        } catch {
            print("Failed to update status: \(error)")
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }
}

// MARK: - Service Log Card
struct ServiceLogCard: View {
    let serviceLog: ServiceLog

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    // Service Type Icon
                    ZStack {
                        Circle()
                            .fill(serviceLog.serviceType.color.opacity(0.15))
                            .frame(width: 40, height: 40)
                        Image(systemName: serviceLog.serviceType.icon)
                            .font(.system(size: 18))
                            .foregroundColor(serviceLog.serviceType.color)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(serviceLog.serviceType.displayName)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        Text(formatDate(serviceLog.date))
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                    }

                    Spacer()

                    if let cost = serviceLog.cost {
                        Text("$\(cost, specifier: "%.2f")")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                    }
                }

                // Details row
                HStack(spacing: AppSpacing.md) {
                    if let meterReading = serviceLog.meterReading {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "gauge")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.textTertiary)
                            Text("\(Int(meterReading)) hrs")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        }
                    }

                    if let technician = serviceLog.technician {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "person.fill")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.textTertiary)
                            Text(technician)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                                .lineLimit(1)
                        }
                    }

                    Spacer()
                }

                // Notes if available
                if let notes = serviceLog.notes, !notes.isEmpty {
                    Text(notes)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                        .lineLimit(2)
                }

                // Parts used if available
                if let parts = serviceLog.partsUsed, !parts.isEmpty {
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "shippingbox.fill")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.info)
                        Text(parts)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.info)
                            .lineLimit(1)
                    }
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

// MARK: - Log Service View
struct LogServiceView: View {
    @Environment(\.dismiss) private var dismiss
    let equipment: Equipment
    @ObservedObject var viewModel: EquipmentViewModel
    var onSave: (ServiceLog) -> Void

    @State private var selectedServiceType: ServiceType = .oilChange
    @State private var date = Date()
    @State private var meterReading = ""
    @State private var cost = ""
    @State private var partsUsed = ""
    @State private var technician = ""
    @State private var notes = ""
    @State private var setNextService = false
    @State private var nextServiceDate = Calendar.current.date(byAdding: .month, value: 3, to: Date()) ?? Date()
    @State private var nextServiceHours = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Equipment Info
                    AppCard {
                        HStack {
                            Text(equipment.name)
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                            Spacer()
                            Text(equipment.type)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    // Service Type
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("Service Type")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: AppSpacing.sm) {
                            ForEach(ServiceType.allCases, id: \.self) { type in
                                Button(action: { selectedServiceType = type }) {
                                    VStack(spacing: AppSpacing.xxs) {
                                        Image(systemName: type.icon)
                                            .font(.system(size: 20))
                                        Text(type.displayName)
                                            .font(AppTypography.caption)
                                            .lineLimit(1)
                                            .minimumScaleFactor(0.8)
                                    }
                                    .padding(.vertical, AppSpacing.sm)
                                    .frame(maxWidth: .infinity)
                                    .foregroundColor(selectedServiceType == type ? .white : type.color)
                                    .background(selectedServiceType == type ? type.color : type.color.opacity(0.1))
                                    .cornerRadius(AppSpacing.radiusMedium)
                                }
                            }
                        }
                    }

                    // Service Details
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("Service Details")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Date")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            DatePicker("", selection: $date, displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                        }

                        HStack(spacing: AppSpacing.md) {
                            AppTextField(label: "Meter Reading (hrs)", placeholder: "0", text: $meterReading)
                                .keyboardType(.decimalPad)
                            AppTextField(label: "Cost ($)", placeholder: "0.00", text: $cost)
                                .keyboardType(.decimalPad)
                        }

                        AppTextField(label: "Technician", placeholder: "Who performed the service?", text: $technician)

                        AppTextField(label: "Parts Used", placeholder: "List parts used (optional)", text: $partsUsed)

                        AppTextArea(label: "Notes", placeholder: "Any additional notes...", text: $notes)
                    }

                    // Next Service Schedule
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Toggle(isOn: $setNextService) {
                            HStack {
                                Image(systemName: "calendar.badge.clock")
                                    .foregroundColor(AppColors.warning)
                                Text("Schedule Next Service")
                                    .font(AppTypography.bodySemibold)
                                    .foregroundColor(AppColors.textPrimary)
                            }
                        }
                        .tint(AppColors.primary600)

                        if setNextService {
                            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                Text("Next Service Due")
                                    .font(AppTypography.label)
                                    .foregroundColor(AppColors.textSecondary)
                                DatePicker("", selection: $nextServiceDate, displayedComponents: .date)
                                    .datePickerStyle(.compact)
                                    .labelsHidden()
                            }

                            AppTextField(label: "Or at Hours", placeholder: "e.g., 1500", text: $nextServiceHours)
                                .keyboardType(.numberPad)
                        }
                    }
                    .padding(AppSpacing.md)
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppSpacing.radiusMedium)

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
                    PrimaryButton("Log Service", icon: "checkmark.circle.fill", isLoading: isSaving) {
                        Task {
                            await saveServiceLog()
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Log Service")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func saveServiceLog() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            let newLog = try await viewModel.createServiceLog(
                equipmentId: equipment.id,
                serviceType: selectedServiceType,
                date: date,
                meterReading: Double(meterReading),
                cost: Double(cost),
                partsUsed: partsUsed.isEmpty ? nil : partsUsed,
                technician: technician.isEmpty ? nil : technician,
                notes: notes.isEmpty ? nil : notes,
                nextServiceDue: setNextService ? nextServiceDate : nil,
                nextServiceHours: setNextService ? Double(nextServiceHours) : nil
            )
            onSave(newLog)
            dismiss()
        } catch {
            errorMessage = "Failed to log service: \(error.localizedDescription)"
        }
    }
}

// MARK: - New Equipment View
struct NewEquipmentView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: EquipmentViewModel
    @State private var name = ""
    @State private var selectedType: EquipmentType = .other
    @State private var samsaraId = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Basic Info
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("Equipment Information")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(label: "Name", placeholder: "Enter equipment name", text: $name, isRequired: true)

                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Type *")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)

                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: AppSpacing.xs) {
                                ForEach(EquipmentType.allCases, id: \.self) { type in
                                    Button(action: { selectedType = type }) {
                                        VStack(spacing: AppSpacing.xxs) {
                                            Image(systemName: type.icon)
                                                .font(.system(size: 16))
                                            Text(type.rawValue)
                                                .font(AppTypography.caption)
                                                .lineLimit(1)
                                        }
                                        .padding(.horizontal, AppSpacing.sm)
                                        .padding(.vertical, AppSpacing.sm)
                                        .frame(maxWidth: .infinity)
                                        .foregroundColor(selectedType == type ? .white : type.color)
                                        .background(selectedType == type ? type.color : type.color.opacity(0.1))
                                        .cornerRadius(AppSpacing.radiusMedium)
                                    }
                                }
                            }
                        }
                    }

                    // Tracking (Optional)
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("Tracking (Optional)")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(label: "Samsara ID", placeholder: "e.g., SAM-001", text: $samsaraId)

                        Text("Connect to Samsara for GPS tracking and telematics")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
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
                    PrimaryButton("Add Equipment", icon: "plus.circle.fill", isLoading: isSaving) {
                        Task {
                            await saveEquipment()
                        }
                    }
                    .disabled(name.isEmpty)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("New Equipment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func saveEquipment() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            _ = try await viewModel.createEquipment(
                name: name,
                type: selectedType.rawValue,
                samsaraId: samsaraId.isEmpty ? nil : samsaraId
            )
            dismiss()
        } catch {
            errorMessage = "Failed to create equipment: \(error.localizedDescription)"
        }
    }
}

// MARK: - Log Equipment Usage View
struct LogEquipmentUsageView: View {
    @Environment(\.dismiss) private var dismiss
    let equipment: Equipment
    @ObservedObject var viewModel: EquipmentViewModel
    @State private var date = Date()
    @State private var hoursUsed = ""
    @State private var fuelUsed = ""
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Equipment Info
                    AppCard {
                        HStack {
                            Text(equipment.name)
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                            Spacer()
                            Text(equipment.type)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    // Usage Details
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("Usage Details")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Date")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            DatePicker("", selection: $date, displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                        }

                        HStack(spacing: AppSpacing.md) {
                            AppTextField(label: "Hours Used", placeholder: "0.0", text: $hoursUsed)
                            AppTextField(label: "Fuel (gallons)", placeholder: "0.0", text: $fuelUsed)
                        }

                        AppTextArea(label: "Notes", placeholder: "Any notes about the usage...", text: $notes)
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
                    PrimaryButton("Log Usage", icon: "checkmark.circle.fill", isLoading: isSaving) {
                        Task {
                            await logUsage()
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Log Usage")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func logUsage() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            _ = try await viewModel.logUsage(
                equipmentId: equipment.id,
                date: date,
                hoursUsed: Double(hoursUsed),
                fuelUsed: Double(fuelUsed),
                notes: notes.isEmpty ? nil : notes
            )
            dismiss()
        } catch {
            errorMessage = "Failed to log usage: \(error.localizedDescription)"
        }
    }
}

// MARK: - Assign Equipment to Project View
struct AssignEquipmentToProjectView: View {
    @Environment(\.dismiss) private var dismiss
    let equipment: Equipment
    @ObservedObject var viewModel: EquipmentViewModel
    @ObservedObject private var projectService = ProjectService.shared
    @State private var selectedProject: Project?
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Equipment Info
                    AppCard {
                        HStack {
                            Text(equipment.name)
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                            Spacer()
                            Text(equipment.type)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    // Project Selection
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("Select Project")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        if projectService.projects.isEmpty {
                            AppCard {
                                VStack(spacing: AppSpacing.sm) {
                                    Image(systemName: "folder.badge.questionmark")
                                        .font(.system(size: 32))
                                        .foregroundColor(AppColors.gray400)
                                    Text("No Projects Available")
                                        .font(AppTypography.bodySemibold)
                                        .foregroundColor(AppColors.textSecondary)
                                    Text("Create a project first to assign equipment")
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textTertiary)
                                }
                                .padding(AppSpacing.md)
                            }
                        } else {
                            VStack(spacing: AppSpacing.sm) {
                                ForEach(projectService.projects) { project in
                                    Button(action: { selectedProject = project }) {
                                        HStack(spacing: AppSpacing.md) {
                                            ZStack {
                                                Circle()
                                                    .fill(AppColors.primary600.opacity(0.15))
                                                    .frame(width: 44, height: 44)
                                                Image(systemName: "building.2.fill")
                                                    .font(.system(size: 20))
                                                    .foregroundColor(AppColors.primary600)
                                            }

                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(project.name)
                                                    .font(AppTypography.bodySemibold)
                                                    .foregroundColor(AppColors.textPrimary)
                                                if !project.address.isEmpty {
                                                    Text(project.address)
                                                        .font(AppTypography.caption)
                                                        .foregroundColor(AppColors.textSecondary)
                                                        .lineLimit(1)
                                                }
                                            }

                                            Spacer()

                                            if selectedProject?.id == project.id {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .font(.system(size: 24))
                                                    .foregroundColor(AppColors.success)
                                            } else {
                                                Circle()
                                                    .stroke(AppColors.gray300, lineWidth: 2)
                                                    .frame(width: 24, height: 24)
                                            }
                                        }
                                        .padding(AppSpacing.md)
                                        .background(
                                            selectedProject?.id == project.id
                                                ? AppColors.success.opacity(0.1)
                                                : AppColors.cardBackground
                                        )
                                        .cornerRadius(AppSpacing.radiusMedium)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                                .stroke(
                                                    selectedProject?.id == project.id
                                                        ? AppColors.success
                                                        : Color.clear,
                                                    lineWidth: 2
                                                )
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Notes (Optional)
                    if selectedProject != nil {
                        VStack(alignment: .leading, spacing: AppSpacing.md) {
                            AppTextArea(
                                label: "Notes (Optional)",
                                placeholder: "Any notes about this assignment...",
                                text: $notes
                            )
                        }
                    }

                    // Success Message
                    if let success = successMessage {
                        HStack(spacing: AppSpacing.sm) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(AppColors.success)
                            Text(success)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.success)
                        }
                        .padding(AppSpacing.sm)
                        .frame(maxWidth: .infinity)
                        .background(AppColors.success.opacity(0.1))
                        .cornerRadius(AppSpacing.radiusSmall)
                    }

                    // Error Message
                    if let error = errorMessage {
                        Text(error)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.error)
                            .padding(AppSpacing.sm)
                            .frame(maxWidth: .infinity)
                            .background(AppColors.error.opacity(0.1))
                            .cornerRadius(AppSpacing.radiusSmall)
                    }

                    // Submit Button
                    PrimaryButton(
                        "Assign to Project",
                        icon: "folder.badge.plus",
                        isLoading: isSaving
                    ) {
                        Task {
                            await assignToProject()
                        }
                    }
                    .disabled(selectedProject == nil)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Assign to Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task {
                await projectService.fetchProjects()
            }
        }
    }

    private func assignToProject() async {
        guard let project = selectedProject else { return }

        isSaving = true
        errorMessage = nil
        successMessage = nil
        defer { isSaving = false }

        do {
            try await viewModel.assignToProject(
                equipmentId: equipment.id,
                projectId: project.id,
                notes: notes.isEmpty ? nil : notes
            )
            successMessage = "Equipment assigned to \(project.name)"

            // Refresh equipment data
            await viewModel.fetchEquipment()

            // Dismiss after a brief delay to show success
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            dismiss()
        } catch {
            errorMessage = "Failed to assign equipment: \(error.localizedDescription)"
        }
    }
}

// MARK: - ViewModel
@MainActor
class EquipmentViewModel: ObservableObject {
    @Published var equipment: [Equipment] = []
    @Published var isLoading = false

    private let equipmentService = EquipmentService.shared

    var availableCount: Int {
        equipment.filter { $0.status == .available }.count
    }

    var inUseCount: Int {
        equipment.filter { $0.status == .inUse }.count
    }

    var maintenanceCount: Int {
        equipment.filter { $0.status == .maintenance || $0.status == .outOfService }.count
    }

    func fetchEquipment() async {
        isLoading = true
        defer { isLoading = false }

        await equipmentService.fetchEquipment()
        equipment = equipmentService.equipment
    }

    func filteredEquipment(search: String, status: EquipmentStatus?) -> [Equipment] {
        var result = equipment

        if let status = status {
            result = result.filter { $0.status == status }
        }

        if !search.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(search) ||
                $0.type.localizedCaseInsensitiveContains(search) ||
                ($0.samsaraId?.localizedCaseInsensitiveContains(search) ?? false)
            }
        }

        return result.sorted { $0.name < $1.name }
    }

    func createEquipment(name: String, type: String, samsaraId: String?) async throws -> Equipment {
        let newEquipment = try await equipmentService.createEquipment(
            name: name,
            type: type,
            samsaraId: samsaraId
        )
        equipment.insert(newEquipment, at: 0)
        return newEquipment
    }

    func updateStatus(equipmentId: String, status: EquipmentStatus) async throws -> Equipment {
        let updated = try await equipmentService.updateStatus(id: equipmentId, status: status)
        if let index = equipment.firstIndex(where: { $0.id == equipmentId }) {
            equipment[index] = updated
        }
        return updated
    }

    func logUsage(equipmentId: String, date: Date, hoursUsed: Double?, fuelUsed: Double?, notes: String?) async throws -> EquipmentLog {
        return try await equipmentService.logUsage(
            equipmentId: equipmentId,
            date: date,
            hoursUsed: hoursUsed,
            fuelUsed: fuelUsed,
            notes: notes
        )
    }

    // MARK: - Service Logs

    func fetchServiceLogs(equipmentId: String) async throws -> [ServiceLog] {
        return try await equipmentService.fetchServiceLogs(equipmentId: equipmentId)
    }

    func createServiceLog(
        equipmentId: String,
        serviceType: ServiceType,
        date: Date,
        meterReading: Double? = nil,
        cost: Double? = nil,
        partsUsed: String? = nil,
        technician: String? = nil,
        notes: String? = nil,
        nextServiceDue: Date? = nil,
        nextServiceHours: Double? = nil
    ) async throws -> ServiceLog {
        return try await equipmentService.createServiceLog(
            equipmentId: equipmentId,
            serviceType: serviceType,
            date: date,
            meterReading: meterReading,
            cost: cost,
            partsUsed: partsUsed,
            technician: technician,
            notes: notes,
            nextServiceDue: nextServiceDue,
            nextServiceHours: nextServiceHours
        )
    }

    // MARK: - Project Assignment

    func assignToProject(equipmentId: String, projectId: String, notes: String?) async throws {
        _ = try await equipmentService.assignToProject(
            equipmentId: equipmentId,
            projectId: projectId,
            notes: notes
        )

        // Refresh equipment list to get updated data from service
        await fetchEquipment()
    }
}

#Preview {
    EquipmentView()
}
