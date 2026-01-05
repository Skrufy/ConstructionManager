package com.constructionpro.app.features.projects.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.constructionpro.app.features.projects.data.ProjectDetail
import com.constructionpro.app.features.projects.data.ProjectSummary
import com.constructionpro.app.features.projects.data.ProjectsRepository
import com.constructionpro.app.features.projects.data.ProjectsResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProjectsListState(
    val projects: List<ProjectSummary> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isOffline: Boolean = false,
    val selectedStatus: String? = null,
    val searchQuery: String = ""
)

data class ProjectDetailState(
    val project: ProjectDetail? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ProjectsViewModel @Inject constructor(
    private val repository: ProjectsRepository
) : ViewModel() {

    private val _listState = MutableStateFlow(ProjectsListState())
    val listState: StateFlow<ProjectsListState> = _listState.asStateFlow()

    private val _detailState = MutableStateFlow(ProjectDetailState())
    val detailState: StateFlow<ProjectDetailState> = _detailState.asStateFlow()

    init {
        loadProjects()
    }

    fun loadProjects(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            repository.getProjects(
                status = _listState.value.selectedStatus,
                search = _listState.value.searchQuery.takeIf { it.isNotBlank() },
                forceRefresh = forceRefresh
            ).collect { result ->
                when (result) {
                    is ProjectsResult.Loading -> {
                        _listState.update { it.copy(isLoading = true, error = null) }
                    }
                    is ProjectsResult.Success -> {
                        _listState.update {
                            it.copy(
                                projects = result.data,
                                isLoading = false,
                                error = null,
                                isOffline = false
                            )
                        }
                    }
                    is ProjectsResult.Error -> {
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

    fun loadProject(id: String) {
        viewModelScope.launch {
            _detailState.update { it.copy(isLoading = true, error = null) }

            when (val result = repository.getProject(id)) {
                is ProjectsResult.Success -> {
                    _detailState.update {
                        it.copy(project = result.data, isLoading = false, error = null)
                    }
                }
                is ProjectsResult.Error -> {
                    _detailState.update {
                        it.copy(isLoading = false, error = result.message)
                    }
                }
                is ProjectsResult.Loading -> {
                    // Already handled above
                }
            }
        }
    }

    fun setStatusFilter(status: String?) {
        _listState.update { it.copy(selectedStatus = status) }
        loadProjects()
    }

    fun setSearchQuery(query: String) {
        _listState.update { it.copy(searchQuery = query) }
        loadProjects()
    }

    fun clearDetailError() {
        _detailState.update { it.copy(error = null) }
    }

    fun refresh() {
        loadProjects(forceRefresh = true)
    }
}
