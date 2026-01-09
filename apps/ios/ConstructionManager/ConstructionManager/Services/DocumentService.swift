//
//  DocumentService.swift
//  ConstructionManager
//
//  Service for document-related API calls
//

import Foundation
import Combine
import UIKit

@MainActor
class DocumentService: ObservableObject {
    static let shared = DocumentService()

    @Published var documents: [Document] = []
    @Published var blasters: [User] = []
    @Published var isLoading = false
    @Published var isLoadingBlasters = false
    @Published var isUploading = false
    @Published var uploadProgress: Double = 0
    @Published var error: String?

    private let apiClient = APIClient.shared

    // Request deduplication
    private var fetchTask: Task<Void, Never>?
    private var lastFetchTime: Date?
    private let minFetchInterval: TimeInterval = 2.0

    private init() {}

    // MARK: - Fetch Documents

    func fetchDocuments(projectId: String? = nil, category: String? = nil, search: String? = nil, blasterIds: [String]? = nil, force: Bool = false) async {
        // Skip if we just fetched recently (unless forced or filters changed)
        let hasFilters = projectId != nil || category != nil || (search != nil && !search!.isEmpty) || (blasterIds != nil && !blasterIds!.isEmpty)
        if !force && !hasFilters, let lastFetch = lastFetchTime, Date().timeIntervalSince(lastFetch) < minFetchInterval {
            print("[DocumentService] Skipping fetch - too soon since last fetch")
            return
        }

        // If there's already a fetch in progress with no filters, wait for it
        if let existingTask = fetchTask, !hasFilters {
            print("[DocumentService] Reusing existing fetch task")
            await existingTask.value
            return
        }

        // Create a new fetch task
        let task = Task {
            await performFetch(projectId: projectId, category: category, search: search, blasterIds: blasterIds)
        }

        if !hasFilters {
            fetchTask = task
        }

        await task.value

        if !hasFilters {
            fetchTask = nil
        }
    }

    private func performFetch(projectId: String?, category: String?, search: String?, blasterIds: [String]?) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var queryItems: [URLQueryItem] = []
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }
            if let category = category {
                queryItems.append(URLQueryItem(name: "category", value: category))
            }
            if let search = search, !search.isEmpty {
                queryItems.append(URLQueryItem(name: "search", value: search))
            }
            if let blasterIds = blasterIds, !blasterIds.isEmpty {
                queryItems.append(URLQueryItem(name: "blasterIds", value: blasterIds.joined(separator: ",")))
            }

            let response: DocumentsAPIResponse = try await apiClient.get(
                "/documents",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.documents = response.documents.map { $0.toDocument() }
            self.lastFetchTime = Date()
        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch documents: \(error)")
        }
    }

    // MARK: - Fetch Blasters

    func fetchBlasters() async {
        isLoadingBlasters = true
        defer { isLoadingBlasters = false }

        do {
            let blasters: [User] = try await apiClient.get("/users/blasters")
            self.blasters = blasters
        } catch {
            print("Failed to fetch blasters: \(error)")
        }
    }

    // MARK: - Refresh

    func refresh() async {
        await fetchDocuments()
    }

    // MARK: - Upload Document

    /// Upload a document to the server
    /// Note: This creates the document record after the file has been uploaded to storage
    func uploadDocument(
        projectId: String?,
        name: String,
        fileData: Data,
        fileType: String,
        category: DocumentCategory,
        description: String? = nil,
        tags: [String]? = nil,
        blasterIds: [String]? = nil
    ) async throws -> Document {
        isUploading = true
        uploadProgress = 0
        defer {
            isUploading = false
            uploadProgress = 0
        }

        // First, upload the file to Supabase storage
        // The storage path will be returned from the upload
        // For company-wide documents (nil projectId), use "company-wide" folder
        let storagePath = try await uploadFileToStorage(
            data: fileData,
            fileName: name,
            projectId: projectId ?? "company-wide"
        )

        uploadProgress = 0.7

        // Then create the document record
        let request = CreateDocumentRequest(
            projectId: projectId,
            name: name,
            type: fileType,
            storagePath: storagePath,
            category: category.rawValue.uppercased(),
            description: description,
            tags: tags,
            blasterIds: blasterIds
        )

        let response: DocumentCreateResponse = try await apiClient.post("/documents", body: request)
        let newDocument = response.document.toDocument()

        uploadProgress = 1.0

        // Add to local list
        documents.insert(newDocument, at: 0)

        return newDocument
    }

    /// Upload image as document
    func uploadImage(
        projectId: String?,
        image: UIImage,
        name: String,
        category: DocumentCategory = .photo,
        description: String? = nil,
        blasterIds: [String]? = nil
    ) async throws -> Document {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw DocumentUploadError.invalidImageData
        }

        return try await uploadDocument(
            projectId: projectId,
            name: name.hasSuffix(".jpg") ? name : "\(name).jpg",
            fileData: imageData,
            fileType: "image",
            category: category,
            description: description,
            blasterIds: blasterIds
        )
    }

    /// Upload file to Supabase storage
    private func uploadFileToStorage(data: Data, fileName: String, projectId: String) async throws -> String {
        // Generate a unique path
        let timestamp = Int(Date().timeIntervalSince1970)
        let sanitizedName = fileName.replacingOccurrences(of: " ", with: "_")
        let storagePath = "projects/\(projectId)/documents/\(timestamp)_\(sanitizedName)"

        // Upload to Supabase storage via API
        let request = UploadFileRequest(
            path: storagePath,
            data: data.base64EncodedString()
        )

        let response: UploadFileResponse = try await apiClient.post("/storage/upload", body: request)

        uploadProgress = 0.5

        return response.path
    }

    // MARK: - Update Document

    func updateDocument(
        id: String,
        name: String? = nil,
        description: String? = nil,
        category: DocumentCategory? = nil,
        tags: [String]? = nil
    ) async throws -> Document {
        let request = UpdateDocumentRequest(
            name: name,
            description: description,
            category: category?.rawValue.uppercased(),
            tags: tags
        )

        let response: DocumentCreateResponse = try await apiClient.patch("/documents/\(id)", body: request)
        let updatedDocument = response.document.toDocument()

        // Update local list
        if let index = documents.firstIndex(where: { $0.id == id }) {
            documents[index] = updatedDocument
        }

        return updatedDocument
    }

    // MARK: - Delete Document

    func deleteDocument(id: String) async throws {
        try await apiClient.delete("/documents/\(id)")

        // Remove from local list
        documents.removeAll { $0.id == id }
    }

    // MARK: - Download Document

    /// Fetches a signed URL for downloading a document from Supabase storage
    func getDownloadUrl(for document: Document) async throws -> URL {
        struct SignedURLResponse: Decodable {
            let url: String
        }

        // Fetch signed URL from the API using the document's ID
        let response: SignedURLResponse = try await apiClient.get("/files/\(document.id)/url?download=true")

        guard let signedURL = URL(string: response.url) else {
            throw DocumentDownloadError.invalidSignedURL
        }

        return signedURL
    }

    /// Fetches a signed URL for viewing a document (without download disposition)
    func getViewUrl(for document: Document) async throws -> URL {
        struct SignedURLResponse: Decodable {
            let url: String
        }

        // Fetch signed URL from the API using the document's ID
        let response: SignedURLResponse = try await apiClient.get("/files/\(document.id)/url")

        guard let signedURL = URL(string: response.url) else {
            throw DocumentDownloadError.invalidSignedURL
        }

        return signedURL
    }
}

// MARK: - Download Error

enum DocumentDownloadError: LocalizedError {
    case invalidSignedURL

    var errorDescription: String? {
        switch self {
        case .invalidSignedURL:
            return "Failed to get a valid download URL"
        }
    }
}

// MARK: - Upload Error

enum DocumentUploadError: LocalizedError {
    case invalidImageData
    case uploadFailed(String)
    case storageFailed

    var errorDescription: String? {
        switch self {
        case .invalidImageData:
            return "Failed to process image data"
        case .uploadFailed(let message):
            return "Upload failed: \(message)"
        case .storageFailed:
            return "Failed to upload file to storage"
        }
    }
}

// MARK: - Request Models

struct CreateDocumentRequest: Encodable {
    let projectId: String?
    let name: String
    let type: String
    let storagePath: String
    let category: String?
    let description: String?
    let tags: [String]?
    let blasterIds: [String]?
}

struct UpdateDocumentRequest: Encodable {
    let name: String?
    let description: String?
    let category: String?
    let tags: [String]?
}

struct UploadFileRequest: Encodable {
    let path: String
    let data: String // Base64 encoded
}

struct UploadFileResponse: Decodable {
    let path: String
    let url: String?
}

struct DocumentCreateResponse: Decodable {
    let document: DocumentAPIModel
}

// MARK: - API Response Models

struct DocumentsAPIResponse: Decodable {
    let documents: [DocumentAPIModel]  // API returns "documents", not "files"
    let pagination: PaginationInfo?
    let categories: [String: Int]?  // API returns "categories", not "categoryCounts"
}

struct PaginationInfo: Decodable {
    let total: Int
    let page: Int
    let limit: Int
    let pages: Int  // API returns "pages", not "totalPages"
}

struct DocumentAPIModel: Decodable {
    let id: String
    let projectId: String?
    let name: String
    let fileType: String?
    let storagePath: String?
    let category: String?
    let description: String?
    let tags: [String]?
    let fileSize: Int?
    let createdAt: Date?
    let uploadedAt: Date?
    let uploadedBy: String?
    let project: ProjectRef?
    let uploader: UserRef?
    let blasterAssignments: [BlasterAssignmentRef]?

    enum CodingKeys: String, CodingKey {
        case id, name, category, description, tags, project, uploader
        case projectId = "project_id"
        case fileType = "file_type"
        case storagePath = "storage_path"
        case fileSize = "file_size"
        case createdAt = "created_at"
        case uploadedAt = "uploaded_at"
        case uploadedBy = "uploaded_by"
        case blasterAssignments = "blaster_assignments"
    }

    struct ProjectRef: Decodable {
        let id: String
        let name: String
    }

    struct UserRef: Decodable {
        let id: String
        let name: String
        let email: String?
    }

    struct BlasterAssignmentRef: Decodable {
        let id: String
        let blaster: BlasterRef
    }

    struct BlasterRef: Decodable {
        let id: String
        let name: String
    }

    func toDocument() -> Document {
        let mappedCategory: DocumentCategory
        switch (category ?? "").uppercased() {
        case "LICENSE", "LICENSES": mappedCategory = .license
        case "CERTIFICATION", "CERTIFICATIONS", "CERT": mappedCategory = .certification
        case "INSURANCE": mappedCategory = .insurance
        case "CONTRACT", "CONTRACTS": mappedCategory = .contract
        case "PERMIT", "PERMITS": mappedCategory = .permit
        case "REPORT", "REPORTS": mappedCategory = .report
        case "PHOTO", "PHOTOS": mappedCategory = .photo
        case "BLASTING": mappedCategory = .blasting
        case "DRAWINGS": mappedCategory = .other // Drawings handled separately
        default: mappedCategory = .other
        }

        // Convert blaster assignments to local model
        let localBlasterAssignments = blasterAssignments?.map { assignment in
            BlasterAssignment(
                id: assignment.id,
                blaster: BlasterInfo(
                    id: assignment.blaster.id,
                    name: assignment.blaster.name
                )
            )
        }

        return Document(
            id: id,
            projectId: projectId,
            userId: uploadedBy,
            name: name,
            description: description,
            category: mappedCategory,
            fileUrl: storagePath ?? "",
            thumbnailUrl: nil,
            fileType: fileType ?? "document",
            fileSize: Int64(fileSize ?? 0),
            uploadedBy: uploader?.name ?? "Unknown",
            uploadedAt: uploadedAt ?? createdAt ?? Date(),
            expiresAt: nil,
            tags: tags ?? [],
            blasterAssignments: localBlasterAssignments,
            storagePath: storagePath ?? "",
            createdAt: createdAt ?? Date(),
            updatedAt: createdAt ?? Date()
        )
    }
}
