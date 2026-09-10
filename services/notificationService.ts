import { isAndroidTrafficApp, TrafficControlNative, TRAFFIC_PRESET_STORAGE_KEY, NativeTrafficSlot } from './trafficNativePlugin';
import { Platform } from 'react-native';
import { Capacitor } from '@capacitor/core';
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

export interface TrafficSlotConfig {
  id: number;
  time: string;
  slotKey: string;
  title: string;
  body: string;
  channelId: string;
  channelName: string;
  sound: string; // File name in android/app/src/main/res/raw/
}

export const TRAFFIC_SLOT_CONFIGS: TrafficSlotConfig[] = [
  {
    id: 101,
    time: '03:30',
    slotKey: 'amritvela',
    title: '🕊️ Traffic Control - 3:30 AM (Amritvela)',
    body: 'Time for Amritvela meditation & divine soul remembrance.',
    channelId: 'tc-channel-amritvela',
    channelName: 'Traffic Control - 3:30 AM (Amritvela)',
    sound: 'tc_amritvela.mp3',
  },
  {
    id: 102,
    time: '05:45',
    slotKey: 'early_morning',
    title: '🕊️ Traffic Control - 5:45 AM (Early Morning Yoga)',
    body: 'Start the day in divine peace and pure soul consciousness.',
    channelId: 'tc-channel-early-morning',
    channelName: 'Traffic Control - 5:45 AM (Early Morning)',
    sound: 'tc_early_morning.mp3',
  },
  {
    id: 103,
    time: '07:00',
    slotKey: 'morning',
    title: '🕊️ Traffic Control - 7:00 AM (Morning Study)',
    body: 'Pause for spiritual reflection and Murli remembrance.',
    channelId: 'tc-channel-morning',
    channelName: 'Traffic Control - 7:00 AM (Morning Study)',
    sound: 'tc_morning.mp3',
  },
  {
    id: 104,
    time: '10:30',
    slotKey: 'mid_morning',
    title: '🕊️ Traffic Control - 10:30 AM (Mid-Morning)',
    body: 'Withdraw thoughts from external distractions to the supreme light.',
    channelId: 'tc-channel-mid-morning',
    channelName: 'Traffic Control - 10:30 AM (Mid-Morning)',
    sound: 'tc_mid_morning.mp3',
  },
  {
    id: 105,
    time: '12:00',
    slotKey: 'noon',
    title: '🕊️ Traffic Control - 12:00 PM (Noon Remembrance)',
    body: 'Midday stillness: anchor yourself in supreme peace and bliss.',
    channelId: 'tc-channel-noon',
    channelName: 'Traffic Control - 12:00 PM (Noon)',
    sound: 'tc_noon.mp3',
  },
  {
    id: 106,
    time: '17:30',
    slotKey: 'evening',
    title: '🕊️ Traffic Control - 5:30 PM (Evening Sandhya Yoga)',
    body: 'Evening Sandhya Yoga: Experience the loving connection with Shiva Baba.',
    channelId: 'tc-channel-evening',
    channelName: 'Traffic Control - 5:30 PM (Evening Sandhya)',
    sound: 'tc_evening.mp3',
  },
  {
    id: 107,
    time: '19:30',
    slotKey: 'dusk',
    title: '🕊️ Traffic Control - 7:30 PM (Dusk Meditation)',
    body: 'Dusk meditation: Radiate rays of peace and power to the world.',
    channelId: 'tc-channel-dusk',
    channelName: 'Traffic Control - 7:30 PM (Dusk)',
    sound: 'tc_dusk.mp3',
  },
  {
    id: 108,
    time: '21:30',
    slotKey: 'night',
    title: '🕊️ Traffic Control - 9:30 PM (Night Reflection)',
    body: 'Night reflection: Clear your mind and surrender the day to Baba.',
    channelId: 'tc-channel-night',
    channelName: 'Traffic Control - 9:30 PM (Night Reflection)',
    sound: 'tc_night.mp3',
  },
  {
    id: 109,
    time: '22:00',
    slotKey: 'late_night',
    title: '🕊️ Traffic Control - 10:00 PM (Night Meditation)',
    body: "Rest peacefully in Baba's loving embrace. Good Night & Om Shanti.",
    channelId: 'tc-channel-late-night',
    channelName: 'Traffic Control - 10:00 PM (Night Meditation)',
    sound: 'tc_late_night.mp3',
  },
];

export const HOURLY_CHIME_CHANNEL = {
  channelId: 'tc-channel-hourly-chime',
  channelName: 'Hourly Traffic Chimes',
  sound: 'tc_hourly_chime.mp3',
};

export const CUSTOM_ALARM_CHANNEL = {
  channelId: 'tc-channel-custom',
  channelName: 'Custom Traffic Alarms',
  sound: 'traffic_chime.mp3',
};

/**
 * Initializes notification channels with MAX priority and custom raw audio attributes
 */
export async function initNotificationService(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  try {
    if (isAndroidTrafficApp()) {
      try {
        // A v2 native build owns every automatic playback. No JS receive/tap replay.
        await TrafficControlNative.getAlarmStatus();
        if (LocalNotifications && Capacitor.isNativePlatform()) {
          await LocalNotifications.requestPermissions().catch(() => {});
        }
        await rescheduleAllTrafficAlarms();
      } catch (error) {
        console.warn('[TrafficControl] Android update or alarm permission required:', error);
      }
      return;
    }

    // ── 1. Native Capacitor Implementation (Mobile Native Only) ─────────
    if (LocalNotifications && Platform.OS !== 'web' && Capacitor.isNativePlatform()) {
      try {
        console.log('[NotificationService] Initializing native Capacitor LocalNotifications...');

        // Request permissions (includes POST_NOTIFICATIONS on Android 13+)
        const perm = await LocalNotifications.requestPermissions().catch(() => ({ display: 'denied' }));
        console.log('[NotificationService] Permission status:', perm);

        // Create dedicated high-importance notification channels for each distinct time slot
        for (const slot of TRAFFIC_SLOT_CONFIGS) {
          await LocalNotifications.createChannel({
            id: slot.channelId,
            name: slot.channelName,
            description: `Daily spiritual meditation alarm for ${slot.time}`,
            importance: 5, // AndroidNotificationManager.IMPORTANCE_HIGH/MAX
            visibility: 1, // VISIBILITY_PUBLIC (shows on lockscreen)
            sound: slot.sound,
            vibration: true,
            lights: true,
            lightColor: '#e11d48',
          }).catch((e: any) => console.warn(`[NotificationService] Channel ${slot.channelId} note:`, e));
        }

        // Create hourly chime channel
        await LocalNotifications.createChannel({
          id: HOURLY_CHIME_CHANNEL.channelId,
          name: HOURLY_CHIME_CHANNEL.channelName,
          description: 'Hourly chime for 1-minute meditation pause',
          importance: 5,
          visibility: 1,
          sound: HOURLY_CHIME_CHANNEL.sound,
          vibration: true,
          lights: true,
          lightColor: '#fbbf24',
        }).catch((e: any) => console.warn('[NotificationService] Channel hourly note:', e));

        // Create custom alarms channel
        await LocalNotifications.createChannel({
          id: CUSTOM_ALARM_CHANNEL.channelId,
          name: CUSTOM_ALARM_CHANNEL.channelName,
          description: 'Custom Traffic Control meditation alarms',
          importance: 5,
          visibility: 1,
          sound: CUSTOM_ALARM_CHANNEL.sound,
          vibration: true,
          lights: true,
          lightColor: '#e11d48',
        }).catch((e: any) => console.warn('[NotificationService] Channel custom note:', e));

        // Clean up legacy channels if present
        await LocalNotifications.deleteChannel({ id: 'traffic-alarms' }).catch(() => {});
        await LocalNotifications.deleteChannel({ id: 'hourly-chimes' }).catch(() => {});

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
  } catch (globalErr) {
    console.error('[NotificationService] Isolated notification initialization error:', globalErr);
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
 * Reschedules all daily traffic alarms & hourly chimes with exact AlarmManager & boot persistence.
 * Plays distinct custom raw audio for each scheduled time slot.
 */
// Serialize rapid switch changes so an older schedule cannot overwrite the latest settings.
let scheduleQueue: Promise<void> = Promise.resolve();
export function rescheduleAllTrafficAlarms(): Promise<void> {
  scheduleQueue = scheduleQueue
    .catch((err) => {
      console.error('[NotificationService] Previous alarm schedule error:', err);
    })
    .then(async () => {
      try {
        await rescheduleTrafficAlarmsNow();
      } catch (e) {
        console.error('[NotificationService] Isolated reschedule error:', e);
      }
    })
    .catch((fatal) => {
      console.error('[NotificationService] Fatal reschedule queue error:', fatal);
    });
  return scheduleQueue;
}

async function rescheduleTrafficAlarmsNow(): Promise<void> {
  try {
    const hourlyEnabled = getJSON<boolean>(STORAGE_KEYS.hourlyChimes, true);
    const customAlarms = getJSON<any[]>(STORAGE_KEYS.alarms, []);

    if (isAndroidTrafficApp()) {
      try {
        const status = await TrafficControlNative.getAlarmStatus();
        if (status.version < 2) {
          console.warn('[TrafficControl] Android app needs update for native alarm playback');
          return;
        }
        // Cancel only Traffic Control's old notifications, preserving other app features.
        if (LocalNotifications && Capacitor.isNativePlatform()) {
          const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
          const legacy = (pending?.notifications || []).filter((n: any) =>
            n.actionTypeId === 'TRAFFIC_ALARM_CATEGORY' ||
            (n.id >= 101 && n.id <= 109) ||
            (n.id >= 20000 && n.id <= 22359) || (n.id >= 30000 && n.id <= 32359));
          if (legacy.length) await LocalNotifications.cancel({ notifications: legacy }).catch(() => {});
        }
        const states = getJSON<Record<string, { enabled?: boolean }>>(TRAFFIC_PRESET_STORAGE_KEY, {});
        const slots: NativeTrafficSlot[] = TRAFFIC_SLOT_CONFIGS
          .filter(s => states[`preset:${s.time}`]?.enabled !== false)
          .map(s => ({ id: `preset:${s.time}`, time: s.time, slotKey: s.slotKey, title: s.title }));
        if (hourlyEnabled) for (const time of HOURLY_TRAFFIC_TIMES) slots.push({
          id: `hourly:${time}`, time, slotKey: 'hourly_chime', title: 'Hourly Traffic Control',
        });
        for (const custom of customAlarms) if (custom.enabled) slots.push({
          id: `custom:${custom.id}`, time: custom.time,
          slotKey: timeToTrafficSlotKey(custom.time), title: custom.label || 'Traffic Control',
          repeatDays: custom.repeatDays,
        });
        await TrafficControlNative.scheduleAlarms({ slots: JSON.stringify(slots) });
      } catch (androidErr) {
        console.error('[NotificationService] Android alarm schedule error:', androidErr);
      }
      return;
    }

    // ── 1. Native Capacitor Scheduling (Mobile Native Platforms Only) ───
    if (LocalNotifications && Platform.OS !== 'web' && Capacitor.isNativePlatform()) {
      try {
        // Clear pending scheduled notifications
        const pending = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
        if (pending?.notifications?.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications }).catch(() => {});
        }

        const notificationsToSchedule: any[] = [];

        // 1. Primary Traffic Schedule Alarms with distinct custom audio per slot
        for (const slot of TRAFFIC_SLOT_CONFIGS) {
          const [hStr, mStr] = slot.time.split(':');
          const hour = parseInt(hStr, 10);
          const minute = parseInt(mStr, 10);

          notificationsToSchedule.push({
            id: slot.id,
            title: slot.title,
            body: slot.body,
            channelId: slot.channelId,
            sound: slot.sound,
            smallIcon: 'ic_launcher_round',
            iconColor: '#991B1B',
            actionTypeId: 'TRAFFIC_ALARM_CATEGORY',
            isExactNotification: true,
            schedule: {
              on: { hour, minute },
              allowWhileIdle: true,
              repeats: true,
            },
            extra: { time: slot.time, slotKey: slot.slotKey },
          });
        }

        // 2. Hourly Chimes ONLY on Exclusive Non-Traffic Hours
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
              channelId: HOURLY_CHIME_CHANNEL.channelId,
              sound: HOURLY_CHIME_CHANNEL.sound,
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
            channelId: CUSTOM_ALARM_CHANNEL.channelId,
            sound: CUSTOM_ALARM_CHANNEL.sound,
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
          console.log(`[NotificationService] Scheduled ${notificationsToSchedule.length} autonomous alarms with custom raw audio via Capacitor LocalNotifications.`);
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

        for (const slot of TRAFFIC_SLOT_CONFIGS) {
          const [hStr, mStr] = slot.time.split(':');
          const hour = parseInt(hStr, 10);
          const minute = parseInt(mStr, 10);

          await ExpoNotifications.scheduleNotificationAsync({
            content: {
              title: slot.title,
              body: slot.body,
              sound: true,
              data: { time: slot.time, slotKey: slot.slotKey },
            },
            trigger: { hour, minute, repeats: true },
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('[NotificationService] Expo reschedule error:', e);
      }
    }
  } catch (fatalErr) {
    console.error('[NotificationService] Isolated rescheduleTrafficAlarmsNow fatal error:', fatalErr);
  }
}
