package com.smartmemo.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 4201;
    private static final String REMINDER_PERMISSION_GUIDE = "reminder_permission_guide_v1";
    public static final String ACTION_REMINDER_OPEN = "com.smartmemo.app.REMINDER_OPEN";
    private static final String ACTION_TEST_REMINDER = "com.smartmemo.app.TEST_REMINDER";
    private static final long MINUTE = 60_000L;
    private static final long HOUR = 60L * MINUTE;
    private static final long DAY = 24L * HOUR;

    private static final class ReminderStage {
        final String code;
        final long offset;
        final String remaining;
        final String content;
        final String level;

        ReminderStage(String code, long offset, String remaining, String content, String level) {
            this.code = code;
            this.offset = offset;
            this.remaining = remaining;
            this.content = content;
            this.level = level;
        }
    }

    private static final ReminderStage[] REMINDER_STAGES = new ReminderStage[]{
        new ReminderStage("d90", 90 * DAY, "90 天", "事项进入倒计时周期，可按计划稳步推进", "normal"),
        new ReminderStage("d80", 80 * DAY, "80 天", "倒计时已更新，持续关注进度即可", "normal"),
        new ReminderStage("d70", 70 * DAY, "70 天", "保持当前推进节奏", "normal"),
        new ReminderStage("d60", 60 * DAY, "60 天", "建议确认阶段性安排", "normal"),
        new ReminderStage("d50", 50 * DAY, "50 天", "逐步进入准备阶段", "normal"),
        new ReminderStage("d40", 40 * DAY, "40 天", "可以开始核心准备", "normal"),
        new ReminderStage("d30", 30 * DAY, "30 天", "进入关键准备期", "normal"),
        new ReminderStage("d20", 20 * DAY, "20 天", "事项临近，请留意", "normal"),
        new ReminderStage("d10", 10 * DAY, "10 天", "建议确认最终安排", "normal"),
        new ReminderStage("d5", 5 * DAY, "5 天", "建议启动最终准备", "normal"),
        new ReminderStage("d3", 3 * DAY, "3 天", "请确认事项细节", "normal"),
        new ReminderStage("d1", DAY, "1 天", "明天截止，请完成最终核对", "near"),
        new ReminderStage("h12", 12 * HOUR, "12 小时", "事项即将到期，请合理安排时间", "near"),
        new ReminderStage("h8", 8 * HOUR, "8 小时", "请预留充足处理时间", "near"),
        new ReminderStage("h4", 4 * HOUR, "4 小时", "进入最后倒计时", "near"),
        new ReminderStage("h2", 2 * HOUR, "2 小时", "请尽快完成事项", "near"),
        new ReminderStage("h1", HOUR, "1 小时", "进入最终准备阶段", "near"),
        new ReminderStage("m30", 30 * MINUTE, "30 分钟", "请做好最后确认", "urgent"),
        new ReminderStage("m10", 10 * MINUTE, "10 分钟", "请立即处理", "urgent"),
        new ReminderStage("m3", 3 * MINUTE, "3 分钟", "请勿错过截止时间", "urgent"),
        new ReminderStage("deadline", 0L, "已到期", "事项正式截止，请及时完成处理", "urgent")
    };
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private Vibrator vibrator;
    private boolean pageReady = false;
    private String pendingCompleteReminderId;
    private String pendingOpenReminderId;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestNotificationPermission();
        webView = new WebView(this);
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        setContentView(webView);
        getWindow().setStatusBarColor(0xff05070b);
        getWindow().setNavigationBarColor(0xff05070b);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new AndroidBridge(), "SmartMemoAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                dispatchPendingReminderAction();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;
                Intent intent;
                try {
                    intent = fileChooserParams.createIntent();
                } catch (Exception error) {
                    intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception error) {
                    MainActivity.this.filePathCallback = null;
                    filePathCallback.onReceiveValue(null);
                    return false;
                }
                return true;
            }
        });
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.loadUrl("file:///android_asset/www/index.html");
        handleReminderIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleReminderIntent(intent);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) return;
        Uri[] results = null;
        if (resultCode == Activity.RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int i = 0; i < count; i++) results[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    protected void onDestroy() {
        if (vibrator != null) vibrator.cancel();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }



    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 823);
        }
    }
    private void handleReminderIntent(Intent intent) {
        if (intent == null) return;
        if ((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0 && ACTION_TEST_REMINDER.equals(intent.getAction())) {
            Intent testReminder = new Intent(this, AlarmReceiver.class);
            testReminder.setAction(AlarmReceiver.ACTION_REMINDER);
            if (intent.getExtras() != null) testReminder.putExtras(intent.getExtras());
            long delayMs = intent.getLongExtra("test_delay_ms", 0L);
            if (delayMs > 0L) {
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                PendingIntent operation = PendingIntent.getBroadcast(this, 98023, testReminder, flags);
                AlarmManager manager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                if (manager != null) scheduleReminder(manager, System.currentTimeMillis() + delayMs, operation);
            } else {
                sendBroadcast(testReminder);
            }
            return;
        }
        if (AlarmReceiver.ACTION_COMPLETE.equals(intent.getAction())) {
            pendingCompleteReminderId = intent.getStringExtra(AlarmReceiver.EXTRA_REMINDER_ID);
            recordNativeEvent("reminder.complete.requested", pendingCompleteReminderId);
            dispatchPendingReminderAction();
        } else if (ACTION_REMINDER_OPEN.equals(intent.getAction())) {
            pendingOpenReminderId = intent.getStringExtra(AlarmReceiver.EXTRA_REMINDER_ID);
            recordNativeEvent("reminder.open.requested", pendingOpenReminderId);
            dispatchPendingReminderAction();
        }
    }

    private void dispatchPendingReminderAction() {
        if (!pageReady || webView == null) return;
        if (pendingCompleteReminderId != null) {
            String id = pendingCompleteReminderId;
            pendingCompleteReminderId = null;
            String js = "window.smartMemoNativeCompleteReminder && window.smartMemoNativeCompleteReminder(\"" + escapeJs(id) + "\")";
            webView.post(() -> webView.evaluateJavascript(js, null));
        }
        if (pendingOpenReminderId != null) {
            String id = pendingOpenReminderId;
            pendingOpenReminderId = null;
            String js = "window.smartMemoNativeOpenReminder && window.smartMemoNativeOpenReminder(\"" + escapeJs(id) + "\")";
            webView.post(() -> webView.evaluateJavascript(js, null));
        }
    }

    private PendingIntent reminderPendingIntent(String id, long deadline, String title, String remark, ReminderStage stage) {
        Intent intent = new Intent(this, AlarmReceiver.class);
        intent.setAction(AlarmReceiver.ACTION_REMINDER);
        intent.putExtra(AlarmReceiver.EXTRA_REMINDER_ID, id);
        intent.putExtra(AlarmReceiver.EXTRA_TITLE, title == null ? "Memo Reminder" : title);
        intent.putExtra(AlarmReceiver.EXTRA_REMARK, remark == null ? "" : remark);
        intent.putExtra(AlarmReceiver.EXTRA_DEADLINE, deadline);
        intent.putExtra(AlarmReceiver.EXTRA_STAGE, stage.code);
        intent.putExtra(AlarmReceiver.EXTRA_REMAINING, stage.remaining);
        intent.putExtra(AlarmReceiver.EXTRA_CONTENT, stage.content);
        intent.putExtra(AlarmReceiver.EXTRA_LEVEL, stage.level);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(this, AlarmReceiver.requestCode(id, stage.code), intent, flags);
    }

    private void scheduleReminder(AlarmManager manager, long triggerAt, PendingIntent operation) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms()) {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation);
            } else {
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation);
            }
        } else {
            manager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, operation);
        }
    }

    private void cancelReminderSeries(String id) {
        if (id == null || id.trim().isEmpty()) return;
        AlarmManager manager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        android.app.NotificationManager notifications = (android.app.NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        for (ReminderStage stage : REMINDER_STAGES) {
            if (manager != null) manager.cancel(reminderPendingIntent(id, 0L, "", "", stage));
            if (notifications != null) notifications.cancel(AlarmReceiver.requestCode(id, stage.code));
        }
    }

    public static String formatDeadline(long deadline) {
        return new SimpleDateFormat("MM-dd HH:mm", Locale.getDefault()).format(new Date(deadline));
    }

    private void recordNativeEvent(String event, String detail) {
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("smartmemo_diagnostics", Context.MODE_PRIVATE);
            String current = prefs.getString("events", "[]");
            String item = "{\"at\":" + System.currentTimeMillis() + ",\"event\":\"" + escapeJson(event) + "\",\"detail\":\"" + escapeJson(detail) + "\"}";
            String next = current.length() <= 2 ? "[" + item + "]" : current.substring(0, current.length() - 1) + "," + item + "]";
            if (next.length() > 24000) next = "[" + next.substring(Math.max(1, next.length() - 22000));
            prefs.edit().putString("events", next).apply();
        } catch (Exception ignored) {
        }
    }

    private boolean canScheduleExactAlarmNow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            return alarmManager != null && alarmManager.canScheduleExactAlarms();
        }
        return true;
    }

    private boolean notificationsAllowedNow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private boolean batteryOptimizationsIgnoredNow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.os.PowerManager powerManager = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
            return powerManager != null && powerManager.isIgnoringBatteryOptimizations(getPackageName());
        }
        return true;
    }

    private void showReminderPermissionGuideOnce() {
        android.content.SharedPreferences prefs = getSharedPreferences("smartmemo_settings", Context.MODE_PRIVATE);
        if (prefs.getBoolean(REMINDER_PERMISSION_GUIDE, false)) return;
        prefs.edit().putBoolean(REMINDER_PERMISSION_GUIDE, true).apply();
        runOnUiThread(() -> new AlertDialog.Builder(this)
            .setTitle("让提醒准时到达")
            .setMessage("请允许通知、精确闹钟和自启动，并将电池策略设为无限制。\n\nSmartMemo 只使用这些权限发送本地提醒。")
            .setPositiveButton("检查权限", (dialog, which) -> openReminderPermissionSettings())
            .setNegativeButton("稍后", null)
            .show());
    }

    private void openReminderPermissionSettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !notificationsAllowedNow()) {
                requestNotificationPermission();
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !canScheduleExactAlarmNow()) {
                startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getPackageName())));
                return;
            }
            if ("Xiaomi".equalsIgnoreCase(Build.MANUFACTURER)) {
                Intent intent = new Intent();
                intent.setClassName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity");
                startActivity(intent);
                return;
            }
            startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
        } catch (Exception error) {
            startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())));
        }
    }
    private class AndroidBridge {
        @JavascriptInterface
        public boolean scheduleAlarm(String id, long fireAt, String title, String remark) {
            if (id == null || id.trim().isEmpty() || fireAt <= 0) return false;
            showReminderPermissionGuideOnce();
            try {
                AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                if (alarmManager == null) {
                    recordNativeEvent("reminder.schedule.failed", "AlarmManager unavailable");
                    return false;
                }

                cancelReminderSeries(id);
                long now = System.currentTimeMillis();
                int scheduled = 0;
                String safeRemark = remark == null ? "" : remark.trim();
                if (safeRemark.length() > 240) safeRemark = safeRemark.substring(0, 240) + "...";

                for (ReminderStage stage : REMINDER_STAGES) {
                    long triggerAt = fireAt - stage.offset;
                    if (triggerAt <= now + 1000L) continue;
                    PendingIntent operation = reminderPendingIntent(id, fireAt, title, safeRemark, stage);
                    scheduleReminder(alarmManager, triggerAt, operation);
                    scheduled++;
                }

                recordNativeEvent("reminder.series.schedule", id + "@" + fireAt + "|nodes=" + scheduled
                    + "|exact=" + canScheduleExactAlarmNow() + "|notifications=" + notificationsAllowedNow());
                return scheduled > 0;
            } catch (Exception error) {
                recordNativeEvent("reminder.schedule.failed", error.getClass().getSimpleName() + ":" + error.getMessage());
                return false;
            }
        }

        @JavascriptInterface
        public void cancelAlarm(String id) {
            cancelReminderSeries(id);
            recordNativeEvent("reminder.series.cancel", id);
        }

        @JavascriptInterface
        public void clearAlarmAlert(String id) {
            cancelReminderSeries(id);
            recordNativeEvent("reminder.notifications.clear", id);
        }

        @JavascriptInterface
        public String getDiagnostics() {
            android.content.SharedPreferences prefs = getSharedPreferences("smartmemo_diagnostics", Context.MODE_PRIVATE);
            String events = prefs.getString("events", "[]");
            return "{"
                + "\"sdk\":" + Build.VERSION.SDK_INT + ","
                + "\"canScheduleExactAlarm\":" + canScheduleExactAlarmNow() + ","
                + "\"notificationsAllowed\":" + notificationsAllowedNow() + ","
                + "\"batteryOptimizationsIgnored\":" + batteryOptimizationsIgnoredNow() + ","
                + "\"fullScreenIntentAllowed\":false,"
                + "\"package\":\"" + escapeJson(getPackageName()) + "\","
                + "\"nativeEvents\":" + events
                + "}";
        }


        @JavascriptInterface
        public void startVibration() {
            if (vibrator == null) return;
            long[] pattern = new long[]{0, 260, 100, 260, 100, 420, 260};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        }

        @JavascriptInterface
        public void stopVibration() {
            if (vibrator != null) vibrator.cancel();
        }

        @JavascriptInterface
        public void tickHaptic() {
            if (vibrator == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(10, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(10);
            }
        }

        @JavascriptInterface
        public String saveBackup(String fileName, String base64Data) {
            try {
                String safeName = sanitizeFileName(fileName);
                byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                String path = writeBackup(safeName, bytes);
                return json(true, "", path);
            } catch (Exception error) {
                return json(false, error.getMessage() == null ? "Save Failed" : error.getMessage(), "");
            }
        }
    }

    private String escapeJs(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", " ");
    }

    private String sanitizeFileName(String fileName) {
        String safe = fileName == null ? "SmartMemo-backup.smemo" : fileName.replaceAll("[^A-Za-z0-9._-]", "_");
        return (safe.endsWith(".smemo") || safe.endsWith(".json")) ? safe : safe + ".smemo";
    }

    private String writeBackup(String fileName, byte[] bytes) throws IOException {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentResolver resolver = getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, "application/octet-stream");
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SmartMemo");
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IOException("Unable To Create Backup File");
            try (OutputStream output = resolver.openOutputStream(uri)) {
                if (output == null) throw new IOException("Unable To Open Backup File");
                output.write(bytes);
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            resolver.update(uri, values, null, null);
            return "Downloads/SmartMemo/" + fileName;
        }

        File dir = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "SmartMemo");
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("Unable To Create Backup Folder");
        File file = new File(dir, fileName);
        try (FileOutputStream output = new FileOutputStream(file)) {
            output.write(bytes);
        }
        return file.getAbsolutePath();
    }

    private String json(boolean ok, String message, String path) {
        return "{\"ok\":" + ok + ",\"message\":\"" + escapeJson(message) + "\",\"path\":\"" + escapeJson(path) + "\"}";
    }

    private String escapeJson(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", " ");
    }
}
