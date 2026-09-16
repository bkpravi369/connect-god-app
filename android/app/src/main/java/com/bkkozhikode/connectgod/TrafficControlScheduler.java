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
    public static final String KEY_SLOTS = "slots";
    public static final String KEY_TX_UPDATING = "tx_updating_slots";
    public static final String KEY_PENDING_RESCHEDULES = "pending_reschedules";
    public static final String ACTION_RECOVER_SCHEDULE = "com.bkkozhikode.connectgod.ACTION_RECOVER_SCHEDULE";
    public static final int RECOVERY_PI_REQUEST_CODE = 9999;
    public static final int MAX_RESCHEDULE_ATTEMPTS = 5;
    public static final long[] RETRY_BACKOFF_MS = new long[]{
        60 * 1000L,       // Attempt 1: 1 min
        2 * 60 * 1000L,   // Attempt 2: 2 mins
        5 * 60 * 1000L,   // Attempt 3: 5 mins
        15 * 60 * 1000L,  // Attempt 4: 15 mins
        30 * 60 * 1000L   // Attempt 5: 30 mins
    };

    public interface AlarmSchedulerAdapter {
        void setAlarm(String slotId, long triggerTime) throws Exception;
        void cancel(String slotId) throws Exception;
        void setRecoveryAlarm(long triggerAtMillis) throws Exception;
        void cancelRecoveryAlarm() throws Exception;
    }

    public interface StorageAdapter {
        String getString(String key, String defValue);
        boolean putString(String key, String value);
        boolean remove(String key);
        boolean commit();
    }

    private static AlarmSchedulerAdapter sAlarmAdapter = null;
    private static StorageAdapter sStorageAdapter = null;

    public static void setAlarmAdapter(AlarmSchedulerAdapter adapter) {
        sAlarmAdapter = adapter;
    }

    public static void setStorageAdapter(StorageAdapter adapter) {
        sStorageAdapter = adapter;
    }

    public static StorageAdapter getStorageAdapter() {
        return sStorageAdapter;
    }

    public static AlarmSchedulerAdapter getAlarmAdapter() {
        return sAlarmAdapter;
    }

    public static void resetAdapters() {
        sAlarmAdapter = null;
        sStorageAdapter = null;
    }

    public static SharedPreferences preferences(Context context) {
        if (Build.VERSION.SDK_INT >= 24) context = context.createDeviceProtectedStorageContext();
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String storageGetString(Context context, String key, String defValue) {
        if (sStorageAdapter != null) return sStorageAdapter.getString(key, defValue);
        return preferences(context).getString(key, defValue);
    }

    private static boolean storagePutString(Context context, String key, String value) {
        if (sStorageAdapter != null) {
            sStorageAdapter.putString(key, value);
            return sStorageAdapter.commit();
        }
        return preferences(context).edit().putString(key, value).commit();
    }

    private static boolean storageRemove(Context context, String key) {
        if (sStorageAdapter != null) {
            sStorageAdapter.remove(key);
            return sStorageAdapter.commit();
        }
        return preferences(context).edit().remove(key).commit();
    }

    private static boolean storageCommitTx(Context context, String putKey, String putVal, String removeKey) {
        if (sStorageAdapter != null) {
            if (putKey != null) sStorageAdapter.putString(putKey, putVal);
            if (removeKey != null) sStorageAdapter.remove(removeKey);
            return sStorageAdapter.commit();
        }
        SharedPreferences.Editor ed = preferences(context).edit();
        if (putKey != null) ed.putString(putKey, putVal);
        if (removeKey != null) ed.remove(removeKey);
        return ed.commit();
    }

    private static void alarmSetAlarmClock(Context context, long triggerTime, PendingIntent showIntent, PendingIntent operation) throws Exception {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager != null) {
            manager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerTime, showIntent), operation);
        }
    }

    private static void alarmCancel(Context context, PendingIntent operation) throws Exception {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager != null) {
            manager.cancel(operation);
            operation.cancel();
        }
    }

    private static void alarmSetExactAndAllowWhileIdle(Context context, long triggerAtMillis, PendingIntent operation) throws Exception {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
            } else {
                manager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
            }
        }
    }

    public static boolean canSchedule(Context context) {
        if (sAlarmAdapter != null) return true;
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

    public static void scheduleRecoveryAlarm(Context context, long triggerAtMillis) {
        try {
            if (sAlarmAdapter != null) {
                sAlarmAdapter.setRecoveryAlarm(triggerAtMillis);
                return;
            }
            Intent intent = new Intent(context, TrafficControlReceiver.class);
            intent.setAction(ACTION_RECOVER_SCHEDULE);
            PendingIntent pi = PendingIntent.getBroadcast(
                context,
                RECOVERY_PI_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmSetExactAndAllowWhileIdle(context, triggerAtMillis, pi);
            Log.i(TAG, "Scheduled independent recovery alarm in " + Math.max(0, (triggerAtMillis - System.currentTimeMillis()) / 1000) + "s");
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule recovery alarm: " + e.getMessage(), e);
        }
    }

    public static void cancelRecoveryAlarm(Context context) {
        try {
            if (sAlarmAdapter != null) {
                sAlarmAdapter.cancelRecoveryAlarm();
                return;
            }
            Intent intent = new Intent(context, TrafficControlReceiver.class);
            intent.setAction(ACTION_RECOVER_SCHEDULE);
            PendingIntent pi = PendingIntent.getBroadcast(
                context,
                RECOVERY_PI_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmCancel(context, pi);
            Log.i(TAG, "Cancelled independent recovery alarm");
        } catch (Exception e) {
            Log.w(TAG, "Failed to cancel recovery alarm: " + e.getMessage());
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

        // Stage 1: Mark transaction state to allow recovery if process is interrupted
        if (!storagePutString(context, KEY_TX_UPDATING, slots.toString())) {
            throw new IllegalStateException("Failed to commit transaction marker (Stage 1)");
        }

        // Map existing slots to perform diff-based updates without a cancel-all failure window
        String oldSlotsJson = storageGetString(context, KEY_SLOTS, "[]");
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
            // Stage 2: Arm new and modified slots first without cancelling unchanged alarms
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

            // Stage 3: Only cancel slots that were removed (present in old, absent in new)
            for (String oldId : oldMap.keySet()) {
                if (!newMap.containsKey(oldId)) {
                    cancelSlotPending(context, oldId);
                    resetPlayedForSlot(context, oldId);
                    clearPendingReschedule(context, oldId);
                }
            }

            // Stage 4: Finalize persisted schedule and clear transaction state
            if (!storageCommitTx(context, KEY_SLOTS, slots.toString(), KEY_TX_UPDATING)) {
                throw new IllegalStateException("Failed to commit final slots schedule (Stage 4)");
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
            String tx = storageGetString(context, KEY_TX_UPDATING, null);
            if (tx != null && !tx.isEmpty()) {
                Log.w(TAG, "Detected interrupted schedule update. Recovering and finalizing...");
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
        JSONArray slots = new JSONArray(storageGetString(context, KEY_SLOTS, "[]"));
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

    public static long nextTrigger(String time, JSONArray days, long now) {
        int[] weekdays = null;
        if (days != null) {
            weekdays = new int[days.length()];
            for (int i = 0; i < days.length(); i++) weekdays[i] = days.optInt(i, -1);
        }
        return TrafficAlarmTime.next(time, weekdays, now);
    }

    public static void schedule(Context context, JSONObject slot) throws Exception {
        String id = slot.getString("id");
        long now = System.currentTimeMillis();
        // A clock rollback must not replay the same slot on the same local day.
        long trigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), now);
        if (dayKey(trigger).equals(storageGetString(context, "played:" + id, ""))) {
            trigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), trigger);
        }
        if (sAlarmAdapter != null) {
            sAlarmAdapter.setAlarm(id, trigger);
            return;
        }
        Intent intent = alarmIntent(context, id).putExtra("id", id).putExtra("trigger", trigger);
        PendingIntent operation = PendingIntent.getBroadcast(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent show = PendingIntent.getActivity(context, 0, new Intent(context, MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        alarmSetAlarmClock(context, trigger, show, operation);
    }

    public static String dayKey(long millis) {
        Calendar c = Calendar.getInstance(); c.setTimeInMillis(millis);
        return c.get(Calendar.YEAR) + "-" + c.get(Calendar.DAY_OF_YEAR);
    }

    /**
     * Claims the alarm for today's playback.
     * Crucially: failure to reschedule tomorrow's alarm MUST NOT prevent today's audio from playing.
     * Interrupted transactions are reconciled first so newly armed alarms are never silently discarded.
     * If rescheduling fails, records persistent bounded recovery to retry via AlarmManager backoff without replaying today's alarm.
     */
    public static synchronized JSONObject claim(Context context, Intent intent) throws Exception {
        if (intent == null) return null;
        String id = intent.getStringExtra("id");
        long triggerTime = intent.getLongExtra("trigger", System.currentTimeMillis());
        return claim(context, id, triggerTime);
    }

    public static synchronized JSONObject claim(Context context, String id, long triggerTime) throws Exception {
        if (id == null) return null;

        // Ensure any interrupted schedule transaction is made consistent
        recoverInterruptedSchedule(context);

        // Load slots from active configuration
        JSONArray slots = new JSONArray(storageGetString(context, KEY_SLOTS, "[]"));
        JSONObject targetSlot = null;
        for (int i = 0; i < slots.length(); i++) {
            JSONObject slot = slots.getJSONObject(i);
            if (id.equals(slot.getString("id"))) {
                targetSlot = slot;
                break;
            }
        }

        // If not found in active slots, check in-flight transaction (KEY_TX_UPDATING).
        // Newly armed alarms from an interrupted update MUST NOT be silently discarded!
        if (targetSlot == null) {
            String tx = storageGetString(context, KEY_TX_UPDATING, null);
            if (tx != null && !tx.isEmpty()) {
                JSONArray txSlots = new JSONArray(tx);
                for (int i = 0; i < txSlots.length(); i++) {
                    JSONObject slot = txSlots.getJSONObject(i);
                    if (id.equals(slot.getString("id"))) {
                        targetSlot = slot;
                        // Promote in-flight transaction to active schedule immediately
                        if (!storageCommitTx(context, KEY_SLOTS, tx, KEY_TX_UPDATING)) {
                            throw new IllegalStateException("Failed to commit promoted transaction to storage");
                        }
                        TrafficControlDiagnostics.recordEvent(context, id, "TX_SLOT_PROMOTED", "Promoted in-flight transaction slot to active schedule");
                        break;
                    }
                }
            }
        }

        if (targetSlot == null) {
            Log.w(TAG, "Slot " + id + " not found in active or transaction schedule. Skipping.");
            return null; // Truly deleted or disabled alarm.
        }

        JSONObject slot = targetSlot;
        String day = dayKey(triggerTime);
        boolean duplicate = day.equals(storageGetString(context, "played:" + id, ""));
        if (duplicate) {
            Log.w(TAG, "Slot " + id + " already played for day " + day + ". Skipping duplicate.");
            TrafficControlDiagnostics.recordEvent(context, id, "DUPLICATE_SKIPPED", "Already played for day " + day);
            return null;
        }

        // Immediately mark as claimed for today so duplicate broadcasts don't double-fire
        if (!storagePutString(context, "played:" + id, day)) {
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
            // Record persistent recovery entry to retry later via AlarmManager backoff without replaying today's alarm
            recordPendingReschedule(context, id);
        }

        return slot;
    }

    public static synchronized void recordPendingReschedule(Context context, String slotId) {
        try {
            String raw = storageGetString(context, KEY_PENDING_RESCHEDULES, "{}");
            JSONObject map = new JSONObject(raw);
            JSONObject rec = map.optJSONObject(slotId);
            long now = System.currentTimeMillis();
            int attemptCount;
            if (rec == null) {
                rec = new JSONObject();
                rec.put("attempts", 1);
                rec.put("firstFailed", now);
                rec.put("lastAttempt", now);
                attemptCount = 1;
            } else {
                attemptCount = rec.optInt("attempts", 1) + 1;
                rec.put("attempts", attemptCount);
                rec.put("lastAttempt", now);
            }
            map.put(slotId, rec);
            if (!storagePutString(context, KEY_PENDING_RESCHEDULES, map.toString())) {
                throw new IllegalStateException("Failed to commit pending reschedule to storage");
            }

            if (attemptCount <= MAX_RESCHEDULE_ATTEMPTS) {
                long backoff = RETRY_BACKOFF_MS[Math.min(attemptCount - 1, RETRY_BACKOFF_MS.length - 1)];
                scheduleRecoveryAlarm(context, now + backoff);
            } else {
                TrafficControlDiagnostics.recordScheduleError(context, "Recovery exhausted for slot " + slotId + " after " + attemptCount + " attempts.");
                TrafficControlDiagnostics.recordEvent(context, slotId, "RECOVERY_EXHAUSTED", "Exceeded max attempts (" + MAX_RESCHEDULE_ATTEMPTS + ")");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error recording pending reschedule for " + slotId, e);
        }
    }

    public static synchronized void clearPendingReschedule(Context context, String slotId) {
        try {
            String raw = storageGetString(context, KEY_PENDING_RESCHEDULES, "{}");
            JSONObject map = new JSONObject(raw);
            if (map.has(slotId)) {
                map.remove(slotId);
                storagePutString(context, KEY_PENDING_RESCHEDULES, map.toString());
            }
        } catch (Exception e) {
            Log.e(TAG, "Error clearing pending reschedule for " + slotId, e);
        }
    }

    public static synchronized void recoverPendingReschedules(Context context) {
        if (!canSchedule(context)) return;
        try {
            String raw = storageGetString(context, KEY_PENDING_RESCHEDULES, "{}");
            JSONObject map = new JSONObject(raw);
            if (map.length() == 0) {
                cancelRecoveryAlarm(context);
                return;
            }

            JSONArray slots = new JSONArray(storageGetString(context, KEY_SLOTS, "[]"));
            Map<String, JSONObject> slotMap = new HashMap<>();
            for (int i = 0; i < slots.length(); i++) {
                JSONObject s = slots.getJSONObject(i);
                slotMap.put(s.getString("id"), s);
            }

            Iterator<String> keys = map.keys();
            List<String> toRemove = new ArrayList<>();
            long now = System.currentTimeMillis();
            long nextMinRetryTime = Long.MAX_VALUE;
            boolean anyExhausted = false;

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
                    TrafficControlDiagnostics.recordScheduleError(context, "Recovery exhausted for slot " + id + " after " + MAX_RESCHEDULE_ATTEMPTS + " attempts.");
                    TrafficControlDiagnostics.recordEvent(context, id, "RECOVERY_EXHAUSTED", "Exceeded " + MAX_RESCHEDULE_ATTEMPTS + " attempts");
                    toRemove.add(id);
                    anyExhausted = true;
                    continue;
                }

                JSONObject slot = slotMap.get(id);
                try {
                    // Crucial: schedule() advances past today if played:id matches todayKey
                    schedule(context, slot);
                    long nextTrigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), now);
                    if (dayKey(nextTrigger).equals(storageGetString(context, "played:" + id, ""))) {
                        nextTrigger = nextTrigger(slot.getString("time"), slot.optJSONArray("repeatDays"), nextTrigger);
                    }
                    TrafficControlDiagnostics.recordNextScheduled(context, id, nextTrigger);
                    TrafficControlDiagnostics.recordEvent(context, id, "NEXT_OCCURRENCE_RECOVERED", "Rescheduled after attempt " + attempts);
                    toRemove.add(id);
                } catch (Exception e) {
                    int nextAttempt = attempts + 1;
                    record.put("attempts", nextAttempt);
                    record.put("lastAttempt", now);
                    record.put("lastError", e.getMessage());
                    Log.w(TAG, "Recovery attempt " + nextAttempt + " failed for " + id + ": " + e.getMessage());
                    if (nextAttempt < MAX_RESCHEDULE_ATTEMPTS) {
                        long backoff = RETRY_BACKOFF_MS[Math.min(nextAttempt - 1, RETRY_BACKOFF_MS.length - 1)];
                        long retryAt = now + backoff;
                        if (retryAt < nextMinRetryTime) nextMinRetryTime = retryAt;
                    } else {
                        TrafficControlDiagnostics.recordScheduleError(context, "Recovery exhausted for slot " + id + " after " + MAX_RESCHEDULE_ATTEMPTS + " attempts.");
                        TrafficControlDiagnostics.recordEvent(context, id, "RECOVERY_EXHAUSTED", "Exceeded " + MAX_RESCHEDULE_ATTEMPTS + " attempts");
                        toRemove.add(id);
                        anyExhausted = true;
                    }
                }
            }

            for (String rId : toRemove) {
                map.remove(rId);
            }

            if (!storagePutString(context, KEY_PENDING_RESCHEDULES, map.toString())) {
                throw new IllegalStateException("Failed to persist updated pending reschedules");
            }

            if (map.length() > 0 && nextMinRetryTime != Long.MAX_VALUE) {
                scheduleRecoveryAlarm(context, nextMinRetryTime);
            } else {
                cancelRecoveryAlarm(context);
                if (!anyExhausted) {
                    TrafficControlDiagnostics.clearScheduleError(context);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in recoverPendingReschedules: " + e.getMessage(), e);
        }
    }

    public static synchronized void resetPlayedForSlot(Context context, String id) {
        storageRemove(context, "played:" + id);
    }

    public static void cancelSlotPending(Context context, String id) {
        try {
            if (sAlarmAdapter != null) {
                sAlarmAdapter.cancel(id);
                return;
            }
            PendingIntent pi = pending(context, id);
            alarmCancel(context, pi);
        } catch (Exception e) {
            Log.w(TAG, "Failed to cancel pending alarm for slot " + id + ": " + e.getMessage());
        }
    }

    public static void cancelAll(Context context) throws Exception {
        scheduleAll(context, "[]");
    }
}
