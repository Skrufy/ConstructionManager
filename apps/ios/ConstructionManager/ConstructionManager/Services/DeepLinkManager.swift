//
//  DeepLinkManager.swift
//  ConstructionManager
//
//  Handles deep linking for sharing documents, drawings, projects, etc.
//

import Foundation
import SwiftUI
import Combine

// MARK: - Deep Link Types
enum DeepLink: Equatable {
    case document(id: String)
    case drawing(id: String)
    case project(id: String)
    case dailyLog(id: String)

    /// Parse a URL into a DeepLink
    static func parse(from url: URL) -> DeepLink? {
        // Handle custom URL scheme: duggin://document/123
        // or Universal Link: https://app.duggin.construction/document/123

        let pathComponents = url.pathComponents.filter { $0 != "/" }

        guard pathComponents.count >= 2 else { return nil }

        let type = pathComponents[0]
        let id = pathComponents[1]

        switch type {
        case "document", "documents":
            return .document(id: id)
        case "drawing", "drawings":
            return .drawing(id: id)
        case "project", "projects":
            return .project(id: id)
        case "dailylog", "daily-log", "dailylogs":
            return .dailyLog(id: id)
        default:
            return nil
        }
    }
}

// MARK: - Deep Link Manager
@MainActor
class DeepLinkManager: ObservableObject {
    static let shared = DeepLinkManager()

    /// The URL scheme for the app (configure in Info.plist)
    static let urlScheme = "duggin"

    /// Base URL for universal links (optional, for web sharing)
    static let universalLinkBase = "https://app.duggin.construction"

    /// Pending deep link to handle after authentication
    @Published var pendingDeepLink: DeepLink?

    /// Currently active deep link being processed
    @Published var activeDocumentId: String?
    @Published var activeDrawingId: String?
    @Published var activeProjectId: String?
    @Published var activeDailyLogId: String?

    private init() {}

    /// Handle an incoming URL
    func handleURL(_ url: URL) {
        print("[DeepLink] Received URL: \(url)")

        guard let deepLink = DeepLink.parse(from: url) else {
            print("[DeepLink] Could not parse URL")
            return
        }

        pendingDeepLink = deepLink
        processDeepLink(deepLink)
    }

    /// Process a deep link - navigates to the appropriate content
    func processDeepLink(_ deepLink: DeepLink) {
        // Clear previous active links
        clearActiveLinks()

        switch deepLink {
        case .document(let id):
            print("[DeepLink] Opening document: \(id)")
            activeDocumentId = id

        case .drawing(let id):
            print("[DeepLink] Opening drawing: \(id)")
            activeDrawingId = id

        case .project(let id):
            print("[DeepLink] Opening project: \(id)")
            activeProjectId = id

        case .dailyLog(let id):
            print("[DeepLink] Opening daily log: \(id)")
            activeDailyLogId = id
        }
    }

    /// Clear all active deep links
    func clearActiveLinks() {
        activeDocumentId = nil
        activeDrawingId = nil
        activeProjectId = nil
        activeDailyLogId = nil
    }

    /// Clear the pending deep link after it's been handled
    func clearPendingDeepLink() {
        pendingDeepLink = nil
    }

    // MARK: - Share URL Generation

    /// Generate a shareable URL for a document
    static func shareURL(for document: Document) -> URL {
        // Use custom URL scheme for now (works without web setup)
        // Later can switch to universal links for web fallback
        URL(string: "\(urlScheme)://document/\(document.id)")!
    }

    /// Generate a shareable URL for a drawing
    static func shareURL(for drawing: Drawing) -> URL {
        URL(string: "\(urlScheme)://drawing/\(drawing.id)")!
    }

    /// Generate a shareable URL for a project
    static func shareURL(for project: Project) -> URL {
        URL(string: "\(urlScheme)://project/\(project.id)")!
    }

    /// Generate a shareable URL for a daily log
    static func shareURL(for dailyLog: DailyLog) -> URL {
        URL(string: "\(urlScheme)://dailylog/\(dailyLog.id)")!
    }
}
