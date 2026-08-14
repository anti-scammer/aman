package ps.antiscammer.antiscammer

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Draws a red warning card over whatever the user is doing when a suspicious
 * incoming call or SMS is detected. RTL-aware (Arabic first, English second).
 * Requires SYSTEM_ALERT_WINDOW; when the permission is missing — or the
 * service cannot be started from the background — the caller degrades to a
 * heads-up notification. The card auto-dismisses after 12 seconds.
 */
class ScamOverlayService : Service() {

    companion object {
        const val EXTRA_KIND = "kind" // "call" | "sms"
        const val EXTRA_NUMBER = "number"
        const val EXTRA_REPORTS = "reports"
        const val EXTRA_CATEGORY = "category"
        const val EXTRA_DETAIL = "detail"
        private const val AUTO_DISMISS_MS = 12_000L

        /** Show the warning overlay, falling back to a heads-up notification. */
        fun show(
            context: Context,
            kind: String,
            number: String,
            reports: Int,
            category: String?,
            detail: String? = null,
        ) {
            if (!Settings.canDrawOverlays(context)) {
                NotificationHelper.showWarning(
                    context, title(kind), body(number, reports, category, detail),
                )
                return
            }
            try {
                context.startService(
                    Intent(context, ScamOverlayService::class.java)
                        .putExtra(EXTRA_KIND, kind)
                        .putExtra(EXTRA_NUMBER, number)
                        .putExtra(EXTRA_REPORTS, reports)
                        .putExtra(EXTRA_CATEGORY, category)
                        .putExtra(EXTRA_DETAIL, detail),
                )
            } catch (_: Exception) {
                // Background start limits — degrade to a notification.
                NotificationHelper.showWarning(
                    context, title(kind), body(number, reports, category, detail),
                )
            }
        }

        fun title(kind: String): String = if (kind == "sms") {
            "⚠ رسالة مشبوهة / Suspected scam SMS"
        } else {
            "⚠ مكالمة مشبوهة / Suspected scam call"
        }

        fun body(number: String, reports: Int, category: String?, detail: String?): String {
            val parts = mutableListOf<String>()
            if (number.isNotBlank()) parts.add(number)
            if (reports > 0) parts.add("عدد البلاغات: $reports / reports: $reports")
            if (!category.isNullOrBlank()) parts.add(categoryLabel(category))
            if (!detail.isNullOrBlank()) parts.add(detail)
            return parts.joinToString(" — ")
        }

        /** Arabic-first labels for the backend's scam categories. */
        fun categoryLabel(category: String): String = when (category) {
            "PRIZE_SCAM" -> "احتيال الجوائز / Prize scam"
            "DELIVERY_SCAM" -> "احتيال التوصيل / Delivery scam"
            "JOB_SCAM" -> "احتيال الوظائف / Job scam"
            "BANK_PHISHING" -> "تصيّد مصرفي / Bank phishing"
            "OTP_THEFT" -> "سرقة رمز التحقق / OTP theft"
            "FAKE_SHOP" -> "متجر وهمي / Fake shop"
            "CHARITY_SCAM" -> "احتيال التبرعات / Charity scam"
            "CRYPTO_SCAM" -> "احتيال العملات الرقمية / Crypto scam"
            else -> "احتيال / Scam"
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var overlayView: View? = null
    private val dismissRunnable = Runnable { dismiss() }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val kind = intent?.getStringExtra(EXTRA_KIND) ?: "call"
        val number = intent?.getStringExtra(EXTRA_NUMBER) ?: ""
        val reports = intent?.getIntExtra(EXTRA_REPORTS, 0) ?: 0
        val category = intent?.getStringExtra(EXTRA_CATEGORY)
        val detail = intent?.getStringExtra(EXTRA_DETAIL)
        try {
            removeOverlay()
            addOverlay(kind, number, reports, category, detail)
            handler.removeCallbacks(dismissRunnable)
            handler.postDelayed(dismissRunnable, AUTO_DISMISS_MS)
        } catch (_: Exception) {
            NotificationHelper.showWarning(this, title(kind), body(number, reports, category, detail))
            stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(dismissRunnable)
        removeOverlay()
        super.onDestroy()
    }

    private fun dismiss() {
        handler.removeCallbacks(dismissRunnable)
        removeOverlay()
        stopSelf()
    }

    private fun removeOverlay() {
        val view = overlayView ?: return
        overlayView = null
        try {
            (getSystemService(Context.WINDOW_SERVICE) as WindowManager).removeView(view)
        } catch (_: Exception) {
            // Already removed.
        }
    }

    private fun addOverlay(kind: String, number: String, reports: Int, category: String?, detail: String?) {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            // Arabic-first: lay the card out right-to-left.
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            textDirection = View.TEXT_DIRECTION_RTL
            setPadding(dp(20), dp(16), dp(20), dp(16))
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#C62828")) // warning red
                cornerRadius = dp(20).toFloat()
                setStroke(dp(2), Color.parseColor("#FFCDD2"))
            }
        }

        card.addView(TextView(this).apply {
            text = title(kind)
            setTextColor(Color.WHITE)
            textSize = 18f
            setTypeface(typeface, Typeface.BOLD)
        })

        if (number.isNotBlank()) {
            card.addView(TextView(this).apply {
                text = number
                // Phone numbers always render left-to-right.
                textDirection = View.TEXT_DIRECTION_LTR
                setTextColor(Color.WHITE)
                textSize = 22f
                setTypeface(typeface, Typeface.BOLD)
                setPadding(0, dp(6), 0, 0)
            })
        }

        val infoParts = mutableListOf<String>()
        if (reports > 0) infoParts.add("عدد البلاغات: $reports / Community reports: $reports")
        if (!category.isNullOrBlank()) infoParts.add(categoryLabel(category))
        if (!detail.isNullOrBlank()) infoParts.add(detail)
        if (infoParts.isNotEmpty()) {
            card.addView(TextView(this).apply {
                text = infoParts.joinToString("\n")
                setTextColor(Color.parseColor("#FFEBEE"))
                textSize = 14f
                setPadding(0, dp(6), 0, 0)
            })
        }

        card.addView(Button(this).apply {
            text = "تجاهل / Dismiss"
            setTextColor(Color.parseColor("#C62828"))
            background = GradientDrawable().apply {
                setColor(Color.WHITE)
                cornerRadius = dp(12).toFloat()
            }
            setOnClickListener { dismiss() }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = dp(10) }
        })

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = dp(32)
        }

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), 0, dp(12), 0)
            addView(
                card,
                LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                ),
            )
        }

        (getSystemService(Context.WINDOW_SERVICE) as WindowManager).addView(container, params)
        overlayView = container
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
