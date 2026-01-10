//
//  FileTypeDetector.swift
//  ConstructionManager
//
//  Detects file types from file extensions for document viewing
//

import Foundation
import SwiftUI

/// Represents the type of file for viewing purposes
enum ViewableFileType {
    case pdf
    case image
    case video
    case unsupported

    /// System icon name for the file type
    var iconName: String {
        switch self {
        case .pdf: return "doc.fill"
        case .image: return "photo.fill"
        case .video: return "play.rectangle.fill"
        case .unsupported: return "doc.questionmark.fill"
        }
    }

    /// Icon color for the file type
    var iconColor: Color {
        switch self {
        case .pdf: return .red
        case .image: return .blue
        case .video: return .purple
        case .unsupported: return .gray
        }
    }

    /// Human readable label
    var label: String {
        switch self {
        case .pdf: return "PDF Document"
        case .image: return "Image"
        case .video: return "Video"
        case .unsupported: return "Document"
        }
    }
}

/// Utility for detecting file types from file names/extensions
struct FileTypeDetector {

    // Supported image extensions
    private static let imageExtensions: Set<String> = [
        "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "svg", "heic", "heif"
    ]

    // Supported video extensions
    private static let videoExtensions: Set<String> = [
        "mp4", "mov", "avi", "m4v"
    ]

    /// Detect file type from a file name or path
    /// - Parameter fileName: The file name or full path
    /// - Returns: The detected file type
    static func detect(from fileName: String) -> ViewableFileType {
        let ext = getExtension(from: fileName).lowercased()

        if ext == "pdf" {
            return .pdf
        } else if imageExtensions.contains(ext) {
            return .image
        } else if videoExtensions.contains(ext) {
            return .video
        } else {
            return .unsupported
        }
    }

    /// Extract file extension from a file name or path
    /// - Parameter fileName: The file name or full path
    /// - Returns: The file extension (without dot), or empty string if none
    static func getExtension(from fileName: String) -> String {
        let url = URL(fileURLWithPath: fileName)
        return url.pathExtension
    }

    /// Get MIME type for a file
    /// - Parameter fileName: The file name or full path
    /// - Returns: The MIME type string
    static func getMimeType(from fileName: String) -> String {
        let ext = getExtension(from: fileName).lowercased()

        switch ext {
        case "pdf": return "application/pdf"
        case "jpg", "jpeg": return "image/jpeg"
        case "png": return "image/png"
        case "gif": return "image/gif"
        case "webp": return "image/webp"
        case "bmp": return "image/bmp"
        case "tiff", "tif": return "image/tiff"
        case "svg": return "image/svg+xml"
        case "heic", "heif": return "image/heic"
        case "mp4", "m4v": return "video/mp4"
        case "mov": return "video/quicktime"
        case "avi": return "video/x-msvideo"
        case "doc": return "application/msword"
        case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        case "xls": return "application/vnd.ms-excel"
        case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        case "ppt": return "application/vnd.ms-powerpoint"
        case "pptx": return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        case "txt": return "text/plain"
        case "csv": return "text/csv"
        case "zip": return "application/zip"
        default: return "application/octet-stream"
        }
    }

    /// Check if a file can be viewed in-app
    /// - Parameter fileName: The file name or full path
    /// - Returns: True if the file can be viewed in-app
    static func canViewInApp(_ fileName: String) -> Bool {
        let fileType = detect(from: fileName)
        return fileType != .unsupported
    }
}
