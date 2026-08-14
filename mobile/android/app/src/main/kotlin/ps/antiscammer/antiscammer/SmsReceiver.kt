package ps.antiscammer.antiscammer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

/**
 * Listens for incoming SMS (RECEIVE_SMS, granted from the Protection tab) and
 * runs a two-tier scam check:
 *
 * 1. Native "lite" check — always available, even when the Flutter engine is
 *    dead: the sender is matched against the synced blocklist file and the
 *    message body against a small hardcoded ar/en keyword list mirroring the
 *    backend's strongest rules. A hit shows the warning overlay, or a
 *    heads-up notification when the overlay permission is missing.
 * 2. Full analysis — when the app (Flutter engine) is running, sender + body
 *    are forwarded over the MethodChannel so Dart can call the backend's
 *    POST /analyze-message and show a richer, localized warning.
 *
 * Deliberate tradeoff: we do NOT spin up a headless background Dart isolate
 * for SMS received while the app is dead. That would require a custom
 * background engine + Dart callback registration for little gain — the native
 * blocklist + keyword check already covers the dangerous cases offline, and
 * the full backend analysis runs whenever the app is alive.
 */
class SmsReceiver : BroadcastReceiver() {

    companion object {
        /**
         * Mirrors the strongest scam signals of the backend/Dart rule set
         * (prize, OTP theft, phishing-pressure phrasing). Lowercase matching.
         */
        private val SCAM_KEYWORDS = listOf(
            // Arabic
            "ربحت", "جائزة", "مبروك", "رمز التحقق", "بطاقة شحن", "حوالة",
            "حسابك سيغلق", "اضغط على الرابط", "رسوم التوصيل", "عرض محدود",
            // English
            "you won", "prize", "congratulations", "verification code", "otp",
            "account suspended", "click the link", "delivery fee", "urgent",
        )

        fun looksLikeScam(body: String): Boolean {
            if (body.isBlank()) return false
            val lower = body.lowercase()
            return SCAM_KEYWORDS.any { lower.contains(it) }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val messages = try {
            Telephony.Sms.Intents.getMessagesFromIntent(intent)
        } catch (_: Exception) {
            null
        } ?: return
        if (messages.isEmpty()) return

        // Assemble multipart SMS: all PDUs of one logical message arrive in a
        // single broadcast; concatenate the parts from the same sender.
        val sender = messages.firstOrNull()?.originatingAddress ?: ""
        val body = messages
            .filterNotNull()
            .filter { it.originatingAddress == sender || sender.isEmpty() }
            .joinToString("") { it.messageBody ?: "" }
        if (sender.isEmpty() && body.isEmpty()) return

        val entry = BlocklistStore.lookup(context, sender)
        val keywordHit = looksLikeScam(body)

        // Tier 2: hand off to Dart for the full backend analysis when alive.
        val forwardedToDart = ProtectionBridge.notifySuspiciousSms(sender, body)

        // Tier 1: native-lite verdict. A blocklisted sender always warns
        // immediately; a keyword-only hit warns natively only when Dart could
        // not take over (otherwise Dart shows the richer analysis warning).
        if (entry != null) {
            ScamOverlayService.show(
                context,
                kind = "sms",
                number = sender,
                reports = entry.reports,
                category = entry.category,
            )
        } else if (keywordHit && !forwardedToDart) {
            ScamOverlayService.show(
                context,
                kind = "sms",
                number = sender,
                reports = 0,
                category = null,
                detail = "نص الرسالة يشبه رسائل الاحتيال المعروفة / Message text matches known scam patterns",
            )
        }
    }
}
