package com.bkkozhikode.connectgod;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.content.ContextCompat;

public class TrafficControlReceiver extends BroadcastReceiver {
    private static final String TAG = "TrafficReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.i(TAG, "Traffic Control hardware alarm triggered: " + intent.getStringExtra("time") + " (" + intent.getStringExtra("slotKey") + ")");

        // 1. Acquire temporary partial WakeLock so CPU doesn't sleep while starting service
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ConnectGod:TrafficAlarmWakeLock");
            wakeLock.acquire(15000); // 15s hold
        }

        try {
            // 2. Start dedicated Foreground Audio Service
            Intent serviceIntent = new Intent(context, TrafficControlAudioService.class);
            serviceIntent.putExtras(intent);
            ContextCompat.startForegroundService(context, serviceIntent);

            // 3. Immediately re-schedule this exact slot for tomorrow
            TrafficControlScheduler.rescheduleSlotNextDay(context, intent);
        } catch (Exception e) {
            Log.e(TAG, "Error starting TrafficControlAudioService: " + e.getMessage(), e);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                } catch (Exception ignored) {}
            }
        }
    }
}
