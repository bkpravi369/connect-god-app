import { registerPlugin, Capacitor } from '@capacitor/core';

export interface TrafficControlNativePlugin {
  scheduleAlarms(options?: {
    trafficEnabled?: boolean;
    hourlyEnabled?: boolean;
    customAlarms?: string;
  }): Promise<{ success: boolean }>;
  cancelAllAlarms(): Promise<{ success: boolean }>;
  isIgnoringBatteryOptimizations(): Promise<{ isIgnoring: boolean }>;
  requestIgnoreBatteryOptimizations(): Promise<{ requested: boolean }>;
}

export const TrafficControlNative = registerPlugin<TrafficControlNativePlugin>('TrafficControlNative');

/**
 * Synchronizes Traffic Control alarms directly with native Android AlarmManager.
 */
export async function syncNativeTrafficAlarms(
  trafficEnabled = true,
  hourlyEnabled = true,
  customAlarms: any[] = []
): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') {
    return false;
  }
  try {
    const res = await TrafficControlNative.scheduleAlarms({
      trafficEnabled,
      hourlyEnabled,
      customAlarms: JSON.stringify(customAlarms || []),
    });
    console.log('[TrafficControlNative] Native hardware alarms synchronized successfully:', res);
    return res?.success === true;
  } catch (err) {
    console.warn('[TrafficControlNative] Error synchronizing native alarms:', err);
    return false;
  }
}

/**
 * Checks if the app is already exempt from Android battery optimization (Doze mode killer).
 */
export async function checkBatteryOptimizationExemption(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') {
    return true;
  }
  try {
    const res = await TrafficControlNative.isIgnoringBatteryOptimizations();
    return res?.isIgnoring === true;
  } catch {
    return true;
  }
}

/**
 * Prompts user to exempt app from Android battery optimizations.
 */
export async function promptBatteryOptimizationExemption(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') {
    return false;
  }
  try {
    const res = await TrafficControlNative.requestIgnoreBatteryOptimizations();
    return res?.requested === true;
  } catch (err) {
    console.warn('[TrafficControlNative] Failed to request battery exemption:', err);
    return false;
  }
}
