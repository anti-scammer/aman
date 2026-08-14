package ps.antiscammer.antiscammer

import android.os.Handler
import android.os.Looper
import io.flutter.plugin.common.MethodChannel

/**
 * Static bridge between Android components (SmsReceiver) and the Flutter
 * engine. MainActivity registers the "ps.antiscammer/protection"
 * MethodChannel while the engine is alive and clears it when torn down; the
 * SMS receiver uses it opportunistically to hand messages to Dart for the
 * full backend analysis.
 */
object ProtectionBridge {
    @Volatile
    var channel: MethodChannel? = null

    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * Forward a received SMS to Dart ("onSuspiciousSms"). Returns false when
     * the Flutter engine is not running, so the caller knows it must rely on
     * the native-only check instead.
     */
    fun notifySuspiciousSms(sender: String, body: String): Boolean {
        val ch = channel ?: return false
        mainHandler.post {
            try {
                ch.invokeMethod("onSuspiciousSms", mapOf("sender" to sender, "body" to body))
            } catch (_: Exception) {
                // Engine torn down mid-flight — the native check already ran.
            }
        }
        return true
    }
}
