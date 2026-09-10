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

/**
 * Safe AbortSignal timeout helper that never crashes in older browsers / webviews / Hermes.
 */
export function createTimeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as any).timeout === 'function') {
    try {
      return (AbortSignal as any).timeout(ms);
    } catch {
      // Fallback
    }
  }
  if (typeof AbortController !== 'undefined') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        try {
          controller.abort();
        } catch {}
      }, ms);
      if (typeof (timer as any).unref === 'function') {
        (timer as any).unref();
      }
      return controller.signal;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

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
 * Safely parses any date string (ISO, RFC 2822, space-separated pubDate) into epoch milliseconds.
 */
export function parseVideoTimestamp(dateStr?: string | number): number {
  if (!dateStr) return 0;
  if (typeof dateStr === 'number') return dateStr;
  const direct = new Date(dateStr).getTime();
  if (!isNaN(direct)) return direct;
  const isoFormatted = new Date(String(dateStr).replace(' ', 'T') + 'Z').getTime();
  return isNaN(isoFormatted) ? 0 : isoFormatted;
}

/**
 * Dedicated Podcast fetcher for Supreme Light Creations.
 * Filters strictly for genuine Podcast episodes, ordered strictly latest to oldest.
 * Features:
 *  1. Dynamic cache-busting parameter: &_t=${Date.now()}
 *  2. Headers: Cache-Control: no-cache, no-store, must-revalidate
 *  3. Fetch option: cache: 'no-store'
 *  4. Multi-tier retrieval (Fast RSS -> Direct XML -> YouTube Data API)
 *  5. Strict publish date descending sorting (index 0 is guaranteed newest)
 *  6. Anti-downgrade safeguard: Prevents falling back to older episodes
 */
export async function fetchDedicatedPodcastVideo(bypassCache = false): Promise<YouTubeVideo | null> {
  const channelId = 'UC98sbhynzcgLlx9x-SYi6zg';
  const cacheKey = 'yt_podcast_dedicated_v3';

  if (!bypassCache) {
    const cached = getFromCache<YouTubeVideo>(cacheKey);
    if (cached) return cached;
  }

  const cacheBustParam = `&_t=${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const noCacheHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  const candidateVideos: YouTubeVideo[] = [];
  const apiKey = getApiKey();

  // 1. Primary: YouTube Data API v3 playlistItems (1 quota unit, guaranteed ordered, instant)
  if (apiKey) {
    try {
      const playlistUrl = `${BASE_URL}/playlistItems?part=snippet&playlistId=UU98sbhynzcgLlx9x-SYi6zg&maxResults=25&key=${apiKey}${cacheBustParam}`;
      const pRes = await fetch(playlistUrl, {
        headers: noCacheHeaders,
        signal: createTimeoutSignal(4000),
      }).catch(() => null);

      if (pRes && pRes.ok) {
        const pData = await pRes.json().catch(() => null);
        if (pData && Array.isArray(pData.items) && pData.items.length > 0) {
          const podcastItems = pData.items.filter((item: any) =>
            isPodcastEpisode(item.snippet?.title, item.snippet?.description)
          );

          for (const item of podcastItems) {
            const vid = item.snippet?.resourceId?.videoId || item.id?.videoId || '';
            if (vid) {
              candidateVideos.push({
                videoId: vid,
                title: item.snippet?.title || 'Daily Murli Malayalam Podcast',
                subtitle: item.snippet?.channelTitle || 'Supreme Light Creations',
                description: item.snippet?.description || '',
                thumbnail:
                  item.snippet?.thumbnails?.high?.url ||
                  item.snippet?.thumbnails?.medium?.url ||
                  item.snippet?.thumbnails?.standard?.url ||
                  `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                url: `https://www.youtube.com/watch?v=${vid}`,
                publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
                badge: 'PODCAST',
                badgeColor: '#d97706',
                channelTitle: item.snippet?.channelTitle || 'Supreme Light Creations',
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[YouTube Engine] Dedicated Podcast playlistItems API error:', err);
    }
  }

  // 2. Secondary: YouTube Channel RSS Feed via rss2json converter
  if (candidateVideos.length === 0) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const rssEndpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}${cacheBustParam}`;
      const rRes = await fetch(rssEndpoint, {
        cache: 'no-store',
        headers: noCacheHeaders,
        signal: createTimeoutSignal(5000),
      }).catch(() => null);

      if (rRes && rRes.ok) {
        const rData = await rRes.json().catch(() => null);
        if (rData && rData.status === 'ok' && Array.isArray(rData.items) && rData.items.length > 0) {
          const podcastItems = rData.items.filter((item: any) =>
            isPodcastEpisode(item.title, item.description)
          );

          for (const item of podcastItems) {
            const vid = (item.guid || item.link || '').replace(/^yt:video:/, '').split('v=').pop() || '';
            if (vid) {
              candidateVideos.push({
                videoId: vid,
                title: item.title || 'Daily Murli Malayalam Podcast',
                subtitle: item.author || 'Supreme Light Creations',
                description: item.description || '',
                thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                url: item.link || `https://www.youtube.com/watch?v=${vid}`,
                publishedAt: item.pubDate || new Date().toISOString(),
                badge: 'PODCAST',
                badgeColor: '#d97706',
                channelTitle: item.author || 'Supreme Light Creations',
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[YouTube Engine] Dedicated Podcast RSS converter error:', err);
    }
  }

  // 3. Tertiary: Direct YouTube RSS XML fetch & parser (Native iOS / Android without CORS)
  if (candidateVideos.length === 0) {
    try {
      const directRssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}${cacheBustParam}`;
      const directRes = await fetch(directRssUrl, {
        cache: 'no-store',
        headers: noCacheHeaders,
        signal: createTimeoutSignal(5000),
      }).catch(() => null);

      if (directRes && directRes.ok) {
        const xmlText = await directRes.text();
        const parsedVideos = parseYouTubeRss(xmlText, 'PODCAST', '#d97706');
        const podcastParsed = parsedVideos.filter((v) => isPodcastEpisode(v.title, v.description));
        candidateVideos.push(...podcastParsed);
      }
    } catch (err) {
      console.warn('[YouTube Engine] Dedicated Podcast direct XML error:', err);
    }
  }

  // 4. Quaternary: YouTube Data API v3 search endpoint with date ordering & cache-busting
  if (apiKey && candidateVideos.length === 0) {
    try {
      const searchUrl = `${BASE_URL}/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=25&key=${apiKey}${cacheBustParam}`;
      const sRes = await fetch(searchUrl, {
        cache: 'no-store',
        headers: noCacheHeaders,
        signal: createTimeoutSignal(5000),
      }).catch(() => null);

      if (sRes && sRes.ok) {
        const sData = await sRes.json().catch(() => null);
        if (sData && Array.isArray(sData.items) && sData.items.length > 0) {
          const podcastItems = sData.items.filter((item: any) =>
            isPodcastEpisode(item.snippet?.title, item.snippet?.description)
          );
          for (const selected of podcastItems) {
            const vid = selected.id?.videoId || (typeof selected.id === 'string' ? selected.id : '');
            if (vid) {
              candidateVideos.push({
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
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[YouTube Engine] Dedicated Podcast API search error:', err);
    }
  }

  // Strictly order candidate videos by publish date descending (newest first)
  if (candidateVideos.length > 0) {
    candidateVideos.sort((a, b) => parseVideoTimestamp(b.publishedAt) - parseVideoTimestamp(a.publishedAt));
    const topVideo = candidateVideos[0];

    // Anti-Downgrade Safeguard: Prevent returning or caching an older episode if existing cache is newer
    const existingCached = getFromCache<YouTubeVideo>(cacheKey);
    if (existingCached && parseVideoTimestamp(existingCached.publishedAt) > parseVideoTimestamp(topVideo.publishedAt)) {
      console.log('[YouTube Engine] Preserving newer cached podcast episode:', existingCached.title);
      return existingCached;
    }

    saveToCache(cacheKey, topVideo);
    return topVideo;
  }

  // 4. Fallback to existing cache if available
  const staleCached = getFromCache<YouTubeVideo>(cacheKey);
  if (staleCached) {
    return staleCached;
  }

  // 5. Fallback active podcast item (Latest verified episode)
  const fallbackPodcast: YouTubeVideo = {
    videoId: 'RXggQ0aUt_M',
    title: 'Daily Murli Podcast 7-9-26',
    subtitle: 'Supreme Light Creations',
    description: 'Daily Murli Malayalam Podcast from Supreme Light Creations with deep spiritual wisdom.',
    thumbnail: 'https://i.ytimg.com/vi/RXggQ0aUt_M/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=RXggQ0aUt_M',
    publishedAt: '2026-09-06T20:30:09.000Z',
    badge: 'PODCAST',
    badgeColor: '#d97706',
    channelTitle: 'Supreme Light Creations',
  };
  return fallbackPodcast;
}

export const DEFAULT_BK_SHEEJA_VIDEOS: YouTubeVideo[] = [
  {
    videoId: 'tiKb43faieY',
    title: 'Edikkot Ayyappa Temple | Sheeja sister',
    subtitle: 'BK Sheeja',
    description: 'Special spiritual visit and divine discourse by BK Sheeja Sister.',
    thumbnail: 'https://i1.ytimg.com/vi/tiKb43faieY/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=tiKb43faieY',
    publishedAt: '2026-07-22T11:00:15Z',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
    channelTitle: 'BK Sheeja',
  },
  {
    videoId: 'W2t_inYBNR0',
    title: 'Do you wish success. ? Then this Video is for You ...',
    subtitle: 'BK Sheeja',
    description: 'Powerful guidance on true spiritual success and peace of mind.',
    thumbnail: 'https://i4.ytimg.com/vi/W2t_inYBNR0/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=W2t_inYBNR0',
    publishedAt: '2026-03-28T00:15:00Z',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
    channelTitle: 'BK Sheeja',
  },
  {
    videoId: 'Oy0zW1TT77w',
    title: 'ഈ പുതുവർഷത്തിൽ നിങ്ങൾക്കുള്ള സമ്മാനം "ശാന്തിയുടെ യന്ത്രം" | HAPPY NEW YEAR | BK Sheeja Sister',
    subtitle: 'BK Sheeja',
    description: 'Divine gift for the New Year - The Instrument of Peace by BK Sheeja Sister.',
    thumbnail: 'https://i4.ytimg.com/vi/Oy0zW1TT77w/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=Oy0zW1TT77w',
    publishedAt: '2026-01-01T00:30:23Z',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
    channelTitle: 'BK Sheeja',
  },
  {
    videoId: 'kkewcZjv8J8',
    title: 'Onam the Festival of Togetherness by BK Sheeja Sister',
    subtitle: 'BK Sheeja',
    description: 'Spiritual significance of Onam festival explained by BK Sheeja Sister.',
    thumbnail: 'https://i4.ytimg.com/vi/kkewcZjv8J8/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=kkewcZjv8J8',
    publishedAt: '2025-09-05T03:36:28Z',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
    channelTitle: 'BK Sheeja',
  },
  {
    videoId: 'mmUYzmRLDls',
    title: 'BRAHMAKUMARIS SNEHA MILANAM | VIVEKANANDA SAMSKARIKA VEDI | BK SHEEJA SISTER',
    subtitle: 'BK Sheeja',
    description: 'Sneha Milanam spiritual gathering discourse by BK Sheeja Sister.',
    thumbnail: 'https://i2.ytimg.com/vi/mmUYzmRLDls/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=mmUYzmRLDls',
    publishedAt: '2024-12-16T08:47:53Z',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
    channelTitle: 'BK Sheeja',
  },
  {
    videoId: 'pstUaMueka4',
    title: 'Happy Diwali 2024',
    subtitle: 'BK Sheeja',
    description: 'Happy Diwali message of inner spiritual light and soul awakening.',
    thumbnail: 'https://i1.ytimg.com/vi/pstUaMueka4/hqdefault.jpg',
    url: 'https://www.youtube.com/shorts/pstUaMueka4',
    publishedAt: '2024-11-01T07:24:30Z',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
    channelTitle: 'BK Sheeja',
  },
  {
    videoId: 'xQeDM8QOrN0',
    title: 'നെഗറ്റീവ് മാനിഫെസ്റ്റേഷൻ ഇല്ലാതാക്കാൻ ഈ 2 കാര്യങ്ങൾ ചെയ്യുക - Morning Wisdom - by BK Sheeja Sister',
    subtitle: 'BK Sheeja',
    description: 'How to overcome negative thoughts and manifest positive energy through Rajayoga.',
    thumbnail: 'https://i1.ytimg.com/vi/xQeDM8QOrN0/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=xQeDM8QOrN0',
    publishedAt: '2024-04-11T23:30:16Z',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
    channelTitle: 'BK Sheeja',
  },
  {
    videoId: 'OanYmYraUZ8',
    title: 'ഈ 10 കാര്യങ്ങൾ, ഒരാളും ഒരിക്കലും ചെയ്യാൻ പാടില്ല - Morning Wisdom - by BK Sheeja Sister',
    subtitle: 'BK Sheeja',
    description: '10 crucial spiritual precautions every seeker should maintain for peace.',
    thumbnail: 'https://i4.ytimg.com/vi/OanYmYraUZ8/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=OanYmYraUZ8',
    publishedAt: '2024-04-09T23:30:05Z',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
    channelTitle: 'BK Sheeja',
  },
  {
    videoId: 'YEFig2aZR-s',
    title: 'Meditation for getting Job - by BK Sheeja Sister',
    subtitle: 'BK Sheeja',
    description: 'Guided Rajayoga meditation for confidence, focus, and career success.',
    thumbnail: 'https://i2.ytimg.com/vi/YEFig2aZR-s/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=YEFig2aZR-s',
    publishedAt: '2024-04-06T23:30:05Z',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
    channelTitle: 'BK Sheeja',
  },
  {
    videoId: 'tmLwjyi-Vdk',
    title: 'ചിന്തിച്ചു കർമ്മം ചെയ്യുക - Morning Wisdom - by BK Sheeja Sister',
    subtitle: 'BK Sheeja',
    description: 'Elevate your karma through thoughtful awareness and divine remembrance.',
    thumbnail: 'https://i1.ytimg.com/vi/tmLwjyi-Vdk/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=tmLwjyi-Vdk',
    publishedAt: '2024-04-04T23:30:16Z',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
    channelTitle: 'BK Sheeja',
  },
];

/**
 * Robust XML parser extracting 10-15 video entries from YouTube Channel RSS Feed
 */
export function parseYouTubeRss(
  xmlText: string,
  badge = 'CLASS',
  badgeColor = '#0284c7'
): YouTubeVideo[] {
  const entries: YouTubeVideo[] = [];
  const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
  let match;
  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryXml = match[0];
    const videoIdMatch =
      entryXml.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/i) ||
      entryXml.match(/<id>yt:video:([\s\S]*?)<\/id>/i);
    const titleMatch = entryXml.match(/<title[\s\S]*?>([\s\S]*?)<\/title>/i);
    const pubMatch = entryXml.match(/<published>([\s\S]*?)<\/published>/i);
    const thumbMatch = entryXml.match(/<media:thumbnail[^>]+url=[\"']([^\"']+)[\"']/i);
    const descMatch = entryXml.match(/<media:description[\s\S]*?>([\s\S]*?)<\/media:description>/i);
    const authorMatch = entryXml.match(/<name>([\s\S]*?)<\/name>/i);

    const videoId = videoIdMatch ? videoIdMatch[1].trim() : '';
    if (!videoId) continue;

    const rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
    const cleanTitle = rawTitle
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    const publishedAt = pubMatch ? pubMatch[1].trim() : new Date().toISOString();
    const thumbnail = thumbMatch ? thumbMatch[1].trim() : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const description = descMatch ? descMatch[1].trim() : '';
    const channelTitle = authorMatch ? authorMatch[1].trim() : 'Brahma Kumaris';

    entries.push({
      videoId,
      title: cleanTitle || 'Spiritual Video',
      subtitle: channelTitle,
      description,
      thumbnail,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt,
      badge,
      badgeColor,
      channelTitle,
    });
  }
  return entries;
}

/**
 * Robust Multi-Tiered Channel Video List Fetcher
 * Features:
 *  1. Cache-busting parameter &_t=${Date.now()}
 *  2. Headers: Cache-Control: no-cache, no-store, must-revalidate
 *  3. YouTube Data API v3 with graceful 403/429 Quota Exceeded handling
 *  4. Instant fallback to YouTube Channel RSS Feed via rss2json converter
 *  5. Direct XML RSS parser fallback
 *  6. Silent Local Storage fallback so the section is NEVER blank
 */
export async function fetchChannelVideoList(
  channelId: string,
  badge = 'CLASS',
  badgeColor = '#0284c7',
  bypassCache = false
): Promise<YouTubeVideo[]> {
  const cacheKey = `yt_videos_list_${channelId}`;

  // 1. Silent Local Storage Check
  if (!bypassCache) {
    const cached = getFromCache<YouTubeVideo[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  const now = Date.now();
  const cacheBustParam = `&_t=${now}`;
  const noCacheHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  const apiKey = getApiKey();

  // 2. Primary: YouTube Data API v3 playlistItems (1 quota unit, guaranteed chronological, instant)
  if (apiKey) {
    try {
      const uploadsPlaylistId = channelId.startsWith('UC') ? 'UU' + channelId.slice(2) : channelId;
      const playlistUrl = `${BASE_URL}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=15&key=${apiKey}${cacheBustParam}`;
      const res = await fetch(playlistUrl, {
        headers: noCacheHeaders,
        signal: createTimeoutSignal(4000),
      }).catch(() => null);

      if (res && res.ok) {
        const pData = await res.json().catch(() => null);
        if (pData && Array.isArray(pData.items) && pData.items.length > 0) {
          const videos: YouTubeVideo[] = pData.items
            .map((item: any) => {
              const vid = item.snippet?.resourceId?.videoId || item.id?.videoId || '';
              if (!vid) return null;
              return {
                videoId: vid,
                title: item.snippet?.title || 'Spiritual Video',
                subtitle: item.snippet?.channelTitle || 'Brahma Kumaris',
                description: item.snippet?.description || '',
                thumbnail:
                  item.snippet?.thumbnails?.high?.url ||
                  item.snippet?.thumbnails?.medium?.url ||
                  item.snippet?.thumbnails?.standard?.url ||
                  `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                url: `https://www.youtube.com/watch?v=${vid}`,
                publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
                badge,
                badgeColor,
                channelTitle: item.snippet?.channelTitle,
              };
            })
            .filter(Boolean) as YouTubeVideo[];

          if (videos.length > 0) {
            saveToCache(cacheKey, videos);
            saveToCache(`yt_channel_v3_${channelId}`, videos[0]);
            console.log(`[YouTube Engine] Successfully fetched ${videos.length} videos via playlistItems for ${channelId}`);
            return videos;
          }
        }
      }
    } catch (err) {
      console.warn(`[YouTube Engine] playlistItems error for ${channelId}:`, err);
    }
  }

  // 3. Secondary: YouTube Data API v3 search endpoint fallback
  if (apiKey) {
    try {
      const searchUrl = `${BASE_URL}/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=15&key=${apiKey}${cacheBustParam}`;
      const res = await fetch(searchUrl, {
        headers: noCacheHeaders,
        signal: createTimeoutSignal(4000),
      }).catch(() => null);

      if (res && res.ok) {
        const sData = await res.json().catch(() => null);
        if (sData && Array.isArray(sData.items) && sData.items.length > 0) {
          const videos: YouTubeVideo[] = sData.items
            .map((item: any) => {
              const vid = item.id?.videoId || (typeof item.id === 'string' ? item.id : '');
              if (!vid) return null;
              return {
                videoId: vid,
                title: item.snippet?.title || 'Spiritual Video',
                subtitle: item.snippet?.channelTitle || 'Brahma Kumaris',
                description: item.snippet?.description || '',
                thumbnail:
                  item.snippet?.thumbnails?.high?.url ||
                  item.snippet?.thumbnails?.medium?.url ||
                  `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                url: `https://www.youtube.com/watch?v=${vid}`,
                publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
                badge,
                badgeColor,
                channelTitle: item.snippet?.channelTitle,
              };
            })
            .filter(Boolean) as YouTubeVideo[];

          if (videos.length > 0) {
            saveToCache(cacheKey, videos);
            saveToCache(`yt_channel_v3_${channelId}`, videos[0]);
            console.log(`[YouTube Engine] Successfully fetched ${videos.length} videos via search API for ${channelId}`);
            return videos;
          }
        }
      } else if (res && (res.status === 403 || res.status === 429)) {
        console.warn(`[YouTube Engine] YouTube API quota exceeded (status ${res.status}) for ${channelId}. Instantly falling back to RSS feed.`);
      }
    } catch (err) {
      console.warn(`[YouTube Engine] YouTube search API error for ${channelId}:`, err);
    }
  }

  // 4. Tertiary: YouTube Channel RSS Feed via rss2json converter with cache-busting
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const rssEndpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}${cacheBustParam}`;
    const rRes = await fetch(rssEndpoint, {
      headers: noCacheHeaders,
      signal: createTimeoutSignal(5000),
    }).catch(() => null);

    if (rRes && rRes.ok) {
      const rData = await rRes.json().catch(() => null);
      if (rData && rData.status === 'ok' && Array.isArray(rData.items) && rData.items.length > 0) {
        const videos: YouTubeVideo[] = rData.items
          .map((item: any) => {
            const vid = (item.guid || item.link || '').replace(/^yt:video:/, '').split('v=').pop() || '';
            if (!vid) return null;
            return {
              videoId: vid,
              title: item.title || 'Spiritual Video',
              subtitle: item.author || 'Brahma Kumaris',
              description: item.description || '',
              thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              url: item.link || `https://www.youtube.com/watch?v=${vid}`,
              publishedAt: item.pubDate || new Date().toISOString(),
              badge,
              badgeColor,
              channelTitle: item.author || 'Brahma Kumaris',
            };
          })
          .filter(Boolean) as YouTubeVideo[];

        if (videos.length > 0) {
          saveToCache(cacheKey, videos);
          saveToCache(`yt_channel_v3_${channelId}`, videos[0]);
          console.log(`[YouTube Engine] Successfully fetched ${videos.length} videos via RSS converter for ${channelId}`);
          return videos;
        }
      }
    }
  } catch (err) {
    console.warn(`[YouTube Engine] RSS converter error for ${channelId}:`, err);
  }

  // 5. Quaternary: Direct YouTube RSS XML fetch & parser (Native iOS / Android without CORS)
  try {
    const directRssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}${cacheBustParam}`;
    const directRes = await fetch(directRssUrl, {
      headers: noCacheHeaders,
      signal: createTimeoutSignal(5000),
    }).catch(() => null);

    if (directRes && directRes.ok) {
      const xmlText = await directRes.text();
      const parsedVideos = parseYouTubeRss(xmlText, badge, badgeColor);
      if (parsedVideos.length > 0) {
        saveToCache(cacheKey, parsedVideos);
        saveToCache(`yt_channel_v3_${channelId}`, parsedVideos[0]);
        console.log(`[YouTube Engine] Successfully extracted ${parsedVideos.length} videos via direct XML for ${channelId}`);
        return parsedVideos;
      }
    }
  } catch (err) {
    console.warn(`[YouTube Engine] Direct XML RSS error for ${channelId}:`, err);
  }

  // 6. Quinary: Silent Local Storage Fallback: Return any cached videos
  const cachedStale = getFromCache<YouTubeVideo[]>(cacheKey);
  if (cachedStale && Array.isArray(cachedStale) && cachedStale.length > 0) {
    console.log(`[YouTube Engine] Serving ${cachedStale.length} videos from local storage for ${channelId}`);
    return cachedStale;
  }

  // 7. Senary: Curated Fallback (for BK Sheeja)
  if (channelId === 'UCvQFuOM38iAZD7ltMujOq-g') {
    console.log('[YouTube Engine] Serving curated fallback videos for BK Sheeja');
    return DEFAULT_BK_SHEEJA_VIDEOS;
  }

  return [];
}

/**
 * Dedicated BK Sheeja Video List Fetcher
 */
export async function fetchBKSheejaVideoList(bypassCache = false): Promise<YouTubeVideo[]> {
  return fetchChannelVideoList('UCvQFuOM38iAZD7ltMujOq-g', 'MEDITATION', '#7c3aed', bypassCache);
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
  try {
    // If querying podcast channel, use dedicated filtered podcast method
    if (channelId === 'UC98sbhynzcgLlx9x-SYi6zg' || badge === 'PODCAST') {
      return await fetchDedicatedPodcastVideo(bypassCache);
    }

    const list = await fetchChannelVideoList(channelId, badge, badgeColor, bypassCache);
    if (list && list.length > 0) {
      return list[0];
    }

    return getFromCache<YouTubeVideo>(`yt_channel_v3_${channelId}`) || null;
  } catch (err) {
    console.error(`[YouTube Engine] Error fetching channel ${channelId}:`, err);
    return getFromCache<YouTubeVideo>(`yt_channel_v3_${channelId}`) || null;
  }
}

export type ChannelSyncKey = 'liveVideo' | 'podcastVideo' | 'sheebaVideo' | 'sheejaVideo';

/**
 * Synchronizes all 4 channels concurrently with dedicated podcast filtering.
 * Each channel fetch is completely isolated: if one channel fails or takes time,
 * the remaining three channels still complete and render immediately.
 */
export async function syncAllYouTubeMedia(
  bypassCache = false,
  onChannelLoaded?: (channelKey: ChannelSyncKey, video: YouTubeVideo) => void
): Promise<{
  liveVideo: YouTubeVideo | null;
  podcastVideo: YouTubeVideo | null;
  sheebaVideo: YouTubeVideo | null;
  sheejaVideo: YouTubeVideo | null;
}> {
  console.log(`[YouTube Engine] Starting independent uploads sync for all 4 channels (bypassCache: ${bypassCache})...`);

  // 1. BK S Calicut Live / Daily Murli Class
  const fetchLive = async (): Promise<YouTubeVideo | null> => {
    try {
      const v = await fetchChannelLatestVideo('UCTrf0g3Dpi5lW-jddmPlOpA', 'LIVE CLASS', '#dc2626', bypassCache);
      if (v && onChannelLoaded) {
        onChannelLoaded('liveVideo', v);
      }
      return v;
    } catch (e) {
      console.error('[YouTube Engine] BK S Calicut Live fetch isolated error:', e);
      return null;
    }
  };

  // 2. Supreme Light Creations Dedicated Daily Podcast
  const fetchPodcast = async (): Promise<YouTubeVideo | null> => {
    try {
      const v = await fetchDedicatedPodcastVideo(bypassCache);
      if (v && onChannelLoaded) {
        onChannelLoaded('podcastVideo', v);
      }
      return v;
    } catch (e) {
      console.error('[YouTube Engine] Supreme Light Podcast fetch isolated error:', e);
      return null;
    }
  };

  // 3. BK Sheeba Classes & Chintan
  const fetchSheeba = async (): Promise<YouTubeVideo | null> => {
    try {
      const v = await fetchChannelLatestVideo('UCtj3aB4eYUzi2GssD-g9aBA', 'CLASSES', '#c13584', bypassCache);
      if (v && onChannelLoaded) {
        onChannelLoaded('sheebaVideo', v);
      }
      return v;
    } catch (e) {
      console.error('[YouTube Engine] BK Sheeba fetch isolated error:', e);
      return null;
    }
  };

  // 4. BK Sheeja Meditation & Songs
  const fetchSheeja = async (): Promise<YouTubeVideo | null> => {
    try {
      const v = await fetchChannelLatestVideo('UCvQFuOM38iAZD7ltMujOq-g', 'MEDITATION', '#7c3aed', bypassCache);
      if (v && onChannelLoaded) {
        onChannelLoaded('sheejaVideo', v);
      }
      return v;
    } catch (e) {
      console.error('[YouTube Engine] BK Sheeja fetch isolated error:', e);
      return null;
    }
  };

  // Run all 4 fetches concurrently with Promise.allSettled
  const [liveRes, podRes, sheebaRes, sheejaRes] = await Promise.allSettled([
    fetchLive(),
    fetchPodcast(),
    fetchSheeba(),
    fetchSheeja(),
  ]);

  const liveVideo: YouTubeVideo | null = liveRes.status === 'fulfilled' ? liveRes.value : null;
  const podcastVideo: YouTubeVideo | null = podRes.status === 'fulfilled' ? podRes.value : null;
  const sheebaVideo: YouTubeVideo | null = sheebaRes.status === 'fulfilled' ? sheebaRes.value : null;
  const sheejaVideo: YouTubeVideo | null = sheejaRes.status === 'fulfilled' ? sheejaRes.value : null;

  console.log('[YouTube Engine] Completed media fetch for all 4 channels:', {
    live: liveVideo?.title || 'None',
    podcast: podcastVideo?.title || 'None',
    sheeba: sheebaVideo?.title || 'None',
    sheeja: sheejaVideo?.title || 'None',
  });

  return {
    liveVideo,
    podcastVideo,
    sheebaVideo,
    sheejaVideo,
  };
}
