//
//  ClientsView.swift
//  ConstructionManager
//
//  Client management view with list, detail, and create functionality
//

import SwiftUI
import Combine

// MARK: - Clients View
struct ClientsView: View {
    @StateObject private var viewModel = ClientsViewModel()
    @State private var searchText = ""
    @State private var selectedStatus: ClientStatus?
    @State private var showingNewClient = false
    @State private var selectedClient: Client?

    var body: some View {
        VStack(spacing: 0) {
            // Search Bar
            searchBar
                .padding(.horizontal, AppSpacing.md)
                .padding(.top, AppSpacing.sm)

            // Filter Chips
            filterSection
                .padding(.top, AppSpacing.sm)

            // Clients List
            if viewModel.isLoading && viewModel.clients.isEmpty {
                Spacer()
                ProgressView()
                    .scaleEffect(1.2)
                Spacer()
            } else if filteredClients.isEmpty {
                emptyState
            } else {
                clientsList
            }
        }
        .background(AppColors.background)
        .navigationTitle("nav.clients".localized)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showingNewClient = true }) {
                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(AppColors.primary600)
                }
            }
        }
        .sheet(isPresented: $showingNewClient) {
            NewClientView()
                .environmentObject(viewModel)
        }
        .sheet(item: $selectedClient) { client in
            ClientDetailView(client: client)
                .environmentObject(viewModel)
        }
        .task {
            await viewModel.fetchClients()
        }
        .refreshable {
            await viewModel.fetchClients()
        }
    }

    // MARK: - Filtered Clients
    private var filteredClients: [Client] {
        viewModel.filteredClients(search: searchText, status: selectedStatus)
    }

    // MARK: - Search Bar
    private var searchBar: some View {
        HStack(spacing: AppSpacing.xs) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.gray400)
                .font(.system(size: 16))

            TextField("clients.searchPlaceholder".localized, text: $searchText)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textPrimary)

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
    }

    // MARK: - Filter Section
    private var filterSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                FilterChip(title: "common.all".localized, isSelected: selectedStatus == nil) {
                    selectedStatus = nil
                }
                ForEach(ClientStatus.allCases, id: \.self) { status in
                    FilterChip(title: status.displayName, isSelected: selectedStatus == status) {
                        selectedStatus = status
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
        }
    }

    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Spacer()
            Image(systemName: "building.2")
                .font(.system(size: 48))
                .foregroundColor(AppColors.gray300)
            Text("clients.noClients".localized)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textSecondary)
            Text("clients.addFirst".localized)
                .font(AppTypography.secondary)
                .foregroundColor(AppColors.textTertiary)
            Button(action: { showingNewClient = true }) {
                Text("clients.add".localized)
                    .font(AppTypography.bodySemibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, AppSpacing.lg)
                    .padding(.vertical, AppSpacing.sm)
                    .background(AppColors.primary600)
                    .cornerRadius(AppSpacing.radiusMedium)
            }
            Spacer()
        }
    }

    // MARK: - Clients List
    private var clientsList: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.sm) {
                ForEach(filteredClients) { client in
                    ClientCard(client: client)
                        .onTapGesture {
                            selectedClient = client
                        }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.top, AppSpacing.sm)
            .padding(.bottom, AppSpacing.xl)
        }
    }
}

// MARK: - Client Card
struct ClientCard: View {
    let client: Client

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Header Row
                HStack {
                    VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                        Text(client.companyName)
                            .font(AppTypography.bodySemibold)
                            .foregroundColor(AppColors.textPrimary)
                        if let contact = client.contactName {
                            Text(contact)
                                .font(AppTypography.secondary)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                    Spacer()
                    StatusBadge(
                        text: client.status.displayName,
                        status: client.status.badgeStatus
                    )
                }

                Divider()

                // Info Row
                HStack(spacing: AppSpacing.lg) {
                    if let industry = client.displayIndustry {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "building.2.fill")
                                .font(.system(size: 12))
                                .foregroundColor(AppColors.gray400)
                            Text(industry)
                                .font(AppTypography.caption)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }

                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "folder.fill")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.gray400)
                        Text(String(format: "clients.projectsCount".localized, client.projectCount))
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(AppColors.gray400)
                }
            }
        }
    }
}

// MARK: - Client Detail View
struct ClientDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var viewModel: ClientsViewModel
    let client: Client
    @State private var showingEditSheet = false
    @State private var showingDeleteAlert = false
    @State private var showingProjects = false

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // Header Card
                    AppCard {
                        VStack(alignment: .leading, spacing: AppSpacing.md) {
                            HStack {
                                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                                    Text(client.companyName)
                                        .font(AppTypography.heading2)
                                        .foregroundColor(AppColors.textPrimary)
                                    if let contact = client.contactName {
                                        Text(contact)
                                            .font(AppTypography.body)
                                            .foregroundColor(AppColors.textSecondary)
                                    }
                                }
                                Spacer()
                                StatusBadge(
                                    text: client.status.displayName,
                                    status: client.status.badgeStatus
                                )
                            }

                            if let industry = client.displayIndustry {
                                HStack(spacing: AppSpacing.xs) {
                                    Image(systemName: ClientIndustry(rawValue: client.industry ?? "")?.icon ?? "building.2.fill")
                                        .foregroundColor(ClientIndustry(rawValue: client.industry ?? "")?.color ?? AppColors.gray500)
                                    Text(industry)
                                        .font(AppTypography.bodySemibold)
                                        .foregroundColor(AppColors.textSecondary)
                                }
                            }
                        }
                    }

                    // Contact Information
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("clients.contactInfo".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        AppCard {
                            VStack(spacing: AppSpacing.sm) {
                                if let email = client.email {
                                    contactRowButton(icon: "envelope.fill", value: email, color: AppColors.info) {
                                        openEmail(email)
                                    }
                                }
                                if let phone = client.phone {
                                    contactRowButton(icon: "phone.fill", value: phone, color: AppColors.success) {
                                        openPhone(phone)
                                    }
                                }
                                if let website = client.website {
                                    contactRowButton(icon: "globe", value: website, color: AppColors.purple) {
                                        openWebsite(website)
                                    }
                                }
                                if let address = client.fullAddress {
                                    contactRowButton(icon: "mappin.circle.fill", value: address, color: AppColors.orange) {
                                        openMaps(address)
                                    }
                                }
                            }
                        }
                    }

                    // Statistics
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("clients.statistics".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        Button(action: { showingProjects = true }) {
                            HStack(spacing: AppSpacing.sm) {
                                StatCard(
                                    value: String(client.projectCount),
                                    label: "nav.projects".localized,
                                    icon: "folder.fill",
                                    color: AppColors.primary600
                                )
                            }
                        }
                        .buttonStyle(.plain)
                    }

                        // Notes
                        if let notes = client.notes, !notes.isEmpty {
                            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                Text("clients.notes".localized)
                                    .font(AppTypography.label)
                                    .foregroundColor(AppColors.textSecondary)

                                AppCard {
                                    Text(notes)
                                        .font(AppTypography.body)
                                        .foregroundColor(AppColors.textPrimary)
                                }
                            }
                        }
                    }
                    .padding(AppSpacing.md)
                }
            }
            .navigationTitle("clients.details".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.done".localized) { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: { showingEditSheet = true }) {
                            Label("common.edit".localized, systemImage: "pencil")
                        }
                        Button(role: .destructive, action: { showingDeleteAlert = true }) {
                            Label("common.delete".localized, systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .sheet(isPresented: $showingEditSheet) {
                EditClientView(client: client)
                    .environmentObject(viewModel)
            }
            .alert("clients.deleteClient".localized, isPresented: $showingDeleteAlert) {
                Button("common.cancel".localized, role: .cancel) {}
                Button("common.delete".localized, role: .destructive) {
                    Task {
                        try? await viewModel.deleteClient(id: client.id)
                        dismiss()
                    }
                }
            } message: {
                Text("clients.deleteConfirm".localized)
            }
            .sheet(isPresented: $showingProjects) {
                ClientProjectsView(client: client)
            }
        }
        .presentationBackground(AppColors.background)
    }

    private func contactRowButton(icon: String, value: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.sm) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 32, height: 32)
                    Image(systemName: icon)
                        .font(.system(size: 14))
                        .foregroundColor(color)
                }
                Text(value)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(AppColors.gray400)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Contact Actions
    private func openEmail(_ email: String) {
        if let url = URL(string: "mailto:\(email)") {
            UIApplication.shared.open(url)
        }
    }

    private func openPhone(_ phone: String) {
        let cleanedPhone = phone.replacingOccurrences(of: "[^0-9+]", with: "", options: .regularExpression)
        if let url = URL(string: "tel:\(cleanedPhone)") {
            UIApplication.shared.open(url)
        }
    }

    private func openWebsite(_ website: String) {
        var urlString = website
        if !urlString.hasPrefix("http://") && !urlString.hasPrefix("https://") {
            urlString = "https://\(urlString)"
        }
        if let url = URL(string: urlString) {
            UIApplication.shared.open(url)
        }
    }

    private func openMaps(_ address: String) {
        let encodedAddress = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "http://maps.apple.com/?q=\(encodedAddress)") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Client Projects View
struct ClientProjectsView: View {
    @Environment(\.dismiss) private var dismiss
    let client: Client
    @ObservedObject private var projectService = ProjectService.shared
    @State private var isLoading = true

    var clientProjects: [Project] {
        projectService.projects.filter { $0.clientId == client.id }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Full background
                AppColors.background
                    .ignoresSafeArea()

                // Content
                if isLoading {
                    VStack {
                        Spacer()
                        ProgressView()
                            .scaleEffect(1.2)
                        Spacer()
                    }
                } else if clientProjects.isEmpty {
                    VStack(spacing: AppSpacing.md) {
                        Spacer()
                        Image(systemName: "folder")
                            .font(.system(size: 48))
                            .foregroundColor(AppColors.gray400)
                        Text("projects.noProjects".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textSecondary)
                        Text("clients.noProjectsYet".localized)
                            .font(AppTypography.secondary)
                            .foregroundColor(AppColors.textTertiary)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: AppSpacing.sm) {
                            ForEach(clientProjects) { project in
                                ClientProjectRow(project: project)
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                }
            }
            .navigationTitle(String(format: "clients.clientProjects".localized, client.companyName))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.done".localized) { dismiss() }
                }
            }
            .task {
                await projectService.fetchProjects()
                isLoading = false
            }
        }
        .presentationBackground(AppColors.background)
    }
}

// MARK: - Client Project Row
struct ClientProjectRow: View {
    let project: Project

    var body: some View {
        AppCard {
            HStack(spacing: AppSpacing.md) {
                IconCircle(
                    icon: "building.2.fill",
                    size: .medium,
                    foregroundColor: AppColors.primary600,
                    backgroundColor: AppColors.primary50
                )

                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(project.name)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(AppColors.textPrimary)
                    Text(project.address)
                        .font(AppTypography.secondary)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                StatusBadge(
                    text: project.status.displayName,
                    status: project.status == .active ? .active : (project.status == .completed ? .completed : .pending)
                )
            }
        }
    }
}

// MARK: - New Client View
struct NewClientView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var viewModel: ClientsViewModel

    @State private var companyName = ""
    @State private var contactName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var address = ""
    @State private var city = ""
    @State private var state = ""
    @State private var zip = ""
    @State private var website = ""
    @State private var selectedIndustry: ClientIndustry?
    @State private var notes = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Company Information
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("clients.companyInfo".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(
                            label: "clients.companyName".localized,
                            placeholder: "clients.companyNamePlaceholder".localized,
                            text: $companyName,
                            isRequired: true
                        )

                        AppTextField(
                            label: "clients.contactName".localized,
                            placeholder: "clients.contactNamePlaceholder".localized,
                            text: $contactName
                        )

                        // Industry Picker
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("clients.industry".localized)
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: AppSpacing.xs) {
                                    ForEach(ClientIndustry.allCases, id: \.self) { industry in
                                        Button(action: {
                                            selectedIndustry = selectedIndustry == industry ? nil : industry
                                        }) {
                                            HStack(spacing: AppSpacing.xxs) {
                                                Image(systemName: industry.icon)
                                                    .font(.system(size: 12))
                                                Text(industry.displayName)
                                                    .font(AppTypography.caption)
                                            }
                                            .padding(.horizontal, AppSpacing.sm)
                                            .padding(.vertical, AppSpacing.xs)
                                            .background(selectedIndustry == industry ? industry.color.opacity(0.2) : AppColors.gray100)
                                            .foregroundColor(selectedIndustry == industry ? industry.color : AppColors.textSecondary)
                                            .cornerRadius(AppSpacing.radiusMedium)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Contact Details
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("clients.contactDetails".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(
                            label: "clients.email".localized,
                            placeholder: "clients.emailPlaceholder".localized,
                            text: $email
                        )

                        AppTextField(
                            label: "clients.phone".localized,
                            placeholder: "clients.phonePlaceholder".localized,
                            text: $phone
                        )

                        AppTextField(
                            label: "clients.website".localized,
                            placeholder: "clients.websitePlaceholder".localized,
                            text: $website
                        )
                    }

                    // Address
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("clients.address".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AddressAutocompleteField(
                            label: "clients.streetAddress".localized,
                            placeholder: "clients.addressPlaceholder".localized,
                            text: $address
                        ) { parsed in
                            // Auto-fill address fields from selection
                            if !parsed.street.isEmpty {
                                address = parsed.street
                            }
                            city = parsed.city
                            state = parsed.state
                            zip = parsed.zip
                        }

                        HStack(spacing: AppSpacing.sm) {
                            AppTextField(
                                label: "clients.city".localized,
                                placeholder: "clients.cityPlaceholder".localized,
                                text: $city
                            )
                            AppTextField(
                                label: "clients.state".localized,
                                placeholder: "clients.statePlaceholder".localized,
                                text: $state
                            )
                            .frame(width: 80)
                            AppTextField(
                                label: "clients.zip".localized,
                                placeholder: "clients.zipPlaceholder".localized,
                                text: $zip
                            )
                            .frame(width: 100)
                        }
                    }

                    // Notes
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("clients.additionalInfo".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextArea(
                            label: "clients.notes".localized,
                            placeholder: "clients.notesPlaceholder".localized,
                            text: $notes
                        )
                    }

                    // Save Button
                    PrimaryButton("clients.add".localized, icon: "plus.circle.fill", isLoading: isSaving) {
                        saveClient()
                    }
                    .disabled(companyName.isEmpty)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("clients.new".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }

    private func saveClient() {
        isSaving = true
        Task {
            do {
                _ = try await ClientService.shared.createClient(
                    companyName: companyName,
                    contactName: contactName.isEmpty ? nil : contactName,
                    email: email.isEmpty ? nil : email,
                    phone: phone.isEmpty ? nil : phone,
                    address: address.isEmpty ? nil : address,
                    city: city.isEmpty ? nil : city,
                    state: state.isEmpty ? nil : state,
                    zip: zip.isEmpty ? nil : zip,
                    status: .active,
                    notes: notes.isEmpty ? nil : notes,
                    website: website.isEmpty ? nil : website,
                    industry: selectedIndustry?.rawValue
                )
                await MainActor.run {
                    dismiss()
                }
            } catch {
                print("Failed to create client: \(error)")
            }
            await MainActor.run {
                isSaving = false
            }
        }
    }
}

// MARK: - Edit Client View
struct EditClientView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var viewModel: ClientsViewModel
    let client: Client

    @State private var companyName: String
    @State private var contactName: String
    @State private var email: String
    @State private var phone: String
    @State private var address: String
    @State private var city: String
    @State private var state: String
    @State private var zip: String
    @State private var website: String
    @State private var selectedIndustry: ClientIndustry?
    @State private var selectedStatus: ClientStatus
    @State private var notes: String
    @State private var isSaving = false

    init(client: Client) {
        self.client = client
        _companyName = State(initialValue: client.companyName)
        _contactName = State(initialValue: client.contactName ?? "")
        _email = State(initialValue: client.email ?? "")
        _phone = State(initialValue: client.phone ?? "")
        _address = State(initialValue: client.address ?? "")
        _city = State(initialValue: client.city ?? "")
        _state = State(initialValue: client.state ?? "")
        _zip = State(initialValue: client.zip ?? "")
        _website = State(initialValue: client.website ?? "")
        _selectedIndustry = State(initialValue: client.industry.flatMap { ClientIndustry(rawValue: $0) })
        _selectedStatus = State(initialValue: client.status)
        _notes = State(initialValue: client.notes ?? "")
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Status
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Text("clients.status".localized)
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.textSecondary)

                        Picker("clients.status".localized, selection: $selectedStatus) {
                            ForEach(ClientStatus.allCases, id: \.self) { status in
                                Text(status.displayName).tag(status)
                            }
                        }
                        .pickerStyle(.segmented)
                    }

                    // Company Information
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("clients.companyInfo".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(
                            label: "clients.companyName".localized,
                            placeholder: "clients.companyNamePlaceholder".localized,
                            text: $companyName,
                            isRequired: true
                        )

                        AppTextField(
                            label: "clients.contactName".localized,
                            placeholder: "clients.contactNamePlaceholder".localized,
                            text: $contactName
                        )

                        // Industry Picker
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            Text("clients.industry".localized)
                                .font(AppTypography.label)
                                .foregroundColor(AppColors.textSecondary)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: AppSpacing.xs) {
                                    ForEach(ClientIndustry.allCases, id: \.self) { industry in
                                        Button(action: {
                                            selectedIndustry = selectedIndustry == industry ? nil : industry
                                        }) {
                                            HStack(spacing: AppSpacing.xxs) {
                                                Image(systemName: industry.icon)
                                                    .font(.system(size: 12))
                                                Text(industry.displayName)
                                                    .font(AppTypography.caption)
                                            }
                                            .padding(.horizontal, AppSpacing.sm)
                                            .padding(.vertical, AppSpacing.xs)
                                            .background(selectedIndustry == industry ? industry.color.opacity(0.2) : AppColors.gray100)
                                            .foregroundColor(selectedIndustry == industry ? industry.color : AppColors.textSecondary)
                                            .cornerRadius(AppSpacing.radiusMedium)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Contact Details
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("clients.contactDetails".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(label: "clients.email".localized, placeholder: "clients.emailPlaceholder".localized, text: $email)
                        AppTextField(label: "clients.phone".localized, placeholder: "clients.phonePlaceholder".localized, text: $phone)
                        AppTextField(label: "clients.website".localized, placeholder: "clients.websitePlaceholder".localized, text: $website)
                    }

                    // Address
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("clients.address".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextField(label: "clients.streetAddress".localized, placeholder: "clients.addressPlaceholder".localized, text: $address)

                        HStack(spacing: AppSpacing.sm) {
                            AppTextField(label: "clients.city".localized, placeholder: "clients.cityPlaceholder".localized, text: $city)
                            AppTextField(label: "clients.state".localized, placeholder: "clients.statePlaceholder".localized, text: $state)
                                .frame(width: 80)
                            AppTextField(label: "clients.zip".localized, placeholder: "clients.zipPlaceholder".localized, text: $zip)
                                .frame(width: 100)
                        }
                    }

                    // Notes
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        Text("clients.additionalInfo".localized)
                            .font(AppTypography.heading3)
                            .foregroundColor(AppColors.textPrimary)

                        AppTextArea(label: "clients.notes".localized, placeholder: "clients.notesPlaceholder".localized, text: $notes)
                    }

                    // Save Button
                    PrimaryButton("clients.saveChanges".localized, icon: "checkmark.circle.fill", isLoading: isSaving) {
                        saveChanges()
                    }
                    .disabled(companyName.isEmpty)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.background)
            .navigationTitle("clients.edit".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
            }
        }
    }

    private func saveChanges() {
        isSaving = true
        Task {
            do {
                _ = try await ClientService.shared.updateClient(
                    id: client.id,
                    companyName: companyName,
                    contactName: contactName.isEmpty ? nil : contactName,
                    email: email.isEmpty ? nil : email,
                    phone: phone.isEmpty ? nil : phone,
                    address: address.isEmpty ? nil : address,
                    city: city.isEmpty ? nil : city,
                    state: state.isEmpty ? nil : state,
                    zip: zip.isEmpty ? nil : zip,
                    status: selectedStatus,
                    notes: notes.isEmpty ? nil : notes,
                    website: website.isEmpty ? nil : website,
                    industry: selectedIndustry?.rawValue
                )
                await viewModel.fetchClients()
                await MainActor.run {
                    dismiss()
                }
            } catch {
                print("Failed to update client: \(error)")
            }
            await MainActor.run {
                isSaving = false
            }
        }
    }
}

// MARK: - Clients ViewModel
@MainActor
class ClientsViewModel: ObservableObject {
    @Published var clients: [Client] = []
    @Published var isLoading = false

    private let clientService = ClientService.shared

    var activeCount: Int {
        clients.filter { $0.status == .active }.count
    }

    var inactiveCount: Int {
        clients.filter { $0.status == .inactive }.count
    }

    var totalProjectCount: Int {
        clients.reduce(0) { $0 + $1.projectCount }
    }

    func fetchClients() async {
        isLoading = true
        defer { isLoading = false }

        await clientService.fetchClients()
        clients = clientService.clients
    }

    func filteredClients(search: String, status: ClientStatus?) -> [Client] {
        var result = clients

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

    func deleteClient(id: String) async throws {
        try await clientService.deleteClient(id: id)
        clients.removeAll { $0.id == id }
    }
}

// MARK: - Preview
#Preview {
    NavigationStack {
        ClientsView()
    }
}
