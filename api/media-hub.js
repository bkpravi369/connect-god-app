/**
 * Vercel Serverless Function: /api/media-hub
 * Unified server-side YouTube media hub API for all 4 channels:
 *  1. BK S Calicut Live (UCTrf0g3Dpi5lW-jddmPlOpA) - Live streams & daily Murli classes
 *  2. Supreme Light Creations (UC98sbhynzcgLlx9x-SYi6zg) - Daily Murli Malayalam Podcast
 *  3. BK Sheeba (UCtj3aB4eYUzi2GssD-g9aBA) - Long-form classes (excludes shorts <= 60s)
 *  4. BK Sheeja (UCvQFuOM38iAZD7ltMujOq-g) - Long-form meditation & songs (excludes shorts <= 60s)
 *
 * Configured with strict Edge CDN caching headers:
 * Cache-Control: public, s-maxage=60, stale-while-revalidate=120
 */

import fs from 'fs';
import path from 'path';

const HARDCODED_API_KEY = 'AIzaSyDU7qYO0XNjJHRorqitiRftFxFLuFhCNks';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

const CHANNEL_DEFS = {
  calicut: {
    id: 'UCTrf0g3Dpi5lW-jddmPlOpA',
    name: 'BK S Calicut Live',
    badge: 'LIVE CLASS',
    badgeColor: '#dc2626',
    category: 'live',
  },
  podcast: {
    id: 'UC98sbhynzcgLlx9x-SYi6zg',
    name: 'Supreme Light Creations',
    badge: 'PODCAST',
    badgeColor: '#d97706',
    category: 'podcast',
    podcastPlaylistId: 'PLoKrgS26Q3vwZF9q__OUNW0g3fI0zxVYB',
  },
  sheeba: {
    id: 'UCtj3aB4eYUzi2GssD-g9aBA',
    name: 'BK Sheeba',
    badge: 'CLASSES',
    badgeColor: '#c13584',
    category: 'sheeba',
    excludeShorts: true,
  },
  sheeja: {
    id: 'UCvQFuOM38iAZD7ltMujOq-g',
    name: 'BK Sheeja',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
    category: 'sheeja',
    excludeShorts: true,
  },
};

/**
 * Parses ISO 8601 duration string (e.g. PT1H2M30S, PT45S, PT12M) to seconds.
 */
function parseDurationToSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Checks if a video is a YouTube Short based on duration or tags.
 */
function isShortsVideo(title = '', description = '', durationSec = 0) {
  if (durationSec > 0 && durationSec <= 60) return true;
  const combined = `${title} ${description}`.toLowerCase();
  return (
    combined.includes('#shorts') ||
    combined.includes('#short') ||
    combined.includes('/shorts/') ||
    /\bshorts\b/i.test(title)
  );
}

/**
 * Checks if title or description matches Podcast keywords.
 */
function isPodcastVideo(title = '', description = '') {
  const combined = `${title} ${description}`.toLowerCase();
  return (
    combined.includes('podcast') ||
    combined.includes('പോഡ്കാസ്റ്റ്') ||
    combined.includes('പോഡ്കാസ്റ്') ||
    combined.includes('daily murli podcast') ||
    combined.includes('murli podcast')
  );
}

/**
 * Safely parses any date string into epoch milliseconds.
 */
function parseTimestamp(dateStr) {
  if (!dateStr) return 0;
  const direct = new Date(dateStr).getTime();
  if (!isNaN(direct)) return direct;
  const isoFormatted = new Date(String(dateStr).replace(' ', 'T') + 'Z').getTime();
  return isNaN(isoFormatted) ? 0 : isoFormatted;
}

/**
 * Fallback static episodes in case YouTube API is entirely unavailable.
 */
function getFallbackEpisodes() {
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'podcast_episodes.json'),
    path.join(process.cwd(), 'src', 'data', 'podcast_episodes.json'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw);
      } catch {}
    }
  }
  return [
    {
      id: 'RXggQ0aUt_M',
      videoId: 'RXggQ0aUt_M',
      title: 'Daily Murli Podcast',
      channelName: 'Supreme Light Creations',
      channelId: 'UC98sbhynzcgLlx9x-SYi6zg',
      thumbnail: 'https://i.ytimg.com/vi/RXggQ0aUt_M/hqdefault.jpg',
      url: 'https://www.youtube.com/watch?v=RXggQ0aUt_M',
      badge: 'PODCAST',
      badgeColor: '#d97706',
      category: 'podcast',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'live-calicut',
      videoId: 'DlFt6-KwmcI',
      title: 'BK S Calicut Daily Live Class',
      channelName: 'BK S Calicut Live',
      channelId: 'UCTrf0g3Dpi5lW-jddmPlOpA',
      thumbnail: 'https://i.ytimg.com/vi/DlFt6-KwmcI/hqdefault.jpg',
      url: 'https://www.youtube.com/watch?v=DlFt6-KwmcI',
      badge: 'LIVE CLASS',
      badgeColor: '#dc2626',
      category: 'live',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'sheeba-class',
      videoId: '93fK3p1aLwY',
      title: 'BK Sheeba Spiritual Class',
      channelName: 'BK Sheeba',
      channelId: 'UCtj3aB4eYUzi2GssD-g9aBA',
      thumbnail: 'https://i.ytimg.com/vi/93fK3p1aLwY/hqdefault.jpg',
      url: 'https://www.youtube.com/watch?v=93fK3p1aLwY',
      badge: 'CLASSES',
      badgeColor: '#c13584',
      category: 'sheeba',
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'sheeja-meditation',
      videoId: 'tiKb43faieY',
      title: 'BK Sheeja Meditation & Songs',
      channelName: 'BK Sheeja',
      channelId: 'UCvQFuOM38iAZD7ltMujOq-g',
      thumbnail: 'https://i.ytimg.com/vi/tiKb43faieY/hqdefault.jpg',
      url: 'https://www.youtube.com/watch?v=tiKb43faieY',
      badge: 'MEDITATION',
      badgeColor: '#7c3aed',
      category: 'sheeja',
      publishedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Fetch video details (duration, live status, full snippet) for an array of video IDs.
 */
async function fetchVideoDetails(videoIds, apiKey) {
  if (!videoIds || videoIds.length === 0 || !apiKey) return new Map();
  try {
    const ids = videoIds.slice(0, 50).join(',');
    const url = `${BASE_URL}/videos?part=snippet,contentDetails,liveStreamingDetails&id=${ids}&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return new Map();
    const data = await res.json();
    const map = new Map();
    for (const item of data.items || []) {
      const durationSec = parseDurationToSeconds(item.contentDetails?.duration);
      map.set(item.id, {
        ...item,
        durationSec,
        isLive: item.snippet?.liveBroadcastContent === 'live',
      });
    }
    return map;
  } catch (e) {
    return new Map();
  }
}

/**
 * Fetch BK S Calicut video:
 * Checks for live broadcast first; if not live, fetches latest uploads class video.
 */
async function fetchCalicutLive(apiKey, fallback) {
  const ch = CHANNEL_DEFS.calicut;
  // 1. Check for active live broadcast via YouTube Data API
  if (apiKey) {
    try {
      const liveSearchUrl = `${BASE_URL}/search?part=snippet&channelId=${ch.id}&eventType=live&type=video&key=${apiKey}`;
      const res = await fetch(liveSearchUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          const vid = item.id?.videoId;
          if (vid) {
            return {
              id: vid,
              videoId: vid,
              title: item.snippet?.title || `${ch.name} Live`,
              subtitle: ch.name,
              channelName: ch.name,
              channelId: ch.id,
              thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${vid}`,
              link: `https://www.youtube.com/watch?v=${vid}`,
              publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
              badge: 'LIVE',
              badgeColor: '#dc2626',
              isLive: true,
              category: 'live',
              description: item.snippet?.description || '',
            };
          }
        }
      }
    } catch {}
  }

  // 2. Fetch latest video from Uploads playlist (UU...)
  if (apiKey) {
    try {
      const uploadId = 'UU' + ch.id.slice(2);
      const url = `${BASE_URL}/playlistItems?part=snippet&playlistId=${uploadId}&maxResults=5&key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const vids = data.items.map((i) => i.snippet?.resourceId?.videoId).filter(Boolean);
          const detailsMap = await fetchVideoDetails(vids, apiKey);
          const first = data.items[0];
          const vid = first.snippet?.resourceId?.videoId;
          const details = detailsMap.get(vid);
          const isLiveNow = details?.isLive || false;

          return {
            id: vid,
            videoId: vid,
            title: first.snippet?.title || `${ch.name} Class`,
            subtitle: ch.name,
            channelName: ch.name,
            channelId: ch.id,
            thumbnail: first.snippet?.thumbnails?.high?.url || first.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${vid}`,
            link: `https://www.youtube.com/watch?v=${vid}`,
            publishedAt: first.snippet?.publishedAt || new Date().toISOString(),
            badge: isLiveNow ? 'LIVE' : ch.badge,
            badgeColor: ch.badgeColor,
            isLive: isLiveNow,
            category: 'live',
            durationSec: details?.durationSec || 0,
            description: first.snippet?.description || '',
          };
        }
      }
    } catch {}
  }

  // 3. Fallback to RSS feed
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`;
    const rssRes = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&_t=${Date.now()}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (rssRes.ok) {
      const rssData = await rssRes.json();
      if (rssData.items && rssData.items.length > 0) {
        const item = rssData.items[0];
        const vid = (item.guid || item.link || '').replace(/^yt:video:/, '').split('v=').pop();
        if (vid) {
          return {
            id: vid,
            videoId: vid,
            title: item.title || `${ch.name} Live`,
            subtitle: ch.name,
            channelName: ch.name,
            channelId: ch.id,
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            url: item.link || `https://www.youtube.com/watch?v=${vid}`,
            link: item.link || `https://www.youtube.com/watch?v=${vid}`,
            publishedAt: item.pubDate || new Date().toISOString(),
            badge: ch.badge,
            badgeColor: ch.badgeColor,
            isLive: false,
            category: 'live',
            description: item.description || '',
          };
        }
      }
    }
  } catch {}

  return fallback;
}

/**
 * Fetch Supreme Light Creations latest Malayalam Murli Podcast episode.
 */
async function fetchSupremeLightPodcast(apiKey, fallback) {
  const ch = CHANNEL_DEFS.podcast;
  const candidates = [];

  // 1. Fetch from channel uploads playlist and filter for podcast
  if (apiKey) {
    try {
      const uploadId = 'UU' + ch.id.slice(2);
      const url = `${BASE_URL}/playlistItems?part=snippet&playlistId=${uploadId}&maxResults=15&key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        for (const item of data.items || []) {
          const vid = item.snippet?.resourceId?.videoId;
          if (vid && isPodcastVideo(item.snippet?.title, item.snippet?.description)) {
            candidates.push({
              id: vid,
              videoId: vid,
              title: item.snippet?.title || 'Daily Murli Podcast',
              subtitle: ch.name,
              channelName: ch.name,
              channelId: ch.id,
              thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${vid}`,
              link: `https://www.youtube.com/watch?v=${vid}`,
              publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
              badge: ch.badge,
              badgeColor: ch.badgeColor,
              isLive: false,
              category: 'podcast',
              description: item.snippet?.description || '',
            });
          }
        }
      }
    } catch {}
  }

  // 2. Also check dedicated podcast playlist if uploads had no matches
  if (candidates.length === 0 && apiKey && ch.podcastPlaylistId) {
    try {
      const url = `${BASE_URL}/playlistItems?part=snippet&playlistId=${ch.podcastPlaylistId}&maxResults=10&key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        for (const item of data.items || []) {
          const vid = item.snippet?.resourceId?.videoId;
          if (vid) {
            candidates.push({
              id: vid,
              videoId: vid,
              title: item.snippet?.title || 'Daily Murli Podcast',
              subtitle: ch.name,
              channelName: ch.name,
              channelId: ch.id,
              thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${vid}`,
              link: `https://www.youtube.com/watch?v=${vid}`,
              publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
              badge: ch.badge,
              badgeColor: ch.badgeColor,
              isLive: false,
              category: 'podcast',
              description: item.snippet?.description || '',
            });
          }
        }
      }
    } catch {}
  }

  // 3. Check RSS feed if no candidates yet
  if (candidates.length === 0) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`;
      const rssRes = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&_t=${Date.now()}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (rssRes.ok) {
        const rssData = await rssRes.json();
        const podItems = (rssData.items || []).filter((it) => isPodcastVideo(it.title, it.description));
        for (const item of podItems) {
          const vid = (item.guid || item.link || '').replace(/^yt:video:/, '').split('v=').pop();
          if (vid) {
            candidates.push({
              id: vid,
              videoId: vid,
              title: item.title || 'Daily Murli Podcast',
              subtitle: ch.name,
              channelName: ch.name,
              channelId: ch.id,
              thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              url: item.link || `https://www.youtube.com/watch?v=${vid}`,
              link: item.link || `https://www.youtube.com/watch?v=${vid}`,
              publishedAt: item.pubDate || new Date().toISOString(),
              badge: ch.badge,
              badgeColor: ch.badgeColor,
              isLive: false,
              category: 'podcast',
              description: item.description || '',
            });
          }
        }
      }
    } catch {}
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => parseTimestamp(b.publishedAt) - parseTimestamp(a.publishedAt));
    return candidates[0];
  }

  return fallback;
}

/**
 * Fetch latest long-form video for BK Sheeba or BK Sheeja (strictly excluding shorts <= 60s).
 */
async function fetchLongFormChannelVideo(chDef, apiKey, fallback) {
  if (apiKey) {
    try {
      const uploadId = 'UU' + chDef.id.slice(2);
      const url = `${BASE_URL}/playlistItems?part=snippet&playlistId=${uploadId}&maxResults=15&key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const vids = data.items.map((i) => i.snippet?.resourceId?.videoId).filter(Boolean);
          const detailsMap = await fetchVideoDetails(vids, apiKey);

          for (const item of data.items) {
            const vid = item.snippet?.resourceId?.videoId;
            if (!vid) continue;
            const details = detailsMap.get(vid);
            const durationSec = details?.durationSec || 0;
            const title = item.snippet?.title || '';
            const desc = item.snippet?.description || '';

            // Strictly filter out shorts (duration <= 60s or #shorts)
            if (isShortsVideo(title, desc, durationSec)) {
              continue;
            }

            return {
              id: vid,
              videoId: vid,
              title: title || `${chDef.name} Class`,
              subtitle: chDef.name,
              channelName: chDef.name,
              channelId: chDef.id,
              thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${vid}`,
              link: `https://www.youtube.com/watch?v=${vid}`,
              publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
              badge: chDef.badge,
              badgeColor: chDef.badgeColor,
              isLive: false,
              category: chDef.category,
              durationSec,
              description: desc,
            };
          }
        }
      }
    } catch {}
  }

  // Fallback to RSS feed if API query failed
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${chDef.id}`;
    const rssRes = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&_t=${Date.now()}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (rssRes.ok) {
      const rssData = await rssRes.json();
      for (const item of rssData.items || []) {
        const vid = (item.guid || item.link || '').replace(/^yt:video:/, '').split('v=').pop();
        if (!vid) continue;
        if (isShortsVideo(item.title, item.description, 0)) continue;

        return {
          id: vid,
          videoId: vid,
          title: item.title || `${chDef.name} Class`,
          subtitle: chDef.name,
          channelName: chDef.name,
          channelId: chDef.id,
          thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
          url: item.link || `https://www.youtube.com/watch?v=${vid}`,
          link: item.link || `https://www.youtube.com/watch?v=${vid}`,
          publishedAt: item.pubDate || new Date().toISOString(),
          badge: chDef.badge,
          badgeColor: chDef.badgeColor,
          isLive: false,
          category: chDef.category,
          description: item.description || '',
        };
      }
    }
  } catch {}

  return fallback;
}

export default async function handler(req, res) {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Strict 60s Edge CDN caching with 120s stale-while-revalidate
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || HARDCODED_API_KEY;
  const fallbacks = getFallbackEpisodes();

  const calicutFallback = fallbacks.find((f) => f.category === 'live') || fallbacks[1];
  const podcastFallback = fallbacks.find((f) => f.category === 'podcast') || fallbacks[0];
  const sheebaFallback = fallbacks.find((f) => f.category === 'sheeba') || fallbacks[2];
  const sheejaFallback = fallbacks.find((f) => f.category === 'sheeja') || fallbacks[3];

  try {
    // Concurrently fetch all 4 channels on the server
    const [liveRes, podRes, sheebaRes, sheejaRes] = await Promise.allSettled([
      fetchCalicutLive(apiKey, calicutFallback),
      fetchSupremeLightPodcast(apiKey, podcastFallback),
      fetchLongFormChannelVideo(CHANNEL_DEFS.sheeba, apiKey, sheebaFallback),
      fetchLongFormChannelVideo(CHANNEL_DEFS.sheeja, apiKey, sheejaFallback),
    ]);

    const liveVideo = liveRes.status === 'fulfilled' ? liveRes.value : calicutFallback;
    const podcastVideo = podRes.status === 'fulfilled' ? podRes.value : podcastFallback;
    const sheebaVideo = sheebaRes.status === 'fulfilled' ? sheebaRes.value : sheebaFallback;
    const sheejaVideo = sheejaRes.status === 'fulfilled' ? sheejaRes.value : sheejaFallback;

    const videos = [liveVideo, podcastVideo, sheebaVideo, sheejaVideo].filter(Boolean);

    return res.status(200).json({
      success: true,
      liveVideo,
      podcastVideo,
      sheebaVideo,
      sheejaVideo,
      videos,
      episodes: videos,
      channels: [
        CHANNEL_DEFS.calicut,
        CHANNEL_DEFS.podcast,
        CHANNEL_DEFS.sheeba,
        CHANNEL_DEFS.sheeja,
      ],
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/media-hub:', error);
    const fallbackList = [calicutFallback, podcastFallback, sheebaFallback, sheejaFallback];
    return res.status(200).json({
      success: true,
      liveVideo: calicutFallback,
      podcastVideo: podcastFallback,
      sheebaVideo: sheebaFallback,
      sheejaVideo: sheejaFallback,
      videos: fallbackList,
      episodes: fallbackList,
      updatedAt: new Date().toISOString(),
      fallback: true,
    });
  }
}
