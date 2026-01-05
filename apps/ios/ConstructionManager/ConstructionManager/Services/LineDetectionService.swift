//
//  LineDetectionService.swift
//  ConstructionManager
//
//  Detects straight lines in PDF drawings using Vision framework
//

import Foundation
import Vision
import PDFKit
import UIKit
import Combine

struct DetectedLine: Identifiable, Equatable {
    let id = UUID()
    let startPoint: CGPoint  // In screen coordinates
    let endPoint: CGPoint    // In screen coordinates
    let pdfStartPoint: CGPoint  // In PDF page coordinates
    let pdfEndPoint: CGPoint    // In PDF page coordinates
    let pageIndex: Int

    static func == (lhs: DetectedLine, rhs: DetectedLine) -> Bool {
        lhs.id == rhs.id
    }

    var length: CGFloat {
        sqrt(pow(endPoint.x - startPoint.x, 2) + pow(endPoint.y - startPoint.y, 2))
    }

    var pdfLength: CGFloat {
        sqrt(pow(pdfEndPoint.x - pdfStartPoint.x, 2) + pow(pdfEndPoint.y - pdfStartPoint.y, 2))
    }

    /// Calculate real-world length if scale is provided (points per foot)
    func realWorldLength(scale: Double) -> Double {
        return Double(pdfLength) / scale
    }

    /// Distance from a point to this line segment
    func distanceFrom(point: CGPoint) -> CGFloat {
        let lineVec = CGPoint(x: endPoint.x - startPoint.x, y: endPoint.y - startPoint.y)
        let pointVec = CGPoint(x: point.x - startPoint.x, y: point.y - startPoint.y)

        let lineLen = sqrt(lineVec.x * lineVec.x + lineVec.y * lineVec.y)
        guard lineLen > 0 else { return sqrt(pointVec.x * pointVec.x + pointVec.y * pointVec.y) }

        let lineUnitVec = CGPoint(x: lineVec.x / lineLen, y: lineVec.y / lineLen)
        let projLength = pointVec.x * lineUnitVec.x + pointVec.y * lineUnitVec.y

        if projLength < 0 {
            return sqrt(pointVec.x * pointVec.x + pointVec.y * pointVec.y)
        } else if projLength > lineLen {
            let toEnd = CGPoint(x: point.x - endPoint.x, y: point.y - endPoint.y)
            return sqrt(toEnd.x * toEnd.x + toEnd.y * toEnd.y)
        } else {
            let projPoint = CGPoint(
                x: startPoint.x + lineUnitVec.x * projLength,
                y: startPoint.y + lineUnitVec.y * projLength
            )
            let perpVec = CGPoint(x: point.x - projPoint.x, y: point.y - projPoint.y)
            return sqrt(perpVec.x * perpVec.x + perpVec.y * perpVec.y)
        }
    }

    /// Check if a point is near one of the endpoints
    func nearEndpoint(_ point: CGPoint, threshold: CGFloat = 30) -> CGPoint? {
        let distToStart = sqrt(pow(point.x - startPoint.x, 2) + pow(point.y - startPoint.y, 2))
        let distToEnd = sqrt(pow(point.x - endPoint.x, 2) + pow(point.y - endPoint.y, 2))

        if distToStart < threshold && distToStart < distToEnd {
            return startPoint
        } else if distToEnd < threshold {
            return endPoint
        }
        return nil
    }

    /// Get the endpoint closest to a point
    func closestEndpoint(to point: CGPoint) -> CGPoint {
        let distToStart = sqrt(pow(point.x - startPoint.x, 2) + pow(point.y - startPoint.y, 2))
        let distToEnd = sqrt(pow(point.x - endPoint.x, 2) + pow(point.y - endPoint.y, 2))
        return distToStart < distToEnd ? startPoint : endPoint
    }

    /// Get the endpoint farthest from a point
    func farthestEndpoint(from point: CGPoint) -> CGPoint {
        let distToStart = sqrt(pow(point.x - startPoint.x, 2) + pow(point.y - startPoint.y, 2))
        let distToEnd = sqrt(pow(point.x - endPoint.x, 2) + pow(point.y - endPoint.y, 2))
        return distToStart >= distToEnd ? startPoint : endPoint
    }
}

/// Represents an intersection point where two or more lines meet
struct DetectedIntersection: Identifiable {
    let id = UUID()
    let point: CGPoint           // Screen coordinates
    let pdfPoint: CGPoint        // PDF coordinates
    let pageIndex: Int
    let lines: [DetectedLine]    // Lines that meet at this intersection

    /// Distance from this intersection to a point
    func distanceFrom(_ otherPoint: CGPoint) -> CGFloat {
        sqrt(pow(point.x - otherPoint.x, 2) + pow(point.y - otherPoint.y, 2))
    }
}

@MainActor
class LineDetectionService: ObservableObject {
    static let shared = LineDetectionService()

    @Published var detectedLines: [DetectedLine] = []
    @Published var detectedIntersections: [DetectedIntersection] = []
    @Published var highlightedLine: DetectedLine?
    @Published var highlightedIntersection: DetectedIntersection?
    @Published var isDetecting = false

    private init() {}

    /// Detect lines and intersections near a point in the PDF
    func detectLinesNear(
        point: CGPoint,
        in pdfView: PDFView,
        searchRadius: CGFloat = 250  // Increased for better line coverage
    ) async -> [DetectedLine] {
        guard let page = pdfView.page(for: point, nearest: true),
              let document = pdfView.document else {
            return []
        }

        isDetecting = true
        defer { isDetecting = false }

        let pageIndex = document.index(for: page)

        // Convert screen point to PDF coordinates
        let pdfPoint = pdfView.convert(point, to: page)

        // Define search region in PDF coordinates
        let searchRect = CGRect(
            x: pdfPoint.x - searchRadius,
            y: pdfPoint.y - searchRadius,
            width: searchRadius * 2,
            height: searchRadius * 2
        )

        // Render the region to an image for Vision processing
        guard let image = renderPDFRegion(page: page, rect: searchRect, scale: 2.0) else {
            return []
        }

        // Detect lines using Vision
        let lines = await detectLinesInImage(image, searchRect: searchRect, page: page, pdfView: pdfView, pageIndex: pageIndex)

        // Sort by distance to tap point
        let sortedLines = lines.sorted { $0.distanceFrom(point: point) < $1.distanceFrom(point: point) }

        // Find intersections between detected lines
        let intersections = findIntersections(in: sortedLines, nearPoint: point, pdfView: pdfView, page: page, pageIndex: pageIndex)

        await MainActor.run {
            self.detectedLines = sortedLines
            self.detectedIntersections = intersections

            // Check for intersection first (corners are more precise snap points)
            if let nearestIntersection = intersections.first, nearestIntersection.distanceFrom(point) < 40 {
                self.highlightedIntersection = nearestIntersection
                self.highlightedLine = nil
            }
            // Otherwise highlight the nearest line
            else if let nearest = sortedLines.first, nearest.distanceFrom(point: point) < 50 {
                self.highlightedLine = nearest
                self.highlightedIntersection = nil
            }
        }

        return sortedLines
    }

    /// Find intersections/corners between lines near a point
    /// Detects corners where 1-4 lines meet at endpoints
    private func findIntersections(
        in lines: [DetectedLine],
        nearPoint point: CGPoint,
        pdfView: PDFView,
        page: PDFPage,
        pageIndex: Int
    ) -> [DetectedIntersection] {
        var intersections: [DetectedIntersection] = []
        let proximityThreshold: CGFloat = 30  // How close endpoints need to be to count as same corner
        let tapProximity: CGFloat = 50  // How close to tap point to consider

        // Collect all endpoints from all lines
        struct EndpointInfo {
            let screenPoint: CGPoint
            let pdfPoint: CGPoint
            let line: DetectedLine
        }

        var allEndpoints: [EndpointInfo] = []
        for line in lines {
            allEndpoints.append(EndpointInfo(screenPoint: line.startPoint, pdfPoint: line.pdfStartPoint, line: line))
            allEndpoints.append(EndpointInfo(screenPoint: line.endPoint, pdfPoint: line.pdfEndPoint, line: line))
        }

        // Group endpoints that are close together (form a corner)
        var processedIndices = Set<Int>()

        for i in 0..<allEndpoints.count {
            if processedIndices.contains(i) { continue }

            let ep = allEndpoints[i]

            // Check if this endpoint is near the tap point
            let distToTap = sqrt(pow(ep.screenPoint.x - point.x, 2) + pow(ep.screenPoint.y - point.y, 2))
            if distToTap > tapProximity { continue }

            // Find all other endpoints close to this one
            var cornerLines: [DetectedLine] = [ep.line]
            var cornerPoints: [CGPoint] = [ep.screenPoint]
            var cornerPdfPoints: [CGPoint] = [ep.pdfPoint]
            processedIndices.insert(i)

            for j in (i+1)..<allEndpoints.count {
                if processedIndices.contains(j) { continue }

                let otherEp = allEndpoints[j]
                let distance = sqrt(pow(ep.screenPoint.x - otherEp.screenPoint.x, 2) + pow(ep.screenPoint.y - otherEp.screenPoint.y, 2))

                if distance < proximityThreshold {
                    // Same corner - add to group if not already included
                    if !cornerLines.contains(where: { $0.id == otherEp.line.id }) {
                        cornerLines.append(otherEp.line)
                    }
                    cornerPoints.append(otherEp.screenPoint)
                    cornerPdfPoints.append(otherEp.pdfPoint)
                    processedIndices.insert(j)
                }
            }

            // Calculate average position for the corner
            let avgScreen = CGPoint(
                x: cornerPoints.reduce(0) { $0 + $1.x } / CGFloat(cornerPoints.count),
                y: cornerPoints.reduce(0) { $0 + $1.y } / CGFloat(cornerPoints.count)
            )
            let avgPdf = CGPoint(
                x: cornerPdfPoints.reduce(0) { $0 + $1.x } / CGFloat(cornerPdfPoints.count),
                y: cornerPdfPoints.reduce(0) { $0 + $1.y } / CGFloat(cornerPdfPoints.count)
            )

            // Create intersection with 1-4 lines (even single line endpoints are valid snap points)
            intersections.append(DetectedIntersection(
                point: avgScreen,
                pdfPoint: avgPdf,
                pageIndex: pageIndex,
                lines: Array(cornerLines.prefix(4))  // Limit to 4 lines max
            ))
        }

        // Sort by distance to tap point
        return intersections.sorted { $0.distanceFrom(point) < $1.distanceFrom(point) }
    }

    /// Render a region of a PDF page to a UIImage
    private func renderPDFRegion(page: PDFPage, rect: CGRect, scale: CGFloat) -> UIImage? {
        let pageRect = page.bounds(for: .mediaBox)

        // Clamp rect to page bounds
        let clampedRect = rect.intersection(pageRect)
        guard !clampedRect.isEmpty else { return nil }

        let renderSize = CGSize(
            width: clampedRect.width * scale,
            height: clampedRect.height * scale
        )

        let renderer = UIGraphicsImageRenderer(size: renderSize)

        return renderer.image { context in
            context.cgContext.setFillColor(UIColor.white.cgColor)
            context.cgContext.fill(CGRect(origin: .zero, size: renderSize))

            context.cgContext.translateBy(x: 0, y: renderSize.height)
            context.cgContext.scaleBy(x: scale, y: -scale)
            context.cgContext.translateBy(x: -clampedRect.origin.x, y: -clampedRect.origin.y)

            page.draw(with: .mediaBox, to: context.cgContext)
        }
    }

    /// Use Vision to detect lines in an image
    private func detectLinesInImage(
        _ image: UIImage,
        searchRect: CGRect,
        page: PDFPage,
        pdfView: PDFView,
        pageIndex: Int
    ) async -> [DetectedLine] {
        guard let cgImage = image.cgImage else { return [] }

        return await withCheckedContinuation { continuation in
            var detectedLines: [DetectedLine] = []

            // Use contour detection to find edges
            let contourRequest = VNDetectContoursRequest { request, error in
                guard error == nil,
                      let results = request.results as? [VNContoursObservation] else {
                    continuation.resume(returning: [])
                    return
                }

                for observation in results {
                    // Process each contour
                    for i in 0..<observation.contourCount {
                        guard let contour = try? observation.contour(at: i) else { continue }

                        // Get simplified contour points
                        let points = contour.normalizedPoints
                        guard points.count >= 2 else { continue }

                        // Find straight line segments in the contour
                        let lineSegments = self.extractLineSegments(from: points, image: image, searchRect: searchRect)

                        for segment in lineSegments {
                            // Convert from image coordinates to PDF coordinates
                            let pdfStart = CGPoint(
                                x: searchRect.origin.x + segment.start.x,
                                y: searchRect.origin.y + segment.start.y
                            )
                            let pdfEnd = CGPoint(
                                x: searchRect.origin.x + segment.end.x,
                                y: searchRect.origin.y + segment.end.y
                            )

                            // Convert to screen coordinates
                            let screenStart = pdfView.convert(pdfStart, from: page)
                            let screenEnd = pdfView.convert(pdfEnd, from: page)

                            // Filter out very short lines
                            let screenLength = sqrt(pow(screenEnd.x - screenStart.x, 2) + pow(screenEnd.y - screenStart.y, 2))
                            if screenLength > 30 {
                                detectedLines.append(DetectedLine(
                                    startPoint: screenStart,
                                    endPoint: screenEnd,
                                    pdfStartPoint: pdfStart,
                                    pdfEndPoint: pdfEnd,
                                    pageIndex: pageIndex
                                ))
                            }
                        }
                    }
                }

                continuation.resume(returning: detectedLines)
            }

            contourRequest.contrastAdjustment = 2.0
            contourRequest.detectsDarkOnLight = true

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

            do {
                try handler.perform([contourRequest])
            } catch {
                print("Line detection failed: \(error)")
                continuation.resume(returning: [])
            }
        }
    }

    /// Extract straight line segments from contour points
    private func extractLineSegments(
        from normalizedPoints: [simd_float2],
        image: UIImage,
        searchRect: CGRect
    ) -> [(start: CGPoint, end: CGPoint)] {
        var segments: [(start: CGPoint, end: CGPoint)] = []

        guard normalizedPoints.count >= 2 else { return segments }

        // Convert normalized points to image coordinates, then to PDF coordinates
        let imageSize = image.size
        let points = normalizedPoints.map { point in
            CGPoint(
                x: CGFloat(point.x) * imageSize.width / 2.0,  // Scale factor used in render
                y: CGFloat(1 - point.y) * imageSize.height / 2.0
            )
        }

        // Use Douglas-Peucker algorithm to simplify the contour with tighter epsilon for accuracy
        let simplified = douglasPeucker(points: points, epsilon: 3.0)

        // Each pair of adjacent points in simplified contour is a potential line
        for i in 0..<(simplified.count - 1) {
            let start = simplified[i]
            let end = simplified[i + 1]

            // Check if this segment is reasonably straight
            let length = sqrt(pow(end.x - start.x, 2) + pow(end.y - start.y, 2))
            if length > 15 {  // Lower minimum to catch more segments
                segments.append((start: start, end: end))
            }
        }

        // Merge collinear adjacent segments
        segments = mergeCollinearSegments(segments)

        return segments
    }

    /// Merge segments that are collinear and adjacent
    private func mergeCollinearSegments(_ segments: [(start: CGPoint, end: CGPoint)]) -> [(start: CGPoint, end: CGPoint)] {
        guard segments.count > 1 else { return segments }

        var merged: [(start: CGPoint, end: CGPoint)] = []
        var current = segments[0]

        for i in 1..<segments.count {
            let next = segments[i]

            // Check if segments are collinear and connected
            let currentDir = CGPoint(x: current.end.x - current.start.x, y: current.end.y - current.start.y)
            let currentLen = sqrt(currentDir.x * currentDir.x + currentDir.y * currentDir.y)

            let nextDir = CGPoint(x: next.end.x - next.start.x, y: next.end.y - next.start.y)
            let nextLen = sqrt(nextDir.x * nextDir.x + nextDir.y * nextDir.y)

            guard currentLen > 0 && nextLen > 0 else {
                merged.append(current)
                current = next
                continue
            }

            // Normalize directions
            let normCurrent = CGPoint(x: currentDir.x / currentLen, y: currentDir.y / currentLen)
            let normNext = CGPoint(x: nextDir.x / nextLen, y: nextDir.y / nextLen)

            // Check collinearity via dot product
            let dotProduct = abs(normCurrent.x * normNext.x + normCurrent.y * normNext.y)

            // Check if endpoints are close
            let endToStart = sqrt(pow(current.end.x - next.start.x, 2) + pow(current.end.y - next.start.y, 2))

            if dotProduct > 0.95 && endToStart < 15 {
                // Merge: extend current to include next
                current = (start: current.start, end: next.end)
            } else {
                merged.append(current)
                current = next
            }
        }

        merged.append(current)
        return merged
    }

    /// Douglas-Peucker line simplification algorithm
    private func douglasPeucker(points: [CGPoint], epsilon: CGFloat) -> [CGPoint] {
        guard points.count > 2 else { return points }

        var maxDistance: CGFloat = 0
        var maxIndex = 0

        let start = points.first!
        let end = points.last!

        for i in 1..<(points.count - 1) {
            let distance = perpendicularDistance(point: points[i], lineStart: start, lineEnd: end)
            if distance > maxDistance {
                maxDistance = distance
                maxIndex = i
            }
        }

        if maxDistance > epsilon {
            let left = douglasPeucker(points: Array(points[0...maxIndex]), epsilon: epsilon)
            let right = douglasPeucker(points: Array(points[maxIndex...]), epsilon: epsilon)
            return left.dropLast() + right
        } else {
            return [start, end]
        }
    }

    private func perpendicularDistance(point: CGPoint, lineStart: CGPoint, lineEnd: CGPoint) -> CGFloat {
        let dx = lineEnd.x - lineStart.x
        let dy = lineEnd.y - lineStart.y

        let length = sqrt(dx * dx + dy * dy)
        guard length > 0 else { return sqrt(pow(point.x - lineStart.x, 2) + pow(point.y - lineStart.y, 2)) }

        return abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / length
    }

    func clearDetection() {
        detectedLines = []
        detectedIntersections = []
        highlightedLine = nil
        highlightedIntersection = nil
    }

    func selectLine(_ line: DetectedLine) {
        highlightedLine = line
    }

    /// Extend a detected line in a specified direction by searching for more line segments
    func extendLine(
        _ line: DetectedLine,
        from endpoint: CGPoint,
        in pdfView: PDFView,
        searchDistance: CGFloat = 200
    ) async -> DetectedLine? {
        guard let page = pdfView.page(for: endpoint, nearest: true),
              let document = pdfView.document else {
            return nil
        }

        isDetecting = true
        defer { isDetecting = false }

        let pageIndex = document.index(for: page)

        // Determine the direction to extend based on which endpoint we're extending from
        let isStartEndpoint = distanceBetween(endpoint, line.startPoint) < distanceBetween(endpoint, line.endPoint)
        let anchorPoint = isStartEndpoint ? line.endPoint : line.startPoint
        let pdfAnchor = isStartEndpoint ? line.pdfEndPoint : line.pdfStartPoint
        let pdfExtending = isStartEndpoint ? line.pdfStartPoint : line.pdfEndPoint

        // Calculate direction vector in PDF coordinates
        let direction = CGPoint(
            x: pdfExtending.x - pdfAnchor.x,
            y: pdfExtending.y - pdfAnchor.y
        )
        let dirLength = sqrt(direction.x * direction.x + direction.y * direction.y)
        guard dirLength > 0 else { return nil }

        let normalizedDir = CGPoint(
            x: direction.x / dirLength,
            y: direction.y / dirLength
        )

        // Create search rect ahead of the extending endpoint
        let searchCenter = CGPoint(
            x: pdfExtending.x + normalizedDir.x * searchDistance / 2,
            y: pdfExtending.y + normalizedDir.y * searchDistance / 2
        )

        let searchRect = CGRect(
            x: searchCenter.x - searchDistance / 2,
            y: searchCenter.y - searchDistance / 2,
            width: searchDistance,
            height: searchDistance
        )

        // Render and detect lines in the extended area
        guard let image = renderPDFRegion(page: page, rect: searchRect, scale: 2.0) else {
            return nil
        }

        let detectedLines = await detectLinesInImage(image, searchRect: searchRect, page: page, pdfView: pdfView, pageIndex: pageIndex)

        // Find line segments that continue in the same direction
        var bestExtension: DetectedLine?
        var maxExtension: CGFloat = 0

        for detected in detectedLines {
            // Check if this line is roughly collinear with our original line
            let detectedDir = CGPoint(
                x: detected.pdfEndPoint.x - detected.pdfStartPoint.x,
                y: detected.pdfEndPoint.y - detected.pdfStartPoint.y
            )
            let detectedLen = sqrt(detectedDir.x * detectedDir.x + detectedDir.y * detectedDir.y)
            guard detectedLen > 0 else { continue }

            let normalizedDetected = CGPoint(
                x: detectedDir.x / detectedLen,
                y: detectedDir.y / detectedLen
            )

            // Check collinearity (dot product close to 1 or -1)
            let dotProduct = abs(normalizedDir.x * normalizedDetected.x + normalizedDir.y * normalizedDetected.y)
            if dotProduct > 0.9 {  // Lines are roughly parallel
                // Check if this line extends in the right direction
                let closestEndpoint = detected.closestEndpoint(to: endpoint)
                let distToEndpoint = distanceBetween(closestEndpoint, endpoint)

                // Line should be close to our extending endpoint
                if distToEndpoint < 50 {
                    // Calculate how far this extends
                    let farthestEndpoint = detected.farthestEndpoint(from: endpoint)
                    let extension_ = distanceBetween(farthestEndpoint, anchorPoint) - distanceBetween(endpoint, anchorPoint)

                    if extension_ > maxExtension {
                        maxExtension = extension_
                        bestExtension = detected
                    }
                }
            }
        }

        // If we found an extension, merge it with the original line
        if let ext = bestExtension {
            let farthestPoint = ext.farthestEndpoint(from: endpoint)
            let pdfFarthest = distanceBetween(farthestPoint, ext.startPoint) > distanceBetween(farthestPoint, ext.endPoint)
                ? ext.pdfStartPoint : ext.pdfEndPoint

            // Create merged line
            let mergedLine: DetectedLine
            if isStartEndpoint {
                // We're extending the start, so new start is the farthest point found
                mergedLine = DetectedLine(
                    startPoint: farthestPoint,
                    endPoint: anchorPoint,
                    pdfStartPoint: pdfFarthest,
                    pdfEndPoint: pdfAnchor,
                    pageIndex: pageIndex
                )
            } else {
                // We're extending the end
                mergedLine = DetectedLine(
                    startPoint: anchorPoint,
                    endPoint: farthestPoint,
                    pdfStartPoint: pdfAnchor,
                    pdfEndPoint: pdfFarthest,
                    pageIndex: pageIndex
                )
            }

            await MainActor.run {
                self.highlightedLine = mergedLine
            }

            return mergedLine
        }

        return nil
    }

    /// Extend line to a user-specified point, detecting along the way
    func extendLineToPoint(
        _ line: DetectedLine,
        from endpoint: CGPoint,
        toward targetPoint: CGPoint,
        in pdfView: PDFView
    ) async -> DetectedLine? {
        guard let page = pdfView.page(for: endpoint, nearest: true),
              let document = pdfView.document else {
            return nil
        }

        let pageIndex = document.index(for: page)

        // Convert target to PDF coordinates
        let pdfTarget = pdfView.convert(targetPoint, to: page)

        // Determine which endpoint we're extending from
        let isStartEndpoint = distanceBetween(endpoint, line.startPoint) < distanceBetween(endpoint, line.endPoint)
        let anchorPoint = isStartEndpoint ? line.endPoint : line.startPoint
        let pdfAnchor = isStartEndpoint ? line.pdfEndPoint : line.pdfStartPoint

        // Convert target back to screen coords for the merged line
        let screenTarget = pdfView.convert(pdfTarget, from: page)

        // Create extended line to target point
        let extendedLine: DetectedLine
        if isStartEndpoint {
            extendedLine = DetectedLine(
                startPoint: screenTarget,
                endPoint: anchorPoint,
                pdfStartPoint: pdfTarget,
                pdfEndPoint: pdfAnchor,
                pageIndex: pageIndex
            )
        } else {
            extendedLine = DetectedLine(
                startPoint: anchorPoint,
                endPoint: screenTarget,
                pdfStartPoint: pdfAnchor,
                pdfEndPoint: pdfTarget,
                pageIndex: pageIndex
            )
        }

        await MainActor.run {
            self.highlightedLine = extendedLine
        }

        return extendedLine
    }

    private func distanceBetween(_ p1: CGPoint, _ p2: CGPoint) -> CGFloat {
        sqrt(pow(p2.x - p1.x, 2) + pow(p2.y - p1.y, 2))
    }
}
