//
//  DocumentCacheManager.swift
//  ConstructionManager
//
//  Manages local caching of documents for offline access and faster loading
//

import Foundation
import Combine

@MainActor
class DocumentCacheManager: ObservableObject {
    static let shared = DocumentCacheManager()

    // MARK: - Published State
    @Published var downloadProgress: [String: Double] = [:]  // documentId -> progress (0-1)
    @Published var cachedDocumentIds: Set<String> = []
    @Published var isDownloading = false

    // MARK: - Cache Configuration
    private let maxCacheSize: Int64 = 300 * 1024 * 1024  // 300 MB max cache for documents
    private let cacheDirectory: URL

    // Signed URL cache (valid for ~1 hour, we cache for 50 minutes to be safe)
    private var signedURLCache: [String: (url: URL, expiresAt: Date)] = [:]
    private let signedURLCacheDuration: TimeInterval = 50 * 60  // 50 minutes

    private init() {
        // Create cache directory in Documents (persists across app launches)
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        cacheDirectory = documentsPath.appendingPathComponent("DocumentCache", isDirectory: true)

        // Create directory if needed
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)

        // Load cached document IDs
        loadCachedDocumentIds()
    }

    // MARK: - Public API

    /// Check if a document is cached locally
    func isCached(documentId: String) -> Bool {
        return cachedDocumentIds.contains(documentId)
    }

    /// Get local file URL for a cached document
    func localURL(for documentId: String, fileName: String) -> URL {
        let ext = FileTypeDetector.getExtension(from: fileName)
        return cacheDirectory.appendingPathComponent("\(documentId).\(ext)")
    }

    /// Get local file URL for a cached document (looks up extension from index)
    func localURL(for documentId: String) -> URL? {
        // Look for any file with this document ID prefix
        let fileManager = FileManager.default
        guard let files = try? fileManager.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: nil) else {
            return nil
        }

        return files.first { $0.deletingPathExtension().lastPathComponent == documentId }
    }

    /// Load data from cache if available
    func loadFromCache(documentId: String) -> Data? {
        guard isCached(documentId: documentId),
              let fileURL = localURL(for: documentId) else { return nil }
        return try? Data(contentsOf: fileURL)
    }

    /// Get a signed URL for viewing a document (with caching)
    func getSignedURL(for documentId: String) async throws -> URL {
        // Check cache first
        if let cached = signedURLCache[documentId], cached.expiresAt > Date() {
            print("[DocumentCache] Using cached signed URL for \(documentId)")
            return cached.url
        }

        struct SignedURLResponse: Decodable {
            let url: String
        }

        let response: SignedURLResponse = try await APIClient.shared.get("/files/\(documentId)/url")

        guard let url = URL(string: response.url) else {
            throw CacheError.invalidURL
        }

        // Cache the signed URL
        signedURLCache[documentId] = (url: url, expiresAt: Date().addingTimeInterval(signedURLCacheDuration))

        return url
    }

    /// Download a document and cache it
    func downloadDocument(id: String, fileName: String) async throws -> URL {
        // Return cached file if available
        if isCached(documentId: id), let cachedURL = localURL(for: id) {
            return cachedURL
        }

        downloadProgress[id] = 0
        isDownloading = true

        defer {
            downloadProgress.removeValue(forKey: id)
            isDownloading = !downloadProgress.isEmpty
        }

        // Get signed URL from API
        let signedURL = try await getSignedURL(for: id)

        // Download the file data
        let (data, _) = try await downloadWithProgress(from: signedURL, documentId: id)

        // Save to cache
        let localURL = localURL(for: id, fileName: fileName)
        try data.write(to: localURL)

        // Update cached IDs
        cachedDocumentIds.insert(id)
        saveCachedDocumentIds()

        // Check cache size and cleanup if needed
        await cleanupCacheIfNeeded()

        return localURL
    }

    /// Remove a document from cache
    func removeFromCache(documentId: String) {
        if let fileURL = localURL(for: documentId) {
            try? FileManager.default.removeItem(at: fileURL)
        }
        cachedDocumentIds.remove(documentId)
        saveCachedDocumentIds()
    }

    /// Clear entire cache
    func clearCache() {
        try? FileManager.default.removeItem(at: cacheDirectory)
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        cachedDocumentIds.removeAll()
        signedURLCache.removeAll()
        saveCachedDocumentIds()
    }

    /// Get cache size in bytes
    func getCacheSize() -> Int64 {
        var size: Int64 = 0
        let fileManager = FileManager.default

        if let enumerator = fileManager.enumerator(at: cacheDirectory, includingPropertiesForKeys: [.fileSizeKey]) {
            while let fileURL = enumerator.nextObject() as? URL {
                if let fileSize = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                    size += Int64(fileSize)
                }
            }
        }
        return size
    }

    /// Get formatted cache size string
    var cacheSizeFormatted: String {
        let size = getCacheSize()
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: size)
    }

    /// Get count of cached documents
    var cachedCount: Int {
        return cachedDocumentIds.count
    }

    // MARK: - Private Helpers

    private func downloadWithProgress(from url: URL, documentId: String) async throws -> (Data, URLResponse) {
        var request = URLRequest(url: url)
        request.timeoutInterval = 120  // 2 minutes for large files

        let (asyncBytes, response) = try await URLSession.shared.bytes(for: request)

        // Check HTTP status code
        if let httpResponse = response as? HTTPURLResponse {
            guard httpResponse.statusCode == 200 else {
                throw CacheError.httpError(httpResponse.statusCode)
            }
        }

        let expectedLength = response.expectedContentLength
        var data = Data()
        data.reserveCapacity(expectedLength > 0 ? Int(expectedLength) : 1024 * 1024)

        var downloadedBytes: Int64 = 0

        for try await byte in asyncBytes {
            data.append(byte)
            downloadedBytes += 1

            // Update progress every 100KB
            if downloadedBytes % (100 * 1024) == 0 && expectedLength > 0 {
                let progress = Double(downloadedBytes) / Double(expectedLength)
                downloadProgress[documentId] = progress
            }
        }

        downloadProgress[documentId] = 1.0
        return (data, response)
    }

    private func loadCachedDocumentIds() {
        let metadataURL = cacheDirectory.appendingPathComponent("cache_index.json")
        guard let data = try? Data(contentsOf: metadataURL),
              let ids = try? JSONDecoder().decode(Set<String>.self, from: data) else {
            return
        }

        // Verify files still exist
        cachedDocumentIds = ids.filter { id in
            localURL(for: id) != nil
        }
    }

    private func saveCachedDocumentIds() {
        let metadataURL = cacheDirectory.appendingPathComponent("cache_index.json")
        if let data = try? JSONEncoder().encode(cachedDocumentIds) {
            try? data.write(to: metadataURL)
        }
    }

    private func cleanupCacheIfNeeded() async {
        let currentSize = getCacheSize()
        guard currentSize > maxCacheSize else { return }

        // Get files sorted by access date (oldest first)
        let fileManager = FileManager.default
        var files: [(URL, Date)] = []

        if let enumerator = fileManager.enumerator(at: cacheDirectory, includingPropertiesForKeys: [.contentAccessDateKey]) {
            while let fileURL = enumerator.nextObject() as? URL {
                // Skip the index file
                if fileURL.lastPathComponent == "cache_index.json" { continue }

                if let accessDate = try? fileURL.resourceValues(forKeys: [.contentAccessDateKey]).contentAccessDate {
                    files.append((fileURL, accessDate))
                }
            }
        }

        // Sort by oldest access date
        files.sort { $0.1 < $1.1 }

        // Remove oldest files until under limit
        var freedSize: Int64 = 0
        let targetFree = currentSize - (maxCacheSize * 3 / 4)  // Free down to 75% of max

        for (fileURL, _) in files {
            guard freedSize < targetFree else { break }

            if let fileSize = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                let documentId = fileURL.deletingPathExtension().lastPathComponent
                try? fileManager.removeItem(at: fileURL)
                cachedDocumentIds.remove(documentId)
                freedSize += Int64(fileSize)
            }
        }

        saveCachedDocumentIds()
    }

    // MARK: - Errors

    enum CacheError: LocalizedError {
        case invalidURL
        case downloadFailed
        case httpError(Int)
        case fileNotFound

        var errorDescription: String? {
            switch self {
            case .invalidURL: return "Invalid download URL"
            case .downloadFailed: return "Failed to download document"
            case .httpError(let code):
                if code == 400 || code == 404 {
                    return "Document not found in storage (HTTP \(code))"
                }
                return "Download failed with HTTP \(code)"
            case .fileNotFound: return "Document not found in storage"
            }
        }
    }
}
