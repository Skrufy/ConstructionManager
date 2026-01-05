//
//  AddressAutocompleteService.swift
//  ConstructionManager
//
//  Service for address autocomplete using Apple MapKit
//

import Foundation
import SwiftUI
import MapKit
import Combine

// MARK: - Address Suggestion
struct AddressSuggestion: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let subtitle: String
    let completion: MKLocalSearchCompletion

    var fullAddress: String {
        if subtitle.isEmpty {
            return title
        }
        return "\(title), \(subtitle)"
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: AddressSuggestion, rhs: AddressSuggestion) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Parsed Address
struct ParsedAddress {
    var street: String = ""
    var city: String = ""
    var state: String = ""
    var zip: String = ""
    var latitude: Double?
    var longitude: Double?
}

// MARK: - Address Autocomplete Service
@MainActor
class AddressAutocompleteService: NSObject, ObservableObject {
    @Published var suggestions: [AddressSuggestion] = []
    @Published var isSearching = false

    private var searchCompleter: MKLocalSearchCompleter
    private var searchTask: Task<Void, Never>?

    override init() {
        searchCompleter = MKLocalSearchCompleter()
        searchCompleter.resultTypes = .address
        super.init()
        searchCompleter.delegate = self
    }

    /// Search for address suggestions
    func search(query: String) {
        guard !query.isEmpty else {
            suggestions = []
            isSearching = false
            return
        }

        isSearching = true
        searchCompleter.queryFragment = query
    }

    /// Clear suggestions
    func clearSuggestions() {
        suggestions = []
        isSearching = false
    }

    /// Get full address details from a suggestion
    func getAddressDetails(from suggestion: AddressSuggestion) async -> ParsedAddress? {
        let searchRequest = MKLocalSearch.Request(completion: suggestion.completion)
        let search = MKLocalSearch(request: searchRequest)

        do {
            let response = try await search.start()
            guard let mapItem = response.mapItems.first else { return nil }

            let placemark = mapItem.placemark

            var parsed = ParsedAddress()

            // Build street address
            var streetParts: [String] = []
            if let subThoroughfare = placemark.subThoroughfare {
                streetParts.append(subThoroughfare)
            }
            if let thoroughfare = placemark.thoroughfare {
                streetParts.append(thoroughfare)
            }
            parsed.street = streetParts.joined(separator: " ")

            // City
            parsed.city = placemark.locality ?? ""

            // State
            parsed.state = placemark.administrativeArea ?? ""

            // ZIP
            parsed.zip = placemark.postalCode ?? ""

            // Coordinates
            parsed.latitude = placemark.coordinate.latitude
            parsed.longitude = placemark.coordinate.longitude

            return parsed
        } catch {
            print("Address lookup failed: \(error)")
            return nil
        }
    }
}

// MARK: - MKLocalSearchCompleterDelegate
extension AddressAutocompleteService: MKLocalSearchCompleterDelegate {
    nonisolated func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        Task { @MainActor [weak self] in
            guard let self = self else { return }
            self.suggestions = completer.results.map { completion in
                AddressSuggestion(
                    title: completion.title,
                    subtitle: completion.subtitle,
                    completion: completion
                )
            }
            self.isSearching = false
        }
    }

    nonisolated func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        Task { @MainActor [weak self] in
            print("Address autocomplete error: \(error)")
            self?.isSearching = false
        }
    }
}

// MARK: - Address Autocomplete TextField
struct AddressAutocompleteField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var onAddressSelected: ((ParsedAddress) -> Void)?

    @StateObject private var autocomplete = AddressAutocompleteService()
    @State private var showSuggestions = false
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text(label)
                .font(AppTypography.label)
                .foregroundColor(AppColors.textSecondary)

            VStack(spacing: 0) {
                // Text Field
                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: "location.fill")
                        .foregroundColor(AppColors.gray400)
                        .font(.system(size: 16))

                    TextField(placeholder, text: $text)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textPrimary)
                        .focused($isFocused)
                        .onChange(of: text) { _, newValue in
                            autocomplete.search(query: newValue)
                            showSuggestions = !newValue.isEmpty && isFocused
                        }
                        .onChange(of: isFocused) { _, focused in
                            showSuggestions = focused && !text.isEmpty
                        }

                    if autocomplete.isSearching {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else if !text.isEmpty {
                        Button(action: {
                            text = ""
                            autocomplete.clearSuggestions()
                        }) {
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
                        .stroke(isFocused ? AppColors.primary600 : AppColors.gray200, lineWidth: isFocused ? 2 : 1)
                )

                // Suggestions List
                if showSuggestions && !autocomplete.suggestions.isEmpty {
                    VStack(spacing: 0) {
                        ForEach(autocomplete.suggestions.prefix(5)) { suggestion in
                            Button(action: {
                                selectSuggestion(suggestion)
                            }) {
                                HStack(spacing: AppSpacing.sm) {
                                    Image(systemName: "mappin.circle.fill")
                                        .foregroundColor(AppColors.primary600)
                                        .font(.system(size: 16))

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(suggestion.title)
                                            .font(AppTypography.bodyMedium)
                                            .foregroundColor(AppColors.textPrimary)
                                            .lineLimit(1)
                                        if !suggestion.subtitle.isEmpty {
                                            Text(suggestion.subtitle)
                                                .font(AppTypography.caption)
                                                .foregroundColor(AppColors.textSecondary)
                                                .lineLimit(1)
                                        }
                                    }

                                    Spacer()
                                }
                                .padding(.horizontal, AppSpacing.sm)
                                .padding(.vertical, AppSpacing.xs)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)

                            if suggestion.id != autocomplete.suggestions.prefix(5).last?.id {
                                Divider()
                                    .padding(.leading, AppSpacing.xl)
                            }
                        }
                    }
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppSpacing.radiusMedium)
                    .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                    .padding(.top, AppSpacing.xxs)
                }
            }
        }
    }

    private func selectSuggestion(_ suggestion: AddressSuggestion) {
        text = suggestion.title
        showSuggestions = false
        isFocused = false
        autocomplete.clearSuggestions()

        // Fetch full address details
        Task {
            if let parsed = await autocomplete.getAddressDetails(from: suggestion) {
                onAddressSelected?(parsed)
            }
        }
    }
}

#Preview {
    VStack(spacing: AppSpacing.lg) {
        AddressAutocompleteField(
            label: "Street Address",
            placeholder: "Start typing an address...",
            text: .constant("")
        )
    }
    .padding()
    .background(AppColors.background)
}
