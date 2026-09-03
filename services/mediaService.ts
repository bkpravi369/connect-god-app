import { getJSON, setJSON } from "@/lib/storage";
import { MeditationItem, STORAGE_KEYS } from "@/lib/constants";
import {
  MediaTrack,
  MASTER_MEDIA_DATA,
  MASTER_COMMENTARY_TRACKS,
  COMMENTARY_TRACKS,
  INITIAL_TRACKS,
  SONGS_DATA,
  MUSIC_DATA,
} from "@/constants/mediaTracks";

export {
  MediaTrack,
  MASTER_MEDIA_DATA,
  MASTER_COMMENTARY_TRACKS,
  COMMENTARY_TRACKS,
  INITIAL_TRACKS,
  SONGS_DATA,
  MUSIC_DATA,
};

export type MediaCategory = "commentary" | "music" | "song";
export type SongSubCategory = "all" | "malayalam" | "hindi" | "others";

export const CLOUDINARY_BASE_URL = "https://res.cloudinary.com/tb5bmwd5/video/upload/";
export const CLOUDINARY_DOWNLOAD_BASE_URL = "https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/";

export const CLOUDINARY_FOLDERS = {
  commentaries: "BABA Songs/COMMENTRIES/",
  musics: "BABA Songs/Musics/",
  songsMalayalam: "BABA Songs/Songs/Malayalam/",
  songsHindi: "BABA Songs/Songs/Hindi/",
  songs: "BABA Songs/Songs/",
} as const;

export function cleanMediaTitle(titleOrFilename: string): string {
  if (!titleOrFilename) return "";
  let clean = titleOrFilename.split("/").pop() || titleOrFilename;
  clean = clean.replace(/\.(mp3|wav|m4a|aac|ogg|mpeg)$/i, "");
  clean = clean.replace(/^(\d{1,3}[\s._-]+|\btrack\s*\d{1,3}[\s._-]+)/i, "");
  clean = clean.replace(/_/g, " ");
  clean = clean.replace(/\s+/g, " ").trim();
  return clean || titleOrFilename;
}

export function buildCloudinaryStreamUrl(folderPath: string, filename: string): string {
  if (!filename) return "";
  if (filename.startsWith("http://") || filename.startsWith("https://")) return filename;
  const fullPath = (folderPath + filename).replace(/\/+/g, "/");
  const encodedPath = fullPath.split("/").map((seg) => encodeURIComponent(seg)).join("/");
  return CLOUDINARY_BASE_URL + encodedPath;
}

export function buildCloudinaryDownloadUrl(folderPath: string, filename: string): string {
  if (!filename) return "";
  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename.includes("/upload/")
      ? filename.replace("/upload/", "/upload/fl_attachment/")
      : filename;
  }
  const fullPath = (folderPath + filename).replace(/\/+/g, "/");
  const encodedPath = fullPath.split("/").map((seg) => encodeURIComponent(seg)).join("/");
  return CLOUDINARY_DOWNLOAD_BASE_URL + encodedPath;
}

export function getCloudinaryDownloadUrl(url: string): string {
  if (!url) return "";
  if (url.includes("/upload/") && !url.includes("/fl_attachment/")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
}

export const MUSIC_TRACKS: MediaTrack[] = MASTER_MEDIA_DATA.filter((i) => i.category === "music");
export const MALAYALAM_SONGS: MediaTrack[] = MASTER_MEDIA_DATA.filter((i) => i.category === "song" && i.subCategory === "malayalam");
export const HINDI_SONGS: MediaTrack[] = MASTER_MEDIA_DATA.filter((i) => i.category === "song" && i.subCategory === "hindi");
export const ALL_MEDIA_TRACKS: MediaTrack[] = MASTER_MEDIA_DATA;

export function driveTracksToMeditationItems(tracks: MediaTrack[] = ALL_MEDIA_TRACKS): MeditationItem[] {
  return tracks.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    subCategory: t.subCategory as any,
    driveUrl: t.url,
    streamUrl: t.url,
    downloadUrl: getCloudinaryDownloadUrl(t.url),
  }));
}

export function getCachedDrivePlaylist(): MediaTrack[] {
  const cached = getJSON<MediaTrack[] | null>("connectgod_drive_playlist", null);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }
  return ALL_MEDIA_TRACKS;
}

export async function fetchDriveAudioPlaylist(): Promise<MediaTrack[]> {
  const tracks = ALL_MEDIA_TRACKS;
  setJSON("connectgod_drive_playlist", tracks);
  setJSON(STORAGE_KEYS.meditation, driveTracksToMeditationItems(tracks));
  return tracks;
}
