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

    private final TrafficPlaybackCoordinator coordinator = new TrafficPlaybackCoordinator();
    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private PowerManager.WakeLock wakeLock;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Handler focusTimeoutHandler = new Handler(Looper.getMainLooper());

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
            TrafficPlaybackSession current = coordinator.getCurrentSession();
            if (current != null) {
                current.setCancelled(true);
                TrafficControlDiagnostics.recordStatus(getApplicationContext(), current.slotId, "STOPPED_BY_USER", "User stopped alarm playback");
                abandonSession(current);
            }
            stopAudioAndFinish();
            return START_NOT_STICKY;
        }

        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String slotId = intent.getStringExtra("slotId");
        String slotKey = intent.getStringExtra("slotKey");
        String title = intent.getStringExtra("title");
        long triggerTime = intent.getLongExtra("triggerTime", System.currentTimeMillis());
        String toneType = intent.getStringExtra("toneType");
        String toneUri = intent.getStringExtra("toneUri");

        long now = System.currentTimeMillis();

        // 1. Evaluate start through coordinator: applies duplicate & priority guards across ALL active states
        // (including PREPARING, PLAYING, PAUSED_FOR_FOCUS, and RETRYING)
        TrafficPlaybackCoordinator.StartResult eval = coordinator.evaluateStart(
            slotId, slotKey, title, toneType, toneUri, triggerTime, now
        );

        switch (eval.decision) {
            case IGNORED_DUPLICATE:
                Log.i(TAG, "Duplicate occurrence intent ignored: " + eval.reason);
                return START_NOT_STICKY;

            case DROPPED_LOWER_PRIORITY:
                Log.w(TAG, "Lower priority alarm dropped: " + eval.reason);
                TrafficControlDiagnostics.recordEvent(getApplicationContext(), slotId != null ? slotId : "unknown", "DROPPED_LOWER_PRIORITY", eval.reason);
                return START_NOT_STICKY;

            case EXPIRED:
                Log.w(TAG, "Alarm expired before playback: " + eval.reason);
                TrafficControlDiagnostics.recordStatus(getApplicationContext(), slotId != null ? slotId : "unknown", "EXPIRED_BEFORE_PLAYBACK", eval.reason);
                if (coordinator.getCurrentSession() == null || !coordinator.getCurrentSession().isActive()) {
                    stopAudioAndFinish();
                }
                return START_NOT_STICKY;

            case PROCEED:
                if (eval.supersededSession != null) {
                    Log.i(TAG, "Active session preempted: " + eval.reason);
                    TrafficControlDiagnostics.recordEvent(getApplicationContext(), eval.supersededSession.slotId, "PREEMPTED", eval.reason);
                    // Critical: abandon old focus request and cancel old timeouts when replacing session
                    abandonSession(eval.supersededSession);
                    cleanupCurrentMediaPlayer();
                }
                break;
        }

        final TrafficPlaybackSession session = eval.newSession;

        // Cancel pending main handler callbacks from previous sessions
        mainHandler.removeCallbacksAndMessages(null);

        // Update Foreground Notification for the new session
        Notification notification = buildForegroundNotification(session.title);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        // Begin playback attempt
        playSessionAudioWithRetry(session, 0);

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

    private void playSessionAudioWithRetry(final TrafficPlaybackSession session, final int attempt) {
        // Validate session is still active and not superseded
        if (session.isCancelled() || coordinator.getCurrentSession() != session) {
            Log.i(TAG, "Session " + session.occurrenceId + " is cancelled or superseded. Aborting attempt " + attempt);
            return;
        }

        // Check expiration before every retry attempt
        long now = System.currentTimeMillis();
        if (now - session.triggerTime > TrafficPlaybackCoordinator.STALE_PLAYBACK_THRESHOLD_MS) {
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

            // 2. Create OCCURRENCE-BOUND audio-focus listener and timeout capturing this exact session
            final TrafficPlaybackSession capturedSession = session;
            AudioManager.OnAudioFocusChangeListener occurrenceListener = change -> {
                handleSessionAudioFocusChange(capturedSession, change);
            };
            session.audioFocusListener = occurrenceListener;

            session.focusTimeoutRunnable = () -> {
                handleSessionFocusTimeout(capturedSession);
            };

            int focus;
            if (Build.VERSION.SDK_INT >= 26) {
                AudioFocusRequest focusReq = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                    .setAudioAttributes(attributes)
                    .setOnAudioFocusChangeListener(occurrenceListener)
                    .build();
                session.audioFocusRequest = focusReq;
                focus = audioManager.requestAudioFocus(focusReq);
            } else {
                focus = audioManager.requestAudioFocus(
                    occurrenceListener,
                    AudioManager.STREAM_ALARM,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
                );
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
                String toneKey = TrafficPlaybackCoordinator.resolveBundledToneKey(session.toneType, session.toneUri, session.slotKey);
                int res = getAudioResourceId(toneKey);
                try (android.content.res.AssetFileDescriptor afd = getResources().openRawResourceFd(res)) {
                    mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                }
            }

            mediaPlayer.prepare();
            mediaPlayer.setLooping(false); // Non-repeating single song

            final long sessionToken = session.sessionToken;

            mediaPlayer.setOnCompletionListener(mp -> {
                if (coordinator.validateMediaCallback(session, sessionToken)) {
                    session.setState(TrafficPlaybackSession.State.COMPLETED);
                    Log.i(TAG, "Traffic control playback completed normally for " + session.slotId);
                    TrafficControlDiagnostics.recordCompleted(getApplicationContext(), session.slotId);
                    stopAudioAndFinish();
                } else {
                    Log.i(TAG, "Ignoring completion callback for obsolete/superseded session: " + session.occurrenceId);
                }
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                if (coordinator.validateMediaCallback(session, sessionToken)) {
                    session.setState(TrafficPlaybackSession.State.FAILED);
                    Log.e(TAG, "MediaPlayer error for " + session.slotId + ": what=" + what + ", extra=" + extra);
                    TrafficControlDiagnostics.recordFailed(getApplicationContext(), session.slotId, "MediaPlayer error: what=" + what + ", extra=" + extra);
                    stopAudioAndFinish();
                } else {
                    Log.i(TAG, "Ignoring MediaPlayer error callback for obsolete session: " + session.occurrenceId);
                }
                return true;
            });

            mediaPlayer.start();
            session.setState(TrafficPlaybackSession.State.PLAYING);
            Log.i(TAG, "Traffic control audio playback started for " + session.slotId + " (attempt " + (attempt + 1) + ")");
            TrafficControlDiagnostics.recordPlaybackStarted(getApplicationContext(), session.slotId, attempt);

        } catch (Exception e) {
            Log.e(TAG, "Exception during playback setup for " + session.slotId + " (attempt " + attempt + "): " + e.getMessage(), e);
            handlePlaybackFailure(session, attempt, e.getMessage());
        }
    }

    /**
     * Occurrence-bound audio focus handler.
     * Validates captured session identity before taking any action.
     */
    private void handleSessionAudioFocusChange(final TrafficPlaybackSession session, final int focusChange) {
        if (!coordinator.validateFocusCallback(session)) {
            Log.i(TAG, "Ignoring obsolete focus callback (" + focusChange + ") for superseded/cancelled session: "
                + (session != null ? session.occurrenceId : "null"));
            return;
        }

        switch (focusChange) {
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                Log.i(TAG, "Transient audio focus loss (" + focusChange + ") for " + session.occurrenceId + ". Pausing with 45s timeout.");
                if (mediaPlayer != null && session.getState() == TrafficPlaybackSession.State.PLAYING) {
                    try {
                        mediaPlayer.pause();
                        session.setState(TrafficPlaybackSession.State.PAUSED_FOR_FOCUS);
                        TrafficControlDiagnostics.recordStatus(getApplicationContext(), session.slotId, "PAUSED_FOR_FOCUS", "Transient focus loss; waiting up to 45s");
                        if (session.focusTimeoutRunnable != null) {
                            focusTimeoutHandler.removeCallbacks(session.focusTimeoutRunnable);
                            focusTimeoutHandler.postDelayed(session.focusTimeoutRunnable, FOCUS_RESUME_TIMEOUT_MS);
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error pausing on transient focus loss: " + e.getMessage(), e);
                    }
                }
                break;

            case AudioManager.AUDIOFOCUS_GAIN:
                Log.i(TAG, "Audio focus gained/regained for " + session.occurrenceId);
                if (session.focusTimeoutRunnable != null) {
                    focusTimeoutHandler.removeCallbacks(session.focusTimeoutRunnable);
                }
                if (session.getState() == TrafficPlaybackSession.State.PAUSED_FOR_FOCUS && mediaPlayer != null) {
                    try {
                        mediaPlayer.start();
                        session.setState(TrafficPlaybackSession.State.PLAYING);
                        TrafficControlDiagnostics.recordStatus(getApplicationContext(), session.slotId, "RESUMED_AFTER_FOCUS", "Focus regained; resumed playback");
                    } catch (Exception e) {
                        Log.e(TAG, "Error resuming playback after focus gain: " + e.getMessage(), e);
                        stopAudioAndFinish();
                    }
                }
                break;

            case AudioManager.AUDIOFOCUS_LOSS:
                Log.i(TAG, "Permanent audio focus loss for " + session.occurrenceId + ". Finishing.");
                if (session.focusTimeoutRunnable != null) {
                    focusTimeoutHandler.removeCallbacks(session.focusTimeoutRunnable);
                }
                session.setState(TrafficPlaybackSession.State.FAILED);
                TrafficControlDiagnostics.recordStatus(getApplicationContext(), session.slotId, "ABORTED_FOCUS_LOSS", "Permanent audio focus loss");
                stopAudioAndFinish();
                break;
        }
    }

    /**
     * Occurrence-bound focus timeout handler.
     */
    private void handleSessionFocusTimeout(final TrafficPlaybackSession session) {
        if (!coordinator.validateFocusCallback(session)) {
            Log.i(TAG, "Ignoring obsolete focus timeout for superseded/cancelled session: "
                + (session != null ? session.occurrenceId : "null"));
            return;
        }
        if (session.getState() == TrafficPlaybackSession.State.PAUSED_FOR_FOCUS) {
            Log.w(TAG, "Audio focus not regained within 45s for " + session.occurrenceId + ". Finishing playback.");
            session.setState(TrafficPlaybackSession.State.FAILED);
            TrafficControlDiagnostics.recordFailed(getApplicationContext(), session.slotId, "Playback terminated after 45s audio focus timeout");
            stopAudioAndFinish();
        }
    }

    private void handlePlaybackFailure(final TrafficPlaybackSession session, final int attempt, final String reason) {
        if (session.isCancelled() || coordinator.getCurrentSession() != session) return;

        if (attempt < MAX_RETRIES - 1) {
            long delay = RETRY_DELAYS_MS[attempt];
            session.setState(TrafficPlaybackSession.State.RETRYING);
            Log.i(TAG, "Scheduling retry for " + session.occurrenceId + " in " + delay + "ms (attempt " + (attempt + 1) + ")");
            TrafficControlDiagnostics.recordStatus(getApplicationContext(), session.slotId, "RETRYING",
                "Error: " + reason + "; retrying in " + delay + "ms (attempt " + (attempt + 1) + "/" + MAX_RETRIES + ")");

            mainHandler.postDelayed(() -> {
                if (session == coordinator.getCurrentSession() && !session.isCancelled()) {
                    playSessionAudioWithRetry(session, attempt + 1);
                }
            }, delay);
        } else {
            session.setState(TrafficPlaybackSession.State.FAILED);
            Log.e(TAG, "All " + MAX_RETRIES + " playback attempts failed for " + session.occurrenceId + ". Reason: " + reason);
            TrafficControlDiagnostics.recordFailed(getApplicationContext(), session.slotId, "Failed after " + MAX_RETRIES + " attempts: " + reason);
            stopAudioAndFinish();
        }
    }

    /**
     * Abandons occurrence-bound audio focus and cancels timeouts for a session when replacing or stopping it.
     */
    private void abandonSession(TrafficPlaybackSession session) {
        if (session == null) return;
        session.setCancelled(true);

        // Cancel occurrence-bound timeout runnable
        if (session.focusTimeoutRunnable != null) {
            focusTimeoutHandler.removeCallbacks(session.focusTimeoutRunnable);
        }

        // Abandon occurrence-bound audio focus request
        if (audioManager != null) {
            try {
                if (Build.VERSION.SDK_INT >= 26 && session.audioFocusRequest instanceof AudioFocusRequest) {
                    audioManager.abandonAudioFocusRequest((AudioFocusRequest) session.audioFocusRequest);
                } else if (session.audioFocusListener instanceof AudioManager.OnAudioFocusChangeListener) {
                    audioManager.abandonAudioFocus((AudioManager.OnAudioFocusChangeListener) session.audioFocusListener);
                }
            } catch (Exception e) {
                Log.w(TAG, "Error abandoning audio focus for " + session.occurrenceId + ": " + e.getMessage());
            }
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

        TrafficPlaybackSession session = coordinator.getCurrentSession();
        if (session != null) {
            abandonSession(session);
            coordinator.clearSession(session);
        }

        cleanupCurrentMediaPlayer();

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

        TrafficPlaybackSession session = coordinator.getCurrentSession();
        if (session != null) {
            abandonSession(session);
            coordinator.clearSession(session);
        }

        cleanupCurrentMediaPlayer();

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
