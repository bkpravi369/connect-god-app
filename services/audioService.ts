import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { extractDriveFileId } from '@/lib/constants';
import { getJSON, setJSON } from '@/lib/storage';
import { MediaTrack } from '@/constants/mediaTracks';

export const CLOUDINARY_CLOUD_NAME = 'tb5bmwd5';

export type MainMediaTab = 'songs' | 'commentary' | 'music' | 'ringtones';

export type SubTabKey =
  // [SONGS]
  | 'hindi'
  | 'malayalam'
  | 'om_and_bhorg'
  | 'own_tunes'
  // [COMMENTARY]
  | 'sheeba_sister'
  | 'sheeja_sister'
  | 'others'
  // [MUSIC]
  | 'meditation_music'
  | 'function_music'
  | 'own_music'
  // [RINGTONES]
  | 'ringtone_hindi'
  | 'ringtone_malayalam';

// Backward compatibility type
export type AudioCategoryTab = 'malayalam' | 'hindi' | 'music' | 'commentary';

export interface CloudinaryRawResource {
  asset_id: string;
  public_id: string;
  version: number;
  format: string;
  width?: number;
  height?: number;
  type?: string;
  created_at?: string;
  bytes?: number;
  duration?: number;
  asset_folder?: string;
}

export interface CloudinaryListResponse {
  resources: CloudinaryRawResource[];
  updated_at?: string;
}

export interface StrictSubTabConfig {
  tag: string;
  altTag?: string;
  category: 'song' | 'commentary' | 'music' | 'ringtone';
  speaker?: string;
}

/**
 * STRICT 1-TO-1 EXACT TAG MAPPING
 * Queries only exact tags with cache-busting.
 */
export const CLOUDINARY_EXACT_TAGS: Record<SubTabKey, StrictSubTabConfig> = {
  // [SONGS]
  hindi: { tag: 'song_hindi', altTag: 'songs_hindi', category: 'song' },
  malayalam: { tag: 'song_malayalam', category: 'song' },
  om_and_bhorg: { tag: 'om_bhog', altTag: 'om_bhorg', category: 'song' },
  own_tunes: { tag: 'own_tunes', category: 'song' },

  // [COMMENTARY]
  sheeba_sister: {
    tag: 'commentary_sheeba',
    category: 'commentary',
    speaker: 'BK Sheeba Sister',
  },
  sheeja_sister: {
    tag: 'commentary_sheeja',
    category: 'commentary',
    speaker: 'BK Sheeja Sister',
  },
  others: {
    tag: 'commentary_others',
    category: 'commentary',
  },

  // [MUSIC]
  meditation_music: { tag: 'meditation_music', category: 'music' },
  function_music: { tag: 'function_music', category: 'music' },
  own_music: { tag: 'own_music', category: 'music' },

  // [RINGTONES]
  ringtone_hindi: { tag: 'ringtone_hindi', category: 'ringtone' },
  ringtone_malayalam: { tag: 'ringtone_malayalam', category: 'ringtone' },
};

/**
 * Resolves sub-tab key safely regardless of shorthand identifiers
 */
export function resolveSubTabKey(mainTab: MainMediaTab, subTabId: string): SubTabKey {
  if (mainTab === 'ringtones') {
    if (subTabId === 'hindi' || subTabId === 'ringtone_hindi') return 'ringtone_hindi';
    if (subTabId === 'malayalam' || subTabId === 'ringtone_malayalam') return 'ringtone_malayalam';
  }
  if (mainTab === 'songs') {
    if (subTabId === 'om_dhwani' || subTabId === 'om_and_bhorg' || subTabId === 'om_bhorg') {
      return 'om_and_bhorg';
    }
  }
  if (mainTab === 'music') {
    if (subTabId === 'music' || subTabId === 'meditation_music') return 'meditation_music';
  }
  return subTabId as SubTabKey;
}

/**
 * Converts raw publicId or filename into clean, readable title case string
 * Strips underscores, extensions (.mp3, mp3), bitrate tags (_320kbps, _128kbps),
 * properly handles ordinals (1st Day, 2nd Day, 3rd Day, 4th Day), and preserves sacred numbers (108).
 */
export function formatCloudinaryTitle(raw: string): string {
  if (!raw) return '';
  let name = raw.split('/').pop() || raw;
  name = name.replace(/\.(mp3|wav|m4a|aac|ogg|mpeg|flac)$/i, '');
  name = name.replace(/mp3$/i, '');
  name = name.replace(/_320kbps$/i, '');
  name = name.replace(/_128kbps$/i, '');

  // Handle specific day commentary patterns: e.g. '01_1st_DAY' -> '1st Day', '04_DAY_COMMENTARY' -> '4th Day Commentary'
  name = name.replace(/^0*1[._\-\s]+1st/i, '1st');
  name = name.replace(/^0*2[._\-\s]+2nd/i, '2nd');
  name = name.replace(/^0*3[._\-\s]+3rd/i, '3rd');
  name = name.replace(/^0*4[._\-\s]+DAY/i, '4th Day');

  // Strip leading track number prefixes (e.g. '04-Maanava' -> 'Maanava', '07-baba' -> 'baba'),
  // but preserve significant 3-digit spiritual numbers like '108'
  name = name.replace(/^0*(\d{1,2})[._\-\s]+(?=[A-Za-z])/i, '');

  // Replace dashes and underscores with spaces
  name = name.replace(/[_-]+/g, ' ');
  // Collapse duplicate whitespace
  name = name.replace(/\s+/g, ' ').trim();

  // Capitalize words properly while preserving BK and ordinals
  return name
    .split(' ')
    .map((w) => {
      if (!w) return '';
      const upper = w.toUpperCase();
      if (upper === 'BK' || upper === 'B.K') return 'BK';
      if (/^\d+(?:st|nd|rd|th)$/i.test(w)) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Constructs direct streaming audio URL for a Cloudinary resource
 */
export function buildCloudinaryAssetUrl(item: {
  version: number | string;
  public_id: string;
  format: string;
}): string {
  const encPublicId = item.public_id.split('/').map(encodeURIComponent).join('/');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/v${item.version}/${encPublicId}.${item.format || 'mp3'}`;
}

/**
 * Constructs direct download audio URL with fl_attachment for instant file download
 */
export function buildCloudinaryAssetDownloadUrl(item: {
  version: number | string;
  public_id: string;
  format: string;
}): string {
  const encPublicId = item.public_id.split('/').map(encodeURIComponent).join('/');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/fl_attachment/v${item.version}/${encPublicId}.${item.format || 'mp3'}`;
}

/**
 * Maps raw Cloudinary resources strictly into MediaTrack array for this exact subTab
 */
export function mapCloudinaryResourcesToTracks(
  resources: CloudinaryRawResource[],
  subTab: SubTabKey
): MediaTrack[] {
  if (!Array.isArray(resources)) return [];
  const cfg = CLOUDINARY_EXACT_TAGS[subTab];
  if (!cfg) return [];

  return resources.map((r, idx) => {
    const formattedTitle = formatCloudinaryTitle(r.public_id);
    const url = buildCloudinaryAssetUrl(r);

    return {
      id: `cld_${subTab}_${r.asset_id || r.public_id || idx}`,
      title: formattedTitle || r.public_id,
      url,
      category: cfg.category,
      subCategory: subTab,
      speaker: cfg.speaker,
      duration: r.duration,
    };
  });
}

/**
 * Synchronous cached tracks getter - returns ONLY exact cached tracks for this sub-tab
 * Never backfills with unrelated tracks.
 */
export function getInitialSubTabTracks(subTab: SubTabKey): MediaTrack[] {
  const storageKey = `cld_exact_v5_${subTab}`;
  const cached = getJSON<MediaTrack[] | null>(storageKey, null);
  if (Array.isArray(cached)) {
    return cached;
  }
  return [];
}

/**
 * Queries ONLY the exact tag for the given sub-tab with cache busting.
 * No fallbacks. No combining. No cross-contamination.
 */
export async function fetchSubTabTracks(
  subTab: SubTabKey,
  forceRefresh = false
): Promise<MediaTrack[]> {
  const cfg = CLOUDINARY_EXACT_TAGS[subTab];
  if (!cfg) return [];

  const storageKey = `cld_exact_v5_${subTab}`;

  if (!forceRefresh) {
    const cached = getJSON<MediaTrack[] | null>(storageKey, null);
    if (Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  // Exact tags to check: primary tag, and if 404, only the specific alternative tag name (e.g. song_hindi -> songs_hindi)
  const tagsToCheck = cfg.altTag ? [cfg.tag, cfg.altTag] : [cfg.tag];

  for (const tag of tagsToCheck) {
    try {
      const timestamp = Date.now();
      const endpoint = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/list/${encodeURIComponent(tag)}.json?_cb=${timestamp}`;
      const res = await fetch(endpoint, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const data: CloudinaryListResponse = await res.json();
        if (Array.isArray(data.resources) && data.resources.length > 0) {
          const tracks = mapCloudinaryResourcesToTracks(data.resources, subTab);
          setJSON(storageKey, tracks);
          return tracks;
        }
      }
    } catch (err) {
      console.warn(`[AudioService] Error fetching exact tag "${tag}" for ${subTab}:`, err);
    }
  }

  // If no files match the exact tag, return strictly empty array (do NOT backfill)
  setJSON(storageKey, []);
  return [];
}

/**
 * Pre-fetches all sub-tabs for a main tab in background using strict 1-to-1 exact tags
 */
export async function prefetchMainTabAudio(
  mainTab: MainMediaTab,
  forceRefresh = false
): Promise<Record<string, MediaTrack[]>> {
  const subTabsByMain: Record<MainMediaTab, SubTabKey[]> = {
    songs: ['hindi', 'malayalam', 'om_and_bhorg', 'own_tunes'],
    commentary: ['sheeba_sister', 'sheeja_sister', 'others'],
    music: ['meditation_music', 'function_music', 'own_music'],
    ringtones: ['ringtone_hindi', 'ringtone_malayalam'],
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

// ── Legacy Compatibility Helpers ───────────────────────────────────────
export const AUDIO_STORAGE_KEYS = {
  malayalam: 'cld_exact_v5_malayalam',
  hindi: 'cld_exact_v5_hindi',
  music: 'cld_exact_v5_meditation_music',
} as const;

export function getCachedCloudinaryCategory(category: AudioCategoryTab): MediaTrack[] {
  switch (category) {
    case 'malayalam':
      return getInitialSubTabTracks('malayalam');
    case 'hindi':
      return getInitialSubTabTracks('hindi');
    case 'music':
      return getInitialSubTabTracks('meditation_music');
    default:
      return [];
  }
}

export async function fetchAllCloudinaryAudioTabs(
  forceRefresh = false
): Promise<{
  malayalam: MediaTrack[];
  hindi: MediaTrack[];
  music: MediaTrack[];
  commentary: MediaTrack[];
}> {
  const [malayalam, hindi, music, sheeba, sheeja, others] = await Promise.all([
    fetchSubTabTracks('malayalam', forceRefresh),
    fetchSubTabTracks('hindi', forceRefresh),
    fetchSubTabTracks('meditation_music', forceRefresh),
    fetchSubTabTracks('sheeba_sister', forceRefresh),
    fetchSubTabTracks('sheeja_sister', forceRefresh),
    fetchSubTabTracks('others', forceRefresh),
  ]);

  return {
    malayalam,
    hindi,
    music,
    commentary: [...sheeba, ...sheeja, ...others],
  };
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
 * Generates sanitized candidate variations for a Cloudinary URL to guarantee matching
 */
function getCloudinaryVariants(url: string): string[] {
  const list: string[] = [url];

  if (/\/v\d+\//.test(url)) {
    const unversioned = url.replace(/\/v\d+\//, '/');
    if (!list.includes(unversioned)) list.push(unversioned);
  }

  if (url.includes('%20')) {
    const underscoreUrl = url.replace(/%20/g, '_');
    if (!list.includes(underscoreUrl)) list.push(underscoreUrl);
  }
  if (url.includes('_')) {
    const spaceUrl = url.replace(/_/g, '%20');
    if (!list.includes(spaceUrl)) list.push(spaceUrl);
  }

  const cleanedUrl = url.replace(/[_.\s]+\.mp3$/i, '.mp3');
  if (!list.includes(cleanedUrl)) list.push(cleanedUrl);

  return list;
}

/**
 * Returns prioritized candidate streaming URLs for audio files
 */
export function getAudioStreamCandidates(urlOrFileId: string): string[] {
  if (!urlOrFileId || !urlOrFileId.trim()) return [];

  if (urlOrFileId.includes('cloudinary.com')) {
    return getCloudinaryVariants(urlOrFileId);
  }

  const fileId =
    extractDriveFileId(urlOrFileId) ||
    (urlOrFileId.length >= 25 && !urlOrFileId.includes('/') ? urlOrFileId : null);

  if (fileId) {
    return [
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
    ];
  }

  return [urlOrFileId];
}
