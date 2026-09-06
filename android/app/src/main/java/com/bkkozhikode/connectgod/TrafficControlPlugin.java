package com.bkkozhikode.connectgod;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TrafficControlNative")
public class TrafficControlPlugin extends Plugin {
    private static final String TAG = "TrafficControlPlugin";

    @PluginMethod
    public void scheduleAlarms(PluginCall call) {
        try {
            boolean trafficEnabled = call.getBoolean("trafficEnabled", true);
            boolean hourlyEnabled = call.getBoolean("hourlyEnabled", true);
            String customAlarmsJson = call.getString("customAlarms", "[]");

            Context context = getContext();
            TrafficControlScheduler.scheduleAll(context, trafficEnabled, hourlyEnabled, customAlarmsJson);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in scheduleAlarms: " + e.getMessage(), e);
            call.reject("Failed to schedule native alarms: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        try {
            TrafficControlScheduler.cancelAll(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in cancelAllAlarms: " + e.getMessage(), e);
            call.reject("Failed to cancel native alarms: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        boolean isIgnoring = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                isIgnoring = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
            }
        }
        JSObject ret = new JSObject();
        ret.put("isIgnoring", isIgnoring);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(getContext().getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);

                    JSObject ret = new JSObject();
                    ret.put("requested", true);
                    call.resolve(ret);
                    return;
                }
            }
            JSObject ret = new JSObject();
            ret.put("requested", false);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery exemption: " + e.getMessage(), e);
            call.reject("Unable to request battery exemption: " + e.getMessage());
        }
    }
}
