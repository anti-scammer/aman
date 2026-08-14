package ps.antiscammer.antiscammer

import android.content.Context
import org.json.JSONObject
import java.io.File

/** One synced blocklist entry (mirrors `GET /api/blocklist/phones` entries). */
data class BlockEntry(val number: String, val reports: Int, val category: String)

/**
 * On-device store for the synced phone blocklist.
 *
 * The Dart side downloads `GET /api/blocklist/phones` and hands the JSON to
 * MainActivity over the "writeBlocklist" MethodChannel call, which persists it
 * here as a plain JSON file in the app's private files dir. Both the
 * call-screening service and the SMS receiver read this same file, so
 * screening keeps working even when the Flutter engine is not running.
 * Nothing ever leaves the device.
 *
 * File shape (written by lib/services/protection_service.dart):
 * `{"updatedAt": "...", "syncedAt": 1234, "count": n, "entries": [{"number": "+970...", "reports": n, "category": "PRIZE_SCAM"}]}`
 */
object BlocklistStore {
    private const val FILE_NAME = "scam_blocklist.json"

    private fun file(context: Context) = File(context.filesDir, FILE_NAME)

    /** Persist the JSON produced by the Dart side. Returns the stored info map. */
    fun write(context: Context, json: String): Map<String, Any?> {
        JSONObject(json) // validate before persisting
        file(context).writeText(json)
        return info(context)
    }

    /** count / updatedAt / syncedAt of the stored blocklist (zeros when absent). */
    fun info(context: Context): Map<String, Any?> {
        val root = read(context)
        val count = root?.optJSONArray("entries")?.length() ?: 0
        val updatedAt = root?.optString("updatedAt")?.takeIf { it.isNotEmpty() && it != "null" }
        val syncedAt = if (root != null && root.has("syncedAt") && !root.isNull("syncedAt")) {
            root.optLong("syncedAt")
        } else {
            null
        }
        return mapOf("count" to count, "updatedAt" to updatedAt, "syncedAt" to syncedAt)
    }

    /**
     * Find an entry matching [rawNumber]: exact digit match or same last nine
     * digits, so local (0599...) and international (+970599...) forms match.
     */
    fun lookup(context: Context, rawNumber: String?): BlockEntry? {
        if (rawNumber.isNullOrBlank()) return null
        val incoming = digits(rawNumber)
        if (incoming.length < 7) return null
        val entries = read(context)?.optJSONArray("entries") ?: return null
        for (i in 0 until entries.length()) {
            val obj = entries.optJSONObject(i) ?: continue
            val listed = digits(obj.optString("number"))
            if (listed.isNotEmpty() && matches(incoming, listed)) {
                return BlockEntry(
                    number = obj.optString("number"),
                    reports = obj.optInt("reports", 0),
                    category = obj.optString("category", "OTHER"),
                )
            }
        }
        return null
    }

    private fun read(context: Context): JSONObject? = try {
        val f = file(context)
        if (f.exists()) JSONObject(f.readText()) else null
    } catch (_: Exception) {
        null
    }

    private fun digits(s: String) = s.filter { it.isDigit() }

    private fun matches(a: String, b: String): Boolean {
        if (a == b) return true
        if (a.length < 9 || b.length < 9) return false
        return a.takeLast(9) == b.takeLast(9)
    }
}
