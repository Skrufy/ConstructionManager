//
//  CompanySettingsView.swift
//  ConstructionManager
//
//  Admin view for editing company profile and settings
//

import SwiftUI

// MARK: - Admin Company Settings Model (local to this view)
private struct AdminCompanySettings: Codable {
    let id: String?
    var companyName: String
    var companyLogo: String?
    var timezone: String
    var dateFormat: String
    var currency: String

    // Feature settings
    var requireGpsClockIn: Bool
    var requirePhotoDaily: Bool
    var autoApproveTimesheet: Bool
    var dailyLogReminders: Bool
    var certExpiryAlertDays: Int
    var maxFileUploadMB: Int
    var emailNotifications: Bool
    var pushNotifications: Bool
    var dailyLogApprovalRequired: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case companyName = "company_name"
        case companyLogo = "company_logo"
        case timezone
        case dateFormat = "date_format"
        case currency
        case requireGpsClockIn = "require_gps_clock_in"
        case requirePhotoDaily = "require_photo_daily"
        case autoApproveTimesheet = "auto_approve_timesheet"
        case dailyLogReminders = "daily_log_reminders"
        case certExpiryAlertDays = "cert_expiry_alert_days"
        case maxFileUploadMB = "max_file_upload_mb"
        case emailNotifications = "email_notifications"
        case pushNotifications = "push_notifications"
        case dailyLogApprovalRequired = "daily_log_approval_required"
    }

    static let `default` = AdminCompanySettings(
        id: nil,
        companyName: "",
        companyLogo: nil,
        timezone: "America/Los_Angeles",
        dateFormat: "MM/DD/YYYY",
        currency: "USD",
        requireGpsClockIn: false,
        requirePhotoDaily: false,
        autoApproveTimesheet: false,
        dailyLogReminders: true,
        certExpiryAlertDays: 30,
        maxFileUploadMB: 50,
        emailNotifications: true,
        pushNotifications: false,
        dailyLogApprovalRequired: true
    )
}

// MARK: - Settings Response
private struct SettingsAPIResponse: Decodable {
    let company: AdminCompanySettings?
}

// MARK: - Update Request
private struct UpdateCompanyRequest: Encodable {
    let type: String = "company"
    let settings: SettingsPayload

    struct SettingsPayload: Encodable {
        let companyName: String
        let timezone: String
        let dateFormat: String
        let currency: String
        let requireGpsClockIn: Bool
        let requirePhotoDaily: Bool
        let autoApproveTimesheet: Bool
        let dailyLogReminders: Bool
        let certExpiryAlertDays: Int
        let maxFileUploadMB: Int
        let emailNotifications: Bool
        let pushNotifications: Bool
        let dailyLogApprovalRequired: Bool
    }
}

// MARK: - Company Settings View
struct CompanySettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState
    @State private var settings: AdminCompanySettings = .default
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var error: String?
    @State private var showSuccessAlert = false
    @State private var activeSection: SettingsSection = .company

    private let apiClient = APIClient.shared

    enum SettingsSection: String, CaseIterable {
        case company = "Company"
        case features = "Features"
        case notifications = "Notifications"

        var icon: String {
            switch self {
            case .company: return "building.2.fill"
            case .features: return "gearshape.fill"
            case .notifications: return "bell.fill"
            }
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if isLoading {
                    loadingView
                } else {
                    VStack(spacing: AppSpacing.lg) {
                        // Section Picker
                        sectionPicker

                        // Content based on section
                        switch activeSection {
                        case .company:
                            companySection
                        case .features:
                            featuresSection
                        case .notifications:
                            notificationsSection
                        }

                        // Error message
                        if let error = error {
                            errorBanner(error)
                        }

                        // Save button
                        PrimaryButton("Save Changes", icon: "checkmark.circle.fill", isLoading: isSaving) {
                            _ = Task { await saveSettings() }
                        }
                        .padding(.top, AppSpacing.md)
                    }
                    .padding(AppSpacing.md)
                }
            }
            .background(AppColors.background)
            .navigationTitle("Company Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(AppColors.textSecondary)
                }
            }
            .alert("Settings Saved", isPresented: $showSuccessAlert) {
                Button("OK") { dismiss() }
            } message: {
                Text("Company settings have been updated successfully.")
            }
            .task {
                await fetchSettings()
            }
        }
    }

    // MARK: - Section Picker
    private var sectionPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                ForEach(SettingsSection.allCases, id: \.self) { section in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            activeSection = section
                        }
                    } label: {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: section.icon)
                                .font(.system(size: 14))
                            Text(section.rawValue)
                                .font(AppTypography.bodySemibold)
                        }
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.vertical, AppSpacing.sm)
                        .foregroundColor(activeSection == section ? .white : AppColors.textSecondary)
                        .background(activeSection == section ? AppColors.primary600 : AppColors.cardBackground)
                        .cornerRadius(AppSpacing.radiusFull)
                    }
                }
            }
        }
    }

    // MARK: - Company Section
    private var companySection: some View {
        VStack(spacing: AppSpacing.md) {
            // Header
            sectionHeader(title: "Company Information", subtitle: "Basic company details and preferences")

            // Company Name
            AppTextField(
                label: "Company Name",
                placeholder: "Enter company name",
                text: $settings.companyName,
                icon: "building.2",
                isRequired: true
            )

            // Timezone Picker
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Text("Timezone")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)

                Menu {
                    ForEach(timezones, id: \.value) { tz in
                        Button {
                            settings.timezone = tz.value
                        } label: {
                            HStack {
                                Text(tz.label)
                                if settings.timezone == tz.value {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "globe")
                            .foregroundColor(AppColors.gray400)
                        Text(timezoneLabel(for: settings.timezone))
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textPrimary)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.gray400)
                    }
                    .padding(.horizontal, AppSpacing.md)
                    .frame(height: AppSpacing.inputHeight)
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppSpacing.radiusLarge)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                            .stroke(AppColors.gray300, lineWidth: 1.5)
                    )
                }
            }

            // Date Format Picker
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Text("Date Format")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)

                Menu {
                    ForEach(dateFormats, id: \.value) { df in
                        Button {
                            settings.dateFormat = df.value
                        } label: {
                            HStack {
                                Text(df.label)
                                if settings.dateFormat == df.value {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "calendar")
                            .foregroundColor(AppColors.gray400)
                        Text(dateFormatLabel(for: settings.dateFormat))
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textPrimary)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.gray400)
                    }
                    .padding(.horizontal, AppSpacing.md)
                    .frame(height: AppSpacing.inputHeight)
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppSpacing.radiusLarge)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                            .stroke(AppColors.gray300, lineWidth: 1.5)
                    )
                }
            }

            // Currency Picker
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Text("Currency")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.textPrimary)

                Menu {
                    ForEach(currencies, id: \.value) { c in
                        Button {
                            settings.currency = c.value
                        } label: {
                            HStack {
                                Text(c.label)
                                if settings.currency == c.value {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "dollarsign.circle")
                            .foregroundColor(AppColors.gray400)
                        Text(currencyLabel(for: settings.currency))
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textPrimary)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.gray400)
                    }
                    .padding(.horizontal, AppSpacing.md)
                    .frame(height: AppSpacing.inputHeight)
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppSpacing.radiusLarge)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                            .stroke(AppColors.gray300, lineWidth: 1.5)
                    )
                }
            }
        }
    }

    // MARK: - Features Section
    private var featuresSection: some View {
        VStack(spacing: AppSpacing.md) {
            // Header
            sectionHeader(title: "Feature Configuration", subtitle: "Configure app behavior and requirements")

            // Toggle cards
            VStack(spacing: 0) {
                SettingsToggleRow(
                    icon: "location.fill",
                    iconColor: AppColors.info,
                    title: "Require GPS for Clock In/Out",
                    subtitle: "Employees must enable location when clocking in",
                    isOn: $settings.requireGpsClockIn
                )

                Divider().padding(.leading, 56)

                SettingsToggleRow(
                    icon: "camera.fill",
                    iconColor: AppColors.purple,
                    title: "Require Photo in Daily Logs",
                    subtitle: "Daily logs must include at least one photo",
                    isOn: $settings.requirePhotoDaily
                )

                Divider().padding(.leading, 56)

                SettingsToggleRow(
                    icon: "checkmark.circle.fill",
                    iconColor: AppColors.success,
                    title: "Auto-Approve Timesheets",
                    subtitle: "Automatically approve time entries",
                    isOn: $settings.autoApproveTimesheet
                )

                Divider().padding(.leading, 56)

                SettingsToggleRow(
                    icon: "doc.text.fill",
                    iconColor: AppColors.warning,
                    title: "Require Daily Log Approval",
                    subtitle: "Daily logs need manager approval",
                    isOn: $settings.dailyLogApprovalRequired
                )

                Divider().padding(.leading, 56)

                SettingsToggleRow(
                    icon: "bell.badge.fill",
                    iconColor: AppColors.orange,
                    title: "Daily Log Reminders",
                    subtitle: "Send reminders for incomplete logs",
                    isOn: $settings.dailyLogReminders
                )
            }
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)

            // Numeric settings
            VStack(spacing: AppSpacing.sm) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Certification Expiry Alert")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        Text("Days before expiry to send alerts")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    Spacer()
                    Stepper("\(settings.certExpiryAlertDays) days", value: $settings.certExpiryAlertDays, in: 1...365)
                        .font(AppTypography.body)
                }
                .padding(AppSpacing.md)
                .background(AppColors.cardBackground)
                .cornerRadius(AppSpacing.radiusMedium)

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Max File Upload Size")
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        Text("Maximum file size for uploads")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    Spacer()
                    Stepper("\(settings.maxFileUploadMB) MB", value: $settings.maxFileUploadMB, in: 1...500, step: 10)
                        .font(AppTypography.body)
                }
                .padding(AppSpacing.md)
                .background(AppColors.cardBackground)
                .cornerRadius(AppSpacing.radiusMedium)
            }
        }
    }

    // MARK: - Notifications Section
    private var notificationsSection: some View {
        VStack(spacing: AppSpacing.md) {
            // Header
            sectionHeader(title: "Notification Settings", subtitle: "Configure how notifications are sent")

            VStack(spacing: 0) {
                SettingsToggleRow(
                    icon: "envelope.fill",
                    iconColor: AppColors.info,
                    title: "Email Notifications",
                    subtitle: "Send email notifications for important events",
                    isOn: $settings.emailNotifications
                )

                Divider().padding(.leading, 56)

                SettingsToggleRow(
                    icon: "bell.fill",
                    iconColor: AppColors.primary600,
                    title: "Push Notifications",
                    subtitle: "Enable push notifications on devices",
                    isOn: $settings.pushNotifications
                )
            }
            .background(AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
        }
    }

    // MARK: - Helper Views
    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading settings...")
                .font(AppTypography.body)
                .foregroundColor(AppColors.textSecondary)
                .padding(.top, AppSpacing.md)
            Spacer()
        }
        .frame(minHeight: 300)
    }

    private func sectionHeader(title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: AppSpacing.xxs) {
            Text(title)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
            Text(subtitle)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(AppColors.error)
            Text(message)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.error)
        }
        .padding(AppSpacing.md)
        .frame(maxWidth: .infinity)
        .background(AppColors.error.opacity(0.1))
        .cornerRadius(AppSpacing.radiusMedium)
    }

    // MARK: - Data
    private let timezones = [
        (value: "America/New_York", label: "Eastern Time (ET)"),
        (value: "America/Chicago", label: "Central Time (CT)"),
        (value: "America/Denver", label: "Mountain Time (MT)"),
        (value: "America/Los_Angeles", label: "Pacific Time (PT)"),
        (value: "America/Anchorage", label: "Alaska Time (AKT)"),
        (value: "Pacific/Honolulu", label: "Hawaii Time (HT)"),
        (value: "UTC", label: "UTC")
    ]

    private let dateFormats = [
        (value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)"),
        (value: "DD/MM/YYYY", label: "DD/MM/YYYY (International)"),
        (value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)")
    ]

    private let currencies = [
        (value: "USD", label: "US Dollar ($)"),
        (value: "CAD", label: "Canadian Dollar (C$)"),
        (value: "EUR", label: "Euro"),
        (value: "GBP", label: "British Pound"),
        (value: "MXN", label: "Mexican Peso (MX$)")
    ]

    private func timezoneLabel(for value: String) -> String {
        timezones.first { $0.value == value }?.label ?? value
    }

    private func dateFormatLabel(for value: String) -> String {
        dateFormats.first { $0.value == value }?.label ?? value
    }

    private func currencyLabel(for value: String) -> String {
        currencies.first { $0.value == value }?.label ?? value
    }

    // MARK: - API Methods
    private func fetchSettings() async {
        isLoading = true
        error = nil

        do {
            let response: SettingsAPIResponse = try await apiClient.get("/settings")
            if let company = response.company {
                settings = company
            }
        } catch {
            print("Failed to fetch settings: \(error)")
            self.error = "Failed to load settings. Please try again."
        }

        isLoading = false
    }

    private func saveSettings() async {
        isSaving = true
        error = nil

        do {
            let payload = UpdateCompanyRequest.SettingsPayload(
                companyName: settings.companyName,
                timezone: settings.timezone,
                dateFormat: settings.dateFormat,
                currency: settings.currency,
                requireGpsClockIn: settings.requireGpsClockIn,
                requirePhotoDaily: settings.requirePhotoDaily,
                autoApproveTimesheet: settings.autoApproveTimesheet,
                dailyLogReminders: settings.dailyLogReminders,
                certExpiryAlertDays: settings.certExpiryAlertDays,
                maxFileUploadMB: settings.maxFileUploadMB,
                emailNotifications: settings.emailNotifications,
                pushNotifications: settings.pushNotifications,
                dailyLogApprovalRequired: settings.dailyLogApprovalRequired
            )
            let request = UpdateCompanyRequest(settings: payload)
            let _: EmptyResponse = try await apiClient.put("/settings", body: request)
            showSuccessAlert = true
        } catch {
            print("Failed to save settings: \(error)")
            self.error = "Failed to save settings. Please try again."
        }

        isSaving = false
    }
}

// MARK: - Settings Toggle Row
struct SettingsToggleRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String
    @Binding var isOn: Bool

    var body: some View {
        HStack(spacing: AppSpacing.sm) {
            ZStack {
                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                    .fill(iconColor.opacity(0.12))
                    .frame(width: 40, height: 40)
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(iconColor)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
                Text(subtitle)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                    .lineLimit(2)
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(AppColors.primary600)
        }
        .padding(AppSpacing.md)
    }
}

#Preview {
    CompanySettingsView()
        .environmentObject(AppState())
}
