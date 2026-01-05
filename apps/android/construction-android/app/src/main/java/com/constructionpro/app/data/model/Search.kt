package com.constructionpro.app.data.model

import kotlinx.serialization.Serializable

// Search result types
object SearchResultType {
    const val PROJECT = "project"
    const val DAILY_LOG = "daily-log"
    const val DOCUMENT = "document"
    const val CLIENT = "client"
    const val WARNING = "warning"
    const val USER = "user"
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
