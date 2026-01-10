//
//  SearchService.swift
//  ConstructionManager
//
//  Global search across all resources
//

import Foundation
import Combine

// MARK: - Search Result Type
enum SearchResultType: String, Codable, CaseIterable {
    case project = "PROJECT"
    case dailyLog = "DAILY_LOG"
    case document = "DOCUMENT"
    case drawing = "DRAWING"
    case equipment = "EQUIPMENT"
    case subcontractor = "SUBCONTRACTOR"
    case client = "CLIENT"
    case user = "USER"
    case task = "TASK"
    case rfi = "RFI"

    var displayName: String {
        switch self {
        case .project: return "Project"
        case .dailyLog: return "Daily Log"
        case .document: return "Document"
        case .drawing: return "Drawing"
        case .equipment: return "Equipment"
        case .subcontractor: return "Subcontractor"
        case .client: return "Client"
        case .user: return "Team Member"
        case .task: return "Task"
        case .rfi: return "RFI"
        }
    }

    var icon: String {
        switch self {
        case .project: return "building.2.fill"
        case .dailyLog: return "doc.text.fill"
        case .document: return "folder.fill"
        case .drawing: return "doc.richtext"
        case .equipment: return "wrench.and.screwdriver.fill"
        case .subcontractor: return "person.2.fill"
        case .client: return "building.fill"
        case .user: return "person.fill"
        case .task: return "checklist"
        case .rfi: return "questionmark.circle.fill"
        }
    }
}

// MARK: - Search Result
struct SearchResult: Identifiable, Codable {
    let id: String
    let type: SearchResultType
    let title: String
    let subtitle: String?
    let description: String?
    let projectId: String?
    let projectName: String?
    let matchedField: String?
    let matchedText: String?
    let createdAt: Date?
    let updatedAt: Date?
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Search Response
struct SearchResponse: Codable {
    let results: [SearchResult]
    let totalCount: Int?
    let query: String?
    let filters: [String: String]?
    // Note: No explicit CodingKeys needed - APIClient uses convertFromSnakeCase
}

// MARK: - Search Filter
struct SearchFilterDefinition {
    let key: String
    let label: String
    let aliases: [String]

    init(_ key: String, _ label: String, aliases: [String] = []) {
        self.key = key
        self.label = label
        self.aliases = aliases
    }
}

let SEARCH_FILTERS: [SearchFilterDefinition] = [
    SearchFilterDefinition("projects", "Projects"),
    SearchFilterDefinition("logs", "Daily Logs", aliases: ["dailylogs", "dailylog"]),
    SearchFilterDefinition("documents", "Documents", aliases: ["docs"]),
    SearchFilterDefinition("clients", "Clients"),
    SearchFilterDefinition("warnings", "Warnings"),
    SearchFilterDefinition("users", "Users"),
    SearchFilterDefinition("equipment", "Equipment"),
    SearchFilterDefinition("safety", "Safety"),
    SearchFilterDefinition("subcontractors", "Subcontractors", aliases: ["subs"])
]

// Parse query for filter prefix (e.g., "#projects search term")
func parseSearchQuery(_ query: String) -> (filter: String?, searchTerm: String) {
    let trimmed = query.trimmingCharacters(in: .whitespaces)
    let pattern = "^#(\\w+)\\s*(.*)$"
    guard let regex = try? NSRegularExpression(pattern: pattern, options: []),
          let match = regex.firstMatch(in: trimmed, options: [], range: NSRange(trimmed.startIndex..., in: trimmed)) else {
        return (nil, trimmed)
    }

    if let filterRange = Range(match.range(at: 1), in: trimmed),
       let searchRange = Range(match.range(at: 2), in: trimmed) {
        let filterName = String(trimmed[filterRange]).lowercased()
        let searchTerm = String(trimmed[searchRange]).trimmingCharacters(in: .whitespaces)

        if let filter = SEARCH_FILTERS.first(where: { $0.key == filterName || $0.aliases.contains(filterName) }) {
            return (filter.key, searchTerm)
        }
    }
    return (nil, trimmed)
}

// MARK: - Search Service
@MainActor
class SearchService: ObservableObject {
    static let shared = SearchService()

    @Published var results: [SearchResult] = []
    @Published var isSearching = false
    @Published var error: String?
    @Published var recentSearches: [String] = []
    @Published var activeFilter: String?

    private let apiClient = APIClient.shared
    private let maxRecentSearches = 10

    private init() {
        loadRecentSearches()
    }

    var activeFilterLabel: String? {
        guard let filter = activeFilter else { return nil }
        return SEARCH_FILTERS.first(where: { $0.key == filter })?.label ?? filter
    }

    // MARK: - Search

    func search(query: String, types: [SearchResultType]? = nil, projectId: String? = nil) async {
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            results = []
            activeFilter = nil
            return
        }

        // Parse query for filter prefix
        let (parsedFilter, searchTerm) = parseSearchQuery(query)
        activeFilter = parsedFilter

        // If only filter prefix with no search term, wait for more input
        if searchTerm.isEmpty && parsedFilter != nil {
            results = []
            return
        }

        isSearching = true
        error = nil
        defer { isSearching = false }

        do {
            var params: [String: String] = ["q": searchTerm]
            if let types = types {
                params["types"] = types.map { $0.rawValue }.joined(separator: ",")
            }
            if let projectId = projectId {
                params["project_id"] = projectId
            }
            if let category = parsedFilter {
                params["category"] = category
            }

            let queryString = params.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0.value)" }.joined(separator: "&")
            let response: SearchResponse = try await apiClient.get("/search?\(queryString)")
            results = response.results

            // Save to recent searches
            saveRecentSearch(query)
        } catch {
            print("Search error: \(error)")
            self.error = error.localizedDescription

            // Use mock data for development
            results = Self.mockSearch(query: searchTerm, types: types)
        }
    }

    func clearResults() {
        results = []
        error = nil
    }

    // MARK: - Recent Searches

    private func loadRecentSearches() {
        if let saved = UserDefaults.standard.stringArray(forKey: "recentSearches") {
            recentSearches = saved
        }
    }

    private func saveRecentSearch(_ query: String) {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }

        // Remove if already exists
        recentSearches.removeAll { $0.lowercased() == trimmed.lowercased() }

        // Add to front
        recentSearches.insert(trimmed, at: 0)

        // Limit size
        if recentSearches.count > maxRecentSearches {
            recentSearches = Array(recentSearches.prefix(maxRecentSearches))
        }

        UserDefaults.standard.set(recentSearches, forKey: "recentSearches")
    }

    func clearRecentSearches() {
        recentSearches = []
        UserDefaults.standard.removeObject(forKey: "recentSearches")
    }

    func removeRecentSearch(_ query: String) {
        recentSearches.removeAll { $0 == query }
        UserDefaults.standard.set(recentSearches, forKey: "recentSearches")
    }

    // MARK: - Mock Data

    static func mockSearch(query: String, types: [SearchResultType]?) -> [SearchResult] {
        let allResults: [SearchResult] = [
            SearchResult(
                id: "proj-1",
                type: .project,
                title: "Downtown Office Complex",
                subtitle: "Active",
                description: "123 Main Street, Downtown",
                projectId: nil,
                projectName: nil,
                matchedField: "name",
                matchedText: nil,
                createdAt: Date(),
                updatedAt: Date()
            ),
            SearchResult(
                id: "proj-2",
                type: .project,
                title: "Riverside Apartments",
                subtitle: "Active",
                description: "456 River Road",
                projectId: nil,
                projectName: nil,
                matchedField: "name",
                matchedText: nil,
                createdAt: Date(),
                updatedAt: Date()
            ),
            SearchResult(
                id: "log-1",
                type: .dailyLog,
                title: "Daily Log - Dec 26, 2024",
                subtitle: "Downtown Office Complex",
                description: "Framing completed on 3rd floor",
                projectId: "proj-1",
                projectName: "Downtown Office Complex",
                matchedField: "notes",
                matchedText: nil,
                createdAt: Date(),
                updatedAt: Date()
            ),
            SearchResult(
                id: "doc-1",
                type: .document,
                title: "Structural Drawings Set",
                subtitle: "Downtown Office Complex",
                description: "S-001 through S-050",
                projectId: "proj-1",
                projectName: "Downtown Office Complex",
                matchedField: "name",
                matchedText: nil,
                createdAt: Date(),
                updatedAt: Date()
            ),
            SearchResult(
                id: "equip-1",
                type: .equipment,
                title: "CAT 320 Excavator",
                subtitle: "In Use",
                description: "Assigned to Downtown Office Complex",
                projectId: "proj-1",
                projectName: "Downtown Office Complex",
                matchedField: "name",
                matchedText: nil,
                createdAt: Date(),
                updatedAt: Date()
            ),
            SearchResult(
                id: "sub-1",
                type: .subcontractor,
                title: "ABC Electrical",
                subtitle: "Electrical",
                description: "Licensed electrical contractor",
                projectId: nil,
                projectName: nil,
                matchedField: "name",
                matchedText: nil,
                createdAt: Date(),
                updatedAt: Date()
            )
        ]

        let lowercaseQuery = query.lowercased()
        var filtered = allResults.filter { result in
            result.title.lowercased().contains(lowercaseQuery) ||
            (result.subtitle?.lowercased().contains(lowercaseQuery) ?? false) ||
            (result.description?.lowercased().contains(lowercaseQuery) ?? false)
        }

        if let types = types {
            filtered = filtered.filter { types.contains($0.type) }
        }

        return filtered
    }
}
