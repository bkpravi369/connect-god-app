package com.bkkozhikode.connectgod;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.content.ContextCompat;

import org.json.JSONObject;

public class TrafficControlReceiver extends BroadcastReceiver {
    private static final String TAG = "TrafficReceiver";
    private static final long STALE_ALARM_THRESHOLD_MS = 15 * 60 * 1000L; // 15 minutes

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && TrafficControlScheduler.ACTION_RECOVER_SCHEDULE.equals(intent.getAction())) {
            Log.i(TAG, "Traffic Control recovery alarm triggered");
            PowerManager pm = context != null ? (PowerManager) context.getSystemService(Context.POWER_SERVICE) : null;
            PowerManager.WakeLock wakeLock = null;
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ConnectGod:TrafficRecoveryWakeLock");
                wakeLock.acquire(15000); // 15s hold
            }
            try {
                TrafficControlScheduler.recoverPendingReschedules(context);
            } finally {
                if (wakeLock != null && wakeLock.isHeld()) {
                    try {
                        wakeLock.release();
                    } catch (Exception ignored) {}
                }
            }
            return;
        }

        String slotId = intent != null ? intent.getStringExtra("id") : null;
        long triggerTime = intent != null ? intent.getLongExtra("trigger", System.currentTimeMillis()) : System.currentTimeMillis();
        long now = System.currentTimeMillis();

        Log.i(TAG, "Traffic Control hardware alarm triggered for: " + slotId + " (trigger=" + triggerTime + ", now=" + now + ")");

        // 1. Record broadcast receipt immediately
        if (slotId != null) {
            TrafficControlDiagnostics.recordReceived(context, slotId, triggerTime, now);
        }

        // 2. Check for stale missed alarm (e.g. phone was powered off or in deep sleep for hours)
        long drift = now - triggerTime;
        if (drift > STALE_ALARM_THRESHOLD_MS) {
            Log.w(TAG, "Alarm " + slotId + " is stale by " + (drift / 1000) + "s. Skipping audio playback to avoid burst playback.");
            if (slotId != null) {
                TrafficControlDiagnostics.recordStatus(context, slotId, "MISSED_STALE", "Alarm fired " + (drift / 1000) + "s late; audio playback skipped to avoid burst");
            }
            try {
                // Claim and reschedule tomorrow without playing today
                TrafficControlScheduler.claim(context, intent);
            } catch (Exception e) {
                Log.e(TAG, "Error rescheduling stale slot: " + e.getMessage(), e);
            }
            return;
        }

        // 3. Acquire temporary partial WakeLock so CPU doesn't sleep while starting service
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ConnectGod:TrafficAlarmWakeLock");
            wakeLock.acquire(20000); // 20s hold
        }

        try {
            JSONObject slot = TrafficControlScheduler.claim(context, intent);
            if (slot == null) {
                Log.i(TAG, "Slot " + slotId + " claimed as duplicate or inactive. No playback needed.");
                return;
            }

            TrafficControlDiagnostics.recordStatus(context, slotId, "CLAIMED", "Alarm claimed by receiver; starting service");

            // 4. Start dedicated Foreground Audio Service with bounded retry
            Intent serviceIntent = new Intent(context, TrafficControlAudioService.class);
            serviceIntent.putExtra("slotId", slot.optString("id", slotId));
            serviceIntent.putExtra("title", slot.optString("title", "Traffic Control"));
            serviceIntent.putExtra("slotKey", slot.optString("slotKey", "hourly_chime"));
            serviceIntent.putExtra("triggerTime", triggerTime);
            serviceIntent.putExtra("toneType", slot.optString("toneType", ""));
            serviceIntent.putExtra("toneUri", slot.optString("toneUri", ""));

            boolean started = false;
            Exception lastException = null;
            for (int attempt = 1; attempt <= 2; attempt++) {
                try {
                    ContextCompat.startForegroundService(context, serviceIntent);
                    started = true;
                    break;
                } catch (Exception e) {
                    lastException = e;
                    Log.w(TAG, "Attempt " + attempt + " failed to start service: " + e.getMessage());
                    if (attempt < 2) {
                        try { Thread.sleep(200); } catch (InterruptedException ignored) {}
                    }
                }
            }

            if (!started) {
                Log.e(TAG, "Error starting TrafficControlAudioService after retries", lastException);
                if (slotId != null) {
                    TrafficControlDiagnostics.recordFailed(context, slotId, "Foreground service start failed: " + (lastException != null ? lastException.getMessage() : "unknown"));
                    TrafficControlScheduler.resetPlayedForSlot(context, slotId);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting TrafficControlAudioService: " + e.getMessage(), e);
            if (slotId != null) {
                TrafficControlDiagnostics.recordFailed(context, slotId, "Receiver service start failed: " + e.getMessage());
                TrafficControlScheduler.resetPlayedForSlot(context, slotId);
            }
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                } catch (Exception ignored) {}
            }
        }
    }
}
