//
//  ClientSelectorView.swift
//  ConstructionManager
//
//  Client picker for selecting a client when creating/editing a project
//

import SwiftUI

struct ClientSelectorView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var clientService = ClientService.shared
    @Binding var selectedClient: Client?

    @State private var searchText = ""

    var filteredClients: [Client] {
        let activeClients = clientService.clients.filter { $0.status == .active }

        if searchText.isEmpty {
            return activeClients.sorted { $0.companyName < $1.companyName }
        }

        return activeClients.filter {
            $0.companyName.localizedCaseInsensitiveContains(searchText) ||
            ($0.contactName?.localizedCaseInsensitiveContains(searchText) ?? false)
        }.sorted { $0.companyName < $1.companyName }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                searchBar
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.top, AppSpacing.sm)

                // Client List
                if clientService.isLoading && clientService.clients.isEmpty {
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
            .navigationTitle("clients.selectClient".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.clear".localized) {
                        selectedClient = nil
                        dismiss()
                    }
                    .foregroundColor(AppColors.error)
                }
            }
            .task {
                if clientService.clients.isEmpty {
                    await clientService.fetchClients()
                }
            }
        }
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
            if searchText.isEmpty {
                Text("clients.addFirstForProject".localized)
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textTertiary)
                    .multilineTextAlignment(.center)
            } else {
                Text("clients.tryDifferentSearch".localized)
                    .font(AppTypography.secondary)
                    .foregroundColor(AppColors.textTertiary)
            }
            Spacer()
        }
        .padding(.horizontal, AppSpacing.lg)
    }

    // MARK: - Clients List
    private var clientsList: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.xs) {
                ForEach(filteredClients) { client in
                    ClientSelectionRow(
                        client: client,
                        isSelected: selectedClient?.id == client.id,
                        onSelect: {
                            selectedClient = client
                            dismiss()
                        }
                    )
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.top, AppSpacing.sm)
            .padding(.bottom, AppSpacing.xl)
        }
    }
}

// MARK: - Client Selection Row
struct ClientSelectionRow: View {
    let client: Client
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: AppSpacing.sm) {
                // Company Icon
                ZStack {
                    RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                        .fill(isSelected ? AppColors.primary600.opacity(0.15) : AppColors.gray100)
                        .frame(width: 44, height: 44)

                    if let industry = client.industry, let ind = ClientIndustry(rawValue: industry) {
                        Image(systemName: ind.icon)
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(isSelected ? AppColors.primary600 : ind.color)
                    } else {
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(isSelected ? AppColors.primary600 : AppColors.gray500)
                    }
                }

                // Info
                VStack(alignment: .leading, spacing: 2) {
                    Text(client.companyName)
                        .font(AppTypography.bodySemibold)
                        .foregroundColor(isSelected ? AppColors.primary600 : AppColors.textPrimary)

                    if let contact = client.contactName {
                        Text(contact)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }

                Spacer()

                // Industry Badge
                if let industry = client.displayIndustry {
                    Text(industry)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                        .padding(.horizontal, AppSpacing.xs)
                        .padding(.vertical, 2)
                        .background(AppColors.gray100)
                        .cornerRadius(AppSpacing.radiusSmall)
                }

                // Selection Indicator
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundColor(isSelected ? AppColors.primary600 : AppColors.gray300)
            }
            .padding(AppSpacing.sm)
            .background(isSelected ? AppColors.primary50 : AppColors.cardBackground)
            .cornerRadius(AppSpacing.radiusMedium)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(isSelected ? AppColors.primary600 : AppColors.gray200, lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ClientSelectorView(selectedClient: .constant(nil))
}
