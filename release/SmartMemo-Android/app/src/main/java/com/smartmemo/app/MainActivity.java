package com.smartmemo.app;

import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
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

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 4201;
    private static final String ACTION_ALARM = "com.smartmemo.app.ALARM_TRIGGERED";
    private static final String EXTRA_ALARM_ID = "alarm_id";
    private static final String EXTRA_ALARM_TITLE = "alarm_title";
    private static final String EXTRA_ALARM_FIRE_AT = "alarm_fire_at";
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private Vibrator vibrator;
    private boolean pageReady = false;
    private Intent pendingAlarmIntent;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
                dispatchPendingAlarm();
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
        handleAlarmIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAlarmIntent(intent);
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


    private void handleAlarmIntent(Intent intent) {
        if (intent == null || !ACTION_ALARM.equals(intent.getAction())) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        );
        pendingAlarmIntent = intent;
        dispatchPendingAlarm();
    }

    private void dispatchPendingAlarm() {
        if (!pageReady || webView == null || pendingAlarmIntent == null) return;
        String id = pendingAlarmIntent.getStringExtra(EXTRA_ALARM_ID);
        String title = pendingAlarmIntent.getStringExtra(EXTRA_ALARM_TITLE);
        long fireAt = pendingAlarmIntent.getLongExtra(EXTRA_ALARM_FIRE_AT, System.currentTimeMillis());
        pendingAlarmIntent = null;
        String js = "window.smartMemoNativeAlarm && window.smartMemoNativeAlarm(\"" + escapeJs(id) + "\",\"" + escapeJs(title) + "\"," + fireAt + ")";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private PendingIntent alarmPendingIntent(String id, long fireAt, String title) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setAction(ACTION_ALARM);
        intent.putExtra(EXTRA_ALARM_ID, id);
        intent.putExtra(EXTRA_ALARM_TITLE, title == null ? "Memo Reminder" : title);
        intent.putExtra(EXTRA_ALARM_FIRE_AT, fireAt);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, id == null ? 0 : id.hashCode(), intent, flags);
    }
    private class AndroidBridge {
        @JavascriptInterface
        public boolean scheduleAlarm(String id, long fireAt, String title) {
            if (id == null || id.trim().isEmpty() || fireAt <= 0) return false;
            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return false;
            PendingIntent operation = alarmPendingIntent(id, fireAt, title);
            AlarmManager.AlarmClockInfo alarmInfo = new AlarmManager.AlarmClockInfo(fireAt, operation);
            alarmManager.setAlarmClock(alarmInfo, operation);
            return true;
        }

        @JavascriptInterface
        public void cancelAlarm(String id) {
            if (id == null || id.trim().isEmpty()) return;
            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;
            alarmManager.cancel(alarmPendingIntent(id, 0, ""));
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
        return safe.endsWith(".smemo") ? safe : safe + ".smemo";
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
