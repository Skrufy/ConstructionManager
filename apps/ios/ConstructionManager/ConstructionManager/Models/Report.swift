//
//  Report.swift
//  ConstructionManager
//
//  Reports and Analytics models
//

import Foundation

// MARK: - Report Type
enum ReportType: String, Codable, CaseIterable {
    case labor = "LABOR"
    case equipment = "EQUIPMENT"
    case safety = "SAFETY"
    case safetyMeetings = "SAFETY_MEETINGS"
    case financial = "FINANCIAL"
    case project = "PROJECT"
    case dailyLog = "DAILY_LOG"
    case custom = "CUSTOM"

    var displayName: String {
        switch self {
        case .labor: return "reports.type.labor".localized
        case .equipment: return "reports.type.equipment".localized
        case .safety: return "reports.type.safety".localized
        case .safetyMeetings: return "reports.type.safetyMeetings".localized
        case .financial: return "reports.type.financial".localized
        case .project: return "reports.type.project".localized
        case .dailyLog: return "reports.type.dailyLog".localized
        case .custom: return "reports.type.custom".localized
        }
    }

    var icon: String {
        switch self {
        case .labor: return "person.3.fill"
        case .equipment: return "wrench.and.screwdriver.fill"
        case .safety: return "shield.checkered"
        case .safetyMeetings: return "person.3.sequence.fill"
        case .financial: return "dollarsign.circle.fill"
        case .project: return "building.2.fill"
        case .dailyLog: return "doc.text.fill"
        case .custom: return "doc.badge.gearshape"
        }
    }
}

// MARK: - Report Period
enum ReportPeriod: String, Codable, CaseIterable {
    case today = "TODAY"
    case thisWeek = "THIS_WEEK"
    case thisMonth = "THIS_MONTH"
    case thisQuarter = "THIS_QUARTER"
    case thisYear = "THIS_YEAR"
    case lastWeek = "LAST_WEEK"
    case lastMonth = "LAST_MONTH"
    case lastQuarter = "LAST_QUARTER"
    case custom = "CUSTOM"

    var displayName: String {
        switch self {
        case .today: return "Today"
        case .thisWeek: return "This Week"
        case .thisMonth: return "This Month"
        case .thisQuarter: return "This Quarter"
        case .thisYear: return "This Year"
        case .lastWeek: return "Last Week"
        case .lastMonth: return "Last Month"
        case .lastQuarter: return "Last Quarter"
        case .custom: return "Custom Range"
        }
    }
}

// MARK: - Chart Type
enum ChartType: String, Codable, CaseIterable {
    case bar = "BAR"
    case line = "LINE"
    case pie = "PIE"
    case table = "TABLE"

    var displayName: String {
        switch self {
        case .bar: return "Bar Chart"
        case .line: return "Line Chart"
        case .pie: return "Pie Chart"
        case .table: return "Table"
        }
    }

    var icon: String {
        switch self {
        case .bar: return "chart.bar.fill"
        case .line: return "chart.line.uptrend.xyaxis"
        case .pie: return "chart.pie.fill"
        case .table: return "tablecells"
        }
    }
}

// MARK: - Report Summary Stat
struct ReportStat: Identifiable, Codable {
    let id: String
    let label: String
    let value: String
    let change: Double? // percentage change
    let changeLabel: String?

    var isPositiveChange: Bool {
        (change ?? 0) >= 0
    }
}

// MARK: - Report Data Point
struct ReportDataPoint: Identifiable, Codable {
    let id: String
    let label: String
    let value: Double
    let category: String?
}

// MARK: - Report
struct Report: Identifiable, Codable {
    let id: String
    let name: String
    let type: ReportType
    let description: String?
    let projectId: String?
    let projectName: String?
    let period: ReportPeriod
    let startDate: Date?
    let endDate: Date?
    let chartType: ChartType?
    let stats: [ReportStat]?
    let data: [ReportDataPoint]?
    let generatedAt: Date
    let generatedBy: String?

    // Custom init for decoding with default values
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        type = try container.decode(ReportType.self, forKey: .type)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        projectId = try container.decodeIfPresent(String.self, forKey: .projectId)
        projectName = try container.decodeIfPresent(String.self, forKey: .projectName)
        period = try container.decode(ReportPeriod.self, forKey: .period)
        startDate = try container.decodeIfPresent(Date.self, forKey: .startDate)
        endDate = try container.decodeIfPresent(Date.self, forKey: .endDate)
        chartType = try container.decodeIfPresent(ChartType.self, forKey: .chartType)
        stats = try container.decodeIfPresent([ReportStat].self, forKey: .stats)
        data = try container.decodeIfPresent([ReportDataPoint].self, forKey: .data)
        // Default to current date if not provided
        generatedAt = try container.decodeIfPresent(Date.self, forKey: .generatedAt) ?? Date()
        generatedBy = try container.decodeIfPresent(String.self, forKey: .generatedBy)
    }

    private enum CodingKeys: String, CodingKey {
        case id, name, type, description, projectId, projectName, period
        case startDate, endDate, chartType, stats, data, generatedAt, generatedBy
    }

    // Encoding for saving to history
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(type, forKey: .type)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(projectId, forKey: .projectId)
        try container.encodeIfPresent(projectName, forKey: .projectName)
        try container.encode(period, forKey: .period)
        try container.encodeIfPresent(startDate, forKey: .startDate)
        try container.encodeIfPresent(endDate, forKey: .endDate)
        try container.encodeIfPresent(chartType, forKey: .chartType)
        try container.encodeIfPresent(stats, forKey: .stats)
        try container.encodeIfPresent(data, forKey: .data)
        try container.encode(generatedAt, forKey: .generatedAt)
        try container.encodeIfPresent(generatedBy, forKey: .generatedBy)
    }
}

// MARK: - Saved Report Template
struct SavedReport: Identifiable, Codable {
    let id: String
    let name: String
    let type: ReportType
    let description: String?
    let projectId: String?
    let filters: [String: String]?
    let columns: [String]?
    let groupBy: String?
    let sortBy: String?
    let chartType: ChartType?
    let isDefault: Bool
    let createdBy: String?
    let createdAt: Date
    let updatedAt: Date
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase

    // MARK: - Mock Data
    static let mockSavedReports: [SavedReport] = [
        SavedReport(
            id: "sr-1",
            name: "Weekly Labor Summary",
            type: .labor,
            description: "Weekly summary of labor hours by project",
            projectId: nil,
            filters: nil,
            columns: ["project", "hours", "cost"],
            groupBy: "project",
            sortBy: "hours",
            chartType: .bar,
            isDefault: true,
            createdBy: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        SavedReport(
            id: "sr-2",
            name: "Safety Incident Trends",
            type: .safety,
            description: "Monthly safety incident trends",
            projectId: nil,
            filters: nil,
            columns: nil,
            groupBy: "month",
            sortBy: nil,
            chartType: .line,
            isDefault: false,
            createdBy: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}

// MARK: - Analytics Dashboard Data
struct AnalyticsDashboard: Codable {
    let projectMetrics: ProjectMetrics?
    let laborMetrics: LaborMetrics?
    let safetyMetrics: SafetyMetrics?
    let financialMetrics: FinancialMetrics?
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

struct ProjectMetrics: Codable {
    let activeProjects: Int
    let completedProjects: Int
    let onHoldProjects: Int
    let totalBudget: Double
    let averageCompletion: Double
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

struct LaborMetrics: Codable {
    let totalHoursThisWeek: Double
    let totalHoursLastWeek: Double
    let activeWorkers: Int
    let overtimeHours: Double
    let averageHoursPerWorker: Double
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

struct SafetyMetrics: Codable {
    let incidentsThisMonth: Int
    let incidentsLastMonth: Int
    let daysWithoutIncident: Int
    let openInspections: Int
    let upcomingTrainings: Int
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

struct FinancialMetrics: Codable {
    let totalRevenue: Double
    let totalCosts: Double
    let profitMargin: Double
    let pendingInvoices: Double
    let overdueInvoices: Double
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}
