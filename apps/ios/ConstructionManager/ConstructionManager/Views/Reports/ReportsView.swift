//
//  ReportsView.swift
//  ConstructionManager
//
//  Reports and Analytics hub
//

import SwiftUI

struct ReportsView: View {
    @StateObject private var reportService = ReportService.shared
    @State private var selectedTab: ReportsTab = .reports

    enum ReportsTab: String, CaseIterable {
        case reports = "Reports"
        case analytics = "Analytics"

        var displayName: String {
            switch self {
            case .reports: return "reports.tab.reports".localized
            case .analytics: return "reports.tab.analytics".localized
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Tab selector
            Picker("View", selection: $selectedTab) {
                ForEach(ReportsTab.allCases, id: \.self) { tab in
                    Text(tab.displayName).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.sm)

            // Content
            if selectedTab == .reports {
                ReportsListView()
            } else {
                AnalyticsDashboardView()
            }
        }
        .background(AppColors.background)
        .navigationTitle("reports.title".localized)
        .task {
            await reportService.fetchAnalytics()
            await reportService.fetchSavedReports()
        }
    }
}

// MARK: - Analytics Dashboard View
struct AnalyticsDashboardView: View {
    @StateObject private var reportService = ReportService.shared

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.md) {
                if let analytics = reportService.analytics {
                    // Project Metrics
                    if let projectMetrics = analytics.projectMetrics {
                        MetricsSectionCard(title: "Projects", icon: "building.2.fill") {
                            HStack(spacing: AppSpacing.md) {
                                MetricItem(value: "\(projectMetrics.activeProjects)", label: "Active", color: AppColors.success)
                                MetricItem(value: "\(projectMetrics.completedProjects)", label: "Completed", color: AppColors.info)
                                MetricItem(value: "\(projectMetrics.onHoldProjects)", label: "On Hold", color: AppColors.warning)
                            }

                            ProgressMetric(label: "Avg. Completion", value: projectMetrics.averageCompletion)
                        }
                    }

                    // Labor Metrics
                    if let laborMetrics = analytics.laborMetrics {
                        MetricsSectionCard(title: "Labor", icon: "person.3.fill") {
                            HStack(spacing: AppSpacing.md) {
                                MetricItem(value: formatHours(laborMetrics.totalHoursThisWeek), label: "This Week", color: AppColors.primary600)
                                MetricItem(value: "\(laborMetrics.activeWorkers)", label: "Workers", color: AppColors.info)
                                MetricItem(value: formatHours(laborMetrics.overtimeHours), label: "Overtime", color: AppColors.warning)
                            }

                            // Week over week change
                            let change = laborMetrics.totalHoursThisWeek - laborMetrics.totalHoursLastWeek
                            let percentChange = laborMetrics.totalHoursLastWeek > 0 ? (change / laborMetrics.totalHoursLastWeek) * 100 : 0
                            HStack {
                                Image(systemName: change >= 0 ? "arrow.up.right" : "arrow.down.right")
                                    .foregroundColor(change >= 0 ? AppColors.success : AppColors.error)
                                Text(String(format: "%.1f%% vs last week", abs(percentChange)))
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textSecondary)
                            }
                        }
                    }

                    // Safety Metrics
                    if let safetyMetrics = analytics.safetyMetrics {
                        MetricsSectionCard(title: "Safety", icon: "shield.checkered") {
                            HStack(spacing: AppSpacing.md) {
                                MetricItem(value: "\(safetyMetrics.daysWithoutIncident)", label: "Days Safe", color: AppColors.success)
                                MetricItem(value: "\(safetyMetrics.incidentsThisMonth)", label: "Incidents", color: safetyMetrics.incidentsThisMonth > 0 ? AppColors.error : AppColors.success)
                                MetricItem(value: "\(safetyMetrics.openInspections)", label: "Open Insp.", color: AppColors.warning)
                            }
                        }
                    }

                    // Financial Metrics
                    if let financialMetrics = analytics.financialMetrics {
                        MetricsSectionCard(title: "Financials", icon: "dollarsign.circle.fill") {
                            HStack(spacing: AppSpacing.md) {
                                MetricItem(value: formatCurrency(financialMetrics.totalRevenue), label: "Revenue", color: AppColors.success)
                                MetricItem(value: formatCurrency(financialMetrics.totalCosts), label: "Costs", color: AppColors.error)
                            }

                            ProgressMetric(label: "Profit Margin", value: financialMetrics.profitMargin, suffix: "%")

                            if financialMetrics.overdueInvoices > 0 {
                                HStack {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .foregroundColor(AppColors.warning)
                                    Text("\(formatCurrency(financialMetrics.overdueInvoices)) overdue")
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.warning)
                                }
                            }
                        }
                    }
                } else if reportService.isLoading {
                    VStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .frame(height: 300)
                } else {
                    VStack {
                        Spacer()
                        Text("Unable to load analytics")
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                        Spacer()
                    }
                    .frame(height: 300)
                }
            }
            .padding(AppSpacing.md)
        }
        .refreshable {
            await reportService.fetchAnalytics()
        }
    }

    private func formatHours(_ hours: Double) -> String {
        if hours >= 1000 {
            return String(format: "%.1fK", hours / 1000)
        }
        return String(format: "%.0f", hours)
    }

    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        if amount >= 1000000 {
            return String(format: "$%.1fM", amount / 1000000)
        } else if amount >= 1000 {
            return String(format: "$%.0fK", amount / 1000)
        }
        return formatter.string(from: NSNumber(value: amount)) ?? "$0"
    }
}

// MARK: - Metrics Section Card
struct MetricsSectionCard<Content: View>: View {
    let title: String
    let icon: String
    @ViewBuilder let content: Content

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    Image(systemName: icon)
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.primary600)
                    Text(title)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                }

                content
            }
        }
    }
}

// MARK: - Metric Item
struct MetricItem: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: AppSpacing.xxs) {
            Text(value)
                .font(AppTypography.heading3)
                .foregroundColor(color)
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Progress Metric
struct ProgressMetric: View {
    let label: String
    let value: Double
    var suffix: String = "%"

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            HStack {
                Text(label)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                Spacer()
                Text(String(format: "%.1f%@", value, suffix))
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppColors.gray200)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppColors.primary600)
                        .frame(width: geometry.size.width * min(value / 100, 1), height: 8)
                }
            }
            .frame(height: 8)
        }
    }
}

// MARK: - Reports List View
struct ReportsListView: View {
    @StateObject private var reportService = ReportService.shared
    @State private var showingNewReport = false
    @State private var selectedReportType: ReportType?
    @State private var selectedHistoryReport: Report?

    var body: some View {
        VStack(spacing: 0) {
            // Quick report buttons
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.sm) {
                    ForEach(ReportType.allCases, id: \.self) { type in
                        QuickReportButton(type: type) {
                            selectedReportType = type
                            showingNewReport = true
                        }
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
            }

            // Report History
            if reportService.reportHistory.isEmpty && !reportService.isLoading {
                VStack(spacing: AppSpacing.md) {
                    Spacer()
                    Image(systemName: "doc.badge.gearshape")
                        .font(.system(size: 48))
                        .foregroundColor(AppColors.gray300)
                    Text("reports.noHistory".localized)
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)
                    Text("reports.noHistoryDesc".localized)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                    PrimaryButton("reports.generateReport".localized, icon: "doc.badge.plus") {
                        showingNewReport = true
                    }
                    .padding(.top, AppSpacing.sm)
                    Spacer()
                }
                .padding(AppSpacing.xl)
            } else {
                ScrollView {
                    LazyVStack(spacing: AppSpacing.sm) {
                        // Section header
                        HStack {
                            Text("reports.recentReports".localized)
                                .font(AppTypography.heading3)
                                .foregroundColor(AppColors.textPrimary)
                            Spacer()
                            if !reportService.reportHistory.isEmpty {
                                Button("reports.clearAll".localized) {
                                    reportService.clearHistory()
                                }
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.error)
                            }
                        }
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.top, AppSpacing.sm)

                        // History list
                        ForEach(reportService.reportHistory) { report in
                            ReportHistoryCard(report: report) {
                                selectedHistoryReport = report
                            } onDelete: {
                                reportService.removeFromHistory(report)
                            }
                        }
                    }
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.bottom, AppSpacing.md)
                }
            }
        }
        .sheet(isPresented: $showingNewReport) {
            GenerateReportView(selectedType: selectedReportType)
        }
        .sheet(item: $selectedHistoryReport) { report in
            NavigationStack {
                ReportDetailView(report: report)
                    .navigationTitle("Report")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("Done") {
                                selectedHistoryReport = nil
                            }
                        }
                    }
            }
        }
    }
}

// MARK: - Report History Card
struct ReportHistoryCard: View {
    let report: Report
    let onTap: () -> Void
    let onDelete: () -> Void

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                // Icon
                ZStack {
                    Circle()
                        .fill(AppColors.primary100)
                        .frame(width: 44, height: 44)
                    Image(systemName: report.type.icon)
                        .font(.system(size: 18))
                        .foregroundColor(AppColors.primary600)
                }

                // Info
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(report.name)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)

                    HStack(spacing: AppSpacing.xs) {
                        Text(report.period.displayName)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.primary600)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(AppColors.primary100)
                            .cornerRadius(4)

                        if let projectName = report.projectName {
                            Text(projectName)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                                .lineLimit(1)
                        }
                    }

                    Text(formatDate(report.generatedAt))
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                }

                Spacer()

                // Delete button with proper touch target
                Button {
                    onDelete()
                } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.error)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                Image(systemName: "chevron.right")
                    .font(.system(size: 12))
                    .foregroundColor(AppColors.gray400)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            onTap()
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Generate Report View
struct GenerateReportView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var reportService = ReportService.shared

    var selectedType: ReportType?

    @State private var reportType: ReportType = .project
    @State private var period: ReportPeriod = .thisMonth
    @State private var selectedProject: Project?
    @State private var showingProjectPicker = false
    @State private var isGenerating = false
    @State private var generatedReport: Report?
    @State private var errorMessage: String?
    @State private var showingGeneratedReport = false

    var body: some View {
        NavigationStack {
            generateReportForm
        }
        .fullScreenCover(isPresented: $showingGeneratedReport) {
            if let report = generatedReport {
                NavigationStack {
                    ReportDetailView(report: report)
                        .navigationTitle("Report")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .navigationBarTrailing) {
                                Button("Done") { dismiss() }
                            }
                        }
                }
            }
        }
    }

    @ViewBuilder
    private var generateReportForm: some View {
        ScrollView {
            VStack(spacing: AppSpacing.lg) {
                reportTypeSection
                periodSection
                projectSection
                errorSection
                generateButtonSection
            }
            .padding(AppSpacing.md)
        }
        .background(AppColors.background)
        .navigationTitle("Generate Report")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Cancel") { dismiss() }
            }
        }
        .sheet(isPresented: $showingProjectPicker) {
            ReportProjectPickerSheet(selectedProject: $selectedProject)
        }
        .onAppear {
            if let type = selectedType {
                reportType = type
            }
        }
    }

    private var reportTypeSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Report Type")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: AppSpacing.sm) {
                ForEach(ReportType.allCases.filter { $0 != .custom }, id: \.self) { type in
                    Button {
                        print("[GenerateReportView] 🔘 Report type tapped: \(type.displayName)")
                        reportType = type
                    } label: {
                        VStack(spacing: AppSpacing.xs) {
                            Image(systemName: type.icon)
                                .font(.system(size: 24))
                            Text(type.displayName.replacingOccurrences(of: " Report", with: ""))
                                .font(AppTypography.caption)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(AppSpacing.md)
                        .background(reportType == type ? AppColors.primary100 : AppColors.cardBackground)
                        .foregroundColor(reportType == type ? AppColors.primary600 : AppColors.textSecondary)
                        .cornerRadius(AppSpacing.radiusMedium)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                .stroke(reportType == type ? AppColors.primary600 : AppColors.gray200, lineWidth: reportType == type ? 2 : 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var periodSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Time Period")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.xs) {
                    ForEach(ReportPeriod.allCases.filter { $0 != .custom }, id: \.self) { p in
                        Button {
                            period = p
                        } label: {
                            Text(p.displayName)
                                .font(AppTypography.secondaryMedium)
                                .padding(.horizontal, AppSpacing.md)
                                .padding(.vertical, AppSpacing.sm)
                                .background(period == p ? AppColors.primary600 : AppColors.gray100)
                                .foregroundColor(period == p ? .white : AppColors.textSecondary)
                                .cornerRadius(AppSpacing.radiusFull)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var projectSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Project (Optional)")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)

            HStack {
                Button {
                    showingProjectPicker = true
                } label: {
                    HStack {
                        Text(selectedProject?.name ?? "All Projects")
                            .font(AppTypography.body)
                            .foregroundColor(selectedProject != nil ? AppColors.textPrimary : AppColors.textSecondary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14))
                            .foregroundColor(AppColors.textTertiary)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if selectedProject != nil {
                    Button {
                        selectedProject = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(AppColors.gray400)
                    }
                    .buttonStyle(.plain)
                    .padding(.leading, AppSpacing.xs)
                }
            }
            .padding()
            .background(AppColors.gray100)
            .cornerRadius(AppSpacing.radiusSmall)
        }
    }

    @ViewBuilder
    private var errorSection: some View {
        if let error = errorMessage {
            Text(error)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.error)
                .padding(AppSpacing.sm)
                .frame(maxWidth: .infinity)
                .background(AppColors.error.opacity(0.1))
                .cornerRadius(AppSpacing.radiusSmall)
        }
    }

    private var generateButtonSection: some View {
        PrimaryButton("Generate Report", icon: "doc.badge.plus", isLoading: isGenerating) {
            print("[GenerateReportView] 🔘 Generate button tapped!")
            Task {
                await generateReport()
            }
        }
    }

    private func generateReport() async {
        print("[GenerateReportView] 📊 generateReport() called")
        isGenerating = true
        errorMessage = nil
        defer { isGenerating = false }

        let report = await reportService.generateReport(
            type: reportType,
            period: period,
            projectId: selectedProject?.id
        )

        if let report = report {
            generatedReport = report
            showingGeneratedReport = true
        } else {
            errorMessage = reportService.error ?? "Failed to generate report"
        }
    }
}

// MARK: - Report Detail View
struct ReportDetailView: View {
    let report: Report
    @Environment(\.dismiss) private var dismiss
    @State private var showingShareSheet = false
    @State private var pdfURL: URL?
    @State private var isGeneratingPDF = false

    var body: some View {
        reportContent
            .sheet(isPresented: $showingShareSheet) {
                if let url = pdfURL {
                    ShareSheet(items: [url])
                }
            }
    }

    @ViewBuilder
    private var reportContent: some View {
        ScrollView {
            VStack(spacing: AppSpacing.lg) {
                headerSection
                statsSection
                dataSection
                exportSection
                footerSection
            }
            .padding(AppSpacing.md)
        }
        .background(AppColors.background)
    }

    private var exportSection: some View {
        VStack(spacing: AppSpacing.sm) {
            Text("Export & Share")
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: AppSpacing.sm) {
                // Export PDF Button
                Button {
                    generateAndSharePDF()
                } label: {
                    HStack(spacing: AppSpacing.xs) {
                        if isGeneratingPDF {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "arrow.down.doc.fill")
                        }
                        Text("Export PDF")
                            .font(AppTypography.bodyMedium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(AppSpacing.md)
                    .background(AppColors.primary600)
                    .foregroundColor(.white)
                    .cornerRadius(AppSpacing.radiusMedium)
                }
                .disabled(isGeneratingPDF)

                // Share Button
                Button {
                    generateAndSharePDF()
                } label: {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "square.and.arrow.up")
                        Text("Share")
                            .font(AppTypography.bodyMedium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(AppSpacing.md)
                    .background(AppColors.cardBackground)
                    .foregroundColor(AppColors.primary600)
                    .cornerRadius(AppSpacing.radiusMedium)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                            .stroke(AppColors.primary600, lineWidth: 1)
                    )
                }
                .disabled(isGeneratingPDF)
            }
        }
        .padding(.top, AppSpacing.md)
    }

    private func generateAndSharePDF() {
        isGeneratingPDF = true

        Task {
            let url = await ReportPDFGenerator.generatePDF(for: report)
            await MainActor.run {
                isGeneratingPDF = false
                if let url = url {
                    pdfURL = url
                    showingShareSheet = true
                }
            }
        }
    }

    private var headerSection: some View {
        VStack(spacing: AppSpacing.xs) {
            Image(systemName: report.type.icon)
                .font(.system(size: 40))
                .foregroundColor(AppColors.primary600)

            Text(report.name)
                .font(AppTypography.heading2)
                .foregroundColor(AppColors.textPrimary)
                .multilineTextAlignment(.center)

            if let description = report.description {
                Text(description)
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Text(report.period.displayName)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.primary600)
                .padding(.horizontal, AppSpacing.sm)
                .padding(.vertical, 4)
                .background(AppColors.primary100)
                .cornerRadius(AppSpacing.radiusSmall)
        }
        .padding(.top, AppSpacing.md)
    }

    @ViewBuilder
    private var statsSection: some View {
        if let stats = report.stats, !stats.isEmpty {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Text("Summary")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppSpacing.sm) {
                    ForEach(stats) { stat in
                        ReportStatCard(stat: stat)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var dataSection: some View {
        if let data = report.data, !data.isEmpty {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Text("Details")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)

                ForEach(data) { item in
                    ReportDataRow(item: item)
                }
            }
        }
    }

    private var footerSection: some View {
        VStack(spacing: AppSpacing.xs) {
            if let generatedBy = report.generatedBy {
                Text("Generated by: \(generatedBy)")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
            Text("Generated: \(report.generatedAt.formatted(date: .abbreviated, time: .shortened))")
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .padding(.top, AppSpacing.md)
    }
}

// MARK: - Report Stat Card
private struct ReportStatCard: View {
    let stat: ReportStat

    var body: some View {
        VStack(spacing: AppSpacing.xs) {
            Text(stat.value)
                .font(AppTypography.heading2)
                .foregroundColor(AppColors.primary600)
            Text(stat.label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

// MARK: - Report Data Row
private struct ReportDataRow: View {
    let item: ReportDataPoint

    var body: some View {
        HStack {
            Text(item.label)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textPrimary)
            Spacer()
            Text(String(format: "%.0f", item.value))
                .font(AppTypography.bodySemibold)
                .foregroundColor(AppColors.primary600)
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppSpacing.radiusMedium)
    }
}

// MARK: - Report Project Picker
struct ReportProjectPickerSheet: View {
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

// MARK: - Quick Report Button
struct QuickReportButton: View {
    let type: ReportType
    let action: () -> Void

    var body: some View {
        Button {
            action()
        } label: {
            VStack(spacing: AppSpacing.xs) {
                ZStack {
                    Circle()
                        .fill(AppColors.primary100)
                        .frame(width: 50, height: 50)
                    Image(systemName: type.icon)
                        .font(.system(size: 20))
                        .foregroundColor(AppColors.primary600)
                }
                Text(type.displayName.replacingOccurrences(of: " Report", with: ""))
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                    .lineLimit(1)
            }
            .frame(width: 70)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Saved Report Card
struct SavedReportCard: View {
    let report: SavedReport

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.sm) {
                ZStack {
                    Circle()
                        .fill(AppColors.primary100)
                        .frame(width: 40, height: 40)
                    Image(systemName: report.type.icon)
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.primary600)
                }

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(report.name)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text(report.type.displayName)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                if report.isDefault {
                    Image(systemName: "star.fill")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.warning)
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.gray400)
            }
        }
    }
}

#Preview {
    NavigationStack {
        ReportsView()
    }
}
