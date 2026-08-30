import { Platform } from 'react-native';
import {
  PRESET_ALARMS,
  HOURLY_TRAFFIC_TIMES,
  STORAGE_KEYS,
} from '@/lib/constants';
import { getJSON } from '@/lib/storage';
import { playTrafficSlot, timeToTrafficSlotKey, stopTrafficAudio } from './trafficAudioService';

// Background task name for background alarm execution
export const BACKGROUND_TRAFFIC_ALARM_TASK = 'BACKGROUND_TRAFFIC_ALARM_TASK';

// Safely attempt dynamic import of expo-notifications and expo-task-manager
let Notifications: any = null;
let TaskManager: any = null;

try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Graceful fallback for web/unlinked environment
}

try {
  TaskManager = require('expo-task-manager');
} catch (e) {
  // Graceful fallback if expo-task-manager is unlinked
}

// ── Define Background Task if TaskManager is available ──────────────────
if (TaskManager && typeof TaskManager.defineTask === 'function') {
  try {
    TaskManager.defineTask(
      BACKGROUND_TRAFFIC_ALARM_TASK,
      async ({ data, error, executionInfo }: any) => {
        if (error) {
          console.warn('[NotificationService] Background task error:', error);
          return;
        }

        const notificationData =
          data?.notification?.data ||
          data?.notification?.request?.content?.data ||
          data;

        const slotKey =
          notificationData?.slotKey ||
          (notificationData?.time ? timeToTrafficSlotKey(notificationData.time) : null);

        console.log(`[NotificationService] Background Task triggered -> Slot: ${slotKey}`);

        if (slotKey) {
          // Play specific MP3 track once and auto-stop
          await playTrafficSlot(slotKey);
        }
      }
    );
  } catch (err) {
    console.warn('[NotificationService] TaskManager definition note:', err);
  }
}

// ── Configure High-Priority Notification Handler ────────────────────────
if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority?.MAX ?? 2,
      }),
    });
  } catch (err) {
    console.warn('[NotificationService] Failed to set notification handler:', err);
  }
}

/**
 * Initializes notification channels with MAX priority and alarm attributes
 */
export async function initNotificationService(): Promise<void> {
  if (Platform.OS === 'web') return;

  if (Notifications && typeof Notifications.setNotificationChannelAsync === 'function') {
    try {
      if (Platform.OS === 'android') {
        // High priority alarm channel with wake-lock and heads-up alert
        await Notifications.setNotificationChannelAsync('traffic-alarms', {
          name: 'Traffic Control Alarms',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: '#e11d48',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage?.ALARM ?? 4,
            contentType: Notifications.AndroidAudioContentType?.SONIFICATION ?? 4,
          },
        });

        // Dedicated hourly chime channel (only on non-conflicting exclusive hours)
        await Notifications.setNotificationChannelAsync('hourly-chimes', {
          name: 'Hourly Traffic Chimes',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          enableLights: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage?.NOTIFICATION ?? 5,
            contentType: Notifications.AndroidAudioContentType?.SONIFICATION ?? 4,
          },
        });
      }

      // Configure category actions for quick stop / dismiss
      if (typeof Notifications.setNotificationCategoryAsync === 'function') {
        await Notifications.setNotificationCategoryAsync('TRAFFIC_ALARM_CATEGORY', [
          {
            identifier: 'STOP_ALARM',
            buttonTitle: 'Stop / ശാന്തി',
            options: { isDestructive: true },
          },
        ]).catch(() => {});
      }

      // Request exact alarm permissions
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      // Register background notification task if supported
      if (typeof Notifications.registerTaskAsync === 'function') {
        await Notifications.registerTaskAsync(BACKGROUND_TRAFFIC_ALARM_TASK).catch(() => {});
      }

      // Notification interaction listeners
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        const actionIdentifier = response?.actionIdentifier;
        if (actionIdentifier === 'STOP_ALARM') {
          stopTrafficAudio();
          return;
        }

        const data = response?.notification?.request?.content?.data;
        if (data?.slotKey) {
          console.log(`[NotificationService] Notification opened -> Playing ${data.slotKey}`);
          playTrafficSlot(data.slotKey);
        } else if (data?.time) {
          const slot = timeToTrafficSlotKey(data.time);
          playTrafficSlot(slot);
        }
      });

      // Foreground alarm trigger listener
      Notifications.addNotificationReceivedListener((notification: any) => {
        const data = notification?.request?.content?.data;
        if (data?.slotKey) {
          console.log(`[NotificationService] Alarm triggered in foreground -> Playing ${data.slotKey}`);
          playTrafficSlot(data.slotKey);
        }
      });
    } catch (e) {
      console.warn('[NotificationService] Error initializing notifications:', e);
    }
  }

  // Reschedule all active alarms on startup (Boot & launch resilience)
  await rescheduleAllTrafficAlarms();
}

/**
 * Reschedules all daily traffic alarms & hourly chimes (excludes 12:00 PM and all primary traffic times)
 */
export async function rescheduleAllTrafficAlarms(): Promise<void> {
  if (!Notifications || typeof Notifications.cancelAllScheduledNotificationsAsync !== 'function') {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const hourlyEnabled = getJSON<boolean>(STORAGE_KEYS.hourlyChimes, true);
    const customAlarms = getJSON<any[]>(STORAGE_KEYS.alarms, []);

    // 1. Schedule Primary Traffic Schedule Alarms (03:30, 05:45, 07:00, 10:30, 12:00, 17:30, 19:30, 21:30)
    for (const preset of PRESET_ALARMS) {
      const [hStr, mStr] = preset.time.split(':');
      const hour = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);
      const slotKey = preset.slotKey || timeToTrafficSlotKey(preset.time);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🕊️ ${preset.label} (${preset.labelMl || 'ട്രാഫിക് കൺട്രോൾ'})`,
          body: `Time for traffic control meditation & soul remembrance.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority?.MAX ?? 2,
          channelId: 'traffic-alarms',
          categoryIdentifier: 'TRAFFIC_ALARM_CATEGORY',
          data: { time: preset.time, slotKey },
        },
        trigger: {
          type: 'daily',
          hour,
          minute,
        },
      }).catch(() => {});
    }

    // 2. Schedule Hourly Chimes ONLY on Exclusive Non-Traffic Hours (06:00, 08:00, 09:00, 11:00, 13:00, 14:00, 15:00, 16:00, 18:00, 20:30, 22:00)
    // 12:00 PM and all primary times are strictly excluded
    if (hourlyEnabled) {
      for (const chimeTime of HOURLY_TRAFFIC_TIMES) {
        const [hStr, mStr] = chimeTime.split(':');
        const hour = parseInt(hStr, 10);
        const minute = parseInt(mStr, 10);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 Hourly Traffic Control (${chimeTime})`,
            body: `Pause for 1-minute divine remembrance. Om Shanti.`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority?.HIGH ?? 1,
            channelId: 'hourly-chimes',
            categoryIdentifier: 'TRAFFIC_ALARM_CATEGORY',
            data: { time: chimeTime, slotKey: 'hourly_chime', isChime: true },
          },
          trigger: {
            type: 'daily',
            hour,
            minute,
          },
        }).catch(() => {});
      }
    }

    // 3. Schedule Custom Alarms
    for (const custom of customAlarms) {
      if (!custom.enabled) continue;
      const [hStr, mStr] = custom.time.split(':');
      const hour = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🕊️ ${custom.label || 'Custom Traffic Alarm'}`,
          body: `Traffic control meditation reminder`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority?.MAX ?? 2,
          channelId: 'traffic-alarms',
          categoryIdentifier: 'TRAFFIC_ALARM_CATEGORY',
          data: { time: custom.time, slotKey: timeToTrafficSlotKey(custom.time) },
        },
        trigger: {
          type: 'daily',
          hour,
          minute,
        },
      }).catch(() => {});
    }

    console.log('[NotificationService] All Traffic Control alarms & hourly chimes rescheduled with boot persistence.');
  } catch (err) {
    console.warn('[NotificationService] Failed to reschedule alarms:', err);
  }
}
