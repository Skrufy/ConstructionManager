package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

// Search result types - must match API response (uppercase with underscores)
object SearchResultType {
    const val PROJECT = "PROJECT"
    const val DAILY_LOG = "DAILY_LOG"
    const val DOCUMENT = "DOCUMENT"
    const val CLIENT = "CLIENT"
    const val WARNING = "WARNING"
    const val USER = "USER"
    const val TASK = "TASK"
    const val SUBCONTRACTOR = "SUBCONTRACTOR"
    const val RFI = "RFI"
    const val EMPLOYEE = "EMPLOYEE"
}

@Serializable
data class SearchResult(
    val type: String,
    val id: String,
    val title: String,
    val subtitle: String? = null
)

@Serializable
data class SearchResponse(
    val results: List<SearchResult>? = null,
    val projects: List<SearchResult>? = null,
    val dailyLogs: List<SearchResult>? = null,
    val documents: List<SearchResult>? = null,
    val clients: List<SearchResult>? = null,
    val warnings: List<SearchResult>? = null
)
