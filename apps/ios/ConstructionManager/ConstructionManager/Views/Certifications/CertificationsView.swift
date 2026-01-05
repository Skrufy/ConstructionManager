//
//  CertificationsView.swift
//  ConstructionManager
//
//  Certifications and licenses list view
//

import SwiftUI

struct CertificationsView: View {
    @StateObject private var certService = CertificationService.shared
    @State private var selectedFilter: CertificationFilter = .all
    @State private var selectedType: CertificationType?
    @State private var showingNewCertification = false
    @State private var selectedCertification: Certification?

    enum CertificationFilter: String, CaseIterable {
        case all = "All"
        case valid = "Valid"
        case expiring = "Expiring"
        case expired = "Expired"
    }

    private var filteredCertifications: [Certification] {
        var result = certService.certifications

        // Filter by status
        switch selectedFilter {
        case .all: break
        case .valid: result = result.filter { $0.status == .valid }
        case .expiring: result = result.filter { $0.status == .expiringSoon }
        case .expired: result = result.filter { $0.status == .expired }
        }

        // Filter by type
        if let type = selectedType {
            result = result.filter { $0.type == type }
        }

        return result.sorted { ($0.expirationDate ?? .distantFuture) < ($1.expirationDate ?? .distantFuture) }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Stats Bar
            statsBar

            // Filters
            filterBar

            // Content
            if certService.isLoading && certService.certifications.isEmpty {
                loadingView
            } else if filteredCertifications.isEmpty {
                emptyView
            } else {
                certificationsList
            }
        }
        .background(AppColors.background)
        .navigationTitle("Certifications")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showingNewCertification = true }) {
                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(AppColors.primary600)
                }
            }
        }
        .sheet(isPresented: $showingNewCertification) {
            NewCertificationView()
        }
        .sheet(item: $selectedCertification) { cert in
            CertificationDetailView(certification: cert)
        }
        .task {
            await certService.fetchCertifications()
        }
    }

    private var statsBar: some View {
        HStack(spacing: AppSpacing.sm) {
            StatPill(count: certService.validCount, label: "Valid", color: AppColors.success)
            StatPill(count: certService.expiringCount, label: "Expiring", color: AppColors.warning)
            StatPill(count: certService.expiredCount, label: "Expired", color: AppColors.error)
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.sm)
    }

    private var filterBar: some View {
        VStack(spacing: AppSpacing.xs) {
            // Status filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    ForEach(CertificationFilter.allCases, id: \.self) { filter in
                        FilterChip(title: filter.rawValue, isSelected: selectedFilter == filter) {
                            selectedFilter = filter
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
            }

            // Type filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    FilterChip(title: "All Types", isSelected: selectedType == nil) {
                        selectedType = nil
                    }
                    ForEach(CertificationType.allCases, id: \.self) { type in
                        FilterChip(title: type.displayName, isSelected: selectedType == type) {
                            selectedType = type
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
            }
        }
        .padding(.vertical, AppSpacing.xs)
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
            Image(systemName: "checkmark.seal")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray300)
            Text("No Certifications")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text("Add certifications to track expiration dates")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
            PrimaryButton("Add Certification", icon: "plus") {
                showingNewCertification = true
            }
            .padding(.top, AppSpacing.sm)
            Spacer()
        }
        .padding(AppSpacing.xl)
    }

    private var certificationsList: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.sm) {
                ForEach(filteredCertifications) { cert in
                    CertificationCard(certification: cert)
                        .onTapGesture {
                            selectedCertification = cert
                        }
                }
            }
            .padding(AppSpacing.md)
        }
        .refreshable {
            await certService.fetchCertifications()
        }
    }
}

// MARK: - Stat Pill
struct StatPill: View {
    let count: Int
    let label: String
    let color: Color

    var body: some View {
        HStack(spacing: AppSpacing.xxs) {
            Text("\(count)")
                .font(AppTypography.bodySemibold)
                .foregroundColor(color)
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .padding(.horizontal, AppSpacing.sm)
        .padding(.vertical, AppSpacing.xs)
        .background(color.opacity(0.1))
        .cornerRadius(AppSpacing.radiusFull)
    }
}

// MARK: - Certification Card
struct CertificationCard: View {
    let certification: Certification

    private var statusColor: Color {
        switch certification.status {
        case .valid: return AppColors.success
        case .expiringSoon: return AppColors.warning
        case .expired: return AppColors.error
        case .pendingRenewal: return AppColors.info
        }
    }

    private var expirationText: String {
        if let days = certification.daysUntilExpiration {
            if days < 0 {
                return "Expired \(abs(days)) days ago"
            } else if days == 0 {
                return "Expires today"
            } else if days == 1 {
                return "Expires tomorrow"
            } else {
                return "Expires in \(days) days"
            }
        }
        return "No expiration"
    }

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                // Icon
                ZStack {
                    Circle()
                        .fill(statusColor.opacity(0.15))
                        .frame(width: 44, height: 44)
                    Image(systemName: certification.type.icon)
                        .font(.system(size: 18))
                        .foregroundColor(statusColor)
                }

                // Content
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    HStack {
                        Text(certification.type.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(statusColor)
                            .padding(.horizontal, AppSpacing.xs)
                            .padding(.vertical, 2)
                            .background(statusColor.opacity(0.15))
                            .cornerRadius(4)
                        Spacer()
                        Text(certification.status.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(statusColor)
                    }

                    Text(certification.name)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)

                    if let authority = certification.issuingAuthority {
                        Text(authority)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                            .lineLimit(1)
                    }

                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "calendar")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                        Text(expirationText)
                            .font(AppTypography.caption)
                            .foregroundColor(certification.isExpired ? AppColors.error : AppColors.textTertiary)
                    }
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.gray400)
            }
        }
    }
}

// MARK: - New Certification View
struct NewCertificationView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var certService = CertificationService.shared

    // Form State
    @State private var selectedType: CertificationType = .certification
    @State private var certName = ""
    @State private var issuingAuthority = ""
    @State private var certificationNumber = ""
    @State private var issueDate = Date()
    @State private var hasIssueDate = false
    @State private var expirationDate = Date()
    @State private var hasExpirationDate = false
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var isFormValid: Bool {
        !certName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Type Selection
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("Type")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: AppSpacing.sm) {
                            ForEach(CertificationType.allCases, id: \.self) { type in
                                CertTypeButton(
                                    type: type,
                                    isSelected: selectedType == type
                                ) {
                                    selectedType = type
                                }
                            }
                        }
                    }

                    // Certification Name
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Name *")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        TextField("e.g., OSHA 30-Hour Construction", text: $certName)
                            .font(AppTypography.body)
                            .padding(AppSpacing.md)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                    }

                    // Issuing Authority
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Issuing Authority")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        TextField("e.g., OSHA, State Licensing Board", text: $issuingAuthority)
                            .font(AppTypography.body)
                            .padding(AppSpacing.md)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                    }

                    // Certification Number
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Certification Number")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        TextField("e.g., CERT-12345", text: $certificationNumber)
                            .font(AppTypography.body)
                            .padding(AppSpacing.md)
                            .background(AppColors.cardBackground)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                    }

                    // Issue Date
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Toggle(isOn: $hasIssueDate) {
                            Text("Issue Date")
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                        }
                        .toggleStyle(SwitchToggleStyle(tint: AppColors.primary600))

                        if hasIssueDate {
                            DatePicker("", selection: $issueDate, displayedComponents: .date)
                                .datePickerStyle(CompactDatePickerStyle())
                                .labelsHidden()
                                .padding(AppSpacing.sm)
                                .background(AppColors.cardBackground)
                                .cornerRadius(AppSpacing.radiusMedium)
                        }
                    }

                    // Expiration Date
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Toggle(isOn: $hasExpirationDate) {
                            Text("Expiration Date")
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                        }
                        .toggleStyle(SwitchToggleStyle(tint: AppColors.primary600))

                        if hasExpirationDate {
                            DatePicker("", selection: $expirationDate, displayedComponents: .date)
                                .datePickerStyle(CompactDatePickerStyle())
                                .labelsHidden()
                                .padding(AppSpacing.sm)
                                .background(AppColors.cardBackground)
                                .cornerRadius(AppSpacing.radiusMedium)
                        }
                    }

                    // Notes
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Notes")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)

                        TextEditor(text: $notes)
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
                        isSaving ? "Saving..." : "Add Certification",
                        icon: "checkmark.seal"
                    ) {
                        Task { await saveCertification() }
                    }
                    .disabled(!isFormValid || isSaving)
                    .opacity(isFormValid && !isSaving ? 1 : 0.6)
                    .padding(.top, AppSpacing.sm)
                }
                .padding(AppSpacing.lg)
            }
            .background(AppColors.background)
            .navigationTitle("Add Certification")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func saveCertification() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        let cert = Certification(
            id: UUID().uuidString,
            userId: nil,
            subcontractorId: nil,
            type: selectedType,
            name: certName.trimmingCharacters(in: .whitespaces),
            issuingAuthority: issuingAuthority.isEmpty ? nil : issuingAuthority,
            certificationNumber: certificationNumber.isEmpty ? nil : certificationNumber,
            issueDate: hasIssueDate ? issueDate : nil,
            expirationDate: hasExpirationDate ? expirationDate : nil,
            documentUrl: nil,
            notes: notes.isEmpty ? nil : notes,
            createdAt: Date(),
            updatedAt: Date()
        )

        let success = await certService.createCertification(cert)

        if success {
            dismiss()
        } else {
            errorMessage = certService.error ?? "Failed to save certification"
        }
    }
}

// MARK: - Cert Type Button
struct CertTypeButton: View {
    let type: CertificationType
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: AppSpacing.xs) {
                Image(systemName: type.icon)
                    .font(.system(size: 24))
                    .foregroundColor(isSelected ? AppColors.primary600 : AppColors.gray500)
                Text(type.displayName)
                    .font(AppTypography.caption)
                    .foregroundColor(isSelected ? AppColors.primary600 : AppColors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(AppSpacing.md)
            .background(isSelected ? AppColors.primary100 : AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(isSelected ? AppColors.primary600 : AppColors.gray200, lineWidth: isSelected ? 2 : 1)
            )
        }
    }
}

// MARK: - Certification Detail View (Placeholder)
struct CertificationDetailView: View {
    let certification: Certification
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    Text(certification.name)
                        .font(AppTypography.heading2)
                    Text(certification.type.displayName)
                        .font(AppTypography.secondary)
                    if let authority = certification.issuingAuthority {
                        Text("Issued by: \(authority)")
                    }
                    if let number = certification.certificationNumber {
                        Text("Number: \(number)")
                    }
                }
                .padding()
            }
            .navigationTitle("Certification Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        CertificationsView()
    }
}
