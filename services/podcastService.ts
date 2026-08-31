import fallbackEpisodes from '@/data/podcast_episodes.json';
import { getJSON, setJSON } from '@/lib/storage';

export type PodcastItem = {
  id: string;
  videoId: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  url: string;
  link: string;
  pubDate?: string;
  publishedAt: string;
  channelId: string;
  channelName: string;
  badge: string;
  badgeColor: string;
  category?: string;
  description?: string;
};

export const YOUTUBE_CHANNELS = [
  { id: 'UC98sbhynzcgLlx9x-SYi6zg', name: 'Supreme Light Creations', badgeColor: '#d97706', category: 'podcast' },
  { id: 'UCTrf0g3Dpi5lW-jddmPlOpA', name: 'BK S Calicut Live', badgeColor: '#dc2626', category: 'live' },
  { id: 'UCtj3aB4eYUzi2GssD-g9aBA', name: 'BK Sheeba', badgeColor: '#c13584', category: 'sheeba' },
  { id: 'UCvQFuOM38iAZD7ltMujOq-g', name: 'BK Sheeja', badgeColor: '#7c3aed', category: 'sheeja' },
];

const PODCAST_STORAGE_KEY = 'connectgod_latest_podcasts_cache';

export async function fetchPodcastVideos(forceRefresh = false): Promise<PodcastItem[]> {
  if (!forceRefresh) {
    const cached = getJSON<PodcastItem[] | null>(PODCAST_STORAGE_KEY, null);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  const cacheBuster = `t=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const res = await fetch(`/api/podcast?${cacheBuster}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.episodes && Array.isArray(data.episodes) && data.episodes.length > 0) {
        const formatted: PodcastItem[] = data.episodes.map((ep: any) => ({
          id: ep.id || ep.videoId,
          videoId: ep.videoId,
          title: ep.title,
          subtitle: ep.channelName,
          thumbnail: ep.thumbnail,
          url: ep.url,
          link: ep.link || ep.url,
          publishedAt: ep.publishedAt || new Date().toISOString(),
          channelId: ep.channelId,
          channelName: ep.channelName,
          badge: ep.badge,
          badgeColor: ep.badgeColor,
          category: ep.category,
          description: ep.description,
        }));
        setJSON(PODCAST_STORAGE_KEY, formatted);
        return formatted;
      }
    }
  } catch (err) {
    console.warn('[podcastService] Error fetching /api/podcast, using local dataset:', err);
  }

  return getCachedPodcastVideos();
}

export function getCachedPodcastVideos(): PodcastItem[] {
  return (fallbackEpisodes as any[]).map((ep) => ({
    id: ep.id || ep.videoId,
    videoId: ep.videoId,
    title: ep.title,
    subtitle: ep.channelName,
    thumbnail: ep.thumbnail,
    url: ep.url,
    link: ep.link || ep.url,
    publishedAt: ep.publishedAt || new Date().toISOString(),
    channelId: ep.channelId,
    channelName: ep.channelName,
    badge: ep.badge,
    badgeColor: ep.badgeColor,
    category: ep.category,
    description: ep.description,
  }));
}

