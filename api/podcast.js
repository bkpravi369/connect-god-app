/**
 * Vercel Serverless Function: /api/podcast
 * Serves latest curated podcast episodes & YouTube channel media
 * with server-side caching and fallback.
 */
import fs from 'fs';
import path from 'path';

const HARDCODED_API_KEY = 'AIzaSyDU7qYO0XNjJHRorqitiRftFxFLuFhCNks';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

const CHANNELS = [
  { id: 'UC98sbhynzcgLlx9x-SYi6zg', name: 'Supreme Light Creations', badge: 'TODAY PODCAST', badgeColor: '#d97706', category: 'podcast' },
  { id: 'UCTrf0g3Dpi5lW-jddmPlOpA', name: 'BK S Calicut Live', badge: 'LIVE CLASS', badgeColor: '#dc2626', category: 'live' },
  { id: 'UCtj3aB4eYUzi2GssD-g9aBA', name: 'BK Sheeba', badge: 'CLASSES', badgeColor: '#c13584', category: 'sheeba' },
  { id: 'UCvQFuOM38iAZD7ltMujOq-g', name: 'BK Sheeja', badge: 'MEDITATION', badgeColor: '#7c3aed', category: 'sheeja' },
];

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
      } catch (err) {
        console.warn('Failed to parse fallback podcast json:', err);
      }
    }
  }
  return [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || HARDCODED_API_KEY;
  const fallbacks = getFallbackEpisodes();

  const episodes = await Promise.all(
    CHANNELS.map(async (ch) => {
      const fb = fallbacks.find((f) => f.category === ch.category) || {
        id: `card-${ch.category}`,
        videoId: '',
        title: `${ch.name} Daily Episode`,
        channelName: ch.name,
        channelId: ch.id,
        thumbnail: '',
        url: '',
        badge: ch.badge,
        badgeColor: ch.badgeColor,
        category: ch.category,
      };

      // Dedicated handling for Supreme Light Creations podcast: Avoid API search index lag, cache-bust, strictly sort latest-first
      if (ch.category === 'podcast') {
        const parseTime = (d) => {
          if (!d) return 0;
          const t = new Date(d).getTime();
          if (!isNaN(t)) return t;
          const iso = new Date(String(d).replace(' ', 'T') + 'Z').getTime();
          return isNaN(iso) ? 0 : iso;
        };
        const isPod = (t, d) => /podcast|പോഡ്കാസ്റ്റ്|പോഡ്കാസ്റ്/i.test((t || '') + ' ' + (d || ''));

        // 1. Primary: Direct RSS feed via rss2json converter with cache-busting
        try {
          const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`;
          const rssEndpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&_t=${Date.now()}`;
          const rRes = await fetch(rssEndpoint, {
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
            signal: AbortSignal.timeout(5000),
          });
          if (rRes.ok) {
            const rData = await rRes.json();
            if (rData?.status === 'ok' && Array.isArray(rData.items) && rData.items.length > 0) {
              const podcastItems = rData.items.filter((item) => isPod(item.title, item.description));
              podcastItems.sort((a, b) => parseTime(b.pubDate) - parseTime(a.pubDate));
              const selected = podcastItems.length > 0 ? podcastItems[0] : rData.items[0];
              const vid = (selected.guid || selected.link || '').replace(/^yt:video:/, '').split('v=').pop();
              if (vid) {
                return {
                  id: vid,
                  videoId: vid,
                  title: selected.title || fb.title,
                  channelName: selected.author || ch.name,
                  channelId: ch.id,
                  thumbnail: selected.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                  url: selected.link || `https://www.youtube.com/watch?v=${vid}`,
                  link: selected.link || `https://www.youtube.com/watch?v=${vid}`,
                  publishedAt: selected.pubDate || new Date().toISOString(),
                  badge: ch.badge,
                  badgeColor: ch.badgeColor,
                  category: ch.category,
                  description: selected.description || fb.description,
                };
              }
            }
          }
        } catch (rssErr) {}

        // 2. Secondary: YouTube Data API v3 search strictly filtered and sorted
        try {
          if (apiKey) {
            const searchUrl = `${BASE_URL}/search?part=snippet&channelId=${ch.id}&order=date&type=video&maxResults=15&key=${apiKey}&_t=${Date.now()}`;
            const r = await fetch(searchUrl, {
              headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
              signal: AbortSignal.timeout(4000),
            });
            if (r.ok) {
              const data = await r.json();
              if (data?.items?.length > 0) {
                const podItems = data.items.filter((item) => isPod(item.snippet?.title, item.snippet?.description));
                podItems.sort((a, b) => parseTime(b.snippet?.publishedAt) - parseTime(a.snippet?.publishedAt));
                const selected = podItems.length > 0 ? podItems[0] : data.items[0];
                const vid = selected.id?.videoId;
                if (vid) {
                  return {
                    id: vid,
                    videoId: vid,
                    title: selected.snippet?.title || fb.title,
                    channelName: selected.snippet?.channelTitle || ch.name,
                    channelId: ch.id,
                    thumbnail: selected.snippet?.thumbnails?.high?.url || selected.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                    url: `https://www.youtube.com/watch?v=${vid}`,
                    link: `https://www.youtube.com/watch?v=${vid}`,
                    publishedAt: selected.snippet?.publishedAt || new Date().toISOString(),
                    badge: ch.badge,
                    badgeColor: ch.badgeColor,
                    category: ch.category,
                    description: selected.snippet?.description || fb.description,
                  };
                }
              }
            }
          }
        } catch (apiErr) {}

        return fb;
      }

      try {
        if (apiKey) {
          const searchUrl = `${BASE_URL}/search?part=snippet&channelId=${ch.id}&order=date&type=video&maxResults=5&key=${apiKey}&_t=${Date.now()}`;
          const r = await fetch(searchUrl, {
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
            signal: AbortSignal.timeout(4000),
          });
          if (r.ok) {
            const data = await r.json();
            if (data?.items?.length > 0) {
              const item = data.items[0];
              const vid = item.id?.videoId;
              if (vid) {
                return {
                  id: vid,
                  videoId: vid,
                  title: item.snippet?.title || fb.title,
                  channelName: item.snippet?.channelTitle || ch.name,
                  channelId: ch.id,
                  thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                  url: `https://www.youtube.com/watch?v=${vid}`,
                  link: `https://www.youtube.com/watch?v=${vid}`,
                  publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
                  badge: ch.badge,
                  badgeColor: ch.badgeColor,
                  category: ch.category,
                  description: item.snippet?.description || fb.description,
                };
              }
            }
          }
        }
      } catch (e) {
        // Fallback to RSS
      }

      // 2. RSS Feed Fallback via rss2json
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`;
        const rssEndpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&_t=${Date.now()}`;
        const rRes = await fetch(rssEndpoint, {
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
          signal: AbortSignal.timeout(5000),
        });
        if (rRes.ok) {
          const rData = await rRes.json();
          if (rData?.status === 'ok' && Array.isArray(rData.items) && rData.items.length > 0) {
            const first = rData.items[0];
            const vid = (first.guid || first.link || '').replace(/^yt:video:/, '').split('v=').pop();
            if (vid) {
              return {
                id: vid,
                videoId: vid,
                title: first.title || fb.title,
                channelName: first.author || ch.name,
                channelId: ch.id,
                thumbnail: first.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                url: first.link || `https://www.youtube.com/watch?v=${vid}`,
                link: first.link || `https://www.youtube.com/watch?v=${vid}`,
                publishedAt: first.pubDate || new Date().toISOString(),
                badge: ch.badge,
                badgeColor: ch.badgeColor,
                category: ch.category,
                description: first.description || fb.description,
              };
            }
          }
        }
      } catch (rssErr) {
        // Continue to fallback
      }

      return fb;
    })
  );

  return res.status(200).json({
    success: true,
    episodes: episodes.length > 0 ? episodes : fallbacks,
    timestamp: new Date().toISOString(),
  });
}
