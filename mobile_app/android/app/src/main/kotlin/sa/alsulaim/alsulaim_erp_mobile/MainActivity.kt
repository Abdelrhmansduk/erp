package sa.alsulaim.alsulaim_erp_mobile

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    private val CHANNEL = "sa.alsulaim.erp/native_mobile"
    private val REQ_POST_NOTIFICATIONS = 701

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Automatically request notification permission on Android 13+ at startup
        requestNotificationPermissionIfNeeded()

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "requestNotificationPermission" -> {
                    val granted = requestNotificationPermissionIfNeeded()
                    result.success(granted)
                }
                "showSystemNotification" -> {
                    val title = call.argument<String>("title") ?: "تنبيه مجموعة خالد السليم"
                    val body = call.argument<String>("body") ?: ""
                    val companyName = call.argument<String>("companyName") ?: "مجموعة خالد السليم ERP"

                    ErpBackgroundSyncService.dispatchHighPriorityNotification(
                        context = applicationContext,
                        title = title,
                        body = body,
                        subText = companyName
                    )
                    result.success(true)
                }
                "scheduleBackgroundNotification" -> {
                    val delayMs = (call.argument<Number>("delayMs")?.toLong()) ?: 5000L
                    val title = call.argument<String>("title") ?: "إشعار خلفي — مجموعة خالد السليم"
                    val body = call.argument<String>("body") ?: "تم تنفيذ العملية في الخلفية بنجاح."
                    val companyName = call.argument<String>("companyName") ?: "مجموعة خالد السليم ERP"

                    val serviceIntent = Intent(this, ErpBackgroundSyncService::class.java).apply {
                        action = ErpBackgroundSyncService.ACTION_SCHEDULE_NOTIFICATION
                        putExtra("delayMs", delayMs)
                        putExtra("title", title)
                        putExtra("body", body)
                        putExtra("companyName", companyName)
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent)
                    } else {
                        startService(serviceIntent)
                    }
                    result.success(true)
                }
                "startBackgroundService" -> {
                    val companyName = call.argument<String>("companyName") ?: "مجموعة خالد السليم ERP"
                    val serviceIntent = Intent(this, ErpBackgroundSyncService::class.java).apply {
                        action = ErpBackgroundSyncService.ACTION_START_FOREGROUND
                        putExtra("companyName", companyName)
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent)
                    } else {
                        startService(serviceIntent)
                    }
                    result.success(true)
                }
                "stopBackgroundService" -> {
                    val serviceIntent = Intent(this, ErpBackgroundSyncService::class.java).apply {
                        action = ErpBackgroundSyncService.ACTION_STOP_FOREGROUND
                    }
                    startService(serviceIntent)
                    result.success(true)
                }
                "getBackgroundServiceStatus" -> {
                    val statusMap = mapOf(
                        "isRunning" to ErpBackgroundSyncService.isRunning,
                        "heartbeatCount" to ErpBackgroundSyncService.heartbeatCount,
                        "lastSyncTimestamp" to ErpBackgroundSyncService.lastSyncTimestamp
                    )
                    result.success(statusMap)
                }
                "setWakeLock" -> {
                    val enable = call.argument<Boolean>("enable") ?: false
                    runOnUiThread {
                        if (enable) {
                            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        } else {
                            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        }
                    }
                    result.success(enable)
                }
                "vibrateDevice" -> {
                    triggerHapticPulse()
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun requestNotificationPermissionIfNeeded(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val current = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            )
            if (current != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    REQ_POST_NOTIFICATIONS
                )
                return false
            }
        }
        return true
    }

    private fun triggerHapticPulse() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vm.defaultVibrator.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val v = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    v.vibrate(80)
                }
            }
        } catch (_: Exception) {}
    }
}
