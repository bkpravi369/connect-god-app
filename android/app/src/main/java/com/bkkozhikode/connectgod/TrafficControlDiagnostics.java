package com.bkkozhikode.connectgod;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class TrafficControlDiagnostics {
    private static final String TAG = "TrafficDiagnostics";
    private static final String PREFS_NAME = "traffic_control_diagnostics_v1";
    private static final int MAX_EVENTS = 60;

    private static SharedPreferences prefs(Context context) {
        if (Build.VERSION.SDK_INT >= 24) {
            context = context.createDeviceProtectedStorageContext();
        }
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static String formatTime(long millis) {
        if (millis <= 0) return "Never";
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
        return sdf.format(new Date(millis));
    }

    public static synchronized void recordEvent(Context context, String slotId, String event, String details) {
        try {
            SharedPreferences p = prefs(context);
            JSONArray events = new JSONArray(p.getString("events", "[]"));
            JSONObject item = new JSONObject();
            long now = System.currentTimeMillis();
            item.put("timestamp", now);
            item.put("timeFormatted", formatTime(now));
            item.put("slotId", slotId == null ? "SYSTEM" : slotId);
            item.put("event", event);
            item.put("details", details == null ? "" : details);

            events.put(item);
            while (events.length() > MAX_EVENTS) {
                events.remove(0);
            }
            p.edit().putString("events", events.toString()).apply();
            Log.d(TAG, "[" + event + "] " + slotId + ": " + details);
        } catch (Exception e) {
            Log.e(TAG, "Error recording diagnostic event", e);
        }
    }

    public static synchronized void recordScheduled(Context context, String id, String time, String slotKey, String title, long triggerMillis) {
        try {
            SharedPreferences p = prefs(context);
            JSONObject slot = getSlotRecord(context, id);
            slot.put("id", id);
            slot.put("time", time);
            slot.put("slotKey", slotKey);
            slot.put("title", title);
            slot.put("scheduledTrigger", triggerMillis);
            slot.put("scheduledTriggerFormatted", formatTime(triggerMillis));
            slot.put("nextScheduledAt", triggerMillis);
            slot.put("nextScheduledFormatted", formatTime(triggerMillis));
            slot.put("lastStatus", "SCHEDULED");
            saveSlotRecord(context, id, slot);

            recordEvent(context, id, "SCHEDULED", "Armed for " + formatTime(triggerMillis));
        } catch (Exception e) {
            Log.e(TAG, "Error recording scheduled slot", e);
        }
    }

    public static synchronized void recordReceived(Context context, String id, long triggerMillis, long receivedAtMillis) {
        try {
            JSONObject slot = getSlotRecord(context, id);
            slot.put("lastReceivedAt", receivedAtMillis);
            slot.put("lastReceivedFormatted", formatTime(receivedAtMillis));
            slot.put("lastStatus", "RECEIVED");
            saveSlotRecord(context, id, slot);

            long drift = receivedAtMillis - triggerMillis;
            recordEvent(context, id, "RECEIVED", "Received by BroadcastReceiver (drift: " + drift + "ms)");
        } catch (Exception e) {
            Log.e(TAG, "Error recording received slot", e);
        }
    }

    public static synchronized void recordPlaybackStarted(Context context, String id, int retryAttempt) {
        try {
            long now = System.currentTimeMillis();
            JSONObject slot = getSlotRecord(context, id);
            slot.put("lastPlaybackStartedAt", now);
            slot.put("lastPlaybackStartedFormatted", formatTime(now));
            slot.put("retryCount", retryAttempt);
            slot.put("lastStatus", "PLAYING");
            slot.put("lastError", "");
            saveSlotRecord(context, id, slot);

            recordEvent(context, id, "PLAYBACK_STARTED", "Audio playback started (attempt " + (retryAttempt + 1) + ")");
        } catch (Exception e) {
            Log.e(TAG, "Error recording playback started", e);
        }
    }

    public static synchronized void recordStatus(Context context, String id, String status, String details) {
        try {
            JSONObject slot = getSlotRecord(context, id);
            slot.put("lastStatus", status);
            if (details != null && !details.isEmpty()) {
                slot.put("lastError", details);
            }
            saveSlotRecord(context, id, slot);

            recordEvent(context, id, status, details);
        } catch (Exception e) {
            Log.e(TAG, "Error recording status", e);
        }
    }

    public static synchronized void recordCompleted(Context context, String id) {
        try {
            long now = System.currentTimeMillis();
            JSONObject slot = getSlotRecord(context, id);
            slot.put("lastCompletedAt", now);
            slot.put("lastCompletedFormatted", formatTime(now));
            slot.put("lastStatus", "COMPLETED");
            slot.put("lastError", "");
            saveSlotRecord(context, id, slot);

            recordEvent(context, id, "COMPLETED", "Playback completed normally");
        } catch (Exception e) {
            Log.e(TAG, "Error recording completed slot", e);
        }
    }

    public static synchronized void recordFailed(Context context, String id, String reason) {
        try {
            long now = System.currentTimeMillis();
            JSONObject slot = getSlotRecord(context, id);
            slot.put("lastFailedAt", now);
            slot.put("lastFailedFormatted", formatTime(now));
            slot.put("lastFailureReason", reason);
            slot.put("lastStatus", "FAILED");
            slot.put("lastError", reason);
            saveSlotRecord(context, id, slot);

            recordEvent(context, id, "FAILED", reason);
        } catch (Exception e) {
            Log.e(TAG, "Error recording failed slot", e);
        }
    }

    public static synchronized void recordNextScheduled(Context context, String id, long nextMillis) {
        try {
            JSONObject slot = getSlotRecord(context, id);
            slot.put("nextScheduledAt", nextMillis);
            slot.put("nextScheduledFormatted", formatTime(nextMillis));
            saveSlotRecord(context, id, slot);

            recordEvent(context, id, "NEXT_SCHEDULED", "Next occurrence armed for " + formatTime(nextMillis));
        } catch (Exception e) {
            Log.e(TAG, "Error recording next scheduled slot", e);
        }
    }

    public static synchronized void recordScheduleError(Context context, String error) {
        prefs(context).edit().putString("last_schedule_error", error).apply();
        recordEvent(context, "SYSTEM", "SCHEDULE_ERROR", error);
    }

    public static synchronized void clearScheduleError(Context context) {
        prefs(context).edit().remove("last_schedule_error").apply();
    }

    public static synchronized String getLastScheduleError(Context context) {
        return prefs(context).getString("last_schedule_error", null);
    }

    private static JSONObject getSlotRecord(Context context, String id) {
        try {
            String json = prefs(context).getString("slot_record:" + id, null);
            return json != null ? new JSONObject(json) : new JSONObject();
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private static void saveSlotRecord(Context context, String id, JSONObject slot) {
        prefs(context).edit().putString("slot_record:" + id, slot.toString()).apply();
    }

    public static synchronized JSONObject getDiagnosticsJson(Context context) {
        JSONObject root = new JSONObject();
        try {
            SharedPreferences p = prefs(context);
            // Device Info
            JSONObject device = new JSONObject();
            device.put("manufacturer", Build.MANUFACTURER);
            device.put("model", Build.MODEL);
            device.put("sdkInt", Build.VERSION.SDK_INT);
            device.put("release", Build.VERSION.RELEASE);
            device.put("exactAlarmsAllowed", TrafficControlScheduler.canSchedule(context));

            boolean ignoringBattery = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.os.PowerManager pm = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    ignoringBattery = pm.isIgnoringBatteryOptimizations(context.getPackageName());
                }
            }
            device.put("batteryOptimizationIgnored", ignoringBattery);
            device.put("lastScheduleError", p.getString("last_schedule_error", null));
            root.put("device", device);

            // Active Slots
            JSONArray slotsArray = new JSONArray();
            String slotsJsonStr = TrafficControlScheduler.preferences(context).getString("slots", "[]");
            JSONArray configuredSlots = new JSONArray(slotsJsonStr);
            for (int i = 0; i < configuredSlots.length(); i++) {
                JSONObject cfg = configuredSlots.getJSONObject(i);
                String id = cfg.optString("id");
                JSONObject record = getSlotRecord(context, id);
                record.put("id", id);
                record.put("time", cfg.optString("time"));
                record.put("slotKey", cfg.optString("slotKey"));
                record.put("title", cfg.optString("title"));
                record.put("repeatDays", cfg.optJSONArray("repeatDays"));
                record.put("toneType", cfg.optString("toneType", "bundled"));
                record.put("toneUri", cfg.optString("toneUri", ""));
                record.put("toneTitle", cfg.optString("toneTitle", ""));
                slotsArray.put(record);
            }
            root.put("slots", slotsArray);

            // Recent Events
            root.put("events", new JSONArray(p.getString("events", "[]")));
        } catch (Exception e) {
            Log.e(TAG, "Error generating diagnostics JSON", e);
        }
        return root;
    }

    public static synchronized String getFormattedReport(Context context) {
        StringBuilder sb = new StringBuilder();
        try {
            JSONObject diag = getDiagnosticsJson(context);
            JSONObject dev = diag.optJSONObject("device");

            sb.append("=========================================\n");
            sb.append("   CONNECT GOD TRAFFIC CONTROL REPORT   \n");
            sb.append("=========================================\n");
            sb.append("Generated: ").append(formatTime(System.currentTimeMillis())).append("\n\n");

            if (dev != null) {
                sb.append("--- DEVICE INFO ---\n");
                sb.append("Device: ").append(dev.optString("manufacturer")).append(" ").append(dev.optString("model")).append("\n");
                sb.append("Android OS: ").append(dev.optString("release")).append(" (API ").append(dev.optInt("sdkInt")).append(")\n");
                sb.append("Exact Alarms Allowed: ").append(dev.optBoolean("exactAlarmsAllowed") ? "YES" : "NO (PERMISSION NEEDED)").append("\n");
                sb.append("Battery Optimization Exemption: ").append(dev.optBoolean("batteryOptimizationIgnored") ? "YES" : "NO (RESTRICTED)").append("\n");
                String lastErr = dev.optString("lastScheduleError", "");
                sb.append("Last Schedule Error: ").append(lastErr.isEmpty() || "null".equals(lastErr) ? "NONE" : lastErr).append("\n\n");
            }

            JSONArray slots = diag.optJSONArray("slots");
            sb.append("--- CONFIGURED ALARM SLOTS (").append(slots != null ? slots.length() : 0).append(") ---\n");
            if (slots != null && slots.length() > 0) {
                for (int i = 0; i < slots.length(); i++) {
                    JSONObject s = slots.getJSONObject(i);
                    sb.append("[").append(s.optString("time", "--:--")).append("] ")
                      .append(s.optString("title", "Traffic Slot"))
                      .append(" (").append(s.optString("id")).append(")\n");
                    sb.append("  - Status:         ").append(s.optString("lastStatus", "NOT YET RUN")).append("\n");
                    sb.append("  - Next Scheduled: ").append(s.optString("nextScheduledFormatted", "Not scheduled")).append("\n");
                    sb.append("  - Last Received:  ").append(s.optString("lastReceivedFormatted", "Never")).append("\n");
                    sb.append("  - Last Started:   ").append(s.optString("lastPlaybackStartedFormatted", "Never")).append("\n");
                    sb.append("  - Last Completed: ").append(s.optString("lastCompletedFormatted", "Never")).append("\n");
                    if (s.has("lastFailureReason") && !s.optString("lastFailureReason").isEmpty()) {
                        sb.append("  - Last Failure:   ").append(s.optString("lastFailureReason")).append(" at ").append(s.optString("lastFailedFormatted", "")).append("\n");
                    }
                    sb.append("\n");
                }
            } else {
                sb.append("No active slots configured.\n\n");
            }

            JSONArray events = diag.optJSONArray("events");
            sb.append("--- RECENT EVENT LOG (Last ").append(events != null ? events.length() : 0).append(") ---\n");
            if (events != null && events.length() > 0) {
                for (int i = events.length() - 1; i >= 0; i--) {
                    JSONObject ev = events.getJSONObject(i);
                    sb.append(ev.optString("timeFormatted"))
                      .append(" | [").append(ev.optString("event")).append("] ")
                      .append(ev.optString("slotId")).append(": ")
                      .append(ev.optString("details")).append("\n");
                }
            } else {
                sb.append("No events logged yet.\n");
            }
            sb.append("=========================================\n");
        } catch (Exception e) {
            sb.append("Error generating report: ").append(e.getMessage());
        }
        return sb.toString();
    }
}
