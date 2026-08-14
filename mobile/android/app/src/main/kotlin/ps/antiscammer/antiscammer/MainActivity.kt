package ps.antiscammer.antiscammer

import android.app.Activity
import android.app.role.RoleManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * Hosts the "ps.antiscammer/protection" MethodChannel used by the Real-time
 * Protection feature (lib/services/protection_service.dart):
 *
 *  - permission / role queries and requests (call screening role, overlay,
 *    RECEIVE_SMS + POST_NOTIFICATIONS),
 *  - blocklist persistence ("writeBlocklist" / "getBlocklistInfo") backed by
 *    [BlocklistStore] so the native services can read it while the app is dead,
 *  - "showTestOverlay" / "showSmsOverlay" demo & warning triggers,
 *  - Dart-bound "onSuspiciousSms" events via [ProtectionBridge].
 */
class MainActivity : FlutterActivity() {

    companion object {
        private const val CHANNEL = "ps.antiscammer/protection"
        private const val REQ_ROLE = 4711
        private const val REQ_SMS = 4712
    }

    private var pendingRoleResult: MethodChannel.Result? = null
    private var pendingSmsResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
        ProtectionBridge.channel = channel
        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "isProtectionSupported" -> result.success(true)

                "hasCallScreeningRole" -> result.success(hasCallScreeningRole())
                "requestCallScreeningRole" -> requestCallScreeningRole(result)

                "hasOverlayPermission" -> result.success(Settings.canDrawOverlays(this))
                "requestOverlayPermission" -> {
                    if (!Settings.canDrawOverlays(this)) {
                        try {
                            startActivity(
                                Intent(
                                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                    Uri.parse("package:$packageName"),
                                ),
                            )
                        } catch (_: Exception) {
                            // Some OEM builds lack the per-app screen; ignore.
                        }
                    }
                    // Granted in system settings; Dart re-checks on resume.
                    result.success(Settings.canDrawOverlays(this))
                }

                "hasSmsPermission" -> result.success(hasSmsPermission())
                "requestSmsPermission" -> requestSmsPermission(result)

                "showTestOverlay" -> {
                    ScamOverlayService.show(
                        this,
                        kind = "call",
                        number = "+970599123456",
                        reports = 3,
                        category = "PRIZE_SCAM",
                    )
                    result.success(true)
                }

                "showSmsOverlay" -> {
                    // Invoked by Dart after a full /analyze-message run flagged
                    // an SMS that the native-lite check had forwarded.
                    val sender = call.argument<String>("sender") ?: ""
                    val detail = call.argument<String>("detail")
                    ScamOverlayService.show(
                        this,
                        kind = "sms",
                        number = sender,
                        reports = call.argument<Int>("reports") ?: 0,
                        category = call.argument<String>("category"),
                        detail = detail,
                    )
                    result.success(true)
                }

                "writeBlocklist" -> {
                    val json = call.argument<String>("json")
                    if (json == null) {
                        result.error("ARGS", "Missing 'json' argument", null)
                    } else {
                        try {
                            result.success(BlocklistStore.write(applicationContext, json))
                        } catch (e: Exception) {
                            result.error("WRITE_FAILED", e.message, null)
                        }
                    }
                }
                "getBlocklistInfo" -> result.success(BlocklistStore.info(applicationContext))

                else -> result.notImplemented()
            }
        }
    }

    override fun cleanUpFlutterEngine(flutterEngine: FlutterEngine) {
        ProtectionBridge.channel = null
        super.cleanUpFlutterEngine(flutterEngine)
    }

    // ------------------------------------------------------ call screening role

    private fun hasCallScreeningRole(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
        val roleManager = getSystemService(RoleManager::class.java) ?: return false
        return roleManager.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING) &&
            roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
    }

    private fun requestCallScreeningRole(result: MethodChannel.Result) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            result.success(false)
            return
        }
        if (hasCallScreeningRole()) {
            result.success(true)
            return
        }
        val roleManager = getSystemService(RoleManager::class.java)
        if (roleManager == null || !roleManager.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) {
            result.success(false)
            return
        }
        if (pendingRoleResult != null) {
            result.success(false)
            return
        }
        pendingRoleResult = result
        startActivityForResult(
            roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING),
            REQ_ROLE,
        )
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_ROLE) {
            pendingRoleResult?.success(resultCode == Activity.RESULT_OK)
            pendingRoleResult = null
        }
    }

    // ------------------------------------------------------------ sms permission

    private fun hasSmsPermission(): Boolean =
        checkSelfPermission(android.Manifest.permission.RECEIVE_SMS) ==
            PackageManager.PERMISSION_GRANTED

    private fun requestSmsPermission(result: MethodChannel.Result) {
        if (hasSmsPermission()) {
            result.success(true)
            return
        }
        if (pendingSmsResult != null) {
            result.success(false)
            return
        }
        pendingSmsResult = result
        val permissions = mutableListOf(android.Manifest.permission.RECEIVE_SMS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Piggyback the notification permission so the heads-up fallback
            // warning can be shown on Android 13+.
            permissions.add(android.Manifest.permission.POST_NOTIFICATIONS)
        }
        requestPermissions(permissions.toTypedArray(), REQ_SMS)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_SMS) {
            pendingSmsResult?.success(hasSmsPermission())
            pendingSmsResult = null
        }
    }
}
