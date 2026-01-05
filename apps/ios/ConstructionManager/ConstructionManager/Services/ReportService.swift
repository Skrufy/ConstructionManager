//
//  ReportService.swift
//  ConstructionManager
//
//  Service for reports and analytics
//

import Foundation
import Combine

@MainActor
class ReportService: ObservableObject {
    static let shared = ReportService()

    @Published var savedReports: [SavedReport] = []
    @Published var reportHistory: [Report] = []
    @Published var analytics: AnalyticsDashboard?
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared
    private let historyKey = "report_history"
    private let maxHistoryCount = 50

    private init() {
        loadReportHistory()
    }

    // MARK: - Report History

    private func loadReportHistory() {
        guard let data = UserDefaults.standard.data(forKey: historyKey) else { return }
        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            reportHistory = try decoder.decode([Report].self, from: data)
        } catch {
            print("[ReportService] Failed to load report history: \(error)")
        }
    }

    private func saveReportHistory() {
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(reportHistory)
            UserDefaults.standard.set(data, forKey: historyKey)
        } catch {
            print("[ReportService] Failed to save report history: \(error)")
        }
    }

    func addToHistory(_ report: Report) {
        // Remove duplicates (same id)
        reportHistory.removeAll { $0.id == report.id }
        // Add to beginning
        reportHistory.insert(report, at: 0)
        // Trim to max count
        if reportHistory.count > maxHistoryCount {
            reportHistory = Array(reportHistory.prefix(maxHistoryCount))
        }
        saveReportHistory()
    }

    func removeFromHistory(_ report: Report) {
        reportHistory.removeAll { $0.id == report.id }
        saveReportHistory()
    }

    func clearHistory() {
        reportHistory.removeAll()
        saveReportHistory()
    }

    // MARK: - Fetch Saved Reports

    func fetchSavedReports() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            savedReports = try await apiClient.get("/saved-reports")
        } catch {
            print("Failed to fetch saved reports: \(error)")
            self.error = error.localizedDescription
            savedReports = SavedReport.mockSavedReports
        }
    }

    // MARK: - Generate Report

    func generateReport(type: ReportType, period: ReportPeriod, projectId: String? = nil, startDate: Date? = nil, endDate: Date? = nil) async -> Report? {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let params = GenerateReportRequest(
                type: type.rawValue,
                period: period.rawValue,
                projectId: projectId,
                startDate: startDate.map { ISO8601DateFormatter().string(from: $0) },
                endDate: endDate.map { ISO8601DateFormatter().string(from: $0) }
            )

            let report: Report = try await apiClient.post("/reports/generate", body: params)
            print("[ReportService] Report generated successfully: \(report.name)")
            // Save to history
            addToHistory(report)
            return report
        } catch let decodingError as DecodingError {
            // Detailed decoding error logging
            switch decodingError {
            case .keyNotFound(let key, let context):
                print("[ReportService] Decoding error - Missing key: \(key.stringValue) at \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
            case .typeMismatch(let type, let context):
                print("[ReportService] Decoding error - Type mismatch: expected \(type) at \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
            case .valueNotFound(let type, let context):
                print("[ReportService] Decoding error - Value not found: \(type) at \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
            case .dataCorrupted(let context):
                print("[ReportService] Decoding error - Data corrupted at \(context.codingPath.map { $0.stringValue }.joined(separator: ".")): \(context.debugDescription)")
            @unknown default:
                print("[ReportService] Unknown decoding error: \(decodingError)")
            }
            self.error = "Failed to decode report data"
            return nil
        } catch {
            print("[ReportService] Failed to generate report: \(error)")
            self.error = error.localizedDescription
            return nil
        }
    }

    // MARK: - Analytics API Response Models
    struct AnalyticsAPIResponse: Decodable {
        let kpis: AnalyticsKPIs
        let trends: AnalyticsTrends
    }

    struct AnalyticsKPIs: Decodable {
        let totalProjects: Int
        let activeProjects: Int
        let totalBudget: Double
        let totalSpent: Double
        let timeEntries: Int
        let dailyLogs: Int
        let incidents: Int
        let equipment: Int
    }

    struct AnalyticsTrends: Decodable {
        let productivity: Double
        let budgetUtilization: Double
        let safetyScore: Double
        let scheduleAdherence: Double
    }

    // MARK: - Fetch Analytics Dashboard

    func fetchAnalytics() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let response: AnalyticsAPIResponse = try await apiClient.get("/analytics")

            // Transform API response to expected format
            let completedProjects = max(0, response.kpis.totalProjects - response.kpis.activeProjects)
            let avgCompletion = response.trends.scheduleAdherence

            analytics = AnalyticsDashboard(
                projectMetrics: ProjectMetrics(
                    activeProjects: response.kpis.activeProjects,
                    completedProjects: completedProjects,
                    onHoldProjects: 0,
                    totalBudget: response.kpis.totalBudget,
                    averageCompletion: avgCompletion
                ),
                laborMetrics: LaborMetrics(
                    totalHoursThisWeek: Double(response.kpis.timeEntries * 8), // Estimate
                    totalHoursLastWeek: Double(response.kpis.timeEntries * 8) * (1 - response.trends.productivity / 100),
                    activeWorkers: response.kpis.timeEntries > 0 ? max(1, response.kpis.timeEntries / 5) : 0,
                    overtimeHours: 0,
                    averageHoursPerWorker: 40
                ),
                safetyMetrics: SafetyMetrics(
                    incidentsThisMonth: response.kpis.incidents,
                    incidentsLastMonth: response.kpis.incidents,
                    daysWithoutIncident: response.kpis.incidents == 0 ? 30 : 0,
                    openInspections: 0,
                    upcomingTrainings: 0
                ),
                financialMetrics: FinancialMetrics(
                    totalRevenue: response.kpis.totalBudget,
                    totalCosts: response.kpis.totalSpent,
                    profitMargin: response.kpis.totalBudget > 0 ? ((response.kpis.totalBudget - response.kpis.totalSpent) / response.kpis.totalBudget) * 100 : 0,
                    pendingInvoices: 0,
                    overdueInvoices: 0
                )
            )

            print("[ReportService] Analytics loaded: \(response.kpis.activeProjects) active projects")
        } catch {
            print("Failed to fetch analytics: \(error)")
            self.error = error.localizedDescription
            // Mock data
            analytics = AnalyticsDashboard(
                projectMetrics: ProjectMetrics(
                    activeProjects: 5,
                    completedProjects: 12,
                    onHoldProjects: 2,
                    totalBudget: 15000000,
                    averageCompletion: 68.5
                ),
                laborMetrics: LaborMetrics(
                    totalHoursThisWeek: 1250,
                    totalHoursLastWeek: 1180,
                    activeWorkers: 45,
                    overtimeHours: 120,
                    averageHoursPerWorker: 27.8
                ),
                safetyMetrics: SafetyMetrics(
                    incidentsThisMonth: 1,
                    incidentsLastMonth: 2,
                    daysWithoutIncident: 15,
                    openInspections: 3,
                    upcomingTrainings: 5
                ),
                financialMetrics: FinancialMetrics(
                    totalRevenue: 8500000,
                    totalCosts: 6200000,
                    profitMargin: 27.1,
                    pendingInvoices: 250000,
                    overdueInvoices: 45000
                )
            )
        }
    }

    // MARK: - Save Report

    func saveReport(_ report: SavedReport) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let _: SavedReport = try await apiClient.post("/saved-reports", body: report)
            await fetchSavedReports()
            return true
        } catch {
            print("Failed to save report: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Delete Saved Report

    func deleteSavedReport(id: String) async -> Bool {
        do {
            try await apiClient.delete("/saved-reports/\(id)")
            savedReports.removeAll { $0.id == id }
            return true
        } catch {
            print("Failed to delete saved report: \(error)")
            return false
        }
    }

    // MARK: - Export Report

    func exportReport(reportId: String, format: String) async -> URL? {
        // In a real implementation, this would return a download URL
        do {
            struct ExportResponse: Codable {
                let downloadUrl: String
            }
            let response: ExportResponse = try await apiClient.post("/reports/\(reportId)/export", body: ["format": format])
            return URL(string: response.downloadUrl)
        } catch {
            print("Failed to export report: \(error)")
            return nil
        }
    }
}

// MARK: - Request Models
private struct GenerateReportRequest: Encodable {
    let type: String
    let period: String
    let projectId: String?
    let startDate: String?
    let endDate: String?

    enum CodingKeys: String, CodingKey {
        case type, period
        case projectId = "project_id"
        case startDate = "start_date"
        case endDate = "end_date"
    }
}
