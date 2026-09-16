import { registerPlugin, Capacitor } from '@capacitor/core';

export const TRAFFIC_PRESET_STORAGE_KEY = 'traffic_preset_states_v2';

export interface NativeTrafficSlot {
  id: string;
  time: string;
  slotKey: string;
  title: string;
  repeatDays?: number[] | null;
  toneType?: 'bundled' | 'system' | 'file';
  toneUri?: string;
  toneTitle?: string;
}

export interface DiagnosticSlotRecord {
  id: string;
  time: string;
  slotKey: string;
  title: string;
  repeatDays?: number[] | null;
  toneType?: string;
  toneUri?: string;
  toneTitle?: string;
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

export interface SystemRingtone {
  title: string;
  uri: string;
}

export interface ToneSelectionResult {
  cancelled: boolean;
  toneType?: 'bundled' | 'system' | 'file';
  toneUri?: string;
  toneTitle?: string;
}

export interface TrafficControlNativePlugin {
  scheduleAlarms(options: { slots: string }): Promise<{ success: boolean }>;
  cancelAllAlarms(): Promise<{ success: boolean }>;
  getAlarmStatus(): Promise<{
    exactAlarmsAllowed: boolean;
    version: number;
    supportsCustomTones?: boolean;
    nativeVersionCode?: number;
    nativeVersionName?: string;
    lastScheduleError?: string;
  }>;
  requestExactAlarmPermission(): Promise<void>;
  getDiagnostics(): Promise<TrafficDiagnosticsData>;
  exportDiagnostics(): Promise<{ report: string }>;
  isIgnoringBatteryOptimizations(): Promise<{ isIgnoring: boolean }>;
  requestIgnoreBatteryOptimizations(): Promise<{ requested: boolean }>;
  getSystemRingtones(): Promise<{ ringtones: SystemRingtone[] }>;
  pickCustomAudio(): Promise<ToneSelectionResult>;
  playTonePreview(options: { toneType: string; toneUri?: string; slotKey?: string }): Promise<{ playing: boolean }>;
  stopTonePreview(): Promise<{ playing: boolean }>;
  stopAlarmPlayback(): Promise<{ success: boolean }>;
}

export const TrafficControlNative = registerPlugin<TrafficControlNativePlugin>('TrafficControlNative');
export const isAndroidTrafficApp = () => Capacitor.getPlatform() === 'android';

export interface AlarmStatusResult {
  message: string;
  exactAlarmsAllowed: boolean;
  scheduleError: string | null;
  version: number;
  supportsCustomTones: boolean;
  nativeVersionCode?: number;
  nativeVersionName?: string;
}

export async function getTrafficAlarmDetailedStatus(): Promise<AlarmStatusResult> {
  if (!isAndroidTrafficApp()) {
    return {
      message: 'Background alarms require the Android app.',
      exactAlarmsAllowed: false,
      scheduleError: null,
      version: 0,
      supportsCustomTones: false,
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
    const supportsCustomTones = !!status.supportsCustomTones || (typeof status.version === 'number' && status.version >= 4);
    return {
      message,
      exactAlarmsAllowed: !!status.exactAlarmsAllowed,
      scheduleError,
      version: status.version || 0,
      supportsCustomTones,
      nativeVersionCode: status.nativeVersionCode,
      nativeVersionName: status.nativeVersionName,
    };
  } catch {
    return {
      message: 'Update the Android app to enable reliable background alarms.',
      exactAlarmsAllowed: false,
      scheduleError: null,
      version: 0,
      supportsCustomTones: false,
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

export async function getSystemAlarmTones(): Promise<SystemRingtone[]> {
  if (!isAndroidTrafficApp()) {
    throw new Error('Device alarm ringtones require the Android app.');
  }

  // Check native version capabilities
  try {
    const status = await TrafficControlNative.getAlarmStatus();
    const supports = !!status.supportsCustomTones || (typeof status.version === 'number' && status.version >= 4);
    if (!supports) {
      throw new Error('Update app required. The installed Android app does not support device alarm ringtones.');
    }
  } catch (checkErr: any) {
    if (checkErr.message?.includes('Update app required')) throw checkErr;
    throw new Error('Update app required. The installed Android app does not support device alarm ringtones.');
  }

  try {
    const res = await TrafficControlNative.getSystemRingtones();
    return res.ringtones || [];
  } catch (err: any) {
    console.error('[TrafficNativePlugin] getSystemRingtones error:', err);
    const msg = err?.message || String(err);
    if (msg.includes('does not have the method') || msg.includes('not implemented')) {
      throw new Error('Update app required. Please update the Connect GOD app from Google Play Store.');
    }
    throw new Error(msg || 'Failed to retrieve system ringtones.');
  }
}

export async function pickCustomAudioFile(): Promise<ToneSelectionResult> {
  if (!isAndroidTrafficApp()) {
    throw new Error('Custom audio selection requires the Android app.');
  }

  // Check native version capabilities
  try {
    const status = await TrafficControlNative.getAlarmStatus();
    const supports = !!status.supportsCustomTones || (typeof status.version === 'number' && status.version >= 4);
    if (!supports) {
      throw new Error('Update app required. The installed Android app does not support custom audio files.');
    }
  } catch (checkErr: any) {
    if (checkErr.message?.includes('Update app required')) throw checkErr;
    throw new Error('Update app required. The installed Android app does not support custom audio files.');
  }

  try {
    return await TrafficControlNative.pickCustomAudio();
  } catch (err: any) {
    console.error('[TrafficNativePlugin] pickCustomAudio error:', err);
    const msg = err?.message || String(err);
    if (msg.includes('does not have the method') || msg.includes('not implemented')) {
      throw new Error('Update app required. Please update the Connect GOD app from Google Play Store.');
    }
    throw new Error(msg || 'Failed to select custom audio file.');
  }
}

export async function playToneAudioPreview(toneType: string, toneUri?: string, slotKey?: string): Promise<boolean> {
  if (!isAndroidTrafficApp()) return false;
  try {
    const res = await TrafficControlNative.playTonePreview({ toneType, toneUri, slotKey });
    return !!res.playing;
  } catch (err) {
    console.error('[TrafficNativePlugin] playTonePreview error:', err);
    return false;
  }
}

export async function stopToneAudioPreview(): Promise<void> {
  if (!isAndroidTrafficApp()) return;
  try {
    await TrafficControlNative.stopTonePreview();
  } catch (err) {
    console.error('[TrafficNativePlugin] stopTonePreview error:', err);
  }
}

export async function stopCurrentAlarmPlayback(): Promise<void> {
  if (!isAndroidTrafficApp()) return;
  try {
    await TrafficControlNative.stopAlarmPlayback();
  } catch (err) {
    console.error('[TrafficNativePlugin] stopAlarmPlayback error:', err);
  }
}
