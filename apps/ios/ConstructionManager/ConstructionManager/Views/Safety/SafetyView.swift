//
//  SafetyView.swift
//  ConstructionManager
//
//  Safety module view with incidents and inspections
//

import SwiftUI
import Combine
import CoreLocation

// MARK: - Safety Tab Model
struct SafetyTab: Identifiable, Codable {
    let id: Int
    let title: String

    static let incidents = SafetyTab(id: 0, title: "safety.incidents")
    static let inspections = SafetyTab(id: 1, title: "safety.inspections")
    static let punchLists = SafetyTab(id: 2, title: "safety.punchLists")
    static let meetings = SafetyTab(id: 3, title: "safety.meetings")

    static let defaultOrder = [incidents, inspections, punchLists, meetings]
}

struct SafetyView: View {
    @StateObject private var viewModel = SafetyViewModel()
    @EnvironmentObject var appState: AppState
    @State private var selectedTabId = 0
    @State private var tabs: [SafetyTab] = []
    @State private var draggedTab: SafetyTab?
    @State private var showingNewIncident = false
    @State private var showingNewPunchList = false
    @State private var showingNewMeeting = false
    @State private var showingNewInspection = false
    @State private var selectedIncident: IncidentReport?
    @State private var selectedInspection: Inspection?
    @State private var selectedPunchList: PunchListItem?
    @State private var selectedMeeting: SafetyMeeting?

    private var canCreateIncidents: Bool {
        appState.hasPermission(.createIncidents)
    }

    private var canManageSafety: Bool {
        appState.hasPermission(.manageSafety)
    }

    private var selectedTab: SafetyTab? {
        tabs.first { $0.id == selectedTabId }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Selector with Drag-to-Reorder
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: AppSpacing.xs) {
                        ForEach(tabs) { tab in
                            SafetyTabButton(
                                title: tab.title.localized,
                                isSelected: selectedTabId == tab.id
                            ) {
                                selectedTabId = tab.id
                            }
                            .onDrag {
                                self.draggedTab = tab
                                return NSItemProvider(object: String(tab.id) as NSString)
                            }
                            .onDrop(of: [.text], delegate: SafetyTabDropDelegate(
                                item: tab,
                                items: $tabs,
                                draggedItem: $draggedTab,
                                onReorder: saveTabOrder
                            ))
                        }
                    }
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.vertical, AppSpacing.sm)
                }

                // Content
                switch selectedTabId {
                case 0:
                    IncidentsListView(viewModel: viewModel, selectedIncident: $selectedIncident)
                case 1:
                    InspectionsListView(viewModel: viewModel, selectedInspection: $selectedInspection)
                case 2:
                    PunchListsView(selectedPunchList: $selectedPunchList)
                case 3:
                    SafetyMeetingsListView(selectedMeeting: $selectedMeeting)
                default:
                    IncidentsListView(viewModel: viewModel, selectedIncident: $selectedIncident)
                }
            }
            .background(AppColors.background)
            .navigationTitle("nav.safety".localized)
            .toolbar {
                if canCreateIncidents || canManageSafety {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Menu {
                            if canCreateIncidents {
                                Button(action: { showingNewIncident = true }) {
                                    Label("safety.reportIncident".localized, systemImage: "exclamationmark.triangle")
                                }
                            }
                            if canManageSafety {
                                Button(action: { showingNewInspection = true }) {
                                    Label("safety.newInspection".localized, systemImage: "clipboard.fill")
                                }
                                Button(action: { showingNewPunchList = true }) {
                                    Label("safety.newPunchList".localized, systemImage: "list.bullet.clipboard")
                                }
                                Button(action: { showingNewMeeting = true }) {
                                    Label("safety.newMeeting".localized, systemImage: "person.3")
                                }
                            }
                        } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(AppColors.primary600)
                        }
                    }
                }
            }
            .sheet(isPresented: $showingNewIncident) {
                NewIncidentView(viewModel: viewModel)
            }
            .sheet(isPresented: $showingNewPunchList) {
                NewPunchListView()
            }
            .sheet(isPresented: $showingNewMeeting) {
                NewSafetyMeetingView()
            }
            .sheet(isPresented: $showingNewInspection) {
                NewInspectionView(viewModel: viewModel)
            }
            .sheet(item: $selectedIncident) { incident in
                IncidentDetailView(incident: incident, viewModel: viewModel)
            }
            .sheet(item: $selectedInspection) { inspection in
                InspectionDetailView(inspection: inspection)
            }
            .sheet(item: $selectedPunchList) { punchList in
                PunchListDetailView(punchList: punchList)
            }
            .sheet(item: $selectedMeeting) { meeting in
                SafetyMeetingDetailView(meeting: meeting)
            }
            .task {
                await viewModel.fetchIncidents()
                await viewModel.fetchInspections()
            }
            .onAppear {
                loadTabOrder()
            }
        }
    }

    // MARK: - Tab Order Management

    private func loadTabOrder() {
        if let savedData = UserDefaults.standard.data(forKey: "safetyTabOrder"),
           let savedTabs = try? JSONDecoder().decode([SafetyTab].self, from: savedData) {
            tabs = savedTabs
        } else {
            tabs = SafetyTab.defaultOrder
        }
    }

    private func saveTabOrder() {
        if let encoded = try? JSONEncoder().encode(tabs) {
            UserDefaults.standard.set(encoded, forKey: "safetyTabOrder")
        }
    }
}

// MARK: - Safety Tab Drop Delegate
struct SafetyTabDropDelegate: DropDelegate {
    let item: SafetyTab
    @Binding var items: [SafetyTab]
    @Binding var draggedItem: SafetyTab?
    let onReorder: () -> Void

    func performDrop(info: DropInfo) -> Bool {
        draggedItem = nil
        return true
    }

    func dropEntered(info: DropInfo) {
        guard let draggedItem = draggedItem,
              draggedItem.id != item.id,
              let from = items.firstIndex(where: { $0.id == draggedItem.id }),
              let to = items.firstIndex(where: { $0.id == item.id }) else {
            return
        }

        withAnimation(.default) {
            items.move(fromOffsets: IndexSet(integer: from), toOffset: to > from ? to + 1 : to)
        }
    }

    func dropUpdated(info: DropInfo) -> DropProposal? {
        return DropProposal(operation: .move)
    }

    func validateDrop(info: DropInfo) -> Bool {
        return true
    }
}

// MARK: - Safety Tab Button
struct SafetyTabButton: View {
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

// MARK: - Incidents List View
struct IncidentsListView: View {
    @ObservedObject var viewModel: SafetyViewModel
    @Binding var selectedIncident: IncidentReport?
    @State private var searchText = ""
    @State private var selectedStatus: IncidentStatus?

    var body: some View {
        VStack(spacing: 0) {
            // Search
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(AppColors.gray400)
                TextField("safety.searchIncidents".localized, text: $searchText)
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

            // Filters
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "safety.filter.all".localized, isSelected: selectedStatus == nil) {
                        selectedStatus = nil
                    }
                    ForEach(IncidentStatus.allCases, id: \.self) { status in
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

            // Stats
            HStack(spacing: AppSpacing.sm) {
                SafetyStatBadge(
                    count: viewModel.openIncidentsCount,
                    label: "safety.stat.open".localized,
                    color: AppColors.warning
                )
                SafetyStatBadge(
                    count: viewModel.criticalIncidentsCount,
                    label: "safety.stat.critical".localized,
                    color: AppColors.error
                )
                SafetyStatBadge(
                    count: viewModel.closedThisMonthCount,
                    label: "safety.stat.closed30d".localized,
                    color: AppColors.success
                )
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.xs)

            // List
            ScrollView {
                if viewModel.isLoading && viewModel.incidents.isEmpty {
                    ProgressView()
                        .padding(.top, AppSpacing.xl)
                } else if viewModel.filteredIncidents(search: searchText, status: selectedStatus).isEmpty {
                    emptyState
                } else {
                    LazyVStack(spacing: AppSpacing.sm) {
                        ForEach(viewModel.filteredIncidents(search: searchText, status: selectedStatus)) { incident in
                            IncidentCard(incident: incident)
                                .onTapGesture {
                                    selectedIncident = incident
                                }
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
            .refreshable {
                await viewModel.fetchIncidents()
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "shield.checkered")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray400)
            Text("safety.noIncidents".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("safety.noIncidentsDesc".localized)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(AppSpacing.xl)
    }
}

// MARK: - Inspections List View
struct InspectionsListView: View {
    @ObservedObject var viewModel: SafetyViewModel
    @Binding var selectedInspection: Inspection?
    @State private var searchText = ""
    @State private var selectedStatus: InspectionStatus?

    var body: some View {
        VStack(spacing: 0) {
            // Search
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(AppColors.gray400)
                TextField("safety.searchInspections".localized, text: $searchText)
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

            // Filters
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "safety.filter.all".localized, isSelected: selectedStatus == nil) {
                        selectedStatus = nil
                    }
                    ForEach(InspectionStatus.allCases, id: \.self) { status in
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

            // Stats
            HStack(spacing: AppSpacing.sm) {
                SafetyStatBadge(
                    count: viewModel.passedInspectionsCount,
                    label: "safety.stat.passed".localized,
                    color: AppColors.success
                )
                SafetyStatBadge(
                    count: viewModel.failedInspectionsCount,
                    label: "safety.stat.failed".localized,
                    color: AppColors.error
                )
                SafetyStatBadge(
                    count: viewModel.pendingInspectionsCount,
                    label: "safety.stat.pending".localized,
                    color: AppColors.warning
                )
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.xs)

            // List
            ScrollView {
                if viewModel.isLoading && viewModel.inspections.isEmpty {
                    ProgressView()
                        .padding(.top, AppSpacing.xl)
                } else if viewModel.filteredInspections(search: searchText, status: selectedStatus).isEmpty {
                    emptyState
                } else {
                    LazyVStack(spacing: AppSpacing.sm) {
                        ForEach(viewModel.filteredInspections(search: searchText, status: selectedStatus)) { inspection in
                            InspectionCard(inspection: inspection)
                                .onTapGesture {
                                    selectedInspection = inspection
                                }
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
            .refreshable {
                await viewModel.fetchInspections()
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "checklist")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray400)
            Text("safety.noInspections".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("safety.noInspectionsDesc".localized)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(AppSpacing.xl)
    }
}

// MARK: - Safety Stat Badge
struct SafetyStatBadge: View {
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

// MARK: - Incident Card
struct IncidentCard: View {
    let incident: IncidentReport

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    // Type Icon
                    ZStack {
                        Circle()
                            .fill(incident.incidentType.color.opacity(0.15))
                            .frame(width: 40, height: 40)
                        Image(systemName: incident.incidentType.icon)
                            .font(.system(size: 18))
                            .foregroundColor(incident.incidentType.color)
                    }

                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(incident.incidentType.displayName)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        Text(incident.location)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    Spacer()

                    VStack(alignment: .trailing, spacing: AppSpacing.xxs) {
                        StatusBadge(
                            text: incident.severity.displayName,
                            status: incident.severity.badgeStatus
                        )
                        StatusBadge(
                            text: incident.status.displayName,
                            status: incident.status.badgeStatus
                        )
                    }
                }

                // Description
                Text(incident.description)
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)
                    .lineLimit(2)

                Divider()

                // Footer
                HStack {
                    if let projectName = incident.projectName {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "folder.fill")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.textTertiary)
                            Text(projectName)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    Text(incident.formattedDate)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
    }
}

// MARK: - Inspection Card
struct InspectionCard: View {
    let inspection: Inspection

    private var category: InspectionCategory? {
        guard let cat = inspection.templateCategory else { return nil }
        return InspectionCategory.allCases.first { $0.rawValue == cat }
    }

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    // Category Icon
                    if let category = category {
                        ZStack {
                            Circle()
                                .fill(category.color.opacity(0.15))
                                .frame(width: 40, height: 40)
                            Image(systemName: category.icon)
                                .font(.system(size: 18))
                                .foregroundColor(category.color)
                        }
                    }

                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(inspection.templateName ?? "Inspection")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        if let location = inspection.location {
                            Text(location)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                    Spacer()

                    StatusBadge(
                        text: inspection.overallStatus.displayName,
                        status: inspection.overallStatus.badgeStatus
                    )
                }

                Divider()

                // Footer
                HStack {
                    if let projectName = inspection.projectName {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "folder.fill")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.textTertiary)
                            Text(projectName)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    if let inspectorName = inspection.inspectorName {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "person.fill")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.textTertiary)
                            Text(inspectorName)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        }
                    }

                    Text(inspection.formattedDate)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)

                    if inspection.photoCount > 0 {
                        HStack(spacing: 2) {
                            Image(systemName: "photo.fill")
                                .font(.system(size: 10))
                            Text("\(inspection.photoCount)")
                                .font(AppTypography.caption)
                        }
                        .foregroundColor(AppColors.textTertiary)
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
    }
}

// MARK: - Incident Detail View
struct IncidentDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let incident: IncidentReport
    @ObservedObject var viewModel: SafetyViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // Header Card
                    AppCard {
                        VStack(alignment: .leading, spacing: AppSpacing.md) {
                            HStack {
                                ZStack {
                                    Circle()
                                        .fill(incident.incidentType.color.opacity(0.15))
                                        .frame(width: 56, height: 56)
                                    Image(systemName: incident.incidentType.icon)
                                        .font(.system(size: 24))
                                        .foregroundColor(incident.incidentType.color)
                                }

                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text(incident.incidentType.displayName)
                                        .font(AppTypography.heading3)
                                        .foregroundColor(AppColors.textPrimary)
                                    Text(incident.location)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                }
                                Spacer()
                            }

                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Severity")
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textTertiary)
                                    StatusBadge(
                                        text: incident.severity.displayName,
                                        status: incident.severity.badgeStatus
                                    )
                                }
                                Spacer()
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Status")
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textTertiary)
                                    StatusBadge(
                                        text: incident.status.displayName,
                                        status: incident.status.badgeStatus
                                    )
                                }
                                Spacer()
                            }
                        }
                    }

                    // Date & Time
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("When")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Date")
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textTertiary)
                                    Text(incident.formattedDate)
                                        .font(AppTypography.bodyMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                                Spacer()
                                if let time = incident.formattedTime {
                                    VStack(alignment: .trailing, spacing: 2) {
                                        Text("Time")
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.textTertiary)
                                        Text(time)
                                            .font(AppTypography.bodyMedium)
                                            .foregroundColor(AppColors.textPrimary)
                                    }
                                }
                            }
                        }
                    }

                    // Description
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Description")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            Text(incident.description)
                                .font(AppTypography.body)
                                .foregroundColor(AppColors.textPrimary)
                        }
                    }

                    // Root Cause & Actions
                    if incident.rootCause != nil || incident.immediateActions != nil {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Analysis")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                VStack(alignment: .leading, spacing: AppSpacing.md) {
                                    if let rootCause = incident.rootCause {
                                        VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                            Text("Root Cause")
                                                .font(AppTypography.secondaryMedium)
                                                .foregroundColor(AppColors.textSecondary)
                                            Text(rootCause)
                                                .font(AppTypography.body)
                                                .foregroundColor(AppColors.textPrimary)
                                        }
                                    }
                                    if let actions = incident.immediateActions {
                                        VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                            Text("Immediate Actions")
                                                .font(AppTypography.secondaryMedium)
                                                .foregroundColor(AppColors.textSecondary)
                                            Text(actions)
                                                .font(AppTypography.body)
                                                .foregroundColor(AppColors.textPrimary)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Witnesses
                    if let witnesses = incident.witnesses, !witnesses.isEmpty {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Witnesses")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                                    ForEach(witnesses, id: \.self) { witness in
                                        HStack {
                                            Image(systemName: "person.fill")
                                                .foregroundColor(AppColors.textTertiary)
                                            Text(witness)
                                                .font(AppTypography.body)
                                                .foregroundColor(AppColors.textPrimary)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Reporter Info
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Reported By")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            HStack {
                                Image(systemName: "person.circle.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(AppColors.primary600)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(incident.reporterName ?? "Unknown")
                                        .font(AppTypography.bodyMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                    Text(formatDate(incident.createdAt))
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textTertiary)
                                }
                                Spacer()
                            }
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Incident Details")
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
        formatter.dateFormat = "MMM d, yyyy 'at' h:mm a"
        return formatter.string(from: date)
    }
}

// MARK: - Inspection Detail View
struct InspectionDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let inspection: Inspection

    private var category: InspectionCategory? {
        guard let cat = inspection.templateCategory else { return nil }
        return InspectionCategory.allCases.first { $0.rawValue == cat }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // Header Card
                    AppCard {
                        VStack(alignment: .leading, spacing: AppSpacing.md) {
                            HStack {
                                if let category = category {
                                    ZStack {
                                        Circle()
                                            .fill(category.color.opacity(0.15))
                                            .frame(width: 56, height: 56)
                                        Image(systemName: category.icon)
                                            .font(.system(size: 24))
                                            .foregroundColor(category.color)
                                    }
                                }

                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text(inspection.templateName ?? "Inspection")
                                        .font(AppTypography.heading3)
                                        .foregroundColor(AppColors.textPrimary)
                                    if let location = inspection.location {
                                        Text(location)
                                            .font(AppTypography.secondary)
                                            .foregroundColor(AppColors.textSecondary)
                                    }
                                }
                                Spacer()
                            }

                            // Status
                            HStack {
                                Image(systemName: inspection.overallStatus.icon)
                                    .font(.system(size: 20))
                                    .foregroundColor(inspection.overallStatus.color)
                                Text(inspection.overallStatus.displayName)
                                    .font(AppTypography.heading3)
                                    .foregroundColor(inspection.overallStatus.color)
                            }
                            .padding(AppSpacing.sm)
                            .frame(maxWidth: .infinity)
                            .background(inspection.overallStatus.color.opacity(0.1))
                            .cornerRadius(AppSpacing.radiusMedium)
                        }
                    }

                    // Details
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Details")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            VStack(spacing: AppSpacing.sm) {
                                if let projectName = inspection.projectName {
                                    HStack {
                                        Text("Project")
                                            .font(AppTypography.secondary)
                                            .foregroundColor(AppColors.textSecondary)
                                        Spacer()
                                        Text(projectName)
                                            .font(AppTypography.secondaryMedium)
                                            .foregroundColor(AppColors.textPrimary)
                                    }
                                }
                                HStack {
                                    Text("Date")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(inspection.formattedDate)
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                                if let inspectorName = inspection.inspectorName {
                                    HStack {
                                        Text("Inspector")
                                            .font(AppTypography.secondary)
                                            .foregroundColor(AppColors.textSecondary)
                                        Spacer()
                                        Text(inspectorName)
                                            .font(AppTypography.secondaryMedium)
                                            .foregroundColor(AppColors.textPrimary)
                                    }
                                }
                                if inspection.photoCount > 0 {
                                    HStack {
                                        Text("Photos")
                                            .font(AppTypography.secondary)
                                            .foregroundColor(AppColors.textSecondary)
                                        Spacer()
                                        Text("\(inspection.photoCount)")
                                            .font(AppTypography.secondaryMedium)
                                            .foregroundColor(AppColors.textPrimary)
                                    }
                                }
                            }
                        }
                    }

                    // Notes
                    if let notes = inspection.notes, !notes.isEmpty {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Notes")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                Text(notes)
                                    .font(AppTypography.body)
                                    .foregroundColor(AppColors.textPrimary)
                            }
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Inspection Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - New Incident View
struct NewIncidentView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: SafetyViewModel
    @State private var selectedProject: Project?
    @State private var showingProjectPicker = false
    @State private var incidentDate = Date()
    @State private var incidentTime = ""
    @State private var location = ""
    @State private var selectedType: IncidentType = .nearMiss
    @State private var selectedSeverity: IncidentSeverity = .minor
    @State private var description = ""
    @State private var rootCause = ""
    @State private var immediateActions = ""
    @State private var witnesses = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Type Selection
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("Incident Type *")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: AppSpacing.xs) {
                            ForEach(IncidentType.allCases, id: \.self) { type in
                                Button(action: { selectedType = type }) {
                                    VStack(spacing: AppSpacing.xxs) {
                                        Image(systemName: type.icon)
                                            .font(.system(size: 20))
                                        Text(type.displayName)
                                            .font(AppTypography.caption)
                                            .lineLimit(1)
                                    }
                                    .padding(AppSpacing.sm)
                                    .frame(maxWidth: .infinity)
                                    .foregroundColor(selectedType == type ? .white : type.color)
                                    .background(selectedType == type ? type.color : type.color.opacity(0.1))
                                    .cornerRadius(AppSpacing.radiusMedium)
                                }
                            }
                        }
                    }

                    // Severity
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("Severity *")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        HStack(spacing: AppSpacing.xs) {
                            ForEach(IncidentSeverity.allCases, id: \.self) { severity in
                                Button(action: { selectedSeverity = severity }) {
                                    Text(severity.displayName)
                                        .font(AppTypography.secondaryMedium)
                                        .padding(.horizontal, AppSpacing.md)
                                        .padding(.vertical, AppSpacing.sm)
                                        .foregroundColor(selectedSeverity == severity ? .white : severity.color)
                                        .background(selectedSeverity == severity ? severity.color : severity.color.opacity(0.1))
                                        .cornerRadius(AppSpacing.radiusFull)
                                }
                            }
                        }
                    }

                    // Project Selection
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        HStack {
                            Text("Project *")
                                .font(AppTypography.heading3)
                                .foregroundColor(AppColors.textPrimary)
                            Text("Required")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.error)
                        }

                        Button(action: { showingProjectPicker = true }) {
                            HStack {
                                if let project = selectedProject {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(project.name)
                                            .font(AppTypography.body)
                                            .foregroundColor(AppColors.textPrimary)
                                        if !project.address.isEmpty {
                                            Text(project.address)
                                                .font(AppTypography.caption)
                                                .foregroundColor(AppColors.textSecondary)
                                                .lineLimit(1)
                                        }
                                    }
                                } else {
                                    Text("Select a project")
                                        .font(AppTypography.body)
                                        .foregroundColor(AppColors.textSecondary)
                                }

                                Spacer()

                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(AppColors.textTertiary)
                            }
                            .padding()
                            .background(selectedProject == nil ? AppColors.error.opacity(0.05) : AppColors.gray100)
                            .cornerRadius(AppSpacing.radiusSmall)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                    .stroke(selectedProject == nil ? AppColors.error.opacity(0.3) : Color.clear, lineWidth: 1)
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .sheet(isPresented: $showingProjectPicker) {
                        IncidentProjectPickerSheet(selectedProject: $selectedProject)
                    }

                    // Date & Time
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("When")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Date *")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            DatePicker("", selection: $incidentDate, displayedComponents: .date)
                                .datePickerStyle(.compact)
                                .labelsHidden()
                        }

                        AppTextField(label: "Time", placeholder: "e.g., 10:30 AM", text: $incidentTime)
                    }

                    // Location
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("Where")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(label: "Location", placeholder: "e.g., 2nd Floor - East Wing", text: $location, isRequired: true)
                    }

                    // Description
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("What Happened")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextArea(label: "Description", placeholder: "Describe what happened...", text: $description, isRequired: true)
                    }

                    // Root Cause & Actions (Optional)
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("Analysis (Optional)")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextArea(label: "Root Cause", placeholder: "What caused this incident?", text: $rootCause)
                        AppTextArea(label: "Immediate Actions Taken", placeholder: "What actions were taken immediately?", text: $immediateActions)
                        AppTextField(label: "Witnesses", placeholder: "Comma-separated names", text: $witnesses)
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
                    PrimaryButton("Report Incident", icon: "exclamationmark.triangle.fill", isLoading: isSaving) {
                        Task {
                            await saveIncident()
                        }
                    }
                    .disabled(selectedProject == nil || location.isEmpty || description.isEmpty)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Report Incident")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func saveIncident() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        // Parse witnesses
        let witnessArray = witnesses.isEmpty ? nil : witnesses.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }

        guard let projectId = selectedProject?.id else {
            errorMessage = "Please select a project"
            return
        }

        do {
            _ = try await viewModel.createIncident(
                projectId: projectId,
                incidentDate: incidentDate,
                incidentTime: incidentTime.isEmpty ? nil : incidentTime,
                location: location,
                incidentType: selectedType,
                severity: selectedSeverity,
                description: description,
                rootCause: rootCause.isEmpty ? nil : rootCause,
                immediateActions: immediateActions.isEmpty ? nil : immediateActions,
                witnesses: witnessArray
            )
            dismiss()
        } catch {
            errorMessage = "Failed to report incident: \(error.localizedDescription)"
        }
    }
}

// MARK: - ViewModel
@MainActor
class SafetyViewModel: ObservableObject {
    @Published var incidents: [IncidentReport] = []
    @Published var inspections: [Inspection] = []
    @Published var isLoading = false

    private let safetyService = SafetyService.shared

    // Incident stats
    var openIncidentsCount: Int {
        incidents.filter { $0.status != .closed }.count
    }

    var criticalIncidentsCount: Int {
        incidents.filter { $0.severity == .critical && $0.status != .closed }.count
    }

    var closedThisMonthCount: Int {
        let thirtyDaysAgo = Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date()
        return incidents.filter { $0.status == .closed && ($0.closedAt ?? Date()) >= thirtyDaysAgo }.count
    }

    // Inspection stats
    var passedInspectionsCount: Int {
        inspections.filter { $0.overallStatus == .passed }.count
    }

    var failedInspectionsCount: Int {
        inspections.filter { $0.overallStatus == .failed }.count
    }

    var pendingInspectionsCount: Int {
        inspections.filter { $0.overallStatus == .pending || $0.overallStatus == .requiresFollowup }.count
    }

    func fetchIncidents() async {
        isLoading = true
        defer { isLoading = false }

        await safetyService.fetchIncidents()
        incidents = safetyService.incidents
    }

    func fetchInspections() async {
        isLoading = true
        defer { isLoading = false }

        await safetyService.fetchInspections()
        inspections = safetyService.inspections
    }

    func filteredIncidents(search: String, status: IncidentStatus?) -> [IncidentReport] {
        var result = incidents

        if let status = status {
            result = result.filter { $0.status == status }
        }

        if !search.isEmpty {
            result = result.filter {
                $0.description.localizedCaseInsensitiveContains(search) ||
                $0.location.localizedCaseInsensitiveContains(search) ||
                ($0.projectName?.localizedCaseInsensitiveContains(search) ?? false)
            }
        }

        return result.sorted { $0.incidentDate > $1.incidentDate }
    }

    func filteredInspections(search: String, status: InspectionStatus?) -> [Inspection] {
        var result = inspections

        if let status = status {
            result = result.filter { $0.overallStatus == status }
        }

        if !search.isEmpty {
            result = result.filter {
                ($0.templateName?.localizedCaseInsensitiveContains(search) ?? false) ||
                ($0.location?.localizedCaseInsensitiveContains(search) ?? false) ||
                ($0.projectName?.localizedCaseInsensitiveContains(search) ?? false)
            }
        }

        return result.sorted { $0.date > $1.date }
    }

    func createIncident(
        projectId: String,
        incidentDate: Date,
        incidentTime: String?,
        location: String,
        incidentType: IncidentType,
        severity: IncidentSeverity,
        description: String,
        rootCause: String?,
        immediateActions: String?,
        witnesses: [String]?
    ) async throws -> IncidentReport {
        let newIncident = try await safetyService.createIncident(
            projectId: projectId,
            incidentDate: incidentDate,
            incidentTime: incidentTime,
            location: location,
            incidentType: incidentType,
            severity: severity,
            description: description,
            rootCause: rootCause,
            immediateActions: immediateActions,
            witnesses: witnesses
        )
        incidents.insert(newIncident, at: 0)
        return newIncident
    }
}

// MARK: - Punch Lists View
struct PunchListsView: View {
    @StateObject private var punchListService = PunchListService.shared
    @Binding var selectedPunchList: PunchListItem?
    @State private var selectedStatus: PunchListStatus?
    @State private var searchText = ""

    private var filteredPunchLists: [PunchListItem] {
        var result = punchListService.punchListItems
        if let status = selectedStatus {
            result = result.filter { $0.status == status }
        }
        if !searchText.isEmpty {
            result = result.filter {
                $0.description.localizedCaseInsensitiveContains(searchText) ||
                ($0.location?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        return result.sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Search
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(AppColors.gray400)
                TextField("punchList.searchPlaceholder".localized, text: $searchText)
                    .font(AppTypography.body)
            }
            .padding(AppSpacing.sm)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.sm)

            // Filters
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "safety.filter.all".localized, isSelected: selectedStatus == nil) {
                        selectedStatus = nil
                    }
                    ForEach(PunchListStatus.allCases, id: \.self) { status in
                        FilterChip(title: status.displayName, isSelected: selectedStatus == status) {
                            selectedStatus = status
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.bottom, AppSpacing.sm)
            }

            // Stats
            HStack(spacing: AppSpacing.sm) {
                SafetyStatBadge(count: punchListService.openCount, label: "punchList.stat.open".localized, color: AppColors.warning)
                SafetyStatBadge(count: punchListService.inProgressCount, label: "punchList.stat.inProgress".localized, color: AppColors.info)
                SafetyStatBadge(count: punchListService.completedCount, label: "punchList.stat.completed".localized, color: AppColors.success)
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.bottom, AppSpacing.sm)

            // List
            if punchListService.isLoading && punchListService.punchListItems.isEmpty {
                VStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            } else if filteredPunchLists.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Spacer()
                    Image(systemName: "list.bullet.clipboard")
                        .font(.system(size: 48))
                        .foregroundColor(AppColors.gray300)
                    Text("punchList.noPunchLists".localized)
                        .font(AppTypography.heading3)
                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: AppSpacing.sm) {
                        ForEach(filteredPunchLists) { punchList in
                            PunchListCard(punchList: punchList)
                                .onTapGesture {
                                    selectedPunchList = punchList
                                }
                        }
                    }
                    .padding(AppSpacing.md)
                }
                .refreshable {
                    await punchListService.fetchPunchListItems()
                }
            }
        }
        .task {
            await punchListService.fetchPunchListItems()
        }
    }
}

// MARK: - Punch List Card
struct PunchListCard: View {
    let punchList: PunchListItem

    private var statusColor: Color {
        switch punchList.status {
        case .open: return AppColors.warning
        case .inProgress: return AppColors.info
        case .completed: return AppColors.success
        case .verified: return AppColors.success
        }
    }

    private var priorityColor: Color {
        switch punchList.priority {
        case .low: return AppColors.gray500
        case .medium: return AppColors.info
        case .high: return AppColors.warning
        case .critical: return AppColors.error
        }
    }

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: punchList.priority.icon)
                            .font(.system(size: 12))
                            .foregroundColor(priorityColor)
                        Text(punchList.priority.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(priorityColor)
                    }
                    .padding(.horizontal, AppSpacing.xs)
                    .padding(.vertical, 2)
                    .background(priorityColor.opacity(0.15))
                    .cornerRadius(4)

                    Spacer()

                    Text(punchList.status.displayName)
                        .font(AppTypography.caption)
                        .foregroundColor(statusColor)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(statusColor.opacity(0.15))
                        .cornerRadius(4)
                }

                Text(punchList.description)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(2)

                if let location = punchList.location {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "mappin")
                            .font(.system(size: 12))
                        Text(location)
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(AppColors.textSecondary)
                }

                HStack {
                    if let dueDate = punchList.formattedDueDate {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "calendar")
                                .font(.system(size: 12))
                            Text(dueDate)
                                .font(AppTypography.caption)
                        }
                        .foregroundColor(punchList.isOverdue ? AppColors.error : AppColors.textTertiary)
                    }

                    Spacer()

                    if let assignee = punchList.assignedToName {
                        HStack(spacing: AppSpacing.xs) {
                            Circle()
                                .fill(AppColors.gray200)
                                .frame(width: 20, height: 20)
                                .overlay(
                                    Text(String(assignee.prefix(1)))
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundColor(AppColors.textSecondary)
                                )
                            Text(assignee.components(separatedBy: " ").first ?? assignee)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Safety Meetings List View
struct SafetyMeetingsListView: View {
    @StateObject private var meetingService = SafetyMeetingService.shared
    @Binding var selectedMeeting: SafetyMeeting?
    @State private var selectedType: SafetyMeetingType?

    private var filteredMeetings: [SafetyMeeting] {
        var result = meetingService.meetings
        if let type = selectedType {
            result = result.filter { $0.type == type }
        }
        return result.sorted { $0.date > $1.date }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Filters
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "safety.filter.all".localized, isSelected: selectedType == nil) {
                        selectedType = nil
                    }
                    ForEach(SafetyMeetingType.allCases, id: \.self) { type in
                        FilterChip(title: type.displayName, isSelected: selectedType == type) {
                            selectedType = type
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
            }

            // Stats
            HStack(spacing: AppSpacing.sm) {
                SafetyStatBadge(count: meetingService.upcomingCount, label: "safetyMeeting.stat.scheduled".localized, color: AppColors.info)
                SafetyStatBadge(count: meetingService.completedCount, label: "safetyMeeting.stat.completed".localized, color: AppColors.success)
                SafetyStatBadge(count: meetingService.thisMonthCount, label: "safetyMeeting.stat.thisMonth".localized, color: AppColors.primary600)
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.bottom, AppSpacing.sm)

            // List
            if meetingService.isLoading && meetingService.meetings.isEmpty {
                VStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            } else if filteredMeetings.isEmpty {
                VStack(spacing: AppSpacing.md) {
                    Spacer()
                    Image(systemName: "person.3")
                        .font(.system(size: 48))
                        .foregroundColor(AppColors.gray300)
                    Text("safetyMeeting.noMeetings".localized)
                        .font(AppTypography.heading3)
                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: AppSpacing.sm) {
                        ForEach(filteredMeetings) { meeting in
                            SafetyMeetingCard(meeting: meeting)
                                .onTapGesture {
                                    selectedMeeting = meeting
                                }
                        }
                    }
                    .padding(AppSpacing.md)
                }
                .refreshable {
                    await meetingService.fetchMeetings()
                }
            }
        }
        .task {
            await meetingService.fetchMeetings()
        }
    }
}

// MARK: - Safety Meeting Card
struct SafetyMeetingCard: View {
    let meeting: SafetyMeeting

    private var isUpcoming: Bool {
        meeting.date > Date()
    }

    private var statusText: String {
        isUpcoming ? "safetyMeeting.stat.scheduled".localized : "safetyMeeting.stat.completed".localized
    }

    private var statusColor: Color {
        isUpcoming ? AppColors.info : AppColors.success
    }

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    Text(meeting.type.displayName)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.primary600)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(AppColors.primary100)
                        .cornerRadius(4)

                    Spacer()

                    Text(statusText)
                        .font(AppTypography.caption)
                        .foregroundColor(statusColor)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(statusColor.opacity(0.15))
                        .cornerRadius(4)
                }

                Text(meeting.title)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(2)

                if let topic = meeting.topic {
                    Text(topic)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                        .lineLimit(2)
                }

                HStack {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "calendar")
                            .font(.system(size: 12))
                        Text(meeting.formattedDate)
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(AppColors.textTertiary)

                    Spacer()

                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "person.2")
                            .font(.system(size: 12))
                        Text("\(meeting.attendees?.count ?? 0) attendees")
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(AppColors.textTertiary)

                    if let duration = meeting.duration {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "clock")
                                .font(.system(size: 12))
                            Text("\(duration) min")
                                .font(AppTypography.caption)
                        }
                        .foregroundColor(AppColors.textTertiary)
                    }
                }
            }
        }
    }
}

// MARK: - New Punch List View
struct NewPunchListView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var punchListService = PunchListService.shared
    @StateObject private var projectService = ProjectService.shared

    // Form State
    @State private var name = ""
    @State private var description = ""
    @State private var selectedProject: Project?
    @State private var location = ""
    @State private var trade = ""
    @State private var selectedPriority: PunchListPriority = .medium
    @State private var hasDueDate = false
    @State private var dueDate = Date()
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showingProjectPicker = false

    // Common trades for construction
    private let commonTrades = [
        "Painting", "Electrical", "Plumbing", "HVAC", "Flooring",
        "Drywall", "Doors & Hardware", "Tile", "Carpentry", "Roofing",
        "Glazing", "Concrete", "Masonry", "Fire Protection", "Other"
    ]

    private var isFormValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && selectedProject != nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Project Selection
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Project *")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        Button(action: { showingProjectPicker = true }) {
                            HStack {
                                Image(systemName: "building.2")
                                    .foregroundColor(AppColors.primary600)
                                Text(selectedProject?.name ?? "Select Project")
                                    .font(AppTypography.body)
                                    .foregroundColor(selectedProject != nil ? AppColors.textPrimary : AppColors.textSecondary)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(AppColors.gray400)
                            }
                            .padding(AppSpacing.md)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                        }
                    }

                    // Punch List Name/Title
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Item Description *")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        TextField("e.g., Touch up paint on north wall", text: $name)
                            .font(AppTypography.body)
                            .padding(AppSpacing.md)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                    }

                    // Location
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Location")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        TextField("e.g., 3rd Floor - Conference Room A", text: $location)
                            .font(AppTypography.body)
                            .padding(AppSpacing.md)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                    }

                    // Trade Selection
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Trade")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        Menu {
                            ForEach(commonTrades, id: \.self) { tradeOption in
                                Button(tradeOption) {
                                    trade = tradeOption
                                }
                            }
                        } label: {
                            HStack {
                                Text(trade.isEmpty ? "Select Trade" : trade)
                                    .font(AppTypography.body)
                                    .foregroundColor(trade.isEmpty ? AppColors.textSecondary : AppColors.textPrimary)
                                Spacer()
                                Image(systemName: "chevron.down")
                                    .font(.system(size: 12))
                                    .foregroundColor(AppColors.gray400)
                            }
                            .padding(AppSpacing.md)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                        }
                    }

                    // Priority Selection
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Priority")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        HStack(spacing: AppSpacing.sm) {
                            ForEach(PunchListPriority.allCases, id: \.self) { priority in
                                PriorityButton(
                                    priority: priority,
                                    isSelected: selectedPriority == priority
                                ) {
                                    selectedPriority = priority
                                }
                            }
                        }
                    }

                    // Due Date
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Toggle(isOn: $hasDueDate) {
                            Text("Due Date")
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                        }
                        .toggleStyle(SwitchToggleStyle(tint: AppColors.primary600))

                        if hasDueDate {
                            DatePicker("", selection: $dueDate, displayedComponents: .date)
                                .datePickerStyle(CompactDatePickerStyle())
                                .labelsHidden()
                                .padding(AppSpacing.sm)
                                .background(AppColors.cardBackground)
                                .cornerRadius(AppSpacing.radiusMedium)
                        }
                    }

                    // Notes
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Additional Notes")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        TextEditor(text: $description)
                            .font(AppTypography.body)
                            .frame(minHeight: 80)
                            .padding(AppSpacing.sm)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                    }

                    // Error Message
                    if let error = errorMessage {
                        Text(error)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.error)
                            .padding(AppSpacing.sm)
                            .frame(maxWidth: .infinity)
                            .background(AppColors.error.opacity(0.1))
                            .cornerRadius(AppSpacing.radiusSmall)
                    }

                    // Save Button
                    PrimaryButton(
                        isSaving ? "Saving..." : "Create Punch List Item",
                        icon: "list.bullet.clipboard"
                    ) {
                        Task { await savePunchList() }
                    }
                    .disabled(!isFormValid || isSaving)
                    .opacity(isFormValid && !isSaving ? 1 : 0.6)
                    .padding(.top, AppSpacing.sm)
                }
                .padding(AppSpacing.lg)
            }
            .background(AppColors.background)
            .navigationTitle("New Punch List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(isPresented: $showingProjectPicker) {
                PunchListProjectPickerSheet(selectedProject: $selectedProject)
            }
            .task {
                await projectService.fetchProjects()
            }
        }
    }

    private func savePunchList() async {
        guard let project = selectedProject else { return }

        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            let itemRequest = PunchListItemRequest(
                description: name.trimmingCharacters(in: .whitespaces),
                location: location.isEmpty ? nil : location,
                trade: trade.isEmpty ? nil : trade,
                priority: selectedPriority.rawValue,
                assignedTo: nil,
                dueDate: hasDueDate ? ISO8601DateFormatter().string(from: dueDate) : nil
            )

            try await punchListService.createPunchList(
                projectId: project.id,
                name: name.trimmingCharacters(in: .whitespaces),
                description: description.isEmpty ? nil : description,
                dueDate: hasDueDate ? dueDate : nil,
                items: [itemRequest]
            )

            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Priority Button
struct PriorityButton: View {
    let priority: PunchListPriority
    let isSelected: Bool
    let action: () -> Void

    private var priorityColor: Color {
        switch priority {
        case .low: return AppColors.gray500
        case .medium: return AppColors.info
        case .high: return AppColors.warning
        case .critical: return AppColors.error
        }
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: AppSpacing.xxs) {
                Image(systemName: priority.icon)
                    .font(.system(size: 16))
                Text(priority.displayName)
                    .font(AppTypography.caption)
            }
            .foregroundColor(isSelected ? priorityColor : AppColors.gray500)
            .frame(maxWidth: .infinity)
            .padding(AppSpacing.sm)
            .background(isSelected ? priorityColor.opacity(0.15) : AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(isSelected ? priorityColor : AppColors.gray200, lineWidth: isSelected ? 2 : 1)
            )
        }
    }
}

// MARK: - Punch List Project Picker Sheet
struct PunchListProjectPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var projectService = ProjectService.shared
    @Binding var selectedProject: Project?
    @State private var searchText = ""

    private var filteredProjects: [Project] {
        if searchText.isEmpty {
            return projectService.projects
        }
        return projectService.projects.filter {
            $0.name.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search
                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(AppColors.gray400)
                    TextField("Search projects...", text: $searchText)
                        .font(AppTypography.body)
                }
                .padding(AppSpacing.sm)
                .background(AppColors.cardBackground)
                .cornerRadius(AppSpacing.radiusMedium)
                .padding(AppSpacing.md)

                // Project List
                if projectService.isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if filteredProjects.isEmpty {
                    Spacer()
                    Text("No projects found")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                    Spacer()
                } else {
                    List(filteredProjects) { project in
                        Button(action: {
                            selectedProject = project
                            dismiss()
                        }) {
                            HStack {
                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text(project.name)
                                        .font(AppTypography.bodySemibold)
                                        .foregroundColor(AppColors.textPrimary)
                                    if !project.address.isEmpty {
                                        Text(project.address)
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.textSecondary)
                                    }
                                }
                                Spacer()
                                if selectedProject?.id == project.id {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(AppColors.primary600)
                                }
                            }
                        }
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .navigationTitle("Select Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

// MARK: - New Inspection View
struct NewInspectionView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: SafetyViewModel
    @StateObject private var safetyService = SafetyService.shared
    @StateObject private var projectService = ProjectService.shared

    // Form State
    @State private var selectedTemplate: InspectionTemplate?
    @State private var selectedProject: Project?
    @State private var inspectionDate = Date()
    @State private var location = ""
    @State private var notes = ""
    @State private var responses: [String: String] = [:]
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showingTemplatePicker = false
    @State private var showingProjectPicker = false

    private var isFormValid: Bool {
        selectedTemplate != nil && selectedProject != nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Template Selection
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Inspection Type *")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        Button(action: { showingTemplatePicker = true }) {
                            HStack {
                                Image(systemName: "clipboard.fill")
                                    .foregroundColor(AppColors.primary600)
                                Text(selectedTemplate?.name ?? "Select Inspection Type")
                                    .font(AppTypography.body)
                                    .foregroundColor(selectedTemplate != nil ? AppColors.textPrimary : AppColors.textSecondary)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(AppColors.gray400)
                            }
                            .padding(AppSpacing.md)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                        }

                        if let template = selectedTemplate, let desc = template.description {
                            Text(desc)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                                .padding(.top, AppSpacing.xxs)
                        }
                    }

                    // Project Selection
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Project *")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        Button(action: { showingProjectPicker = true }) {
                            HStack {
                                Image(systemName: "building.2")
                                    .foregroundColor(AppColors.primary600)
                                Text(selectedProject?.name ?? "Select Project")
                                    .font(AppTypography.body)
                                    .foregroundColor(selectedProject != nil ? AppColors.textPrimary : AppColors.textSecondary)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(AppColors.gray400)
                            }
                            .padding(AppSpacing.md)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                        }
                    }

                    // Date
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Inspection Date")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        DatePicker("", selection: $inspectionDate, displayedComponents: [.date, .hourAndMinute])
                            .datePickerStyle(CompactDatePickerStyle())
                            .labelsHidden()
                            .padding(AppSpacing.sm)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                    }

                    // Location
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Location")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        TextField("e.g., Building A, Floor 3", text: $location)
                            .font(AppTypography.body)
                            .padding(AppSpacing.md)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                    }

                    // Quick Status Selection
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Overall Result")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        HStack(spacing: AppSpacing.sm) {
                            InspectionStatusButton(
                                status: .passed,
                                isSelected: responses["overall"] == "PASS"
                            ) {
                                responses["overall"] = "PASS"
                            }
                            InspectionStatusButton(
                                status: .failed,
                                isSelected: responses["overall"] == "FAIL"
                            ) {
                                responses["overall"] = "FAIL"
                            }
                            InspectionStatusButton(
                                status: .requiresFollowup,
                                isSelected: responses["overall"] == "FOLLOWUP"
                            ) {
                                responses["overall"] = "FOLLOWUP"
                            }
                        }
                    }

                    // Notes
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Notes & Observations")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        TextEditor(text: $notes)
                            .font(AppTypography.body)
                            .frame(minHeight: 100)
                            .padding(AppSpacing.sm)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                    }

                    // Error Message
                    if let error = errorMessage {
                        Text(error)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.error)
                            .padding(AppSpacing.sm)
                            .frame(maxWidth: .infinity)
                            .background(AppColors.error.opacity(0.1))
                            .cornerRadius(AppSpacing.radiusSmall)
                    }

                    // Save Button
                    PrimaryButton(
                        isSaving ? "Saving..." : "Submit Inspection",
                        icon: "checkmark.circle"
                    ) {
                        Task { await saveInspection() }
                    }
                    .disabled(!isFormValid || isSaving)
                    .opacity(isFormValid && !isSaving ? 1 : 0.6)
                    .padding(.top, AppSpacing.sm)
                }
                .padding(AppSpacing.lg)
            }
            .background(AppColors.background)
            .navigationTitle("New Inspection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(isPresented: $showingTemplatePicker) {
                InspectionTemplatePickerSheet(selectedTemplate: $selectedTemplate)
            }
            .sheet(isPresented: $showingProjectPicker) {
                InspectionProjectPickerSheet(selectedProject: $selectedProject)
            }
            .task {
                await safetyService.fetchInspectionTemplates()
                await projectService.fetchProjects()
            }
        }
    }

    private func saveInspection() async {
        guard let template = selectedTemplate, let project = selectedProject else { return }

        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            let responsesDict: [String: Any] = responses.reduce(into: [:]) { result, pair in
                result[pair.key] = ["status": pair.value]
            }

            let _ = try await safetyService.createInspection(
                templateId: template.id,
                projectId: project.id,
                date: inspectionDate,
                location: location.isEmpty ? nil : location,
                responses: responsesDict,
                notes: notes.isEmpty ? nil : notes
            )

            await viewModel.fetchInspections()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Inspection Status Button
struct InspectionStatusButton: View {
    let status: InspectionStatus
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: AppSpacing.xxs) {
                Image(systemName: status.icon)
                    .font(.system(size: 20))
                Text(status.displayName)
                    .font(AppTypography.caption)
            }
            .foregroundColor(isSelected ? status.color : AppColors.gray500)
            .frame(maxWidth: .infinity)
            .padding(AppSpacing.sm)
            .background(isSelected ? status.color.opacity(0.15) : AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(isSelected ? status.color : AppColors.gray200, lineWidth: isSelected ? 2 : 1)
            )
        }
    }
}

// MARK: - Inspection Template Picker Sheet
struct InspectionTemplatePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var safetyService = SafetyService.shared
    @Binding var selectedTemplate: InspectionTemplate?
    @State private var selectedCategory: InspectionCategory?

    private var filteredTemplates: [InspectionTemplate] {
        var templates = safetyService.inspectionTemplates
        if templates.isEmpty {
            templates = SafetyService.defaultTemplates
        }
        if let category = selectedCategory {
            return templates.filter { $0.categoryEnum == category }
        }
        return templates
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Category Filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: AppSpacing.xs) {
                        FilterChip(title: "All", isSelected: selectedCategory == nil) {
                            selectedCategory = nil
                        }
                        ForEach(InspectionCategory.allCases, id: \.self) { category in
                            FilterChip(title: category.displayName, isSelected: selectedCategory == category) {
                                selectedCategory = category
                            }
                        }
                    }
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.vertical, AppSpacing.sm)
                }

                // Template List
                if filteredTemplates.isEmpty {
                    Spacer()
                    VStack(spacing: AppSpacing.sm) {
                        Image(systemName: "clipboard")
                            .font(.system(size: 40))
                            .foregroundColor(AppColors.gray300)
                        Text("No templates available")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    Spacer()
                } else {
                    List(filteredTemplates) { template in
                        Button(action: {
                            selectedTemplate = template
                            dismiss()
                        }) {
                            HStack {
                                ZStack {
                                    Circle()
                                        .fill(template.categoryEnum.color.opacity(0.15))
                                        .frame(width: 40, height: 40)
                                    Image(systemName: template.categoryEnum.icon)
                                        .foregroundColor(template.categoryEnum.color)
                                }

                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text(template.name)
                                        .font(AppTypography.bodySemibold)
                                        .foregroundColor(AppColors.textPrimary)
                                    if let desc = template.description {
                                        Text(desc)
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.textSecondary)
                                            .lineLimit(1)
                                    }
                                    Text(template.categoryEnum.displayName)
                                        .font(AppTypography.caption)
                                        .foregroundColor(template.categoryEnum.color)
                                }

                                Spacer()

                                if selectedTemplate?.id == template.id {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(AppColors.primary600)
                                }
                            }
                        }
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .navigationTitle("Select Inspection Type")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task {
                await safetyService.fetchInspectionTemplates()
            }
        }
    }
}

// MARK: - Inspection Project Picker Sheet
struct InspectionProjectPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var projectService = ProjectService.shared
    @Binding var selectedProject: Project?
    @State private var searchText = ""

    private var filteredProjects: [Project] {
        if searchText.isEmpty {
            return projectService.projects
        }
        return projectService.projects.filter {
            $0.name.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search
                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(AppColors.gray400)
                    TextField("Search projects...", text: $searchText)
                        .font(AppTypography.body)
                }
                .padding(AppSpacing.sm)
                .background(AppColors.cardBackground)
                .cornerRadius(AppSpacing.radiusMedium)
                .padding(AppSpacing.md)

                // Project List
                if projectService.isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if filteredProjects.isEmpty {
                    Spacer()
                    Text("No projects found")
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                    Spacer()
                } else {
                    List(filteredProjects) { project in
                        Button(action: {
                            selectedProject = project
                            dismiss()
                        }) {
                            HStack {
                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text(project.name)
                                        .font(AppTypography.bodySemibold)
                                        .foregroundColor(AppColors.textPrimary)
                                    if !project.address.isEmpty {
                                        Text(project.address)
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.textSecondary)
                                    }
                                }
                                Spacer()
                                if selectedProject?.id == project.id {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(AppColors.primary600)
                                }
                            }
                        }
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .navigationTitle("Select Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

// MARK: - New Safety Meeting View
struct NewSafetyMeetingView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    @StateObject private var topicService = SafetyTopicService.shared
    @StateObject private var employeeService = EmployeeService.shared
    @StateObject private var projectService = ProjectService.shared

    // Form State
    @State private var meetingDate = Date()
    @State private var meetingTime = Date()
    @State private var location = ""
    @State private var isDetectingLocation = false
    @State private var selectedProject: Project?
    @State private var otherProjectName = ""
    @State private var leaderName = ""
    @State private var selectedTopic: SafetyTopic?
    @State private var customTopic = ""
    @State private var selectedAttendees: Set<Employee> = []
    @State private var photo: UIImage?
    @State private var signature: UIImage?
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    // Picker states
    @State private var showingProjectPicker = false
    @State private var showingTopicPicker = false
    @State private var showingAttendeePicker = false
    @State private var showingPhotoPicker = false
    @State private var showingCamera = false

    private var isFormValid: Bool {
        !topicName.isEmpty &&
        !selectedAttendees.isEmpty &&
        photo != nil &&
        signature != nil
    }

    private var topicName: String {
        selectedTopic?.name ?? customTopic
    }

    private var projectName: String? {
        if let project = selectedProject {
            return project.name
        } else if !otherProjectName.isEmpty {
            return otherProjectName
        }
        return nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Date & Time Section
                    dateTimeSection

                    // Location Section
                    locationSection

                    // Project Section
                    projectSection

                    // Leader Section
                    leaderSection

                    // Topic Section
                    topicSection

                    // Attendees Section
                    attendeesSection

                    // Photo Section (Required)
                    photoSection

                    // Signature Section (Required)
                    SignatureCaptureButton(signature: $signature)

                    // Notes Section
                    notesSection

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
                    PrimaryButton("Create Safety Meeting", icon: "checkmark.circle.fill", isLoading: isSaving) {
                        Task {
                            await saveMeeting()
                        }
                    }
                    .disabled(!isFormValid)
                    .padding(.top, AppSpacing.md)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("New Safety Meeting")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task {
                await loadData()
            }
            .sheet(isPresented: $showingProjectPicker) {
                ProjectPickerSheet(selectedProject: $selectedProject, otherProjectName: $otherProjectName)
            }
            .sheet(isPresented: $showingTopicPicker) {
                TopicPickerSheet(selectedTopic: $selectedTopic, customTopic: $customTopic, topics: topicService.topics)
            }
            .sheet(isPresented: $showingAttendeePicker) {
                AttendeePickerSheet(selectedAttendees: $selectedAttendees, employees: employeeService.employees)
            }
            .sheet(isPresented: $showingPhotoPicker) {
                ImagePicker(image: $photo, sourceType: .photoLibrary)
            }
            .sheet(isPresented: $showingCamera) {
                ImagePicker(image: $photo, sourceType: .camera)
            }
        }
    }

    // MARK: - Form Sections

    private var dateTimeSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Date & Time")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            HStack(spacing: AppSpacing.md) {
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("Date")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textSecondary)
                    DatePicker("", selection: $meetingDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                        .labelsHidden()
                }

                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("Time")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textSecondary)
                    DatePicker("", selection: $meetingTime, displayedComponents: .hourAndMinute)
                        .datePickerStyle(.compact)
                        .labelsHidden()
                }
            }
        }
    }

    private var locationSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack {
                Text("Location")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                Spacer()

                Button(action: detectLocation) {
                    HStack(spacing: AppSpacing.xxs) {
                        if isDetectingLocation {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "location.fill")
                        }
                        Text("Detect")
                            .font(AppTypography.caption)
                    }
                    .foregroundColor(AppColors.primary600)
                }
            }

            AppTextField(label: "", placeholder: "City or site location", text: $location)
        }
    }

    private var projectSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Project")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            Button(action: { showingProjectPicker = true }) {
                HStack {
                    if let project = selectedProject {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(project.name)
                                .font(AppTypography.body)
                                .foregroundColor(AppColors.textPrimary)
                            if !project.address.isEmpty {
                                Text(project.address)
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textSecondary)
                                    .lineLimit(1)
                            }
                        }
                    } else if !otherProjectName.isEmpty {
                        Text(otherProjectName)
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textPrimary)
                    } else {
                        Text("Select project or enter other")
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textTertiary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.textTertiary)
                }
                .padding()
                .background(AppColors.gray100)
                .cornerRadius(AppSpacing.radiusSmall)
            }
        }
    }

    private var leaderSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Meeting Leader")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            AppTextField(
                label: "",
                placeholder: appState.currentUser?.name ?? "Your name",
                text: $leaderName
            )

            Text("Leave blank to use your account name")
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textTertiary)
        }
    }

    private var topicSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack {
                Text("Topic")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                Text("Required")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.error)
            }

            Button(action: { showingTopicPicker = true }) {
                HStack {
                    if let topic = selectedTopic {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(topic.name)
                                .font(AppTypography.body)
                                .foregroundColor(AppColors.textPrimary)
                            if let description = topic.description {
                                Text(description)
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textSecondary)
                                    .lineLimit(1)
                            }
                        }
                    } else if !customTopic.isEmpty {
                        Text(customTopic)
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textPrimary)
                    } else {
                        Text("Select a topic")
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textTertiary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.textTertiary)
                }
                .padding()
                .background(topicName.isEmpty ? AppColors.error.opacity(0.05) : AppColors.gray100)
                .cornerRadius(AppSpacing.radiusSmall)
                .overlay(
                    RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                        .stroke(topicName.isEmpty ? AppColors.error.opacity(0.3) : Color.clear, lineWidth: 1)
                )
            }
        }
    }

    private var attendeesSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack {
                Text("Attendees")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                Text("Required")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.error)

                Spacer()

                if !selectedAttendees.isEmpty {
                    Text("\(selectedAttendees.count) selected")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.primary600)
                }
            }

            Button(action: { showingAttendeePicker = true }) {
                HStack {
                    if selectedAttendees.isEmpty {
                        Text("Select attendees")
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textTertiary)
                    } else {
                        // Show first few attendees
                        let names = selectedAttendees.prefix(3).map { $0.name }
                        let remaining = selectedAttendees.count - 3
                        VStack(alignment: .leading, spacing: 2) {
                            Text(names.joined(separator: ", "))
                                .font(AppTypography.body)
                                .foregroundColor(AppColors.textPrimary)
                                .lineLimit(1)
                            if remaining > 0 {
                                Text("+ \(remaining) more")
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textSecondary)
                            }
                        }
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.textTertiary)
                }
                .padding()
                .background(selectedAttendees.isEmpty ? AppColors.error.opacity(0.05) : AppColors.gray100)
                .cornerRadius(AppSpacing.radiusSmall)
                .overlay(
                    RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                        .stroke(selectedAttendees.isEmpty ? AppColors.error.opacity(0.3) : Color.clear, lineWidth: 1)
                )
            }
        }
    }

    private var photoSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack {
                Text("Group Photo")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                Text("Required")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.error)
            }

            if let photo = photo {
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: photo)
                        .resizable()
                        .scaledToFill()
                        .frame(height: 200)
                        .clipped()
                        .cornerRadius(AppSpacing.radiusMedium)

                    Button(action: { self.photo = nil }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.white)
                            .shadow(radius: 2)
                    }
                    .padding(AppSpacing.sm)
                }
            } else {
                HStack(spacing: AppSpacing.md) {
                    Button(action: { showingCamera = true }) {
                        VStack(spacing: AppSpacing.xs) {
                            Image(systemName: "camera.fill")
                                .font(.system(size: 24))
                            Text("Take Photo")
                                .font(AppTypography.caption)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(AppSpacing.lg)
                        .foregroundColor(AppColors.primary600)
                        .background(AppColors.primary100)
                        .cornerRadius(AppSpacing.radiusMedium)
                    }

                    Button(action: { showingPhotoPicker = true }) {
                        VStack(spacing: AppSpacing.xs) {
                            Image(systemName: "photo.fill")
                                .font(.system(size: 24))
                            Text("Choose Photo")
                                .font(AppTypography.caption)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(AppSpacing.lg)
                        .foregroundColor(AppColors.textSecondary)
                        .background(AppColors.gray100)
                        .cornerRadius(AppSpacing.radiusMedium)
                    }
                }
            }

            Text("Take a photo of all attendees present at the meeting")
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textTertiary)
        }
    }

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Notes")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            AppTextArea(label: "", placeholder: "Additional notes or discussion points...", text: $notes)
        }
    }

    // MARK: - Actions

    private func loadData() async {
        async let topics: () = topicService.fetchTopics()
        async let employees: () = employeeService.fetchEmployees()
        _ = await (topics, employees)

        // Set default leader name
        if leaderName.isEmpty {
            leaderName = appState.currentUser?.name ?? ""
        }
    }

    private func detectLocation() {
        isDetectingLocation = true

        LocationManager.shared.requestLocation { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let coordinate):
                    // Reverse geocode to get city name
                    let geocoder = CLGeocoder()
                    let clLocation = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)

                    geocoder.reverseGeocodeLocation(clLocation) { placemarks, error in
                        DispatchQueue.main.async {
                            self.isDetectingLocation = false

                            if let error = error {
                                print("[Location] Geocoding error: \(error.localizedDescription)")
                                self.location = "Location detected"
                                return
                            }

                            if let placemark = placemarks?.first {
                                // Build location string: City, State
                                var locationParts: [String] = []
                                if let city = placemark.locality {
                                    locationParts.append(city)
                                }
                                if let state = placemark.administrativeArea {
                                    locationParts.append(state)
                                }

                                if !locationParts.isEmpty {
                                    self.location = locationParts.joined(separator: ", ")
                                } else if let name = placemark.name {
                                    self.location = name
                                } else {
                                    self.location = "Location detected"
                                }
                            } else {
                                self.location = "Location detected"
                            }
                        }
                    }

                case .failure(let error):
                    self.isDetectingLocation = false
                    print("[Location] Error: \(error.localizedDescription)")
                    self.errorMessage = "Could not detect location. Please enter manually."
                }
            }
        }
    }

    private func saveMeeting() async {
        guard isFormValid else { return }
        guard let photo = photo, let signature = signature else {
            errorMessage = "Photo and signature are required"
            return
        }

        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            // 1. Upload photo to storage
            let photoUrl = try await uploadImageToStorage(
                image: photo,
                prefix: "safety-meetings/photos"
            )

            // 2. Upload signature to storage
            let signatureUrl = try await uploadImageToStorage(
                image: signature,
                prefix: "safety-meetings/signatures"
            )

            // 3. Get attendee names
            let attendeeNames = selectedAttendees.map { $0.name }
            let attendeeIds = selectedAttendees.map { $0.id }

            // 4. Format time
            let timeFormatter = DateFormatter()
            timeFormatter.dateFormat = "HH:mm"
            let timeString = timeFormatter.string(from: meetingTime)

            // 5. Create meeting via API
            let _ = try await SafetyMeetingService.shared.createMeeting(
                projectId: selectedProject?.id,
                date: meetingDate,
                time: timeString,
                location: location.isEmpty ? nil : location,
                topic: topicName,
                topicId: selectedTopic?.id,
                description: nil,
                duration: nil,
                attendees: attendeeNames,
                attendeeIds: attendeeIds,
                leaderSignature: signatureUrl,
                photoUrl: photoUrl,
                notes: notes.isEmpty ? nil : notes
            )

            print("[NewSafetyMeetingView] Meeting created successfully")

            // Refresh the meetings list
            await SafetyMeetingService.shared.fetchMeetings()

            dismiss()
        } catch {
            print("[NewSafetyMeetingView] Error creating meeting: \(error)")
            errorMessage = "Failed to create meeting: \(error.localizedDescription)"
        }
    }

    /// Upload an image to Supabase storage and return the URL
    private func uploadImageToStorage(image: UIImage, prefix: String) async throws -> String {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw NSError(domain: "SafetyMeeting", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to process image"])
        }

        let timestamp = Int(Date().timeIntervalSince1970)
        let randomId = UUID().uuidString.prefix(8)
        let path = "\(prefix)/\(timestamp)_\(randomId).jpg"

        struct UploadRequest: Encodable {
            let path: String
            let data: String
        }

        struct UploadResponse: Decodable {
            let path: String
        }

        let request = UploadRequest(
            path: path,
            data: imageData.base64EncodedString()
        )

        let response: UploadResponse = try await APIClient.shared.post("/storage/upload", body: request)
        return response.path
    }
}

// MARK: - Project Picker Sheet
struct ProjectPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedProject: Project?
    @Binding var otherProjectName: String
    @State private var showOther = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(ProjectService.shared.projects) { project in
                        Button(action: {
                            selectedProject = project
                            otherProjectName = ""
                            dismiss()
                        }) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(project.name)
                                        .font(AppTypography.body)
                                        .foregroundColor(AppColors.textPrimary)
                                    if !project.address.isEmpty {
                                        Text(project.address)
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.textSecondary)
                                    }
                                }

                                Spacer()

                                if selectedProject?.id == project.id {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(AppColors.primary600)
                                }
                            }
                        }
                    }
                }

                Section {
                    Button(action: { showOther.toggle() }) {
                        HStack {
                            Text("Other")
                                .font(AppTypography.body)
                                .foregroundColor(AppColors.textPrimary)
                            Spacer()
                            if showOther || !otherProjectName.isEmpty {
                                Image(systemName: "checkmark")
                                    .foregroundColor(AppColors.primary600)
                            }
                        }
                    }

                    if showOther || !otherProjectName.isEmpty {
                        TextField("Enter project name", text: $otherProjectName)
                            .onChange(of: otherProjectName) { _, _ in
                                selectedProject = nil
                            }
                    }
                }
            }
            .navigationTitle("Select Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Topic Picker Sheet
struct TopicPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedTopic: SafetyTopic?
    @Binding var customTopic: String
    let topics: [SafetyTopic]

    @State private var searchText = ""
    @State private var showCustom = false

    private var filteredTopics: [SafetyTopic] {
        if searchText.isEmpty {
            return topics
        }
        return topics.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.description?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    private var topicsByCategory: [SafetyTopicCategory: [SafetyTopic]] {
        Dictionary(grouping: filteredTopics) { $0.categoryEnum ?? .general }
    }

    var body: some View {
        NavigationStack {
            List {
                // Search
                TextField("Search topics...", text: $searchText)
                    .padding(.vertical, AppSpacing.xs)

                // Custom topic option
                Section {
                    Button(action: { showCustom.toggle() }) {
                        HStack {
                            Image(systemName: "plus.circle")
                                .foregroundColor(AppColors.primary600)
                            Text("Custom Topic")
                                .font(AppTypography.body)
                                .foregroundColor(AppColors.textPrimary)
                            Spacer()
                            if showCustom || !customTopic.isEmpty {
                                Image(systemName: "checkmark")
                                    .foregroundColor(AppColors.primary600)
                            }
                        }
                    }

                    if showCustom || !customTopic.isEmpty {
                        TextField("Enter custom topic", text: $customTopic)
                            .onChange(of: customTopic) { _, _ in
                                selectedTopic = nil
                            }
                    }
                }

                // Topics by category
                ForEach(SafetyTopicCategory.allCases, id: \.self) { category in
                    if let categoryTopics = topicsByCategory[category], !categoryTopics.isEmpty {
                        Section(header: HStack {
                            Image(systemName: category.icon)
                            Text(category.displayName)
                        }) {
                            ForEach(categoryTopics) { topic in
                                Button(action: {
                                    selectedTopic = topic
                                    customTopic = ""
                                    dismiss()
                                }) {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(topic.name)
                                                .font(AppTypography.body)
                                                .foregroundColor(AppColors.textPrimary)
                                            if let description = topic.description {
                                                Text(description)
                                                    .font(AppTypography.caption)
                                                    .foregroundColor(AppColors.textSecondary)
                                                    .lineLimit(2)
                                            }
                                        }

                                        Spacer()

                                        if selectedTopic?.id == topic.id {
                                            Image(systemName: "checkmark")
                                                .foregroundColor(AppColors.primary600)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Select Topic")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Attendee Picker Sheet
struct AttendeePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedAttendees: Set<Employee>
    let employees: [Employee]

    @State private var searchText = ""
    @State private var showingAddEmployee = false
    @State private var newEmployeeName = ""
    @State private var newEmployeeCompany = ""

    private var filteredEmployees: [Employee] {
        if searchText.isEmpty {
            return employees.filter { $0.isActive }
        }
        return employees.filter { $0.isActive }.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.company?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Selected count bar
                if !selectedAttendees.isEmpty {
                    HStack {
                        Text("\(selectedAttendees.count) attendees selected")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.primary600)
                        Spacer()
                        Button("Clear All") {
                            selectedAttendees.removeAll()
                        }
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.error)
                    }
                    .padding()
                    .background(AppColors.primary100)
                }

                List {
                    // Search
                    TextField("Search employees...", text: $searchText)
                        .padding(.vertical, AppSpacing.xs)

                    // Add new employee option
                    Section {
                        Button(action: { showingAddEmployee = true }) {
                            HStack {
                                Image(systemName: "person.badge.plus")
                                    .foregroundColor(AppColors.primary600)
                                Text("Add New Employee")
                                    .font(AppTypography.body)
                                    .foregroundColor(AppColors.primary600)
                            }
                        }
                    }

                    // Employee list
                    Section {
                        ForEach(filteredEmployees) { employee in
                            Button(action: {
                                if selectedAttendees.contains(employee) {
                                    selectedAttendees.remove(employee)
                                } else {
                                    selectedAttendees.insert(employee)
                                }
                            }) {
                                HStack {
                                    // Avatar
                                    Circle()
                                        .fill(AppColors.primary100)
                                        .frame(width: 40, height: 40)
                                        .overlay(
                                            Text(employee.initials)
                                                .font(AppTypography.secondaryMedium)
                                                .foregroundColor(AppColors.primary600)
                                        )

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(employee.name)
                                            .font(AppTypography.body)
                                            .foregroundColor(AppColors.textPrimary)
                                        if let company = employee.company {
                                            Text(company)
                                                .font(AppTypography.caption)
                                                .foregroundColor(AppColors.textSecondary)
                                        }
                                    }

                                    Spacer()

                                    if selectedAttendees.contains(employee) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(AppColors.primary600)
                                            .font(.system(size: 22))
                                    } else {
                                        Image(systemName: "circle")
                                            .foregroundColor(AppColors.gray300)
                                            .font(.system(size: 22))
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Select Attendees")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
            .alert("Add New Employee", isPresented: $showingAddEmployee) {
                TextField("Name", text: $newEmployeeName)
                TextField("Company (optional)", text: $newEmployeeCompany)
                Button("Cancel", role: .cancel) {
                    newEmployeeName = ""
                    newEmployeeCompany = ""
                }
                Button("Add") {
                    Task {
                        await addNewEmployee()
                    }
                }
            }
        }
    }

    private func addNewEmployee() async {
        guard !newEmployeeName.isEmpty else { return }

        do {
            let newEmployee = try await EmployeeService.shared.createEmployee(
                name: newEmployeeName,
                company: newEmployeeCompany.isEmpty ? nil : newEmployeeCompany
            )
            selectedAttendees.insert(newEmployee)
            newEmployeeName = ""
            newEmployeeCompany = ""
        } catch {
            print("[AttendeePickerSheet] Error creating employee: \(error)")
        }
    }
}

// MARK: - Punch List Detail View
struct PunchListDetailView: View {
    let punchList: PunchListItem
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    Text(punchList.description)
                        .font(AppTypography.heading2)
                    if let trade = punchList.trade {
                        Text("Trade: \(trade)")
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    if let location = punchList.location {
                        Text("Location: \(location)")
                    }
                }
                .padding()
            }
            .navigationTitle("Punch List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Safety Meeting Detail View
struct SafetyMeetingDetailView: View {
    let meeting: SafetyMeeting
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    Text(meeting.title)
                        .font(AppTypography.heading2)
                    Text(meeting.type.displayName)
                        .font(AppTypography.secondary)
                    if let topic = meeting.topic {
                        Text(topic)
                    }
                    Text("Date: \(meeting.formattedDate)")
                    if let attendees = meeting.attendees {
                        Text("Attendees: \(attendees.count)")
                    }
                }
                .padding()
            }
            .navigationTitle("Safety Meeting")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Incident Project Picker Sheet
struct IncidentProjectPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedProject: Project?

    var body: some View {
        NavigationStack {
            List {
                ForEach(ProjectService.shared.projects) { project in
                    Button(action: {
                        selectedProject = project
                        dismiss()
                    }) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(project.name)
                                    .font(AppTypography.body)
                                    .foregroundColor(AppColors.textPrimary)
                                if !project.address.isEmpty {
                                    Text(project.address)
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textSecondary)
                                }
                            }

                            Spacer()

                            if selectedProject?.id == project.id {
                                Image(systemName: "checkmark")
                                    .foregroundColor(AppColors.primary600)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Select Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    SafetyView()
}
