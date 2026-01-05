//
//  SubcontractorsView.swift
//  ConstructionManager
//
//  Subcontractors list and management view
//

import SwiftUI
import Combine

struct SubcontractorsView: View {
    @StateObject private var viewModel = SubcontractorsViewModel()
    @State private var searchText = ""
    @State private var selectedStatus: SubcontractorStatus?
    @State private var showingNewSubcontractor = false
    @State private var selectedSubcontractor: Subcontractor?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                searchBar

                // Filters
                filterSection

                // Stats Summary
                statsSummary

                // Subcontractors List
                ScrollView {
                    if viewModel.isLoading && viewModel.subcontractors.isEmpty {
                        ProgressView()
                            .padding(.top, AppSpacing.xl)
                    } else if viewModel.filteredSubcontractors(search: searchText, status: selectedStatus).isEmpty {
                        emptyState
                    } else {
                        LazyVStack(spacing: AppSpacing.sm) {
                            ForEach(viewModel.filteredSubcontractors(search: searchText, status: selectedStatus)) { subcontractor in
                                SubcontractorCard(subcontractor: subcontractor)
                                    .onTapGesture {
                                        selectedSubcontractor = subcontractor
                                    }
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
            }
            .background(AppColors.background)
            .navigationTitle("Subcontractors")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingNewSubcontractor = true }) {
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(AppColors.primary600)
                    }
                }
            }
            .sheet(isPresented: $showingNewSubcontractor, onDismiss: {
                Task { await viewModel.fetchSubcontractors(force: true) }
            }) {
                NewSubcontractorView()
            }
            .sheet(item: $selectedSubcontractor) { subcontractor in
                SubcontractorDetailView(subcontractor: subcontractor)
            }
            .task {
                await viewModel.fetchSubcontractors()
            }
            .refreshable {
                await viewModel.fetchSubcontractors(force: true)
            }
        }
    }

    private var searchBar: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.gray400)
            TextField("Search by company or contact...", text: $searchText)
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
                ForEach(SubcontractorStatus.allCases, id: \.self) { status in
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
            SubcontractorStatBadge(
                count: viewModel.activeCount,
                label: "Active",
                color: AppColors.success
            )
            SubcontractorStatBadge(
                count: viewModel.expiringCertsCount,
                label: "Expiring Certs",
                color: AppColors.warning
            )
            SubcontractorStatBadge(
                count: viewModel.suspendedCount,
                label: "Suspended",
                color: AppColors.error
            )
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.xs)
    }

    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "person.2.fill")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray400)
            Text("No Subcontractors")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("Add subcontractors to manage your vendor relationships")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
            PrimaryButton("Add Subcontractor", icon: "plus") {
                showingNewSubcontractor = true
            }
            .padding(.top, AppSpacing.sm)
        }
        .padding(AppSpacing.xl)
    }
}

// MARK: - Subcontractor Stat Badge
struct SubcontractorStatBadge: View {
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

// MARK: - Subcontractor Card
struct SubcontractorCard: View {
    let subcontractor: Subcontractor

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(subcontractor.companyName)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        if let contactName = subcontractor.contactName {
                            Text(contactName)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                    Spacer()
                    StatusBadge(
                        text: subcontractor.status.displayName,
                        status: subcontractor.status.badgeStatus
                    )
                }

                // Trades
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: AppSpacing.xs) {
                        ForEach(subcontractor.trades, id: \.self) { trade in
                            TradeBadge(trade: trade)
                        }
                    }
                }

                Divider()

                // Stats Row
                HStack(spacing: AppSpacing.lg) {
                    if let rating = subcontractor.rating {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating))
                                .font(AppTypography.secondaryMedium)
                                .foregroundColor(AppColors.textPrimary)
                        }
                    }

                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "folder.fill")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text("\(subcontractor.projectCount) projects")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }

                    Spacer()

                    // Alerts
                    if subcontractor.hasExpiringCertifications {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.warning)
                            Text("\(subcontractor.expiringCertifications.count) cert\(subcontractor.expiringCertifications.count > 1 ? "s" : "") expiring")
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.warning)
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

// MARK: - Trade Badge
struct TradeBadge: View {
    let trade: String

    private var tradeEnum: Trade? {
        Trade.allCases.first { $0.rawValue.lowercased() == trade.lowercased() }
    }

    var body: some View {
        HStack(spacing: AppSpacing.xxs) {
            Image(systemName: tradeEnum?.icon ?? "wrench.fill")
                .font(.system(size: 10))
            Text(trade)
                .font(AppTypography.caption)
        }
        .padding(.horizontal, AppSpacing.sm)
        .padding(.vertical, AppSpacing.xxs)
        .foregroundColor(tradeEnum?.color ?? AppColors.primary600)
        .background((tradeEnum?.color ?? AppColors.primary600).opacity(0.1))
        .cornerRadius(AppSpacing.radiusFull)
    }
}

// MARK: - Subcontractor Detail View
struct SubcontractorDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let subcontractor: Subcontractor

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // Header Card
                    AppCard {
                        VStack(alignment: .leading, spacing: AppSpacing.md) {
                            HStack {
                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text(subcontractor.companyName)
                                        .font(AppTypography.heading3)
                                        .foregroundColor(AppColors.textPrimary)
                                    if let contactName = subcontractor.contactName {
                                        Text(contactName)
                                            .font(AppTypography.secondary)
                                            .foregroundColor(AppColors.textSecondary)
                                    }
                                }
                                Spacer()
                                StatusBadge(
                                    text: subcontractor.status.displayName,
                                    status: subcontractor.status.badgeStatus
                                )
                            }

                            if let rating = subcontractor.rating {
                                HStack(spacing: AppSpacing.xxs) {
                                    ForEach(0..<5) { index in
                                        Image(systemName: index < Int(rating) ? "star.fill" : (Double(index) < rating ? "star.leadinghalf.filled" : "star"))
                                            .font(.system(size: 16))
                                            .foregroundColor(.yellow)
                                    }
                                    Text(String(format: "%.1f", rating))
                                        .font(AppTypography.bodyMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                            }

                            // Trades
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: AppSpacing.xs) {
                                    ForEach(subcontractor.trades, id: \.self) { trade in
                                        TradeBadge(trade: trade)
                                    }
                                }
                            }
                        }
                    }

                    // Contact Info
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Contact Information")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            VStack(spacing: AppSpacing.sm) {
                                if let email = subcontractor.email {
                                    contactRow(icon: "envelope.fill", value: email)
                                }
                                if let phone = subcontractor.phone {
                                    contactRow(icon: "phone.fill", value: phone)
                                }
                                if let fullAddress = subcontractor.fullAddress {
                                    contactRow(icon: "location.fill", value: fullAddress)
                                }
                            }
                        }
                    }

                    // License & Insurance
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("License & Insurance")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            VStack(spacing: AppSpacing.sm) {
                                if let licenseNumber = subcontractor.licenseNumber {
                                    HStack {
                                        Text("License")
                                            .font(AppTypography.secondary)
                                            .foregroundColor(AppColors.textSecondary)
                                        Spacer()
                                        Text(licenseNumber)
                                            .font(AppTypography.secondaryMedium)
                                            .foregroundColor(AppColors.textPrimary)
                                    }
                                }
                                if let insuranceExpiry = subcontractor.insuranceExpiry {
                                    HStack {
                                        Text("Insurance Expires")
                                            .font(AppTypography.secondary)
                                            .foregroundColor(AppColors.textSecondary)
                                        Spacer()
                                        Text(formatDate(insuranceExpiry))
                                            .font(AppTypography.secondaryMedium)
                                            .foregroundColor(subcontractor.isInsuranceExpired ? AppColors.error : (subcontractor.isInsuranceExpiringSoon ? AppColors.warning : AppColors.textPrimary))
                                    }
                                }
                            }
                        }
                    }

                    // Expiring Certifications
                    if !subcontractor.expiringCertifications.isEmpty {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            HStack {
                                Text("Expiring Certifications")
                                    .font(AppTypography.label)
                                    .foregroundColor(AppColors.textSecondary)
                                Spacer()
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(AppColors.warning)
                            }
                            AppCard {
                                VStack(spacing: AppSpacing.sm) {
                                    ForEach(subcontractor.expiringCertifications) { cert in
                                        HStack {
                                            Text(cert.certName)
                                                .font(AppTypography.body)
                                                .foregroundColor(AppColors.textPrimary)
                                            Spacer()
                                            Text(formatDate(cert.expiryDate))
                                                .font(AppTypography.secondary)
                                                .foregroundColor(cert.status == "EXPIRED" ? AppColors.error : AppColors.warning)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Notes
                    if let notes = subcontractor.notes, !notes.isEmpty {
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

                    // Stats
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Statistics")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        HStack(spacing: AppSpacing.sm) {
                            StatCard(
                                value: String(subcontractor.projectCount),
                                label: "Projects",
                                icon: "folder.fill",
                                color: AppColors.primary600
                            )
                            StatCard(
                                value: String(subcontractor.certificationCount),
                                label: "Certifications",
                                icon: "checkmark.seal.fill",
                                color: AppColors.success
                            )
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Subcontractor Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func contactRow(icon: String, value: String) -> some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(AppColors.primary600)
                .frame(width: 20)
            Text(value)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textPrimary)
            Spacer()
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }
}

// MARK: - New Subcontractor View
struct NewSubcontractorView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var subcontractorService = SubcontractorService.shared
    @State private var companyName = ""
    @State private var contactName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var address = ""
    @State private var city = ""
    @State private var state = ""
    @State private var zip = ""
    @State private var selectedTrades: Set<Trade> = []
    @State private var licenseNumber = ""
    @State private var notes = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Company Info
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("Company Information")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(label: "Company Name", placeholder: "Enter company name", text: $companyName, isRequired: true)
                        AppTextField(label: "Contact Name", placeholder: "Primary contact", text: $contactName)
                        AppTextField(label: "Email", placeholder: "email@company.com", text: $email)
                        AppTextField(label: "Phone", placeholder: "(555) 123-4567", text: $phone)
                    }

                    // Address
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("Address")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(label: "Street Address", placeholder: "123 Main St", text: $address)
                        HStack(spacing: AppSpacing.sm) {
                            AppTextField(label: "City", placeholder: "City", text: $city)
                            AppTextField(label: "State", placeholder: "CA", text: $state)
                                .frame(width: 80)
                            AppTextField(label: "ZIP", placeholder: "12345", text: $zip)
                                .frame(width: 100)
                        }
                    }

                    // Trades
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("Trades *")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120))], spacing: AppSpacing.xs) {
                            ForEach(Trade.allCases, id: \.self) { trade in
                                Button(action: {
                                    if selectedTrades.contains(trade) {
                                        selectedTrades.remove(trade)
                                    } else {
                                        selectedTrades.insert(trade)
                                    }
                                }) {
                                    HStack(spacing: AppSpacing.xxs) {
                                        Image(systemName: trade.icon)
                                            .font(.system(size: 12))
                                        Text(trade.rawValue)
                                            .font(AppTypography.caption)
                                    }
                                    .padding(.horizontal, AppSpacing.sm)
                                    .padding(.vertical, AppSpacing.xs)
                                    .foregroundColor(selectedTrades.contains(trade) ? .white : trade.color)
                                    .background(selectedTrades.contains(trade) ? trade.color : trade.color.opacity(0.1))
                                    .cornerRadius(AppSpacing.radiusFull)
                                }
                            }
                        }
                    }

                    // License & Notes
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("Additional Information")
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(label: "License Number", placeholder: "C-10 #123456", text: $licenseNumber)
                        AppTextArea(label: "Notes", placeholder: "Additional notes about this subcontractor...", text: $notes)
                    }

                    // Error message
                    if let error = errorMessage {
                        Text(error)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.error)
                            .padding(AppSpacing.sm)
                            .frame(maxWidth: .infinity)
                            .background(AppColors.error.opacity(0.1))
                            .cornerRadius(AppSpacing.radiusSmall)
                    }

                    // Submit
                    PrimaryButton("Add Subcontractor", icon: "plus.circle.fill", isLoading: isSubmitting) {
                        Task {
                            await createSubcontractor()
                        }
                    }
                    .disabled(companyName.isEmpty || selectedTrades.isEmpty || isSubmitting)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("New Subcontractor")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func createSubcontractor() async {
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }

        do {
            let trades = selectedTrades.map { $0.rawValue }
            _ = try await subcontractorService.createSubcontractor(
                companyName: companyName,
                contactName: contactName.isEmpty ? nil : contactName,
                email: email.isEmpty ? nil : email,
                phone: phone.isEmpty ? nil : phone,
                address: address.isEmpty ? nil : address,
                city: city.isEmpty ? nil : city,
                state: state.isEmpty ? nil : state,
                zip: zip.isEmpty ? nil : zip,
                trades: trades,
                licenseNumber: licenseNumber.isEmpty ? nil : licenseNumber,
                notes: notes.isEmpty ? nil : notes
            )
            dismiss()
        } catch {
            errorMessage = "Failed to create subcontractor: \(error.localizedDescription)"
        }
    }
}

// MARK: - ViewModel
@MainActor
class SubcontractorsViewModel: ObservableObject {
    @Published var subcontractors: [Subcontractor] = []
    @Published var isLoading = false

    private let subcontractorService = SubcontractorService.shared

    var activeCount: Int {
        subcontractors.filter { $0.status == .active }.count
    }

    var expiringCertsCount: Int {
        subcontractors.filter { $0.hasExpiringCertifications }.count
    }

    var suspendedCount: Int {
        subcontractors.filter { $0.status == .suspended }.count
    }

    func fetchSubcontractors(force: Bool = false) async {
        isLoading = true
        defer { isLoading = false }

        await subcontractorService.fetchSubcontractors(force: force)
        subcontractors = subcontractorService.subcontractors
    }

    func filteredSubcontractors(search: String, status: SubcontractorStatus?) -> [Subcontractor] {
        var result = subcontractors

        if let status = status {
            result = result.filter { $0.status == status }
        }

        if !search.isEmpty {
            result = result.filter {
                $0.companyName.localizedCaseInsensitiveContains(search) ||
                ($0.contactName?.localizedCaseInsensitiveContains(search) ?? false) ||
                ($0.email?.localizedCaseInsensitiveContains(search) ?? false)
            }
        }

        return result.sorted { $0.companyName < $1.companyName }
    }
}

#Preview {
    SubcontractorsView()
}
