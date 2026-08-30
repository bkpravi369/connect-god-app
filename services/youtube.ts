import {
  YouTubeVideo,
  fetchChannelLatestVideo,
  fetchDedicatedPodcastVideo,
  syncAllYouTubeMedia,
  clearYouTubeCache,
  HARDCODED_YOUTUBE_API_KEY,
} from '@/lib/youtube';

export {
  YouTubeVideo,
  fetchChannelLatestVideo,
  fetchDedicatedPodcastVideo,
  syncAllYouTubeMedia,
  clearYouTubeCache,
  HARDCODED_YOUTUBE_API_KEY,
};

/**
 * Fetch BK S Calicut Live Stream / Daily Murli Class
 */
export async function fetchBKScalicutLive(bypassCache = false): Promise<YouTubeVideo | null> {
  return fetchChannelLatestVideo('UCTrf0g3Dpi5lW-jddmPlOpA', 'LIVE CLASS', '#dc2626', bypassCache);
}

/**
 * Fetch Supreme Light Creations Latest Dedicated Podcast Episode
 */
export async function fetchSupremeLightPodcast(bypassCache = false): Promise<YouTubeVideo | null> {
  return fetchDedicatedPodcastVideo(bypassCache);
}

/**
 * Fetch BK Sheeba Latest Classes & Motivational Videos
 */
export async function fetchBKSheebaVideos(bypassCache = false): Promise<YouTubeVideo | null> {
  return fetchChannelLatestVideo('UCtj3aB4eYUzi2GssD-g9aBA', 'CLASSES', '#c13584', bypassCache);
}

/**
 * Fetch BK Sheeja Latest Meditation & Songs
 */
export async function fetchBKSheejaVideos(bypassCache = false): Promise<YouTubeVideo | null> {
  return fetchChannelLatestVideo('UCvQFuOM38iAZD7ltMujOq-g', 'MEDITATION', '#7c3aed', bypassCache);
}
