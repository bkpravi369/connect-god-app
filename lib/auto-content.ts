import { AutomationConfig, DEFAULT_AUTOMATION_CONFIG, Varadan, STORAGE_KEYS } from '@/lib/constants';
import { getJSON, setJSON, getDateStampedJSON, setDateStampedJSON } from '@/lib/storage';
import { getTodayISTDateString } from '@/services/murliService';
import { syncAllYouTubeMedia, YouTubeVideo, ChannelSyncKey } from '@/lib/youtube';

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

export async function fetchAutoContent(
  bypassCache = false,
  onProgressiveUpdate?: (partial: AutoContentResult) => void
): Promise<AutoContentResult> {
  const localCached = getCachedAutoContent();

  let progressiveResult: AutoContentResult = {
    config: DEFAULT_AUTOMATION_CONFIG,
    murliVideo: localCached?.murliVideo || null,
    podcastVideo: localCached?.podcastVideo || null,
    liveVideo: localCached?.liveVideo || null,
    sheebaVideo: localCached?.sheebaVideo || null,
    sheejaVideo: localCached?.sheejaVideo || null,
    varadan: localCached?.varadan || null,
    fullMurliText: localCached?.fullMurliText || null,
  };

  const handleChannelLoaded = (channelKey: ChannelSyncKey, video: YouTubeVideo) => {
    let badge = 'CLASS';
    let badgeColor = '#0284c7';
    if (channelKey === 'liveVideo') {
      badge = 'LIVE';
      badgeColor = '#dc2626';
    } else if (channelKey === 'podcastVideo') {
      badge = 'PODCAST';
      badgeColor = '#d97706';
    } else if (channelKey === 'sheebaVideo') {
      badge = 'CLASSES';
      badgeColor = '#c13584';
    } else if (channelKey === 'sheejaVideo') {
      badge = 'MEDITATION';
      badgeColor = '#7c3aed';
    }

    const autoVid = mapYtToAutoVideo(video, badge, badgeColor);
    if (autoVid) {
      progressiveResult = {
        ...progressiveResult,
        [channelKey]: autoVid,
      };
      if (onProgressiveUpdate) {
        try {
          onProgressiveUpdate({ ...progressiveResult });
        } catch (e) {
          console.error('[AutoContent] onProgressiveUpdate callback error:', e);
        }
      }
    }
  };

  try {
    const [configResult, ytResult] = await Promise.allSettled([
      fetchAutomationConfig().catch(() => DEFAULT_AUTOMATION_CONFIG),
      syncAllYouTubeMedia(bypassCache, handleChannelLoaded).catch(() => ({
        liveVideo: null,
        podcastVideo: null,
        sheebaVideo: null,
        sheejaVideo: null,
      })),
    ]);

    const resolvedConfig = configResult.status === 'fulfilled' ? configResult.value : DEFAULT_AUTOMATION_CONFIG;
    const resolvedYt = ytResult.status === 'fulfilled' ? ytResult.value : {
      liveVideo: null,
      podcastVideo: null,
      sheebaVideo: null,
      sheejaVideo: null,
    };

    const varadan = localCached?.varadan || null;

    const ytLive = mapYtToAutoVideo(resolvedYt.liveVideo, 'LIVE', '#dc2626');
    const ytPodcast = mapYtToAutoVideo(resolvedYt.podcastVideo, 'PODCAST', '#d97706');
    const ytSheeba = mapYtToAutoVideo(resolvedYt.sheebaVideo, 'CLASSES', '#c13584');
    const ytSheeja = mapYtToAutoVideo(resolvedYt.sheejaVideo, 'MEDITATION', '#7c3aed');

    const result: AutoContentResult = {
      config: resolvedConfig,
      murliVideo: localCached?.murliVideo || null,
      podcastVideo: ytPodcast || progressiveResult.podcastVideo || localCached?.podcastVideo || null,
      liveVideo: ytLive || progressiveResult.liveVideo || localCached?.liveVideo || null,
      sheebaVideo: ytSheeba || progressiveResult.sheebaVideo || localCached?.sheebaVideo || null,
      sheejaVideo: ytSheeja || progressiveResult.sheejaVideo || localCached?.sheejaVideo || null,
      varadan,
      fullMurliText: localCached?.fullMurliText || null,
    };

    // Cache to local storage for offline-first instant loading with date stamp
    setDateStampedJSON(AUTO_CACHE_KEY, getTodayISTDateString(), result);
    if (onProgressiveUpdate) {
      try {
        onProgressiveUpdate(result);
      } catch (e) {
        console.error('[AutoContent] onProgressiveUpdate final callback error:', e);
      }
    }
    return result;
  } catch (err) {
    console.error('[AutoContent] Fetch auto content error:', err);
    return localCached || progressiveResult;
  }
}

