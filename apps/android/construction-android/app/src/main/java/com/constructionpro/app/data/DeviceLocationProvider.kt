package com.constructionpro.app.data

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Looper
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

data class LocationResult(
  val latitude: Double,
  val longitude: Double
)

class DeviceLocationProvider(private val context: Context) {
  private val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager

  @SuppressLint("MissingPermission")
  suspend fun getCurrentLocation(): LocationResult? {
    val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
      .filter { locationManager.isProviderEnabled(it) }

    if (providers.isEmpty()) {
      return null
    }

    val lastKnown = providers
      .mapNotNull { locationManager.getLastKnownLocation(it) }
      .maxByOrNull { it.time }

    if (lastKnown != null) {
      return lastKnown.toResult()
    }

    return suspendCancellableCoroutine { cont ->
      val provider = providers.first()
      val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
          locationManager.removeUpdates(this)
          if (cont.isActive) {
            cont.resume(location.toResult())
          }
        }

        override fun onProviderDisabled(provider: String) {}
        override fun onProviderEnabled(provider: String) {}
        @Deprecated("Deprecated in Android API")
        override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) {}
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        locationManager.getCurrentLocation(provider, null, context.mainExecutor) { location ->
          if (cont.isActive) {
            cont.resume(location?.toResult())
          }
        }
      } else {
        @Suppress("DEPRECATION")
        locationManager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
      }

      cont.invokeOnCancellation { locationManager.removeUpdates(listener) }
    }
  }
}

private fun Location.toResult(): LocationResult {
  return LocationResult(latitude = latitude, longitude = longitude)
}
