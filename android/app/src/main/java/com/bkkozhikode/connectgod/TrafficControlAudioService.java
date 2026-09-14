package com.bkkozhikode.connectgod;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.AudioFocusRequest;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class TrafficControlAudioService extends Service {
    private static final String TAG = "TrafficAudioService";
    private static final String CHANNEL_ID = "traffic_control_playback_v2";
    private static final int NOTIFICATION_ID = 99991;

    public static final String ACTION_STOP = "com.bkkozhikode.connectgod.ACTION_STOP_TRAFFIC_AUDIO";

    private static final int MAX_RETRIES = 3;
    private static final long[] RETRY_DELAYS_MS = { 2500L, 6000L };
    private static final long FOCUS_RESUME_TIMEOUT_MS = 45000L; // 45 seconds timeout

    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private PowerManager.WakeLock wakeLock;

    private String slotId;
    private String slotKey;
    private String title;

    private boolean isPlaying = false;
    private boolean isPausedForFocus = false;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Handler focusTimeoutHandler = new Handler(Looper.getMainLooper());

    private final Runnable focusTimeoutRunnable = () -> {
        Log.w(TAG, "Audio focus was not regained within " + (FOCUS_RESUME_TIMEOUT_MS / 1000) + "s. Finishing playback.");
        if (slotId != null) {
            TrafficControlDiagnostics.recordFailed(getApplicationContext(), slotId, "Playback terminated after 45s audio focus timeout");
        }
        stopAudioAndFinish();
    };

    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        switch (change) {
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                Log.i(TAG, "Transient audio focus loss (" + change + "). Pausing audio with 45s timeout.");
                if (mediaPlayer != null && isPlaying) {
                    try {
                        mediaPlayer.pause();
                        isPausedForFocus = true;
                        if (slotId != null) {
                            TrafficControlDiagnostics.recordStatus(getApplicationContext(), slotId, "PAUSED_FOR_FOCUS", "Transient focus loss; waiting up to 45s");
                        }
                        focusTimeoutHandler.removeCallbacks(focusTimeoutRunnable);
                        focusTimeoutHandler.postDelayed(focusTimeoutRunnable, FOCUS_RESUME_TIMEOUT_MS);
                    } catch (Exception e) {
                        Log.e(TAG, "Error pausing on transient focus loss: " + e.getMessage(), e);
                    }
                }
                break;

            case AudioManager.AUDIOFOCUS_GAIN:
                Log.i(TAG, "Audio focus gained/regained.");
                focusTimeoutHandler.removeCallbacks(focusTimeoutRunnable);
                if (isPausedForFocus && mediaPlayer != null) {
                    try {
                        mediaPlayer.start();
                        isPausedForFocus = false;
                        if (slotId != null) {
                            TrafficControlDiagnostics.recordStatus(getApplicationContext(), slotId, "RESUMED_AFTER_FOCUS", "Focus regained; resumed playback");
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error resuming playback after focus gain: " + e.getMessage(), e);
                        stopAudioAndFinish();
                    }
                }
                break;

            case AudioManager.AUDIOFOCUS_LOSS:
                Log.i(TAG, "Permanent audio focus loss. Finishing.");
                focusTimeoutHandler.removeCallbacks(focusTimeoutRunnable);
                if (slotId != null) {
                    TrafficControlDiagnostics.recordStatus(getApplicationContext(), slotId, "ABORTED_FOCUS_LOSS", "Permanent audio focus loss");
                }
                stopAudioAndFinish();
                break;
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ConnectGod:AudioServiceWakeLock");
            wakeLock.acquire(30 * 60 * 1000L); // 30 min safety cap
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            Log.i(TAG, "Stop action received from notification");
            if (slotId != null) {
                TrafficControlDiagnostics.recordStatus(getApplicationContext(), slotId, "STOPPED_BY_USER", "User tapped Stop action on notification");
            }
            stopAudioAndFinish();
            return START_NOT_STICKY;
        }

        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        slotId = intent.getStringExtra("slotId");
        title = intent.getStringExtra("title");
        if (title == null || title.isEmpty()) title = "Traffic Control";
        slotKey = intent.getStringExtra("slotKey");
        if (slotKey == null || slotKey.isEmpty()) slotKey = "hourly_chime";

        // Build and display high-priority ongoing Foreground Notification
        Notification notification = buildForegroundNotification(title);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        playSlotAudioWithRetry(0);

        return START_NOT_STICKY;
    }

    private int getAudioResourceId(String key) {
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

    private void playSlotAudioWithRetry(int attempt) {
        // Prevent duplicate playback if audio is already active
        if (isPlaying && mediaPlayer != null && mediaPlayer.isPlaying()) {
            Log.w(TAG, "Audio already playing. Ignoring duplicate start request.");
            return;
        }

        try {
            int resource = getAudioResourceId(slotKey);
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            int focus;
            if (Build.VERSION.SDK_INT >= 26) {
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                    .setAudioAttributes(attributes)
                    .setOnAudioFocusChangeListener(focusListener)
                    .build();
                focus = audioManager.requestAudioFocus(focusRequest);
            } else {
                focus = audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_ALARM,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
            }

            if (focus != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                Log.w(TAG, "Audio focus request not granted (focus=" + focus + ", attempt=" + attempt + ")");
                handlePlaybackFailure(attempt, "Audio focus request denied (focus=" + focus + ")");
                return;
            }

            if (mediaPlayer != null) {
                try {
                    mediaPlayer.release();
                } catch (Exception ignored) {}
                mediaPlayer = null;
            }

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(attributes);
            mediaPlayer.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);

            try (android.content.res.AssetFileDescriptor file = getResources().openRawResourceFd(resource)) {
                mediaPlayer.setDataSource(file.getFileDescriptor(), file.getStartOffset(), file.getLength());
            }

            mediaPlayer.prepare();
            mediaPlayer.setLooping(false); // Non-repeating single song

            mediaPlayer.setOnCompletionListener(mp -> {
                Log.i(TAG, "Traffic control playback completed normally");
                if (slotId != null) {
                    TrafficControlDiagnostics.recordCompleted(getApplicationContext(), slotId);
                }
                stopAudioAndFinish();
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer error: what=" + what + ", extra=" + extra);
                if (slotId != null) {
                    TrafficControlDiagnostics.recordFailed(getApplicationContext(), slotId, "MediaPlayer error: what=" + what + ", extra=" + extra);
                }
                stopAudioAndFinish();
                return true;
            });

            mediaPlayer.start();
            isPlaying = true;
            isPausedForFocus = false;
            Log.i(TAG, "Traffic control audio playback started successfully via USAGE_ALARM stream (attempt " + (attempt + 1) + ")");

            if (slotId != null) {
                TrafficControlDiagnostics.recordPlaybackStarted(getApplicationContext(), slotId, attempt);
            }
        } catch (Exception e) {
            Log.e(TAG, "Exception during audio setup/playback (attempt " + attempt + "): " + e.getMessage(), e);
            handlePlaybackFailure(attempt, e.getMessage());
        }
    }

    private void handlePlaybackFailure(int attempt, String reason) {
        if (attempt < MAX_RETRIES - 1) {
            long delay = RETRY_DELAYS_MS[attempt];
            Log.i(TAG, "Retrying playback in " + delay + "ms (next attempt: " + (attempt + 1) + ")");
            if (slotId != null) {
                TrafficControlDiagnostics.recordStatus(getApplicationContext(), slotId, "RETRYING",
                    "Playback error: " + reason + "; retrying in " + delay + "ms (attempt " + (attempt + 1) + "/" + MAX_RETRIES + ")");
            }
            mainHandler.postDelayed(() -> playSlotAudioWithRetry(attempt + 1), delay);
        } else {
            Log.e(TAG, "All " + MAX_RETRIES + " playback attempts failed. Reason: " + reason);
            if (slotId != null) {
                TrafficControlDiagnostics.recordFailed(getApplicationContext(), slotId, "Failed after " + MAX_RETRIES + " attempts: " + reason);
            }
            stopAudioAndFinish();
        }
    }

    private void stopAudioAndFinish() {
        mainHandler.removeCallbacksAndMessages(null);
        focusTimeoutHandler.removeCallbacksAndMessages(null);

        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception ignored) {}

        isPlaying = false;
        isPausedForFocus = false;

        if (audioManager != null) {
            try {
                if (Build.VERSION.SDK_INT >= 26 && focusRequest != null) {
                    audioManager.abandonAudioFocusRequest(focusRequest);
                } else {
                    audioManager.abandonAudioFocus(focusListener);
                }
            } catch (Exception ignored) {}
        }

        stopForeground(true);
        stopSelf();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Traffic Control Meditation",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("High-priority spiritual meditation alarms & hourly chimes");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setSound(null, null);
            channel.enableVibration(false);

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification(String titleText) {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int openFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            openFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(this, 0, openAppIntent, openFlags);

        Intent stopIntent = new Intent(this, TrafficControlAudioService.class);
        stopIntent.setAction(ACTION_STOP);
        int stopFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            stopFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent stopPendingIntent = PendingIntent.getService(this, 1, stopIntent, stopFlags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🕊️ " + titleText)
            .setContentText("Traffic control meditation playing. Pause for soul remembrance.")
            .setSmallIcon(R.mipmap.ic_launcher_round)
            .setContentIntent(openAppPendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_media_pause, "Stop / ശാന്തി", stopPendingIntent)
            .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        mainHandler.removeCallbacksAndMessages(null);
        focusTimeoutHandler.removeCallbacksAndMessages(null);

        if (audioManager != null) {
            try {
                if (Build.VERSION.SDK_INT >= 26 && focusRequest != null) {
                    audioManager.abandonAudioFocusRequest(focusRequest);
                } else {
                    audioManager.abandonAudioFocus(focusListener);
                }
            } catch (Exception ignored) {}
        }

        try {
            if (mediaPlayer != null) {
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception ignored) {}

        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
