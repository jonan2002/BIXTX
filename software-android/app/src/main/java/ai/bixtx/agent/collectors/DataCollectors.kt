package ai.bixtx.agent.collectors

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.BatteryManager
import android.os.Build
import android.os.StatFs
import android.provider.Settings
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import java.net.NetworkInterface

class DataCollectors(private val ctx: Context) {

    @Volatile private var lastLocation: Location? = null

    init {
        startLocationUpdates()
    }

    fun snapshot(): Map<String, Any?> {
        val map = mutableMapOf<String, Any?>()

        // Device identity
        map["deviceModel"]   = "${Build.MANUFACTURER} ${Build.MODEL}"
        map["androidVersion"]= Build.VERSION.RELEASE
        map["sdkInt"]        = Build.VERSION.SDK_INT
        map["deviceId"]      = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ANDROID_ID)
        map["brand"]         = Build.BRAND
        map["agentVersion"]  = ai.bixtx.agent.Config.AGENT_VERSION
        map["platform"]      = ai.bixtx.agent.Config.PLATFORM

        // Storage
        val stat = StatFs(ctx.filesDir.path)
        map["freeStorageMB"] = stat.availableBytes / 1_048_576
        map["totalStorageMB"]= stat.totalBytes / 1_048_576

        // Battery
        val batteryIntent = ctx.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level  = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale  = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val status = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        map["batteryPercent"]= if (level >= 0 && scale > 0) (level * 100 / scale) else -1
        map["batteryStatus"] = when (status) {
            BatteryManager.BATTERY_STATUS_CHARGING    -> "charging"
            BatteryManager.BATTERY_STATUS_FULL        -> "full"
            BatteryManager.BATTERY_STATUS_DISCHARGING -> "discharging"
            else -> "unknown"
        }

        // Network
        val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val caps = cm.getNetworkCapabilities(cm.activeNetwork)
        map["networkType"] = when {
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)     == true -> "wifi"
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "cellular"
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true -> "ethernet"
            else -> "none"
        }

        // WiFi SSID
        if (map["networkType"] == "wifi") {
            @SuppressLint("MissingPermission")
            val wm = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val info = wm?.connectionInfo
            map["wifiSsid"] = info?.ssid?.trim('"') ?: ""
            val ip = info?.ipAddress ?: 0
            map["wifiIp"]   = "%d.%d.%d.%d".format(ip and 0xff, ip shr 8 and 0xff, ip shr 16 and 0xff, ip shr 24 and 0xff)
        }

        // Carrier
        val tm = ctx.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        map["carrier"]   = tm?.networkOperatorName ?: ""
        map["countryIso"]= tm?.networkCountryIso ?: ""

        // Local IP (for non-WiFi)
        try {
            val localIp = NetworkInterface.getNetworkInterfaces()?.toList()
                ?.flatMap { it.inetAddresses.toList() }
                ?.firstOrNull { !it.isLoopbackAddress && it.hostAddress?.contains(':') == false }
                ?.hostAddress
            map["localIp"] = localIp ?: ""
        } catch (_: Exception) {}

        // Location
        lastLocation?.let { loc ->
            map["latitude"]  = loc.latitude
            map["longitude"] = loc.longitude
            map["altitude"]  = loc.altitude
            map["locationAccuracy"] = loc.accuracy
            map["locationTs"]= loc.time
        }

        // Timezone
        map["timeZone"]  = java.util.TimeZone.getDefault().id
        map["ts"]        = System.currentTimeMillis()

        return map
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) return
        try {
            val lm = ctx.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val provider = when {
                lm.isProviderEnabled(LocationManager.GPS_PROVIDER)     -> LocationManager.GPS_PROVIDER
                lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
                else -> return
            }
            lm.requestLocationUpdates(provider, 30_000L, 50f, object : LocationListener {
                override fun onLocationChanged(loc: Location) { lastLocation = loc }
            })
            // Seed with last known location immediately
            lastLocation = lm.getLastKnownLocation(provider)
        } catch (_: Exception) {}
    }
}
