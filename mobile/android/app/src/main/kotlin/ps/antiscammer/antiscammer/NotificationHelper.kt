package ps.antiscammer.antiscammer

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build

/**
 * Heads-up "scam warning" notifications, used as a fallback whenever the
 * overlay cannot be shown (SYSTEM_ALERT_WINDOW not granted, or the overlay
 * service could not be started from the background).
 */
object NotificationHelper {
    private const val CHANNEL_ID = "scam_warnings"
    private var nextId = 100

    fun showWarning(context: Context, title: String, text: String) {
        try {
            val manager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "تحذيرات الاحتيال / Scam warnings",
                    NotificationManager.IMPORTANCE_HIGH,
                )
                channel.description = "تنبيهات فورية عند رصد مكالمة أو رسالة مشبوهة"
                manager.createNotificationChannel(channel)
            }
            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val contentIntent = if (launch != null) {
                PendingIntent.getActivity(
                    context,
                    0,
                    launch,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
            } else {
                null
            }
            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(context, CHANNEL_ID)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(context).setPriority(Notification.PRIORITY_HIGH)
            }
            builder
                .setSmallIcon(android.R.drawable.stat_sys_warning)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true)
            if (contentIntent != null) builder.setContentIntent(contentIntent)
            manager.notify(nextId++, builder.build())
        } catch (_: Exception) {
            // Never crash the caller (receiver / screening service) over a notification.
        }
    }
}
