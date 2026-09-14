import { registerPlugin, Capacitor } from '@capacitor/core';

export const TRAFFIC_PRESET_STORAGE_KEY = 'traffic_preset_states_v2';

export interface NativeTrafficSlot {
  id: string;
  time: string;
  slotKey: string;
  title: string;
  repeatDays?: number[] | null;
}

export interface DiagnosticSlotRecord {
  id: string;
  time: string;
  slotKey: string;
  title: string;
  scheduledTrigger?: number;
  scheduledTriggerFormatted?: string;
  lastReceivedAt?: number;
  lastReceivedFormatted?: string;
  lastPlaybackStartedAt?: number;
  lastPlaybackStartedFormatted?: string;
  lastCompletedAt?: number;
  lastCompletedFormatted?: string;
  lastFailedAt?: number;
  lastFailedFormatted?: string;
  lastFailureReason?: string;
  nextScheduledAt?: number;
  nextScheduledFormatted?: string;
  lastStatus?: string;
  lastError?: string;
  retryCount?: number;
}

export interface DiagnosticEventItem {
  timestamp: number;
  timeFormatted: string;
  slotId: string;
  event: string;
  details: string;
}

export interface TrafficDiagnosticsData {
  device?: {
    manufacturer: string;
    model: string;
    sdkInt: number;
    release: string;
    exactAlarmsAllowed: boolean;
    batteryOptimizationIgnored: boolean;
    lastScheduleError?: string | null;
  };
  slots?: DiagnosticSlotRecord[];
  events?: DiagnosticEventItem[];
}

export interface TrafficControlNativePlugin {
  scheduleAlarms(options: { slots: string }): Promise<{ success: boolean }>;
  cancelAllAlarms(): Promise<{ success: boolean }>;
  getAlarmStatus(): Promise<{ exactAlarmsAllowed: boolean; version: number; lastScheduleError?: string }>;
  requestExactAlarmPermission(): Promise<void>;
  getDiagnostics(): Promise<TrafficDiagnosticsData>;
  exportDiagnostics(): Promise<{ report: string }>;
  isIgnoringBatteryOptimizations(): Promise<{ isIgnoring: boolean }>;
  requestIgnoreBatteryOptimizations(): Promise<{ requested: boolean }>;
}

export const TrafficControlNative = registerPlugin<TrafficControlNativePlugin>('TrafficControlNative');
export const isAndroidTrafficApp = () => Capacitor.getPlatform() === 'android';

export interface AlarmStatusResult {
  message: string;
  exactAlarmsAllowed: boolean;
  scheduleError: string | null;
  version: number;
}

export async function getTrafficAlarmDetailedStatus(): Promise<AlarmStatusResult> {
  if (!isAndroidTrafficApp()) {
    return {
      message: 'Background alarms require the Android app.',
      exactAlarmsAllowed: false,
      scheduleError: null,
      version: 0,
    };
  }
  try {
    const status = await TrafficControlNative.getAlarmStatus();
    const scheduleError = status.lastScheduleError && status.lastScheduleError !== 'null' ? status.lastScheduleError : null;
    let message = status.exactAlarmsAllowed
      ? 'Alarm permission allowed. Songs use your phone’s alarm volume.'
      : 'Allow Alarms & reminders to play songs on time with the app closed.';
    if (scheduleError) {
      message = `Scheduling Issue: ${scheduleError}`;
    }
    return {
      message,
      exactAlarmsAllowed: !!status.exactAlarmsAllowed,
      scheduleError,
      version: status.version || 3,
    };
  } catch {
    return {
      message: 'Update the Android app to enable reliable background alarms.',
      exactAlarmsAllowed: false,
      scheduleError: null,
      version: 0,
    };
  }
}

export async function getTrafficAlarmStatus(): Promise<string> {
  const res = await getTrafficAlarmDetailedStatus();
  return res.message;
}

export async function getTrafficDiagnostics(): Promise<TrafficDiagnosticsData | null> {
  if (!isAndroidTrafficApp()) return null;
  try {
    return await TrafficControlNative.getDiagnostics();
  } catch (err) {
    console.error('[TrafficNativePlugin] getDiagnostics error:', err);
    return null;
  }
}

export async function exportTrafficDiagnosticsReport(): Promise<string> {
  if (!isAndroidTrafficApp()) return 'Diagnostics are only available on the native Android app.';
  try {
    const res = await TrafficControlNative.exportDiagnostics();
    return res.report;
  } catch (err: any) {
    console.error('[TrafficNativePlugin] exportDiagnostics error:', err);
    return `Failed to export diagnostics report: ${err?.message || err}`;
  }
}
