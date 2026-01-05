//
//  CertificationService.swift
//  ConstructionManager
//
//  Service for managing certifications and licenses
//

import Foundation
import Combine

@MainActor
class CertificationService: ObservableObject {
    static let shared = CertificationService()

    @Published var certifications: [Certification] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - API Response Models
    struct CertificationsAPIResponse: Decodable {
        let userCertifications: [UserCertificationAPI]
        let subcontractorCertifications: [SubcontractorCertificationAPI]
        let summary: CertificationsSummary
    }

    struct CertificationsSummary: Decodable {
        let total: Int
        let valid: Int
        let expiringSoon: Int
        let expired: Int
    }

    struct UserCertificationAPI: Decodable {
        let id: String
        let userId: String
        let certType: String
        let certName: String
        let certNumber: String?
        let issuingAuthority: String?
        let issueDate: Date?
        let expiryDate: Date?
        let documentUrl: String?
        let status: String
        let notes: String?
        let user: UserRef?

        struct UserRef: Decodable {
            let id: String
            let name: String
        }

        func toCertification() -> Certification {
            let certType = CertificationType(rawValue: certType) ?? .certification
            return Certification(
                id: id,
                userId: userId,
                subcontractorId: nil,
                type: certType,
                name: certName,
                issuingAuthority: issuingAuthority,
                certificationNumber: certNumber,
                issueDate: issueDate,
                expirationDate: expiryDate,
                documentUrl: documentUrl,
                notes: notes,
                createdAt: Date(),
                updatedAt: Date()
            )
        }
    }

    struct SubcontractorCertificationAPI: Decodable {
        let id: String
        let subcontractorId: String
        let certType: String
        let certName: String
        let certNumber: String?
        let issueDate: Date?
        let expiryDate: Date?
        let documentUrl: String?
        let status: String
        let subcontractor: SubcontractorRef?

        struct SubcontractorRef: Decodable {
            let id: String
            let companyName: String
        }

        func toCertification() -> Certification {
            let certType = CertificationType(rawValue: certType) ?? .certification
            return Certification(
                id: id,
                userId: nil,
                subcontractorId: subcontractorId,
                type: certType,
                name: certName,
                issuingAuthority: subcontractor?.companyName,
                certificationNumber: certNumber,
                issueDate: issueDate,
                expirationDate: expiryDate,
                documentUrl: documentUrl,
                notes: nil,
                createdAt: Date(),
                updatedAt: Date()
            )
        }
    }

    // MARK: - Fetch Certifications

    func fetchCertifications(userId: String? = nil, subcontractorId: String? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var endpoint = "/certifications"
            var params: [String] = []
            if let userId = userId {
                params.append("userId=\(userId)")
            }
            if let subcontractorId = subcontractorId {
                params.append("subcontractorId=\(subcontractorId)")
            }
            if !params.isEmpty {
                endpoint += "?" + params.joined(separator: "&")
            }

            let response: CertificationsAPIResponse = try await apiClient.get(endpoint)

            // Combine user and subcontractor certifications
            var allCerts: [Certification] = []
            allCerts.append(contentsOf: response.userCertifications.map { $0.toCertification() })
            allCerts.append(contentsOf: response.subcontractorCertifications.map { $0.toCertification() })

            certifications = allCerts
            print("[CertificationService] Fetched \(certifications.count) certifications")
        } catch {
            print("Failed to fetch certifications: \(error)")
            self.error = error.localizedDescription
            // Use mock data
            certifications = Certification.mockCertifications
        }
    }

    // MARK: - Fetch Expiring

    func fetchExpiring(days: Int = 30) async -> [Certification] {
        await fetchCertifications()
        return certifications.filter { cert in
            guard let daysUntil = cert.daysUntilExpiration else { return false }
            return daysUntil >= 0 && daysUntil <= days
        }
    }

    // MARK: - Fetch Expired

    func fetchExpired() async -> [Certification] {
        await fetchCertifications()
        return certifications.filter { $0.isExpired }
    }

    // MARK: - Create Certification

    struct CreateCertificationRequest: Codable {
        let type: String // "user" or "subcontractor"
        let userId: String?
        let subcontractorId: String?
        let certType: String
        let certName: String
        let certNumber: String?
        let issuingAuthority: String?
        let issueDate: String?
        let expiryDate: String?
        let documentUrl: String?
        let notes: String?
    }

    func createCertification(_ certification: Certification) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let dateFormatter = ISO8601DateFormatter()

            let request = CreateCertificationRequest(
                type: certification.subcontractorId != nil ? "subcontractor" : "user",
                userId: certification.userId,
                subcontractorId: certification.subcontractorId,
                certType: certification.type.rawValue,
                certName: certification.name,
                certNumber: certification.certificationNumber,
                issuingAuthority: certification.issuingAuthority,
                issueDate: certification.issueDate.map { dateFormatter.string(from: $0) },
                expiryDate: certification.expirationDate.map { dateFormatter.string(from: $0) },
                documentUrl: certification.documentUrl,
                notes: certification.notes
            )

            // The API returns the created certification but we just refetch all to keep things simple
            struct CreateCertResponse: Codable {
                let id: String
            }
            let _: CreateCertResponse = try await apiClient.post("/certifications", body: request)
            await fetchCertifications()
            return true
        } catch {
            print("Failed to create certification: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Update Certification

    func updateCertification(_ certification: Certification) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let _: Certification = try await apiClient.put("/certifications/\(certification.id)", body: certification)
            await fetchCertifications()
            return true
        } catch {
            print("Failed to update certification: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Delete Certification

    func deleteCertification(id: String) async -> Bool {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await apiClient.delete("/certifications/\(id)")
            certifications.removeAll { $0.id == id }
            return true
        } catch {
            print("Failed to delete certification: \(error)")
            self.error = error.localizedDescription
            return false
        }
    }

    // MARK: - Statistics

    var validCount: Int {
        certifications.filter { $0.status == .valid }.count
    }

    var expiringCount: Int {
        certifications.filter { $0.status == .expiringSoon }.count
    }

    var expiredCount: Int {
        certifications.filter { $0.status == .expired }.count
    }
}
