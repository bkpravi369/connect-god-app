package com.bkkozhikode.connectgod;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class TrafficControlBootReceiver extends BroadcastReceiver {
    private static final String TAG = "TrafficBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.i(TAG, "Device boot event detected: " + action + ". Re-scheduling Traffic Control alarms...");

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
            try {
                TrafficControlScheduler.rescheduleAllFromPreferences(context);
            } catch (Exception e) {
                Log.e(TAG, "Failed to reschedule on boot: " + e.getMessage(), e);
            }
        }
    }
}
