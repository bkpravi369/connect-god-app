package com.bkkozhikode.connectgod;

import android.app.Activity;
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

@CapacitorPlugin(name = "TrafficControlNative")
public class TrafficControlPlugin extends Plugin {
    private static final String TAG = "TrafficControlPlugin";
    private MediaPlayer previewPlayer = null;

    @PluginMethod
    public void getAlarmStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("exactAlarmsAllowed", TrafficControlScheduler.canSchedule(getContext()));
        result.put("version", 4);
        result.put("supportsCustomTones", true);
        int vCode = 13;
        String vName = "1.0.12";
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
        try {
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

            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("audio/*");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
            intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);

            PackageManager pm = getContext().getPackageManager();
            if (intent.resolveActivity(pm) == null) {
                // Fallback to ACTION_GET_CONTENT for devices without document provider
                intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("audio/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }

            Intent chooser = Intent.createChooser(intent, "Select Alarm Audio File");
            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_LAUNCHED", "Audio picker opened");
            startActivityForResult(call, chooser, "pickCustomAudioResult");
        } catch (Exception e) {
            Log.e(TAG, "Error launching file picker: " + e.getMessage(), e);
            TrafficControlDiagnostics.recordEvent(getContext(), "SYSTEM", "AUDIO_PICKER_ERROR", "Launch failed: " + e.getMessage());
            call.reject("Failed to open audio file picker: " + e.getMessage());
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
