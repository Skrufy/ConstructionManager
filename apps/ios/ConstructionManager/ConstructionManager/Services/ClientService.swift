//
//  ClientService.swift
//  ConstructionManager
//
//  Service for client API calls
//

import Foundation
import Combine

@MainActor
class ClientService: ObservableObject {
    static let shared = ClientService()

    @Published var clients: [Client] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var isUsingCachedData = false

    private let apiClient = APIClient.shared
    private let networkMonitor = NetworkMonitor.shared
    private let offlineDataStore = OfflineDataStore.shared

    private init() {}

    // MARK: - Fetch Clients

    func fetchClients(status: String? = nil, industry: String? = nil, search: String? = nil) async {
        isLoading = true
        error = nil
        isUsingCachedData = false
        defer { isLoading = false }

        // Check network connectivity
        guard networkMonitor.isConnected else {
            loadFromOfflineCache()
            return
        }

        do {
            var queryItems: [URLQueryItem] = []
            if let status = status {
                queryItems.append(URLQueryItem(name: "status", value: status))
            }
            if let industry = industry {
                queryItems.append(URLQueryItem(name: "industry", value: industry))
            }
            if let search = search, !search.isEmpty {
                queryItems.append(URLQueryItem(name: "search", value: search))
            }

            let response: [ClientAPIModel] = try await apiClient.get(
                "/clients",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.clients = response.map { $0.toClient() }

            // Save to cache for offline use
            offlineDataStore.saveClients(self.clients)
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch clients: \(error)")

            // Fall back to cached data
            loadFromOfflineCache()
        }
    }

    // MARK: - Offline Support

    private func loadFromOfflineCache() {
        let cachedClients = offlineDataStore.loadClients()
        if !cachedClients.isEmpty {
            self.clients = cachedClients
            self.isUsingCachedData = true
            print("[ClientService] Loaded \(cachedClients.count) clients from cache")
        }
    }

    func loadFromCache(_ clients: [Client]) {
        self.clients = clients
        self.isUsingCachedData = true
    }

    // MARK: - Refresh

    func refresh() async {
        await fetchClients()
    }

    // MARK: - Create Client

    func createClient(
        companyName: String,
        contactName: String?,
        email: String?,
        phone: String?,
        address: String?,
        city: String?,
        state: String?,
        zip: String?,
        status: ClientStatus = .active,
        notes: String? = nil,
        website: String? = nil,
        industry: String? = nil
    ) async throws -> Client {
        let request = CreateClientRequest(
            companyName: companyName,
            contactName: contactName,
            email: email,
            phone: phone,
            address: address,
            city: city,
            state: state,
            zip: zip,
            status: status.rawValue,
            notes: notes,
            website: website,
            industry: industry
        )

        let response: ClientAPIModel = try await apiClient.post("/clients", body: request)
        let newClient = response.toClient()

        // Add to local list
        clients.insert(newClient, at: 0)

        return newClient
    }

    // MARK: - Update Client

    func updateClient(
        id: String,
        companyName: String? = nil,
        contactName: String? = nil,
        email: String? = nil,
        phone: String? = nil,
        address: String? = nil,
        city: String? = nil,
        state: String? = nil,
        zip: String? = nil,
        status: ClientStatus? = nil,
        notes: String? = nil,
        website: String? = nil,
        industry: String? = nil
    ) async throws -> Client {
        let request = UpdateClientRequest(
            companyName: companyName,
            contactName: contactName,
            email: email,
            phone: phone,
            address: address,
            city: city,
            state: state,
            zip: zip,
            status: status?.rawValue,
            notes: notes,
            website: website,
            industry: industry
        )

        let response: ClientAPIModel = try await apiClient.patch("/clients/\(id)", body: request)
        let updatedClient = response.toClient()

        // Update local list
        if let index = clients.firstIndex(where: { $0.id == id }) {
            clients[index] = updatedClient
        }

        return updatedClient
    }

    // MARK: - Delete Client

    func deleteClient(id: String) async throws {
        try await apiClient.delete("/clients/\(id)")

        // Remove from local list
        clients.removeAll { $0.id == id }
    }
}

// MARK: - API Response Models

struct ClientAPIModel: Decodable {
    let id: String
    let companyName: String
    let contactName: String?
    let email: String?
    let phone: String?
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let status: String
    let notes: String?
    let website: String?
    let industry: String?
    let createdAt: Date
    let updatedAt: Date?
    let _count: ClientCounts?

    struct ClientCounts: Decodable {
        let projects: Int?
    }

    func toClient() -> Client {
        // Map status string to enum
        let mappedStatus: ClientStatus
        switch status.uppercased() {
        case "ACTIVE": mappedStatus = .active
        case "INACTIVE": mappedStatus = .inactive
        default: mappedStatus = .active
        }

        return Client(
            id: id,
            companyName: companyName,
            contactName: contactName,
            email: email,
            phone: phone,
            address: address,
            city: city,
            state: state,
            zip: zip,
            status: mappedStatus,
            notes: notes,
            website: website,
            industry: industry,
            projectCount: _count?.projects ?? 0,
            createdAt: createdAt,
            updatedAt: updatedAt ?? createdAt
        )
    }
}

// MARK: - Request Models

struct CreateClientRequest: Encodable {
    let companyName: String
    let contactName: String?
    let email: String?
    let phone: String?
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let status: String
    let notes: String?
    let website: String?
    let industry: String?
}

struct UpdateClientRequest: Encodable {
    let companyName: String?
    let contactName: String?
    let email: String?
    let phone: String?
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let status: String?
    let notes: String?
    let website: String?
    let industry: String?
}
