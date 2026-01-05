//
//  MaterialsView.swift
//  ConstructionManager
//
//  Materials inventory and tracking view
//

import SwiftUI
import Combine

struct MaterialsView: View {
    @StateObject private var viewModel = MaterialsViewModel()
    @EnvironmentObject var appState: AppState
    @State private var searchText = ""
    @State private var selectedCategory: MaterialCategory?
    @State private var selectedStatus: MaterialStatus?
    @State private var showingNewMaterial = false
    @State private var selectedMaterial: Material?

    private var canManageMaterials: Bool {
        appState.hasPermission(.manageEquipment) // Reusing equipment permission for materials
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

                // Materials List
                ScrollView {
                    if viewModel.isLoading && viewModel.materials.isEmpty {
                        ProgressView()
                            .padding(.top, AppSpacing.xl)
                    } else if viewModel.filteredMaterials(search: searchText, category: selectedCategory, status: selectedStatus).isEmpty {
                        emptyState
                    } else {
                        LazyVStack(spacing: AppSpacing.sm) {
                            ForEach(viewModel.filteredMaterials(search: searchText, category: selectedCategory, status: selectedStatus)) { material in
                                MaterialCard(material: material)
                                    .onTapGesture {
                                        selectedMaterial = material
                                    }
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
            }
            .background(AppColors.background)
            .navigationTitle("materials.title".localized)
            .toolbar {
                if canManageMaterials {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button(action: { showingNewMaterial = true }) {
                            Image(systemName: "plus")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(AppColors.primary600)
                        }
                    }
                }
            }
            .sheet(isPresented: $showingNewMaterial, onDismiss: {
                Task { await viewModel.fetchMaterials(force: true) }
            }) {
                NewMaterialView(viewModel: viewModel)
            }
            .sheet(item: $selectedMaterial) { material in
                MaterialDetailView(material: material, viewModel: viewModel)
            }
            .task {
                await viewModel.fetchMaterials()
            }
            .refreshable {
                await viewModel.fetchMaterials(force: true)
            }
        }
    }

    private var searchBar: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.gray400)
            TextField("materials.searchPlaceholder".localized, text: $searchText)
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
        VStack(spacing: AppSpacing.xs) {
            // Category filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "common.all".localized, isSelected: selectedCategory == nil) {
                        selectedCategory = nil
                    }
                    ForEach(MaterialCategory.allCases, id: \.self) { category in
                        FilterChip(
                            title: category.displayName,
                            isSelected: selectedCategory == category
                        ) {
                            selectedCategory = category
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
            }

            // Status filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "materials.allStatus".localized, isSelected: selectedStatus == nil) {
                        selectedStatus = nil
                    }
                    ForEach(MaterialStatus.allCases, id: \.self) { status in
                        FilterChip(
                            title: status.displayName,
                            isSelected: selectedStatus == status
                        ) {
                            selectedStatus = status
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
            }
        }
        .padding(.vertical, AppSpacing.xs)
    }

    private var statsSummary: some View {
        HStack(spacing: AppSpacing.sm) {
            MaterialStatBadge(
                count: viewModel.inStockCount,
                label: "materials.inStock".localized,
                color: AppColors.success
            )
            MaterialStatBadge(
                count: viewModel.lowStockCount,
                label: "materials.lowStock".localized,
                color: AppColors.warning
            )
            MaterialStatBadge(
                count: viewModel.outOfStockCount,
                label: "materials.outOfStock".localized,
                color: AppColors.error
            )
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.xs)
    }

    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "shippingbox.fill")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray400)
            Text("materials.noMaterialsTitle".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("materials.addToTrack".localized)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
            if canManageMaterials {
                PrimaryButton("materials.add".localized, icon: "plus") {
                    showingNewMaterial = true
                }
                .padding(.top, AppSpacing.sm)
            }
        }
        .padding(AppSpacing.xl)
    }
}

// MARK: - Material Stat Badge
struct MaterialStatBadge: View {
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

// MARK: - Material Card
struct MaterialCard: View {
    let material: Material

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    // Icon
                    ZStack {
                        Circle()
                            .fill(categoryColor.opacity(0.15))
                            .frame(width: 44, height: 44)
                        Image(systemName: material.category.icon)
                            .font(.system(size: 20))
                            .foregroundColor(categoryColor)
                    }

                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(material.name)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        Text(material.category.displayName)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    Spacer()
                    StatusBadge(
                        text: material.status.displayName,
                        status: material.status.badgeStatus
                    )
                }

                Divider()

                // Stats Row
                HStack(spacing: AppSpacing.lg) {
                    // Quantity
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "number")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text("\(Int(material.quantityOnHand)) \(material.unit)")
                            .font(AppTypography.caption)
                            .foregroundColor(material.isLowStock || material.isOutOfStock ? AppColors.warning : AppColors.textTertiary)
                    }

                    // Cost per unit
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "dollarsign.circle")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text(material.formattedCost)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }

                    // Total value
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "banknote")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.success)
                        Text(material.formattedTotalValue)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.success)
                    }

                    Spacer()

                    // Project indicator
                    if let projectName = material.projectName {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "folder.fill")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.info)
                            Text(projectName)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textTertiary)
                                .lineLimit(1)
                        }
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
    }

    private var categoryColor: Color {
        switch material.category {
        case .lumber: return AppColors.orange
        case .concrete: return AppColors.gray500
        case .steel: return AppColors.info
        case .electrical: return AppColors.warning
        case .plumbing: return AppColors.info
        case .hvac: return AppColors.purple
        case .roofing: return AppColors.error
        case .drywall: return AppColors.gray400
        case .paint: return AppColors.purple
        case .flooring: return AppColors.orange
        case .hardware: return AppColors.gray500
        case .safety: return AppColors.error
        case .other: return AppColors.textSecondary
        }
    }
}

// MARK: - Material Detail View
struct MaterialDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let material: Material
    @ObservedObject var viewModel: MaterialsViewModel
    @State private var showingOrderSheet = false

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
                                        .fill(AppColors.orange.opacity(0.15))
                                        .frame(width: 56, height: 56)
                                    Image(systemName: material.category.icon)
                                        .font(.system(size: 24))
                                        .foregroundColor(AppColors.orange)
                                }

                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text(material.name)
                                        .font(AppTypography.heading3)
                                        .foregroundColor(AppColors.textPrimary)
                                    Text(material.category.displayName)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                }
                                Spacer()
                            }

                            // Status
                            HStack {
                                Text("materials.status".localized)
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                                Spacer()
                                StatusBadge(
                                    text: material.status.displayName,
                                    status: material.status.badgeStatus
                                )
                            }
                        }
                    }

                    // Inventory Info
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("materials.inventory".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            VStack(spacing: AppSpacing.sm) {
                                HStack {
                                    Text("materials.quantityOnHand".localized)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text("\(Int(material.quantityOnHand)) \(material.unit)")
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(material.isLowStock ? AppColors.warning : AppColors.textPrimary)
                                }
                                Divider()
                                HStack {
                                    Text("materials.minimumQuantity".localized)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text("\(Int(material.minimumQuantity)) \(material.unit)")
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                                Divider()
                                HStack {
                                    Text("materials.costPerUnit".localized)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(material.formattedCost)
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                                Divider()
                                HStack {
                                    Text("materials.totalValue".localized)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(material.formattedTotalValue)
                                        .font(AppTypography.heading3)
                                        .foregroundColor(AppColors.success)
                                }
                            }
                        }
                    }

                    // Supplier Info
                    if material.supplier != nil || material.sku != nil {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("materials.supplier".localized)
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                VStack(spacing: AppSpacing.sm) {
                                    if let supplier = material.supplier {
                                        HStack {
                                            HStack(spacing: AppSpacing.xs) {
                                                Image(systemName: "building.2.fill")
                                                    .foregroundColor(AppColors.info)
                                                Text("materials.supplier".localized)
                                                    .font(AppTypography.secondary)
                                                    .foregroundColor(AppColors.textSecondary)
                                            }
                                            Spacer()
                                            Text(supplier)
                                                .font(AppTypography.secondaryMedium)
                                                .foregroundColor(AppColors.textPrimary)
                                        }
                                    }

                                    if let sku = material.sku {
                                        HStack {
                                            HStack(spacing: AppSpacing.xs) {
                                                Image(systemName: "barcode")
                                                    .foregroundColor(AppColors.gray500)
                                                Text("materials.sku".localized)
                                                    .font(AppTypography.secondary)
                                                    .foregroundColor(AppColors.textSecondary)
                                            }
                                            Spacer()
                                            Text(sku)
                                                .font(AppTypography.secondaryMedium)
                                                .foregroundColor(AppColors.textPrimary)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Location
                    if let location = material.location {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("materials.storageLocation".localized)
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                HStack {
                                    Image(systemName: "mappin.circle.fill")
                                        .foregroundColor(AppColors.error)
                                    Text(location)
                                        .font(AppTypography.body)
                                        .foregroundColor(AppColors.textPrimary)
                                    Spacer()
                                }
                            }
                        }
                    }

                    // Project
                    if let projectName = material.projectName {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("materials.assignedProject".localized)
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                HStack {
                                    Image(systemName: "folder.fill")
                                        .foregroundColor(AppColors.primary600)
                                    Text(projectName)
                                        .font(AppTypography.body)
                                        .foregroundColor(AppColors.textPrimary)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12))
                                        .foregroundColor(AppColors.gray400)
                                }
                            }
                        }
                    }

                    // Notes
                    if let notes = material.notes {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("materials.notes".localized)
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                Text(notes)
                                    .font(AppTypography.body)
                                    .foregroundColor(AppColors.textPrimary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }

                    // Actions
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("materials.actions".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        VStack(spacing: AppSpacing.sm) {
                            Button(action: { showingOrderSheet = true }) {
                                HStack {
                                    Image(systemName: "cart.fill")
                                        .foregroundColor(AppColors.primary600)
                                    Text("materials.orderMore".localized)
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

                            Button(action: { /* Log usage */ }) {
                                HStack {
                                    Image(systemName: "minus.circle.fill")
                                        .foregroundColor(AppColors.warning)
                                    Text("materials.logUsage".localized)
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

                    // Timestamps
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("materials.detailsSection".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            VStack(spacing: AppSpacing.sm) {
                                if let lastOrderDate = material.lastOrderDate {
                                    HStack {
                                        Text("materials.lastOrdered".localized)
                                            .font(AppTypography.secondary)
                                            .foregroundColor(AppColors.textSecondary)
                                        Spacer()
                                        Text(formatDate(lastOrderDate))
                                            .font(AppTypography.secondaryMedium)
                                            .foregroundColor(AppColors.textPrimary)
                                    }
                                }
                                if let lastDelivery = material.lastDeliveryDate {
                                    HStack {
                                        Text("materials.lastDelivery".localized)
                                            .font(AppTypography.secondary)
                                            .foregroundColor(AppColors.textSecondary)
                                        Spacer()
                                        Text(formatDate(lastDelivery))
                                            .font(AppTypography.secondaryMedium)
                                            .foregroundColor(AppColors.textPrimary)
                                    }
                                }
                                HStack {
                                    Text("materials.created".localized)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(formatDate(material.createdAt))
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
            .navigationTitle("materials.details".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.done".localized) { dismiss() }
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

// MARK: - New Material View
struct NewMaterialView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: MaterialsViewModel
    @State private var name = ""
    @State private var description = ""
    @State private var selectedCategory: MaterialCategory = .other
    @State private var sku = ""
    @State private var unit = "each"
    @State private var quantityOnHand = ""
    @State private var minimumQuantity = ""
    @State private var costPerUnit = ""
    @State private var supplier = ""
    @State private var location = ""
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private let unitOptions = ["each", "linear ft", "sq ft", "cubic yard", "gallon", "lb", "box", "bundle", "sheet", "10ft stick"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Basic Info
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("materials.information".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(label: "materials.name".localized, placeholder: "materials.namePlaceholder".localized, text: $name, isRequired: true)

                        AppTextArea(label: "materials.description".localized, placeholder: "materials.descriptionPlaceholder".localized, text: $description)

                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("\("materials.category".localized) *")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: AppSpacing.xs) {
                                    ForEach(MaterialCategory.allCases, id: \.self) { category in
                                        Button(action: { selectedCategory = category }) {
                                            HStack(spacing: AppSpacing.xxs) {
                                                Image(systemName: category.icon)
                                                    .font(.system(size: 14))
                                                Text(category.displayName)
                                                    .font(AppTypography.caption)
                                            }
                                            .padding(.horizontal, AppSpacing.sm)
                                            .padding(.vertical, AppSpacing.xs)
                                            .foregroundColor(selectedCategory == category ? .white : AppColors.textPrimary)
                                            .background(selectedCategory == category ? AppColors.primary600 : AppColors.gray100)
                                            .cornerRadius(AppSpacing.radiusMedium)
                                        }
                                    }
                                }
                            }
                        }

                        AppTextField(label: "materials.sku".localized, placeholder: "materials.skuPlaceholder".localized, text: $sku)
                    }

                    // Inventory
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("materials.inventory".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("\("materials.unitOfMeasure".localized) *")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: AppSpacing.xs) {
                                    ForEach(unitOptions, id: \.self) { unitOption in
                                        Button(action: { unit = unitOption }) {
                                            Text(unitOption)
                                                .font(AppTypography.caption)
                                                .padding(.horizontal, AppSpacing.sm)
                                                .padding(.vertical, AppSpacing.xs)
                                                .foregroundColor(unit == unitOption ? .white : AppColors.textPrimary)
                                                .background(unit == unitOption ? AppColors.primary600 : AppColors.gray100)
                                                .cornerRadius(AppSpacing.radiusMedium)
                                        }
                                    }
                                }
                            }
                        }

                        HStack(spacing: AppSpacing.md) {
                            AppTextField(label: "materials.quantityOnHand".localized, placeholder: "materials.quantityPlaceholder".localized, text: $quantityOnHand, isRequired: true)
                            AppTextField(label: "materials.minimumQty".localized, placeholder: "materials.quantityPlaceholder".localized, text: $minimumQuantity)
                        }

                        AppTextField(label: "materials.costPerUnitLabel".localized, placeholder: "materials.costPlaceholder".localized, text: $costPerUnit, isRequired: true)
                    }

                    // Supplier & Location
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("materials.supplierStorage".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(label: "materials.supplier".localized, placeholder: "materials.supplierPlaceholder".localized, text: $supplier)
                        AppTextField(label: "materials.storageLocation".localized, placeholder: "materials.locationPlaceholder".localized, text: $location)
                    }

                    // Notes
                    AppTextArea(label: "materials.notes".localized, placeholder: "materials.notesPlaceholder".localized, text: $notes)

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
                    PrimaryButton("materials.add".localized, icon: "plus.circle.fill", isLoading: isSaving) {
                        Task {
                            await saveMaterial()
                        }
                    }
                    .disabled(name.isEmpty || quantityOnHand.isEmpty || costPerUnit.isEmpty)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("materials.new".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }

    private func saveMaterial() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            _ = try await viewModel.createMaterial(
                name: name,
                description: description.isEmpty ? nil : description,
                category: selectedCategory,
                sku: sku.isEmpty ? nil : sku,
                unit: unit,
                quantityOnHand: Double(quantityOnHand) ?? 0,
                minimumQuantity: Double(minimumQuantity) ?? 0,
                costPerUnit: Double(costPerUnit) ?? 0,
                supplier: supplier.isEmpty ? nil : supplier,
                location: location.isEmpty ? nil : location,
                notes: notes.isEmpty ? nil : notes
            )
            dismiss()
        } catch {
            errorMessage = "Failed to create material: \(error.localizedDescription)"
        }
    }
}

// MARK: - ViewModel
@MainActor
class MaterialsViewModel: ObservableObject {
    @Published var materials: [Material] = []
    @Published var isLoading = false
    @Published var error: String?

    private let materialsService = MaterialsService.shared
    private var lastFetchTime: Date?
    private let minFetchInterval: TimeInterval = 2.0

    var inStockCount: Int {
        materialsService.stats?.inStock ?? materials.filter { $0.status == .inStock }.count
    }

    var lowStockCount: Int {
        materialsService.stats?.lowStock ?? materials.filter { $0.status == .lowStock || $0.isLowStock }.count
    }

    var outOfStockCount: Int {
        materialsService.stats?.outOfStock ?? materials.filter { $0.status == .outOfStock || $0.isOutOfStock }.count
    }

    func fetchMaterials(force: Bool = false) async {
        // Prevent rapid repeated fetches
        guard !isLoading else { return }
        if !force, let lastFetch = lastFetchTime, Date().timeIntervalSince(lastFetch) < minFetchInterval {
            return
        }

        isLoading = true
        lastFetchTime = Date()
        defer { isLoading = false }

        await materialsService.fetchMaterials()
        self.materials = materialsService.materials
        self.error = materialsService.error
    }

    func filteredMaterials(search: String, category: MaterialCategory?, status: MaterialStatus?) -> [Material] {
        var result = materials

        if let category = category {
            result = result.filter { $0.category == category }
        }

        if let status = status {
            result = result.filter { $0.status == status }
        }

        if !search.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(search) ||
                $0.category.displayName.localizedCaseInsensitiveContains(search) ||
                ($0.sku?.localizedCaseInsensitiveContains(search) ?? false) ||
                ($0.supplier?.localizedCaseInsensitiveContains(search) ?? false)
            }
        }

        return result.sorted { $0.name < $1.name }
    }

    func createMaterial(
        name: String,
        description: String?,
        category: MaterialCategory,
        sku: String?,
        unit: String,
        quantityOnHand: Double,
        minimumQuantity: Double,
        costPerUnit: Double,
        supplier: String?,
        location: String?,
        notes: String?
    ) async throws -> Material {
        let newMaterial = try await materialsService.createMaterial(
            name: name,
            description: description,
            category: category,
            sku: sku,
            unit: unit,
            quantityOnHand: quantityOnHand,
            minimumQuantity: minimumQuantity,
            costPerUnit: costPerUnit,
            supplier: supplier,
            location: location,
            notes: notes
        )

        // Refresh the local list from service
        self.materials = materialsService.materials

        return newMaterial
    }
}

#Preview {
    MaterialsView()
        .environmentObject(AppState())
}
