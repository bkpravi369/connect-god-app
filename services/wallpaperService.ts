import { getJSON, setJSON } from '@/lib/storage';

export const WALLPAPERS_CLOUD_NAME = 'uo0dcjpe';
export const WALLPAPERS_ASSET_TAG = 'wall_paper';

// Alternative tags in case user uploaded with minor naming variations
export const WALLPAPERS_TAGS_TO_CHECK = ['wall_paper', 'wallpaper', 'wallpapers'];

export interface CloudinaryImageResource {
  public_id: string;
  version: number | string;
  format: string;
  width: number;
  height: number;
  bytes?: number;
  type?: string;
  created_at?: string;
  asset_id?: string;
}

export interface CloudinaryImageListResponse {
  resources: CloudinaryImageResource[];
  updated_at?: string;
}

export interface WallpaperItem {
  id: string;
  publicId: string;
  version: number | string;
  format: string;
  width: number;
  height: number;
  title: string;
  thumbnailUrl: string;
  fullUrl: string;
  downloadUrl: string;
  createdAt?: string;
}

const STORAGE_KEY = '@connectgod_wallpapers_cache_v1';

/**
 * Format public_id into a clean, spiritual wallpaper title
 */
export function formatWallpaperTitle(raw: string): string {
  if (!raw) return 'Spiritual Wallpaper';
  let name = raw.split('/').pop() || raw;
  name = name.replace(/\.(jpe?g|png|webp|gif|avif)$/i, '');
  name = name.replace(/_1080p$|_4k$|_hd$/i, '');
  // Strip leading index prefixes (e.g. 01_baba -> baba)
  name = name.replace(/^0*(\d{1,2})[._\-\s]+(?=[A-Za-z])/i, '');
  // Replace dashes and underscores with spaces
  name = name.replace(/[_-]+/g, ' ').trim();

  if (!name) return 'Spiritual Wallpaper';

  return name
    .split(' ')
    .map((w) => {
      if (!w) return '';
      const upper = w.toUpperCase();
      if (upper === 'BK' || upper === 'B.K') return 'BK';
      if (upper === 'OM' || upper === 'SHANTI') return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Builds optimized display URL with Cloudinary transformations
 */
export function buildWallpaperUrl(
  publicId: string,
  version?: number | string,
  format = 'jpg',
  transformation = 'q_auto,f_auto'
): string {
  const encPublicId = publicId.split('/').map(encodeURIComponent).join('/');
  const vPart = version ? `v${version}/` : '';
  const tPart = transformation ? `${transformation}/` : '';
  return `https://res.cloudinary.com/${WALLPAPERS_CLOUD_NAME}/image/upload/${tPart}${vPart}${encPublicId}.${format || 'jpg'}`;
}

/**
 * Builds direct download attachment URL
 */
export function buildWallpaperDownloadUrl(
  publicId: string,
  version?: number | string,
  format = 'jpg'
): string {
  const encPublicId = publicId.split('/').map(encodeURIComponent).join('/');
  const vPart = version ? `v${version}/` : '';
  return `https://res.cloudinary.com/${WALLPAPERS_CLOUD_NAME}/image/upload/fl_attachment/${vPart}${encPublicId}.${format || 'jpg'}`;
}

/**
 * Maps raw Cloudinary image resource to WallpaperItem
 */
export function mapResourceToWallpaperItem(
  res: CloudinaryImageResource,
  idx: number
): WallpaperItem {
  const publicId = res.public_id || `wallpaper_${idx}`;
  const version = res.version || '';
  const format = res.format || 'jpg';
  const width = res.width || 1080;
  const height = res.height || 1920;
  const title = formatWallpaperTitle(publicId);

  // Thumbnail: fast delivery, auto format and quality, width constrained to 600px
  const thumbnailUrl = buildWallpaperUrl(publicId, version, format, 'c_fill,w_600,q_auto,f_auto');
  // Full: high quality for full-screen preview
  const fullUrl = buildWallpaperUrl(publicId, version, format, 'q_auto:best,f_auto');
  // Download: fl_attachment for saving to device
  const downloadUrl = buildWallpaperDownloadUrl(publicId, version, format);

  return {
    id: `cld_wp_${res.asset_id || publicId}_${idx}`,
    publicId,
    version,
    format,
    width,
    height,
    title,
    thumbnailUrl,
    fullUrl,
    downloadUrl,
    createdAt: res.created_at,
  };
}

/**
 * Get synchronously cached wallpapers for 0ms initial render
 */
export function getCachedWallpapers(): WallpaperItem[] {
  const cached = getJSON<WallpaperItem[] | null>(STORAGE_KEY, null);
  if (Array.isArray(cached)) {
    return cached;
  }
  return [];
}

/**
 * Fetches image assets tagged with 'wall_paper' from Cloudinary account 'uo0dcjpe'
 * Uses dynamic fetching without stale caching.
 * Fallbacks safely to cached items without crashing on 401/404/network errors.
 */
export async function fetchWallpapers(forceRefresh = true): Promise<{
  wallpapers: WallpaperItem[];
  isRestricted?: boolean;
  error?: string;
}> {
  const cached = getCachedWallpapers();

  if (!forceRefresh && cached.length > 0) {
    return { wallpapers: cached };
  }

  let isRestricted = false;

  for (const tag of WALLPAPERS_TAGS_TO_CHECK) {
    try {
      const timestamp = Date.now();
      const endpoint = `https://res.cloudinary.com/${WALLPAPERS_CLOUD_NAME}/image/list/${encodeURIComponent(tag)}.json?_cb=${timestamp}`;

      const res = await fetch(endpoint, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.status === 401) {
        // Cloudinary account has client-side resource listing restricted in Settings > Security
        isRestricted = true;
        console.warn(`[WallpaperService] Cloudinary listing restricted (401) for tag "${tag}" on account "${WALLPAPERS_CLOUD_NAME}".`);
        continue;
      }

      if (res.ok) {
        const data: CloudinaryImageListResponse = await res.json();
        if (Array.isArray(data.resources) && data.resources.length > 0) {
          const items = data.resources.map((r, idx) => mapResourceToWallpaperItem(r, idx));
          setJSON(STORAGE_KEY, items);
          return { wallpapers: items };
        }
      }
    } catch (err) {
      console.warn(`[WallpaperService] Error querying tag "${tag}" from Cloudinary:`, err);
    }
  }

  if (cached.length > 0) {
    return { wallpapers: cached, isRestricted };
  }

  return { wallpapers: [], isRestricted };
}
