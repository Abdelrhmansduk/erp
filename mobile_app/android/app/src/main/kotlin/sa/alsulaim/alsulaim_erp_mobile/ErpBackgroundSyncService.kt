package sa.alsulaim.alsulaim_erp_mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

class ErpBackgroundSyncService : Service() {

    companion object {
        const val CHANNEL_ID_BG = "alsulaim_erp_bg_service"
        const val CHANNEL_ID_ALERTS = "alsulaim_erp_high_alerts"
        const val FOREGROUND_NOTIFICATION_ID = 9001

        const val ACTION_START_FOREGROUND = "ACTION_START_FOREGROUND"
        const val ACTION_STOP_FOREGROUND = "ACTION_STOP_FOREGROUND"
        const val ACTION_SCHEDULE_NOTIFICATION = "ACTION_SCHEDULE_NOTIFICATION"

        @Volatile
        var isRunning: Boolean = false

        @Volatile
        var heartbeatCount: Int = 0

        @Volatile
        var lastSyncTimestamp: String = ""

        fun dispatchHighPriorityNotification(
            context: Context,
            title: String,
            body: String,
            subText: String
        ) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val alertChannel = NotificationChannel(
                    CHANNEL_ID_ALERTS,
                    "إشعارات العمليات العاجلة والتنبيهات الفورية",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "إشعارات عقود مساند، فواتير ZATCA، منافسات اعتماد، وحركات الإيواء"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 250, 120, 250)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    setShowBadge(true)
                }
                nm.createNotificationChannel(alertChannel)
            }

            val openIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                (System.currentTimeMillis() % 10000).toInt(),
                openIntent,
                pendingFlags
            )

            val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(context, CHANNEL_ID_ALERTS)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(context)
                    .setPriority(Notification.PRIORITY_HIGH)
                    .setSound(defaultSoundUri)
            }

            builder
                .setContentTitle(title)
                .setContentText(body)
                .setSubText(subText)
                .setStyle(Notification.BigTextStyle().bigText(body))
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                builder.setVisibility(Notification.VISIBILITY_PUBLIC)
                builder.setCategory(Notification.CATEGORY_MESSAGE)
            }

            val notificationId = (System.currentTimeMillis() % 100000).toInt() + 1000
            nm.notify(notificationId, builder.build())

            // Trigger haptic vibration
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                    vm.defaultVibrator.vibrate(
                        VibrationEffect.createWaveform(longArrayOf(0, 220, 100, 220), -1)
                    )
                } else {
                    @Suppress("DEPRECATION")
                    val v = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 220, 100, 220), -1))
                    } else {
                        @Suppress("DEPRECATION")
                        v.vibrate(300)
                    }
                }
            } catch (_: Exception) {}
        }
    }

    private var workerThread: HandlerThread? = null
    private var workerHandler: Handler? = null
    private var wakeLock: PowerManager.WakeLock? = null

    private val heartbeatRunnable = object : Runnable {
        override fun run() {
            if (!isRunning) return
            heartbeatCount += 1
            val now = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.US).format(java.util.Date())
            lastSyncTimestamp = now
            updateForegroundNotification("المزامنة الخلفية نشطة • نبضة #$heartbeatCount ($now)")
            workerHandler?.postDelayed(this, 25000L)
        }
    }

    override fun onCreate() {
        super.onCreate()
        ensureNotificationChannels()
        workerThread = HandlerThread("AlsulaimErpBackgroundThread").apply { start() }
        workerHandler = Handler(workerThread!!.looper)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START_FOREGROUND

        when (action) {
            ACTION_STOP_FOREGROUND -> {
                stopBackgroundExecution()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_SCHEDULE_NOTIFICATION -> {
                val delayMs = intent?.getLongExtra("delayMs", 5000L) ?: 5000L
                val title = intent?.getStringExtra("title") ?: "إشعار مجموعة خالد السليم ERP"
                val body = intent?.getStringExtra("body") ?: "تمت معالجة العملية في الخلفية بنجاح."
                val companyName = intent?.getStringExtra("companyName") ?: "مجموعة خالد السليم"

                if (!isRunning) {
                    startAsForegroundService("جاري تنفيذ مهام الخلفية المجدولة...")
                }

                workerHandler?.postDelayed({
                    dispatchHighPriorityNotification(
                        context = applicationContext,
                        title = title,
                        body = body,
                        subText = companyName
                    )
                }, delayMs)
                return START_STICKY
            }
            else -> {
                val companyName = intent?.getStringExtra("companyName") ?: "مجموعة خالد السليم"
                startAsForegroundService("متصل بالخلفية • $companyName")
                return START_STICKY
            }
        }
    }

    private fun startAsForegroundService(statusText: String) {
        ensureNotificationChannels()
        val notification = buildForegroundNotification(statusText)

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(
                    FOREGROUND_NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(FOREGROUND_NOTIFICATION_ID, notification)
            }
        } catch (_: Exception) {
            // Fallback if foreground service restrictions apply
        }

        if (!isRunning) {
            isRunning = true
            acquirePartialWakeLock()
            workerHandler?.removeCallbacks(heartbeatRunnable)
            workerHandler?.post(heartbeatRunnable)
        }
    }

    private fun updateForegroundNotification(statusText: String) {
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.notify(FOREGROUND_NOTIFICATION_ID, buildForegroundNotification(statusText))
        } catch (_: Exception) {}
    }

    private fun buildForegroundNotification(statusText: String): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getActivity(this, 0, openIntent, pendingFlags)

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID_BG)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        return builder
            .setContentTitle("مجموعة خالد السليم ERP — العمل في الخلفية")
            .setContentText(statusText)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun acquirePartialWakeLock() {
        try {
            if (wakeLock?.isHeld == true) return
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "AlsulaimERP::BackgroundSyncWakeLock"
            ).apply {
                acquire(60 * 60 * 1000L) // 1 hour renewable
            }
        } catch (_: Exception) {}
    }

    private fun stopBackgroundExecution() {
        isRunning = false
        workerHandler?.removeCallbacksAndMessages(null)
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (_: Exception) {}
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
        } catch (_: Exception) {}
    }

    private fun ensureNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val bgChannel = NotificationChannel(
                CHANNEL_ID_BG,
                "خدمة المزامنة والعمل في الخلفية",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "تحافظ على اتصال ومزامنة نظام مجموعة خالد السليم في الخلفية"
                setShowBadge(false)
            }

            val alertChannel = NotificationChannel(
                CHANNEL_ID_ALERTS,
                "إشعارات العمليات العاجلة والتنبيهات الفورية",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعارات عقود مساند، فواتير ZATCA، منافسات اعتماد، وحركات الإيواء"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 120, 250)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setShowBadge(true)
            }

            nm.createNotificationChannel(bgChannel)
            nm.createNotificationChannel(alertChannel)
        }
    }

    override fun onDestroy() {
        stopBackgroundExecution()
        workerThread?.quitSafely()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

