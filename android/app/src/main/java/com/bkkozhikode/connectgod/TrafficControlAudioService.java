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
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.File;

public class TrafficControlAudioService extends Service {
    private static final String TAG = "TrafficAudioService";
    private static final String CHANNEL_ID = "traffic_control_playback_v2";
    private static final int NOTIFICATION_ID = 99991;

    public static final String ACTION_STOP = "com.bkkozhikode.connectgod.ACTION_STOP_TRAFFIC_AUDIO";

    private static final int MAX_RETRIES = 3;
    private static final long[] RETRY_DELAYS_MS = { 2500L, 6000L };
    private static final long FOCUS_RESUME_TIMEOUT_MS = 45000L; // 45s timeout
    private static final long STALE_PLAYBACK_THRESHOLD_MS = 15 * 60 * 1000L; // 15 minutes

    /**
     * Immutable session representing an exact alarm occurrence.
     */
    public static class PlaybackSession {
        public final String occurrenceId;
        public final String slotId;
        public final String slotKey;
        public final String title;
        public final String toneType;
        public final String toneUri;
        public final long triggerTime;
        public final int priority; // 2 for preset/custom alarms, 1 for hourly chimes
        public final long sessionToken;
        public volatile boolean isCancelled = false;

        public PlaybackSession(
            String occurrenceId,
            String slotId,
            String slotKey,
            String title,
            String toneType,
            String toneUri,
            long triggerTime,
            int priority,
            long sessionToken
        ) {
            this.occurrenceId = occurrenceId;
            this.slotId = slotId;
            this.slotKey = slotKey;
            this.title = title;
            this.toneType = toneType != null ? toneType : "default";
            this.toneUri = toneUri;
            this.triggerTime = triggerTime;
            this.priority = priority;
            this.sessionToken = sessionToken;
        }
    }

    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private PowerManager.WakeLock wakeLock;

    private static long nextSessionToken = 1;
    private PlaybackSession currentSession = null;
    private boolean isPausedForFocus = false;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Handler focusTimeoutHandler = new Handler(Looper.getMainLooper());

    private final Runnable focusTimeoutRunnable = () -> {
        final PlaybackSession session = currentSession;
        if (session == null || session.isCancelled) return;
        Log.w(TAG, "Audio focus not regained within 45s for " + session.slotId + ". Finishing playback.");
        TrafficControlDiagnostics.recordFailed(getApplicationContext(), session.slotId, "Playback terminated after 45s audio focus timeout");
        stopAudioAndFinish();
    };

    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        final PlaybackSession session = currentSession;
        if (session == null || session.isCancelled) return;

        switch (change) {
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                Log.i(TAG, "Transient audio focus loss (" + change + ") for " + session.slotId + ". Pausing with 45s timeout.");
                if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                    try {
                        mediaPlayer.pause();
                        isPausedForFocus = true;
                        TrafficControlDiagnostics.recordStatus(getApplicationContext(), session.slotId, "PAUSED_FOR_FOCUS", "Transient focus loss; waiting up to 45s");
                        focusTimeoutHandler.removeCallbacks(focusTimeoutRunnable);
                        focusTimeoutHandler.postDelayed(focusTimeoutRunnable, FOCUS_RESUME_TIMEOUT_MS);
                    } catch (Exception e) {
                        Log.e(TAG, "Error pausing on transient focus loss: " + e.getMessage(), e);
                    }
                }
                break;

            case AudioManager.AUDIOFOCUS_GAIN:
                Log.i(TAG, "Audio focus gained/regained for " + session.slotId);
                focusTimeoutHandler.removeCallbacks(focusTimeoutRunnable);
                if (isPausedForFocus && mediaPlayer != null && !session.isCancelled) {
                    try {
                        mediaPlayer.start();
                        isPausedForFocus = false;
                        TrafficControlDiagnostics.recordStatus(getApplicationContext(), session.slotId, "RESUMED_AFTER_FOCUS", "Focus regained; resumed playback");
                    } catch (Exception e) {
                        Log.e(TAG, "Error resuming playback after focus gain: " + e.getMessage(), e);
                        stopAudioAndFinish();
                    }
                }
                break;

            case AudioManager.AUDIOFOCUS_LOSS:
                Log.i(TAG, "Permanent audio focus loss for " + session.slotId + ". Finishing.");
                focusTimeoutHandler.removeCallbacks(focusTimeoutRunnable);
                TrafficControlDiagnostics.recordStatus(getApplicationContext(), session.slotId, "ABORTED_FOCUS_LOSS", "Permanent audio focus loss");
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
            Log.i(TAG, "Stop action received from user");
            if (currentSession != null) {
                currentSession.isCancelled = true;
                TrafficControlDiagnostics.recordStatus(getApplicationContext(), currentSession.slotId, "STOPPED_BY_USER", "User stopped alarm playback");
            }
            stopAudioAndFinish();
            return START_NOT_STICKY;
        }

        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String slotId = intent.getStringExtra("slotId");
        if (slotId == null || slotId.isEmpty()) slotId = "slot_unknown";
        String slotKey = intent.getStringExtra("slotKey");
        if (slotKey == null || slotKey.isEmpty()) slotKey = "hourly_chime";
        String title = intent.getStringExtra("title");
        if (title == null || title.isEmpty()) title = "Traffic Control";
        long triggerTime = intent.getLongExtra("triggerTime", System.currentTimeMillis());
        String toneType = intent.getStringExtra("toneType");
        String toneUri = intent.getStringExtra("toneUri");

        String occurrenceId = slotId + ":" + triggerTime;
        // Priority: Hourly chime = 1, Preset alarms & Custom alarms = 2
        int priority = slotId.startsWith("hourly:") ? 1 : 2;

        // 1. Collision & Concurrency Resolution with current session
        if (currentSession != null && !currentSession.isCancelled && mediaPlayer != null && mediaPlayer.isPlaying()) {
            if (currentSession.occurrenceId.equals(occurrenceId)) {
                Log.i(TAG, "Duplicate occurrence intent received for " + occurrenceId + ". Ignoring duplicate start.");
                return START_NOT_STICKY;
            }

            // Compare priorities
            if (priority < currentSession.priority) {
                Log.w(TAG, "Incoming alarm " + slotId + " (priority " + priority + ") dropped because active session "
                    + currentSession.slotId + " has higher priority (" + currentSession.priority + ")");
                TrafficControlDiagnostics.recordEvent(getApplicationContext(), slotId, "DROPPED_LOWER_PRIORITY",
                    "Dropped because " + currentSession.slotId + " is active with higher priority");
                return START_NOT_STICKY;
            } else {
                Log.i(TAG, "Incoming alarm " + slotId + " (priority " + priority + ") preempts active session "
                    + currentSession.slotId + " (priority " + currentSession.priority + ")");
                TrafficControlDiagnostics.recordEvent(getApplicationContext(), currentSession.slotId, "PREEMPTED",
                    "Preempted by incoming alarm " + slotId);
                // Invalidate old session
                currentSession.isCancelled = true;
                cleanupCurrentMediaPlayer();
            }
        }

        // Cancel previous handlers and timeouts
        mainHandler.removeCallbacksAndMessages(null);
        focusTimeoutHandler.removeCallbacksAndMessages(null);

        // 2. Create New Playback Session with unique token
        long token = ++nextSessionToken;
        PlaybackSession newSession = new PlaybackSession(
            occurrenceId,
            slotId,
            slotKey,
            title,
            toneType,
            toneUri,
            triggerTime,
            priority,
            token
        );
        currentSession = newSession;

        // 3. Update Foreground Notification
        Notification notification = buildForegroundNotification(title);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        // 4. Service-Side Expiration Check
        long now = System.currentTimeMillis();
        if (now - triggerTime > STALE_PLAYBACK_THRESHOLD_MS) {
            Log.w(TAG, "Alarm occurrence " + occurrenceId + " has expired (" + ((now - triggerTime) / 1000) + "s late). Aborting.");
            TrafficControlDiagnostics.recordStatus(getApplicationContext(), slotId, "EXPIRED_BEFORE_PLAYBACK",
                "Fired " + ((now - triggerTime) / 1000) + "s late; playback aborted to prevent burst");
            stopAudioAndFinish();
            return START_NOT_STICKY;
        }

        // 5. Begin playback attempt with retry
        playSessionAudioWithRetry(newSession, 0);

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

    private void playSessionAudioWithRetry(final PlaybackSession session, final int attempt) {
        // Validate session is still active and not superseded
        if (session.isCancelled || currentSession != session) {
            Log.i(TAG, "Session " + session.occurrenceId + " is cancelled or superseded. Aborting attempt " + attempt);
            return;
        }

        // Check expiration before every retry attempt
        long now = System.currentTimeMillis();
        if (now - session.triggerTime > STALE_PLAYBACK_THRESHOLD_MS) {
            Log.w(TAG, "Session " + session.occurrenceId + " expired before attempt " + attempt + ". Aborting.");
            TrafficControlDiagnostics.recordStatus(getApplicationContext(), session.slotId, "EXPIRED_BEFORE_PLAYBACK",
                "Expired during retry (" + ((now - session.triggerTime) / 1000) + "s late)");
            stopAudioAndFinish();
            return;
        }

        try {
            cleanupCurrentMediaPlayer();

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
                Log.w(TAG, "Audio focus denied (focus=" + focus + ") for session " + session.occurrenceId + ", attempt " + attempt);
                handlePlaybackFailure(session, attempt, "Audio focus denied (focus=" + focus + ")");
                return;
            }

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(attributes);
            mediaPlayer.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);

            // Configure audio data source based on toneType
            boolean loaded = false;
            if ("file".equalsIgnoreCase(session.toneType) && session.toneUri != null) {
                File file = new File(session.toneUri);
                if (file.exists() && file.canRead()) {
                    mediaPlayer.setDataSource(file.getAbsolutePath());
                    loaded = true;
                } else {
                    Log.w(TAG, "Custom audio file not accessible at " + session.toneUri + ". Using bundled fallback.");
                    TrafficControlDiagnostics.recordEvent(getApplicationContext(), session.slotId, "FALLBACK_TONE",
                        "Custom file missing (" + session.toneUri + "); using bundled fallback chime");
                }
            } else if ("system".equalsIgnoreCase(session.toneType) && session.toneUri != null) {
                try {
                    mediaPlayer.setDataSource(getApplicationContext(), Uri.parse(session.toneUri));
                    loaded = true;
                } catch (Exception sysEx) {
                    Log.w(TAG, "Cannot load system ringtone " + session.toneUri + ": " + sysEx.getMessage() + ". Using bundled fallback.");
                    TrafficControlDiagnostics.recordEvent(getApplicationContext(), session.slotId, "FALLBACK_TONE",
                        "System ringtone error (" + sysEx.getMessage() + "); using bundled fallback chime");
                }
            }

            if (!loaded) {
                // Bundled audio resource fallback
                int res = R.raw.tc_hourly_chime;
                if ("bundled".equalsIgnoreCase(session.toneType) && session.toneUri != null && !session.toneUri.isEmpty()) {
                    res = getAudioResourceId(session.toneUri);
                } else if (session.slotKey != null && !session.slotKey.isEmpty()) {
                    res = getAudioResourceId(session.slotKey);
                }
                try (android.content.res.AssetFileDescriptor afd = getResources().openRawResourceFd(res)) {
                    mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                }
            }

            mediaPlayer.prepare();
            mediaPlayer.setLooping(false); // Non-repeating single song

            final long sessionToken = session.sessionToken;

            mediaPlayer.setOnCompletionListener(mp -> {
                // Ensure this completion is for the active session
                if (currentSession != null && currentSession.sessionToken == sessionToken && !currentSession.isCancelled) {
                    Log.i(TAG, "Traffic control playback completed normally for " + session.slotId);
                    TrafficControlDiagnostics.recordCompleted(getApplicationContext(), session.slotId);
                    stopAudioAndFinish();
                }
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                if (currentSession != null && currentSession.sessionToken == sessionToken && !currentSession.isCancelled) {
                    Log.e(TAG, "MediaPlayer error for " + session.slotId + ": what=" + what + ", extra=" + extra);
                    TrafficControlDiagnostics.recordFailed(getApplicationContext(), session.slotId, "MediaPlayer error: what=" + what + ", extra=" + extra);
                    stopAudioAndFinish();
                }
                return true;
            });

            mediaPlayer.start();
            isPausedForFocus = false;
            Log.i(TAG, "Traffic control audio playback started for " + session.slotId + " (attempt " + (attempt + 1) + ")");
            TrafficControlDiagnostics.recordPlaybackStarted(getApplicationContext(), session.slotId, attempt);

        } catch (Exception e) {
            Log.e(TAG, "Exception during playback setup for " + session.slotId + " (attempt " + attempt + "): " + e.getMessage(), e);
            handlePlaybackFailure(session, attempt, e.getMessage());
        }
    }

    private void handlePlaybackFailure(final PlaybackSession session, final int attempt, final String reason) {
        if (session.isCancelled || currentSession != session) return;

        if (attempt < MAX_RETRIES - 1) {
            long delay = RETRY_DELAYS_MS[attempt];
            Log.i(TAG, "Scheduling retry for " + session.slotId + " in " + delay + "ms (attempt " + (attempt + 1) + ")");
            TrafficControlDiagnostics.recordStatus(getApplicationContext(), session.slotId, "RETRYING",
                "Error: " + reason + "; retrying in " + delay + "ms (attempt " + (attempt + 1) + "/" + MAX_RETRIES + ")");

            mainHandler.postDelayed(() -> {
                if (currentSession == session && !session.isCancelled) {
                    playSessionAudioWithRetry(session, attempt + 1);
                }
            }, delay);
        } else {
            Log.e(TAG, "All " + MAX_RETRIES + " playback attempts failed for " + session.slotId + ". Reason: " + reason);
            TrafficControlDiagnostics.recordFailed(getApplicationContext(), session.slotId, "Failed after " + MAX_RETRIES + " attempts: " + reason);
            stopAudioAndFinish();
        }
    }

    private void cleanupCurrentMediaPlayer() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            } catch (Exception ignored) {}
            try {
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
    }

    private void stopAudioAndFinish() {
        mainHandler.removeCallbacksAndMessages(null);
        focusTimeoutHandler.removeCallbacksAndMessages(null);

        if (currentSession != null) {
            currentSession.isCancelled = true;
            currentSession = null;
        }

        cleanupCurrentMediaPlayer();
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

        if (currentSession != null) {
            currentSession.isCancelled = true;
            currentSession = null;
        }

        cleanupCurrentMediaPlayer();

        if (audioManager != null) {
            try {
                if (Build.VERSION.SDK_INT >= 26 && focusRequest != null) {
                    audioManager.abandonAudioFocusRequest(focusRequest);
                } else {
                    audioManager.abandonAudioFocus(focusListener);
                }
            } catch (Exception ignored) {}
        }

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
