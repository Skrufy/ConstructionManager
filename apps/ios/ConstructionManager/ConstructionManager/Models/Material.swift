//
//  Material.swift
//  ConstructionManager
//
//  Materials inventory and tracking models
//

import Foundation

// MARK: - Material Category
enum MaterialCategory: String, Codable, CaseIterable {
    case lumber = "LUMBER"
    case concrete = "CONCRETE"
    case steel = "STEEL"
    case electrical = "ELECTRICAL"
    case plumbing = "PLUMBING"
    case hvac = "HVAC"
    case roofing = "ROOFING"
    case drywall = "DRYWALL"
    case paint = "PAINT"
    case flooring = "FLOORING"
    case hardware = "HARDWARE"
    case safety = "SAFETY"
    case other = "OTHER"

    var displayName: String {
        switch self {
        case .lumber: return "Lumber"
        case .concrete: return "Concrete"
        case .steel: return "Steel"
        case .electrical: return "Electrical"
        case .plumbing: return "Plumbing"
        case .hvac: return "HVAC"
        case .roofing: return "Roofing"
        case .drywall: return "Drywall"
        case .paint: return "Paint"
        case .flooring: return "Flooring"
        case .hardware: return "Hardware"
        case .safety: return "Safety Equipment"
        case .other: return "Other"
        }
    }

    var icon: String {
        switch self {
        case .lumber: return "tree.fill"
        case .concrete: return "square.3.layers.3d.down.right.fill"
        case .steel: return "rectangle.3.group.fill"
        case .electrical: return "bolt.fill"
        case .plumbing: return "drop.fill"
        case .hvac: return "fan.fill"
        case .roofing: return "house.fill"
        case .drywall: return "square.fill"
        case .paint: return "paintbrush.fill"
        case .flooring: return "square.grid.3x3.fill"
        case .hardware: return "wrench.and.screwdriver.fill"
        case .safety: return "shield.checkered"
        case .other: return "shippingbox.fill"
        }
    }
}

// MARK: - Material Status
enum MaterialStatus: String, Codable, CaseIterable {
    case inStock = "IN_STOCK"
    case lowStock = "LOW_STOCK"
    case outOfStock = "OUT_OF_STOCK"
    case onOrder = "ON_ORDER"
    case delivered = "DELIVERED"

    var displayName: String {
        switch self {
        case .inStock: return "In Stock"
        case .lowStock: return "Low Stock"
        case .outOfStock: return "Out of Stock"
        case .onOrder: return "On Order"
        case .delivered: return "Delivered"
        }
    }

    var badgeStatus: BadgeStatus {
        switch self {
        case .inStock: return .active
        case .lowStock: return .pending
        case .outOfStock: return .warning
        case .onOrder: return .info
        case .delivered: return .active
        }
    }
}

// MARK: - Material
struct Material: Identifiable, Codable {
    let id: String
    let name: String
    let description: String?
    let category: MaterialCategory
    let sku: String?
    let unit: String // e.g., "each", "linear ft", "sq ft", "cubic yard"
    let quantityOnHand: Double
    let minimumQuantity: Double
    let costPerUnit: Double
    let supplier: String?
    let projectId: String?
    let projectName: String?
    let location: String? // Where on site it's stored
    let status: MaterialStatus
    let lastOrderDate: Date?
    let lastDeliveryDate: Date?
    let notes: String?
    let createdAt: Date
    let updatedAt: Date

    var formattedCost: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: costPerUnit)) ?? "$\(costPerUnit)"
    }

    var totalValue: Double {
        quantityOnHand * costPerUnit
    }

    var formattedTotalValue: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: totalValue)) ?? "$\(totalValue)"
    }

    var isLowStock: Bool {
        quantityOnHand <= minimumQuantity && quantityOnHand > 0
    }

    var isOutOfStock: Bool {
        quantityOnHand <= 0
    }

    // MARK: - Mock Data
    static let mockMaterials: [Material] = [
        Material(
            id: "mat-1",
            name: "2x4x8 Lumber",
            description: "Pressure treated 2x4x8 studs",
            category: .lumber,
            sku: "LUM-2x4x8-PT",
            unit: "each",
            quantityOnHand: 250,
            minimumQuantity: 100,
            costPerUnit: 8.50,
            supplier: "Home Depot Pro",
            projectId: "proj-1",
            projectName: "Chandlers Grove",
            location: "Lot A - North Side",
            status: .inStock,
            lastOrderDate: Calendar.current.date(byAdding: .day, value: -7, to: Date()),
            lastDeliveryDate: Calendar.current.date(byAdding: .day, value: -5, to: Date()),
            notes: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Material(
            id: "mat-2",
            name: "Ready-Mix Concrete",
            description: "4000 PSI ready-mix concrete",
            category: .concrete,
            sku: "CON-4000-RM",
            unit: "cubic yard",
            quantityOnHand: 15,
            minimumQuantity: 20,
            costPerUnit: 145.00,
            supplier: "Vulcan Materials",
            projectId: "proj-1",
            projectName: "Chandlers Grove",
            location: nil,
            status: .lowStock,
            lastOrderDate: Calendar.current.date(byAdding: .day, value: -3, to: Date()),
            lastDeliveryDate: nil,
            notes: "Order placed - expected delivery Friday",
            createdAt: Date(),
            updatedAt: Date()
        ),
        Material(
            id: "mat-3",
            name: "1/2\" Rebar #4",
            description: "Grade 60 reinforcing bar",
            category: .steel,
            sku: "STL-REBAR-4",
            unit: "linear ft",
            quantityOnHand: 1500,
            minimumQuantity: 500,
            costPerUnit: 0.85,
            supplier: "Steel Dynamics",
            projectId: "proj-1",
            projectName: "Chandlers Grove",
            location: "Lot B - Rebar Storage",
            status: .inStock,
            lastOrderDate: nil,
            lastDeliveryDate: Calendar.current.date(byAdding: .day, value: -10, to: Date()),
            notes: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Material(
            id: "mat-4",
            name: "12/2 Romex Wire",
            description: "12 gauge 2-conductor NM-B cable",
            category: .electrical,
            sku: "ELC-12-2-NM",
            unit: "ft",
            quantityOnHand: 0,
            minimumQuantity: 250,
            costPerUnit: 0.65,
            supplier: "Graybar Electric",
            projectId: "proj-1",
            projectName: "Chandlers Grove",
            location: nil,
            status: .outOfStock,
            lastOrderDate: Calendar.current.date(byAdding: .day, value: -1, to: Date()),
            lastDeliveryDate: nil,
            notes: "URGENT - Need for Phase 2 rough-in",
            createdAt: Date(),
            updatedAt: Date()
        ),
        Material(
            id: "mat-5",
            name: "3/4\" PVC Pipe",
            description: "Schedule 40 PVC pipe",
            category: .plumbing,
            sku: "PLM-PVC-34",
            unit: "10ft stick",
            quantityOnHand: 45,
            minimumQuantity: 20,
            costPerUnit: 12.00,
            supplier: "Ferguson Enterprises",
            projectId: "proj-1",
            projectName: "Chandlers Grove",
            location: "Trailer - Plumbing Storage",
            status: .inStock,
            lastOrderDate: nil,
            lastDeliveryDate: Calendar.current.date(byAdding: .day, value: -14, to: Date()),
            notes: nil,
            createdAt: Date(),
            updatedAt: Date()
        ),
        Material(
            id: "mat-6",
            name: "5/8\" Drywall",
            description: "5/8\" Type X fire-rated drywall 4x8 sheets",
            category: .drywall,
            sku: "DRY-58-FRT",
            unit: "sheet",
            quantityOnHand: 120,
            minimumQuantity: 50,
            costPerUnit: 18.50,
            supplier: "USG Corporation",
            projectId: "proj-1",
            projectName: "Chandlers Grove",
            location: "Building 1 - 2nd Floor",
            status: .inStock,
            lastOrderDate: nil,
            lastDeliveryDate: Calendar.current.date(byAdding: .day, value: -3, to: Date()),
            notes: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}

// MARK: - Material Order
struct MaterialOrder: Identifiable, Codable {
    let id: String
    let materialId: String
    let materialName: String
    let projectId: String?
    let projectName: String?
    let quantity: Double
    let unit: String
    let costPerUnit: Double
    let totalCost: Double
    let supplier: String
    let orderDate: Date
    let expectedDeliveryDate: Date?
    let actualDeliveryDate: Date?
    let status: OrderStatus
    let orderedBy: String?
    let orderedByName: String?
    let notes: String?
    let createdAt: Date

    var formattedTotalCost: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: totalCost)) ?? "$\(totalCost)"
    }
}

// MARK: - Order Status
enum OrderStatus: String, Codable, CaseIterable {
    case pending = "PENDING"
    case confirmed = "CONFIRMED"
    case shipped = "SHIPPED"
    case delivered = "DELIVERED"
    case cancelled = "CANCELLED"

    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .confirmed: return "Confirmed"
        case .shipped: return "Shipped"
        case .delivered: return "Delivered"
        case .cancelled: return "Cancelled"
        }
    }

    var badgeStatus: BadgeStatus {
        switch self {
        case .pending: return .pending
        case .confirmed: return .info
        case .shipped: return .info
        case .delivered: return .active
        case .cancelled: return .warning
        }
    }
}

// MARK: - Material Usage
struct MaterialUsage: Identifiable, Codable {
    let id: String
    let materialId: String
    let materialName: String
    let projectId: String
    let projectName: String
    let quantity: Double
    let unit: String
    let usedBy: String?
    let usedByName: String?
    let usageDate: Date
    let dailyLogId: String?
    let notes: String?
    let createdAt: Date
}
