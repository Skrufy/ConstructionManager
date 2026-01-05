//
//  Drawing.swift
//  ConstructionManager
//
//  Drawing/Construction Plan data models
//

import Foundation
import SwiftUI

// MARK: - Drawing Model
struct Drawing: Identifiable, Codable {
    let id: String
    let projectId: String
    let name: String
    let description: String?
    let category: DrawingCategory
    let discipline: DrawingDiscipline
    let sheetNumber: String?
    let revision: String
    let fileUrl: String
    let thumbnailUrl: String?
    let fileSize: Int64
    let pageCount: Int
    let uploadedBy: String
    let uploadedAt: Date
    let lastModified: Date

    // OCR extracted data
    var ocrData: DrawingOCRData?
    var annotations: [DrawingAnnotation]

    var fileSizeFormatted: String {
        let bcf = ByteCountFormatter()
        bcf.allowedUnits = [.useMB, .useKB]
        bcf.countStyle = .file
        return bcf.string(fromByteCount: fileSize)
    }

    var revisionBadgeColor: Color {
        if revision.starts(with: "A") || revision == "0" {
            return AppColors.success
        } else if revision.starts(with: "B") || revision == "1" {
            return AppColors.warning
        } else {
            return AppColors.info
        }
    }
}

// MARK: - Drawing Category
enum DrawingCategory: String, Codable, CaseIterable {
    case architectural = "Architectural"
    case structural = "Structural"
    case mechanical = "Mechanical"
    case electrical = "Electrical"
    case plumbing = "Plumbing"
    case civil = "Civil"
    case landscape = "Landscape"
    case interiorDesign = "Interior Design"
    case fireProtection = "Fire Protection"
    case other = "Other"

    var displayName: String {
        switch self {
        case .architectural: return "drawings.category.architectural".localized
        case .structural: return "drawings.category.structural".localized
        case .mechanical: return "drawings.category.mechanical".localized
        case .electrical: return "drawings.category.electrical".localized
        case .plumbing: return "drawings.category.plumbing".localized
        case .civil: return "drawings.category.civil".localized
        case .landscape: return "drawings.category.landscape".localized
        case .interiorDesign: return "drawings.category.interiorDesign".localized
        case .fireProtection: return "drawings.category.fireProtection".localized
        case .other: return "drawings.category.other".localized
        }
    }

    var icon: String {
        switch self {
        case .architectural: return "building.2"
        case .structural: return "square.grid.3x3"
        case .mechanical: return "gearshape.2"
        case .electrical: return "bolt"
        case .plumbing: return "drop"
        case .civil: return "map"
        case .landscape: return "leaf"
        case .interiorDesign: return "sofa"
        case .fireProtection: return "flame"
        case .other: return "doc"
        }
    }

    var color: Color {
        switch self {
        case .architectural: return AppColors.primary600
        case .structural: return AppColors.error
        case .mechanical: return AppColors.orange
        case .electrical: return AppColors.warning
        case .plumbing: return AppColors.info
        case .civil: return AppColors.success
        case .landscape: return .green
        case .interiorDesign: return .purple
        case .fireProtection: return .red
        case .other: return AppColors.gray500
        }
    }
}

// MARK: - Drawing Discipline
enum DrawingDiscipline: String, Codable, CaseIterable {
    case floorPlan = "Floor Plan"
    case elevation = "Elevation"
    case section = "Section"
    case detail = "Detail"
    case schedule = "Schedule"
    case diagram = "Diagram"
    case sitePlan = "Site Plan"
    case roofPlan = "Roof Plan"
    case reflectedCeilingPlan = "Reflected Ceiling Plan"
    case other = "Other"
}

// MARK: - OCR Extracted Data
struct DrawingOCRData: Codable {
    let extractedAt: Date
    let titleBlock: TitleBlockData?
    let extractedText: String
    let dimensions: [ExtractedDimension]
    let notes: [String]
    let materials: [String]
    let references: [String]  // Other sheet references

    struct TitleBlockData: Codable {
        let projectName: String?
        let projectNumber: String?
        let sheetTitle: String?
        let sheetNumber: String?
        let revision: String?
        let date: String?
        let scale: String?
        let drawnBy: String?
        let checkedBy: String?
    }

    struct ExtractedDimension: Codable, Identifiable {
        let id: String
        let value: String
        let unit: String
        let location: CGRect?
    }
}

// MARK: - Drawing Annotation
struct DrawingAnnotation: Identifiable, Codable {
    let id: String
    let drawingId: String
    let type: AnnotationType
    let pageNumber: Int
    let position: CGPoint
    let size: CGSize?
    let color: String
    let content: String?
    let createdBy: String
    let createdAt: Date

    // For measurements
    var startPoint: CGPoint?
    var endPoint: CGPoint?
    var measurementValue: String?

    enum AnnotationType: String, Codable {
        case pin = "Pin"
        case text = "Text"
        case line = "Line"
        case arrow = "Arrow"
        case rectangle = "Rectangle"
        case circle = "Circle"
        case freehand = "Freehand"
        case measurement = "Measurement"
        case cloudBubble = "Cloud Bubble"
        case highlight = "Highlight"
    }

    var typeIcon: String {
        switch type {
        case .pin: return "mappin"
        case .text: return "textformat"
        case .line: return "line.diagonal"
        case .arrow: return "arrow.up.right"
        case .rectangle: return "rectangle"
        case .circle: return "circle"
        case .freehand: return "scribble"
        case .measurement: return "ruler"
        case .cloudBubble: return "bubble.left"
        case .highlight: return "highlighter"
        }
    }
}

// MARK: - Drawing Set
struct DrawingSet: Identifiable, Codable {
    let id: String
    let projectId: String
    let name: String
    let description: String?
    let drawingIds: [String]
    let createdAt: Date
    let issuedDate: Date?
    let revision: String
}

// MARK: - Mock Data
extension Drawing {
    static let mockDrawings: [Drawing] = [
        Drawing(
            id: "1",
            projectId: "1",
            name: "A-101 Floor Plan - Level 1",
            description: "First floor architectural plan",
            category: .architectural,
            discipline: .floorPlan,
            sheetNumber: "A-101",
            revision: "A",
            fileUrl: "drawings/a-101.pdf",
            thumbnailUrl: nil,
            fileSize: 2_500_000,
            pageCount: 1,
            uploadedBy: "1",
            uploadedAt: Date(),
            lastModified: Date(),
            ocrData: nil,
            annotations: []
        ),
        Drawing(
            id: "2",
            projectId: "1",
            name: "A-102 Floor Plan - Level 2",
            description: "Second floor architectural plan",
            category: .architectural,
            discipline: .floorPlan,
            sheetNumber: "A-102",
            revision: "B",
            fileUrl: "drawings/a-102.pdf",
            thumbnailUrl: nil,
            fileSize: 2_800_000,
            pageCount: 1,
            uploadedBy: "1",
            uploadedAt: Date(),
            lastModified: Date(),
            ocrData: nil,
            annotations: []
        ),
        Drawing(
            id: "3",
            projectId: "1",
            name: "S-101 Foundation Plan",
            description: "Structural foundation details",
            category: .structural,
            discipline: .floorPlan,
            sheetNumber: "S-101",
            revision: "A",
            fileUrl: "drawings/s-101.pdf",
            thumbnailUrl: nil,
            fileSize: 3_200_000,
            pageCount: 2,
            uploadedBy: "1",
            uploadedAt: Date(),
            lastModified: Date(),
            ocrData: nil,
            annotations: []
        ),
        Drawing(
            id: "4",
            projectId: "1",
            name: "E-101 Electrical Plan",
            description: "First floor electrical layout",
            category: .electrical,
            discipline: .floorPlan,
            sheetNumber: "E-101",
            revision: "C",
            fileUrl: "drawings/e-101.pdf",
            thumbnailUrl: nil,
            fileSize: 1_900_000,
            pageCount: 1,
            uploadedBy: "1",
            uploadedAt: Date(),
            lastModified: Date(),
            ocrData: nil,
            annotations: []
        ),
        Drawing(
            id: "5",
            projectId: "1",
            name: "M-101 HVAC Plan",
            description: "Mechanical HVAC layout",
            category: .mechanical,
            discipline: .diagram,
            sheetNumber: "M-101",
            revision: "A",
            fileUrl: "drawings/m-101.pdf",
            thumbnailUrl: nil,
            fileSize: 2_100_000,
            pageCount: 1,
            uploadedBy: "1",
            uploadedAt: Date(),
            lastModified: Date(),
            ocrData: nil,
            annotations: []
        )
    ]
}
