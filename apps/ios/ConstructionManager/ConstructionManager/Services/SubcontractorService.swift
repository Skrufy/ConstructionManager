//
//  SubcontractorService.swift
//  ConstructionManager
//
//  Service for subcontractor API calls
//

import Foundation
import Combine

@MainActor
class SubcontractorService: ObservableObject {
    static let shared = SubcontractorService()

    @Published var subcontractors: [Subcontractor] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared
    private var lastFetchTime: Date?
    private let minFetchInterval: TimeInterval = 2.0 // Minimum seconds between fetches

    private init() {}

    // MARK: - Fetch Subcontractors

    func fetchSubcontractors(status: String? = nil, trade: String? = nil, search: String? = nil, force: Bool = false) async {
        // Prevent multiple simultaneous fetches
        guard !isLoading else {
            print("[SubcontractorService] Skipping fetch - already loading")
            return
        }

        // Prevent rapid repeated fetches (unless forced)
        if !force, let lastFetch = lastFetchTime, Date().timeIntervalSince(lastFetch) < minFetchInterval {
            print("[SubcontractorService] Skipping fetch - too soon since last fetch")
            return
        }

        isLoading = true
        error = nil
        lastFetchTime = Date()
        defer { isLoading = false }

        do {
            var queryItems: [URLQueryItem] = []
            if let status = status {
                queryItems.append(URLQueryItem(name: "status", value: status))
            }
            if let trade = trade {
                queryItems.append(URLQueryItem(name: "trade", value: trade))
            }
            if let search = search, !search.isEmpty {
                queryItems.append(URLQueryItem(name: "search", value: search))
            }

            print("[SubcontractorService] 📥 Fetching subcontractors...")
            let response: [SubcontractorAPIModel] = try await apiClient.get(
                "/subcontractors",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.subcontractors = response.map { $0.toSubcontractor() }
            print("[SubcontractorService] ✅ Fetched \(response.count) subcontractors")
        } catch {
            self.error = error.localizedDescription
            print("[SubcontractorService] ❌ Failed to fetch subcontractors: \(error)")
        }
    }

    // MARK: - Refresh

    func refresh() async {
        await fetchSubcontractors(force: true)
    }

    // MARK: - Create Subcontractor

    func createSubcontractor(
        companyName: String,
        contactName: String?,
        email: String?,
        phone: String?,
        address: String?,
        city: String?,
        state: String?,
        zip: String?,
        trades: [String],
        licenseNumber: String?,
        insuranceExpiry: Date? = nil,
        rating: Double? = nil,
        status: SubcontractorStatus = .active,
        notes: String? = nil
    ) async throws -> Subcontractor {
        let request = CreateSubcontractorRequest(
            companyName: companyName,
            contactName: contactName,
            email: email,
            phone: phone,
            address: address,
            city: city,
            state: state,
            zip: zip,
            trades: trades,
            licenseNumber: licenseNumber,
            insuranceExpiry: insuranceExpiry,
            rating: rating,
            status: status.rawValue,
            notes: notes
        )

        let response: SubcontractorAPIModel = try await apiClient.post("/subcontractors", body: request)
        let newSubcontractor = response.toSubcontractor()

        // Add to local list
        subcontractors.insert(newSubcontractor, at: 0)

        return newSubcontractor
    }

    // MARK: - Update Subcontractor

    func updateSubcontractor(
        id: String,
        companyName: String? = nil,
        contactName: String? = nil,
        email: String? = nil,
        phone: String? = nil,
        address: String? = nil,
        city: String? = nil,
        state: String? = nil,
        zip: String? = nil,
        trades: [String]? = nil,
        licenseNumber: String? = nil,
        insuranceExpiry: Date? = nil,
        rating: Double? = nil,
        status: SubcontractorStatus? = nil,
        notes: String? = nil
    ) async throws -> Subcontractor {
        let request = UpdateSubcontractorRequest(
            companyName: companyName,
            contactName: contactName,
            email: email,
            phone: phone,
            address: address,
            city: city,
            state: state,
            zip: zip,
            trades: trades,
            licenseNumber: licenseNumber,
            insuranceExpiry: insuranceExpiry,
            rating: rating,
            status: status?.rawValue,
            notes: notes
        )

        let response: SubcontractorAPIModel = try await apiClient.patch("/subcontractors/\(id)", body: request)
        let updatedSubcontractor = response.toSubcontractor()

        // Update local list
        if let index = subcontractors.firstIndex(where: { $0.id == id }) {
            subcontractors[index] = updatedSubcontractor
        }

        return updatedSubcontractor
    }

    // MARK: - Delete Subcontractor

    func deleteSubcontractor(id: String) async throws {
        try await apiClient.delete("/subcontractors/\(id)")

        // Remove from local list
        subcontractors.removeAll { $0.id == id }
    }
}

// MARK: - API Response Models

struct SubcontractorAPIModel: Decodable {
    let id: String
    let companyName: String
    let contactName: String?
    let email: String?
    let phone: String?
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let trades: [String]?
    let licenseNumber: String?
    let insuranceExpiry: Date?
    let rating: Double?
    let status: String
    let notes: String?
    let createdAt: Date
    let updatedAt: Date?
    let _count: SubcontractorCounts?
    let certifications: [CertificationAPIModel]?

    struct SubcontractorCounts: Decodable {
        let projects: Int?
        let certifications: Int?
    }

    struct CertificationAPIModel: Decodable {
        let id: String
        let certName: String
        let expiryDate: Date
        let status: String
    }

    func toSubcontractor() -> Subcontractor {
        // Map status string to enum
        let mappedStatus: SubcontractorStatus
        switch status.uppercased() {
        case "ACTIVE": mappedStatus = .active
        case "INACTIVE": mappedStatus = .inactive
        case "PENDING": mappedStatus = .pending
        case "SUSPENDED": mappedStatus = .suspended
        default: mappedStatus = .active
        }

        // Map expiring certifications
        let expiringCerts = (certifications ?? []).map { cert in
            ExpiringCertification(
                id: cert.id,
                certName: cert.certName,
                expiryDate: cert.expiryDate,
                status: cert.status
            )
        }

        return Subcontractor(
            id: id,
            companyName: companyName,
            contactName: contactName,
            email: email,
            phone: phone,
            address: address,
            city: city,
            state: state,
            zip: zip,
            trades: trades ?? [],
            licenseNumber: licenseNumber,
            insuranceExpiry: insuranceExpiry,
            rating: rating,
            status: mappedStatus,
            notes: notes,
            projectCount: _count?.projects ?? 0,
            certificationCount: _count?.certifications ?? 0,
            expiringCertifications: expiringCerts,
            createdAt: createdAt,
            updatedAt: updatedAt ?? createdAt
        )
    }
}

// MARK: - Request Models

struct CreateSubcontractorRequest: Encodable {
    let companyName: String
    let contactName: String?
    let email: String?
    let phone: String?
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let trades: [String]
    let licenseNumber: String?
    let insuranceExpiry: Date?
    let rating: Double?
    let status: String
    let notes: String?
}

struct UpdateSubcontractorRequest: Encodable {
    let companyName: String?
    let contactName: String?
    let email: String?
    let phone: String?
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let trades: [String]?
    let licenseNumber: String?
    let insuranceExpiry: Date?
    let rating: Double?
    let status: String?
    let notes: String?
}
