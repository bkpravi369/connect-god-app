import { registerPlugin, Capacitor } from '@capacitor/core';

export const TRAFFIC_PRESET_STORAGE_KEY = 'traffic_preset_states_v2';
export interface NativeTrafficSlot {
  id: string;
  time: string;
  slotKey: string;
  title: string;
  repeatDays?: number[] | null;
}
export interface TrafficControlNativePlugin {
  scheduleAlarms(options: { slots: string }): Promise<{ success: boolean }>;
  cancelAllAlarms(): Promise<{ success: boolean }>;
  getAlarmStatus(): Promise<{ exactAlarmsAllowed: boolean; version: number }>;
  requestExactAlarmPermission(): Promise<void>;
}
export const TrafficControlNative = registerPlugin<TrafficControlNativePlugin>('TrafficControlNative');
export const isAndroidTrafficApp = () => Capacitor.getPlatform() === 'android';

export async function getTrafficAlarmStatus(): Promise<string> {
  if (!isAndroidTrafficApp()) return 'Background alarms require the Android app.';
  try {
    const status = await TrafficControlNative.getAlarmStatus();
    return status.exactAlarmsAllowed
      ? 'Alarm permission allowed. Songs use your phone’s alarm volume.'
      : 'Allow Alarms & reminders to play songs on time with the app closed.';
  } catch {
    return 'Update the Android app to enable reliable background alarms.';
  }
}
