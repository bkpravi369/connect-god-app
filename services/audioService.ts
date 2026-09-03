import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { extractDriveFileId } from '@/lib/constants';
import { getJSON, setJSON } from '@/lib/storage';
import {
  MediaTrack,
  MASTER_COMMENTARY_TRACKS,
  SHEEBA_SISTER_COMMENTARIES,
  SHEEJA_SISTER_COMMENTARIES,
  OTHERS_COMMENTARIES,
  OM_AND_BHORG_TRACKS,
  OWN_TUNES_TRACKS,
  FUNCTION_MUSIC_TRACKS,
  OWN_MUSIC_TRACKS,
  HINDI_RINGTONES,
  MALAYALAM_RINGTONES,
  SONGS_DATA,
  MUSIC_DATA,
} from '@/constants/mediaTracks';

export const CLOUDINARY_CLOUD_NAME = 'tb5bmwd5';

export type MainMediaTab = 'songs' | 'commentary' | 'music' | 'ringtones';

export type SubTabKey =
  // 1. Songs
  | 'hindi'
  | 'malayalam'
  | 'om_and_bhorg'
  | 'own_tunes'
  // 2. Commentary
  | 'sheeba_sister'
  | 'sheeja_sister'
  | 'others'
  // 3. Music
  | 'meditation_music'
  | 'function_music'
  | 'own_music'
  // 4. Ringtones
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

export interface SubTabTagConfig {
  primary: string;
  fallbacks: string[];
  category: 'song' | 'commentary' | 'music' | 'ringtone';
  defaultSpeaker?: string;
  staticFallback: MediaTrack[];
}

export const CLOUDINARY_SUBTAB_CONFIG: Record<SubTabKey, SubTabTagConfig> = {
  // ── 1. MAIN TAB: "Songs" ──────────────────────────────────────────────
  hindi: {
    primary: 'song_hindi',
    fallbacks: ['hindi songs', 'hindi'],
    category: 'song',
    staticFallback: [],
  },
  malayalam: {
    primary: 'song_malayalam',
    fallbacks: ['malayalam songs', 'malayalam'],
    category: 'song',
    staticFallback: [],
  },
  om_and_bhorg: {
    primary: 'om_bhorg',
    fallbacks: ['om_bhog', 'om_dhwani'],
    category: 'song',
    staticFallback: OM_AND_BHORG_TRACKS,
  },
  own_tunes: {
    primary: 'own_tunes',
    fallbacks: ['own tunes'],
    category: 'song',
    staticFallback: OWN_TUNES_TRACKS,
  },

  // ── 2. MAIN TAB: "Commentary" ─────────────────────────────────────────
  sheeba_sister: {
    primary: 'commentary_sheeba',
    fallbacks: ['sheeba_sister', 'sheeba'],
    category: 'commentary',
    defaultSpeaker: 'BK Sheeba Sister',
    staticFallback: SHEEBA_SISTER_COMMENTARIES,
  },
  sheeja_sister: {
    primary: 'commentary_sheeja',
    fallbacks: ['sheeja_sister', 'sheeja'],
    category: 'commentary',
    defaultSpeaker: 'BK Sheeja Sister',
    staticFallback: SHEEJA_SISTER_COMMENTARIES,
  },
  others: {
    primary: 'commentary_others',
    fallbacks: ['commentary'],
    category: 'commentary',
    staticFallback: OTHERS_COMMENTARIES,
  },

  // ── 3. MAIN TAB: "Music" ──────────────────────────────────────────────
  meditation_music: {
    primary: 'meditation_music',
    fallbacks: ['Musics', 'music'],
    category: 'music',
    staticFallback: MUSIC_DATA,
  },
  function_music: {
    primary: 'function_music',
    fallbacks: ['function music'],
    category: 'music',
    staticFallback: FUNCTION_MUSIC_TRACKS,
  },
  own_music: {
    primary: 'own_music',
    fallbacks: ['own music'],
    category: 'music',
    staticFallback: OWN_MUSIC_TRACKS,
  },

  // ── 4. MAIN TAB: "Ringtones" ──────────────────────────────────────────
  ringtone_hindi: {
    primary: 'ringtone_hindi',
    fallbacks: ['hindi_ringtone', 'ringtone'],
    category: 'ringtone',
    staticFallback: HINDI_RINGTONES,
  },
  ringtone_malayalam: {
    primary: 'ringtone_malayalam',
    fallbacks: ['ringtone', 'malayalam_ringtone'],
    category: 'ringtone',
    staticFallback: MALAYALAM_RINGTONES,
  },
};

/**
 * Converts raw publicId or filename into clean, readable title case string
 */
export function formatCloudinaryTitle(raw: string): string {
  if (!raw) return '';
  let name = raw.split('/').pop() || raw;
  name = name.replace(/\.(mp3|wav|m4a|aac|ogg|mpeg|flac)$/i, '');
  // Remove leading numbers with separators e.g. '04-', '01_-_', '01_ ', '02. '
  name = name.replace(/^[\d\s._-]+/i, '');
  // Replace dashes and underscores with spaces
  name = name.replace(/[_-]+/g, ' ');
  // Collapse duplicate whitespace
  name = name.replace(/\s+/g, ' ').trim();
  // Capitalize each word properly
  return name
    .split(' ')
    .map((w) => {
      if (!w) return '';
      const upper = w.toUpperCase();
      if (upper === 'BK' || upper === 'B.K') return 'BK';
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
 * Maps raw Cloudinary resources into structured MediaTrack array
 */
export function mapCloudinaryResourcesToTracks(
  resources: CloudinaryRawResource[],
  subTab: SubTabKey
): MediaTrack[] {
  if (!Array.isArray(resources)) return [];
  const cfg = CLOUDINARY_SUBTAB_CONFIG[subTab];
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
      speaker: cfg.defaultSpeaker,
      duration: r.duration,
    };
  });
}

/**
 * Synchronous cached tracks getter for 0ms instant initial rendering
 */
export function getInitialSubTabTracks(subTab: SubTabKey): MediaTrack[] {
  const storageKey = `cld_subtab_${subTab}_v3`;
  const cached = getJSON<MediaTrack[] | null>(storageKey, null);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }
  const cfg = CLOUDINARY_SUBTAB_CONFIG[subTab];
  return cfg ? cfg.staticFallback : [];
}

/**
 * Fetches dynamic Cloudinary JSON list for a sub-tab using primary tag with fallbacks
 */
export async function fetchSubTabTracks(
  subTab: SubTabKey,
  forceRefresh = false
): Promise<MediaTrack[]> {
  const cfg = CLOUDINARY_SUBTAB_CONFIG[subTab];
  if (!cfg) return [];

  const storageKey = `cld_subtab_${subTab}_v3`;

  // Return cache immediately if available and not force-refreshing
  if (!forceRefresh) {
    const cached = getJSON<MediaTrack[] | null>(storageKey, null);
    if (Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  const tagsToTry = [cfg.primary, ...cfg.fallbacks];

  for (const tag of tagsToTry) {
    try {
      const endpoint = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/list/${encodeURIComponent(tag)}.json`;
      const res = await fetch(endpoint, { cache: forceRefresh ? 'no-cache' : 'default' });
      if (res.ok) {
        const data: CloudinaryListResponse = await res.json();
        if (Array.isArray(data.resources) && data.resources.length > 0) {
          const tracks = mapCloudinaryResourcesToTracks(data.resources, subTab);

          // For 'others' commentary or 'ringtone_malayalam', merge static curated items if needed
          let finalTracks = tracks;
          if (subTab === 'others' && OTHERS_COMMENTARIES.length > 0) {
            const existingUrls = new Set(tracks.map((t) => t.url));
            const extra = OTHERS_COMMENTARIES.filter((o) => !existingUrls.has(o.url));
            finalTracks = [...tracks, ...extra];
          } else if (subTab === 'ringtone_malayalam' && MALAYALAM_RINGTONES.length > 0) {
            const existingUrls = new Set(tracks.map((t) => t.url));
            const extra = MALAYALAM_RINGTONES.filter((m) => !existingUrls.has(m.url));
            finalTracks = [...tracks, ...extra];
          }

          setJSON(storageKey, finalTracks);
          return finalTracks;
        }
      }
    } catch (err) {
      console.warn(`[AudioService] Error trying tag "${tag}" for ${subTab}:`, err);
    }
  }

  // Fallback to static initial dataset if Cloudinary tags returned empty or errored
  const fallback = cfg.staticFallback;
  if (fallback && fallback.length > 0) {
    return fallback;
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
  malayalam: 'cld_subtab_malayalam_v3',
  hindi: 'cld_subtab_hindi_v3',
  music: 'cld_subtab_meditation_music_v3',
} as const;

export function getCachedCloudinaryCategory(category: AudioCategoryTab): MediaTrack[] {
  switch (category) {
    case 'malayalam':
      return getInitialSubTabTracks('malayalam');
    case 'hindi':
      return getInitialSubTabTracks('hindi');
    case 'music':
      return getInitialSubTabTracks('meditation_music');
    case 'commentary':
      return MASTER_COMMENTARY_TRACKS;
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
