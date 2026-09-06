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
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class TrafficControlAudioService extends Service {
    private static final String TAG = "TrafficAudioService";
    private static final String CHANNEL_ID = "traffic_control_channel";
    private static final int NOTIFICATION_ID = 99991;

    public static final String ACTION_STOP = "com.bkkozhikode.connectgod.ACTION_STOP_TRAFFIC_AUDIO";

    private MediaPlayer mediaPlayer;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ConnectGod:AudioServiceWakeLock");
            wakeLock.acquire(180000); // Max 3 minutes safety timeout
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            Log.i(TAG, "Stop action received from notification");
            stopAudioAndFinish();
            return START_NOT_STICKY;
        }

        String title = intent != null ? intent.getStringExtra("title") : "Traffic Control";
        String slotKey = intent != null ? intent.getStringExtra("slotKey") : "traffic_slot";

        // Build and display high-priority ongoing Foreground Notification
        Notification notification = buildForegroundNotification(title);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        playChimeAudio();

        return START_NOT_STICKY;
    }

    private void playChimeAudio() {
        try {
            if (mediaPlayer != null) {
                mediaPlayer.release();
                mediaPlayer = null;
            }

            mediaPlayer = MediaPlayer.create(this, R.raw.traffic_chime);
            if (mediaPlayer == null) {
                Log.e(TAG, "Failed to load traffic_chime from raw resources");
                stopAudioAndFinish();
                return;
            }

            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

            mediaPlayer.setAudioAttributes(attributes);
            mediaPlayer.setLooping(false); // Non-repeating

            mediaPlayer.setOnCompletionListener(mp -> {
                Log.i(TAG, "Traffic control playback completed normally");
                stopAudioAndFinish();
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer error: what=" + what + ", extra=" + extra);
                stopAudioAndFinish();
                return true;
            });

            mediaPlayer.start();
            Log.i(TAG, "Traffic control audio playback started successfully via USAGE_ALARM stream");
        } catch (Exception e) {
            Log.e(TAG, "Exception during audio playback: " + e.getMessage(), e);
            stopAudioAndFinish();
        }
    }

    private void stopAudioAndFinish() {
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception ignored) {}

        stopForeground(true);
        stopSelf();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Traffic Control Meditation",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("High-priority spiritual meditation alarms & hourly chimes");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[] { 0, 400, 200, 400 });

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification(String title) {
        // Tap to open app
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int openFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            openFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(this, 0, openAppIntent, openFlags);

        // Action: Stop / ശാന്തി
        Intent stopIntent = new Intent(this, TrafficControlAudioService.class);
        stopIntent.setAction(ACTION_STOP);
        int stopFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            stopFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent stopPendingIntent = PendingIntent.getService(this, 1, stopIntent, stopFlags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🕊️ " + title)
            .setContentText("Traffic control meditation playing. Pause for soul remembrance.")
            .setSmallIcon(R.mipmap.ic_launcher_round)
            .setContentIntent(openAppPendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_media_pause, "Stop / ശാന്തി", stopPendingIntent)
            .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
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
