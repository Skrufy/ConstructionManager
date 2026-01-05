//
//  ApprovalsView.swift
//  ConstructionManager
//
//  Approvals management for timesheets, expenses, change orders, etc.
//

import SwiftUI
import Combine

struct ApprovalsView: View {
    @StateObject private var viewModel = ApprovalsViewModel()
    @State private var selectedTab = 0
    @State private var selectedApproval: ApprovalItem?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Picker
                Picker("View", selection: $selectedTab) {
                    Text("Pending").tag(0)
                    Text("Approved").tag(1)
                    Text("Rejected").tag(2)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)

                // Stats Summary
                statsSummary

                // Approvals List
                ScrollView {
                    if viewModel.isLoading && viewModel.approvals.isEmpty {
                        ProgressView()
                            .padding(.top, AppSpacing.xl)
                    } else if filteredApprovals.isEmpty {
                        emptyState
                    } else {
                        LazyVStack(spacing: AppSpacing.sm) {
                            ForEach(filteredApprovals) { approval in
                                ApprovalCard(approval: approval)
                                    .onTapGesture {
                                        selectedApproval = approval
                                    }
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
            }
            .background(AppColors.background)
            .navigationTitle("Approvals")
            .sheet(item: $selectedApproval) { approval in
                ApprovalDetailView(approval: approval, viewModel: viewModel)
            }
            .task {
                await viewModel.fetchApprovals()
            }
            .refreshable {
                await viewModel.fetchApprovals()
            }
        }
    }

    private var filteredApprovals: [ApprovalItem] {
        switch selectedTab {
        case 0: return viewModel.approvals.filter { $0.status == .pending }
        case 1: return viewModel.approvals.filter { $0.status == .approved }
        case 2: return viewModel.approvals.filter { $0.status == .rejected }
        default: return viewModel.approvals
        }
    }

    private var statsSummary: some View {
        HStack(spacing: AppSpacing.sm) {
            ApprovalStatBadge(
                count: viewModel.pendingCount,
                label: "Pending",
                color: AppColors.warning
            )
            ApprovalStatBadge(
                count: viewModel.approvedThisWeekCount,
                label: "Approved",
                color: AppColors.success
            )
            ApprovalStatBadge(
                count: viewModel.urgentCount,
                label: "Urgent",
                color: AppColors.error
            )
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, AppSpacing.xs)
    }

    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray400)
            Text(selectedTab == 0 ? "No Pending Approvals" : selectedTab == 1 ? "No Approved Items" : "No Rejected Items")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text(selectedTab == 0 ? "All items have been reviewed" : "No items in this category")
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(AppSpacing.xl)
    }
}

// MARK: - Approval Stat Badge
struct ApprovalStatBadge: View {
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

// MARK: - Approval Card
struct ApprovalCard: View {
    let approval: ApprovalItem

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header
                HStack {
                    // Type Icon
                    ZStack {
                        Circle()
                            .fill(approval.type.color.opacity(0.15))
                            .frame(width: 40, height: 40)
                        Image(systemName: approval.type.icon)
                            .font(.system(size: 18))
                            .foregroundColor(approval.type.color)
                    }

                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(approval.type.displayName)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        Text(approval.submittedByName)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    Spacer()

                    VStack(alignment: .trailing, spacing: AppSpacing.xxs) {
                        if let amount = approval.amount {
                            Text(formatCurrency(amount))
                                .font(AppTypography.bodySemibold)
                                .foregroundColor(AppColors.textPrimary)
                        }
                        StatusBadge(
                            text: approval.status.rawValue.capitalized,
                            status: approval.status.badgeStatus
                        )
                    }
                }

                // Description
                Text(approval.title)
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)
                    .lineLimit(2)

                Divider()

                // Footer
                HStack {
                    if let projectName = approval.projectName {
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

                    if approval.isUrgent {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.system(size: 12))
                            Text("Urgent")
                                .font(AppTypography.captionMedium)
                        }
                        .foregroundColor(AppColors.error)
                    }

                    Text(formatDate(approval.submittedAt))
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

// MARK: - Approval Detail View
struct ApprovalDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let approval: ApprovalItem
    @ObservedObject var viewModel: ApprovalsViewModel
    @State private var isApproving = false
    @State private var isRejecting = false
    @State private var rejectionReason = ""
    @State private var showingRejectionSheet = false

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
                                        .fill(approval.type.color.opacity(0.15))
                                        .frame(width: 56, height: 56)
                                    Image(systemName: approval.type.icon)
                                        .font(.system(size: 24))
                                        .foregroundColor(approval.type.color)
                                }

                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text(approval.type.displayName)
                                        .font(AppTypography.heading3)
                                        .foregroundColor(AppColors.textPrimary)
                                    Text(approval.title)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                }
                                Spacer()
                            }

                            if let amount = approval.amount {
                                HStack {
                                    Text("Amount")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(formatCurrency(amount))
                                        .font(AppTypography.heading3)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                            }

                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Status")
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.textTertiary)
                                    StatusBadge(
                                        text: approval.status.rawValue.capitalized,
                                        status: approval.status.badgeStatus
                                    )
                                }
                                Spacer()
                                if approval.isUrgent {
                                    VStack(alignment: .trailing, spacing: 2) {
                                        Text("Priority")
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.textTertiary)
                                        HStack(spacing: 2) {
                                            Image(systemName: "exclamationmark.circle.fill")
                                                .font(.system(size: 12))
                                            Text("Urgent")
                                                .font(AppTypography.secondaryMedium)
                                        }
                                        .foregroundColor(AppColors.error)
                                    }
                                }
                            }
                        }
                    }

                    // Details
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("Details")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)
                        AppCard {
                            VStack(spacing: AppSpacing.sm) {
                                HStack {
                                    Text("Submitted By")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(approval.submittedByName)
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                                HStack {
                                    Text("Submitted")
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(formatFullDate(approval.submittedAt))
                                        .font(AppTypography.secondaryMedium)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                                if let projectName = approval.projectName {
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
                            }
                        }
                    }

                    // Description
                    if let description = approval.description {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("Description")
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)
                            AppCard {
                                Text(description)
                                    .font(AppTypography.body)
                                    .foregroundColor(AppColors.textPrimary)
                            }
                        }
                    }

                    // Actions (only for pending)
                    if approval.status == .pending {
                        VStack(spacing: AppSpacing.sm) {
                            PrimaryButton("Approve", icon: "checkmark.circle.fill", isLoading: isApproving) {
                                Task {
                                    await approve()
                                }
                            }

                            DestructiveButton("Reject", icon: "xmark.circle.fill", isLoading: isRejecting) {
                                showingRejectionSheet = true
                            }
                        }
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Approval Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showingRejectionSheet) {
                rejectionSheet
            }
        }
    }

    private var rejectionSheet: some View {
        NavigationStack {
            VStack(spacing: AppSpacing.lg) {
                AppTextArea(
                    label: "Reason for Rejection",
                    placeholder: "Please provide a reason for rejecting this item...",
                    text: $rejectionReason,
                    isRequired: true
                )

                DestructiveButton("Confirm Rejection", icon: "xmark.circle.fill", isLoading: isRejecting) {
                    Task {
                        await reject()
                    }
                }
                .disabled(rejectionReason.isEmpty)

                Spacer()
            }
            .padding(AppSpacing.md)
            .navigationTitle("Reject Approval")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { showingRejectionSheet = false }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func approve() async {
        isApproving = true
        defer { isApproving = false }

        do {
            try await viewModel.approveItem(approval.id)
            dismiss()
        } catch {
            print("Failed to approve: \(error)")
        }
    }

    private func reject() async {
        isRejecting = true
        defer { isRejecting = false }

        do {
            try await viewModel.rejectItem(approval.id, reason: rejectionReason)
            showingRejectionSheet = false
            dismiss()
        } catch {
            print("Failed to reject: \(error)")
        }
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }

    private func formatFullDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy 'at' h:mm a"
        return formatter.string(from: date)
    }
}

// MARK: - Approval Item Model
struct ApprovalItem: Identifiable {
    let id: String
    let type: ApprovalType
    let title: String
    let description: String?
    let amount: Double?
    let status: ApprovalStatus
    let submittedByName: String
    let submittedById: String
    let submittedAt: Date
    let projectId: String?
    let projectName: String?
    let isUrgent: Bool
    let reviewedAt: Date?
    let reviewedByName: String?
    let rejectionReason: String?
}

enum ApprovalType: String, CaseIterable {
    case timesheet
    case expense
    case purchaseOrder
    case changeOrder
    case invoice

    var displayName: String {
        switch self {
        case .timesheet: return "Timesheet"
        case .expense: return "Expense"
        case .purchaseOrder: return "Purchase Order"
        case .changeOrder: return "Change Order"
        case .invoice: return "Invoice"
        }
    }

    var icon: String {
        switch self {
        case .timesheet: return "clock.fill"
        case .expense: return "dollarsign.circle.fill"
        case .purchaseOrder: return "cart.fill"
        case .changeOrder: return "arrow.triangle.2.circlepath"
        case .invoice: return "doc.text.fill"
        }
    }

    var color: Color {
        switch self {
        case .timesheet: return AppColors.info
        case .expense: return AppColors.success
        case .purchaseOrder: return AppColors.orange
        case .changeOrder: return AppColors.warning
        case .invoice: return AppColors.primary600
        }
    }
}

enum ApprovalStatus: String, CaseIterable {
    case pending
    case approved
    case rejected

    var badgeStatus: BadgeStatus {
        switch self {
        case .pending: return .pending
        case .approved: return .completed
        case .rejected: return .warning
        }
    }
}

// MARK: - Mock Data
extension ApprovalItem {
    static var mockApprovals: [ApprovalItem] {
        [
            ApprovalItem(
                id: "1",
                type: .timesheet,
                title: "Weekly Timesheet - Nov 18-22",
                description: "Regular work hours for the week",
                amount: nil,
                status: .pending,
                submittedByName: "Mike Johnson",
                submittedById: "user1",
                submittedAt: Date().addingTimeInterval(-86400),
                projectId: "proj1",
                projectName: "Downtown Office Tower",
                isUrgent: false,
                reviewedAt: nil,
                reviewedByName: nil,
                rejectionReason: nil
            ),
            ApprovalItem(
                id: "2",
                type: .expense,
                title: "Equipment Rental - Excavator",
                description: "Rental for foundation work",
                amount: 2500.00,
                status: .pending,
                submittedByName: "Sarah Smith",
                submittedById: "user2",
                submittedAt: Date().addingTimeInterval(-172800),
                projectId: "proj1",
                projectName: "Downtown Office Tower",
                isUrgent: true,
                reviewedAt: nil,
                reviewedByName: nil,
                rejectionReason: nil
            ),
            ApprovalItem(
                id: "3",
                type: .changeOrder,
                title: "Additional Electrical Work",
                description: "Client requested additional outlets in conference rooms",
                amount: 8750.00,
                status: .pending,
                submittedByName: "John Davis",
                submittedById: "user3",
                submittedAt: Date().addingTimeInterval(-259200),
                projectId: "proj2",
                projectName: "Riverside Apartments",
                isUrgent: true,
                reviewedAt: nil,
                reviewedByName: nil,
                rejectionReason: nil
            ),
            ApprovalItem(
                id: "4",
                type: .purchaseOrder,
                title: "Concrete Materials",
                description: "Ready-mix concrete for Phase 2",
                amount: 15000.00,
                status: .approved,
                submittedByName: "Mike Johnson",
                submittedById: "user1",
                submittedAt: Date().addingTimeInterval(-432000),
                projectId: "proj1",
                projectName: "Downtown Office Tower",
                isUrgent: false,
                reviewedAt: Date().addingTimeInterval(-345600),
                reviewedByName: "Admin User",
                rejectionReason: nil
            ),
            ApprovalItem(
                id: "5",
                type: .expense,
                title: "Safety Equipment",
                description: "Harnesses and fall protection gear",
                amount: 1200.00,
                status: .rejected,
                submittedByName: "Sarah Smith",
                submittedById: "user2",
                submittedAt: Date().addingTimeInterval(-518400),
                projectId: "proj1",
                projectName: "Downtown Office Tower",
                isUrgent: false,
                reviewedAt: Date().addingTimeInterval(-432000),
                reviewedByName: "Admin User",
                rejectionReason: "Please use approved vendor for safety equipment"
            )
        ]
    }
}

// MARK: - ViewModel
@MainActor
class ApprovalsViewModel: ObservableObject {
    @Published var approvals: [ApprovalItem] = []
    @Published var isLoading = false

    var pendingCount: Int {
        approvals.filter { $0.status == .pending }.count
    }

    var approvedThisWeekCount: Int {
        let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        return approvals.filter { $0.status == .approved && ($0.reviewedAt ?? Date()) >= weekAgo }.count
    }

    var urgentCount: Int {
        approvals.filter { $0.status == .pending && $0.isUrgent }.count
    }

    func fetchApprovals() async {
        isLoading = true
        defer { isLoading = false }

        // TODO: Fetch from API when available
        // Currently no API endpoint - approvals list will be empty until API is implemented
        approvals = []
    }

    func approveItem(_ id: String) async throws {
        // TODO: Call API to approve
        try await Task.sleep(nanoseconds: 500_000_000)
        if let index = approvals.firstIndex(where: { $0.id == id }) {
            let item = approvals[index]
            approvals[index] = ApprovalItem(
                id: item.id,
                type: item.type,
                title: item.title,
                description: item.description,
                amount: item.amount,
                status: .approved,
                submittedByName: item.submittedByName,
                submittedById: item.submittedById,
                submittedAt: item.submittedAt,
                projectId: item.projectId,
                projectName: item.projectName,
                isUrgent: item.isUrgent,
                reviewedAt: Date(),
                reviewedByName: "You",
                rejectionReason: nil
            )
        }
    }

    func rejectItem(_ id: String, reason: String) async throws {
        // TODO: Call API to reject
        try await Task.sleep(nanoseconds: 500_000_000)
        if let index = approvals.firstIndex(where: { $0.id == id }) {
            let item = approvals[index]
            approvals[index] = ApprovalItem(
                id: item.id,
                type: item.type,
                title: item.title,
                description: item.description,
                amount: item.amount,
                status: .rejected,
                submittedByName: item.submittedByName,
                submittedById: item.submittedById,
                submittedAt: item.submittedAt,
                projectId: item.projectId,
                projectName: item.projectName,
                isUrgent: item.isUrgent,
                reviewedAt: Date(),
                reviewedByName: "You",
                rejectionReason: reason
            )
        }
    }
}

#Preview {
    ApprovalsView()
}
