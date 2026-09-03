import { Platform } from 'react-native';
import {
  PRESET_ALARMS,
  HOURLY_TRAFFIC_TIMES,
  STORAGE_KEYS,
} from '@/lib/constants';
import { getJSON } from '@/lib/storage';
import { playTrafficSlot, timeToTrafficSlotKey, stopTrafficAudio } from './trafficAudioService';

// Safely import Capacitor LocalNotifications
let LocalNotifications: any = null;
try {
  const mod = require('@capacitor/local-notifications');
  LocalNotifications = mod.LocalNotifications || mod;
} catch (e) {
  // Graceful fallback for non-capacitor environments
}

// Safely attempt dynamic import of expo-notifications for pure Expo environments
let ExpoNotifications: any = null;
try {
  ExpoNotifications = require('expo-notifications');
} catch (e) {
  // Graceful fallback
}

let isInitialized = false;

/**
 * Initializes notification channels with MAX priority and alarm attributes
 */
export async function initNotificationService(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  // ── 1. Native Capacitor Android Implementation ───────────────────────
  if (LocalNotifications) {
    try {
      console.log('[NotificationService] Initializing native Capacitor LocalNotifications...');

      // Request permissions (includes POST_NOTIFICATIONS on Android 13+)
      const perm = await LocalNotifications.requestPermissions().catch(() => ({ display: 'denied' }));
      console.log('[NotificationService] Permission status:', perm);

      // Create high-importance alarm channel with native chime sound
      await LocalNotifications.createChannel({
        id: 'traffic-alarms',
        name: 'Traffic Control Alarms',
        description: 'Daily Traffic Control spiritual meditation alarms',
        importance: 5, // AndroidNotificationManager.IMPORTANCE_HIGH/MAX
        visibility: 1, // VISIBILITY_PUBLIC (shows on lockscreen)
        sound: 'traffic_chime.mp3',
        vibration: true,
        lights: true,
        lightColor: '#e11d48',
      }).catch((e: any) => console.warn('[NotificationService] Channel traffic-alarms note:', e));

      // Create hourly chime channel
      await LocalNotifications.createChannel({
        id: 'hourly-chimes',
        name: 'Hourly Traffic Chimes',
        description: 'Hourly chime for 1-minute meditation pause',
        importance: 4, // HIGH
        visibility: 1, // VISIBILITY_PUBLIC
        sound: 'traffic_chime.mp3',
        vibration: true,
        lights: true,
        lightColor: '#fbbf24',
      }).catch((e: any) => console.warn('[NotificationService] Channel hourly-chimes note:', e));

      // Register Action Types (Stop / ശാന്തി button)
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'TRAFFIC_ALARM_CATEGORY',
            actions: [
              {
                id: 'STOP_ALARM',
                title: 'Stop / ശാന്തി',
                destructive: true,
              },
            ],
          },
        ],
      }).catch(() => {});

      // Remove existing listeners to avoid duplicates
      await LocalNotifications.removeAllListeners().catch(() => {});

      // Notification action listener (User taps notification or action button)
      LocalNotifications.addListener('localNotificationActionPerformed', (action: any) => {
        console.log('[NotificationService] Action performed:', action);
        if (action?.actionId === 'STOP_ALARM') {
          stopTrafficAudio();
          return;
        }

        const data = action?.notification?.extra;
        if (data?.slotKey) {
          console.log(`[NotificationService] Notification tapped -> Playing ${data.slotKey}`);
          playTrafficSlot(data.slotKey);
        } else if (data?.time) {
          const slot = timeToTrafficSlotKey(data.time);
          playTrafficSlot(slot);
        }
      });

      // Notification received listener (Fires when alarm triggers)
      LocalNotifications.addListener('localNotificationReceived', (notification: any) => {
        console.log('[NotificationService] Notification triggered:', notification);
        const data = notification?.extra;
        if (data?.slotKey) {
          console.log(`[NotificationService] Alarm triggered -> Auto-playing ${data.slotKey}`);
          playTrafficSlot(data.slotKey);
        }
      });

      // Schedule all active alarms with exact AlarmManager & boot persistence
      await rescheduleAllTrafficAlarms();
      return;
    } catch (err) {
      console.warn('[NotificationService] Capacitor notification init error:', err);
    }
  }

  // ── 2. Expo Notifications Fallback (if running inside Expo Go) ────────
  if (ExpoNotifications && typeof ExpoNotifications.setNotificationChannelAsync === 'function') {
    try {
      if (Platform.OS === 'android') {
        await ExpoNotifications.setNotificationChannelAsync('traffic-alarms', {
          name: 'Traffic Control Alarms',
          importance: ExpoNotifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: '#e11d48',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          bypassDnd: true,
          lockscreenVisibility: ExpoNotifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
        });

        await ExpoNotifications.setNotificationChannelAsync('hourly-chimes', {
          name: 'Hourly Traffic Chimes',
          importance: ExpoNotifications.AndroidImportance.HIGH,
          sound: 'default',
          enableLights: true,
          lockscreenVisibility: ExpoNotifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
        });
      }

      await ExpoNotifications.requestPermissionsAsync().catch(() => {});
      await rescheduleAllTrafficAlarms();
      return;
    } catch (e) {
      console.warn('[NotificationService] Expo notifications init error:', e);
    }
  }

  // ── 3. Web Browser Fallback ──────────────────────────────────────────
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }
}

/**
 * Reschedules all daily traffic alarms & hourly chimes with exact AlarmManager & boot persistence
 */
export async function rescheduleAllTrafficAlarms(): Promise<void> {
  const hourlyEnabled = getJSON<boolean>(STORAGE_KEYS.hourlyChimes, true);
  const customAlarms = getJSON<any[]>(STORAGE_KEYS.alarms, []);

  // ── 1. Native Capacitor Scheduling ────────────────────────────────────
  if (LocalNotifications) {
    try {
      // Clear pending scheduled notifications
      const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
      if (pending?.notifications?.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications }).catch(() => {});
      }

      const notificationsToSchedule: any[] = [];

      // 1. Primary Traffic Schedule Alarms (03:30, 05:45, 07:00, 10:30, 12:00, 17:30, 19:30, 21:30)
      for (const preset of PRESET_ALARMS) {
        const [hStr, mStr] = preset.time.split(':');
        const hour = parseInt(hStr, 10);
        const minute = parseInt(mStr, 10);
        const slotKey = preset.slotKey || timeToTrafficSlotKey(preset.time);
        const notifId = hour * 100 + minute; // e.g., 330, 545, 700

        notificationsToSchedule.push({
          id: notifId,
          title: `🕊️ ${preset.label} (${preset.labelMl || 'ട്രാഫിക് കൺട്രോൾ'})`,
          body: `Time for traffic control meditation & soul remembrance.`,
          channelId: 'traffic-alarms',
          sound: 'traffic_chime.mp3',
          smallIcon: 'ic_launcher_round',
          iconColor: '#991B1B',
          actionTypeId: 'TRAFFIC_ALARM_CATEGORY',
          isExactNotification: true,
          schedule: {
            on: { hour, minute },
            allowWhileIdle: true,
            repeats: true,
          },
          extra: { time: preset.time, slotKey },
        });
      }

      // 2. Hourly Chimes ONLY on Exclusive Non-Traffic Hours (06:00, 08:00, 09:00, 11:00, 13:00, 14:00, 15:00, 16:00, 18:00, 20:30, 22:00)
      if (hourlyEnabled) {
        for (const chimeTime of HOURLY_TRAFFIC_TIMES) {
          const [hStr, mStr] = chimeTime.split(':');
          const hour = parseInt(hStr, 10);
          const minute = parseInt(mStr, 10);
          const notifId = 20000 + hour * 100 + minute;

          notificationsToSchedule.push({
            id: notifId,
            title: `🔔 Hourly Traffic Control (${chimeTime})`,
            body: `Pause for 1-minute divine remembrance. Om Shanti.`,
            channelId: 'hourly-chimes',
            sound: 'traffic_chime.mp3',
            smallIcon: 'ic_launcher_round',
            iconColor: '#991B1B',
            actionTypeId: 'TRAFFIC_ALARM_CATEGORY',
            isExactNotification: true,
            schedule: {
              on: { hour, minute },
              allowWhileIdle: true,
              repeats: true,
            },
            extra: { time: chimeTime, slotKey: 'hourly_chime', isChime: true },
          });
        }
      }

      // 3. Custom Alarms
      for (const custom of customAlarms) {
        if (!custom.enabled) continue;
        const [hStr, mStr] = custom.time.split(':');
        const hour = parseInt(hStr, 10);
        const minute = parseInt(mStr, 10);
        const notifId = 30000 + hour * 100 + minute;

        notificationsToSchedule.push({
          id: notifId,
          title: `🕊️ ${custom.label || 'Custom Traffic Alarm'}`,
          body: `Traffic control meditation reminder`,
          channelId: 'traffic-alarms',
          sound: 'traffic_chime.mp3',
          smallIcon: 'ic_launcher_round',
          iconColor: '#991B1B',
          actionTypeId: 'TRAFFIC_ALARM_CATEGORY',
          isExactNotification: true,
          schedule: {
            on: { hour, minute },
            allowWhileIdle: true,
            repeats: true,
          },
          extra: { time: custom.time, slotKey: timeToTrafficSlotKey(custom.time) },
        });
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.log(`[NotificationService] Scheduled ${notificationsToSchedule.length} alarms via native Android AlarmManager with boot persistence.`);
      }
      return;
    } catch (err) {
      console.warn('[NotificationService] Failed to schedule native Capacitor alarms:', err);
    }
  }

  // ── 2. Expo Notifications Fallback ────────────────────────────────────
  if (ExpoNotifications && typeof ExpoNotifications.cancelAllScheduledNotificationsAsync === 'function') {
    try {
      await ExpoNotifications.cancelAllScheduledNotificationsAsync();

      for (const preset of PRESET_ALARMS) {
        const [hStr, mStr] = preset.time.split(':');
        const hour = parseInt(hStr, 10);
        const minute = parseInt(mStr, 10);
        const slotKey = preset.slotKey || timeToTrafficSlotKey(preset.time);

        await ExpoNotifications.scheduleNotificationAsync({
          content: {
            title: `🕊️ ${preset.label} (${preset.labelMl || 'ട്രാഫിക് കൺട്രോൾ'})`,
            body: `Time for traffic control meditation & soul remembrance.`,
            sound: true,
            channelId: 'traffic-alarms',
            data: { time: preset.time, slotKey },
          },
          trigger: { hour, minute, repeats: true },
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[NotificationService] Expo reschedule error:', e);
    }
  }
}
