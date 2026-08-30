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
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');

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

      try {
        if (apiKey) {
          const searchUrl = `${BASE_URL}/search?part=snippet&channelId=${ch.id}&order=date&type=video&maxResults=5&key=${apiKey}`;
          const r = await fetch(searchUrl, { signal: AbortSignal.timeout(4000) });
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
        // Fallback to static data
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
