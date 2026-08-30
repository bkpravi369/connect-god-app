import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { extractDriveFileId } from '@/lib/constants';
import { getJSON, setJSON } from '@/lib/storage';
import {
  MediaTrack,
  MASTER_COMMENTARY_TRACKS,
  SONGS_DATA,
  MUSIC_DATA,
} from '@/constants/mediaTracks';

export const CLOUDINARY_CLOUD_NAME = 'tb5bmwd5';

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

export const CLOUDINARY_TAG_ENDPOINTS = {
  malayalam: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/list/${encodeURIComponent('malayalam songs')}.json`,
  hindi: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/list/${encodeURIComponent('hindi songs')}.json`,
  music: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/list/music.json`,
  musicAlt: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/list/Musics.json`,
} as const;

export const AUDIO_STORAGE_KEYS = {
  malayalam: 'cloudinary_audio_malayalam_songs_v2',
  hindi: 'cloudinary_audio_hindi_songs_v2',
  music: 'cloudinary_audio_music_v2',
} as const;

/**
 * Converts raw publicId or filename into clean, readable title case string
 * Example: `baba_milan_song` -> `Baba Milan Song`
 * Example: `04-Maanava-hridaya` -> `Maanava Hridaya`
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
 * Example: https://res.cloudinary.com/tb5bmwd5/video/upload/v1787367169/04-Maanava-hridaya.mp3
 */
export function buildCloudinaryAssetUrl(item: { version: number | string; public_id: string; format: string }): string {
  const encPublicId = item.public_id.split('/').map(encodeURIComponent).join('/');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/v${item.version}/${encPublicId}.${item.format || 'mp3'}`;
}

/**
 * Constructs direct download audio URL with fl_attachment for instant file download
 */
export function buildCloudinaryAssetDownloadUrl(item: { version: number | string; public_id: string; format: string }): string {
  const encPublicId = item.public_id.split('/').map(encodeURIComponent).join('/');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/fl_attachment/v${item.version}/${encPublicId}.${item.format || 'mp3'}`;
}

/**
 * Maps raw Cloudinary resources into structured MediaTrack array
 */
function mapResourcesToTracks(
  resources: CloudinaryRawResource[],
  category: AudioCategoryTab
): MediaTrack[] {
  if (!Array.isArray(resources)) return [];
  return resources.map((r, idx) => {
    const formattedTitle = formatCloudinaryTitle(r.public_id);
    const url = buildCloudinaryAssetUrl(r);
    const subCategory = category === 'malayalam' || category === 'hindi' ? category : undefined;
    const cat: 'song' | 'music' | 'commentary' = category === 'music' ? 'music' : 'song';

    return {
      id: `cld_${category}_${r.asset_id || r.public_id || idx}`,
      title: formattedTitle || r.public_id,
      url,
      category: cat,
      subCategory,
    };
  });
}

/**
 * Synchronous cached tracks getter for instant zero-delay rendering
 */
export function getCachedCloudinaryCategory(category: AudioCategoryTab): MediaTrack[] {
  if (category === 'commentary') {
    return MASTER_COMMENTARY_TRACKS;
  }
  const storageKey = AUDIO_STORAGE_KEYS[category as keyof typeof AUDIO_STORAGE_KEYS];
  if (!storageKey) return [];
  const cached = getJSON<MediaTrack[] | null>(storageKey, null);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }
  if (category === 'music') return MUSIC_DATA;
  return SONGS_DATA.filter((s) => s.subCategory === category);
}

/**
 * Fetches dynamic JSON for specified category tab from Cloudinary and caches locally
 */
export async function fetchCloudinaryAudioCategory(
  category: AudioCategoryTab,
  forceRefresh = false
): Promise<MediaTrack[]> {
  if (category === 'commentary') {
    return MASTER_COMMENTARY_TRACKS;
  }

  const storageKey = AUDIO_STORAGE_KEYS[category as keyof typeof AUDIO_STORAGE_KEYS];
  if (!forceRefresh) {
    const cached = getJSON<MediaTrack[] | null>(storageKey, null);
    if (Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  try {
    let endpoint = CLOUDINARY_TAG_ENDPOINTS[category as keyof typeof CLOUDINARY_TAG_ENDPOINTS];
    let res = await fetch(endpoint);

    // Fallback for music tag if primary returned 404
    if (!res.ok && category === 'music') {
      res = await fetch(CLOUDINARY_TAG_ENDPOINTS.musicAlt);
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch Cloudinary tag list for ${category}: ${res.status}`);
    }

    const data: CloudinaryListResponse = await res.json();
    if (Array.isArray(data.resources) && data.resources.length > 0) {
      const tracks = mapResourcesToTracks(data.resources, category);
      setJSON(storageKey, tracks);
      return tracks;
    }
  } catch (err) {
    console.warn(`[AudioService] Cloudinary fetch error for ${category}:`, err);
  }

  return getCachedCloudinaryCategory(category);
}

/**
 * Fetches all 3 categories (Malayalam Songs, Hindi Songs, Meditation Music) in parallel
 */
export async function fetchAllCloudinaryAudioTabs(
  forceRefresh = false
): Promise<{
  malayalam: MediaTrack[];
  hindi: MediaTrack[];
  music: MediaTrack[];
  commentary: MediaTrack[];
}> {
  const [malayalam, hindi, music] = await Promise.all([
    fetchCloudinaryAudioCategory('malayalam', forceRefresh),
    fetchCloudinaryAudioCategory('hindi', forceRefresh),
    fetchCloudinaryAudioCategory('music', forceRefresh),
  ]);

  return {
    malayalam,
    hindi,
    music,
    commentary: MASTER_COMMENTARY_TRACKS,
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
