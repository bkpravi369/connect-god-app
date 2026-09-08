package com.bkkozhikode.connectgod;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class TrafficControlBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        // Re-arm only. Never start media playback directly from a boot broadcast.
        try { TrafficControlScheduler.rescheduleAllFromPreferences(context); }
        catch (Exception e) { Log.e("TrafficBootReceiver", "Unable to restore alarms", e); }
    }
}
