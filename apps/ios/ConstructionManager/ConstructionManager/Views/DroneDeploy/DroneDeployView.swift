//
//  DroneDeployView.swift
//  ConstructionManager
//
//  DroneDeploy integration view for drone flights and orthomosaic maps
//

import SwiftUI
import Combine

struct DroneDeployView: View {
    @StateObject private var viewModel = DroneDeployViewModel()
    @State private var searchText = ""
    @State private var selectedStatus: CaptureStatus?
    @State private var selectedFlight: DroneFlight?
    @State private var showingSheetFlight: DroneFlight? // For iPhone sheet
    @State private var showingFullScreenMap = false
    @State private var showingExportOptions = false
    @State private var showingCompareView = false
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private var isIPad: Bool {
        horizontalSizeClass == .regular
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

                // Content
                if isIPad {
                    iPadLayout
                } else {
                    iPhoneLayout
                }
            }
            .background(AppColors.background)
            .navigationTitle("DroneDeploy")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.refresh() }) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(AppColors.primary600)
                    }
                }
            }
            // Only use sheet for iPhone (not iPad - iPad has persistent detail panel)
            .sheet(item: $showingSheetFlight) { flight in
                FlightDetailView(flight: flight, viewModel: viewModel)
            }
            // Full screen map viewer
            .fullScreenCover(isPresented: $showingFullScreenMap) {
                if let flight = selectedFlight {
                    OrthomosaicMapViewer(flight: flight)
                }
            }
            // Export options sheet
            .sheet(isPresented: $showingExportOptions) {
                if let flight = selectedFlight {
                    ExportOptionsView(flight: flight)
                }
            }
            // Compare view sheet
            .sheet(isPresented: $showingCompareView) {
                if let flight = selectedFlight {
                    FlightCompareView(currentFlight: flight, allFlights: viewModel.flights)
                }
            }
            .task {
                await viewModel.fetchFlights()
            }
            .refreshable {
                await viewModel.fetchFlights()
            }
        }
    }

    // MARK: - Search Bar
    private var searchBar: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.gray400)
            TextField("Search flights, maps, projects...", text: $searchText)
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

    // MARK: - Filter Section
    private var filterSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                FilterChip(title: "All", isSelected: selectedStatus == nil) {
                    selectedStatus = nil
                }
                ForEach(CaptureStatus.allCases, id: \.self) { status in
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

    // MARK: - Stats Summary
    private var statsSummary: some View {
        HStack(spacing: AppSpacing.sm) {
            DroneStatBadge(
                count: viewModel.totalFlights,
                label: "Total Flights",
                color: AppColors.primary600
            )
            DroneStatBadge(
                count: viewModel.completedCount,
                label: "Completed",
                color: AppColors.success
            )
            DroneStatBadge(
                value: viewModel.formattedAreaMapped,
                label: "Area Mapped",
                color: AppColors.info
            )
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.xs)
    }

    // MARK: - iPhone Layout
    private var iPhoneLayout: some View {
        ScrollView {
            if viewModel.isLoading && viewModel.flights.isEmpty {
                ProgressView()
                    .padding(.top, AppSpacing.xl)
            } else if viewModel.filteredFlights(search: searchText, status: selectedStatus).isEmpty {
                emptyState
            } else {
                LazyVStack(spacing: AppSpacing.sm) {
                    ForEach(viewModel.filteredFlights(search: searchText, status: selectedStatus)) { flight in
                        DroneFlightCard(flight: flight)
                            .onTapGesture {
                                showingSheetFlight = flight // Open sheet on iPhone
                            }
                    }
                }
                .padding(AppSpacing.md)
            }
        }
    }

    // MARK: - iPad Layout
    private var iPadLayout: some View {
        GeometryReader { geometry in
            HStack(spacing: 0) {
                // Left: Flight List
                ScrollView {
                    if viewModel.isLoading && viewModel.flights.isEmpty {
                        ProgressView()
                            .padding(.top, AppSpacing.xl)
                    } else if viewModel.filteredFlights(search: searchText, status: selectedStatus).isEmpty {
                        emptyState
                    } else {
                        LazyVStack(spacing: AppSpacing.sm) {
                            ForEach(viewModel.filteredFlights(search: searchText, status: selectedStatus)) { flight in
                                DroneFlightCard(flight: flight, isSelected: selectedFlight?.id == flight.id)
                                    .onTapGesture {
                                        selectedFlight = flight // Just update selection, no sheet
                                    }
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
                .frame(width: geometry.size.width * 0.4)

                Divider()

                // Right: Persistent Detail Panel
                if let flight = selectedFlight {
                    iPadDetailPanel(flight: flight, width: geometry.size.width * 0.6)
                } else {
                    VStack(spacing: AppSpacing.md) {
                        Image(systemName: "airplane")
                            .font(.system(size: 48))
                            .foregroundColor(AppColors.gray400)
                        Text("Select a Flight")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textSecondary)
                        Text("Choose a flight from the list to view details and orthomosaic maps")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textTertiary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(width: geometry.size.width * 0.6)
                }
            }
        }
    }

    // MARK: - iPad Detail Panel (Persistent with viewing options)
    @ViewBuilder
    private func iPadDetailPanel(flight: DroneFlight, width: CGFloat) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                // Header Card
                AppCard {
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        HStack {
                            ZStack {
                                Circle()
                                    .fill(flight.status.color.opacity(0.15))
                                    .frame(width: 56, height: 56)
                                Image(systemName: flight.mapType.icon)
                                    .font(.system(size: 24))
                                    .foregroundColor(flight.status.color)
                            }

                            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                Text(flight.name)
                                    .font(AppTypography.heading3)
                                    .foregroundColor(AppColors.textPrimary)
                                Text(flight.projectName)
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                            }
                            Spacer()

                            StatusBadge(text: flight.status.displayName, status: flight.status.badgeStatus)
                        }
                    }
                }

                // Map Viewing Options (if orthomosaic available)
                if flight.hasOrthomosaic {
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("Map Viewer")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        HStack(spacing: AppSpacing.md) {
                            // Full Screen Button
                            Button {
                                showingFullScreenMap = true
                            } label: {
                                VStack(spacing: AppSpacing.sm) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                            .fill(AppColors.primary600.opacity(0.1))
                                            .frame(height: 100)
                                        VStack(spacing: AppSpacing.xs) {
                                            Image(systemName: "arrow.up.left.and.arrow.down.right")
                                                .font(.system(size: 32))
                                                .foregroundColor(AppColors.primary600)
                                            Text("Full Screen")
                                                .font(AppTypography.secondaryMedium)
                                                .foregroundColor(AppColors.primary600)
                                        }
                                    }
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.plain)

                            // Popup Viewer Button
                            Button {
                                showingSheetFlight = flight
                            } label: {
                                VStack(spacing: AppSpacing.sm) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                            .fill(AppColors.info.opacity(0.1))
                                            .frame(height: 100)
                                        VStack(spacing: AppSpacing.xs) {
                                            Image(systemName: "rectangle.on.rectangle")
                                                .font(.system(size: 32))
                                                .foregroundColor(AppColors.info)
                                            Text("Popup Window")
                                                .font(AppTypography.secondaryMedium)
                                                .foregroundColor(AppColors.info)
                                        }
                                    }
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Flight Statistics
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("Flight Statistics")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textSecondary)

                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: AppSpacing.sm) {
                        iPadStatCard(
                            value: flight.formattedArea,
                            label: "Area Mapped",
                            icon: "square.dashed",
                            color: AppColors.primary600
                        )
                        iPadStatCard(
                            value: "\(flight.imageCount)",
                            label: "Images",
                            icon: "photo.fill",
                            color: AppColors.info
                        )
                        iPadStatCard(
                            value: flight.formattedAltitude,
                            label: "Altitude",
                            icon: "arrow.up.to.line",
                            color: AppColors.success
                        )
                        iPadStatCard(
                            value: flight.formattedResolution,
                            label: "Resolution",
                            icon: "viewfinder",
                            color: AppColors.orange
                        )
                    }
                }

                // Flight Details
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("Details")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textSecondary)

                    AppCard {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppSpacing.md) {
                            detailRow(label: "Map Type", value: flight.mapType.displayName)
                            detailRow(label: "Flight Date", value: flight.formattedDate)
                            if let pilotName = flight.pilotName {
                                detailRow(label: "Pilot", value: pilotName)
                            }
                            if let droneName = flight.droneName {
                                detailRow(label: "Drone", value: droneName)
                            }
                        }
                    }
                }

                // Quick Actions
                if flight.hasOrthomosaic {
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Quick Actions")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        HStack(spacing: AppSpacing.sm) {
                            iPadQuickAction(
                                title: "Export",
                                icon: "square.and.arrow.up",
                                color: AppColors.success
                            ) {
                                showingExportOptions = true
                            }

                            iPadQuickAction(
                                title: "Compare",
                                icon: "rectangle.on.rectangle",
                                color: AppColors.purple
                            ) {
                                showingCompareView = true
                            }

                            iPadQuickAction(
                                title: "Full Screen",
                                icon: "arrow.up.left.and.arrow.down.right",
                                color: AppColors.primary600
                            ) {
                                showingFullScreenMap = true
                            }
                        }
                    }
                }
            }
            .padding(AppSpacing.md)
        }
        .frame(width: width)
        .background(AppColors.background)
    }

    private func detailRow(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textTertiary)
            Text(value)
                .font(AppTypography.bodyMedium)
                .foregroundColor(AppColors.textPrimary)
        }
    }

    private func iPadQuickAction(title: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: AppSpacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(color)
                Text(title)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppSpacing.md)
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
        }
        .buttonStyle(.plain)
    }

    private func iPadStatCard(value: String, label: String, icon: String, color: Color) -> some View {
        VStack(spacing: AppSpacing.sm) {
            HStack(spacing: AppSpacing.sm) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 40, height: 40)
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundColor(color)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(value)
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)
                    Text(label)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                        .lineLimit(1)
                }
                Spacer()
            }
        }
        .padding(AppSpacing.md)
        .frame(maxWidth: .infinity)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusMedium)
    }

    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "airplane")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray400)
            Text("No Drone Flights")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("Connect DroneDeploy to view your drone flights and orthomosaic maps")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
            PrimaryButton("Connect DroneDeploy", icon: "link") {
                // Connect action
            }
            .padding(.top, AppSpacing.sm)
        }
        .padding(AppSpacing.xl)
    }
}

// MARK: - Drone Stat Badge
struct DroneStatBadge: View {
    let count: Int?
    let value: String?
    let label: String
    let color: Color

    init(count: Int, label: String, color: Color) {
        self.count = count
        self.value = nil
        self.label = label
        self.color = color
    }

    init(value: String, label: String, color: Color) {
        self.count = nil
        self.value = value
        self.label = label
        self.color = color
    }

    var body: some View {
        VStack(spacing: AppSpacing.xxs) {
            if let count = count {
                Text("\(count)")
                    .font(AppTypography.heading3)
                    .foregroundColor(color)
            } else if let value = value {
                Text(value)
                    .font(AppTypography.heading3)
                    .foregroundColor(color)
            }
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

// MARK: - Drone Flight Card
struct DroneFlightCard: View {
    let flight: DroneFlight
    var isSelected: Bool = false

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    // Icon
                    ZStack {
                        Circle()
                            .fill(flight.status.color.opacity(0.15))
                            .frame(width: 44, height: 44)
                        Image(systemName: flight.mapType.icon)
                            .font(.system(size: 20))
                            .foregroundColor(flight.status.color)
                    }

                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(flight.name)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        Text(flight.projectName)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    Spacer()
                    StatusBadge(
                        text: flight.status.displayName,
                        status: flight.status.badgeStatus
                    )
                }

                // Map Type & Stats
                HStack(spacing: AppSpacing.lg) {
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "map.fill")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text(flight.mapType.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }

                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "square.dashed")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text(flight.formattedArea)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }

                    if flight.imageCount > 0 {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "photo.fill")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.textTertiary)
                            Text("\(flight.imageCount) images")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                        }
                    }
                }

                // Progress bar for processing
                if flight.status == .processing {
                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        HStack {
                            Text("Processing...")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                            Spacer()
                            Text("\(Int(flight.processingProgress * 100))%")
                                .font(AppTypography.captionMedium)
                                .foregroundColor(AppColors.primary600)
                        }
                        ProgressView(value: flight.processingProgress)
                            .progressViewStyle(LinearProgressViewStyle(tint: AppColors.primary600))
                    }
                }

                Divider()

                // Footer
                HStack {
                    Text(flight.formattedDate)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)

                    Spacer()

                    if flight.hasOrthomosaic {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.success)
                            Text("Map Ready")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.success)
                        }
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                .stroke(isSelected ? AppColors.primary600 : Color.clear, lineWidth: 2)
        )
    }
}

// MARK: - Flight Detail View (Sheet for iPhone)
struct FlightDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let flight: DroneFlight
    @ObservedObject var viewModel: DroneDeployViewModel

    var body: some View {
        NavigationStack {
            FlightDetailContent(flight: flight, viewModel: viewModel)
                .navigationTitle("Flight Details")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") { dismiss() }
                    }
                }
        }
    }
}

// MARK: - Flight Detail Content
struct FlightDetailContent: View {
    let flight: DroneFlight
    @ObservedObject var viewModel: DroneDeployViewModel
    @State private var showingMapViewer = false
    @State private var showingExportOptions = false
    @State private var showingCompareView = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                // Header Card
                AppCard {
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        HStack {
                            ZStack {
                                Circle()
                                    .fill(flight.status.color.opacity(0.15))
                                    .frame(width: 56, height: 56)
                                Image(systemName: flight.mapType.icon)
                                    .font(.system(size: 24))
                                    .foregroundColor(flight.status.color)
                            }

                            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                Text(flight.name)
                                    .font(AppTypography.heading3)
                                    .foregroundColor(AppColors.textPrimary)
                                Text(flight.projectName)
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                            }
                            Spacer()
                        }

                        // Status Banner
                        HStack {
                            Image(systemName: flight.status.icon)
                                .font(.system(size: 20))
                                .foregroundColor(flight.status.color)
                            Text(flight.status.displayName)
                                .font(AppTypography.heading3)
                                .foregroundColor(flight.status.color)
                            Spacer()
                            if flight.status == .processing {
                                Text("\(Int(flight.processingProgress * 100))%")
                                    .font(AppTypography.bodySemibold)
                                    .foregroundColor(flight.status.color)
                            }
                        }
                        .padding(AppSpacing.sm)
                        .frame(maxWidth: .infinity)
                        .background(flight.status.color.opacity(0.1))
                        .cornerRadius(AppSpacing.radiusMedium)
                    }
                }

                // Map Preview (if available)
                if flight.hasOrthomosaic {
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Orthomosaic Map")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        Button(action: { showingMapViewer = true }) {
                            ZStack {
                                // Placeholder map preview
                                Rectangle()
                                    .fill(AppColors.gray100)
                                    .aspectRatio(16/9, contentMode: .fit)
                                    .cornerRadius(AppSpacing.radiusMedium)
                                    .overlay(
                                        VStack(spacing: AppSpacing.sm) {
                                            Image(systemName: "map.fill")
                                                .font(.system(size: 40))
                                                .foregroundColor(AppColors.primary600)
                                            Text("View Full Map")
                                                .font(AppTypography.bodySemibold)
                                                .foregroundColor(AppColors.primary600)
                                        }
                                    )
                            }
                        }
                    }
                }

                // Flight Statistics
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("Flight Statistics")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textSecondary)

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppSpacing.sm) {
                        StatCard(
                            value: flight.formattedArea,
                            label: "Area Mapped",
                            icon: "square.dashed",
                            color: AppColors.primary600
                        )
                        StatCard(
                            value: "\(flight.imageCount)",
                            label: "Images",
                            icon: "photo.fill",
                            color: AppColors.info
                        )
                        StatCard(
                            value: flight.formattedAltitude,
                            label: "Flight Altitude",
                            icon: "arrow.up.to.line",
                            color: AppColors.success
                        )
                        StatCard(
                            value: flight.formattedResolution,
                            label: "Resolution",
                            icon: "viewfinder",
                            color: AppColors.orange
                        )
                    }
                }

                // Flight Details
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text("Details")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.textSecondary)
                    AppCard {
                        VStack(spacing: AppSpacing.sm) {
                            HStack {
                                Text("Map Type")
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                                Spacer()
                                Text(flight.mapType.displayName)
                                    .font(AppTypography.secondaryMedium)
                                    .foregroundColor(AppColors.textPrimary)
                            }
                            HStack {
                                Text("Flight Date")
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                                Spacer()
                                Text(flight.formattedDate)
                                    .font(AppTypography.secondaryMedium)
                                    .foregroundColor(AppColors.textPrimary)
                            }
                            if let pilotName = flight.pilotName {
                                HStack {
                                    Text("Pilot")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(pilotName)
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                            }
                            if let droneName = flight.droneName {
                                HStack {
                                    Text("Drone")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(droneName)
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                            }
                        }
                    }
                }

                // Actions
                if flight.hasOrthomosaic {
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Actions")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        VStack(spacing: AppSpacing.sm) {
                            Button(action: { showingMapViewer = true }) {
                                HStack {
                                    Image(systemName: "map.fill")
                                        .foregroundColor(AppColors.primary600)
                                    Text("View Orthomosaic Map")
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

                            Button(action: { showingExportOptions = true }) {
                                HStack {
                                    Image(systemName: "square.and.arrow.up")
                                        .foregroundColor(AppColors.success)
                                    Text("Export Map")
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

                            Button(action: { showingCompareView = true }) {
                                HStack {
                                    Image(systemName: "rectangle.on.rectangle")
                                        .foregroundColor(AppColors.purple)
                                    Text("Compare with Previous")
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
                }
            }
            .padding(AppSpacing.md)
        }
        .background(AppColors.background)
        .sheet(isPresented: $showingMapViewer) {
            OrthomosaicMapViewer(flight: flight)
        }
        .sheet(isPresented: $showingExportOptions) {
            ExportOptionsView(flight: flight)
        }
        .sheet(isPresented: $showingCompareView) {
            FlightCompareView(currentFlight: flight, allFlights: viewModel.flights)
        }
    }
}

// MARK: - Map Annotation Model
struct MapAnnotation: Identifiable {
    let id = UUID()
    var position: CGPoint
    var color: Color
    var label: String?

    static let colors: [Color] = [.red, .orange, .yellow, .green, .blue, .purple]
}

// MARK: - Measurement Point
struct MeasurementPoint: Identifiable {
    let id = UUID()
    var position: CGPoint
}

// MARK: - Orthomosaic Map Viewer
struct OrthomosaicMapViewer: View {
    @Environment(\.dismiss) private var dismiss
    let flight: DroneFlight

    // View state
    @State private var zoomScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    @State private var showingLayerOptions = false
    @State private var selectedLayer: MapLayer = .orthomosaic

    // Annotation state
    @State private var annotations: [MapAnnotation] = []
    @State private var showAnnotations = true
    @State private var isAddingAnnotation = false
    @State private var selectedAnnotationColor: Color = .red

    // Measurement state
    @State private var isMeasuring = false
    @State private var measurementPoints: [MeasurementPoint] = []
    @State private var measurementDistance: String?

    // Map size for calculations
    @State private var mapSize: CGSize = .zero

    enum MapLayer: String, CaseIterable {
        case orthomosaic = "Orthomosaic"
        case elevation = "Elevation"
        case contour = "Contour Lines"
        case satellite = "Satellite"
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Map content
                GeometryReader { geometry in
                    ZStack {
                        // Map background
                        mapContent(size: geometry.size)
                            .scaleEffect(zoomScale)
                            .offset(offset)
                            .gesture(mapGestures)
                            .onTapGesture { location in
                                handleMapTap(at: location, in: geometry.size)
                            }
                            .onAppear { mapSize = geometry.size }
                            .onChange(of: geometry.size) { _, newSize in mapSize = newSize }

                        // Annotations layer
                        if showAnnotations {
                            annotationsLayer
                                .scaleEffect(zoomScale)
                                .offset(offset)
                        }

                        // Measurement layer
                        if isMeasuring || !measurementPoints.isEmpty {
                            measurementLayer
                                .scaleEffect(zoomScale)
                                .offset(offset)
                        }
                    }
                }

                // Mode indicator
                if isAddingAnnotation || isMeasuring {
                    VStack {
                        modeIndicator
                        Spacer()
                    }
                }

                // Controls overlay
                VStack {
                    Spacer()
                    mapControls
                }

                // Measurement result
                if let distance = measurementDistance {
                    VStack {
                        Spacer()
                        measurementResultBanner(distance: distance)
                            .padding(.bottom, 100)
                    }
                }
            }
            .background(Color(white: 0.15))
            .navigationTitle(flight.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { showingLayerOptions = true }) {
                        Image(systemName: "square.3.layers.3d")
                            .foregroundColor(.white)
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(.white)
                }
            }
            .toolbarBackground(Color.black.opacity(0.5), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showingLayerOptions) {
                layerOptionsSheet
            }
        }
    }

    // MARK: - Gestures
    private var mapGestures: some Gesture {
        SimultaneousGesture(
            MagnificationGesture()
                .onChanged { value in
                    let newScale = max(1.0, min(5.0, value))
                    zoomScale = newScale
                },
            DragGesture()
                .onChanged { value in
                    offset = CGSize(
                        width: lastOffset.width + value.translation.width,
                        height: lastOffset.height + value.translation.height
                    )
                }
                .onEnded { _ in
                    lastOffset = offset
                }
        )
    }

    // MARK: - Map Tap Handler
    private func handleMapTap(at location: CGPoint, in size: CGSize) {
        // Convert screen location to map coordinates (accounting for zoom and offset)
        let mapX = (location.x - size.width/2 - offset.width) / zoomScale + size.width/2
        let mapY = (location.y - size.height/2 - offset.height) / zoomScale + size.height/2

        if isAddingAnnotation {
            // Add new annotation
            let annotation = MapAnnotation(
                position: CGPoint(x: mapX, y: mapY),
                color: selectedAnnotationColor,
                label: "Pin \(annotations.count + 1)"
            )
            annotations.append(annotation)
        } else if isMeasuring {
            // Add measurement point
            let point = MeasurementPoint(position: CGPoint(x: mapX, y: mapY))
            measurementPoints.append(point)

            // Calculate distance if we have 2 points
            if measurementPoints.count == 2 {
                calculateDistance()
            } else if measurementPoints.count > 2 {
                // Reset and start new measurement
                measurementPoints = [point]
                measurementDistance = nil
            }
        }
    }

    // MARK: - Distance Calculation
    private func calculateDistance() {
        guard measurementPoints.count == 2 else { return }

        let p1 = measurementPoints[0].position
        let p2 = measurementPoints[1].position

        // Calculate pixel distance
        let pixelDistance = sqrt(pow(p2.x - p1.x, 2) + pow(p2.y - p1.y, 2))

        // Convert to real-world distance based on resolution (cm/pixel)
        let metersPerPixel = flight.resolution / 100.0 // Convert cm to meters
        let realDistance = pixelDistance * metersPerPixel

        // Format the distance
        if realDistance < 1 {
            measurementDistance = String(format: "%.1f cm", realDistance * 100)
        } else if realDistance < 1000 {
            measurementDistance = String(format: "%.1f m", realDistance)
        } else {
            measurementDistance = String(format: "%.2f km", realDistance / 1000)
        }
    }

    // MARK: - Map Content
    @ViewBuilder
    private func mapContent(size: CGSize) -> some View {
        ZStack {
            // Satellite-style background based on layer selection
            Canvas { context, canvasSize in
                // Draw a more realistic terrain pattern
                let colors: [Color] = layerColors

                // Create noise-like pattern for terrain
                let cellSize: CGFloat = 8
                let rows = Int(canvasSize.height / cellSize) + 1
                let cols = Int(canvasSize.width / cellSize) + 1

                for row in 0..<rows {
                    for col in 0..<cols {
                        let rect = CGRect(
                            x: CGFloat(col) * cellSize,
                            y: CGFloat(row) * cellSize,
                            width: cellSize,
                            height: cellSize
                        )

                        // Create pseudo-random but deterministic pattern
                        let seed = (row * 137 + col * 149) % 100
                        let colorIndex = seed % colors.count
                        let brightness = 0.7 + Double(seed % 30) / 100.0

                        context.fill(
                            Path(rect),
                            with: .color(colors[colorIndex].opacity(brightness))
                        )
                    }
                }
            }
            .frame(width: size.width, height: size.height)

            // Grid overlay for reference
            Canvas { context, canvasSize in
                let gridSpacing: CGFloat = 100

                // Vertical lines
                var x: CGFloat = 0
                while x <= canvasSize.width {
                    var path = Path()
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: canvasSize.height))
                    context.stroke(path, with: .color(.white.opacity(0.1)), lineWidth: 0.5)
                    x += gridSpacing
                }

                // Horizontal lines
                var y: CGFloat = 0
                while y <= canvasSize.height {
                    var path = Path()
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: canvasSize.width, y: y))
                    context.stroke(path, with: .color(.white.opacity(0.1)), lineWidth: 0.5)
                    y += gridSpacing
                }
            }
            .frame(width: size.width, height: size.height)

            // Flight info overlay - semi-transparent for better map visibility
            VStack {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(selectedLayer.rawValue.uppercased())
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white.opacity(0.8))
                        Text(flight.formattedArea)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                    }
                    .padding(10)
                    .background(Color.black.opacity(0.4))
                    .cornerRadius(10)

                    Spacer()

                    VStack(alignment: .trailing, spacing: 4) {
                        Text("RESOLUTION")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white.opacity(0.8))
                        Text(flight.formattedResolution)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                    }
                    .padding(10)
                    .background(Color.black.opacity(0.4))
                    .cornerRadius(10)
                }
                .padding()

                Spacer()
            }
        }
    }

    private var layerColors: [Color] {
        switch selectedLayer {
        case .orthomosaic:
            return [
                Color(red: 0.2, green: 0.35, blue: 0.2),  // Dark green
                Color(red: 0.25, green: 0.4, blue: 0.25), // Green
                Color(red: 0.3, green: 0.35, blue: 0.25), // Brownish green
                Color(red: 0.35, green: 0.3, blue: 0.2),  // Brown
                Color(red: 0.4, green: 0.4, blue: 0.35),  // Gray
            ]
        case .elevation:
            return [
                Color(red: 0.1, green: 0.2, blue: 0.5),   // Deep blue
                Color(red: 0.2, green: 0.4, blue: 0.3),   // Teal
                Color(red: 0.4, green: 0.5, blue: 0.2),   // Yellow-green
                Color(red: 0.6, green: 0.4, blue: 0.2),   // Orange
                Color(red: 0.5, green: 0.2, blue: 0.2),   // Red-brown
            ]
        case .contour:
            return [
                Color(red: 0.15, green: 0.15, blue: 0.2),
                Color(red: 0.2, green: 0.2, blue: 0.25),
                Color(red: 0.25, green: 0.25, blue: 0.3),
            ]
        case .satellite:
            return [
                Color(red: 0.15, green: 0.25, blue: 0.15),
                Color(red: 0.2, green: 0.3, blue: 0.2),
                Color(red: 0.25, green: 0.25, blue: 0.2),
                Color(red: 0.3, green: 0.3, blue: 0.25),
            ]
        }
    }

    // MARK: - Annotations Layer
    private var annotationsLayer: some View {
        ZStack {
            ForEach(annotations) { annotation in
                annotationPin(annotation)
                    .position(annotation.position)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func annotationPin(_ annotation: MapAnnotation) -> some View {
        VStack(spacing: 0) {
            ZStack {
                // Pin shape
                Image(systemName: "mappin.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(annotation.color)
                    .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 2)
            }
        }
        .onTapGesture {
            // Remove annotation on tap
            if let index = annotations.firstIndex(where: { $0.id == annotation.id }) {
                withAnimation { annotations.remove(at: index) }
            }
        }
    }

    // MARK: - Measurement Layer
    private var measurementLayer: some View {
        ZStack {
            // Draw line between points
            if measurementPoints.count == 2 {
                Canvas { context, _ in
                    var path = Path()
                    path.move(to: measurementPoints[0].position)
                    path.addLine(to: measurementPoints[1].position)
                    context.stroke(path, with: .color(.yellow), style: StrokeStyle(lineWidth: 3, dash: [8, 4]))
                }
            }

            // Draw points
            ForEach(measurementPoints) { point in
                Circle()
                    .fill(.yellow)
                    .frame(width: 16, height: 16)
                    .overlay(Circle().stroke(Color.white, lineWidth: 2))
                    .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
                    .position(point.position)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Mode Indicator
    private var modeIndicator: some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: isAddingAnnotation ? "mappin.and.ellipse" : "ruler")
                .font(.system(size: 18, weight: .semibold))

            Text(isAddingAnnotation ? "Tap to add pin" : "Tap two points to measure")
                .font(AppTypography.bodyMedium)

            Spacer()

            Button("Cancel") {
                isAddingAnnotation = false
                isMeasuring = false
                measurementPoints = []
                measurementDistance = nil
            }
            .font(AppTypography.bodyMedium)
            .padding(.horizontal, AppSpacing.sm)
            .padding(.vertical, AppSpacing.xs)
            .background(Color.white.opacity(0.2))
            .cornerRadius(8)
        }
        .foregroundColor(.white)
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.md)
        .background(isAddingAnnotation ? AppColors.primary600.opacity(0.85) : Color.yellow.opacity(0.85))
    }

    // MARK: - Measurement Result Banner
    private func measurementResultBanner(distance: String) -> some View {
        HStack(spacing: AppSpacing.md) {
            Image(systemName: "ruler")
                .font(.system(size: 22))
            Text(distance)
                .font(.system(size: 26, weight: .bold))

            Spacer()

            Button(action: {
                measurementPoints = []
                measurementDistance = nil
            }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 28))
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .foregroundColor(.black)
        .padding(.horizontal, AppSpacing.lg)
        .padding(.vertical, AppSpacing.md)
        .background(Color.yellow.opacity(0.9))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 4)
        .padding(.horizontal)
    }

    // MARK: - Map Controls
    private var mapControls: some View {
        HStack(spacing: AppSpacing.md) {
            // Zoom controls - vertical stack with larger touch targets
            VStack(spacing: 0) {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        zoomScale = min(5.0, zoomScale + 0.5)
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 56, height: 56)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                Rectangle()
                    .fill(Color.white.opacity(0.3))
                    .frame(width: 40, height: 1)

                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        zoomScale = max(1.0, zoomScale - 0.5)
                    }
                } label: {
                    Image(systemName: "minus")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 56, height: 56)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            .frame(width: 56)
            .background(Color.black.opacity(0.5))
            .cornerRadius(12)

            Spacer()

            // Tool buttons - larger touch targets for field use
            VStack(spacing: AppSpacing.sm) {
                // Add annotation button
                mapToolButton(
                    icon: isAddingAnnotation ? "mappin.circle.fill" : "mappin.circle",
                    isActive: isAddingAnnotation,
                    activeColor: AppColors.primary600
                ) {
                    isAddingAnnotation.toggle()
                    if isAddingAnnotation {
                        isMeasuring = false
                        measurementPoints = []
                        measurementDistance = nil
                    }
                }

                // Measure button
                mapToolButton(
                    icon: isMeasuring ? "ruler.fill" : "ruler",
                    isActive: isMeasuring,
                    activeColor: .yellow
                ) {
                    isMeasuring.toggle()
                    if isMeasuring {
                        isAddingAnnotation = false
                        measurementPoints = []
                        measurementDistance = nil
                    }
                }

                // Toggle annotations visibility
                mapToolButton(
                    icon: showAnnotations ? "eye.fill" : "eye.slash.fill",
                    isActive: false,
                    activeColor: .white
                ) {
                    showAnnotations.toggle()
                }

                // Reset view button
                mapToolButton(
                    icon: "arrow.counterclockwise",
                    isActive: false,
                    activeColor: .white
                ) {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        zoomScale = 1.0
                        offset = .zero
                        lastOffset = .zero
                    }
                }

                // Clear all button
                if !annotations.isEmpty || !measurementPoints.isEmpty {
                    mapToolButton(
                        icon: "trash",
                        isActive: true,
                        activeColor: .red
                    ) {
                        withAnimation {
                            annotations = []
                            measurementPoints = []
                            measurementDistance = nil
                        }
                    }
                }
            }
        }
        .padding()
    }

    private func mapToolButton(icon: String, isActive: Bool, activeColor: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(isActive ? activeColor : .white)
                .frame(width: 56, height: 56)
                .background(Color.black.opacity(0.5))
                .cornerRadius(12)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Layer Options Sheet
    private var layerOptionsSheet: some View {
        NavigationStack {
            List {
                Section("Map Layer") {
                    ForEach(MapLayer.allCases, id: \.self) { layer in
                        Button(action: {
                            selectedLayer = layer
                            showingLayerOptions = false
                        }) {
                            HStack {
                                Text(layer.rawValue)
                                    .foregroundColor(AppColors.textPrimary)
                                Spacer()
                                if selectedLayer == layer {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(AppColors.primary600)
                                }
                            }
                        }
                    }
                }

                Section("Annotations") {
                    HStack {
                        Text("Pin Color")
                        Spacer()
                        ForEach(MapAnnotation.colors, id: \.self) { color in
                            Circle()
                                .fill(color)
                                .frame(width: 28, height: 28)
                                .overlay(
                                    Circle()
                                        .stroke(selectedAnnotationColor == color ? Color.white : Color.clear, lineWidth: 3)
                                )
                                .onTapGesture {
                                    selectedAnnotationColor = color
                                }
                        }
                    }

                    Toggle("Show Annotations", isOn: $showAnnotations)

                    if !annotations.isEmpty {
                        Button(role: .destructive) {
                            annotations = []
                        } label: {
                            Text("Clear All Annotations (\(annotations.count))")
                        }
                    }
                }

                Section("Measurement") {
                    if measurementDistance != nil {
                        HStack {
                            Text("Last Measurement")
                            Spacer()
                            Text(measurementDistance ?? "")
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    Button(role: .destructive) {
                        measurementPoints = []
                        measurementDistance = nil
                    } label: {
                        Text("Clear Measurement")
                    }
                    .disabled(measurementPoints.isEmpty)
                }
            }
            .navigationTitle("Map Options")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { showingLayerOptions = false }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

// MARK: - Export Options View
struct ExportOptionsView: View {
    @Environment(\.dismiss) private var dismiss
    let flight: DroneFlight
    @State private var selectedFormat: ExportFormat = .geotiff
    @State private var selectedResolution: ExportResolution = .full
    @State private var includeAnnotations = true
    @State private var isExporting = false
    @State private var exportComplete = false

    enum ExportFormat: String, CaseIterable {
        case geotiff = "GeoTIFF"
        case jpg = "JPEG"
        case png = "PNG"
        case kmz = "KMZ"
        case pdf = "PDF Report"
    }

    enum ExportResolution: String, CaseIterable {
        case full = "Full Resolution"
        case high = "High (50%)"
        case medium = "Medium (25%)"
        case low = "Low (10%)"
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: AppSpacing.md) {
                        ZStack {
                            Circle()
                                .fill(AppColors.primary600.opacity(0.15))
                                .frame(width: 56, height: 56)
                            Image(systemName: flight.mapType.icon)
                                .font(.system(size: 24))
                                .foregroundColor(AppColors.primary600)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(flight.name)
                                .font(AppTypography.bodySemibold)
                            Text("\(flight.formattedArea) • \(flight.imageCount) images")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                    .listRowBackground(Color.clear)
                }

                Section("Export Format") {
                    ForEach(ExportFormat.allCases, id: \.self) { format in
                        Button(action: { selectedFormat = format }) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(format.rawValue)
                                        .foregroundColor(AppColors.textPrimary)
                                    Text(formatDescription(format))
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textSecondary)
                                }
                                Spacer()
                                if selectedFormat == format {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(AppColors.primary600)
                                }
                            }
                        }
                    }
                }

                Section("Resolution") {
                    ForEach(ExportResolution.allCases, id: \.self) { resolution in
                        Button(action: { selectedResolution = resolution }) {
                            HStack {
                                Text(resolution.rawValue)
                                    .foregroundColor(AppColors.textPrimary)
                                Spacer()
                                if selectedResolution == resolution {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(AppColors.primary600)
                                }
                            }
                        }
                    }
                }

                Section("Options") {
                    Toggle("Include Annotations", isOn: $includeAnnotations)
                }

                Section {
                    Button(action: startExport) {
                        HStack {
                            Spacer()
                            if isExporting {
                                ProgressView()
                                    .tint(.white)
                                Text("Exporting...")
                            } else if exportComplete {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Export Complete!")
                            } else {
                                Image(systemName: "square.and.arrow.up")
                                Text("Export Map")
                            }
                            Spacer()
                        }
                        .font(AppTypography.bodyMedium)
                        .foregroundColor(.white)
                        .padding(.vertical, AppSpacing.sm)
                    }
                    .listRowBackground(exportComplete ? AppColors.success : AppColors.primary600)
                    .disabled(isExporting)
                }
            }
            .navigationTitle("Export Map")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func formatDescription(_ format: ExportFormat) -> String {
        switch format {
        case .geotiff: return "Georeferenced image with coordinates"
        case .jpg: return "Compressed image, smaller file size"
        case .png: return "Lossless quality, larger file size"
        case .kmz: return "Google Earth compatible"
        case .pdf: return "Printable report with details"
        }
    }

    private func startExport() {
        isExporting = true
        // Simulate export process
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            isExporting = false
            exportComplete = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                dismiss()
            }
        }
    }
}

// MARK: - Flight Compare View
struct FlightCompareView: View {
    @Environment(\.dismiss) private var dismiss
    let currentFlight: DroneFlight
    let allFlights: [DroneFlight]
    @State private var selectedComparisonFlight: DroneFlight?
    @State private var comparisonMode: ComparisonMode = .sideBySide
    @State private var sliderPosition: CGFloat = 0.5

    enum ComparisonMode: String, CaseIterable {
        case sideBySide = "Side by Side"
        case swipe = "Swipe"
        case overlay = "Overlay"
    }

    private var comparableFlights: [DroneFlight] {
        allFlights.filter { $0.id != currentFlight.id && $0.hasOrthomosaic && $0.projectId == currentFlight.projectId }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if comparableFlights.isEmpty {
                    noFlightsToCompare
                } else if let comparisonFlight = selectedComparisonFlight {
                    comparisonView(comparisonFlight)
                } else {
                    flightSelector
                }
            }
            .background(AppColors.background)
            .navigationTitle("Compare Flights")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if selectedComparisonFlight != nil {
                        Button("Change") {
                            selectedComparisonFlight = nil
                        }
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private var noFlightsToCompare: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "rectangle.on.rectangle.slash")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray400)
            Text("No Flights to Compare")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("There are no other completed flights for this project to compare with.")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(AppSpacing.xl)
    }

    private var flightSelector: some View {
        List {
            Section("Current Flight") {
                flightRow(currentFlight, isCurrent: true)
            }

            Section("Compare With") {
                ForEach(comparableFlights) { flight in
                    Button(action: { selectedComparisonFlight = flight }) {
                        flightRow(flight, isCurrent: false)
                    }
                }
            }
        }
    }

    private func flightRow(_ flight: DroneFlight, isCurrent: Bool) -> some View {
        HStack(spacing: AppSpacing.md) {
            ZStack {
                Circle()
                    .fill(flight.mapType.icon == "map.fill" ? AppColors.primary600.opacity(0.15) : AppColors.info.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: flight.mapType.icon)
                    .font(.system(size: 20))
                    .foregroundColor(flight.mapType.icon == "map.fill" ? AppColors.primary600 : AppColors.info)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(flight.name)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
                Text(flight.formattedDate)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }

            Spacer()

            if isCurrent {
                Text("Current")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.primary600)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(AppColors.primary600.opacity(0.1))
                    .cornerRadius(4)
            } else {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12))
                    .foregroundColor(AppColors.gray400)
            }
        }
    }

    @ViewBuilder
    private func comparisonView(_ comparisonFlight: DroneFlight) -> some View {
        VStack(spacing: 0) {
            // Mode selector
            Picker("Mode", selection: $comparisonMode) {
                ForEach(ComparisonMode.allCases, id: \.self) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding()

            // Comparison content
            GeometryReader { geometry in
                switch comparisonMode {
                case .sideBySide:
                    sideBySideView(geometry: geometry, comparisonFlight: comparisonFlight)
                case .swipe:
                    swipeView(geometry: geometry, comparisonFlight: comparisonFlight)
                case .overlay:
                    overlayView(geometry: geometry, comparisonFlight: comparisonFlight)
                }
            }

            // Flight info footer
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(currentFlight.formattedDate)
                        .font(AppTypography.captionMedium)
                        .foregroundColor(AppColors.primary600)
                    Text(currentFlight.name)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }
                Spacer()
                Image(systemName: "arrow.left.arrow.right")
                    .foregroundColor(AppColors.gray400)
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(comparisonFlight.formattedDate)
                        .font(AppTypography.captionMedium)
                        .foregroundColor(AppColors.purple)
                    Text(comparisonFlight.name)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
            .padding()
            .background(AppColors.cardBackground)
        }
    }

    private func sideBySideView(geometry: GeometryProxy, comparisonFlight: DroneFlight) -> some View {
        HStack(spacing: 2) {
            mapPlaceholder(flight: currentFlight, color: AppColors.primary600)
                .frame(width: geometry.size.width / 2 - 1)
            mapPlaceholder(flight: comparisonFlight, color: AppColors.purple)
                .frame(width: geometry.size.width / 2 - 1)
        }
    }

    private func swipeView(geometry: GeometryProxy, comparisonFlight: DroneFlight) -> some View {
        let sliderX = geometry.size.width * sliderPosition

        return ZStack {
            mapPlaceholder(flight: comparisonFlight, color: AppColors.purple)

            mapPlaceholder(flight: currentFlight, color: AppColors.primary600)
                .mask(
                    Rectangle()
                        .frame(width: sliderX)
                        .frame(maxWidth: .infinity, alignment: .leading)
                )

            // Slider handle - positioned absolutely
            Rectangle()
                .fill(Color.white)
                .frame(width: 4, height: geometry.size.height)
                .overlay(
                    Circle()
                        .fill(Color.white)
                        .frame(width: 48, height: 48)
                        .shadow(color: .black.opacity(0.3), radius: 6, x: 0, y: 2)
                        .overlay(
                            Image(systemName: "arrow.left.arrow.right")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(AppColors.gray600)
                        )
                )
                .position(x: sliderX, y: geometry.size.height / 2)
        }
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    // Use the absolute location in the parent view
                    let newPosition = value.location.x / geometry.size.width
                    sliderPosition = max(0.05, min(0.95, newPosition))
                }
        )
    }

    private func overlayView(geometry: GeometryProxy, comparisonFlight: DroneFlight) -> some View {
        ZStack {
            mapPlaceholder(flight: currentFlight, color: AppColors.primary600)
            mapPlaceholder(flight: comparisonFlight, color: AppColors.purple)
                .opacity(0.5)
        }
    }

    private func mapPlaceholder(flight: DroneFlight, color: Color) -> some View {
        ZStack {
            // Grid pattern
            Canvas { context, size in
                let gridSize: CGFloat = 40
                let rows = Int(size.height / gridSize) + 1
                let cols = Int(size.width / gridSize) + 1

                for row in 0..<rows {
                    for col in 0..<cols {
                        let rect = CGRect(
                            x: CGFloat(col) * gridSize,
                            y: CGFloat(row) * gridSize,
                            width: gridSize,
                            height: gridSize
                        )
                        let brightness = Double((row + col) % 3) * 0.15 + 0.2
                        context.fill(
                            Path(rect),
                            with: .color(color.opacity(brightness))
                        )
                    }
                }
            }

            VStack {
                Text(flight.name)
                    .font(AppTypography.captionMedium)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(color.opacity(0.8))
                    .cornerRadius(4)
            }
        }
    }
}

// MARK: - Models

enum CaptureStatus: String, CaseIterable {
    case uploading
    case processing
    case complete
    case failed

    var displayName: String {
        switch self {
        case .uploading: return "Uploading"
        case .processing: return "Processing"
        case .complete: return "Complete"
        case .failed: return "Failed"
        }
    }

    var color: Color {
        switch self {
        case .uploading: return AppColors.info
        case .processing: return AppColors.warning
        case .complete: return AppColors.success
        case .failed: return AppColors.error
        }
    }

    var icon: String {
        switch self {
        case .uploading: return "arrow.up.circle.fill"
        case .processing: return "gearshape.fill"
        case .complete: return "checkmark.circle.fill"
        case .failed: return "xmark.circle.fill"
        }
    }

    var badgeStatus: BadgeStatus {
        switch self {
        case .uploading: return .info
        case .processing: return .pending
        case .complete: return .active
        case .failed: return .warning
        }
    }
}

enum DroneMapType: String, CaseIterable {
    case orthomosaic
    case elevation
    case thermal
    case ndvi
    case threeD = "3D"

    var displayName: String {
        switch self {
        case .orthomosaic: return "Orthomosaic"
        case .elevation: return "Elevation"
        case .thermal: return "Thermal"
        case .ndvi: return "NDVI"
        case .threeD: return "3D Model"
        }
    }

    var icon: String {
        switch self {
        case .orthomosaic: return "map.fill"
        case .elevation: return "mountain.2.fill"
        case .thermal: return "thermometer.sun.fill"
        case .ndvi: return "leaf.fill"
        case .threeD: return "cube.fill"
        }
    }
}

struct DroneFlight: Identifiable {
    let id: String
    let name: String
    let projectId: String
    let projectName: String
    let status: CaptureStatus
    let mapType: DroneMapType
    let flightDate: Date
    let areaMapped: Double // in acres
    let imageCount: Int
    let altitude: Double // in feet
    let resolution: Double // in cm/pixel
    let processingProgress: Double // 0-1
    let hasOrthomosaic: Bool
    let orthomosaicUrl: String?
    let pilotName: String?
    let droneName: String?
    let createdAt: Date
    let updatedAt: Date

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: flightDate)
    }

    var formattedArea: String {
        if areaMapped < 1 {
            return String(format: "%.2f acres", areaMapped)
        } else {
            return String(format: "%.1f acres", areaMapped)
        }
    }

    var formattedAltitude: String {
        return "\(Int(altitude)) ft"
    }

    var formattedResolution: String {
        return String(format: "%.1f cm/px", resolution)
    }
}

// MARK: - Mock Data
extension DroneFlight {
    static let mockFlights: [DroneFlight] = [
        DroneFlight(
            id: "1",
            name: "Site Survey - Phase 1",
            projectId: "proj-1",
            projectName: "Downtown Plaza",
            status: .complete,
            mapType: .orthomosaic,
            flightDate: Date().addingTimeInterval(-86400 * 2),
            areaMapped: 12.5,
            imageCount: 847,
            altitude: 200,
            resolution: 2.1,
            processingProgress: 1.0,
            hasOrthomosaic: true,
            orthomosaicUrl: "https://example.com/map1",
            pilotName: "John Smith",
            droneName: "DJI Phantom 4 RTK",
            createdAt: Date().addingTimeInterval(-86400 * 3),
            updatedAt: Date().addingTimeInterval(-86400 * 2)
        ),
        DroneFlight(
            id: "2",
            name: "Foundation Progress",
            projectId: "proj-1",
            projectName: "Downtown Plaza",
            status: .processing,
            mapType: .elevation,
            flightDate: Date().addingTimeInterval(-86400),
            areaMapped: 8.3,
            imageCount: 523,
            altitude: 150,
            resolution: 1.8,
            processingProgress: 0.65,
            hasOrthomosaic: false,
            orthomosaicUrl: nil,
            pilotName: "John Smith",
            droneName: "DJI Mavic 3 Enterprise",
            createdAt: Date().addingTimeInterval(-86400 * 2),
            updatedAt: Date()
        ),
        DroneFlight(
            id: "3",
            name: "Thermal Inspection",
            projectId: "proj-2",
            projectName: "Riverside Apartments",
            status: .complete,
            mapType: .thermal,
            flightDate: Date().addingTimeInterval(-86400 * 5),
            areaMapped: 4.2,
            imageCount: 312,
            altitude: 100,
            resolution: 3.5,
            processingProgress: 1.0,
            hasOrthomosaic: true,
            orthomosaicUrl: "https://example.com/map2",
            pilotName: "Sarah Johnson",
            droneName: "DJI Matrice 300 RTK",
            createdAt: Date().addingTimeInterval(-86400 * 6),
            updatedAt: Date().addingTimeInterval(-86400 * 5)
        ),
        DroneFlight(
            id: "4",
            name: "Weekly Progress Update",
            projectId: "proj-3",
            projectName: "Harbor Industrial",
            status: .uploading,
            mapType: .orthomosaic,
            flightDate: Date(),
            areaMapped: 18.7,
            imageCount: 1024,
            altitude: 250,
            resolution: 2.5,
            processingProgress: 0.0,
            hasOrthomosaic: false,
            orthomosaicUrl: nil,
            pilotName: "Mike Davis",
            droneName: "DJI Phantom 4 RTK",
            createdAt: Date(),
            updatedAt: Date()
        ),
        DroneFlight(
            id: "5",
            name: "3D Site Model",
            projectId: "proj-2",
            projectName: "Riverside Apartments",
            status: .complete,
            mapType: .threeD,
            flightDate: Date().addingTimeInterval(-86400 * 10),
            areaMapped: 6.8,
            imageCount: 1256,
            altitude: 180,
            resolution: 1.5,
            processingProgress: 1.0,
            hasOrthomosaic: true,
            orthomosaicUrl: "https://example.com/map3",
            pilotName: "Sarah Johnson",
            droneName: "DJI Mavic 3 Enterprise",
            createdAt: Date().addingTimeInterval(-86400 * 11),
            updatedAt: Date().addingTimeInterval(-86400 * 9)
        ),
        DroneFlight(
            id: "6",
            name: "Vegetation Analysis",
            projectId: "proj-4",
            projectName: "Green Valley Park",
            status: .failed,
            mapType: .ndvi,
            flightDate: Date().addingTimeInterval(-86400 * 3),
            areaMapped: 0,
            imageCount: 156,
            altitude: 120,
            resolution: 0,
            processingProgress: 0.35,
            hasOrthomosaic: false,
            orthomosaicUrl: nil,
            pilotName: "John Smith",
            droneName: "DJI Phantom 4 RTK",
            createdAt: Date().addingTimeInterval(-86400 * 4),
            updatedAt: Date().addingTimeInterval(-86400 * 3)
        )
    ]
}

// MARK: - ViewModel
@MainActor
class DroneDeployViewModel: ObservableObject {
    @Published var flights: [DroneFlight] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    // Stats
    var totalFlights: Int {
        flights.count
    }

    var completedCount: Int {
        flights.filter { $0.status == .complete }.count
    }

    var processingCount: Int {
        flights.filter { $0.status == .processing }.count
    }

    var failedCount: Int {
        flights.filter { $0.status == .failed }.count
    }

    var totalAreaMapped: Double {
        flights.filter { $0.status == .complete }.reduce(0) { $0 + $1.areaMapped }
    }

    var formattedAreaMapped: String {
        if totalAreaMapped < 1 {
            return String(format: "%.2f ac", totalAreaMapped)
        } else if totalAreaMapped < 100 {
            return String(format: "%.1f ac", totalAreaMapped)
        } else {
            return "\(Int(totalAreaMapped)) ac"
        }
    }

    func fetchFlights() async {
        isLoading = true
        defer { isLoading = false }

        // TODO: Fetch from DroneDeploy API when integration is available
        // Currently no API endpoint - flights list will be empty until API is implemented
        flights = []
    }

    func refresh() {
        Task {
            await fetchFlights()
        }
    }

    func filteredFlights(search: String, status: CaptureStatus?) -> [DroneFlight] {
        var result = flights

        if let status = status {
            result = result.filter { $0.status == status }
        }

        if !search.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(search) ||
                $0.projectName.localizedCaseInsensitiveContains(search) ||
                ($0.pilotName?.localizedCaseInsensitiveContains(search) ?? false) ||
                ($0.droneName?.localizedCaseInsensitiveContains(search) ?? false)
            }
        }

        return result.sorted { $0.flightDate > $1.flightDate }
    }
}

#Preview {
    DroneDeployView()
}
