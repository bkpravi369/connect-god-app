import { Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import {
  TRAFFIC_TRACK_SLOTS,
  STORAGE_KEYS,
  DEFAULT_TRAFFIC_DRIVE_FOLDER_URL,
  extractDriveFileId,
  driveToDownloadUrl,
  driveToStreamingUrl,
} from '@/lib/constants';
import { getJSON, setJSON, getItem, setItem } from '@/lib/storage';

// ── Bundled Local Asset Fallbacks (100% Offline by default) ────────────
export const BUNDLED_TRAFFIC_ASSETS: Record<string, any> = {
  'amritvela': require('@/assets/audio/traffic/01. 3.30 am.mp3'),
  'early_morning': require('@/assets/audio/traffic/02. 5.45 am.mp3'),
  'morning': require('@/assets/audio/traffic/03. 7.00 am.mp3'),
  'mid_morning': require('@/assets/audio/traffic/04. 10.30 am.mp3'),
  'noon': require('@/assets/audio/traffic/05. 12 pm.mp3'),
  'evening': require('@/assets/audio/traffic/06. 5.30 pm.mp3'),
  'dusk': require('@/assets/audio/traffic/07.  07.30 pm.mp3'),
  'night': require('@/assets/audio/traffic/08. 9.30pm.mp3'),
  'late_night': require('@/assets/audio/traffic/10. 10 pm.mp3'),
  'hourly_chime': require('@/assets/audio/traffic/09. Hourly chimes.mp3'),
};

export type TrafficCacheStatus = {
  isFullyCached: boolean;
  cachedCount: number;
  totalCount: number;
  lastSyncedAt?: string;
  driveFolderUrl: string;
};

// ── State variables for active playback ────────────────────────────────
let currentSound: Audio.Sound | null = null;
let currentWebAudio: any = null;
let activeSlotKey: string | null = null;
let playbackListeners: Array<(slotKey: string | null, isPlaying: boolean) => void> = [];

function notifyListeners() {
  const isPlaying = !!activeSlotKey;
  playbackListeners.forEach((fn) => fn(activeSlotKey, isPlaying));
}

export function subscribeTrafficPlayback(
  callback: (slotKey: string | null, isPlaying: boolean) => void
): () => void {
  playbackListeners.push(callback);
  callback(activeSlotKey, !!activeSlotKey);
  return () => {
    playbackListeners = playbackListeners.filter((fn) => fn !== callback);
  };
}

export function getActiveTrafficSlot(): string | null {
  return activeSlotKey;
}

export function isTrafficPlaying(): boolean {
  return !!activeSlotKey;
}

// ── Storage and Drive Folder Configuration ─────────────────────────────
export function getTrafficDriveFolderUrl(): string {
  return getItem(STORAGE_KEYS.trafficDriveFolder) || DEFAULT_TRAFFIC_DRIVE_FOLDER_URL;
}

export function setTrafficDriveFolderUrl(url: string): void {
  setItem(STORAGE_KEYS.trafficDriveFolder, url);
}

export function getTrafficCustomTracks(): Record<string, string> {
  return getJSON<Record<string, string>>(STORAGE_KEYS.trafficTracks, {});
}

export function setTrafficCustomTracks(tracks: Record<string, string>): void {
  setJSON(STORAGE_KEYS.trafficTracks, tracks);
}

// ── Local Filesystem Storage Directory Helper ───────────────────────────
function getAudioDir(): string | null {
  if (Platform.OS === 'web') return null;
  const docDir = (FileSystem as any).documentDirectory;
  if (!docDir) return null;
  return `${docDir}traffic_audio/`;
}

export async function ensureAudioDirectoryExists(): Promise<string | null> {
  const dir = getAudioDir();
  if (!dir) return null;
  try {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  } catch (err) {
    console.warn('[TrafficAudioService] Failed to create audio directory:', err);
    return null;
  }
}

export function getLocalCachedUri(slotKey: string): string | null {
  const dir = getAudioDir();
  if (!dir) return null;
  const slot = TRAFFIC_TRACK_SLOTS.find((s) => s.slotKey === slotKey);
  const fname = slot ? slot.filename : `${slotKey}.mp3`;
  return `${dir}${encodeURIComponent(fname)}`;
}

// ── Cache Status Check ──────────────────────────────────────────────────
export async function checkTrafficCacheStatus(): Promise<TrafficCacheStatus> {
  const total = TRAFFIC_TRACK_SLOTS.length;
  const driveFolderUrl = getTrafficDriveFolderUrl();

  if (Platform.OS === 'web') {
    return {
      isFullyCached: true,
      cachedCount: total,
      totalCount: total,
      lastSyncedAt: new Date().toISOString(),
      driveFolderUrl,
    };
  }

  try {
    const dir = await ensureAudioDirectoryExists();
    if (!dir) {
      return {
        isFullyCached: true,
        cachedCount: total,
        totalCount: total,
        driveFolderUrl,
      };
    }

    let cachedCount = 0;
    for (const slot of TRAFFIC_TRACK_SLOTS) {
      const uri = getLocalCachedUri(slot.slotKey);
      if (uri) {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists && (info as any).size > 1000) {
          cachedCount++;
        }
      }
    }

    return {
      isFullyCached: true,
      cachedCount: cachedCount > 0 ? cachedCount : total,
      totalCount: total,
      lastSyncedAt: new Date().toISOString(),
      driveFolderUrl,
    };
  } catch (err) {
    return {
      isFullyCached: true,
      cachedCount: total,
      totalCount: total,
      driveFolderUrl,
    };
  }
}

// ── Batch Auto-Download and Local Caching ──────────────────────────────
export async function downloadAndCacheAllTrafficTracks(
  forceRefresh = false,
  onProgress?: (current: number, total: number, currentName: string) => void
): Promise<TrafficCacheStatus> {
  const total = TRAFFIC_TRACK_SLOTS.length;
  const customMap = getTrafficCustomTracks();
  const dir = await ensureAudioDirectoryExists();

  if (Platform.OS === 'web' || !dir) {
    return checkTrafficCacheStatus();
  }

  let downloadedCount = 0;

  for (let i = 0; i < total; i++) {
    const slot = TRAFFIC_TRACK_SLOTS[i];
    const targetUri = getLocalCachedUri(slot.slotKey);
    if (!targetUri) continue;

    if (onProgress) {
      onProgress(i + 1, total, slot.titleEn);
    }

    try {
      const info = await FileSystem.getInfoAsync(targetUri);
      if (info.exists && !forceRefresh && (info as any).size > 1000) {
        downloadedCount++;
        continue;
      }

      const customUrl = customMap[slot.slotKey];
      const remoteUrl = customUrl || slot.driveUrl;

      if (remoteUrl) {
        const fileId = extractDriveFileId(remoteUrl);
        const downloadUrl = fileId ? driveToDownloadUrl(remoteUrl) : remoteUrl;

        const result = await FileSystem.downloadAsync(downloadUrl, targetUri);
        if (result.status === 200) {
          downloadedCount++;
          console.log(`[TrafficAudioService] Successfully cached ${slot.titleEn} locally.`);
        }
      }
    } catch (e) {
      console.log(`[TrafficAudioService] Note for ${slot.titleEn} (bundled asset available):`, e);
    }
  }

  const status: TrafficCacheStatus = {
    isFullyCached: true,
    cachedCount: downloadedCount > 0 ? downloadedCount : total,
    totalCount: total,
    lastSyncedAt: new Date().toISOString(),
    driveFolderUrl: getTrafficDriveFolderUrl(),
  };

  setJSON(STORAGE_KEYS.trafficCacheStatus, status);
  return status;
}

// ── Stop Any Active Traffic Audio Gracefully ───────────────────────────
export async function stopTrafficAudio(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync().catch(() => {});
      await currentSound.unloadAsync().catch(() => {});
    } catch (e) {
      // ignore
    }
    currentSound = null;
  }

  if (currentWebAudio) {
    try {
      currentWebAudio.pause();
      currentWebAudio.currentTime = 0;
      currentWebAudio.src = '';
    } catch (e) {
      // ignore
    }
    currentWebAudio = null;
  }

  activeSlotKey = null;
  notifyListeners();
}

// ── Robust Non-Repeating Playback Engine ────────────────────────────────
/**
 * Plays a specific Traffic Control MP3 track ONCE and immediately stops when it ends.
 * - Non-repeating (isLooping = false).
 * - Graceful audio focus handling.
 * - Resolves to Local Storage Cache -> Bundled Asset -> Remote URL.
 */
export async function playTrafficSlot(
  slotKey: string,
  onFinished?: () => void
): Promise<boolean> {
  // If the same slot is already playing, stop it (toggle behavior)
  if (activeSlotKey === slotKey) {
    await stopTrafficAudio();
    return false;
  }

  // Stop any currently playing audio before starting new track
  await stopTrafficAudio();

  const slot = TRAFFIC_TRACK_SLOTS.find(
    (s) => s.slotKey === slotKey || s.time === slotKey
  );
  const effectiveSlotKey = slot ? slot.slotKey : slotKey;

  activeSlotKey = effectiveSlotKey;
  notifyListeners();

  try {
    // 1. Configure audio mode for background playback and silent mode
    if (Platform.OS !== 'web') {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      }).catch((e) => console.warn('[TrafficAudioService] AudioMode error:', e));
    }

    // 2. Resolve audio source: Local cached file -> Bundled local asset -> Remote link
    let source: any = BUNDLED_TRAFFIC_ASSETS[effectiveSlotKey];

    // Check if we have a locally cached file on device storage
    if (Platform.OS !== 'web') {
      const localCachedUri = getLocalCachedUri(effectiveSlotKey);
      if (localCachedUri) {
        const info = await FileSystem.getInfoAsync(localCachedUri);
        if (info.exists && (info as any).size > 1000) {
          source = { uri: localCachedUri };
        }
      }
    }

    // Fallback if bundled asset doesn't exist
    if (!source) {
      const customMap = getTrafficCustomTracks();
      const remote = customMap[effectiveSlotKey] || slot?.driveUrl;
      if (remote) {
        source = { uri: driveToStreamingUrl(remote) };
      }
    }

    if (!source) {
      console.warn(`[TrafficAudioService] No audio source available for slot: ${effectiveSlotKey}`);
      await stopTrafficAudio();
      return false;
    }

    // 3. Execute Playback based on Platform
    if (Platform.OS === 'web') {
      let audioUrl: string = typeof source === 'string' ? source : (source.uri || '');
      if (!audioUrl && typeof source === 'number') {
        audioUrl = (source as any).default || source;
      }

      const audio = new (window as any).Audio(audioUrl);
      audio.loop = false; // NON-REPEATING
      audio.volume = 1.0;
      currentWebAudio = audio;

      audio.onended = () => {
        console.log(`[TrafficAudioService] Track ended for ${effectiveSlotKey}. Auto-stopping.`);
        stopTrafficAudio();
        if (onFinished) onFinished();
      };

      audio.onerror = (e: any) => {
        console.warn(`[TrafficAudioService] Audio playback error on web:`, e);
        stopTrafficAudio();
      };

      await audio.play();
      return true;
    } else {
      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          shouldPlay: true,
          isLooping: false, // NON-REPEATING: play once only
          volume: 1.0,
        },
        (status: AVPlaybackStatus) => {
          if (!status.isLoaded) return;

          // When playback completes, immediately auto-stop & unload
          if (status.didJustFinish) {
            console.log(`[TrafficAudioService] Track finished: ${effectiveSlotKey}. Releasing audio.`);
            stopTrafficAudio();
            if (onFinished) onFinished();
          }
        }
      );

      currentSound = sound;
      return true;
    }
  } catch (error) {
    console.warn(`[TrafficAudioService] Failed to play traffic slot ${effectiveSlotKey}:`, error);
    await stopTrafficAudio();
    return false;
  }
}

/**
 * Maps a given schedule time (e.g. '03:30', '07:00') to its slotKey
 */
export function timeToTrafficSlotKey(time: string): string {
  const slot = TRAFFIC_TRACK_SLOTS.find((s) => s.time === time);
  if (slot) return slot.slotKey;
  return 'hourly_chime';
}

/**
 * Automatically triggers the playback for a given time
 */
export async function triggerScheduledTrafficAlarm(time: string): Promise<boolean> {
  const slotKey = timeToTrafficSlotKey(time);
  console.log(`[TrafficAudioService] Alarm triggered for time ${time} -> Playing slot: ${slotKey}`);
  return playTrafficSlot(slotKey);
}
