//
//  ReportPDFGenerator.swift
//  ConstructionManager
//
//  PDF generation for reports
//

import UIKit
import PDFKit

class ReportPDFGenerator {

    // MARK: - PDF-Safe Colors (explicit values for print)
    // These don't change with dark mode, ensuring clean PDF output

    private static let pdfLightGray = UIColor(white: 0.95, alpha: 1.0)      // Stat boxes, alternating rows
    private static let pdfMediumGray = UIColor(white: 0.82, alpha: 1.0)    // Divider lines, borders
    private static let pdfDarkGray = UIColor(white: 0.33, alpha: 1.0)      // Secondary text
    private static let pdfTextGray = UIColor(white: 0.56, alpha: 1.0)      // Subtle text
    private static let pdfBlue = UIColor(red: 0.0, green: 0.48, blue: 1.0, alpha: 1.0) // Accent color

    static func generatePDF(for report: Report) async -> URL? {
        let pageWidth: CGFloat = 612  // US Letter width in points
        let pageHeight: CGFloat = 792 // US Letter height in points
        let margin: CGFloat = 50

        let pdfMetaData = [
            kCGPDFContextCreator: "ConstructionPro",
            kCGPDFContextAuthor: report.generatedBy ?? "ConstructionPro",
            kCGPDFContextTitle: report.name
        ]

        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = pdfMetaData as [String: Any]

        let pageRect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)
        let renderer = UIGraphicsPDFRenderer(bounds: pageRect, format: format)

        let data = renderer.pdfData { context in
            context.beginPage()

            var yPosition: CGFloat = margin

            // Draw header
            yPosition = drawHeader(report: report, in: context.cgContext, at: yPosition, pageWidth: pageWidth, margin: margin)

            // Draw stats section
            if let stats = report.stats, !stats.isEmpty {
                yPosition = drawStatsSection(stats: stats, in: context.cgContext, at: yPosition, pageWidth: pageWidth, margin: margin)
            }

            // Check if we need a new page
            if yPosition > pageHeight - 200 {
                context.beginPage()
                yPosition = margin
            }

            // Draw data section
            if let data = report.data, !data.isEmpty {
                yPosition = drawDataSection(data: data, in: context.cgContext, at: yPosition, pageWidth: pageWidth, margin: margin, pageHeight: pageHeight, context: context)
            }

            // Draw footer
            drawFooter(report: report, in: context.cgContext, pageRect: pageRect, margin: margin)
        }

        // Save to temp file
        let fileName = "\(report.name.replacingOccurrences(of: " ", with: "_"))_\(formatDateForFilename(report.generatedAt)).pdf"
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        do {
            try data.write(to: tempURL)
            return tempURL
        } catch {
            print("Failed to save PDF: \(error)")
            return nil
        }
    }

    // MARK: - Drawing Methods

    private static func drawHeader(report: Report, in context: CGContext, at yPosition: CGFloat, pageWidth: CGFloat, margin: CGFloat) -> CGFloat {
        var y = yPosition

        // Company/App name
        let appNameAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 12, weight: .medium),
            .foregroundColor: pdfTextGray
        ]
        let appName = "ConstructionPro"
        appName.draw(at: CGPoint(x: margin, y: y), withAttributes: appNameAttributes)
        y += 20

        // Report title
        let titleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 24, weight: .bold),
            .foregroundColor: UIColor.black
        ]
        report.name.draw(at: CGPoint(x: margin, y: y), withAttributes: titleAttributes)
        y += 35

        // Description
        if let description = report.description {
            let descAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12, weight: .regular),
                .foregroundColor: pdfDarkGray
            ]
            let descRect = CGRect(x: margin, y: y, width: pageWidth - (margin * 2), height: 40)
            description.draw(in: descRect, withAttributes: descAttributes)
            y += 25
        }

        // Period and date range
        let periodAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 11, weight: .medium),
            .foregroundColor: pdfBlue
        ]
        var periodText = "Period: \(report.period.displayName)"
        if let startDate = report.startDate, let endDate = report.endDate {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            periodText += " (\(formatter.string(from: startDate)) - \(formatter.string(from: endDate)))"
        }
        periodText.draw(at: CGPoint(x: margin, y: y), withAttributes: periodAttributes)
        y += 20

        // Project name if applicable
        if let projectName = report.projectName {
            let projectAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11, weight: .regular),
                .foregroundColor: pdfDarkGray
            ]
            "Project: \(projectName)".draw(at: CGPoint(x: margin, y: y), withAttributes: projectAttributes)
            y += 20
        }

        // Divider line
        y += 10
        context.setStrokeColor(pdfMediumGray.cgColor)
        context.setLineWidth(1)
        context.move(to: CGPoint(x: margin, y: y))
        context.addLine(to: CGPoint(x: pageWidth - margin, y: y))
        context.strokePath()
        y += 20

        return y
    }

    private static func drawStatsSection(stats: [ReportStat], in context: CGContext, at yPosition: CGFloat, pageWidth: CGFloat, margin: CGFloat) -> CGFloat {
        var y = yPosition

        // Section title
        let sectionTitleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 16, weight: .semibold),
            .foregroundColor: UIColor.black
        ]
        "Summary".draw(at: CGPoint(x: margin, y: y), withAttributes: sectionTitleAttributes)
        y += 30

        // Draw stats in a grid (2 columns)
        let statWidth = (pageWidth - (margin * 2) - 20) / 2
        let statHeight: CGFloat = 60

        for (index, stat) in stats.enumerated() {
            let column = index % 2
            let row = index / 2
            let x = margin + (CGFloat(column) * (statWidth + 20))
            let statY = y + (CGFloat(row) * statHeight)

            // Draw stat box
            let boxRect = CGRect(x: x, y: statY, width: statWidth, height: statHeight - 10)
            context.setFillColor(pdfLightGray.cgColor)
            context.fill(boxRect)

            // Stat value
            let valueAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 20, weight: .bold),
                .foregroundColor: pdfBlue
            ]
            stat.value.draw(at: CGPoint(x: x + 10, y: statY + 8), withAttributes: valueAttributes)

            // Stat label
            let labelAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11, weight: .regular),
                .foregroundColor: pdfDarkGray
            ]
            stat.label.draw(at: CGPoint(x: x + 10, y: statY + 32), withAttributes: labelAttributes)
        }

        let rows = (stats.count + 1) / 2
        y += CGFloat(rows) * statHeight + 20

        return y
    }

    private static func drawDataSection(data: [ReportDataPoint], in context: CGContext, at yPosition: CGFloat, pageWidth: CGFloat, margin: CGFloat, pageHeight: CGFloat, context pdfContext: UIGraphicsPDFRendererContext) -> CGFloat {
        var y = yPosition

        // Section title
        let sectionTitleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 16, weight: .semibold),
            .foregroundColor: UIColor.black
        ]
        "Details".draw(at: CGPoint(x: margin, y: y), withAttributes: sectionTitleAttributes)
        y += 25

        // Table header
        let headerAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 11, weight: .semibold),
            .foregroundColor: UIColor.white
        ]

        let tableWidth = pageWidth - (margin * 2)
        let labelWidth = tableWidth * 0.6
        let valueWidth = tableWidth * 0.4

        // Header background
        context.setFillColor(pdfBlue.cgColor)
        context.fill(CGRect(x: margin, y: y, width: tableWidth, height: 25))

        "Item".draw(at: CGPoint(x: margin + 10, y: y + 6), withAttributes: headerAttributes)
        "Value".draw(at: CGPoint(x: margin + labelWidth + 10, y: y + 6), withAttributes: headerAttributes)
        y += 25

        // Table rows
        let rowAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 11, weight: .regular),
            .foregroundColor: UIColor.black
        ]
        let valueAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 11, weight: .medium),
            .foregroundColor: pdfBlue
        ]

        for (index, item) in data.enumerated() {
            // Check if we need a new page
            if y > pageHeight - 100 {
                pdfContext.beginPage()
                y = margin
            }

            // Alternating row background
            if index % 2 == 0 {
                context.setFillColor(pdfLightGray.cgColor)
                context.fill(CGRect(x: margin, y: y, width: tableWidth, height: 22))
            }

            item.label.draw(at: CGPoint(x: margin + 10, y: y + 5), withAttributes: rowAttributes)
            String(format: "%.0f", item.value).draw(at: CGPoint(x: margin + labelWidth + 10, y: y + 5), withAttributes: valueAttributes)

            y += 22
        }

        // Table border
        context.setStrokeColor(pdfMediumGray.cgColor)
        context.setLineWidth(0.5)
        context.stroke(CGRect(x: margin, y: yPosition + 25, width: tableWidth, height: y - yPosition - 25))

        y += 20
        return y
    }

    private static func drawFooter(report: Report, in context: CGContext, pageRect: CGRect, margin: CGFloat) {
        let footerY = pageRect.height - margin

        // Footer line
        context.setStrokeColor(pdfMediumGray.cgColor)
        context.setLineWidth(0.5)
        context.move(to: CGPoint(x: margin, y: footerY - 25))
        context.addLine(to: CGPoint(x: pageRect.width - margin, y: footerY - 25))
        context.strokePath()

        // Footer text
        let footerAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9, weight: .regular),
            .foregroundColor: pdfTextGray
        ]

        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short

        let generatedText = "Generated: \(formatter.string(from: report.generatedAt))"
        if let generatedBy = report.generatedBy {
            "\(generatedText) by \(generatedBy)".draw(at: CGPoint(x: margin, y: footerY - 15), withAttributes: footerAttributes)
        } else {
            generatedText.draw(at: CGPoint(x: margin, y: footerY - 15), withAttributes: footerAttributes)
        }

        // Page number (right aligned)
        let pageText = "Page 1"
        let pageTextSize = pageText.size(withAttributes: footerAttributes)
        pageText.draw(at: CGPoint(x: pageRect.width - margin - pageTextSize.width, y: footerY - 15), withAttributes: footerAttributes)
    }

    // MARK: - Helpers

    private static func formatDateForFilename(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}
