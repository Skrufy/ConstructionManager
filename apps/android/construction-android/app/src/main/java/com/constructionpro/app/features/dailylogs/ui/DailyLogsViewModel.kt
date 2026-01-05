package com.constructionpro.app.features.dailylogs.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.constructionpro.app.data.local.PendingActionDao
import com.constructionpro.app.features.dailylogs.data.DailyLogDetail
import com.constructionpro.app.features.dailylogs.data.DailyLogSummary
import com.constructionpro.app.features.dailylogs.data.DailyLogsRepository
import com.constructionpro.app.features.dailylogs.data.DailyLogsResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

enum class UiSyncState {
    IDLE,
    SYNCING,
    OFFLINE,
    ERROR
}

data class DailyLogsListState(
    val logs: List<DailyLogSummary> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isOffline: Boolean = false,
    val selectedProjectId: String? = null,
    val selectedStatus: String? = null,
    val searchQuery: String = "",
    val syncState: UiSyncState = UiSyncState.IDLE,
    val pendingCount: Int = 0
)

data class DailyLogDetailState(
    val log: DailyLogDetail? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

data class CreateDailyLogState(
    val isCreating: Boolean = false,
    val createdLogId: String? = null,
    val error: String? = null
)

@HiltViewModel
class DailyLogsViewModel @Inject constructor(
    private val repository: DailyLogsRepository,
    private val pendingActionDao: PendingActionDao
) : ViewModel() {

    private val _listState = MutableStateFlow(DailyLogsListState())
    val listState: StateFlow<DailyLogsListState> = _listState.asStateFlow()

    private val _detailState = MutableStateFlow(DailyLogDetailState())
    val detailState: StateFlow<DailyLogDetailState> = _detailState.asStateFlow()

    private val _createState = MutableStateFlow(CreateDailyLogState())
    val createState: StateFlow<CreateDailyLogState> = _createState.asStateFlow()

    init {
        loadPendingCount()
        loadDailyLogs()
    }

    private fun loadPendingCount() {
        viewModelScope.launch {
            // Count pending daily log actions
            val pendingCount = pendingActionDao.countByType("CREATE_DAILY_LOG", "pending") +
                    pendingActionDao.countByType("UPDATE_DAILY_LOG", "pending") +
                    pendingActionDao.countByType("SUBMIT_DAILY_LOG", "pending")
            _listState.update { it.copy(pendingCount = pendingCount) }
        }
    }

    fun loadDailyLogs(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            repository.getDailyLogs(
                projectId = _listState.value.selectedProjectId,
                status = _listState.value.selectedStatus,
                forceRefresh = forceRefresh
            ).collect { result ->
                when (result) {
                    is DailyLogsResult.Loading -> {
                        _listState.update { it.copy(isLoading = true, error = null) }
                    }
                    is DailyLogsResult.Success -> {
                        val filteredLogs = if (_listState.value.searchQuery.isNotBlank()) {
                            result.data.filter { log ->
                                log.projectName.contains(_listState.value.searchQuery, ignoreCase = true) ||
                                        log.submitterName.contains(_listState.value.searchQuery, ignoreCase = true) ||
                                        log.notes?.contains(_listState.value.searchQuery, ignoreCase = true) == true
                            }
                        } else {
                            result.data
                        }
                        _listState.update {
                            it.copy(
                                logs = filteredLogs,
                                isLoading = false,
                                error = null,
                                isOffline = false
                            )
                        }
                    }
                    is DailyLogsResult.Error -> {
                        _listState.update {
                            it.copy(
                                isLoading = false,
                                error = result.message,
                                isOffline = result.isOffline
                            )
                        }
                    }
                }
            }
        }
    }

    fun loadDailyLog(id: String) {
        viewModelScope.launch {
            _detailState.update { it.copy(isLoading = true, error = null) }

            when (val result = repository.getDailyLog(id)) {
                is DailyLogsResult.Success -> {
                    _detailState.update {
                        it.copy(log = result.data, isLoading = false, error = null)
                    }
                }
                is DailyLogsResult.Error -> {
                    _detailState.update {
                        it.copy(isLoading = false, error = result.message)
                    }
                }
                is DailyLogsResult.Loading -> {
                    // Already handled above
                }
            }
        }
    }

    fun setProjectFilter(projectId: String?) {
        _listState.update { it.copy(selectedProjectId = projectId) }
        loadDailyLogs()
    }

    fun setStatusFilter(status: String?) {
        _listState.update { it.copy(selectedStatus = status) }
        loadDailyLogs()
    }

    fun setSearchQuery(query: String) {
        _listState.update { it.copy(searchQuery = query) }
        loadDailyLogs()
    }

    fun createDailyLog(
        projectId: String,
        date: LocalDate,
        notes: String?,
        weatherDelay: Boolean = false,
        weatherDelayNotes: String? = null,
        gpsLatitude: Double? = null,
        gpsLongitude: Double? = null
    ) {
        viewModelScope.launch {
            _createState.update { it.copy(isCreating = true, error = null) }

            when (val result = repository.createDailyLog(
                projectId = projectId,
                date = date,
                notes = notes,
                weatherDelay = weatherDelay,
                weatherDelayNotes = weatherDelayNotes,
                gpsLatitude = gpsLatitude,
                gpsLongitude = gpsLongitude
            )) {
                is DailyLogsResult.Success -> {
                    _createState.update {
                        it.copy(isCreating = false, createdLogId = result.data, error = null)
                    }
                    loadDailyLogs(forceRefresh = true)
                }
                is DailyLogsResult.Error -> {
                    _createState.update {
                        it.copy(isCreating = false, error = result.message)
                    }
                }
                is DailyLogsResult.Loading -> {
                    // Already handled above
                }
            }
        }
    }

    fun updateDailyLog(
        id: String,
        notes: String?,
        weatherDelay: Boolean?,
        weatherDelayNotes: String?
    ) {
        viewModelScope.launch {
            when (val result = repository.updateDailyLog(id, notes, weatherDelay, weatherDelayNotes)) {
                is DailyLogsResult.Success -> {
                    loadDailyLog(id)
                }
                is DailyLogsResult.Error -> {
                    _detailState.update { it.copy(error = result.message) }
                }
                is DailyLogsResult.Loading -> {
                    // No-op
                }
            }
        }
    }

    fun submitDailyLog(id: String) {
        viewModelScope.launch {
            when (val result = repository.submitDailyLog(id)) {
                is DailyLogsResult.Success -> {
                    loadDailyLog(id)
                    loadDailyLogs(forceRefresh = true)
                }
                is DailyLogsResult.Error -> {
                    _detailState.update { it.copy(error = result.message) }
                }
                is DailyLogsResult.Loading -> {
                    // No-op
                }
            }
        }
    }

    fun clearCreateState() {
        _createState.update { CreateDailyLogState() }
    }

    fun clearDetailError() {
        _detailState.update { it.copy(error = null) }
    }

    fun refresh() {
        loadDailyLogs(forceRefresh = true)
        loadPendingCount()
    }
}
