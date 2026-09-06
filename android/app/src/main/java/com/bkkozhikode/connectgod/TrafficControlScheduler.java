package com.bkkozhikode.connectgod;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

public class TrafficControlScheduler {
    private static final String TAG = "TrafficScheduler";
    private static final String PREFS_NAME = "traffic_control_native_prefs";
    private static final String KEY_TRAFFIC_ENABLED = "traffic_enabled";
    private static final String KEY_HOURLY_ENABLED = "hourly_enabled";
    private static final String KEY_CUSTOM_ALARMS = "custom_alarms_json";

    public static class AlarmSlot {
        public String time;
        public String slotKey;
        public String title;

        public AlarmSlot(String time, String slotKey, String title) {
            this.time = time;
            this.slotKey = slotKey;
            this.title = title;
        }
    }

    public static final AlarmSlot[] DEFAULT_TRAFFIC_SLOTS = new AlarmSlot[] {
        new AlarmSlot("03:30", "amritvela", "Amritvela Meditation / അമൃതവേള"),
        new AlarmSlot("05:45", "early_morning", "Early Morning Yoga / പ്രഭാത യോഗ"),
        new AlarmSlot("07:00", "morning", "Morning Study / പ്രഭാത പഠനം"),
        new AlarmSlot("10:30", "mid_morning", "Mid-Morning Traffic Control / ട്രാഫിക് കൺട്രോൾ"),
        new AlarmSlot("12:00", "noon", "Noon Remembrance / മധ്യാഹ്ന ഓർമ്മ"),
        new AlarmSlot("17:30", "evening", "Evening Sandhya Yoga / സന്ധ്യാ യോഗ"),
        new AlarmSlot("19:30", "dusk", "Dusk Class & Meditation / സന്ധ്യാ ക്ലാസ്സ്"),
        new AlarmSlot("21:30", "night", "Night Reflection / രാത്രി ധ്യാനം"),
        new AlarmSlot("22:00", "late_night", "Late Night Meditation / രാത്രി യോഗ")
    };

    public static final String[] HOURLY_CHIME_TIMES = new String[] {
        "06:00", "08:00", "09:00", "11:00", "13:00", "14:00", "15:00", "16:00", "18:00", "20:30"
    };

    /**
     * Schedules all enabled Traffic Control alarms, hourly chimes, and custom user alarms.
     */
    public static void scheduleAll(Context context, boolean trafficEnabled, boolean hourlyEnabled, String customAlarmsJson) {
        // Persist preferences for BootReceiver
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean(KEY_TRAFFIC_ENABLED, trafficEnabled)
            .putBoolean(KEY_HOURLY_ENABLED, hourlyEnabled)
            .putString(KEY_CUSTOM_ALARMS, customAlarmsJson != null ? customAlarmsJson : "[]")
            .apply();

        cancelAll(context);

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager service unavailable");
            return;
        }

        // 1. Schedule Primary Traffic Slots
        if (trafficEnabled) {
            for (AlarmSlot slot : DEFAULT_TRAFFIC_SLOTS) {
                scheduleSingleAlarm(context, alarmManager, slot.time, slot.slotKey, slot.title, false, false);
            }
        }

        // 2. Schedule Hourly Chimes
        if (hourlyEnabled) {
            for (String chimeTime : HOURLY_CHIME_TIMES) {
                scheduleSingleAlarm(context, alarmManager, chimeTime, "hourly_chime", "Hourly Traffic Chime / ട്രാഫിക് ശാന്തി", true, false);
            }
        }

        // 3. Schedule Custom User Alarms
        if (customAlarmsJson != null && !customAlarmsJson.isEmpty()) {
            try {
                JSONArray arr = new JSONArray(customAlarmsJson);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    boolean enabled = obj.optBoolean("enabled", true);
                    if (!enabled) continue;
                    String time = obj.optString("time", "");
                    String label = obj.optString("label", "Custom Alarm");
                    if (!time.isEmpty()) {
                        scheduleSingleAlarm(context, alarmManager, time, "custom_" + i, label, false, true);
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Error parsing custom alarms JSON: " + e.getMessage());
            }
        }

        Log.i(TAG, "All traffic alarms scheduled successfully. TrafficEnabled=" + trafficEnabled + ", Hourly=" + hourlyEnabled);
    }

    /**
     * Re-schedules all alarms from stored SharedPreferences (called on BOOT_COMPLETED).
     */
    public static void rescheduleAllFromPreferences(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean trafficEnabled = prefs.getBoolean(KEY_TRAFFIC_ENABLED, true);
        boolean hourlyEnabled = prefs.getBoolean(KEY_HOURLY_ENABLED, true);
        String customJson = prefs.getString(KEY_CUSTOM_ALARMS, "[]");
        Log.i(TAG, "Re-scheduling from preferences after device boot...");
        scheduleAll(context, trafficEnabled, hourlyEnabled, customJson);
    }

    /**
     * Automatically called by TrafficControlReceiver when an alarm triggers,
     * resetting the alarm for the exact same time the NEXT DAY.
     */
    public static void rescheduleSlotNextDay(Context context, Intent triggeredIntent) {
        String time = triggeredIntent.getStringExtra("time");
        String slotKey = triggeredIntent.getStringExtra("slotKey");
        String title = triggeredIntent.getStringExtra("title");
        boolean isChime = triggeredIntent.getBooleanExtra("isChime", false);
        boolean isCustom = triggeredIntent.getBooleanExtra("isCustom", false);

        if (time == null || time.isEmpty()) return;

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        scheduleSingleAlarm(context, alarmManager, time, slotKey, title, isChime, isCustom);
        Log.i(TAG, "Repeated alarm scheduled for next day: " + time + " (" + slotKey + ")");
    }

    private static void scheduleSingleAlarm(
        Context context,
        AlarmManager alarmManager,
        String time,
        String slotKey,
        String title,
        boolean isChime,
        boolean isCustom
    ) {
        try {
            String[] parts = time.split(":");
            int hour = Integer.parseInt(parts[0].trim());
            int minute = Integer.parseInt(parts[1].trim());

            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);

            // If time has already passed today, schedule for tomorrow
            if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
                calendar.add(Calendar.DAY_OF_YEAR, 1);
            }

            int requestCode = generateRequestCode(hour, minute, isChime, isCustom);

            Intent intent = new Intent(context, TrafficControlReceiver.class);
            intent.putExtra("time", time);
            intent.putExtra("slotKey", slotKey);
            intent.putExtra("title", title);
            intent.putExtra("isChime", isChime);
            intent.putExtra("isCustom", isCustom);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags);

            long triggerMillis = calendar.getTimeInMillis();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent);
            }

            Log.d(TAG, "Scheduled alarm: " + time + " (ReqCode: " + requestCode + ") at " + calendar.getTime());
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule alarm for " + time + ": " + e.getMessage());
        }
    }

    public static void cancelAll(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        // Cancel default traffic slots
        for (AlarmSlot slot : DEFAULT_TRAFFIC_SLOTS) {
            try {
                String[] parts = slot.time.split(":");
                int hour = Integer.parseInt(parts[0].trim());
                int minute = Integer.parseInt(parts[1].trim());
                int reqCode = generateRequestCode(hour, minute, false, false);
                Intent intent = new Intent(context, TrafficControlReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(context, reqCode, intent, flags);
                alarmManager.cancel(pi);
            } catch (Exception ignored) {}
        }

        // Cancel hourly chimes
        for (String chimeTime : HOURLY_CHIME_TIMES) {
            try {
                String[] parts = chimeTime.split(":");
                int hour = Integer.parseInt(parts[0].trim());
                int minute = Integer.parseInt(parts[1].trim());
                int reqCode = generateRequestCode(hour, minute, true, false);
                Intent intent = new Intent(context, TrafficControlReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(context, reqCode, intent, flags);
                alarmManager.cancel(pi);
            } catch (Exception ignored) {}
        }
    }

    private static int generateRequestCode(int hour, int minute, boolean isChime, boolean isCustom) {
        if (isCustom) {
            return 30000 + hour * 100 + minute;
        } else if (isChime) {
            return 20000 + hour * 100 + minute;
        } else {
            return hour * 100 + minute;
        }
    }
}
