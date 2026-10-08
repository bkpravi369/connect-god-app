package com.bkkozhikode.connectgod;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;

@CapacitorPlugin(name = "TrafficControlNative")
public class TrafficControlPlugin extends Plugin {
    private static final String TAG = "TrafficControlPlugin";
    private MediaPlayer previewPlayer = null;

    public interface ActivityLauncher {
        void startActivityForResult(PluginCall call, Intent intent, String callbackName);
    }

    private ActivityLauncher activityLauncher = new ActivityLauncher() {
        @Override
        public void startActivityForResult(PluginCall call, Intent intent, String callbackName) {
            TrafficControlPlugin.super.startActivityForResult(call, intent, callbackName);
        }
    };

    public void setActivityLauncher(ActivityLauncher launcher) {
        this.activityLauncher = launcher;
    }

    public void resetActivityLauncher() {
        this.activityLauncher = new ActivityLauncher() {
            @Override
            public void startActivityForResult(PluginCall call, Intent intent, String callbackName) {
                TrafficControlPlugin.super.startActivityForResult(call, intent, callbackName);
            }
        };
    }

    @Override
    public Context getContext() {
        try {
            return super.getContext();
        } catch (Exception e) {
            return null;
        }
    }

    @PluginMethod
    public void getAlarmStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("exactAlarmsAllowed", TrafficControlScheduler.canSchedule(getContext()));
        result.put("version", 4);
        result.put("supportsCustomTones", true);
        int vCode = 14;
        String vName = "1.0.13";
        try {
            Context ctx = getContext();
            android.content.pm.PackageInfo pInfo = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            vCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? (int) pInfo.getLongVersionCode() : pInfo.versionCode;
            if (pInfo.versionName != null) {
                vName = pInfo.versionName;
            }
        } catch (Exception ignored) {}
        result.put("nativeVersionCode", vCode);
        result.put("nativeVersionName", vName);
        TrafficControlScheduler.recoverInterruptedSchedule(getContext());
        TrafficControlScheduler.recoverPendingReschedules(getContext());
        String lastError = TrafficControlDiagnostics.getLastScheduleError(getContext());
        result.put("lastScheduleError", lastError != null ? lastError : "");
        call.resolve(result);
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31 && !TrafficControlScheduler.canSchedule(getContext())) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void scheduleAlarms(PluginCall call) {
        try {
            String slots = call.getString("slots", "[]");
            TrafficControlScheduler.scheduleAll(getContext(), slots);

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
            // Stop any currently playing alarm service as well
            try {
                Intent stopIntent = new Intent(getContext(), TrafficControlAudioService.class);
                stopIntent.setAction(TrafficControlAudioService.ACTION_STOP);
                getContext().startService(stopIntent);
            } catch (Exception ignored) {}

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in cancelAllAlarms: " + e.getMessage(), e);
            call.reject("Failed to cancel native alarms: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopAlarmPlayback(PluginCall call) {
        try {
            Intent stopIntent = new Intent(getContext(), TrafficControlAudioService.class);
            stopIntent.setAction(TrafficControlAudioService.ACTION_STOP);
            getContext().startService(stopIntent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping alarm playback: " + e.getMessage(), e);
            call.reject("Failed to stop alarm playback: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getDiagnostics(PluginCall call) {
        try {
            JSONObject diag = TrafficControlDiagnostics.getDiagnosticsJson(getContext());
            JSObject ret = JSObject.fromJSONObject(diag);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in getDiagnostics: " + e.getMessage(), e);
            call.reject("Failed to get diagnostics: " + e.getMessage());
        }
    }

    @PluginMethod
    public void exportDiagnostics(PluginCall call) {
        try {
            String report = TrafficControlDiagnostics.getFormattedReport(getContext());
            JSObject ret = new JSObject();
            ret.put("report", report);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in exportDiagnostics: " + e.getMessage(), e);
            call.reject("Failed to export diagnostics: " + e.getMessage());
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

    public static class OemRouteResult {
        public final boolean success;
        public final String openedType;
        public final String message;

        public OemRouteResult(boolean success, String openedType, String message) {
            this.success = success;
            this.openedType = openedType;
            this.message = message;
        }
    }

    @PluginMethod
    public void openOemBackgroundSettings(PluginCall call) {
        try {
            OemRouteResult result = routeOemBackgroundIntent(getContext());
            JSObject ret = new JSObject();
            ret.put("success", result.success);
            ret.put("openedType", result.openedType);
            ret.put("message", result.message);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in openOemBackgroundSettings: " + e.getMessage(), e);
            call.reject("Failed to open OEM background settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getDeviceBrandName(PluginCall call) {
        String raw = Build.MANUFACTURER != null ? Build.MANUFACTURER.trim() : "";
        String brandName = "Your Device";
        if (!raw.isEmpty()) {
            brandName = Character.toUpperCase(raw.charAt(0)) + (raw.length() > 1 ? raw.substring(1) : "");
        }
        JSObject ret = new JSObject();
        ret.put("manufacturer", raw.toLowerCase(Locale.ROOT));
        ret.put("brandName", brandName);
        call.resolve(ret);
    }

    /**
     * Robust Multi-Tier OEM Background Killer Protection Intent Launcher:
     * Tier 1: Try manufacturer-specific Battery / Autostart intent.
     *   - Xiaomi/MIUI: POWER_HIDE_MODE_APP_LIST, com.miui.powerkeeper, OP_AUTO_START, com.miui.securitycenter
     *   - Vivo/iQOO: com.iqoo.secure AddWhiteListActivity, BgStartUpManager
     *   - Oppo/OnePlus/Realme: com.coloros.safecenter StartupAppListActivity, com.oppo.safe
     *   - Standard Android: Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
     * Tier 2 (Universal Fallback): Official App Details Settings via Uri.fromParts("package", getPackageName(), null)
     */
    public static OemRouteResult routeOemBackgroundIntent(Context context) {
        if (context == null) {
            return new OemRouteResult(false, "none", "Context is null");
        }
        String manufacturer = Build.MANUFACTURER != null ? Build.MANUFACTURER.toLowerCase(Locale.ROOT) : "";
        String pkg = context.getPackageName();

        // ── 1. Xiaomi / Redmi / Poco ──────────────────────────────────────────
        if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco")) {
            // Tier 1a: Try MIUI Power Hide Mode (Battery Saver -> No Restrictions directly)
            try {
                Intent intent = new Intent("miui.intent.action.POWER_HIDE_MODE_APP_LIST");
                intent.addCategory(Intent.CATEGORY_DEFAULT);
                intent.putExtra("package_name", pkg);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_ROUTED", "Launched Xiaomi POWER_HIDE_MODE_APP_LIST");
                return new OemRouteResult(true, "battery_saver", "Opened Xiaomi Battery Saver Settings");
            } catch (Exception e1) {
                Log.d(TAG, "Xiaomi POWER_HIDE_MODE_APP_LIST failed: " + e1.getMessage());
            }

            // Tier 1b: Try Powerkeeper HiddenAppsConfigActivity
            try {
                Intent intent = new Intent();
                intent.setComponent(new ComponentName("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"));
                intent.putExtra("package_name", pkg);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_ROUTED", "Launched Xiaomi HiddenAppsConfigActivity");
                return new OemRouteResult(true, "battery_saver", "Opened Xiaomi PowerKeeper Settings");
            } catch (Exception e2) {
                Log.d(TAG, "Xiaomi HiddenAppsConfigActivity failed: " + e2.getMessage());
            }

            // Tier 1c: Try MIUI Autostart
            try {
                Intent intent = new Intent("miui.intent.action.OP_AUTO_START");
                intent.addCategory(Intent.CATEGORY_DEFAULT);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_ROUTED", "Launched Xiaomi OP_AUTO_START");
                return new OemRouteResult(true, "autostart", "Opened Xiaomi Autostart Settings");
            } catch (Exception e3) {
                Log.d(TAG, "Xiaomi OP_AUTO_START failed: " + e3.getMessage());
            }

            // Tier 1d: Try Security Center Autostart
            try {
                Intent intent = new Intent();
                intent.setComponent(new ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_ROUTED", "Launched Xiaomi Security Center Autostart");
                return new OemRouteResult(true, "autostart", "Opened Xiaomi Security Center");
            } catch (Exception e4) {
                Log.d(TAG, "Xiaomi Security Center Autostart failed: " + e4.getMessage());
            }

            // Tier 1e: Try standard battery optimization dialog on Xiaomi
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + pkg));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "STANDARD_BATTERY_ROUTED", "Requested standard battery optimization exemption on Xiaomi");
                    return new OemRouteResult(true, "battery_dialog", "Opened Battery Optimization Dialog");
                } catch (Exception e5) {
                    Log.d(TAG, "Xiaomi ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS failed: " + e5.getMessage());
                }
            }

            // Tier 2: Universal Fallback to App Details Settings
            boolean appSettingsOpened = openAppSettings(context);
            TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_FALLBACK", "Opened App Details Settings on Xiaomi");
            return new OemRouteResult(appSettingsOpened, "app_settings", "Please select Battery Saver -> No restrictions inside App info.");
        }

        // ── 2. Vivo / iQOO ────────────────────────────────────────────────────
        if (manufacturer.contains("vivo") || manufacturer.contains("iqoo")) {
            try {
                Intent intent = new Intent();
                intent.setComponent(new ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_ROUTED", "Launched Vivo iQOO AddWhiteListActivity");
                return new OemRouteResult(true, "autostart", "Opened Vivo Whitelist Manager");
            } catch (Exception e1) {
                try {
                    Intent intent = new Intent();
                    intent.setComponent(new ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_ROUTED", "Launched Vivo BgStartUpManager");
                    return new OemRouteResult(true, "autostart", "Opened Vivo BgStartUpManager");
                } catch (Exception e2) {
                    try {
                        Intent intent = new Intent();
                        intent.setComponent(new ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_ROUTED", "Launched Vivo BgStartUpManagerActivity");
                        return new OemRouteResult(true, "autostart", "Opened Vivo Permission Manager");
                    } catch (Exception e3) {
                        Log.d(TAG, "Vivo specific intents failed: " + e3.getMessage());
                    }
                }
            }
            boolean appSettingsOpened = openAppSettings(context);
            TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_FALLBACK", "Opened App Details Settings on Vivo");
            return new OemRouteResult(appSettingsOpened, "app_settings", "Please select Battery Saver -> No restrictions inside App info.");
        }

        // ── 3. Oppo / OnePlus / Realme ────────────────────────────────────────
        if (manufacturer.contains("oppo") || manufacturer.contains("oneplus") || manufacturer.contains("realme")) {
            try {
                Intent intent = new Intent();
                intent.setComponent(new ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_ROUTED", "Launched Oppo StartupAppListActivity");
                return new OemRouteResult(true, "autostart", "Opened ColorOS Startup App List");
            } catch (Exception e1) {
                try {
                    Intent intent = new Intent();
                    intent.setComponent(new ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_ROUTED", "Launched Oppo startupapp Activity");
                    return new OemRouteResult(true, "autostart", "Opened ColorOS Startup Manager");
                } catch (Exception e2) {
                    try {
                        Intent intent = new Intent();
                        intent.setComponent(new ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_ROUTED", "Launched Oppo Safe Startup Activity");
                        return new OemRouteResult(true, "autostart", "Opened Oppo Safe Manager");
                    } catch (Exception e3) {
                        Log.d(TAG, "Oppo/OnePlus specific intents failed: " + e3.getMessage());
                    }
                }
            }
            boolean appSettingsOpened = openAppSettings(context);
            TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_FALLBACK", "Opened App Details Settings on Oppo/OnePlus");
            return new OemRouteResult(appSettingsOpened, "app_settings", "Please select Battery Saver -> No restrictions inside App info.");
        }

        // ── 4. Standard Android / Samsung ──────────────────────────────────────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + pkg));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "STANDARD_BATTERY_ROUTED", "Requested standard battery optimization exemption");
                return new OemRouteResult(true, "battery_dialog", "Opened Battery Optimization Exemption Dialog");
            } catch (Exception e) {
                Log.d(TAG, "ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS failed: " + e.getMessage());
                try {
                    Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "STANDARD_BATTERY_ROUTED", "Opened battery optimization settings list");
                    return new OemRouteResult(true, "battery_saver", "Opened Battery Optimization Settings");
                } catch (Exception e2) {
                    Log.d(TAG, "ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS failed: " + e2.getMessage());
                }
            }
        }

        // ── Tier 2: Universal Fallback ─────────────────────────────────────────
        boolean appDetailsOpened = openAppSettings(context);
        TrafficControlDiagnostics.recordEvent(context, "SYSTEM", "OEM_FALLBACK", "Opened App Details Settings via Universal Fallback");
        return new OemRouteResult(appDetailsOpened, "app_settings", "Please select Battery Saver -> No restrictions inside App info.");
    }

    public static boolean openAppSettings(Context context) {
        if (context == null) return false;
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", context.getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Failed to open application details settings with fromParts: " + e.getMessage());
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                return true;
            } catch (Exception e2) {
                try {
                    Intent intent = new Intent(Settings.ACTION_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    return true;
                } catch (Exception e3) {
                    Log.e(TAG, "Failed to open any settings: " + e3.getMessage());
                    return false;
                }
            }
        }
    }

    @PluginMethod
    public void getSystemRingtones(PluginCall call) {
        try {
            RingtoneManager manager = new RingtoneManager(getContext());
            manager.setType(RingtoneManager.TYPE_ALARM);
            Cursor cursor = manager.getCursor();
            JSArray list = new JSArray();
            while (cursor != null && cursor.moveToNext()) {
                int pos = cursor.getPosition();
                Uri uri = manager.getRingtoneUri(pos);
                String title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX);
                if (uri != null && title != null && !title.trim().isEmpty()) {
                    JSObject item = new JSObject();
                    item.put("title", title);
                    item.put("uri", uri.toString());
                    list.put(item);
                }
            }
            if (list.length() == 0) {
                manager.setType(RingtoneManager.TYPE_NOTIFICATION);
                cursor = manager.getCursor();
                while (cursor != null && cursor.moveToNext()) {
                    int pos = cursor.getPosition();
                    Uri uri = manager.getRingtoneUri(pos);
                    String title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX);
                    if (uri != null && title != null && !title.trim().isEmpty()) {
                        JSObject item = new JSObject();
                        item.put("title", title);
                        item.put("uri", uri.toString());
                        list.put(item);
                    }
                }
            }
            JSObject ret = new JSObject();
            ret.put("ringtones", list);
            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "RINGTONES_FETCHED", "Loaded " + list.length() + " device ringtones");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error fetching system ringtones: " + e.getMessage(), e);
            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "RINGTONES_ERROR", "Failed to retrieve tones: " + e.getMessage());
            call.reject("Failed to retrieve system ringtones: " + e.getMessage());
        }
    }

    @PluginMethod
    public void pickCustomAudio(PluginCall call) {
        String[] mimeTypes = new String[]{
            "audio/*",
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/x-wav",
            "audio/ogg",
            "audio/m4a",
            "audio/aac",
            "application/ogg"
        };

        // 1. Prepare primary intent: ACTION_OPEN_DOCUMENT
        Intent openDocIntent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        openDocIntent.addCategory(Intent.CATEGORY_OPENABLE);
        openDocIntent.setType("audio/*");
        openDocIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        openDocIntent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
        Intent primaryChooser = Intent.createChooser(openDocIntent, "Select Alarm Audio File");

        try {
            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_LAUNCHED", "Attempting ACTION_OPEN_DOCUMENT");
            activityLauncher.startActivityForResult(call, primaryChooser, "pickCustomAudioResult");
            return;
        } catch (Exception primaryEx) {
            Log.w(TAG, "ACTION_OPEN_DOCUMENT launch failed, attempting ACTION_GET_CONTENT fallback: " + primaryEx.getMessage());
            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_FALLBACK", "Primary launch failed: " + primaryEx.getMessage());
        }

        // 2. Prepare secondary fallback intent: ACTION_GET_CONTENT
        try {
            Intent getContentIntent = new Intent(Intent.ACTION_GET_CONTENT);
            getContentIntent.addCategory(Intent.CATEGORY_OPENABLE);
            getContentIntent.setType("audio/*");
            getContentIntent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
            getContentIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent fallbackChooser = Intent.createChooser(getContentIntent, "Select Alarm Audio File");

            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_LAUNCHED", "Attempting ACTION_GET_CONTENT fallback");
            activityLauncher.startActivityForResult(call, fallbackChooser, "pickCustomAudioResult");
        } catch (Exception fallbackEx) {
            Log.e(TAG, "All audio picker intents failed to launch: " + fallbackEx.getMessage(), fallbackEx);
            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_ERROR", "All launch attempts failed: " + fallbackEx.getMessage());
            call.reject("Failed to open audio file picker: " + fallbackEx.getMessage());
        }
    }

    @ActivityCallback
    public void pickCustomAudioResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            Log.w(TAG, "pickCustomAudioResult called with null call");
            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_DROPPED", "PluginCall was null on callback");
            return;
        }
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_CANCELLED", "User cancelled or no audio chosen");
            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            call.resolve(ret);
            return;
        }

        Uri uri = result.getData().getData();
        try {
            try {
                getContext().getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {}

            String displayName = "Custom Audio";
            try (Cursor cursor = getContext().getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (idx != -1) {
                        String name = cursor.getString(idx);
                        if (name != null && !name.trim().isEmpty()) {
                            displayName = name;
                        }
                    }
                }
            } catch (Exception ignored) {}

            // Save into device protected storage context so it is accessible before first unlock / reboot
            Context storageContext = Build.VERSION.SDK_INT >= 24 ? getContext().createDeviceProtectedStorageContext() : getContext();
            File customAudioDir = new File(storageContext.getFilesDir(), "custom_audio");
            if (!customAudioDir.exists()) {
                customAudioDir.mkdirs();
            }

            String ext = ".mp3";
            int dotIdx = displayName.lastIndexOf(".");
            if (dotIdx != -1 && dotIdx < displayName.length() - 1) {
                String candidate = displayName.substring(dotIdx).toLowerCase();
                if (candidate.matches("^\\.[a-z0-9]{2,5}$")) {
                    ext = candidate;
                }
            }
            String safeName = "custom_tone_" + System.currentTimeMillis() + ext;
            File destFile = new File(customAudioDir, safeName);

            try (InputStream in = getContext().getContentResolver().openInputStream(uri);
                 OutputStream out = new FileOutputStream(destFile)) {
                if (in == null) {
                    TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_ERROR", "Unable to open input stream for " + displayName);
                    call.reject("Unable to open audio stream from selected file.");
                    return;
                }
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
            }

            // Verify file validity with MediaPlayer using open FileDescriptor to avoid EACCES in mediaserver
            MediaPlayer testMp = new MediaPlayer();
            try {
                try (FileInputStream fis = new FileInputStream(destFile)) {
                    testMp.setDataSource(fis.getFD());
                }
                testMp.prepare();
                int duration = testMp.getDuration();
                testMp.release();
                if (duration <= 0) {
                    destFile.delete();
                    TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_INVALID", "Invalid duration (" + duration + "ms) for " + displayName);
                    call.reject("Selected file has invalid duration or cannot be decoded.");
                    return;
                }
            } catch (Exception ex) {
                destFile.delete();
                try { testMp.release(); } catch (Exception ignored) {}
                TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_INVALID", "Format error: " + ex.getMessage());
                call.reject("Selected file is not a supported audio format: " + ex.getMessage());
                return;
            }

            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_SUCCESS", "Imported: " + displayName + " (" + destFile.length() + " bytes)");
            JSObject ret = new JSObject();
            ret.put("cancelled", false);
            ret.put("toneType", "file");
            ret.put("toneUri", destFile.getAbsolutePath());
            ret.put("toneTitle", displayName);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error importing custom audio: " + e.getMessage(), e);
            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_ERROR", "Exception importing: " + e.getMessage());
            call.reject("Failed to import audio file: " + e.getMessage());
        }
    }

    @PluginMethod
    public synchronized void playTonePreview(PluginCall call) {
        try {
            stopCurrentPreview();
            String toneType = call.getString("toneType", "bundled");
            String toneUri = call.getString("toneUri", "");
            String slotKey = call.getString("slotKey", "hourly_chime");

            previewPlayer = new MediaPlayer();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                previewPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());
            } else {
                previewPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);
            }

            boolean loaded = false;
            if ("file".equalsIgnoreCase(toneType) && toneUri != null && !toneUri.isEmpty()) {
                File file = new File(toneUri);
                if (file.exists() && file.canRead()) {
                    try (FileInputStream fis = new FileInputStream(file)) {
                        previewPlayer.setDataSource(fis.getFD());
                    }
                    loaded = true;
                }
            } else if ("system".equalsIgnoreCase(toneType) && toneUri != null && !toneUri.isEmpty()) {
                previewPlayer.setDataSource(getContext(), Uri.parse(toneUri));
                loaded = true;
            }

            if (!loaded) {
                int res = R.raw.tc_hourly_chime;
                if ("bundled".equalsIgnoreCase(toneType) && toneUri != null && !toneUri.isEmpty()) {
                    res = getRawAudioResId(toneUri);
                } else if (slotKey != null && !slotKey.isEmpty()) {
                    res = getRawAudioResId(slotKey);
                }
                try (AssetFileDescriptor afd = getContext().getResources().openRawResourceFd(res)) {
                    previewPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                }
            }

            previewPlayer.setOnCompletionListener(mp -> stopCurrentPreview());
            previewPlayer.setOnErrorListener((mp, what, extra) -> {
                stopCurrentPreview();
                return true;
            });

            previewPlayer.prepare();
            previewPlayer.start();

            JSObject ret = new JSObject();
            ret.put("playing", true);
            call.resolve(ret);
        } catch (Exception e) {
            stopCurrentPreview();
            Log.e(TAG, "Error playing tone preview: " + e.getMessage(), e);
            call.reject("Error playing preview: " + e.getMessage());
        }
    }

    @PluginMethod
    public synchronized void stopTonePreview(PluginCall call) {
        stopCurrentPreview();
        JSObject ret = new JSObject();
        ret.put("playing", false);
        call.resolve(ret);
    }

    private synchronized void stopCurrentPreview() {
        if (previewPlayer != null) {
            try {
                if (previewPlayer.isPlaying()) {
                    previewPlayer.stop();
                }
                previewPlayer.reset();
                previewPlayer.release();
            } catch (Exception ignored) {}
            previewPlayer = null;
        }
    }

    private int getRawAudioResId(String key) {
        switch (key == null ? "" : key) {
            case "amritvela": return R.raw.tc_amritvela;
            case "early_morning": return R.raw.tc_early_morning;
            case "morning": return R.raw.tc_morning;
            case "mid_morning": return R.raw.tc_mid_morning;
            case "noon": return R.raw.tc_noon;
            case "evening": return R.raw.tc_evening;
            case "dusk": return R.raw.tc_dusk;
            case "night": return R.raw.tc_night;
            case "late_night": return R.raw.tc_late_night;
            default: return R.raw.tc_hourly_chime;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopCurrentPreview();
        super.handleOnDestroy();
    }
}
