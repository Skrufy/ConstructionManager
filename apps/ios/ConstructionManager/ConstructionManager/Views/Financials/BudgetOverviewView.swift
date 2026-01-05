//
//  BudgetOverviewView.swift
//  ConstructionManager
//
//  Budget overview with actual vs planned visualization and category breakdown
//

import SwiftUI

struct BudgetOverviewView: View {
    let budget: ProjectBudget
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Summary Card
                    summaryCard

                    // Progress Ring
                    progressSection

                    // Category Breakdown
                    if let lines = budget.lines, !lines.isEmpty {
                        categoryBreakdownSection(lines)
                    }

                    // Quick Stats
                    statsGrid
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("Budget Overview")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.primary600)
                }
            }
        }
    }

    // MARK: - Summary Card
    private var summaryCard: some View {
        AppCard {
            VStack(spacing: AppSpacing.md) {
                if let projectName = budget.projectName {
                    Text(projectName)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                Text(budget.formattedBudget)
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(AppColors.textPrimary)

                Text("Total Budget")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)
            }
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Progress Section
    private var progressSection: some View {
        AppCard {
            VStack(spacing: AppSpacing.lg) {
                Text("Budget Usage")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Progress Ring
                ZStack {
                    // Background ring
                    Circle()
                        .stroke(AppColors.gray200, lineWidth: 20)
                        .frame(width: 180, height: 180)

                    // Actual (paid) ring
                    Circle()
                        .trim(from: 0, to: min(budget.totalActual / budget.totalBudget, 1))
                        .stroke(
                            AppColors.success,
                            style: StrokeStyle(lineWidth: 20, lineCap: .round)
                        )
                        .frame(width: 180, height: 180)
                        .rotationEffect(.degrees(-90))

                    // Committed ring (on top of actual)
                    Circle()
                        .trim(
                            from: min(budget.totalActual / budget.totalBudget, 1),
                            to: min((budget.totalActual + budget.totalCommitted) / budget.totalBudget, 1)
                        )
                        .stroke(
                            AppColors.warning,
                            style: StrokeStyle(lineWidth: 20, lineCap: .round)
                        )
                        .frame(width: 180, height: 180)
                        .rotationEffect(.degrees(-90))

                    // Center content
                    VStack(spacing: 4) {
                        Text("\(Int(budget.percentUsed))%")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(percentUsedColor)
                        Text("Used")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                }

                // Legend
                HStack(spacing: AppSpacing.lg) {
                    LegendItem(color: AppColors.success, label: "Spent", value: formatCurrency(budget.totalActual))
                    LegendItem(color: AppColors.warning, label: "Committed", value: formatCurrency(budget.totalCommitted))
                    LegendItem(color: AppColors.gray200, label: "Remaining", value: formatCurrency(budget.totalVariance))
                }
            }
        }
    }

    private var percentUsedColor: Color {
        if budget.percentUsed >= 100 {
            return AppColors.error
        } else if budget.percentUsed >= 80 {
            return AppColors.warning
        }
        return AppColors.success
    }

    // MARK: - Category Breakdown
    private func categoryBreakdownSection(_ lines: [BudgetLine]) -> some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                Text("By Category")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                ForEach(lines) { line in
                    BudgetLineRow(line: line)

                    if line.id != lines.last?.id {
                        Divider()
                    }
                }
            }
        }
    }

    // MARK: - Stats Grid
    private var statsGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: AppSpacing.sm) {
            StatBox(
                title: "Total Budget",
                value: formatCurrency(budget.totalBudget),
                icon: "dollarsign.circle",
                color: AppColors.primary600
            )

            StatBox(
                title: "Spent",
                value: formatCurrency(budget.totalActual),
                icon: "arrow.down.circle",
                color: AppColors.success
            )

            StatBox(
                title: "Committed",
                value: formatCurrency(budget.totalCommitted),
                icon: "clock.arrow.circlepath",
                color: AppColors.warning
            )

            StatBox(
                title: "Remaining",
                value: formatCurrency(budget.totalVariance),
                icon: "chart.bar",
                color: budget.totalVariance >= 0 ? AppColors.info : AppColors.error
            )
        }
    }

    // MARK: - Helpers
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(Int(amount))"
    }
}

// MARK: - Legend Item
struct LegendItem: View {
    let color: Color
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: AppSpacing.xxs) {
            HStack(spacing: AppSpacing.xxs) {
                Circle()
                    .fill(color)
                    .frame(width: 10, height: 10)
                Text(label)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)
            }
            Text(value)
                .font(AppTypography.bodySemibold)
                .foregroundColor(AppColors.textPrimary)
        }
    }
}

// MARK: - Budget Line Row
struct BudgetLineRow: View {
    let line: BudgetLine

    private var progressColor: Color {
        if line.percentUsed >= 100 {
            return AppColors.error
        } else if line.percentUsed >= 80 {
            return AppColors.warning
        }
        return AppColors.success
    }

    var body: some View {
        VStack(spacing: AppSpacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(line.category.displayName)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    if let description = line.description {
                        Text(description)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(formatCurrency(line.actual + line.committed))
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text("of \(formatCurrency(line.budgeted))")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                }
            }

            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppColors.gray200)
                        .frame(height: 8)

                    // Actual
                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppColors.success)
                        .frame(width: geometry.size.width * min(line.actual / line.budgeted, 1), height: 8)

                    // Committed (overlaid)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppColors.warning)
                        .frame(
                            width: geometry.size.width * min((line.actual + line.committed) / line.budgeted, 1) - geometry.size.width * min(line.actual / line.budgeted, 1),
                            height: 8
                        )
                        .offset(x: geometry.size.width * min(line.actual / line.budgeted, 1))
                }
            }
            .frame(height: 8)

            // Variance
            HStack {
                Text("\(Int(line.percentUsed))% used")
                    .font(AppTypography.caption)
                    .foregroundColor(progressColor)

                Spacer()

                let variance = line.variance
                Text(variance >= 0 ? "+\(formatCurrency(variance)) remaining" : "\(formatCurrency(variance)) over")
                    .font(AppTypography.caption)
                    .foregroundColor(variance >= 0 ? AppColors.success : AppColors.error)
            }
        }
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(Int(amount))"
    }
}

// MARK: - Stat Box
struct StatBox: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(color)
                Spacer()
            }

            Text(value)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            Text(title)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusLarge)
        .shadow(color: Color.black.opacity(0.05), radius: 2, y: 1)
    }
}

// MARK: - Financial Summary View (for dashboard integration)
struct FinancialSummaryWidget: View {
    let pendingInvoices: Double
    let overdueInvoices: Double
    let pendingExpenses: Double
    let pendingChangeOrders: Double

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Text("Financial Summary")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: AppSpacing.sm) {
                SummaryItem(
                    title: "Pending Invoices",
                    value: formatCurrency(pendingInvoices),
                    color: AppColors.warning
                )

                SummaryItem(
                    title: "Overdue",
                    value: formatCurrency(overdueInvoices),
                    color: AppColors.error
                )

                SummaryItem(
                    title: "Pending Expenses",
                    value: formatCurrency(pendingExpenses),
                    color: AppColors.info
                )

                SummaryItem(
                    title: "Change Orders",
                    value: formatCurrency(pendingChangeOrders),
                    color: AppColors.purple
                )
            }
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusLarge)
        .shadow(color: Color.black.opacity(0.05), radius: 2, y: 1)
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(Int(amount))"
    }
}

struct SummaryItem: View {
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xxs) {
            Text(value)
                .font(AppTypography.bodySemibold)
                .foregroundColor(color)
            Text(title)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppSpacing.sm)
        .background(color.opacity(0.1))
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

#Preview {
    let mockBudget = ProjectBudget(
        id: "budget-1",
        projectId: "proj-1",
        projectName: "Downtown Office Complex",
        totalBudget: 2500000,
        totalActual: 1200000,
        totalCommitted: 450000,
        lines: [
            BudgetLine(id: "line-1", category: .labor, description: "All labor costs", budgeted: 800000, actual: 450000, committed: 150000),
            BudgetLine(id: "line-2", category: .materials, description: "Building materials", budgeted: 900000, actual: 500000, committed: 200000),
            BudgetLine(id: "line-3", category: .equipment, description: "Equipment rental", budgeted: 300000, actual: 150000, committed: 50000),
            BudgetLine(id: "line-4", category: .subcontractor, description: "Subcontractor fees", budgeted: 400000, actual: 100000, committed: 50000),
            BudgetLine(id: "line-5", category: .contingency, description: "Project contingency", budgeted: 100000, actual: 0, committed: 0)
        ],
        lastUpdated: Date()
    )

    BudgetOverviewView(budget: mockBudget)
}
