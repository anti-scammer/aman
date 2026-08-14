package ps.antiscammer.antiscammer

import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService

/**
 * Screens incoming calls against the on-device blocklist synced from
 * `GET /api/blocklist/phones`.
 *
 * Calls are NEVER blocked, silenced, or rejected — the user always decides —
 * but when the caller appears in community reports a red warning overlay (or
 * a heads-up notification, if the overlay permission is missing) is shown on
 * top of the incoming-call screen.
 *
 * The system only binds this service after the user grants
 * RoleManager.ROLE_CALL_SCREENING (requested from the Protection tab via the
 * "ps.antiscammer/protection" MethodChannel).
 */
class ScamCallScreeningService : CallScreeningService() {

    override fun onScreenCall(callDetails: Call.Details) {
        // Always allow the call: an empty response means no blocking,
        // no silencing, and normal ringing/logging.
        respondToCall(callDetails, CallResponse.Builder().build())

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            callDetails.callDirection != Call.Details.DIRECTION_INCOMING
        ) {
            return
        }

        val number = callDetails.handle?.schemeSpecificPart ?: return
        val entry = BlocklistStore.lookup(applicationContext, number) ?: return
        ScamOverlayService.show(
            applicationContext,
            kind = "call",
            number = number,
            reports = entry.reports,
            category = entry.category,
        )
    }
}
