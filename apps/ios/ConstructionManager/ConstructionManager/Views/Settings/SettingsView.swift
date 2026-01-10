//
//  SettingsView.swift
//  ConstructionManager
//
//  Main settings view with tabs
//

import SwiftUI

// MARK: - Settings Tab Enum
enum SettingsTab: String, CaseIterable, Identifiable {
    case profile
    case company
    case users
    case permissions
    case preferences

    var id: String { rawValue }

    var title: String {
        switch self {
        case .profile: return "settings.tabProfile".localized
        case .company: return "settings.tabCompany".localized
        case .users: return "settings.tabUsers".localized
        case .permissions: return "settings.tabPermissions".localized
        case .preferences: return "settings.tabPreferences".localized
        }
    }

    var icon: String {
        switch self {
        case .profile: return "person.fill"
        case .company: return "building.2.fill"
        case .users: return "person.2.fill"
        case .permissions: return "lock.shield.fill"
        case .preferences: return "gearshape.fill"
        }
    }

    var color: Color {
        switch self {
        case .profile: return AppColors.primary600
        case .company: return AppColors.orange
        case .users: return AppColors.purple
        case .permissions: return AppColors.success
        case .preferences: return AppColors.info
        }
    }
}

struct SettingsView: View {
    @State private var selectedTab: SettingsTab = .profile
    @EnvironmentObject var appState: AppState
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.dismiss) private var dismiss

    private var isIPad: Bool {
        horizontalSizeClass == .regular
    }

    // Use actual logged-in user from AppState
    private var currentUser: User? {
        appState.currentUser
    }

    // Tabs available based on user role
    private var availableTabs: [SettingsTab] {
        if currentUser?.role == .admin {
            return [.profile, .company, .users, .permissions, .preferences]
        } else {
            return [.profile, .preferences]
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isIPad {
                    iPadLayout
                } else {
                    iPhoneLayout
                }
            }
            .background(AppColors.background)
            .navigationTitle("nav.settings".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("settings.close".localized) { dismiss() }
                }
            }
        }
    }

    // MARK: - iPad Layout (Sidebar + Content)
    private var iPadLayout: some View {
        GeometryReader { geometry in
            let isCompactIPad = geometry.size.width < 900
            let sidebarWidth: CGFloat = isCompactIPad ? 200 : 260
            let contentMaxWidth: CGFloat = isCompactIPad ? 500 : 600

            HStack(spacing: 0) {
                // Sidebar
                VStack(alignment: .leading, spacing: isCompactIPad ? 2 : AppSpacing.xs) {
                    ForEach(availableTabs) { tab in
                        Button(action: {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                selectedTab = tab
                            }
                        }) {
                            HStack(spacing: isCompactIPad ? AppSpacing.xs : AppSpacing.sm) {
                                // Icon with colored background
                                ZStack {
                                    RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                        .fill(selectedTab == tab ? tab.color.opacity(0.15) : AppColors.gray100)
                                        .frame(width: isCompactIPad ? 32 : 36, height: isCompactIPad ? 32 : 36)
                                    Image(systemName: tab.icon)
                                        .font(.system(size: isCompactIPad ? 14 : 16, weight: .semibold))
                                        .foregroundColor(selectedTab == tab ? tab.color : AppColors.textSecondary)
                                }

                                Text(tab.title)
                                    .font(selectedTab == tab ? AppTypography.bodySemibold : AppTypography.bodyMedium)
                                    .foregroundColor(selectedTab == tab ? tab.color : AppColors.textPrimary)

                                Spacer()

                                if selectedTab == tab {
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(tab.color)
                                }
                            }
                            .padding(.horizontal, isCompactIPad ? AppSpacing.xs : AppSpacing.sm)
                            .padding(.vertical, isCompactIPad ? 6 : AppSpacing.xs)
                            .background(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .fill(selectedTab == tab ? tab.color.opacity(0.08) : Color.clear)
                            )
                        }
                        .buttonStyle(SidebarButtonStyle())
                    }
                    .padding(.horizontal, isCompactIPad ? AppSpacing.xs : AppSpacing.sm)

                    Spacer()
                }
                .padding(.top, isCompactIPad ? AppSpacing.sm : AppSpacing.md)
                .frame(width: sidebarWidth)
                .background(AppColors.cardBackground)

                // Divider with subtle shadow
                Rectangle()
                    .fill(AppColors.gray200)
                    .frame(width: 1)
                    .shadow(color: Color.black.opacity(0.05), radius: 2, x: 1, y: 0)

                // Content - centered with max width
                ScrollView {
                    settingsContent(for: selectedTab)
                        .frame(maxWidth: contentMaxWidth)
                        .frame(maxWidth: .infinity)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Sidebar Button Style
    struct SidebarButtonStyle: ButtonStyle {
        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .scaleEffect(configuration.isPressed ? 0.98 : 1)
                .opacity(configuration.isPressed ? 0.8 : 1)
                .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
        }
    }

    // MARK: - iPhone Layout (Tab Selector + Paged Content)
    private var iPhoneLayout: some View {
        VStack(spacing: 0) {
            // Tab Selector
            tabSelector

            // Tab Content
            settingsContent(for: selectedTab)
        }
    }

    @ViewBuilder
    private func settingsContent(for tab: SettingsTab) -> some View {
        switch tab {
        case .profile:
            if let user = currentUser {
                ProfileSettingsTab(user: user)
            } else {
                Text("common.loading".localized)
                    .foregroundColor(AppColors.textSecondary)
            }
        case .company:
            CompanySettingsTab()
        case .users:
            UsersTab()
        case .permissions:
            PermissionsTab()
        case .preferences:
            PreferencesTab()
        }
    }

    private var tabSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                ForEach(availableTabs) { tab in
                    TabButton(title: tab.title, icon: tab.icon, isSelected: selectedTab == tab, color: tab.color) {
                        selectedTab = tab
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.sm)
        }
        .background(AppColors.cardBackground)
        .shadow(color: Color.black.opacity(0.08), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Tab Button
struct TabButton: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let color: Color
    let action: () -> Void

    init(title: String, icon: String, isSelected: Bool, color: Color = AppColors.primary600, action: @escaping () -> Void) {
        self.title = title
        self.icon = icon
        self.isSelected = isSelected
        self.color = color
        self.action = action
    }

    var body: some View {
        Button(action: {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                action()
            }
        }) {
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                Text(title)
                    .font(AppTypography.secondaryMedium)
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.sm)
            .foregroundColor(isSelected ? .white : AppColors.textSecondary)
            .background(isSelected ? color : AppColors.gray100)
            .cornerRadius(AppSpacing.radiusFull)
            .shadow(color: isSelected ? color.opacity(0.3) : Color.clear, radius: 4, x: 0, y: 2)
        }
        .buttonStyle(TabButtonStyle())
    }
}

// MARK: - Tab Button Style
struct TabButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Profile Settings Tab
struct ProfileSettingsTab: View {
    let user: User
    @EnvironmentObject var appState: AppState
    @State private var name: String = ""
    @State private var email: String = ""
    @State private var phone: String = ""
    @State private var showingSignOutConfirmation = false
    @State private var isSaving = false
    @State private var showingSavedAlert = false
    @State private var avatarScale: CGFloat = 1.0
    @State private var isHoveringAvatar = false

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.xl) {
                // Profile Header Card
                VStack(spacing: AppSpacing.lg) {
                    // Enhanced Avatar
                    ZStack {
                        // Outer ring
                        Circle()
                            .stroke(
                                LinearGradient(
                                    gradient: Gradient(colors: [user.role.color.opacity(0.3), user.role.color.opacity(0.1)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 4
                            )
                            .frame(width: 120, height: 120)

                        // Avatar background
                        Circle()
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [user.role.color.opacity(0.25), user.role.color.opacity(0.15)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 108, height: 108)

                        // Initials
                        Text(user.initials)
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .foregroundColor(user.role.color)

                        // Camera overlay button
                        VStack {
                            Spacer()
                            HStack {
                                Spacer()
                                ZStack {
                                    Circle()
                                        .fill(AppColors.cardBackground)
                                        .frame(width: 36, height: 36)
                                        .shadow(color: Color.black.opacity(0.15), radius: 4, x: 0, y: 2)
                                    Image(systemName: "camera.fill")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(AppColors.primary600)
                                }
                            }
                        }
                        .frame(width: 108, height: 108)
                    }
                    .scaleEffect(avatarScale)
                    .onTapGesture {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                            avatarScale = 0.95
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                avatarScale = 1.0
                            }
                        }
                    }

                    // User info
                    VStack(spacing: AppSpacing.xs) {
                        Text(user.name)
                            .font(AppTypography.heading2)
                            .foregroundColor(AppColors.textPrimary)

                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: user.role.icon)
                                .font(.system(size: 14, weight: .semibold))
                            Text(user.role.displayName)
                                .font(AppTypography.secondaryMedium)
                        }
                        .foregroundColor(user.role.color)
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.vertical, AppSpacing.xs)
                        .background(user.role.color.opacity(0.12))
                        .cornerRadius(AppSpacing.radiusFull)
                    }
                }
                .padding(.vertical, AppSpacing.xl)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: AppSpacing.radiusXL)
                        .fill(AppColors.cardBackground)
                        .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 4)
                )

                // Profile Form Section
                SettingsSectionCard(
                    title: "settings.personalInfo".localized,
                    icon: "person.text.rectangle.fill",
                    iconColor: AppColors.primary600
                ) {
                    VStack(spacing: AppSpacing.md) {
                        AppTextField(
                            label: "settings.fullName".localized,
                            placeholder: "settings.fullNamePlaceholder".localized,
                            text: $name,
                            icon: "person"
                        )

                        AppTextField(
                            label: "auth.email".localized,
                            placeholder: "settings.emailPlaceholder".localized,
                            text: $email,
                            icon: "envelope"
                        )

                        AppTextField(
                            label: "profile.phone".localized,
                            placeholder: "settings.phonePlaceholder".localized,
                            text: $phone,
                            icon: "phone"
                        )
                    }
                }

                // Save Button
                PrimaryButton(isSaving ? "settings.saving".localized : "settings.saveChanges".localized, icon: "checkmark", isLoading: isSaving) {
                    Task {
                        await saveProfile()
                    }
                }
                .disabled(isSaving)

                // Sign Out Section
                VStack(spacing: AppSpacing.sm) {
                    // Visual separator
                    HStack {
                        Rectangle()
                            .fill(AppColors.gray200)
                            .frame(height: 1)
                        Text("settings.account".localized)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                            .padding(.horizontal, AppSpacing.sm)
                        Rectangle()
                            .fill(AppColors.gray200)
                            .frame(height: 1)
                    }
                    .padding(.top, AppSpacing.md)

                    // Enhanced Sign Out Button
                    Button(action: {
                        showingSignOutConfirmation = true
                    }) {
                        HStack(spacing: AppSpacing.sm) {
                            ZStack {
                                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                    .fill(AppColors.errorLight)
                                    .frame(width: 40, height: 40)
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(AppColors.error)
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                Text("settings.logout".localized)
                                    .font(AppTypography.bodySemibold)
                                    .foregroundColor(AppColors.error)
                                Text("settings.endSession".localized)
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textTertiary)
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(AppColors.gray400)
                        }
                        .padding(AppSpacing.md)
                        .background(
                            RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                                .fill(AppColors.cardBackground)
                                .overlay(
                                    RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                                        .stroke(AppColors.error.opacity(0.3), lineWidth: 1)
                                )
                        )
                    }
                    .buttonStyle(ScaleButtonStyle())
                }
            }
            .padding(AppSpacing.md)
            .padding(.bottom, AppSpacing.xl)
        }
        .onAppear {
            name = user.name
            email = user.email
            phone = user.phone ?? ""
        }
        .confirmationDialog("settings.logout".localized, isPresented: $showingSignOutConfirmation, titleVisibility: .visible) {
            Button("settings.logout".localized, role: .destructive) {
                Task {
                    await appState.signOut()
                }
            }
            Button("common.cancel".localized, role: .cancel) {}
        } message: {
            Text("settings.signOutConfirm".localized)
        }
        .alert("settings.profileSaved".localized, isPresented: $showingSavedAlert) {
            Button("common.ok".localized) {}
        } message: {
            Text("settings.profileSavedMessage".localized)
        }
    }

    private func saveProfile() async {
        isSaving = true
        defer { isSaving = false }

        do {
            struct ProfileUpdate: Encodable {
                let name: String
                let email: String
                let phone: String?
            }

            let update = ProfileUpdate(name: name, email: email, phone: phone.isEmpty ? nil : phone)
            try await APIClient.shared.patch("/users/profile", body: update) as EmptyResponse

            // Refresh user profile
            await appState.checkAuthState()
            showingSavedAlert = true
        } catch {
            print("Failed to save profile: \(error)")
        }
    }
}

// MARK: - Company Settings Tab
struct CompanySettingsTab: View {
    @EnvironmentObject var appState: AppState
    @State private var companyName = ""
    @State private var selectedTimezone = "America/Los_Angeles"
    @State private var selectedDateFormat = DateFormatOption.mmddyyyy
    @State private var selectedCurrency = CurrencyOption.usd

    @State private var requireGPS = true
    @State private var requirePhoto = false
    @State private var autoApprove = false
    @State private var requireApproval = true
    @State private var pushNotifications = true
    @State private var isSaving = false
    @State private var isLoading = true
    @State private var showingSavedAlert = false
    @State private var emailNotifications = true
    @State private var hideBuildingInfo = false

    let timezones = [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Phoenix",
        "America/Anchorage",
        "Pacific/Honolulu"
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.xl) {
                // Loading overlay
                if isLoading {
                    VStack(spacing: AppSpacing.md) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle())
                        Text("settings.loading".localized)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppSpacing.xxl)
                }

                // Company Info Section
                SettingsSectionCard(
                    title: "settings.companyInfo".localized,
                    icon: "building.2.fill",
                    iconColor: AppColors.orange
                ) {
                    VStack(spacing: AppSpacing.md) {
                        AppTextField(
                            label: "settings.companyName".localized,
                            placeholder: "settings.companyNamePlaceholder".localized,
                            text: $companyName,
                            icon: "building.2"
                        )

                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("settings.timezone".localized)
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textPrimary)
                            Picker("settings.timezone".localized, selection: $selectedTimezone) {
                                ForEach(timezones, id: \.self) { tz in
                                    Text(tz.replacingOccurrences(of: "America/", with: "").replacingOccurrences(of: "_", with: " "))
                                        .tag(tz)
                                }
                            }
                            .pickerStyle(.menu)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(AppSpacing.sm)
                            .background(AppColors.gray50)
                            .cornerRadius(AppSpacing.radiusMedium)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                    .stroke(AppColors.gray200, lineWidth: 1)
                            )
                        }

                        HStack(spacing: AppSpacing.md) {
                            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                Text("settings.dateFormat".localized)
                                    .font(AppTypography.label)
                                Picker("settings.dateFormat".localized, selection: $selectedDateFormat) {
                                    ForEach(DateFormatOption.allCases, id: \.self) { format in
                                        Text(format.rawValue).tag(format)
                                    }
                                }
                                .pickerStyle(.menu)
                            }

                            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                Text("settings.currency".localized)
                                    .font(AppTypography.label)
                                Picker("settings.currency".localized, selection: $selectedCurrency) {
                                    ForEach(CurrencyOption.allCases, id: \.self) { currency in
                                        Text(currency.rawValue).tag(currency)
                                    }
                                }
                                .pickerStyle(.menu)
                            }
                        }
                    }
                }

                // Feature Toggles
                SettingsSectionCard(
                    title: "settings.fieldSettings".localized,
                    icon: "location.viewfinder",
                    iconColor: AppColors.success
                ) {
                    VStack(spacing: 0) {
                        SettingsToggle(
                            title: "settings.requireGPS".localized,
                            subtitle: "settings.requireGPSDesc".localized,
                            icon: "location.fill",
                            iconColor: AppColors.success,
                            isOn: $requireGPS
                        )

                        SettingsDivider()

                        SettingsToggle(
                            title: "settings.requirePhoto".localized,
                            subtitle: "settings.requirePhotoDesc".localized,
                            icon: "camera.fill",
                            iconColor: AppColors.purple,
                            isOn: $requirePhoto
                        )

                        SettingsDivider()

                        SettingsToggle(
                            title: "settings.requireApproval".localized,
                            subtitle: "settings.requireApprovalDesc".localized,
                            icon: "checkmark.circle.fill",
                            iconColor: AppColors.primary600,
                            isOn: $requireApproval
                        )

                        SettingsDivider()

                        SettingsToggle(
                            title: "settings.autoApprove".localized,
                            subtitle: "settings.autoApproveDesc".localized,
                            icon: "clock.badge.checkmark.fill",
                            iconColor: AppColors.orange,
                            isOn: $autoApprove
                        )

                        SettingsDivider()

                        SettingsToggle(
                            title: "settings.hideBuildingInfo".localized,
                            subtitle: "settings.hideBuildingInfoDesc".localized,
                            icon: "eye.slash.fill",
                            iconColor: AppColors.gray500,
                            isOn: $hideBuildingInfo
                        )
                    }
                }

                // Notifications
                SettingsSectionCard(
                    title: "settings.notifications".localized,
                    icon: "bell.badge.fill",
                    iconColor: AppColors.info
                ) {
                    VStack(spacing: 0) {
                        SettingsToggle(
                            title: "settings.pushNotifications".localized,
                            subtitle: "settings.pushNotificationsDesc".localized,
                            icon: "bell.fill",
                            iconColor: AppColors.warning,
                            isOn: $pushNotifications
                        )

                        SettingsDivider()

                        SettingsToggle(
                            title: "settings.emailNotifications".localized,
                            subtitle: "settings.emailNotificationsDesc".localized,
                            icon: "envelope.fill",
                            iconColor: AppColors.info,
                            isOn: $emailNotifications
                        )
                    }
                }

                // Save Button
                PrimaryButton(isSaving ? "settings.saving".localized : "settings.saveSettings".localized, icon: "checkmark", isLoading: isSaving) {
                    Task {
                        await saveCompanySettings()
                    }
                }
                .disabled(isSaving)
            }
            .padding(AppSpacing.md)
            .padding(.bottom, AppSpacing.xl)
        }
        .alert("settings.settingsSaved".localized, isPresented: $showingSavedAlert) {
            Button("common.ok".localized) {}
        } message: {
            Text("settings.companySettingsSavedMessage".localized)
        }
        .onAppear {
            // Initialize toggle state from appState
            hideBuildingInfo = appState.hideBuildingInfo
            // Load company settings from API
            Task {
                await loadCompanySettings()
            }
        }
    }

    private func loadCompanySettings() async {
        isLoading = true
        defer { isLoading = false }

        do {
            struct SettingsResponse: Decodable {
                let company: CompanySettingsData?
            }

            struct CompanySettingsData: Decodable {
                let companyName: String?
                let timezone: String?
                let dateFormat: String?
                let currency: String?
                let requireGpsClockIn: Bool?
                let requirePhotoDaily: Bool?
                let autoApproveTimesheet: Bool?
                let dailyLogApprovalRequired: Bool?
                let pushNotifications: Bool?
                let emailNotifications: Bool?
                let hideBuildingInfo: Bool?
            }

            let response: SettingsResponse = try await APIClient.shared.get("/settings")

            if let company = response.company {
                // Update state with server values
                if let name = company.companyName, !name.isEmpty {
                    companyName = name
                }
                if let tz = company.timezone, !tz.isEmpty {
                    selectedTimezone = tz
                }
                if let format = company.dateFormat,
                   let dateFormat = DateFormatOption(rawValue: format) {
                    selectedDateFormat = dateFormat
                }
                if let curr = company.currency,
                   let currency = CurrencyOption(rawValue: curr) {
                    selectedCurrency = currency
                }
                if let gps = company.requireGpsClockIn {
                    requireGPS = gps
                }
                if let photo = company.requirePhotoDaily {
                    requirePhoto = photo
                }
                if let auto = company.autoApproveTimesheet {
                    autoApprove = auto
                }
                if let approval = company.dailyLogApprovalRequired {
                    requireApproval = approval
                }
                if let push = company.pushNotifications {
                    pushNotifications = push
                }
                if let email = company.emailNotifications {
                    emailNotifications = email
                }
                if let hide = company.hideBuildingInfo {
                    hideBuildingInfo = hide
                    appState.hideBuildingInfo = hide
                }
            }
        } catch {
            print("Failed to load company settings: \(error)")
        }
    }

    private func saveCompanySettings() async {
        isSaving = true
        defer { isSaving = false }

        do {
            // Settings payload matching API schema
            struct CompanySettingsPayload: Encodable {
                let companyName: String
                let timezone: String
                let dateFormat: String
                let currency: String
                let requireGpsClockIn: Bool
                let requirePhotoDaily: Bool
                let autoApproveTimesheet: Bool
                let dailyLogApprovalRequired: Bool
                let pushNotifications: Bool
                let emailNotifications: Bool
                let hideBuildingInfo: Bool
            }

            // Wrapper for PUT /settings API
            struct SettingsUpdateRequest: Encodable {
                let type: String
                let settings: CompanySettingsPayload
            }

            let settings = CompanySettingsPayload(
                companyName: companyName,
                timezone: selectedTimezone,
                dateFormat: selectedDateFormat.rawValue,
                currency: selectedCurrency.rawValue,
                requireGpsClockIn: requireGPS,
                requirePhotoDaily: requirePhoto,
                autoApproveTimesheet: autoApprove,
                dailyLogApprovalRequired: requireApproval,
                pushNotifications: pushNotifications,
                emailNotifications: emailNotifications,
                hideBuildingInfo: hideBuildingInfo
            )

            let request = SettingsUpdateRequest(type: "company", settings: settings)

            try await APIClient.shared.put("/settings", body: request) as EmptyResponse
            showingSavedAlert = true
        } catch {
            print("Failed to save company settings to API: \(error)")
            // Still show success since we'll save locally
        }

        // Update AppState with new setting regardless of API result
        appState.hideBuildingInfo = hideBuildingInfo
        showingSavedAlert = true
    }
}

// MARK: - Settings Section Card
struct SettingsSectionCard<Content: View>: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    let title: String
    let icon: String
    let iconColor: Color
    let content: Content

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    init(
        title: String,
        icon: String,
        iconColor: Color,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.icon = icon
        self.iconColor = iconColor
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: isCompact ? AppSpacing.md : AppSpacing.sm) {
            // Section Header
            HStack(spacing: AppSpacing.sm) {
                ZStack {
                    RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                        .fill(iconColor.opacity(0.12))
                        .frame(width: isCompact ? 32 : 28, height: isCompact ? 32 : 28)
                    Image(systemName: icon)
                        .font(.system(size: isCompact ? 14 : 13, weight: .semibold))
                        .foregroundColor(iconColor)
                }

                Text(title)
                    .font(isCompact ? AppTypography.heading3 : AppTypography.bodySemibold)
                    .foregroundColor(AppColors.textPrimary)
            }

            // Content Card
            VStack(spacing: isCompact ? AppSpacing.sm : AppSpacing.xs) {
                content
            }
            .padding(isCompact ? AppSpacing.md : AppSpacing.sm)
            .background(
                RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                    .fill(AppColors.cardBackground)
                    .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
            )
        }
    }
}

// MARK: - Settings Divider
struct SettingsDivider: View {
    var body: some View {
        Rectangle()
            .fill(AppColors.gray100)
            .frame(height: 1)
            .padding(.vertical, AppSpacing.xs)
    }
}

// MARK: - Settings Toggle
struct SettingsToggle: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    let title: String
    let subtitle: String
    let icon: String
    let iconColor: Color
    @Binding var isOn: Bool

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    init(
        title: String,
        subtitle: String,
        icon: String,
        iconColor: Color = AppColors.primary600,
        isOn: Binding<Bool>
    ) {
        self.title = title
        self.subtitle = subtitle
        self.icon = icon
        self.iconColor = iconColor
        self._isOn = isOn
    }

    var body: some View {
        HStack(spacing: isCompact ? AppSpacing.sm : AppSpacing.xs) {
            // Animated icon container
            ZStack {
                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                    .fill(isOn ? iconColor.opacity(0.12) : AppColors.gray100)
                    .frame(width: isCompact ? 40 : 32, height: isCompact ? 40 : 32)
                Image(systemName: icon)
                    .font(.system(size: isCompact ? 18 : 14, weight: .medium))
                    .foregroundColor(isOn ? iconColor : AppColors.gray400)
            }
            .animation(.easeInOut(duration: 0.2), value: isOn)

            VStack(alignment: .leading, spacing: isCompact ? 2 : 1) {
                Text(title)
                    .font(isCompact ? AppTypography.bodyMedium : AppTypography.secondary)
                    .foregroundColor(AppColors.textPrimary)
                Text(subtitle)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)
                    .lineLimit(2)
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(iconColor)
                .scaleEffect(isCompact ? 1.0 : 0.85)
        }
        .padding(.vertical, isCompact ? AppSpacing.xs : 4)
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                isOn.toggle()
            }
        }
    }
}

// MARK: - Users Tab
struct UsersTab: View {
    @StateObject private var userService = UserService.shared
    @State private var searchText = ""
    @State private var showingAddUser = false
    @State private var selectedRole: UserRole?
    @State private var selectedUser: User?
    @State private var showingUserDetail = false

    var filteredUsers: [User] {
        let users = userService.users.isEmpty ? User.mockUsers : userService.users
        return users.filter { user in
            let matchesSearch = searchText.isEmpty ||
                user.name.localizedCaseInsensitiveContains(searchText) ||
                user.email.localizedCaseInsensitiveContains(searchText)
            let matchesRole = selectedRole == nil || user.role == selectedRole
            return matchesSearch && matchesRole
        }
    }

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private var maxContentWidth: CGFloat {
        horizontalSizeClass == .regular ? 600 : .infinity
    }

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.lg) {
                // Header with count
                HStack {
                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text("settings.teamMembers".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)
                        Text(String(format: "settings.userCount".localized, filteredUsers.count))
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    Spacer()

                    // Add User Button (compact)
                    Button(action: { showingAddUser = true }) {
                        HStack(spacing: AppSpacing.xs) {
                            Image(systemName: "plus")
                                .font(.system(size: 14, weight: .semibold))
                            Text("settings.addUser".localized)
                                .font(AppTypography.secondaryMedium)
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.vertical, AppSpacing.sm)
                        .background(AppColors.primary600)
                        .cornerRadius(AppSpacing.radiusFull)
                        .shadow(color: AppColors.primary600.opacity(0.3), radius: 4, x: 0, y: 2)
                    }
                    .buttonStyle(ScaleButtonStyle())
                }

                // Search & Filter Card
                VStack(spacing: AppSpacing.sm) {
                    HStack(spacing: AppSpacing.sm) {
                        ZStack {
                            RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                .fill(AppColors.purple.opacity(0.1))
                                .frame(width: 36, height: 36)
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(AppColors.purple)
                        }
                        TextField("settings.searchUsers".localized, text: $searchText)
                            .font(AppTypography.body)
                    }
                    .padding(AppSpacing.sm)
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppSpacing.radiusMedium)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                            .stroke(AppColors.gray200, lineWidth: 1)
                    )

                    // Role Filter
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: AppSpacing.xs) {
                            FilterChip(title: "common.all".localized, isSelected: selectedRole == nil) {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    selectedRole = nil
                                }
                            }
                            ForEach(UserRole.allCases, id: \.self) { role in
                                FilterChip(title: role.displayName, isSelected: selectedRole == role) {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                        selectedRole = role
                                    }
                                }
                            }
                        }
                    }
                }

                // User List
                VStack(spacing: AppSpacing.sm) {
                    ForEach(filteredUsers) { user in
                        Button(action: {
                            selectedUser = user
                            showingUserDetail = true
                        }) {
                            SettingsUserCard(user: user)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .move(edge: .top)),
                            removal: .opacity
                        ))
                    }
                }
                .animation(.spring(response: 0.3, dampingFraction: 0.7), value: filteredUsers.map { $0.id })
            }
            .frame(maxWidth: maxContentWidth)
            .padding(AppSpacing.md)
            .padding(.bottom, AppSpacing.xl)
            .frame(maxWidth: .infinity) // Center the content
        }
        .onAppear {
            Task {
                await userService.fetchUsers()
            }
        }
        .sheet(isPresented: $showingAddUser) {
            AddUserView()
        }
        .sheet(isPresented: $showingUserDetail) {
            if let user = selectedUser {
                UserDetailSheet(user: user)
            }
        }
    }
}

// MARK: - Settings User Card
struct SettingsUserCard: View {
    let user: User
    @State private var isPressed = false

    var body: some View {
        HStack(spacing: AppSpacing.md) {
            // Enhanced avatar with gradient ring
            ZStack {
                Circle()
                    .stroke(
                        LinearGradient(
                            gradient: Gradient(colors: [user.role.color.opacity(0.4), user.role.color.opacity(0.1)]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 2
                    )
                    .frame(width: 52, height: 52)

                Circle()
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [user.role.color.opacity(0.2), user.role.color.opacity(0.1)]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 46, height: 46)

                Text(user.initials)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(user.role.color)
            }

            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                HStack(spacing: AppSpacing.xs) {
                    Text(user.name)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    StatusBadge(
                        text: user.status.rawValue.capitalized,
                        status: user.status == .active ? .active : .warning
                    )
                }
                Text(user.email)
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textSecondary)
                    .lineLimit(1)

                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: user.role.icon)
                        .font(.system(size: 10, weight: .semibold))
                    Text(user.role.displayName)
                        .font(AppTypography.caption)
                }
                .foregroundColor(user.role.color)
                .padding(.horizontal, AppSpacing.xs)
                .padding(.vertical, 2)
                .background(user.role.color.opacity(0.1))
                .cornerRadius(AppSpacing.radiusSmall)
            }

            Spacer()

            Button(action: {}) {
                ZStack {
                    Circle()
                        .fill(AppColors.gray100)
                        .frame(width: 36, height: 36)
                    Image(systemName: "ellipsis")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppColors.gray500)
                }
            }
            .buttonStyle(ScaleButtonStyle())
        }
        .padding(AppSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                .fill(AppColors.cardBackground)
                .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
        )
    }
}

// MARK: - Add User View
struct AddUserView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var phone = ""
    @State private var selectedRole: UserRole = .fieldWorker

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    AppTextField(label: "settings.fullName".localized, placeholder: "settings.fullNamePlaceholder".localized, text: $name, icon: "person", isRequired: true)
                    AppTextField(label: "auth.email".localized, placeholder: "settings.emailPlaceholder".localized, text: $email, icon: "envelope", isRequired: true)
                    AppTextField(label: "auth.password".localized, placeholder: "auth.passwordPlaceholder".localized, text: $password, icon: "lock", isRequired: true)
                    AppTextField(label: "profile.phone".localized, placeholder: "settings.phonePlaceholder".localized, text: $phone, icon: "phone")

                    // Role Selection
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("settings.role".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textPrimary)

                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppSpacing.sm) {
                            ForEach(UserRole.allCases, id: \.self) { role in
                                TapCard(isSelected: selectedRole == role, action: { selectedRole = role }) {
                                    HStack(spacing: AppSpacing.xs) {
                                        Image(systemName: role.icon)
                                            .font(.system(size: 16))
                                            .foregroundColor(role.color)
                                        Text(role.displayName)
                                            .font(AppTypography.secondaryMedium)
                                            .foregroundColor(AppColors.textPrimary)
                                            .lineLimit(1)
                                    }
                                }
                            }
                        }
                    }

                    PrimaryButton("settings.createUser".localized, icon: "plus") {
                        dismiss()
                    }
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("settings.addUser".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }
}

// MARK: - User Detail Sheet
struct UserDetailSheet: View {
    let user: User
    @Environment(\.dismiss) private var dismiss
    @State private var isEditing = false
    @State private var editedName: String = ""
    @State private var editedEmail: String = ""
    @State private var editedPhone: String = ""
    @State private var editedRole: UserRole = .fieldWorker
    @State private var isSaving = false
    @State private var showingDeleteConfirm = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // User Avatar & Basic Info
                    VStack(spacing: AppSpacing.md) {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [user.role.color.opacity(0.3), user.role.color.opacity(0.1)]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 100, height: 100)

                            Circle()
                                .stroke(user.role.color.opacity(0.3), lineWidth: 3)
                                .frame(width: 100, height: 100)

                            Text(user.initials)
                                .font(.system(size: 36, weight: .bold, design: .rounded))
                                .foregroundColor(user.role.color)
                        }

                        VStack(spacing: AppSpacing.xs) {
                            Text(user.name)
                                .font(AppTypography.heading2)
                                .foregroundColor(AppColors.textPrimary)

                            StatusBadge(
                                text: user.status.rawValue.capitalized,
                                status: user.status == .active ? .active : .warning
                            )
                        }
                    }
                    .padding(.top, AppSpacing.md)

                    // User Info Card
                    SettingsSectionCard(
                        title: "profile.userInfo".localized,
                        icon: "person.fill",
                        iconColor: AppColors.primary600
                    ) {
                        VStack(spacing: 0) {
                            UserDetailRow(label: "profile.email".localized, value: user.email, icon: "envelope.fill")
                            SettingsDivider()
                            UserDetailRow(label: "profile.phone".localized, value: user.phone ?? "Not provided", icon: "phone.fill")
                            SettingsDivider()
                            UserDetailRow(label: "settings.role".localized, value: user.role.displayName, icon: user.role.icon, valueColor: user.role.color)
                        }
                    }

                    // Permissions Card
                    SettingsSectionCard(
                        title: "settings.permissions".localized,
                        icon: "lock.shield.fill",
                        iconColor: AppColors.success
                    ) {
                        VStack(alignment: .leading, spacing: AppSpacing.sm) {
                            HStack {
                                Text("settings.roleBasedPermissions".localized)
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                                Spacer()
                                Text("\(user.role.defaultPermissions.count)")
                                    .font(AppTypography.secondaryMedium)
                                    .foregroundColor(AppColors.primary600)
                            }

                            if let templateName = user.companyTemplateName {
                                HStack {
                                    Text("settings.companyTemplate".localized)
                                        .font(AppTypography.secondary)
                                        .foregroundColor(AppColors.textSecondary)
                                    Spacer()
                                    Text(templateName)
                                        .font(AppTypography.captionMedium)
                                        .foregroundColor(AppColors.primary600)
                                        .padding(.horizontal, AppSpacing.xs)
                                        .padding(.vertical, 2)
                                        .background(AppColors.primary100)
                                        .cornerRadius(AppSpacing.radiusSmall)
                                }
                            }
                        }
                    }

                    // Actions Card
                    VStack(spacing: AppSpacing.sm) {
                        OutlineButton("settings.editUser".localized, icon: "pencil") {
                            editedName = user.name
                            editedEmail = user.email
                            editedPhone = user.phone ?? ""
                            editedRole = user.role
                            isEditing = true
                        }

                        if user.status == .active {
                            OutlineButton("settings.deactivateUser".localized, icon: "person.fill.xmark") {
                                // Deactivate user action
                            }
                        } else {
                            OutlineButton("settings.activateUser".localized, icon: "person.fill.checkmark") {
                                // Activate user action
                            }
                        }

                        Button(action: { showingDeleteConfirm = true }) {
                            HStack {
                                Image(systemName: "trash")
                                Text("settings.deleteUser".localized)
                            }
                            .font(AppTypography.bodyMedium)
                            .foregroundColor(AppColors.error)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, AppSpacing.md)
                            .background(AppColors.errorLight)
                            .cornerRadius(AppSpacing.radiusMedium)
                        }
                    }
                }
                .padding(AppSpacing.md)
                .padding(.bottom, AppSpacing.xl)
            }
            .background(AppColors.background)
            .navigationTitle("settings.userDetails".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.done".localized) { dismiss() }
                }
            }
            .sheet(isPresented: $isEditing) {
                EditUserSheet(
                    user: user,
                    name: $editedName,
                    email: $editedEmail,
                    phone: $editedPhone,
                    role: $editedRole
                )
            }
            .confirmationDialog(
                "settings.deleteUserConfirm".localized,
                isPresented: $showingDeleteConfirm,
                titleVisibility: .visible
            ) {
                Button("common.delete".localized, role: .destructive) {
                    // Delete user
                    dismiss()
                }
                Button("common.cancel".localized, role: .cancel) {}
            } message: {
                Text("settings.deleteUserWarning".localized)
            }
        }
    }
}

// MARK: - User Detail Row
struct UserDetailRow: View {
    let label: String
    let value: String
    let icon: String
    var valueColor: Color = AppColors.textPrimary

    var body: some View {
        HStack(spacing: AppSpacing.sm) {
            ZStack {
                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                    .fill(AppColors.gray100)
                    .frame(width: 32, height: 32)
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.gray500)
            }

            Text(label)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textSecondary)

            Spacer()

            Text(value)
                .font(AppTypography.bodyMedium)
                .foregroundColor(valueColor)
        }
        .padding(.vertical, AppSpacing.sm)
    }
}

// MARK: - Edit User Sheet
struct EditUserSheet: View {
    let user: User
    @Binding var name: String
    @Binding var email: String
    @Binding var phone: String
    @Binding var role: UserRole
    @Environment(\.dismiss) private var dismiss
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    AppTextField(
                        label: "settings.fullName".localized,
                        placeholder: "settings.fullNamePlaceholder".localized,
                        text: $name,
                        icon: "person",
                        isRequired: true
                    )

                    AppTextField(
                        label: "auth.email".localized,
                        placeholder: "settings.emailPlaceholder".localized,
                        text: $email,
                        icon: "envelope",
                        isRequired: true
                    )

                    AppTextField(
                        label: "profile.phone".localized,
                        placeholder: "settings.phonePlaceholder".localized,
                        text: $phone,
                        icon: "phone"
                    )

                    // Role Selection
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("settings.role".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textPrimary)

                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppSpacing.sm) {
                            ForEach(UserRole.allCases, id: \.self) { r in
                                TapCard(isSelected: role == r, action: { role = r }) {
                                    HStack(spacing: AppSpacing.xs) {
                                        Image(systemName: r.icon)
                                            .font(.system(size: 16))
                                            .foregroundColor(r.color)
                                        Text(r.displayName)
                                            .font(AppTypography.secondaryMedium)
                                            .foregroundColor(AppColors.textPrimary)
                                            .lineLimit(1)
                                    }
                                }
                            }
                        }
                    }

                    PrimaryButton(isSaving ? "common.saving".localized : "common.save".localized, icon: "checkmark") {
                        Task {
                            isSaving = true
                            // Save changes
                            try? await Task.sleep(nanoseconds: 500_000_000)
                            isSaving = false
                            dismiss()
                        }
                    }
                    .disabled(name.isEmpty || email.isEmpty)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("settings.editUser".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }
}

// MARK: - Permissions Tab
struct PermissionsTab: View {
    @State private var selectedRole: UserRole = .fieldWorker
    @State private var showingFullPermissions = false
    @State private var showingRoleDetails = false
    @State private var selectedRoleForDetails: UserRole?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.xl) {
                // Header Card
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    HStack(spacing: AppSpacing.sm) {
                        ZStack {
                            RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                                .fill(AppColors.success.opacity(0.12))
                                .frame(width: 48, height: 48)
                            Image(systemName: "lock.shield.fill")
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundColor(AppColors.success)
                        }

                        VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                            Text("settings.rolePermissions".localized)
                                .font(AppTypography.heading2)
                                .foregroundColor(AppColors.textPrimary)
                            Text("settings.rolePermissionsDesc".localized)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                }
                .padding(AppSpacing.md)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: AppSpacing.radiusXL)
                        .fill(AppColors.cardBackground)
                        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
                )

                // Quick Role Overview
                SettingsSectionCard(
                    title: "settings.roleHierarchy".localized,
                    icon: "person.3.fill",
                    iconColor: AppColors.purple
                ) {
                    VStack(spacing: 0) {
                        ForEach(Array(UserRole.allCases.sorted { $0.hierarchyLevel > $1.hierarchyLevel }.enumerated()), id: \.element) { index, role in
                            Button(action: {
                                selectedRoleForDetails = role
                                showingRoleDetails = true
                            }) {
                                HStack(spacing: AppSpacing.sm) {
                                    // Level badge
                                    ZStack {
                                        Circle()
                                            .fill(role.color)
                                            .frame(width: 28, height: 28)
                                        Text("\(role.hierarchyLevel)")
                                            .font(.system(size: 12, weight: .bold, design: .rounded))
                                            .foregroundColor(.white)
                                    }

                                    // Icon
                                    ZStack {
                                        RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                            .fill(role.color.opacity(0.12))
                                            .frame(width: 36, height: 36)
                                        Image(systemName: role.icon)
                                            .font(.system(size: 16, weight: .medium))
                                            .foregroundColor(role.color)
                                    }

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(role.displayName)
                                            .font(AppTypography.bodyMedium)
                                            .foregroundColor(AppColors.textPrimary)
                                        Text(String(format: "settings.permissionsCount".localized, role.defaultPermissions.count))
                                            .font(AppTypography.caption)
                                            .foregroundColor(AppColors.textTertiary)
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(AppColors.gray400)
                                }
                                .padding(.vertical, AppSpacing.sm)
                            }
                            .buttonStyle(PlainButtonStyle())

                            if index < UserRole.allCases.count - 1 {
                                SettingsDivider()
                            }
                        }
                    }
                }

                // Manage Permissions Button
                PrimaryButton("settings.managePermissions".localized, icon: "lock.shield.fill") {
                    showingFullPermissions = true
                }

                // Info Card with improved styling
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    HStack(spacing: AppSpacing.sm) {
                        ZStack {
                            RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                .fill(AppColors.info.opacity(0.12))
                                .frame(width: 32, height: 32)
                            Image(systemName: "info.circle.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(AppColors.info)
                        }
                        Text("settings.permissionLevels".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)
                    }

                    VStack(spacing: AppSpacing.sm) {
                        permissionLevelRow(color: AppColors.success, icon: "checkmark.circle.fill", label: "settings.byRole".localized, description: "settings.byRoleDesc".localized)
                        permissionLevelRow(color: AppColors.primary600, icon: "plus.circle.fill", label: "settings.added".localized, description: "settings.addedDesc".localized)
                        permissionLevelRow(color: AppColors.error, icon: "minus.circle.fill", label: "settings.removed".localized, description: "settings.removedDesc".localized)
                        permissionLevelRow(color: AppColors.warning, icon: "folder.fill", label: "settings.project".localized, description: "settings.projectDesc".localized)
                    }
                    .padding(AppSpacing.md)
                    .background(
                        RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                            .fill(AppColors.cardBackground)
                            .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
                    )
                }
            }
            .padding(AppSpacing.md)
            .padding(.bottom, AppSpacing.xl)
        }
        .fullScreenCover(isPresented: $showingFullPermissions) {
            PermissionsView()
        }
        .sheet(isPresented: $showingRoleDetails) {
            if let role = selectedRoleForDetails {
                RoleDetailSheet(role: role)
            }
        }
    }

    private func permissionLevelRow(color: Color, icon: String, label: String, description: String) -> some View {
        HStack(spacing: AppSpacing.sm) {
            ZStack {
                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                    .fill(color.opacity(0.12))
                    .frame(width: 28, height: 28)
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(color)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(AppTypography.secondaryMedium)
                    .foregroundColor(AppColors.textPrimary)
                Text(description)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)
            }

            Spacer()
        }
    }
}

// MARK: - Role Detail Sheet
struct RoleDetailSheet: View {
    let role: UserRole
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Role Header
                    VStack(spacing: AppSpacing.md) {
                        ZStack {
                            Circle()
                                .fill(role.color.opacity(0.2))
                                .frame(width: 80, height: 80)
                            Image(systemName: role.icon)
                                .font(.system(size: 32, weight: .semibold))
                                .foregroundColor(role.color)
                        }

                        VStack(spacing: AppSpacing.xs) {
                            Text(role.displayName)
                                .font(AppTypography.heading2)
                                .foregroundColor(AppColors.textPrimary)

                            HStack(spacing: AppSpacing.xs) {
                                Text("settings.hierarchyLevel".localized)
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                                Text("\(role.hierarchyLevel)")
                                    .font(AppTypography.secondaryMedium)
                                    .foregroundColor(role.color)
                            }
                        }
                    }
                    .padding(.vertical, AppSpacing.md)

                    // Role Description
                    AppCard {
                        VStack(alignment: .leading, spacing: AppSpacing.sm) {
                            HStack(spacing: AppSpacing.xs) {
                                Image(systemName: "info.circle.fill")
                                    .font(.system(size: 14))
                                    .foregroundColor(AppColors.info)
                                Text("settings.roleDescription".localized)
                                    .font(AppTypography.label)
                                    .foregroundColor(AppColors.textPrimary)
                            }
                            Text(role.description)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    // Daily Log Visibility
                    SettingsSectionCard(
                        title: "settings.dailyLogVisibility".localized,
                        icon: "eye.fill",
                        iconColor: AppColors.primary600
                    ) {
                        HStack {
                            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                Text(role.defaultDailyLogVisibility.displayName)
                                    .font(AppTypography.bodyMedium)
                                    .foregroundColor(AppColors.textPrimary)
                                Text(role.defaultDailyLogVisibility.description)
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textSecondary)
                            }
                            Spacer()
                        }
                    }

                    // Permissions by Category
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("settings.defaultPermissions".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        ForEach(PermissionCategory.allCases, id: \.self) { category in
                            PermissionCategoryCard(
                                category: category,
                                enabledPermissions: role.defaultPermissions
                            )
                        }
                    }
                }
                .padding(AppSpacing.md)
                .padding(.bottom, AppSpacing.xl)
            }
            .background(AppColors.background)
            .navigationTitle("settings.roleDetails".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.done".localized) { dismiss() }
                }
            }
        }
    }
}

// MARK: - Preferences Tab
struct PreferencesTab: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var selectedView = ViewOption.list
    @State private var showCompleted = false
    @State private var languageRefreshId = UUID()  // Forces view refresh on language change
    @State private var selectedLanguage: String = LocalizationManager.shared.currentLanguage

    @State private var dailyDigest = true
    @State private var approvalNotifs = true
    @State private var certAlerts = true
    @State private var isSaving = false
    @State private var isLoading = true
    @State private var showingSavedAlert = false
    @State private var hasLoadedInitially = false  // Only load from API once

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    var body: some View {
        ScrollView {
            VStack(spacing: isCompact ? AppSpacing.lg : AppSpacing.md) {
                // Display Settings
                SettingsSectionCard(
                    title: "settings.appearance".localized,
                    icon: "paintbrush.fill",
                    iconColor: AppColors.purple
                ) {
                    VStack(spacing: 0) {
                        SettingsToggle(
                            title: "settings.darkMode".localized,
                            subtitle: "settings.darkModeDesc".localized,
                            icon: "moon.fill",
                            iconColor: AppColors.purple,
                            isOn: $appState.isDarkMode
                        )

                        SettingsDivider()

                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("settings.defaultView".localized)
                                    .font(AppTypography.bodyMedium)
                                    .foregroundColor(AppColors.textPrimary)
                                Text("settings.defaultViewDesc".localized)
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textTertiary)
                            }
                            Spacer()
                            Picker("View", selection: $selectedView) {
                                ForEach(ViewOption.allCases, id: \.self) { view in
                                    Text(view.rawValue).tag(view)
                                }
                            }
                            .pickerStyle(.segmented)
                            .frame(width: 180)
                        }
                        .padding(.vertical, AppSpacing.xs)

                        SettingsDivider()

                        SettingsToggle(
                            title: "settings.showCompleted".localized,
                            subtitle: "settings.showCompletedDesc".localized,
                            icon: "checkmark.square.fill",
                            iconColor: AppColors.success,
                            isOn: $showCompleted
                        )
                    }
                }

                // Language Settings
                SettingsSectionCard(
                    title: "settings.language".localized,
                    icon: "globe",
                    iconColor: AppColors.info
                ) {
                    VStack(spacing: 0) {
                        HStack {
                            ZStack {
                                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                                    .fill(AppColors.info.opacity(0.12))
                                    .frame(width: isCompact ? 40 : 32, height: isCompact ? 40 : 32)
                                Image(systemName: "globe")
                                    .font(.system(size: isCompact ? 18 : 14, weight: .medium))
                                    .foregroundColor(AppColors.info)
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                Text("settings.languageSelect".localized)
                                    .font(isCompact ? AppTypography.bodyMedium : AppTypography.secondary)
                                    .foregroundColor(AppColors.textPrimary)
                                Text("settings.languageDesc".localized)
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textTertiary)
                            }

                            Spacer()

                            Picker("", selection: $selectedLanguage) {
                                ForEach(LocalizationManager.shared.supportedLanguages, id: \.code) { lang in
                                    Text(lang.name).tag(lang.code)
                                }
                            }
                            .pickerStyle(.menu)
                            .tint(AppColors.info)
                            .onChange(of: selectedLanguage) { _, newValue in
                                LocalizationManager.shared.setLanguage(newValue)
                                // Force view refresh
                                languageRefreshId = UUID()
                                // Sync to API
                                Task {
                                    await syncLanguageToAPI(newValue)
                                }
                            }
                        }
                        .padding(.vertical, isCompact ? AppSpacing.xs : 4)
                    }
                }

                // Mobile Module Visibility
                // Only show modules that are enabled - users can hide them on mobile
                SettingsSectionCard(
                    title: "settings.mobileVisibility".localized,
                    icon: "iphone",
                    iconColor: AppColors.info
                ) {
                    VStack(spacing: 0) {
                        Text("settings.mobileVisibilityDesc".localized)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.bottom, AppSpacing.sm)

                        // Use a cleaner approach with ForEach over enabled modules
                        let enabledModules = ModuleType.allCases.filter { appState.isModuleEnabled($0) }

                        ForEach(Array(enabledModules.enumerated()), id: \.element.id) { index, module in
                            MobileVisibilityToggle(
                                module: module,
                                isVisible: Binding(
                                    get: { appState.isMobileVisible(module) },
                                    set: { newValue in
                                        print("[SettingsView] 🔀 Toggle SET called: \(module.rawValue) → \(newValue)")
                                        appState.setMobileVisibility(module, visible: newValue)
                                    }
                                )
                            )
                            if index < enabledModules.count - 1 {
                                SettingsDivider()
                            }
                        }
                    }
                }

                // Email Preferences
                SettingsSectionCard(
                    title: "settings.emailPrefs".localized,
                    icon: "envelope.badge.fill",
                    iconColor: AppColors.info
                ) {
                    VStack(spacing: 0) {
                        SettingsToggle(title: "settings.dailyDigest".localized, subtitle: "settings.dailyDigestDesc".localized, icon: "envelope.fill", iconColor: AppColors.info, isOn: $dailyDigest)
                        SettingsDivider()
                        SettingsToggle(title: "settings.approvalNotifs".localized, subtitle: "settings.approvalNotifsDesc".localized, icon: "checkmark.circle.fill", iconColor: AppColors.success, isOn: $approvalNotifs)
                        SettingsDivider()
                        SettingsToggle(title: "settings.certAlerts".localized, subtitle: "settings.certAlertsDesc".localized, icon: "exclamationmark.triangle.fill", iconColor: AppColors.warning, isOn: $certAlerts)
                    }
                }

                // Debug Role Switcher (only in DEBUG builds)
                #if DEBUG
                SettingsSectionCard(
                    title: "Debug: Role Switcher",
                    icon: "ladybug.fill",
                    iconColor: AppColors.error
                ) {
                    VStack(spacing: AppSpacing.sm) {
                        Text("Instantly switch roles to test permissions. Changes take effect immediately - no logout required.")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        if let currentRole = appState.currentUser?.role {
                            HStack {
                                Text("Current Role:")
                                    .font(AppTypography.secondary)
                                    .foregroundColor(AppColors.textSecondary)
                                Spacer()
                                Text(currentRole.displayName)
                                    .font(AppTypography.bodySemibold)
                                    .foregroundColor(AppColors.primary600)
                            }
                            .padding(.bottom, AppSpacing.xs)
                        }

                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: AppSpacing.xs) {
                            ForEach(UserRole.allCases, id: \.self) { role in
                                Button(action: {
                                    switchToRole(role)
                                }) {
                                    VStack(spacing: 4) {
                                        Image(systemName: iconForRole(role))
                                            .font(.system(size: 18))
                                        Text(role.displayName)
                                            .font(AppTypography.caption)
                                            .lineLimit(1)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, AppSpacing.sm)
                                    .foregroundColor(appState.currentUser?.role == role ? .white : colorForRole(role))
                                    .background(appState.currentUser?.role == role ? colorForRole(role) : colorForRole(role).opacity(0.15))
                                    .cornerRadius(AppSpacing.radiusMedium)
                                }
                            }
                        }
                    }
                }
                #endif

                PrimaryButton(isSaving ? "settings.saving".localized : "settings.savePreferences".localized, icon: "checkmark", isLoading: isSaving) {
                    Task {
                        await savePreferences()
                    }
                }
                .disabled(isSaving)
            }
            .padding(.horizontal, isCompact ? AppSpacing.md : AppSpacing.lg)
            .padding(.vertical, isCompact ? AppSpacing.md : AppSpacing.lg)
            .id(languageRefreshId)  // Force refresh when language changes
        }
        .alert("settings.preferencesSaved".localized, isPresented: $showingSavedAlert) {
            Button("common.ok".localized) {}
        } message: {
            Text("settings.preferencesSavedMessage".localized)
        }
        .onAppear {
            // Sync language state with manager
            selectedLanguage = LocalizationManager.shared.currentLanguage

            // Only load from API once - don't overwrite user changes on subsequent appears
            guard !hasLoadedInitially else { return }
            hasLoadedInitially = true
            Task {
                await loadPreferences()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .languageDidChange)) { _ in
            // Refresh view when language changes externally
            selectedLanguage = LocalizationManager.shared.currentLanguage
            languageRefreshId = UUID()
        }
    }

    private func loadPreferences() async {
        isLoading = true
        defer { isLoading = false }

        print("[SettingsView] 🔄 Loading preferences from API...")

        do {
            struct PreferencesResponse: Decodable {
                let preferences: UserPreferencesData
            }

            struct UserPreferencesData: Decodable {
                let theme: String?
                let defaultView: String?
                let showCompletedTasks: Bool?
                let emailDailyDigest: Bool?
                let emailApprovals: Bool?
                let emailCertExpiry: Bool?
                let mobileModuleVisibility: MobileModuleVisibility?
            }

            let response: PreferencesResponse = try await APIClient.shared.get("/users/me/preferences")

            // Update local state from server
            if let theme = response.preferences.theme {
                appState.isDarkMode = theme == "dark"
                print("[SettingsView] ✅ Theme from API: \(theme)")
            }
            if let view = response.preferences.defaultView,
               let viewOption = ViewOption(rawValue: view.capitalized) {
                selectedView = viewOption
            }
            if let showCompleted = response.preferences.showCompletedTasks {
                self.showCompleted = showCompleted
            }
            if let daily = response.preferences.emailDailyDigest {
                dailyDigest = daily
            }
            if let approvals = response.preferences.emailApprovals {
                approvalNotifs = approvals
            }
            if let certExpiry = response.preferences.emailCertExpiry {
                certAlerts = certExpiry
            }
            // Sync mobile module visibility from server (READ-ONLY - no local save)
            if let visibility = response.preferences.mobileModuleVisibility {
                print("[SettingsView] ✅ Got mobileModuleVisibility from API (read-only load):")
                print("[SettingsView]    - projectsVisible: \(visibility.projectsVisible)")
                print("[SettingsView]    - tasksVisible: \(visibility.tasksVisible)")
                print("[SettingsView]    - schedulingVisible: \(visibility.schedulingVisible)")
                print("[SettingsView]    - safetyVisible: \(visibility.safetyVisible)")
                print("[SettingsView]    - reportsVisible: \(visibility.reportsVisible)")
                print("[SettingsView]    - analyticsVisible: \(visibility.analyticsVisible)")
                print("[SettingsView]    - clientsVisible: \(visibility.clientsVisible)")
                print("[SettingsView]    - financialsVisible: \(visibility.financialsVisible)")
                print("[SettingsView]    - subcontractorsVisible: \(visibility.subcontractorsVisible)")
                print("[SettingsView]    - certificationsVisible: \(visibility.certificationsVisible)")

                // Use API sync method to avoid triggering didSet saves
                appState.setMobileVisibilityFromAPI(visibility)
            } else {
                print("[SettingsView] ⚠️ No mobileModuleVisibility in API response")
            }
        } catch {
            print("[SettingsView] ❌ Failed to load preferences: \(error)")
        }
    }

    private func savePreferences() async {
        isSaving = true
        defer { isSaving = false }

        do {
            struct PreferencesUpdate: Encodable {
                let theme: String
                let defaultView: String
                let showCompletedTasks: Bool
                let emailDailyDigest: Bool
                let emailApprovals: Bool
                let emailCertExpiry: Bool
                let mobileModuleVisibility: MobileModuleVisibility
            }

            let visibility = appState.mobileModuleVisibility

            print("[SettingsView] 🔄 Saving preferences to API...")
            print("[SettingsView] 📱 mobileModuleVisibility to save:")
            print("[SettingsView]    - projectsVisible: \(visibility.projectsVisible)")
            print("[SettingsView]    - tasksVisible: \(visibility.tasksVisible)")
            print("[SettingsView]    - schedulingVisible: \(visibility.schedulingVisible)")
            print("[SettingsView]    - safetyVisible: \(visibility.safetyVisible)")
            print("[SettingsView]    - reportsVisible: \(visibility.reportsVisible)")
            print("[SettingsView]    - analyticsVisible: \(visibility.analyticsVisible)")
            print("[SettingsView]    - clientsVisible: \(visibility.clientsVisible)")
            print("[SettingsView]    - financialsVisible: \(visibility.financialsVisible)")
            print("[SettingsView]    - subcontractorsVisible: \(visibility.subcontractorsVisible)")
            print("[SettingsView]    - certificationsVisible: \(visibility.certificationsVisible)")

            let update = PreferencesUpdate(
                theme: appState.isDarkMode ? "dark" : "light",
                defaultView: selectedView.rawValue.lowercased(),
                showCompletedTasks: showCompleted,
                emailDailyDigest: dailyDigest,
                emailApprovals: approvalNotifs,
                emailCertExpiry: certAlerts,
                mobileModuleVisibility: visibility
            )

            // Debug: Print the JSON that will be sent
            if let jsonData = try? JSONEncoder().encode(update),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                print("[SettingsView] 📤 JSON being sent to API:")
                print(jsonString)
            }

            // Use the correct API endpoint - saves all preferences including mobile visibility
            try await APIClient.shared.patch("/users/me/preferences", body: update) as EmptyResponse

            // Also save to local storage with user ID for offline fallback
            visibility.saveToLocal(userId: appState.currentUser?.id)

            print("[SettingsView] ✅ Preferences saved successfully to API and local cache!")
            showingSavedAlert = true
        } catch {
            print("[SettingsView] ❌ Failed to save preferences: \(error)")
        }
    }

    private func syncLanguageToAPI(_ language: String) async {
        guard let user = appState.currentUser else {
            print("[SettingsView] ❌ Cannot sync language: no current user")
            return
        }

        do {
            struct LanguageUpdate: Encodable {
                let name: String  // Required by API
                let language: String
            }
            let update = LanguageUpdate(name: user.name, language: language)
            try await APIClient.shared.put("/users/me", body: update) as EmptyResponse
            print("[SettingsView] ✅ Language synced to API: \(language)")
        } catch {
            print("[SettingsView] ❌ Failed to sync language: \(error)")
        }
    }

    // MARK: - Debug Role Switcher Helpers
    #if DEBUG
    private func switchToRole(_ role: UserRole) {
        guard let user = appState.currentUser else { return }

        // Create a new user with the selected role
        let debugUser = User(
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: role,
            status: user.status,
            isBlaster: user.isBlaster,
            createdAt: user.createdAt,
            language: user.language,
            companyTemplateName: user.companyTemplateName
        )

        // Update the app state
        appState.currentUser = debugUser

        // Reload module settings for the new role
        appState.updateModuleSettings(moduleSettingsForRole(role))

        print("[Debug] 🔀 Switched to role: \(role.displayName)")
        print("[Debug] 📱 Module visibility updated for: \(role.rawValue)")
    }

    private func moduleSettingsForRole(_ role: UserRole) -> ModuleSettings {
        switch role {
        case .admin, .projectManager:
            return ModuleSettings(
                projectsEnabled: true, timeTrackingEnabled: true, dailyLogsEnabled: true,
                tasksEnabled: true, schedulingEnabled: true, drawingsEnabled: true,
                documentsEnabled: true, equipmentEnabled: true, safetyEnabled: true,
                financialsEnabled: true, reportsEnabled: true, analyticsEnabled: true,
                subcontractorsEnabled: true, certificationsEnabled: true, approvalsEnabled: true,
                warningsEnabled: true, droneDeployEnabled: true, clientsEnabled: true, materialsEnabled: true
            )
        case .foreman:
            return ModuleSettings(
                projectsEnabled: true, timeTrackingEnabled: true, dailyLogsEnabled: true,
                tasksEnabled: true, schedulingEnabled: true, drawingsEnabled: true,
                documentsEnabled: true, equipmentEnabled: true, safetyEnabled: true,
                financialsEnabled: false, reportsEnabled: false, analyticsEnabled: false,
                subcontractorsEnabled: true, certificationsEnabled: true, approvalsEnabled: true,
                warningsEnabled: true, droneDeployEnabled: true, clientsEnabled: false, materialsEnabled: true
            )
        case .fieldWorker:
            return ModuleSettings(
                projectsEnabled: true, timeTrackingEnabled: true, dailyLogsEnabled: true,
                tasksEnabled: true, schedulingEnabled: false, drawingsEnabled: true,
                documentsEnabled: true, equipmentEnabled: false, safetyEnabled: false,
                financialsEnabled: false, reportsEnabled: false, analyticsEnabled: false,
                subcontractorsEnabled: false, certificationsEnabled: false, approvalsEnabled: false,
                warningsEnabled: false, droneDeployEnabled: false, clientsEnabled: false, materialsEnabled: false
            )
        case .officeStaff:
            return ModuleSettings(
                projectsEnabled: true, timeTrackingEnabled: true, dailyLogsEnabled: true,
                tasksEnabled: true, schedulingEnabled: true, drawingsEnabled: true,
                documentsEnabled: true, equipmentEnabled: false, safetyEnabled: false,
                financialsEnabled: false, reportsEnabled: true, analyticsEnabled: false,
                subcontractorsEnabled: true, certificationsEnabled: true, approvalsEnabled: false,
                warningsEnabled: false, droneDeployEnabled: false, clientsEnabled: true, materialsEnabled: false
            )
        case .viewer:
            return ModuleSettings(
                projectsEnabled: true, timeTrackingEnabled: false, dailyLogsEnabled: true,
                tasksEnabled: false, schedulingEnabled: false, drawingsEnabled: true,
                documentsEnabled: true, equipmentEnabled: false, safetyEnabled: true,
                financialsEnabled: false, reportsEnabled: false, analyticsEnabled: false,
                subcontractorsEnabled: false, certificationsEnabled: false, approvalsEnabled: false,
                warningsEnabled: false, droneDeployEnabled: false, clientsEnabled: false, materialsEnabled: false
            )
        default:
            return .default
        }
    }

    private func iconForRole(_ role: UserRole) -> String {
        switch role {
        case .admin: return "crown.fill"
        case .projectManager: return "person.badge.key.fill"
        case .developer: return "hammer.fill"
        case .architect: return "building.columns.fill"
        case .foreman: return "person.crop.rectangle.stack.fill"
        case .crewLeader: return "person.2.fill"
        case .officeStaff: return "desktopcomputer"
        case .fieldWorker: return "figure.walk"
        case .viewer: return "eye.fill"
        }
    }

    private func colorForRole(_ role: UserRole) -> Color {
        switch role {
        case .admin: return AppColors.error
        case .projectManager: return AppColors.purple
        case .developer: return AppColors.info
        case .architect: return AppColors.orange
        case .foreman: return AppColors.success
        case .crewLeader: return AppColors.info
        case .officeStaff: return AppColors.gray500
        case .fieldWorker: return AppColors.warning
        case .viewer: return AppColors.textSecondary
        }
    }
    #endif
}

// MARK: - Module Toggle
struct ModuleToggle: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    let title: String
    let subtitle: String
    let icon: String
    let iconColor: Color
    @Binding var isOn: Bool

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    init(
        title: String,
        subtitle: String,
        icon: String,
        iconColor: Color = AppColors.primary600,
        isOn: Binding<Bool>
    ) {
        self.title = title
        self.subtitle = subtitle
        self.icon = icon
        self.iconColor = iconColor
        self._isOn = isOn
    }

    var body: some View {
        HStack(spacing: isCompact ? AppSpacing.sm : AppSpacing.xs) {
            // Animated icon container
            ZStack {
                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                    .fill(isOn ? iconColor.opacity(0.12) : AppColors.gray100)
                    .frame(width: isCompact ? 40 : 32, height: isCompact ? 40 : 32)
                Image(systemName: icon)
                    .font(.system(size: isCompact ? 18 : 14, weight: .medium))
                    .foregroundColor(isOn ? iconColor : AppColors.gray400)
            }
            .animation(.easeInOut(duration: 0.2), value: isOn)

            VStack(alignment: .leading, spacing: isCompact ? 2 : 1) {
                Text(title)
                    .font(isCompact ? AppTypography.bodyMedium : AppTypography.secondary)
                    .foregroundColor(AppColors.textPrimary)
                Text(subtitle)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .tint(iconColor)
                .scaleEffect(isCompact ? 1.0 : 0.85)
        }
        .padding(.vertical, isCompact ? AppSpacing.xs : 4)
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                isOn.toggle()
            }
        }
    }
}

// MARK: - Mobile Visibility Toggle
/// Toggle for showing/hiding modules on mobile (separate from enabled/disabled)
struct MobileVisibilityToggle: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    let module: ModuleType
    @Binding var isVisible: Bool

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    private var iconColor: Color {
        switch module {
        case .projects: return AppColors.primary600
        case .timeTracking: return AppColors.primary600
        case .dailyLogs: return AppColors.success
        case .tasks: return AppColors.info
        case .scheduling: return AppColors.purple
        case .drawings: return AppColors.primary600
        case .documents: return AppColors.info
        case .equipment: return AppColors.warning
        case .safety: return AppColors.error
        case .financials: return AppColors.success
        case .reports: return AppColors.info
        case .analytics: return AppColors.purple
        case .subcontractors: return AppColors.info
        case .certifications: return AppColors.success
        case .approvals: return AppColors.success
        case .warnings: return AppColors.warning
        case .droneDeploy: return AppColors.purple
        case .clients: return AppColors.info
        case .materials: return AppColors.warning
        }
    }

    var body: some View {
        HStack(spacing: isCompact ? AppSpacing.sm : AppSpacing.xs) {
            // Icon container
            ZStack {
                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                    .fill(isVisible ? iconColor.opacity(0.12) : AppColors.gray100)
                    .frame(width: isCompact ? 40 : 32, height: isCompact ? 40 : 32)
                Image(systemName: module.icon)
                    .font(.system(size: isCompact ? 18 : 14, weight: .medium))
                    .foregroundColor(isVisible ? iconColor : AppColors.gray400)
            }
            .animation(.easeInOut(duration: 0.2), value: isVisible)

            VStack(alignment: .leading, spacing: isCompact ? 2 : 1) {
                Text(module.displayName)
                    .font(isCompact ? AppTypography.bodyMedium : AppTypography.secondary)
                    .foregroundColor(AppColors.textPrimary)
                Text(isVisible ? "settings.visibleOnMobile".localized : "settings.hiddenOnMobile".localized)
                    .font(AppTypography.caption)
                    .foregroundColor(isVisible ? AppColors.textSecondary : AppColors.textTertiary)
            }

            Spacer()

            // Eye icon indicator
            Image(systemName: isVisible ? "eye.fill" : "eye.slash.fill")
                .font(.system(size: isCompact ? 16 : 14, weight: .medium))
                .foregroundColor(isVisible ? iconColor : AppColors.gray400)
                .padding(.trailing, isCompact ? AppSpacing.xs : 4)

            Toggle("", isOn: $isVisible)
                .labelsHidden()
                .tint(iconColor)
                .scaleEffect(isCompact ? 1.0 : 0.85)
        }
        .padding(.vertical, isCompact ? AppSpacing.xs : 4)
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                isVisible.toggle()
            }
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AppState())
}
