package com.bkkozhikode.connectgod;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

/** Android owns playback timing; no WebView or network is needed after setup. */
public final class TrafficControlScheduler {
    private static final String TAG = "TrafficScheduler";
    private static final String PREFS = "traffic_control_native_v2";

    public static SharedPreferences preferences(Context context) {
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

        // 1. Validate the entire payload in memory before modifying saved schedule
        HashSet<String> ids = new HashSet<>();
        for (int i = 0; i < slots.length(); i++) {
            JSONObject slot = slots.getJSONObject(i);
            String id = slot.getString("id");
            if (!ids.add(id)) {
                throw new IllegalArgumentException("Duplicate alarm ID: " + id);
            }
            String time = slot.getString("time");
            if (!time.matches("([01][0-9]|2[0-3]):[0-5][0-9]")) {
                throw new IllegalArgumentException("Invalid alarm time: " + time);
            }
            nextTrigger(time, slot.optJSONArray("repeatDays"), System.currentTimeMillis());
        }

        // 2. Check permission if any alarms are configured
        if (slots.length() > 0 && !canSchedule(context)) {
            String err = "Alarms & reminders permission required";
            TrafficControlDiagnostics.recordScheduleError(context, err);
            throw new SecurityException(err);
        }

        // 3. Backup previous configuration in case scheduling fails
        String oldSlotsJson = preferences(context).getString("slots", "[]");

        try {
            // Cancel pending alarms for slots being replaced or removed
            cancelPending(context);

            // Persist the new valid slots list
            if (!preferences(context).edit().putString("slots", slots.toString()).commit()) {
                throw new IllegalStateException("Cannot save alarm settings to storage");
            }

            // Arm each slot with AlarmManager and log diagnostic info
            long now = System.currentTimeMillis();
            for (int i = 0; i < slots.length(); i++) {
                JSONObject slot = slots.getJSONObject(i);
                schedule(context, slot);

                long trigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), now);
                TrafficControlDiagnostics.recordScheduled(
                    context,
                    slot.getString("id"),
                    slot.getString("time"),
                    slot.optString("slotKey", "hourly_chime"),
                    slot.optString("title", "Traffic Control"),
                    trigger
                );
            }

            TrafficControlDiagnostics.clearScheduleError(context);
            Log.i(TAG, "Successfully scheduled " + slots.length() + " native alarm slots");
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule native alarms, rolling back: " + e.getMessage(), e);
            TrafficControlDiagnostics.recordScheduleError(context, e.getMessage());

            // Rollback to previous configuration if possible
            try {
                preferences(context).edit().putString("slots", oldSlotsJson).commit();
                rescheduleAllFromPreferences(context);
            } catch (Exception rollbackEx) {
                Log.e(TAG, "Rollback failed: " + rollbackEx.getMessage(), rollbackEx);
            }
            throw e;
        }
    }

    public static synchronized void rescheduleAllFromPreferences(Context context) throws Exception {
        if (!canSchedule(context)) return;
        JSONArray slots = new JSONArray(preferences(context).getString("slots", "[]"));
        for (int i = 0; i < slots.length(); i++) {
            JSONObject slot = slots.getJSONObject(i);
            schedule(context, slot);
            long trigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), System.currentTimeMillis());
            TrafficControlDiagnostics.recordScheduled(
                context,
                slot.getString("id"),
                slot.getString("time"),
                slot.optString("slotKey", "hourly_chime"),
                slot.optString("title", "Traffic Control"),
                trigger
            );
        }
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

    public static String dayKey(long millis) {
        Calendar c = Calendar.getInstance(); c.setTimeInMillis(millis);
        return c.get(Calendar.YEAR) + "-" + c.get(Calendar.DAY_OF_YEAR);
    }

    /**
     * Claims the alarm for today's playback.
     * Crucially: failure to reschedule tomorrow's alarm MUST NOT prevent today's audio from playing.
     */
    static synchronized JSONObject claim(Context context, Intent intent) throws Exception {
        String id = intent.getStringExtra("id");
        if (id == null) return null;
        long triggerTime = intent.getLongExtra("trigger", System.currentTimeMillis());

        JSONArray slots = new JSONArray(preferences(context).getString("slots", "[]"));
        for (int i = 0; i < slots.length(); i++) {
            JSONObject slot = slots.getJSONObject(i);
            if (!id.equals(slot.getString("id"))) continue;

            String day = dayKey(triggerTime);
            boolean duplicate = day.equals(preferences(context).getString("played:" + id, ""));
            if (duplicate) {
                Log.w(TAG, "Slot " + id + " already played for day " + day + ". Skipping duplicate.");
                TrafficControlDiagnostics.recordEvent(context, id, "DUPLICATE_SKIPPED", "Already played for day " + day);
                return null;
            }

            // Immediately mark as claimed for today so duplicate broadcasts don't double-fire
            if (!preferences(context).edit().putString("played:" + id, day).commit()) {
                throw new IllegalStateException("Cannot persist alarm occurrence");
            }

            // Reschedule tomorrow's alarm in an isolated try-catch so failures do NOT abort today's playback
            try {
                schedule(context, slot);
                long nextTrigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), System.currentTimeMillis());
                TrafficControlDiagnostics.recordNextScheduled(context, id, nextTrigger);
            } catch (Exception rescheduleErr) {
                Log.e(TAG, "Non-fatal error rescheduling next occurrence for " + id + ": " + rescheduleErr.getMessage(), rescheduleErr);
                TrafficControlDiagnostics.recordEvent(context, id, "RESCHEDULE_ERROR", "Next occurrence arming failed: " + rescheduleErr.getMessage());
                // Deliberately not rethrowing: today's song MUST still play!
            }

            return slot;
        }
        return null; // Deleted or disabled alarm.
    }

    public static synchronized void resetPlayedForSlot(Context context, String id) {
        preferences(context).edit().remove("played:" + id).commit();
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
