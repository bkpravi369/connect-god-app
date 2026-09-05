import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { extractDriveFileId } from '@/lib/constants';
import { getJSON, setJSON } from '@/lib/storage';
import { MediaTrack } from '@/constants/mediaTracks';

export const WORKER_BASE_URL = 'https://babacloudflare.bkpraveen2010.workers.dev';

export type MainMediaTab = 'songs' | 'commentary' | 'music' | 'ringtones';

export type SubTabKey =
  // [SONGS]
  | 'panch_swarup'
  | 'hindi'
  | 'malayalam'
  | 'om_and_bhog'
  | 'om_and_bhorg' // alias
  | 'own_tunes'
  // [COMMENTARY]
  | 'sheeba_sister'
  | 'sheeja_sister'
  | 'others'
  // [MUSIC]
  | 'function_music'
  | 'own_music'
  | 'meditation_music'
  // [RINGTONES]
  | 'ringtones'
  | 'ringtone_hindi'
  | 'ringtone_malayalam';

// Backward compatibility type
export type AudioCategoryTab = 'malayalam' | 'hindi' | 'music' | 'commentary';

export interface CloudflareR2Item {
  key: string;
  name: string;
  size?: number;
  url: string;
}

export interface StrictSubTabConfig {
  folder: string;
  category: 'song' | 'commentary' | 'music' | 'ringtone';
  speaker?: string;
}

/**
 * EXACT CLOUDFLARE R2 BUCKET FOLDER MAPPING
 * Map each tab to its exact R2 folder path:
 * [Commentary]
 * - Sheeba Sister -> "commentary-sheeba sister"
 * - Sheeja Sister -> "commentary-sheeja sister"
 * - Others -> "commentary-others"
 * [Songs]
 * - Panch Swarup -> "panch-Swarup"
 * - Hindi -> "song-hindi"
 * - Malayalam -> "song-malayalam"
 * - Om & Bhog -> "om-bhorg"
 * [Music]
 * - Function Music -> "function-music"
 * - Own Music -> "own-music "
 * [Ringtone]
 * - Ringtones -> "ringtones"
 */
export const R2_FOLDER_MAPPING: Record<SubTabKey, string> = {
  // [Commentary]
  sheeba_sister: 'commentary-sheeba sister',
  sheeja_sister: 'commentary-sheeja sister',
  others: 'commentary-others',

  // [Songs]
  panch_swarup: 'panch-Swarup',
  hindi: 'song-hindi',
  malayalam: 'song-malayalam',
  om_and_bhog: 'om-bhorg',
  om_and_bhorg: 'om-bhorg',
  own_tunes: 'own-tune',

  // [Music]
  function_music: 'function-music',
  own_music: 'own-music ',
  meditation_music: 'meditation-music',

  // [Ringtone]
  ringtones: 'ringtones',
  ringtone_hindi: 'ringtones',
  ringtone_malayalam: 'ringtones',
};

export const R2_SUBTAB_CONFIG: Record<SubTabKey, StrictSubTabConfig> = {
  // [Commentary]
  sheeba_sister: {
    folder: 'commentary-sheeba sister',
    category: 'commentary',
    speaker: 'BK Sheeba Sister',
  },
  sheeja_sister: {
    folder: 'commentary-sheeja sister',
    category: 'commentary',
    speaker: 'BK Sheeja Sister',
  },
  others: {
    folder: 'commentary-others',
    category: 'commentary',
    speaker: 'Commentary',
  },

  // [Songs]
  panch_swarup: {
    folder: 'panch-Swarup',
    category: 'song',
  },
  hindi: {
    folder: 'song-hindi',
    category: 'song',
  },
  malayalam: {
    folder: 'song-malayalam',
    category: 'song',
  },
  om_and_bhog: {
    folder: 'om-bhorg',
    category: 'song',
  },
  om_and_bhorg: {
    folder: 'om-bhorg',
    category: 'song',
  },
  own_tunes: {
    folder: 'own-tune',
    category: 'song',
  },

  // [Music]
  function_music: {
    folder: 'function-music',
    category: 'music',
  },
  own_music: {
    folder: 'own-music ',
    category: 'music',
  },
  meditation_music: {
    folder: 'meditation-music',
    category: 'music',
  },

  // [Ringtone]
  ringtones: {
    folder: 'ringtones',
    category: 'ringtone',
  },
  ringtone_hindi: {
    folder: 'ringtones',
    category: 'ringtone',
  },
  ringtone_malayalam: {
    folder: 'ringtones',
    category: 'ringtone',
  },
};

/**
 * Resolves sub-tab key safely regardless of shorthand identifiers
 */
export function resolveSubTabKey(mainTab: MainMediaTab, subTabId: string): SubTabKey {
  if (mainTab === 'ringtones') {
    return 'ringtones';
  }
  if (mainTab === 'songs') {
    if (subTabId === 'panch_swarup' || subTabId === 'panch-Swarup') return 'panch_swarup';
    if (
      subTabId === 'om_dhwani' ||
      subTabId === 'om_and_bhorg' ||
      subTabId === 'om_bhorg' ||
      subTabId === 'om_and_bhog'
    ) {
      return 'om_and_bhog';
    }
    if (subTabId === 'own_tune' || subTabId === 'own_tunes') return 'own_tunes';
  }
  if (mainTab === 'music') {
    if (subTabId === 'function_music' || subTabId === 'function-music') return 'function_music';
    if (subTabId === 'own_music' || subTabId === 'own-music') return 'own_music';
  }
  return subTabId as SubTabKey;
}

/**
 * Formats a clean track name from raw filename or key.
 * Strips .mp3 (and other extensions), bitrate tags, and leading track numbers.
 */
export function formatR2Title(raw: string): string {
  if (!raw) return '';
  let name = raw.split('/').pop() || raw;
  name = name.replace(/\.(mp3|wav|m4a|aac|ogg|mpeg|flac)$/i, '');
  name = name.replace(/mp3$/i, '');
  name = name.replace(/_320kbps$/i, '');
  name = name.replace(/_128kbps$/i, '');

  // Strip leading track number prefixes like "01 - ", "04-", but preserve numbers like "108"
  name = name.replace(/^0*(\d{1,2})[._\-\s]+(?=[A-Za-z])/i, '');

  // Replace dashes and underscores with spaces
  name = name.replace(/[_-]+/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();

  return name || raw;
}

/**
 * Maps raw Cloudflare R2 items into MediaTrack array for this exact subTab
 */
export function mapR2ItemsToTracks(
  items: CloudflareR2Item[],
  subTab: SubTabKey
): MediaTrack[] {
  if (!Array.isArray(items)) return [];
  const cfg = R2_SUBTAB_CONFIG[subTab];

  return items
    .filter((item) => item && (item.url || item.key))
    .map((item, idx) => {
      const rawName = item.name || (item.key ? item.key.split('/').pop() : '') || `Track ${idx + 1}`;
      const title = formatR2Title(rawName);
      const audioUrl = item.url ? item.url.trim() : '';

      return {
        id: `r2_${subTab}_${encodeURIComponent(item.key || item.name || String(idx))}`,
        title,
        url: audioUrl,
        category: cfg ? cfg.category : 'song',
        subCategory: subTab,
        speaker: cfg?.speaker,
      };
    });
}

/**
 * Synchronous cached tracks getter - returns cached tracks for this sub-tab
 */
export function getInitialSubTabTracks(subTab: SubTabKey): MediaTrack[] {
  const storageKey = `r2_tracks_v2_${subTab}`;
  const cached = getJSON<MediaTrack[] | null>(storageKey, null);
  if (Array.isArray(cached)) {
    return cached;
  }
  return [];
}

/**
 * Queries the Cloudflare Worker API for the given sub-tab folder with proper URL-encoding.
 */
export async function fetchSubTabTracks(
  subTab: SubTabKey,
  forceRefresh = false
): Promise<MediaTrack[]> {
  const folderPath = R2_FOLDER_MAPPING[subTab];
  if (!folderPath) return [];

  const storageKey = `r2_tracks_v2_${subTab}`;

  if (!forceRefresh) {
    const cached = getJSON<MediaTrack[] | null>(storageKey, null);
    if (Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  try {
    const endpoint = `${WORKER_BASE_URL}/?folder=${encodeURIComponent(folderPath)}`;
    const res = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (res.ok) {
      const items: CloudflareR2Item[] = await res.json();
      if (Array.isArray(items)) {
        const tracks = mapR2ItemsToTracks(items, subTab);
        setJSON(storageKey, tracks);
        return tracks;
      }
    }
  } catch (err) {
    console.warn(`[AudioService] Error fetching R2 folder "${folderPath}" for ${subTab}:`, err);
  }

  const cached = getJSON<MediaTrack[] | null>(storageKey, null);
  if (Array.isArray(cached)) {
    return cached;
  }

  return [];
}

/**
 * Pre-fetches all sub-tabs for a main tab in background
 */
export async function prefetchMainTabAudio(
  mainTab: MainMediaTab,
  forceRefresh = false
): Promise<Record<string, MediaTrack[]>> {
  const subTabsByMain: Record<MainMediaTab, SubTabKey[]> = {
    songs: ['panch_swarup', 'hindi', 'malayalam', 'om_and_bhog'],
    commentary: ['sheeba_sister', 'sheeja_sister', 'others'],
    music: ['function_music', 'own_music'],
    ringtones: ['ringtones'],
  };

  const keys = subTabsByMain[mainTab] || [];
  const results: Record<string, MediaTrack[]> = {};

  await Promise.all(
    keys.map(async (key) => {
      try {
        const tracks = await fetchSubTabTracks(key, forceRefresh);
        results[key] = tracks;
      } catch (err) {
        results[key] = getInitialSubTabTracks(key);
      }
    })
  );

  return results;
}

// ── Backward Compatibility Helpers ─────────────────────────────────────
export function getCachedCloudinaryCategory(category: AudioCategoryTab): MediaTrack[] {
  switch (category) {
    case 'malayalam':
      return getInitialSubTabTracks('malayalam');
    case 'hindi':
      return getInitialSubTabTracks('hindi');
    case 'music':
      return getInitialSubTabTracks('function_music');
    default:
      return [];
  }
}

let isAudioModeConfigured = false;

/**
 * Initializes global Audio mode for iOS & Android
 */
export async function configureAudioMode(): Promise<void> {
  if (isAudioModeConfigured || Platform.OS === 'web') return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    isAudioModeConfigured = true;
  } catch (err) {
    console.warn('[AudioService] Failed to set audio mode:', err);
  }
}

/**
 * Returns prioritized candidate streaming URLs for audio files
 * Encodes spaces to guarantee compatibility across web and native devices.
 */
export function getAudioStreamCandidates(urlOrFileId: string): string[] {
  if (!urlOrFileId || !urlOrFileId.trim()) return [];

  const trimmed = urlOrFileId.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const candidates: string[] = [];
    const encoded = encodeURI(decodeURI(trimmed));
    candidates.push(encoded);
    if (encoded !== trimmed) {
      candidates.push(trimmed);
    }
    return candidates;
  }

  const fileId =
    extractDriveFileId(trimmed) ||
    (trimmed.length >= 25 && !trimmed.includes('/') ? trimmed : null);

  if (fileId) {
    return [
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
    ];
  }

  return [trimmed];
}
