//
//  AppSettings.swift
//  ConstructionManager
//
//  App settings and preferences models
//

import Foundation

// MARK: - Company Settings
struct CompanySettings: Codable {
    var companyName: String
    var timezone: String
    var dateFormat: DateFormatOption
    var currency: CurrencyOption

    // Feature Toggles
    var requireGPSForClockIn: Bool
    var requirePhotoInDailyLogs: Bool
    var autoApproveTimesheets: Bool
    var requireDailyLogApproval: Bool
    var enablePushNotifications: Bool
    var enableEmailNotifications: Bool
    var hideBuildingInfo: Bool

    // Module Toggles
    var enabledModules: [AppModule]

    static let `default` = CompanySettings(
        companyName: "Construction Co.",
        timezone: "America/Los_Angeles",
        dateFormat: .mmddyyyy,
        currency: .usd,
        requireGPSForClockIn: true,
        requirePhotoInDailyLogs: false,
        autoApproveTimesheets: false,
        requireDailyLogApproval: true,
        enablePushNotifications: true,
        enableEmailNotifications: true,
        hideBuildingInfo: false,
        enabledModules: AppModule.allCases
    )
}

// MARK: - User Preferences
struct UserPreferences: Codable {
    var theme: ThemeOption
    var defaultView: ViewOption
    var itemsPerPage: Int
    var showCompletedTasks: Bool

    // Notification Preferences
    var dailyDigest: Bool
    var approvalNotifications: Bool
    var mentionNotifications: Bool
    var certExpiryAlerts: Bool

    static let `default` = UserPreferences(
        theme: .system,
        defaultView: .list,
        itemsPerPage: 25,
        showCompletedTasks: false,
        dailyDigest: true,
        approvalNotifications: true,
        mentionNotifications: true,
        certExpiryAlerts: true
    )
}

// MARK: - Enums
enum DateFormatOption: String, Codable, CaseIterable {
    case mmddyyyy = "MM/DD/YYYY"
    case ddmmyyyy = "DD/MM/YYYY"
    case yyyymmdd = "YYYY-MM-DD"
}

enum CurrencyOption: String, Codable, CaseIterable {
    case usd = "USD"
    case cad = "CAD"
    case eur = "EUR"
    case gbp = "GBP"
    case mxn = "MXN"

    var symbol: String {
        switch self {
        case .usd, .cad: return "$"
        case .eur: return "€"
        case .gbp: return "£"
        case .mxn: return "$"
        }
    }
}

enum ThemeOption: String, Codable, CaseIterable {
    case light = "Light"
    case dark = "Dark"
    case system = "System"
}

enum ViewOption: String, Codable, CaseIterable {
    case list = "List"
    case grid = "Grid"
    case calendar = "Calendar"
}

enum AppModule: String, Codable, CaseIterable {
    case projects = "Projects"
    case dailyLogs = "Daily Logs"
    case timeTracking = "Time Tracking"
    case scheduling = "Scheduling"
    case equipment = "Equipment"
    case documents = "Documents"
    case qualitySafety = "Quality & Safety"
    case financials = "Financials"
    case reports = "Reports"
    case analytics = "Analytics"
    case subcontractors = "Subcontractors"
    case certifications = "Certifications"
    case droneDeploy = "DroneDeploy"
    case approvals = "Approvals"
    case employeeWarnings = "Employee Warnings"

    var icon: String {
        switch self {
        case .projects: return "folder.fill"
        case .dailyLogs: return "doc.text.fill"
        case .timeTracking: return "clock.fill"
        case .scheduling: return "calendar"
        case .equipment: return "wrench.and.screwdriver.fill"
        case .documents: return "doc.on.doc.fill"
        case .qualitySafety: return "checkmark.shield.fill"
        case .financials: return "dollarsign.circle.fill"
        case .reports: return "chart.bar.fill"
        case .analytics: return "chart.line.uptrend.xyaxis"
        case .subcontractors: return "person.2.fill"
        case .certifications: return "checkmark.seal.fill"
        case .droneDeploy: return "airplane"
        case .approvals: return "checkmark.circle.fill"
        case .employeeWarnings: return "exclamationmark.triangle.fill"
        }
    }

    var description: String {
        switch self {
        case .projects: return "Project management and tracking"
        case .dailyLogs: return "Daily work logs and reports"
        case .timeTracking: return "Clock in/out and timesheets"
        case .scheduling: return "Crew scheduling and calendar"
        case .equipment: return "Equipment inventory and tracking"
        case .documents: return "Document and photo management"
        case .qualitySafety: return "Inspections, incidents, safety"
        case .financials: return "Budgets, invoices, expenses"
        case .reports: return "Report generation and exports"
        case .analytics: return "Advanced analytics and forecasting"
        case .subcontractors: return "Subcontractor directory"
        case .certifications: return "License and certification tracking"
        case .droneDeploy: return "Drone flight logging and mapping"
        case .approvals: return "Time and log approval workflow"
        case .employeeWarnings: return "Employee discipline tracking"
        }
    }
}
