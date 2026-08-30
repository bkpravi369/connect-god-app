/**
 * Podcast & YouTube RSS service (Disabled / Deprecated)
 * Pure Cloudinary audio service is used in services/audioService.ts
 */
export type PodcastItem = {
  id: string;
  videoId: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  url: string;
  link: string;
  pubDate: string;
  publishedAt: string;
  channelId: string;
  channelName: string;
  badge: string;
  badgeColor: string;
};

export const YOUTUBE_CHANNELS = [
  { id: 'UC98sbhynzcgLlx9x-SYi6zg', name: 'Supremelight Creations', badgeColor: '#d97706' },
  { id: 'UCtj3aB4eYUzi2GssD-g9aBA', name: 'BK Sheeba', badgeColor: '#c13584' },
  { id: 'UCTrf0g3Dpi5lW-jddmPlOpA', name: 'BKS Calicut', badgeColor: '#dc2626' },
  { id: 'UCvQFuOM38iAZD7ltMujOq-g', name: 'BK Sheeja', badgeColor: '#7c3aed' },
];

export async function fetchPodcastVideos(): Promise<PodcastItem[]> {
  return [];
}

export function getCachedPodcastVideos(): PodcastItem[] {
  return [];
}

export async function openYouTubeVideo(): Promise<boolean> {
  return true;
}
