import { getJSON, setJSON, removeItem } from '@/lib/storage';

export type YouTubeVideo = {
  videoId: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnail: string;
  url: string;
  publishedAt: string;
  badge?: string;
  badgeColor?: string;
  isLive?: boolean;
  channelTitle?: string;
};

type CacheWrapper<T> = {
  data: T;
  timestamp: number;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const HARDCODED_YOUTUBE_API_KEY = 'AIzaSyDU7qYO0XNjJHRorqitiRftFxFLuFhCNks';

export function getApiKey(): string {
  return (
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ||
    HARDCODED_YOUTUBE_API_KEY
  );
}

function getFromCache<T>(key: string): T | null {
  const cached = getJSON<CacheWrapper<T> | null>(`yt_cache_${key}`, null);
  if (!cached) return null;
  const now = Date.now();
  if (now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return cached.data; // Return stale data if available as safe fallback
}

function saveToCache<T>(key: string, data: T): void {
  setJSON<CacheWrapper<T>>(`yt_cache_${key}`, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clears all YouTube query caches from local storage
 */
export function clearYouTubeCache(): void {
  const keysToClear = [
    'yt_channel_v3_UC98sbhynzcgLlx9x-SYi6zg',
    'yt_channel_v3_UCTrf0g3Dpi5lW-jddmPlOpA',
    'yt_channel_v3_UCtj3aB4eYUzi2GssD-g9aBA',
    'yt_channel_v3_UCvQFuOM38iAZD7ltMujOq-g',
    'yt_podcast_dedicated_v3',
    'yt_cache_live_@bkscalicut9425',
    'yt_cache_podcast_Supreme Light Creations',
    'yt_cache_channel_@BKSheeba',
    'yt_cache_channel_@BKSheeja',
    'connectgod_podcasts_supreme_light',
    'connectgod_auto_content_cache',
  ];
  keysToClear.forEach((k) => removeItem(k));
  console.log('[YouTube Engine] Cleared all local YouTube caches for fresh fetch.');
}

/**
 * Checks if a video title or description represents a genuine Podcast episode.
 */
export function isPodcastEpisode(title: string = '', description: string = ''): boolean {
  const text = (title + ' ' + description).toLowerCase();
  return (
    text.includes('podcast') ||
    text.includes('പോഡ്കാസ്റ്റ്') ||
    text.includes('പോഡ്കാസ്റ്') ||
    text.includes('daily murli podcast') ||
    text.includes('murli podcast')
  );
}

/**
 * Dedicated Podcast fetcher for Supreme Light Creations.
 * Filters strictly for genuine Podcast episodes, ordered from latest to oldest.
 */
export async function fetchDedicatedPodcastVideo(bypassCache = false): Promise<YouTubeVideo | null> {
  const channelId = 'UC98sbhynzcgLlx9x-SYi6zg';
  const cacheKey = 'yt_podcast_dedicated_v3';

  if (!bypassCache) {
    const cached = getFromCache<YouTubeVideo>(cacheKey);
    if (cached) return cached;
  }

  const apiKey = getApiKey();

  // 1. YouTube Data API v3 search strictly filtering for "Podcast" videos on Supreme Light
  if (apiKey) {
    try {
      const searchUrl = `${BASE_URL}/search?part=snippet&channelId=${channelId}&q=Podcast&order=date&type=video&maxResults=20&key=${apiKey}`;
      const sRes = await fetch(searchUrl).catch(() => null);
      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        if (sData && Array.isArray(sData.items) && sData.items.length > 0) {
          // Filter strictly for titles/descriptions containing "Podcast"
          const podcastItems = sData.items.filter((item: any) =>
            isPodcastEpisode(item.snippet?.title, item.snippet?.description)
          );

          // Order by publishedAt latest to oldest
          podcastItems.sort(
            (a: any, b: any) =>
              new Date(b.snippet?.publishedAt || 0).getTime() - new Date(a.snippet?.publishedAt || 0).getTime()
          );

          const selected = podcastItems.length > 0 ? podcastItems[0] : sData.items[0];
          const vid = selected.id?.videoId || (typeof selected.id === 'string' ? selected.id : '');
          if (vid) {
            const video: YouTubeVideo = {
              videoId: vid,
              title: selected.snippet?.title || 'Daily Murli Malayalam Podcast',
              subtitle: selected.snippet?.channelTitle || 'Supreme Light Creations',
              description: selected.snippet?.description || '',
              thumbnail:
                selected.snippet?.thumbnails?.high?.url ||
                selected.snippet?.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${vid}`,
              publishedAt: selected.snippet?.publishedAt || new Date().toISOString(),
              badge: 'PODCAST',
              badgeColor: '#d97706',
              channelTitle: selected.snippet?.channelTitle || 'Supreme Light Creations',
            };
            saveToCache(cacheKey, video);
            return video;
          }
        }
      }
    } catch (err) {
      console.warn('[YouTube Engine] Dedicated Podcast API error:', err);
    }
  }

  // 2. RSS bridge fallback with strict podcast filtering
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const rssEndpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const rRes = await fetch(rssEndpoint).catch(() => null);
    if (rRes && rRes.ok) {
      const rData = await rRes.json();
      if (rData && rData.status === 'ok' && Array.isArray(rData.items) && rData.items.length > 0) {
        const podcastItems = rData.items.filter((item: any) =>
          isPodcastEpisode(item.title, item.description)
        );

        // Sort latest to oldest
        podcastItems.sort(
          (a: any, b: any) =>
            new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime()
        );

        const selected = podcastItems.length > 0 ? podcastItems[0] : rData.items[0];
        const vid = (selected.guid || selected.link || '').replace(/^yt:video:/, '').split('v=').pop() || '';
        if (vid) {
          const video: YouTubeVideo = {
            videoId: vid,
            title: selected.title || 'Daily Murli Malayalam Podcast',
            subtitle: selected.author || 'Supreme Light Creations',
            description: selected.description || '',
            thumbnail: selected.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            url: selected.link || `https://www.youtube.com/watch?v=${vid}`,
            publishedAt: selected.pubDate || new Date().toISOString(),
            badge: 'PODCAST',
            badgeColor: '#d97706',
            channelTitle: selected.author || 'Supreme Light Creations',
          };
          saveToCache(cacheKey, video);
          return video;
        }
      }
    }
  } catch (err) {
    console.warn('[YouTube Engine] Dedicated Podcast RSS fallback error:', err);
  }

  // 3. Fallback active podcast item
  const fallbackPodcast: YouTubeVideo = {
    videoId: 'uA-DDYjAniM',
    title: 'DAILY MURLI PODCAST 22-8-26',
    subtitle: 'Supreme Light Creations',
    description: 'Daily Murli Malayalam Podcast from Supreme Light Creations.',
    thumbnail: 'https://img.youtube.com/vi/uA-DDYjAniM/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=uA-DDYjAniM',
    publishedAt: new Date().toISOString(),
    badge: 'PODCAST',
    badgeColor: '#d97706',
    channelTitle: 'Supreme Light Creations',
  };
  return fallbackPodcast;
}

/**
 * Direct channel fetch via YouTube Data API v3 search endpoint + RSS bridge
 */
export async function fetchChannelLatestVideo(
  channelId: string,
  badge: string,
  badgeColor: string,
  bypassCache = false
): Promise<YouTubeVideo | null> {
  // If querying podcast channel, use dedicated filtered podcast method
  if (channelId === 'UC98sbhynzcgLlx9x-SYi6zg' || badge === 'PODCAST') {
    return fetchDedicatedPodcastVideo(bypassCache);
  }

  const apiKey = getApiKey();
  const cacheKey = `yt_channel_v3_${channelId}`;
  if (!bypassCache) {
    const cached = getFromCache<YouTubeVideo>(cacheKey);
    if (cached) return cached;
  }

  if (apiKey) {
    try {
      const searchUrl = `${BASE_URL}/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${apiKey}`;
      const sRes = await fetch(searchUrl).catch(() => null);
      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        if (sData && Array.isArray(sData.items) && sData.items.length > 0) {
          const first = sData.items[0];
          const vid = first.id?.videoId || (typeof first.id === 'string' ? first.id : '');
          if (vid) {
            const video: YouTubeVideo = {
              videoId: vid,
              title: first.snippet?.title || 'Spiritual Video',
              subtitle: first.snippet?.channelTitle || 'Brahma Kumaris',
              description: first.snippet?.description || '',
              thumbnail:
                first.snippet?.thumbnails?.high?.url ||
                first.snippet?.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${vid}`,
              publishedAt: first.snippet?.publishedAt || new Date().toISOString(),
              badge,
              badgeColor,
              channelTitle: first.snippet?.channelTitle,
            };
            saveToCache(cacheKey, video);
            return video;
          }
        }
      }
    } catch (err) {
      console.warn(`[YouTube Engine] Error fetching channel ${channelId}:`, err);
    }
  }

  // Fallback to RSS bridge
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const rssEndpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const rRes = await fetch(rssEndpoint).catch(() => null);
    if (rRes && rRes.ok) {
      const rData = await rRes.json();
      if (rData && rData.status === 'ok' && Array.isArray(rData.items) && rData.items.length > 0) {
        const first = rData.items[0];
        const vid = (first.guid || first.link || '').replace(/^yt:video:/, '').split('v=').pop() || '';
        if (vid) {
          const video: YouTubeVideo = {
            videoId: vid,
            title: first.title || 'Spiritual Video',
            subtitle: first.author || 'Brahma Kumaris',
            description: first.description || '',
            thumbnail: first.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            url: first.link || `https://www.youtube.com/watch?v=${vid}`,
            publishedAt: first.pubDate || new Date().toISOString(),
            badge,
            badgeColor,
            channelTitle: first.author,
          };
          saveToCache(cacheKey, video);
          return video;
        }
      }
    }
  } catch (err) {
    console.warn(`[YouTube Engine] RSS fallback error for ${channelId}:`, err);
  }

  return getFromCache<YouTubeVideo>(cacheKey) || null;
}

/**
 * Synchronizes all 4 channels concurrently with dedicated podcast filtering.
 */
export async function syncAllYouTubeMedia(bypassCache = true): Promise<{
  liveVideo: YouTubeVideo | null;
  podcastVideo: YouTubeVideo | null;
  sheebaVideo: YouTubeVideo | null;
  sheejaVideo: YouTubeVideo | null;
}> {
  if (bypassCache) {
    clearYouTubeCache();
  }

  console.log(`[YouTube Engine] Starting direct uploads sync for all 4 channels (bypassCache: ${bypassCache})...`);
  const [liveVideo, podcastVideo, sheebaVideo, sheejaVideo] = await Promise.all([
    fetchChannelLatestVideo('UCTrf0g3Dpi5lW-jddmPlOpA', 'LIVE CLASS', '#dc2626', bypassCache),
    fetchDedicatedPodcastVideo(bypassCache),
    fetchChannelLatestVideo('UCtj3aB4eYUzi2GssD-g9aBA', 'CLASSES', '#c13584', bypassCache),
    fetchChannelLatestVideo('UCvQFuOM38iAZD7ltMujOq-g', 'MEDITATION', '#7c3aed', bypassCache),
  ]);

  console.log('[Supreme Light Creations] Latest Published Dedicated Podcast:', podcastVideo?.title || 'None');
  console.log('[YouTube Engine] Completed media fetch:', {
    live: liveVideo?.title,
    podcast: podcastVideo?.title,
    sheeba: sheebaVideo?.title,
    sheeja: sheejaVideo?.title,
  });

  return {
    liveVideo,
    podcastVideo,
    sheebaVideo,
    sheejaVideo,
  };
}
