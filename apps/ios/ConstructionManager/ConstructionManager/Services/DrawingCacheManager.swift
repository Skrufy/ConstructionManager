//
//  DrawingCacheManager.swift
//  ConstructionManager
//
//  Manages local caching of PDF drawings for offline access and faster loading
//

import Foundation
import PDFKit
import Combine

@MainActor
class DrawingCacheManager: ObservableObject {
    static let shared = DrawingCacheManager()

    // MARK: - Published State
    @Published var downloadProgress: [String: Double] = [:]  // drawingId -> progress (0-1)
    @Published var cachedDrawingIds: Set<String> = []
    @Published var isDownloading = false
    @Published var totalDownloadProgress: Double = 0

    // MARK: - Cache Configuration
    private let maxCacheSize: Int64 = 500 * 1024 * 1024  // 500 MB max cache
    private let cacheDirectory: URL

    // Signed URL cache (valid for ~1 hour, we cache for 50 minutes to be safe)
    private var signedURLCache: [String: (url: URL, expiresAt: Date)] = [:]
    private let signedURLCacheDuration: TimeInterval = 50 * 60  // 50 minutes

    private init() {
        // Create cache directory in Documents (persists across app launches)
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        cacheDirectory = documentsPath.appendingPathComponent("DrawingCache", isDirectory: true)

        // Create directory if needed
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)

        // Load cached drawing IDs
        loadCachedDrawingIds()
    }

    // MARK: - Public API

    /// Check if a drawing is cached locally
    func isCached(drawingId: String) -> Bool {
        return cachedDrawingIds.contains(drawingId)
    }

    /// Get local file URL for a cached drawing
    func localURL(for drawingId: String) -> URL {
        return cacheDirectory.appendingPathComponent("\(drawingId).pdf")
    }

    /// Load PDF from cache if available
    func loadFromCache(drawingId: String) -> PDFDocument? {
        guard isCached(drawingId: drawingId) else { return nil }
        let fileURL = localURL(for: drawingId)
        return PDFDocument(url: fileURL)
    }

    /// Download a single drawing and cache it
    func downloadDrawing(_ drawing: Drawing) async throws {
        let drawingId = drawing.id

        // Skip if already cached
        guard !isCached(drawingId: drawingId) else { return }

        downloadProgress[drawingId] = 0
        isDownloading = true

        defer {
            downloadProgress.removeValue(forKey: drawingId)
            isDownloading = !downloadProgress.isEmpty
        }

        // Get signed URL from API
        let signedURL = try await getSignedURL(for: drawingId)

        // Download the PDF data
        let (data, _) = try await downloadWithProgress(from: signedURL, drawingId: drawingId)

        // Verify it's a valid PDF
        guard PDFDocument(data: data) != nil else {
            throw CacheError.invalidPDF
        }

        // Save to cache
        let localURL = localURL(for: drawingId)
        try data.write(to: localURL)

        // Update cached IDs
        cachedDrawingIds.insert(drawingId)
        saveCachedDrawingIds()

        // Check cache size and cleanup if needed
        await cleanupCacheIfNeeded()
    }

    /// Prefetch adjacent drawings for faster navigation
    /// Call this when viewing a drawing to cache next/previous ones in background
    func prefetchAdjacentDrawings(currentIndex: Int, allDrawings: [Drawing], prefetchCount: Int = 2) {
        // Prefetch in background with low priority
        Task.detached(priority: .utility) { [weak self] in
            guard let self = self else { return }

            var toPrefetch: [Drawing] = []

            // Add next drawings
            for i in 1...prefetchCount {
                let nextIndex = currentIndex + i
                if nextIndex < allDrawings.count {
                    let drawing = allDrawings[nextIndex]
                    if await !self.isCached(drawingId: drawing.id) {
                        toPrefetch.append(drawing)
                    }
                }
            }

            // Add previous drawings
            for i in 1...prefetchCount {
                let prevIndex = currentIndex - i
                if prevIndex >= 0 {
                    let drawing = allDrawings[prevIndex]
                    if await !self.isCached(drawingId: drawing.id) {
                        toPrefetch.append(drawing)
                    }
                }
            }

            // Download prefetch candidates (silently, don't update UI progress)
            for drawing in toPrefetch {
                do {
                    try await self.downloadDrawing(drawing)
                    print("[Prefetch] Cached drawing: \(drawing.name)")
                } catch {
                    // Silently ignore prefetch failures
                    print("[Prefetch] Failed to cache \(drawing.name): \(error.localizedDescription)")
                }
            }
        }
    }

    /// Download all drawings for a project
    func downloadDrawingsForProject(projectId: String, drawings: [Drawing]) async {
        let uncachedDrawings = drawings.filter { !isCached(drawingId: $0.id) }

        guard !uncachedDrawings.isEmpty else { return }

        isDownloading = true
        let total = uncachedDrawings.count
        var completed = 0

        for drawing in uncachedDrawings {
            do {
                try await downloadDrawing(drawing)
                completed += 1
                totalDownloadProgress = Double(completed) / Double(total)
            } catch {
                print("Failed to cache drawing \(drawing.id): \(error)")
            }
        }

        isDownloading = false
        totalDownloadProgress = 0
    }

    /// Remove a drawing from cache
    func removeFromCache(drawingId: String) {
        let fileURL = localURL(for: drawingId)
        try? FileManager.default.removeItem(at: fileURL)
        cachedDrawingIds.remove(drawingId)
        saveCachedDrawingIds()
    }

    /// Clear entire cache
    func clearCache() {
        try? FileManager.default.removeItem(at: cacheDirectory)
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        cachedDrawingIds.removeAll()
        saveCachedDrawingIds()
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

    /// Get count of cached drawings
    var cachedCount: Int {
        return cachedDrawingIds.count
    }

    // MARK: - Private Helpers

    private func getSignedURL(for drawingId: String) async throws -> URL {
        // Check cache first
        if let cached = signedURLCache[drawingId], cached.expiresAt > Date() {
            print("[Cache] Using cached signed URL for \(drawingId)")
            return cached.url
        }

        struct SignedURLResponse: Decodable {
            let url: String
        }

        let response: SignedURLResponse = try await APIClient.shared.get("/files/\(drawingId)/url")

        guard let url = URL(string: response.url) else {
            throw CacheError.invalidURL
        }

        // Cache the signed URL
        signedURLCache[drawingId] = (url: url, expiresAt: Date().addingTimeInterval(signedURLCacheDuration))

        return url
    }

    /// Get a cached signed URL if available (for use by other components)
    func getCachedSignedURL(for drawingId: String) -> URL? {
        if let cached = signedURLCache[drawingId], cached.expiresAt > Date() {
            return cached.url
        }
        return nil
    }

    private func downloadWithProgress(from url: URL, drawingId: String) async throws -> (Data, URLResponse) {
        var request = URLRequest(url: url)
        request.timeoutInterval = 120  // 2 minutes for large PDFs

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
                downloadProgress[drawingId] = progress
            }
        }

        downloadProgress[drawingId] = 1.0
        return (data, response)
    }

    private func loadCachedDrawingIds() {
        let metadataURL = cacheDirectory.appendingPathComponent("cache_index.json")
        guard let data = try? Data(contentsOf: metadataURL),
              let ids = try? JSONDecoder().decode(Set<String>.self, from: data) else {
            return
        }

        // Verify files still exist
        cachedDrawingIds = ids.filter { id in
            FileManager.default.fileExists(atPath: localURL(for: id).path)
        }
    }

    private func saveCachedDrawingIds() {
        let metadataURL = cacheDirectory.appendingPathComponent("cache_index.json")
        if let data = try? JSONEncoder().encode(cachedDrawingIds) {
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
                if fileURL.pathExtension == "pdf",
                   let accessDate = try? fileURL.resourceValues(forKeys: [.contentAccessDateKey]).contentAccessDate {
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
                let drawingId = fileURL.deletingPathExtension().lastPathComponent
                try? fileManager.removeItem(at: fileURL)
                cachedDrawingIds.remove(drawingId)
                freedSize += Int64(fileSize)
            }
        }

        saveCachedDrawingIds()
    }

    // MARK: - Errors

    enum CacheError: LocalizedError {
        case invalidURL
        case invalidPDF
        case downloadFailed
        case httpError(Int)
        case fileNotFound

        var errorDescription: String? {
            switch self {
            case .invalidURL: return "Invalid download URL"
            case .invalidPDF: return "Downloaded file is not a valid PDF"
            case .downloadFailed: return "Failed to download drawing"
            case .httpError(let code):
                if code == 400 || code == 404 {
                    return "PDF file not found in storage (HTTP \(code))"
                }
                return "Download failed with HTTP \(code)"
            case .fileNotFound: return "PDF file not found in storage"
            }
        }
    }
}
