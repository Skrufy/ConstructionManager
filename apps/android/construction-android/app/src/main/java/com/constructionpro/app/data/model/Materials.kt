package com.constructionpro.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Material(
    val id: String,
    val name: String,
    val description: String? = null,
    val category: String = "OTHER",
    val sku: String? = null,
    val unit: String = "each",
    @SerialName("quantity_on_hand") val quantityOnHand: Double = 0.0,
    @SerialName("minimum_quantity") val minimumQuantity: Double = 0.0,
    @SerialName("cost_per_unit") val costPerUnit: Double = 0.0,
    val supplier: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("project_name") val projectName: String? = null,
    val location: String? = null,
    val status: String = "IN_STOCK", // IN_STOCK, LOW_STOCK, OUT_OF_STOCK, ON_ORDER
    @SerialName("last_order_date") val lastOrderDate: String? = null,
    @SerialName("last_delivery_date") val lastDeliveryDate: String? = null,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    // Computed fields from API
    @SerialName("total_value") val totalValue: Double = 0.0,
    @SerialName("is_low_stock") val isLowStock: Boolean = false,
    @SerialName("is_out_of_stock") val isOutOfStock: Boolean = false
)

@Serializable
data class MaterialStats(
    @SerialName("total_count") val totalCount: Int = 0,
    @SerialName("in_stock") val inStock: Int = 0,
    @SerialName("low_stock") val lowStock: Int = 0,
    @SerialName("out_of_stock") val outOfStock: Int = 0,
    @SerialName("on_order") val onOrder: Int = 0,
    @SerialName("total_value") val totalValue: Double = 0.0
)

@Serializable
data class MaterialsResponse(
    val materials: List<Material> = emptyList(),
    val stats: MaterialStats? = null,
    val page: Int = 1,
    @SerialName("page_size") val pageSize: Int = 50,
    val total: Int = 0,
    @SerialName("total_pages") val totalPages: Int = 0
)

@Serializable
data class CreateMaterialRequest(
    val name: String,
    val description: String? = null,
    val category: String = "OTHER",
    val sku: String? = null,
    val unit: String = "each",
    @SerialName("quantity_on_hand") val quantityOnHand: Double = 0.0,
    @SerialName("minimum_quantity") val minimumQuantity: Double = 0.0,
    @SerialName("cost_per_unit") val costPerUnit: Double = 0.0,
    val supplier: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    val location: String? = null,
    val status: String = "IN_STOCK",
    val notes: String? = null
)

@Serializable
data class UpdateMaterialRequest(
    val name: String? = null,
    val description: String? = null,
    val category: String? = null,
    val sku: String? = null,
    val unit: String? = null,
    @SerialName("quantity_on_hand") val quantityOnHand: Double? = null,
    @SerialName("minimum_quantity") val minimumQuantity: Double? = null,
    @SerialName("cost_per_unit") val costPerUnit: Double? = null,
    val supplier: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    val location: String? = null,
    val status: String? = null,
    val notes: String? = null
)

// Material Orders

@Serializable
data class MaterialOrder(
    val id: String,
    @SerialName("material_id") val materialId: String,
    @SerialName("material_name") val materialName: String? = null,
    @SerialName("material_sku") val materialSku: String? = null,
    @SerialName("material_unit") val materialUnit: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("project_name") val projectName: String? = null,
    val quantity: Double = 0.0,
    @SerialName("cost_per_unit") val costPerUnit: Double = 0.0,
    @SerialName("total_cost") val totalCost: Double = 0.0,
    val supplier: String = "",
    @SerialName("order_date") val orderDate: String? = null,
    @SerialName("expected_delivery_date") val expectedDeliveryDate: String? = null,
    @SerialName("actual_delivery_date") val actualDeliveryDate: String? = null,
    val status: String = "PENDING", // PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
    @SerialName("ordered_by_id") val orderedById: String? = null,
    @SerialName("ordered_by_name") val orderedByName: String? = null,
    @SerialName("ordered_by_email") val orderedByEmail: String? = null,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class MaterialOrderStats(
    @SerialName("total_count") val totalCount: Int = 0,
    val pending: Int = 0,
    val confirmed: Int = 0,
    val shipped: Int = 0,
    val delivered: Int = 0,
    val cancelled: Int = 0,
    @SerialName("total_value") val totalValue: Double = 0.0
)

@Serializable
data class MaterialOrdersResponse(
    val orders: List<MaterialOrder> = emptyList(),
    val stats: MaterialOrderStats? = null,
    val page: Int = 1,
    @SerialName("page_size") val pageSize: Int = 25,
    val total: Int = 0,
    @SerialName("total_pages") val totalPages: Int = 0
)

@Serializable
data class CreateMaterialOrderRequest(
    @SerialName("material_id") val materialId: String,
    @SerialName("project_id") val projectId: String? = null,
    val quantity: Double,
    @SerialName("cost_per_unit") val costPerUnit: Double? = null,
    val supplier: String,
    @SerialName("order_date") val orderDate: String? = null,
    @SerialName("expected_delivery_date") val expectedDeliveryDate: String? = null,
    val status: String = "PENDING",
    val notes: String? = null
)

@Serializable
data class UpdateMaterialOrderRequest(
    val quantity: Double? = null,
    @SerialName("cost_per_unit") val costPerUnit: Double? = null,
    val supplier: String? = null,
    @SerialName("expected_delivery_date") val expectedDeliveryDate: String? = null,
    @SerialName("actual_delivery_date") val actualDeliveryDate: String? = null,
    val status: String? = null,
    val notes: String? = null
)

// Material Usage

@Serializable
data class MaterialUsage(
    val id: String,
    @SerialName("material_id") val materialId: String,
    @SerialName("material_name") val materialName: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("project_name") val projectName: String? = null,
    @SerialName("daily_log_id") val dailyLogId: String? = null,
    @SerialName("used_by_id") val usedById: String? = null,
    @SerialName("used_by_name") val usedByName: String? = null,
    val quantity: Double = 0.0,
    val unit: String = "each",
    @SerialName("usage_date") val usageDate: String? = null,
    val purpose: String? = null,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class MaterialUsageResponse(
    val usage: List<MaterialUsage> = emptyList(),
    val page: Int = 1,
    @SerialName("page_size") val pageSize: Int = 50,
    val total: Int = 0,
    @SerialName("total_pages") val totalPages: Int = 0
)

@Serializable
data class RecordMaterialUsageRequest(
    @SerialName("material_id") val materialId: String,
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("daily_log_id") val dailyLogId: String? = null,
    val quantity: Double,
    val purpose: String? = null,
    val notes: String? = null
)
