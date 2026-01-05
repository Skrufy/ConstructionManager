package com.constructionpro.app.ui.sync

import android.app.Application
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.constructionpro.app.data.local.ConflictResolution
import com.constructionpro.app.data.local.SyncManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * ViewModel for managing sync state across the app
 */
class SyncViewModel(application: Application) : AndroidViewModel(application) {

    private val syncManager = SyncManager.getInstance(application)

    // Sync state from SyncManager
    val syncState: StateFlow<SyncManager.SyncState> = syncManager.syncState

    // Network connectivity state
    private val _isOnline = MutableStateFlow(true)
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()

    // Connectivity manager for monitoring network changes
    private val connectivityManager =
        application.getSystemService(ConnectivityManager::class.java)

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            _isOnline.value = true
            // Trigger sync when coming back online
            viewModelScope.launch {
                syncManager.syncAll()
            }
        }

        override fun onLost(network: Network) {
            _isOnline.value = false
        }

        override fun onCapabilitiesChanged(
            network: Network,
            networkCapabilities: NetworkCapabilities
        ) {
            val hasInternet = networkCapabilities.hasCapability(
                NetworkCapabilities.NET_CAPABILITY_INTERNET
            )
            _isOnline.value = hasInternet
        }
    }

    init {
        // Register network callback
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        connectivityManager?.registerNetworkCallback(networkRequest, networkCallback)

        // Check initial connectivity
        checkConnectivity()

        // Refresh sync state on init
        viewModelScope.launch {
            syncManager.refreshSyncState()
        }
    }

    private fun checkConnectivity() {
        val network = connectivityManager?.activeNetwork
        val capabilities = connectivityManager?.getNetworkCapabilities(network)
        _isOnline.value = capabilities?.hasCapability(
            NetworkCapabilities.NET_CAPABILITY_INTERNET
        ) == true
    }

    /**
     * Trigger a full sync
     */
    fun syncNow() {
        viewModelScope.launch {
            syncManager.syncAll()
        }
    }

    /**
     * Retry all failed sync actions
     */
    fun retryFailed() {
        viewModelScope.launch {
            syncManager.retryFailed()
            syncManager.syncAll()
        }
    }

    /**
     * Clear all failed sync actions
     */
    fun clearFailed() {
        viewModelScope.launch {
            syncManager.clearFailed()
        }
    }

    /**
     * Resolve a specific conflict
     */
    fun resolveConflict(actionId: String, resolution: ConflictResolution) {
        viewModelScope.launch {
            syncManager.resolveConflict(actionId, resolution)
            syncManager.refreshSyncState()
        }
    }

    /**
     * Refresh sync state from database
     */
    fun refreshSyncState() {
        viewModelScope.launch {
            syncManager.refreshSyncState()
        }
    }

    override fun onCleared() {
        super.onCleared()
        try {
            connectivityManager?.unregisterNetworkCallback(networkCallback)
        } catch (e: Exception) {
            // Callback may not have been registered
        }
    }
}
