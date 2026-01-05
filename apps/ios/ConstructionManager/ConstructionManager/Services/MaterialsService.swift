//
//  MaterialsService.swift
//  ConstructionManager
//
//  Service for materials API calls
//

import Foundation
import Combine

@MainActor
class MaterialsService: ObservableObject {
    static let shared = MaterialsService()

    @Published var materials: [Material] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var isUsingCachedData = false
    @Published var stats: MaterialsStats?

    private let apiClient = APIClient.shared
    private let networkMonitor = NetworkMonitor.shared

    private init() {}

    // MARK: - Fetch Materials

    func fetchMaterials(
        projectId: String? = nil,
        category: String? = nil,
        status: String? = nil,
        search: String? = nil,
        lowStockOnly: Bool = false
    ) async {
        isLoading = true
        error = nil
        isUsingCachedData = false
        defer { isLoading = false }

        // Check network connectivity
        guard networkMonitor.isConnected else {
            error = "No network connection"
            return
        }

        do {
            var queryItems: [URLQueryItem] = []
            if let projectId = projectId {
                queryItems.append(URLQueryItem(name: "projectId", value: projectId))
            }
            if let category = category {
                queryItems.append(URLQueryItem(name: "category", value: category))
            }
            if let status = status {
                queryItems.append(URLQueryItem(name: "status", value: status))
            }
            if let search = search, !search.isEmpty {
                queryItems.append(URLQueryItem(name: "search", value: search))
            }
            if lowStockOnly {
                queryItems.append(URLQueryItem(name: "lowStockOnly", value: "true"))
            }

            let response: MaterialsListResponse = try await apiClient.get(
                "/materials",
                queryItems: queryItems.isEmpty ? nil : queryItems
            )

            self.materials = response.materials.map { $0.toMaterial() }
            self.stats = response.stats

        } catch {
            self.error = error.localizedDescription
            print("Failed to fetch materials: \(error)")
        }
    }

    // MARK: - Refresh

    func refresh() async {
        await fetchMaterials()
    }

    // MARK: - Create Material

    func createMaterial(
        name: String,
        description: String? = nil,
        category: MaterialCategory,
        sku: String? = nil,
        unit: String,
        quantityOnHand: Double,
        minimumQuantity: Double,
        costPerUnit: Double,
        supplier: String? = nil,
        projectId: String? = nil,
        location: String? = nil,
        notes: String? = nil
    ) async throws -> Material {
        let request = CreateMaterialRequest(
            name: name,
            description: description,
            category: category.rawValue,
            sku: sku,
            unit: unit,
            quantityOnHand: quantityOnHand,
            minimumQuantity: minimumQuantity,
            costPerUnit: costPerUnit,
            supplier: supplier,
            projectId: projectId,
            location: location,
            notes: notes
        )

        let response: MaterialAPIModel = try await apiClient.post("/materials", body: request)
        let newMaterial = response.toMaterial()

        // Add to local list
        materials.insert(newMaterial, at: 0)

        return newMaterial
    }

    // MARK: - Update Material

    func updateMaterial(
        id: String,
        name: String? = nil,
        description: String? = nil,
        category: MaterialCategory? = nil,
        sku: String? = nil,
        unit: String? = nil,
        quantityOnHand: Double? = nil,
        minimumQuantity: Double? = nil,
        costPerUnit: Double? = nil,
        supplier: String? = nil,
        location: String? = nil,
        status: MaterialStatus? = nil,
        notes: String? = nil
    ) async throws -> Material {
        let request = UpdateMaterialRequest(
            name: name,
            description: description,
            category: category?.rawValue,
            sku: sku,
            unit: unit,
            quantityOnHand: quantityOnHand,
            minimumQuantity: minimumQuantity,
            costPerUnit: costPerUnit,
            supplier: supplier,
            location: location,
            status: status?.rawValue,
            notes: notes
        )

        let response: MaterialAPIModel = try await apiClient.patch("/materials/\(id)", body: request)
        let updatedMaterial = response.toMaterial()

        // Update local list
        if let index = materials.firstIndex(where: { $0.id == id }) {
            materials[index] = updatedMaterial
        }

        return updatedMaterial
    }

    // MARK: - Delete Material

    func deleteMaterial(id: String) async throws {
        try await apiClient.delete("/materials/\(id)")

        // Remove from local list
        materials.removeAll { $0.id == id }
    }

    // MARK: - Material Orders

    func fetchOrders(
        materialId: String? = nil,
        projectId: String? = nil,
        status: String? = nil
    ) async throws -> [MaterialOrder] {
        var queryItems: [URLQueryItem] = []
        if let materialId = materialId {
            queryItems.append(URLQueryItem(name: "materialId", value: materialId))
        }
        if let projectId = projectId {
            queryItems.append(URLQueryItem(name: "projectId", value: projectId))
        }
        if let status = status {
            queryItems.append(URLQueryItem(name: "status", value: status))
        }

        let response: MaterialOrdersListResponse = try await apiClient.get(
            "/materials/orders",
            queryItems: queryItems.isEmpty ? nil : queryItems
        )

        return response.orders.map { $0.toMaterialOrder() }
    }

    func createOrder(
        materialId: String,
        quantity: Double,
        supplier: String,
        projectId: String? = nil,
        costPerUnit: Double? = nil,
        expectedDeliveryDate: Date? = nil,
        notes: String? = nil
    ) async throws -> MaterialOrder {
        let request = CreateMaterialOrderRequest(
            materialId: materialId,
            projectId: projectId,
            quantity: quantity,
            costPerUnit: costPerUnit,
            supplier: supplier,
            expectedDeliveryDate: expectedDeliveryDate,
            notes: notes
        )

        let response: MaterialOrderAPIModel = try await apiClient.post("/materials/orders", body: request)
        return response.toMaterialOrder()
    }

    // MARK: - Record Usage

    func recordUsage(
        materialId: String,
        quantity: Double,
        projectId: String? = nil,
        dailyLogId: String? = nil,
        purpose: String? = nil,
        notes: String? = nil
    ) async throws -> MaterialUsage {
        let request = RecordMaterialUsageRequest(
            materialId: materialId,
            projectId: projectId,
            dailyLogId: dailyLogId,
            quantity: quantity,
            purpose: purpose,
            notes: notes
        )

        let response: MaterialUsageAPIModel = try await apiClient.post("/materials/usage", body: request)
        return response.toMaterialUsage()
    }
}

// MARK: - API Response Models

struct MaterialsListResponse: Decodable {
    let materials: [MaterialAPIModel]
    let stats: MaterialsStats?
    let page: Int?
    let pageSize: Int?
    let total: Int?
    let totalPages: Int?

    enum CodingKeys: String, CodingKey {
        case materials
        case stats
        case page
        case pageSize = "page_size"
        case total
        case totalPages = "total_pages"
    }
}

struct MaterialsStats: Decodable {
    let totalCount: Int
    let inStock: Int
    let lowStock: Int
    let outOfStock: Int
    let onOrder: Int
    let totalValue: Double

    enum CodingKeys: String, CodingKey {
        case totalCount = "total_count"
        case inStock = "in_stock"
        case lowStock = "low_stock"
        case outOfStock = "out_of_stock"
        case onOrder = "on_order"
        case totalValue = "total_value"
    }
}

struct MaterialAPIModel: Decodable {
    let id: String
    let name: String
    let description: String?
    let category: String
    let sku: String?
    let unit: String
    let quantityOnHand: Double
    let minimumQuantity: Double
    let costPerUnit: Double
    let supplier: String?
    let projectId: String?
    let projectName: String?
    let location: String?
    let status: String
    let lastOrderDate: Date?
    let lastDeliveryDate: Date?
    let notes: String?
    let createdAt: Date
    let updatedAt: Date
    let totalValue: Double?
    let isLowStock: Bool?
    let isOutOfStock: Bool?

    enum CodingKeys: String, CodingKey {
        case id, name, description, category, sku, unit
        case quantityOnHand = "quantity_on_hand"
        case minimumQuantity = "minimum_quantity"
        case costPerUnit = "cost_per_unit"
        case supplier
        case projectId = "project_id"
        case projectName = "project_name"
        case location, status
        case lastOrderDate = "last_order_date"
        case lastDeliveryDate = "last_delivery_date"
        case notes
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case totalValue = "total_value"
        case isLowStock = "is_low_stock"
        case isOutOfStock = "is_out_of_stock"
    }

    func toMaterial() -> Material {
        let mappedCategory = MaterialCategory(rawValue: category) ?? .other
        let mappedStatus = MaterialStatus(rawValue: status) ?? .inStock

        return Material(
            id: id,
            name: name,
            description: description,
            category: mappedCategory,
            sku: sku,
            unit: unit,
            quantityOnHand: quantityOnHand,
            minimumQuantity: minimumQuantity,
            costPerUnit: costPerUnit,
            supplier: supplier,
            projectId: projectId,
            projectName: projectName,
            location: location,
            status: mappedStatus,
            lastOrderDate: lastOrderDate,
            lastDeliveryDate: lastDeliveryDate,
            notes: notes,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

struct MaterialOrdersListResponse: Decodable {
    let orders: [MaterialOrderAPIModel]
    let stats: MaterialOrdersStats?
    let page: Int?
    let pageSize: Int?
    let total: Int?
    let totalPages: Int?

    enum CodingKeys: String, CodingKey {
        case orders, stats, page, total
        case pageSize = "page_size"
        case totalPages = "total_pages"
    }
}

struct MaterialOrdersStats: Decodable {
    let totalCount: Int
    let pending: Int
    let confirmed: Int
    let shipped: Int
    let delivered: Int
    let cancelled: Int
    let totalValue: Double

    enum CodingKeys: String, CodingKey {
        case totalCount = "total_count"
        case pending, confirmed, shipped, delivered, cancelled
        case totalValue = "total_value"
    }
}

struct MaterialOrderAPIModel: Decodable {
    let id: String
    let materialId: String
    let materialName: String?
    let materialSku: String?
    let materialUnit: String?
    let projectId: String?
    let projectName: String?
    let quantity: Double
    let costPerUnit: Double
    let totalCost: Double
    let supplier: String
    let orderDate: Date?
    let expectedDeliveryDate: Date?
    let actualDeliveryDate: Date?
    let status: String
    let orderedById: String?
    let orderedByName: String?
    let orderedByEmail: String?
    let notes: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case materialId = "material_id"
        case materialName = "material_name"
        case materialSku = "material_sku"
        case materialUnit = "material_unit"
        case projectId = "project_id"
        case projectName = "project_name"
        case quantity
        case costPerUnit = "cost_per_unit"
        case totalCost = "total_cost"
        case supplier
        case orderDate = "order_date"
        case expectedDeliveryDate = "expected_delivery_date"
        case actualDeliveryDate = "actual_delivery_date"
        case status
        case orderedById = "ordered_by_id"
        case orderedByName = "ordered_by_name"
        case orderedByEmail = "ordered_by_email"
        case notes
        case createdAt = "created_at"
    }

    func toMaterialOrder() -> MaterialOrder {
        let mappedStatus = OrderStatus(rawValue: status) ?? .pending

        return MaterialOrder(
            id: id,
            materialId: materialId,
            materialName: materialName ?? "",
            projectId: projectId,
            projectName: projectName,
            quantity: quantity,
            unit: materialUnit ?? "each",
            costPerUnit: costPerUnit,
            totalCost: totalCost,
            supplier: supplier,
            orderDate: orderDate ?? Date(),
            expectedDeliveryDate: expectedDeliveryDate,
            actualDeliveryDate: actualDeliveryDate,
            status: mappedStatus,
            orderedBy: orderedById,
            orderedByName: orderedByName,
            notes: notes,
            createdAt: createdAt ?? Date()
        )
    }
}

struct MaterialUsageAPIModel: Decodable {
    let id: String
    let materialId: String
    let materialName: String?
    let projectId: String?
    let projectName: String?
    let dailyLogId: String?
    let usedById: String?
    let usedByName: String?
    let quantity: Double
    let unit: String?
    let usageDate: Date?
    let purpose: String?
    let notes: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case materialId = "material_id"
        case materialName = "material_name"
        case projectId = "project_id"
        case projectName = "project_name"
        case dailyLogId = "daily_log_id"
        case usedById = "used_by_id"
        case usedByName = "used_by_name"
        case quantity, unit
        case usageDate = "usage_date"
        case purpose, notes
        case createdAt = "created_at"
    }

    func toMaterialUsage() -> MaterialUsage {
        return MaterialUsage(
            id: id,
            materialId: materialId,
            materialName: materialName ?? "",
            projectId: projectId ?? "",
            projectName: projectName ?? "",
            quantity: quantity,
            unit: unit ?? "each",
            usedBy: usedById,
            usedByName: usedByName,
            usageDate: usageDate ?? Date(),
            dailyLogId: dailyLogId,
            notes: notes,
            createdAt: createdAt ?? Date()
        )
    }
}

// MARK: - Request Models

struct CreateMaterialRequest: Encodable {
    let name: String
    let description: String?
    let category: String
    let sku: String?
    let unit: String
    let quantityOnHand: Double
    let minimumQuantity: Double
    let costPerUnit: Double
    let supplier: String?
    let projectId: String?
    let location: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case name, description, category, sku, unit
        case quantityOnHand = "quantity_on_hand"
        case minimumQuantity = "minimum_quantity"
        case costPerUnit = "cost_per_unit"
        case supplier
        case projectId = "project_id"
        case location, notes
    }
}

struct UpdateMaterialRequest: Encodable {
    let name: String?
    let description: String?
    let category: String?
    let sku: String?
    let unit: String?
    let quantityOnHand: Double?
    let minimumQuantity: Double?
    let costPerUnit: Double?
    let supplier: String?
    let location: String?
    let status: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case name, description, category, sku, unit
        case quantityOnHand = "quantity_on_hand"
        case minimumQuantity = "minimum_quantity"
        case costPerUnit = "cost_per_unit"
        case supplier, location, status, notes
    }
}

struct CreateMaterialOrderRequest: Encodable {
    let materialId: String
    let projectId: String?
    let quantity: Double
    let costPerUnit: Double?
    let supplier: String
    let expectedDeliveryDate: Date?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case materialId = "material_id"
        case projectId = "project_id"
        case quantity
        case costPerUnit = "cost_per_unit"
        case supplier
        case expectedDeliveryDate = "expected_delivery_date"
        case notes
    }
}

struct RecordMaterialUsageRequest: Encodable {
    let materialId: String
    let projectId: String?
    let dailyLogId: String?
    let quantity: Double
    let purpose: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case materialId = "material_id"
        case projectId = "project_id"
        case dailyLogId = "daily_log_id"
        case quantity, purpose, notes
    }
}
