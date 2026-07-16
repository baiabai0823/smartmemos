package com.smartmemo.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

public class AlarmReceiver extends BroadcastReceiver {
    public static final String ACTION_REMINDER = "com.smartmemo.app.REMINDER_TRIGGERED";
    public static final String ACTION_COMPLETE = "com.smartmemo.app.REMINDER_COMPLETE";
    public static final String EXTRA_REMINDER_ID = "reminder_id";
    public static final String EXTRA_TITLE = "reminder_title";
    public static final String EXTRA_REMARK = "reminder_remark";
    public static final String EXTRA_DEADLINE = "reminder_deadline";
    public static final String EXTRA_STAGE = "reminder_stage";
    public static final String EXTRA_REMAINING = "reminder_remaining";
    public static final String EXTRA_CONTENT = "reminder_content";
    public static final String EXTRA_LEVEL = "reminder_level";

    private static final String CHANNEL_NORMAL = "smartmemo_reminder_normal_v2";
    private static final String CHANNEL_NEAR = "smartmemo_reminder_near_v2";
    private static final String CHANNEL_URGENT = "smartmemo_reminder_urgent_v2";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_REMINDER.equals(intent.getAction())) return;

        String reminderId = value(intent, EXTRA_REMINDER_ID, "reminder");
        String title = value(intent, EXTRA_TITLE, "Memo Reminder");
        String remark = value(intent, EXTRA_REMARK, "");
        String stage = value(intent, EXTRA_STAGE, "deadline");
        String remaining = value(intent, EXTRA_REMAINING, "已到期");
        String content = value(intent, EXTRA_CONTENT, "事项正式截止，请及时完成处理");
        String level = value(intent, EXTRA_LEVEL, "urgent");
        long deadline = intent.getLongExtra(EXTRA_DEADLINE, System.currentTimeMillis());

        recordNativeEvent(context, "reminder.banner.trigger", reminderId + "|" + stage + "@" + deadline);
        showBanner(context, reminderId, title, remark, stage, remaining, content, level, deadline);
    }

    private void showBanner(Context context, String reminderId, String title, String remark, String stage,
                            String remaining, String content, String level, long deadline) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        ensureChannels(manager);

        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setAction(MainActivity.ACTION_REMINDER_OPEN);
        openIntent.putExtra(EXTRA_REMINDER_ID, reminderId);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        Intent completeIntent = new Intent(context, MainActivity.class);
        completeIntent.setAction(ACTION_COMPLETE);
        completeIntent.putExtra(EXTRA_REMINDER_ID, reminderId);
        completeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent openPending = PendingIntent.getActivity(context, requestCode(reminderId, stage + "-open"), openIntent, pendingFlags());
        PendingIntent completePending = PendingIntent.getActivity(context, requestCode(reminderId, stage + "-complete"), completeIntent, pendingFlags());

        String statusText = "deadline".equals(stage) ? "已到达截止时间" : "剩余 " + remaining;
        String deadlineText = MainActivity.formatDeadline(deadline);
        String compactTimeCard = statusText + " · 截止 " + deadlineText;
        String expandedTimeCard = statusText + "\n截止 " + deadlineText;
        String expanded = expandedTimeCard + "\n" + content + (remark.isEmpty() ? "" : "\n\n" + remark);

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(context, channelFor(level))
            : new Notification.Builder(context);

        builder
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(trimTitle(title))
            .setContentText(compactTimeCard)
            .setSubText(content)
            .setStyle(new Notification.BigTextStyle().bigText(expanded).setBigContentTitle(title))
            .setCategory(Notification.CATEGORY_REMINDER)
            .setPriority(priorityFor(level))
            .setColor(colorFor(level))
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openPending)
            .addAction(new Notification.Action.Builder(0, "查看详情", openPending).build())
            .addAction(new Notification.Action.Builder(0, "标记已完成", completePending).build());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            RemoteViews compact = notificationView(context, R.layout.smartmemo_notification_compact, title, compactTimeCard, content, remark, level);
            RemoteViews expandedView = notificationView(context, R.layout.smartmemo_notification_expanded, title, expandedTimeCard, content, remark, level);
            builder.setStyle(new Notification.DecoratedCustomViewStyle());
            builder.setCustomContentView(compact);
            builder.setCustomBigContentView(expandedView);
            builder.setCustomHeadsUpContentView(headsUpView(
                context, title, statusText, deadlineText, content, level,
                openPending, completePending
            ));
        } else {
            builder.setStyle(new Notification.BigTextStyle().bigText(expanded).setBigContentTitle(title));
        }

        manager.notify(requestCode(reminderId, stage), builder.build());
    }

    private RemoteViews notificationView(Context context, int layoutId, String title, String timeCard,
                                         String content, String remark, String level) {
        RemoteViews view = new RemoteViews(context.getPackageName(), layoutId);
        view.setTextViewText(R.id.reminder_title, title);
        view.setTextViewText(R.id.reminder_time_card, timeCard);
        view.setTextViewText(R.id.reminder_content, content);
        int background = "urgent".equals(level) ? R.drawable.smartmemo_time_urgent
            : "near".equals(level) ? R.drawable.smartmemo_time_near
            : R.drawable.smartmemo_time_normal;
        int textColor = "urgent".equals(level) ? Color.rgb(163, 33, 50)
            : "near".equals(level) ? Color.rgb(154, 87, 24)
            : Color.rgb(57, 65, 74);
        view.setInt(R.id.reminder_time_card, "setBackgroundResource", background);
        view.setTextColor(R.id.reminder_time_card, textColor);
        if (layoutId == R.layout.smartmemo_notification_expanded) {
            view.setTextViewText(R.id.reminder_remark, remark);
            view.setViewVisibility(R.id.reminder_remark, remark.isEmpty() ? View.GONE : View.VISIBLE);
        }
        return view;
    }
    private RemoteViews headsUpView(Context context, String title, String statusText, String deadlineText,
                                    String content, String level, PendingIntent openPending,
                                    PendingIntent completePending) {
        RemoteViews view = new RemoteViews(context.getPackageName(), R.layout.smartmemo_notification_heads_up);
        view.setTextViewText(R.id.reminder_title, title);
        view.setTextViewText(R.id.reminder_remaining, statusText);
        view.setTextViewText(R.id.reminder_deadline, "截止 " + deadlineText);
        view.setTextViewText(R.id.reminder_content, content);

        boolean urgent = "urgent".equals(level);
        boolean near = "near".equals(level);
        int timeBackground = urgent ? R.drawable.smartmemo_time_urgent
            : near ? R.drawable.smartmemo_time_near : R.drawable.smartmemo_time_normal;
        int badgeBackground = urgent ? R.drawable.smartmemo_badge_urgent
            : near ? R.drawable.smartmemo_badge_near : R.drawable.smartmemo_badge_normal;
        int accentColor = urgent ? Color.rgb(163, 33, 50)
            : near ? Color.rgb(154, 87, 24) : Color.rgb(57, 65, 74);

        view.setTextViewText(R.id.reminder_badge, urgent ? "紧急提醒" : near ? "即将到期" : "提醒");
        view.setInt(R.id.reminder_time_container, "setBackgroundResource", timeBackground);
        view.setInt(R.id.reminder_badge, "setBackgroundResource", badgeBackground);
        view.setTextColor(R.id.reminder_badge, urgent ? Color.WHITE : accentColor);
        view.setTextColor(R.id.reminder_remaining, accentColor);
        view.setInt(R.id.reminder_view_action, "setBackgroundResource", R.drawable.smartmemo_action_secondary);
        view.setInt(R.id.reminder_complete_action, "setBackgroundResource", R.drawable.smartmemo_action_primary);
        view.setOnClickPendingIntent(R.id.reminder_view_action, openPending);
        view.setOnClickPendingIntent(R.id.reminder_complete_action, completePending);
        return view;
    }
    private void ensureChannels(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel normal = new NotificationChannel(CHANNEL_NORMAL, "SmartMemo 常规提醒", NotificationManager.IMPORTANCE_HIGH);
        normal.setDescription("Long-term SmartMemo reminder banners");
        normal.setSound(null, null);
        normal.enableVibration(false);

        NotificationChannel near = new NotificationChannel(CHANNEL_NEAR, "SmartMemo 临近提醒", NotificationManager.IMPORTANCE_HIGH);
        near.setDescription("Approaching SmartMemo reminder banners");
        near.enableVibration(true);
        near.setVibrationPattern(new long[]{0, 120, 100, 120});

        NotificationChannel urgent = new NotificationChannel(CHANNEL_URGENT, "SmartMemo 紧急提醒", NotificationManager.IMPORTANCE_HIGH);
        urgent.setDescription("Urgent SmartMemo reminder banners");
        urgent.enableVibration(true);
        urgent.setVibrationPattern(new long[]{0, 240, 100, 240, 140, 360});
        urgent.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

        manager.createNotificationChannel(normal);
        manager.createNotificationChannel(near);
        manager.createNotificationChannel(urgent);
    }

    public static int requestCode(String reminderId, String stage) {
        return ((reminderId == null ? "" : reminderId) + "|" + (stage == null ? "" : stage)).hashCode();
    }

    private static int pendingFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return flags;
    }

    private static String channelFor(String level) {
        if ("urgent".equals(level)) return CHANNEL_URGENT;
        if ("near".equals(level)) return CHANNEL_NEAR;
        return CHANNEL_NORMAL;
    }

    private static int priorityFor(String level) {
        if ("urgent".equals(level)) return Notification.PRIORITY_MAX;
        if ("near".equals(level)) return Notification.PRIORITY_HIGH;
        return Notification.PRIORITY_DEFAULT;
    }

    private static int colorFor(String level) {
        if ("urgent".equals(level)) return Color.rgb(220, 74, 82);
        if ("near".equals(level)) return Color.rgb(224, 145, 54);
        return Color.rgb(116, 124, 136);
    }

    private static String trimTitle(String title) {
        if (title == null || title.trim().isEmpty()) return "Memo Reminder";
        String clean = title.trim();
        return clean.length() > 20 ? clean.substring(0, 20) + "..." : clean;
    }

    private static String value(Intent intent, String key, String fallback) {
        String value = intent.getStringExtra(key);
        return value == null ? fallback : value;
    }

    private void recordNativeEvent(Context context, String event, String detail) {
        try {
            android.content.SharedPreferences prefs = context.getSharedPreferences("smartmemo_diagnostics", Context.MODE_PRIVATE);
            String current = prefs.getString("events", "[]");
            String safeDetail = detail == null ? "" : detail.replace("\\", "\\\\").replace("\"", "'");
            String item = "{\"at\":" + System.currentTimeMillis() + ",\"event\":\"" + event + "\",\"detail\":\"" + safeDetail + "\"}";
            String next = current.length() <= 2 ? "[" + item + "]" : current.substring(0, current.length() - 1) + "," + item + "]";
            if (next.length() > 24000) next = "[" + next.substring(Math.max(1, next.length() - 22000));
            prefs.edit().putString("events", next).apply();
        } catch (Exception ignored) {
        }
    }
}