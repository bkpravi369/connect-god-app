package com.bkkozhikode.connectgod;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Calendar;

/** Android owns playback timing; no WebView or network is needed after setup. */
public final class TrafficControlScheduler {
    private static final String PREFS = "traffic_control_native_v2";

    static SharedPreferences preferences(Context context) {
        if (Build.VERSION.SDK_INT >= 24) context = context.createDeviceProtectedStorageContext();
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static boolean canSchedule(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return manager != null && (Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms());
    }

    private static Intent alarmIntent(Context context, String id) {
        return new Intent(context, TrafficControlReceiver.class)
            .setData(Uri.parse("connectgod://traffic/" + Uri.encode(id)));
    }

    private static PendingIntent pending(Context context, String id) {
        return PendingIntent.getBroadcast(context, 0, alarmIntent(context, id),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    public static synchronized void scheduleAll(Context context, String slotsJson) throws Exception {
        JSONArray slots = new JSONArray(slotsJson);
        // Validate the entire payload before replacing the saved schedule.
        java.util.HashSet<String> ids = new java.util.HashSet<>();
        for (int i = 0; i < slots.length(); i++) {
            JSONObject slot = slots.getJSONObject(i);
            if (!ids.add(slot.getString("id"))) throw new IllegalArgumentException("Duplicate alarm ID");
            nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), System.currentTimeMillis());
            if (!slot.getString("time").matches("([01][0-9]|2[0-3]):[0-5][0-9]"))
                throw new IllegalArgumentException("Invalid alarm time");
        }
        cancelPending(context);
        if (!preferences(context).edit().putString("slots", slots.toString()).commit())
            throw new IllegalStateException("Cannot save alarm settings");
        if (slots.length() > 0 && !canSchedule(context))
            throw new SecurityException("Allow Alarms & reminders to enable Traffic Control");
        rescheduleAllFromPreferences(context);
    }

    public static synchronized void rescheduleAllFromPreferences(Context context) throws Exception {
        if (!canSchedule(context)) return;
        JSONArray slots = new JSONArray(preferences(context).getString("slots", "[]"));
        for (int i = 0; i < slots.length(); i++) schedule(context, slots.getJSONObject(i));
    }

    static long nextTrigger(String time, JSONArray days, long now) {
        int[] weekdays = null;
        if (days != null) {
            weekdays = new int[days.length()];
            for (int i = 0; i < days.length(); i++) weekdays[i] = days.optInt(i, -1);
        }
        return TrafficAlarmTime.next(time, weekdays, now);
    }

    private static void schedule(Context context, JSONObject slot) throws Exception {
        String id = slot.getString("id");
        long now = System.currentTimeMillis();
        // A clock rollback must not replay the same slot on the same local day.
        long trigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), now);
        if (dayKey(trigger).equals(preferences(context).getString("played:" + id, "")))
            trigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), trigger);
        Intent intent = alarmIntent(context, id).putExtra("id", id).putExtra("trigger", trigger);
        PendingIntent operation = PendingIntent.getBroadcast(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent show = PendingIntent.getActivity(context, 0, new Intent(context, MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        manager.setAlarmClock(new AlarmManager.AlarmClockInfo(trigger, show), operation);
    }

    private static String dayKey(long millis) {
        Calendar c = Calendar.getInstance(); c.setTimeInMillis(millis);
        return c.get(Calendar.YEAR) + "-" + c.get(Calendar.DAY_OF_YEAR);
    }

    /** Claim before playback, persist across process death, and re-arm even if audio fails. */
    static synchronized JSONObject claim(Context context, Intent intent) throws Exception {
        String id = intent.getStringExtra("id");
        if (id == null) return null;
        JSONArray slots = new JSONArray(preferences(context).getString("slots", "[]"));
        for (int i = 0; i < slots.length(); i++) {
            JSONObject slot = slots.getJSONObject(i);
            if (!id.equals(slot.getString("id"))) continue;
            String day = dayKey(intent.getLongExtra("trigger", System.currentTimeMillis()));
            boolean duplicate = day.equals(preferences(context).getString("played:" + id, ""));
            if (!duplicate && !preferences(context).edit().putString("played:" + id, day).commit())
                throw new IllegalStateException("Cannot persist alarm occurrence");
            schedule(context, slot);
            return duplicate ? null : slot;
        }
        return null; // Deleted or disabled alarm.
    }

    private static void cancelPending(Context context) throws Exception {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        JSONArray old = new JSONArray(preferences(context).getString("slots", "[]"));
        for (int i = 0; i < old.length(); i++) {
            PendingIntent pi = pending(context, old.getJSONObject(i).getString("id"));
            manager.cancel(pi); pi.cancel();
        }
    }

    public static void cancelAll(Context context) throws Exception { scheduleAll(context, "[]"); }
}
