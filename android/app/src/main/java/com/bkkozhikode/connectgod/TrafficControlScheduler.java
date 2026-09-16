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

import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Android owns playback timing; no WebView or network is needed after setup. */
public final class TrafficControlScheduler {
    private static final String TAG = "TrafficScheduler";
    private static final String PREFS = "traffic_control_native_v2";
    private static final String KEY_SLOTS = "slots";
    private static final String KEY_TX_UPDATING = "tx_updating_slots";
    private static final String KEY_PENDING_RESCHEDULES = "pending_reschedules";
    public static final int MAX_RESCHEDULE_ATTEMPTS = 5;

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

    public static boolean isSlotEquivalent(JSONObject a, JSONObject b) {
        if (a == null || b == null) return false;
        try {
            if (!a.optString("id").equals(b.optString("id"))) return false;
            if (!a.optString("time").equals(b.optString("time"))) return false;
            if (!a.optString("slotKey", "hourly_chime").equals(b.optString("slotKey", "hourly_chime"))) return false;
            if (!a.optString("title", "").equals(b.optString("title", ""))) return false;
            if (!a.optString("toneType", "").equals(b.optString("toneType", ""))) return false;
            if (!a.optString("toneUri", "").equals(b.optString("toneUri", ""))) return false;

            JSONArray daysA = a.optJSONArray("repeatDays");
            JSONArray daysB = b.optJSONArray("repeatDays");
            if (daysA == null && daysB == null) return true;
            if (daysA == null || daysB == null) return false;
            if (daysA.length() != daysB.length()) return false;
            Set<Integer> setA = new HashSet<>();
            for (int i = 0; i < daysA.length(); i++) setA.add(daysA.getInt(i));
            Set<Integer> setB = new HashSet<>();
            for (int i = 0; i < daysB.length(); i++) setB.add(daysB.getInt(i));
            return setA.equals(setB);
        } catch (Exception e) {
            return false;
        }
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

        // 3. Mark transaction state to allow recovery if process is interrupted
        preferences(context).edit().putString(KEY_TX_UPDATING, slots.toString()).commit();

        // 4. Map existing slots to perform diff-based updates without a cancel-all failure window
        String oldSlotsJson = preferences(context).getString(KEY_SLOTS, "[]");
        JSONArray oldArray = new JSONArray(oldSlotsJson);
        Map<String, JSONObject> oldMap = new HashMap<>();
        for (int i = 0; i < oldArray.length(); i++) {
            JSONObject s = oldArray.getJSONObject(i);
            oldMap.put(s.getString("id"), s);
        }

        Map<String, JSONObject> newMap = new LinkedHashMap<>();
        for (int i = 0; i < slots.length(); i++) {
            JSONObject s = slots.getJSONObject(i);
            newMap.put(s.getString("id"), s);
        }

        try {
            // Arm new and modified slots first without cancelling unchanged alarms
            long now = System.currentTimeMillis();
            for (Map.Entry<String, JSONObject> entry : newMap.entrySet()) {
                String id = entry.getKey();
                JSONObject newSlot = entry.getValue();

                // Re-arm or update alarm in AlarmManager
                schedule(context, newSlot);

                long trigger = nextTrigger(newSlot.getString("time"), newSlot.optJSONArray("repeatDays"), now);
                TrafficControlDiagnostics.recordScheduled(
                    context,
                    id,
                    newSlot.getString("time"),
                    newSlot.optString("slotKey", "hourly_chime"),
                    newSlot.optString("title", "Traffic Control"),
                    trigger
                );
            }

            // Only cancel slots that were removed (present in old, absent in new)
            for (String oldId : oldMap.keySet()) {
                if (!newMap.containsKey(oldId)) {
                    cancelSlotPending(context, oldId);
                    resetPlayedForSlot(context, oldId);
                    clearPendingReschedule(context, oldId);
                }
            }

            // 5. Finalize persisted schedule and clear transaction state
            if (!preferences(context).edit().putString(KEY_SLOTS, slots.toString()).remove(KEY_TX_UPDATING).commit()) {
                throw new IllegalStateException("Cannot save alarm settings to storage");
            }

            TrafficControlDiagnostics.clearScheduleError(context);
            Log.i(TAG, "Successfully updated " + slots.length() + " native alarm slots (diff-based, 0 failure window)");
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule native alarms: " + e.getMessage(), e);
            TrafficControlDiagnostics.recordScheduleError(context, e.getMessage());
            throw e;
        }
    }

    public static synchronized void recoverInterruptedSchedule(Context context) {
        try {
            SharedPreferences p = preferences(context);
            String tx = p.getString(KEY_TX_UPDATING, null);
            if (tx != null && !tx.isEmpty()) {
                Log.w(TAG, "Detected interrupted schedule update. Recovering...");
                TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "SCHEDULE_RECOVERY", "Recovering interrupted schedule update");
                scheduleAll(context, tx);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to recover interrupted schedule: " + e.getMessage(), e);
        }
    }

    public static synchronized void rescheduleAllFromPreferences(Context context) throws Exception {
        // Recover any pending transaction first
        recoverInterruptedSchedule(context);

        if (!canSchedule(context)) return;
        JSONArray slots = new JSONArray(preferences(context).getString(KEY_SLOTS, "[]"));
        int failedCount = 0;
        Exception lastErr = null;

        // Reboot / preferences restoration handles failures per slot so one failure does not abort the rest
        for (int i = 0; i < slots.length(); i++) {
            String slotId = "unknown";
            try {
                JSONObject slot = slots.getJSONObject(i);
                slotId = slot.optString("id", "slot_" + i);
                schedule(context, slot);
                long trigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), System.currentTimeMillis());
                TrafficControlDiagnostics.recordScheduled(
                    context,
                    slotId,
                    slot.getString("time"),
                    slot.optString("slotKey", "hourly_chime"),
                    slot.optString("title", "Traffic Control"),
                    trigger
                );
            } catch (Exception e) {
                failedCount++;
                lastErr = e;
                Log.e(TAG, "Failed to restore slot " + slotId + " during rescheduleAllFromPreferences: " + e.getMessage(), e);
                TrafficControlDiagnostics.recordEvent(context, slotId, "RESTORE_SLOT_ERROR", "Restore failed: " + e.getMessage());
            }
        }

        // Recover any pending reschedules
        recoverPendingReschedules(context);

        if (failedCount > 0) {
            TrafficControlDiagnostics.recordScheduleError(context, failedCount + " slots failed to restore. Last error: " + (lastErr != null ? lastErr.getMessage() : ""));
        } else {
            TrafficControlDiagnostics.clearScheduleError(context);
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

    static void schedule(Context context, JSONObject slot) throws Exception {
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
     * If rescheduling fails, records persistent bounded recovery to retry without replaying today's alarm.
     */
    static synchronized JSONObject claim(Context context, Intent intent) throws Exception {
        String id = intent.getStringExtra("id");
        if (id == null) return null;
        long triggerTime = intent.getLongExtra("trigger", System.currentTimeMillis());

        JSONArray slots = new JSONArray(preferences(context).getString(KEY_SLOTS, "[]"));
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
                clearPendingReschedule(context, id);
            } catch (Exception rescheduleErr) {
                Log.e(TAG, "Non-fatal error rescheduling next occurrence for " + id + ": " + rescheduleErr.getMessage(), rescheduleErr);
                TrafficControlDiagnostics.recordEvent(context, id, "RESCHEDULE_ERROR", "Next occurrence arming failed: " + rescheduleErr.getMessage());
                // Record persistent recovery entry to retry later without replaying today's alarm
                recordPendingReschedule(context, id);
            }

            return slot;
        }
        return null; // Deleted or disabled alarm.
    }

    public static synchronized void recordPendingReschedule(Context context, String slotId) {
        try {
            SharedPreferences p = preferences(context);
            String raw = p.getString(KEY_PENDING_RESCHEDULES, "{}");
            JSONObject map = new JSONObject(raw);
            JSONObject rec = map.optJSONObject(slotId);
            long now = System.currentTimeMillis();
            if (rec == null) {
                rec = new JSONObject();
                rec.put("attempts", 1);
                rec.put("firstFailed", now);
                rec.put("lastAttempt", now);
            } else {
                rec.put("attempts", rec.optInt("attempts", 0) + 1);
                rec.put("lastAttempt", now);
            }
            map.put(slotId, rec);
            p.edit().putString(KEY_PENDING_RESCHEDULES, map.toString()).commit();
        } catch (Exception e) {
            Log.e(TAG, "Error recording pending reschedule for " + slotId, e);
        }
    }

    public static synchronized void clearPendingReschedule(Context context, String slotId) {
        try {
            SharedPreferences p = preferences(context);
            String raw = p.getString(KEY_PENDING_RESCHEDULES, "{}");
            JSONObject map = new JSONObject(raw);
            if (map.has(slotId)) {
                map.remove(slotId);
                p.edit().putString(KEY_PENDING_RESCHEDULES, map.toString()).commit();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error clearing pending reschedule for " + slotId, e);
        }
    }

    public static synchronized void recoverPendingReschedules(Context context) {
        if (!canSchedule(context)) return;
        try {
            SharedPreferences p = preferences(context);
            String raw = p.getString(KEY_PENDING_RESCHEDULES, "{}");
            JSONObject map = new JSONObject(raw);
            if (map.length() == 0) return;

            JSONArray slots = new JSONArray(p.getString(KEY_SLOTS, "[]"));
            Map<String, JSONObject> slotMap = new HashMap<>();
            for (int i = 0; i < slots.length(); i++) {
                JSONObject s = slots.getJSONObject(i);
                slotMap.put(s.getString("id"), s);
            }

            Iterator<String> keys = map.keys();
            List<String> toRemove = new ArrayList<>();
            long now = System.currentTimeMillis();

            while (keys.hasNext()) {
                String id = keys.next();
                JSONObject record = map.getJSONObject(id);
                int attempts = record.optInt("attempts", 0);

                if (!slotMap.containsKey(id)) {
                    toRemove.add(id);
                    continue;
                }

                if (attempts >= MAX_RESCHEDULE_ATTEMPTS) {
                    Log.w(TAG, "Slot " + id + " exceeded max reschedule attempts (" + MAX_RESCHEDULE_ATTEMPTS + ")");
                    TrafficControlDiagnostics.recordEvent(context, id, "RESCHEDULE_MAX_RETRIES", "Exceeded " + MAX_RESCHEDULE_ATTEMPTS + " attempts");
                    toRemove.add(id);
                    continue;
                }

                JSONObject slot = slotMap.get(id);
                try {
                    // Crucial: schedule() advances past today if played:id is set to today
                    schedule(context, slot);
                    long nextTrigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), now);
                    if (dayKey(nextTrigger).equals(p.getString("played:" + id, ""))) {
                        nextTrigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), nextTrigger);
                    }
                    TrafficControlDiagnostics.recordNextScheduled(context, id, nextTrigger);
                    TrafficControlDiagnostics.recordEvent(context, id, "NEXT_OCCURRENCE_RECOVERED", "Rescheduled after attempt " + attempts);
                    toRemove.add(id);
                } catch (Exception e) {
                    record.put("attempts", attempts + 1);
                    record.put("lastAttempt", now);
                    record.put("lastError", e.getMessage());
                    Log.w(TAG, "Recovery attempt " + (attempts + 1) + " failed for " + id + ": " + e.getMessage());
                }
            }

            for (String rId : toRemove) {
                map.remove(rId);
            }
            p.edit().putString(KEY_PENDING_RESCHEDULES, map.toString()).commit();
        } catch (Exception e) {
            Log.e(TAG, "Error in recoverPendingReschedules: " + e.getMessage(), e);
        }
    }

    public static synchronized void resetPlayedForSlot(Context context, String id) {
        preferences(context).edit().remove("played:" + id).commit();
    }

    public static void cancelSlotPending(Context context, String id) {
        try {
            AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (manager != null) {
                PendingIntent pi = pending(context, id);
                manager.cancel(pi);
                pi.cancel();
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to cancel pending alarm for slot " + id + ": " + e.getMessage());
        }
    }

    public static void cancelAll(Context context) throws Exception {
        scheduleAll(context, "[]");
    }
}
