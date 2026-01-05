//
//  DrawingService.swift
//  ConstructionManager
//
//  Service for drawing-related API calls
//

import Foundation
import Combine

@MainActor
class DrawingService: ObservableObject {
    static let shared = DrawingService()

    @Published var drawings: [Drawing] = []
    @Published var disciplines: [String] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiClient = APIClient.shared

    // Request deduplication
    private var fetchTask: Task<Void, Never>?
    private var lastFetchTime: Date?
    private let minFetchInterval: TimeInterval = 2.0

    private init() {}

    // MARK: - Fetch Drawings

    func fetchDrawings(projectId: String? = nil, discipline: String? = nil, search: String? = nil, force: Bool = false) async {
        // Skip if we just fetched recently (unless forced or filters changed)
        let hasFilters = projectId != nil || discipline != nil || (search != nil && !search!.isEmpty)
        if !force && !hasFilters, let lastFetch = lastFetchTime, Date().timeIntervalSince(lastFetch) < minFetchInterval {
            print("[DrawingService] Skipping fetch - too soon since last fetch")
            return
        }

        // If there's already a fetch in progress with no filters, wait for it
        if let existingTask = fetchTask, !hasFilters {
            print("[DrawingService] Reusing existing fetch task")
            await existingTask.value
            return
        }

        // Create a new fetch task
        let task = Task {
            await performFetch(projectId: projectId, discipline: discipline, search: search)
        }

        if !hasFilters {
            fetchTask = task
        }

        await task.value

        if !hasFilters {
            fetchTask = nil
        }
    }

    private func performFetch(projectId: String?, discipline: String?, search: String?) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var queryItems: [URLQueryItem] = []
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }
            if let discipline = discipline {
                queryItems.append(URLQueryItem(name: "discipline", value: discipline))
            }
            if let search = search, !search.isEmpty {
                queryItems.append(URLQueryItem(name: "search", value: search))
            }

            let response: DrawingsAPIResponse = try await apiClient.get(
                "/drawings",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.drawings = response.drawings.map { $0.toDrawing() }
            self.disciplines = response.disciplines ?? []
            self.lastFetchTime = Date()
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch drawings: \(error)")
        }
    }

    // MARK: - Refresh

    func refresh() async {
        await fetchDrawings()
    }
}

// MARK: - API Response Models

struct DrawingsAPIResponse: Decodable {
    let drawings: [DrawingAPIModel]
    let disciplines: [String]?
    let projects: [DrawingProjectRef]?
}

struct DrawingProjectRef: Decodable {
    let id: String
    let name: String
    let drawingCount: Int?
}

struct DrawingAPIModel: Decodable {
    let id: String
    let title: String
    let drawingNumber: String?
    let revisionNumber: String?
    let subcategory: String?
    let fileUrl: String
    let fileType: String
    let scale: String?
    let createdAt: Date
    let project: DrawingProjectInfo?
    let uploadedByUser: DrawingUserRef?
    let isVerified: Bool?
    let isLatestRevision: Bool?
    let hasOcrMetadata: Bool?
    let annotationCount: Int?

    struct DrawingProjectInfo: Decodable {
        let id: String
        let name: String
        let address: String?
        let status: String?
    }

    struct DrawingUserRef: Decodable {
        let id: String
        let name: String
    }

    func toDrawing() -> Drawing {
        // Map subcategory (discipline) to DrawingCategory
        let mappedCategory: DrawingCategory
        switch (subcategory ?? "").uppercased() {
        case "ARCHITECTURAL", "ARCH", "A": mappedCategory = .architectural
        case "STRUCTURAL", "STRUCT", "S": mappedCategory = .structural
        case "MEP", "MECHANICAL", "M": mappedCategory = .mechanical
        case "ELECTRICAL", "ELEC", "E": mappedCategory = .electrical
        case "PLUMBING", "PLUMB", "P": mappedCategory = .plumbing
        case "CIVIL", "C": mappedCategory = .civil
        case "LANDSCAPE", "LAND", "L": mappedCategory = .landscape
        default: mappedCategory = .other
        }

        return Drawing(
            id: id,
            projectId: project?.id ?? "",
            name: title,
            description: nil,
            category: mappedCategory,
            discipline: .other,
            sheetNumber: drawingNumber,
            revision: revisionNumber ?? "A",
            fileUrl: fileUrl,
            thumbnailUrl: nil,
            fileSize: 0, // Not provided by API
            pageCount: 1, // Not provided by API
            uploadedBy: uploadedByUser?.name ?? "Unknown",
            uploadedAt: createdAt,
            lastModified: createdAt,
            annotations: []
        )
    }
}
