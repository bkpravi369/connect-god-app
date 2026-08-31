import { AutomationConfig, DEFAULT_AUTOMATION_CONFIG, Varadan, STORAGE_KEYS } from '@/lib/constants';
import { getJSON, setJSON, getDateStampedJSON, setDateStampedJSON } from '@/lib/storage';
import { getTodayISTDateString } from '@/services/murliService';
import { syncAllYouTubeMedia, YouTubeVideo } from '@/lib/youtube';

export type AutoVideo = {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
  publishedAt: string;
  isLive: boolean;
  badge?: string;
  badgeColor?: string;
};

export type AutoContentResult = {
  murliVideo: AutoVideo | null;
  podcastVideo: AutoVideo | null;
  liveVideo: AutoVideo | null;
  sheebaVideo?: AutoVideo | null;
  sheejaVideo?: AutoVideo | null;
  varadan: Varadan | null;
  fullMurliText: string | null;
  config: AutomationConfig | null;
};

const EDGE_FUNCTION = '/functions/v1/auto-content';
const AUTO_CACHE_KEY = 'connectgod_auto_content_cache';

export function getCachedAutoContent(): AutoContentResult | null {
  const today = getTodayISTDateString();
  return getDateStampedJSON<AutoContentResult | null>(AUTO_CACHE_KEY, today, null);
}

export async function fetchAutomationConfig(): Promise<AutomationConfig> {
  try {
    const data = getJSON<AutomationConfig | null>(STORAGE_KEYS.automation, null);
    if (!data) return DEFAULT_AUTOMATION_CONFIG;
    return data;
  } catch {
    return DEFAULT_AUTOMATION_CONFIG;
  }
}

export async function saveAutomationConfig(cfg: AutomationConfig): Promise<boolean> {
  try {
    setJSON(STORAGE_KEYS.automation, cfg);
    return true;
  } catch {
    return false;
  }
}

export async function triggerAutoContentFetch(): Promise<{ success: boolean; errors?: string[] }> {
  return { success: true };
}

function mapYtToAutoVideo(yt: YouTubeVideo | null, defaultBadge: string, defaultColor: string): AutoVideo | null {
  if (!yt) return null;
  return {
    videoId: yt.videoId,
    title: yt.title,
    url: yt.url,
    thumbnail: yt.thumbnail,
    publishedAt: yt.publishedAt,
    isLive: !!yt.isLive,
    badge: yt.badge || defaultBadge,
    badgeColor: yt.badgeColor || defaultColor,
  };
}

export async function fetchAutoContent(bypassCache = false): Promise<AutoContentResult> {
  const localCached = getCachedAutoContent();

  try {
    const [configResult, ytResult] = await Promise.all([
      fetchAutomationConfig().catch(() => DEFAULT_AUTOMATION_CONFIG),
      syncAllYouTubeMedia(bypassCache).catch(() => ({
        liveVideo: null,
        podcastVideo: null,
        sheebaVideo: null,
        sheejaVideo: null,
      })),
    ]);

    const varadan = localCached?.varadan || null;

    const ytLive = mapYtToAutoVideo(ytResult.liveVideo, 'LIVE', '#dc2626');
    const ytPodcast = mapYtToAutoVideo(ytResult.podcastVideo, 'PODCAST', '#d97706');
    const ytSheeba = mapYtToAutoVideo(ytResult.sheebaVideo, 'CLASSES', '#c13584');
    const ytSheeja = mapYtToAutoVideo(ytResult.sheejaVideo, 'MEDITATION', '#7c3aed');

    const result: AutoContentResult = {
      config: configResult,
      murliVideo: localCached?.murliVideo || null,
      podcastVideo: ytPodcast || localCached?.podcastVideo || null,
      liveVideo: ytLive || localCached?.liveVideo || null,
      sheebaVideo: ytSheeba || localCached?.sheebaVideo || null,
      sheejaVideo: ytSheeja || localCached?.sheejaVideo || null,
      varadan,
      fullMurliText: localCached?.fullMurliText || null,
    };

    // Cache to local storage for offline-first instant loading with date stamp
    setDateStampedJSON(AUTO_CACHE_KEY, getTodayISTDateString(), result);
    return result;
  } catch {
    return localCached || {
      config: DEFAULT_AUTOMATION_CONFIG,
      murliVideo: null,
      podcastVideo: null,
      liveVideo: null,
      sheebaVideo: null,
      sheejaVideo: null,
      varadan: null,
      fullMurliText: null,
    };
  }
}
