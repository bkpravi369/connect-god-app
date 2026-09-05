import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Music,
  Radio,
  Sparkles,
  Volume2,
  Play,
  Pause,
  Download,
  ListMusic,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Search,
  X,
  Repeat,
} from "lucide-react-native";
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from "@/lib/theme";
import { useToast } from "@/components/ToastProvider";
import {
  MainMediaTab,
  SubTabKey,
  CloudflareR2Item,
  R2_FOLDER_MAPPING,
} from "@/services/audioService";
import { AudioPlayer } from "@/components/AudioPlayer";
import { SoundwaveIndicator } from "@/components/SoundwaveIndicator";

// ── Tab Hierarchy & Cloudflare R2-Connected Structure ────────────────────
export interface SubTabItem {
  id: SubTabKey;
  label: string;
}

export const MEDIA_TABS_CONFIG: Record<
  MainMediaTab,
  {
    label: string;
    icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>;
    subTabs: SubTabItem[];
  }
> = {
  songs: {
    label: "Songs",
    icon: Music,
    subTabs: [
      { id: "panch_swarup", label: "Panch Swarup" },
      { id: "hindi", label: "Hindi" },
      { id: "malayalam", label: "Malayalam" },
      { id: "om_and_bhog", label: "Om & Bhog" },
      { id: "own_tunes", label: "Own Tune" },
    ],
  },
  commentary: {
    label: "Commentary",
    icon: Radio,
    subTabs: [
      { id: "sheeba_sister", label: "Sheeba Sister" },
      { id: "sheeja_sister", label: "Sheeja Sister" },
      { id: "others", label: "Others" },
    ],
  },
  music: {
    label: "Music",
    icon: Sparkles,
    subTabs: [
      { id: "function_music", label: "Function Music" },
      { id: "own_music", label: "Own Music" },
      { id: "meditation_music", label: "Meditation Music" },
    ],
  },
  ringtones: {
    label: "Ringtone",
    icon: Volume2,
    subTabs: [
      { id: "ringtone_hindi", label: "Hindi" },
      { id: "ringtone_malayalam", label: "Malayalam" },
    ],
  },
};

const ALL_SUBTAB_KEYS: SubTabKey[] = [
  "panch_swarup",
  "hindi",
  "malayalam",
  "om_and_bhog",
  "own_tunes",
  "sheeba_sister",
  "sheeja_sister",
  "others",
  "function_music",
  "own_music",
  "meditation_music",
  "ringtone_hindi",
  "ringtone_malayalam",
];

export default function MediaScreen() {
  const toast = useToast();

  // Active Tab State
  const [mainTab, setMainTab] = useState<MainMediaTab>("songs");
  const [subTab, setSubTab] = useState<SubTabKey>("panch_swarup");
  const [searchQuery, setSearchQuery] = useState("");

  // Cloudflare R2 Direct Tracks & Loading State
  const [tracks, setTracks] = useState<CloudflareR2Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Animation values
  const spinAnim = useRef(new Animated.Value(0)).current;
  const skeletonPulse = useRef(new Animated.Value(0.3)).current;

  // Global Audio Player State (Completely persistent across tab switches)
  const [playingTrack, setPlayingTrack] = useState<CloudflareR2Item | null>(null);
  const playingTrackRef = useRef<CloudflareR2Item | null>(null);
  playingTrackRef.current = playingTrack;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [audioPos, setAudioPos] = useState(0);
  const [audioDur, setAudioDur] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);

  // Auto-play state (defaults to true for seamless playback)
  const [autoPlay, setAutoPlay] = useState(true);
  const autoPlayRef = useRef(true);
  autoPlayRef.current = autoPlay;

  // Timeline scrub state
  const isScrubbingRef = useRef(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);
  const audioDurRef = useRef(0);
  audioDurRef.current = audioDur;

  const trackLayoutRef = useRef<{ width: number; pageX: number }>({
    width: 300,
    pageX: 0,
  });
  const progressAreaRef = useRef<View>(null);

  // Tracks ref for reliable playlist access across search filters
  const tracksRef = useRef<CloudflareR2Item[]>([]);
  tracksRef.current = tracks;

  // Web Audio Element Ref & onEnded Callback Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handleAudioEndedRef = useRef<() => void>(() => {});

  // ── Native Web HTML5 Audio Element Setup ──
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    let audio = audioRef.current;
    if (!audio) {
      audio = document.createElement("audio");
      audio.preload = "auto";
      audioRef.current = audio;
      document.body.appendChild(audio);
    }

    const handleTimeUpdate = () => {
      if (!isScrubbingRef.current && audio) {
        setAudioPos(audio.currentTime || 0);
      }
    };

    const handleDurationChange = () => {
      if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDur(audio.duration);
        audioDurRef.current = audio.duration;
      }
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
      if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDur(audio.duration);
        audioDurRef.current = audio.duration;
      }
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsBuffering(false);
      handleAudioEndedRef.current?.();
    };

    const handleError = (e: any) => {
      console.log("[AudioPlayer Web] Stream error event:", e);
      setIsBuffering(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("loadedmetadata", handleDurationChange);
    audio.addEventListener("loadeddata", handleDurationChange);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      if (audio) {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("durationchange", handleDurationChange);
        audio.removeEventListener("loadedmetadata", handleDurationChange);
        audio.removeEventListener("loadeddata", handleDurationChange);
        audio.removeEventListener("canplay", handleCanPlay);
        audio.removeEventListener("waiting", handleWaiting);
        audio.removeEventListener("playing", handlePlaying);
        audio.removeEventListener("pause", handlePause);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
        audio.pause();
      }
    };
  }, []);

  // Start skeleton pulse animation
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 0.8,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0.3,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [skeletonPulse]);

  // 1. Direct Cloudflare R2 Folder Fetch Function
  async function fetchTracks(folderPath: string, targetSubTab: SubTabKey = subTab) {
    try {
      setLoading(true);

      // Dedicated dynamic fetching for Hindi ringtones (?folder=ringtoned-hindi with fallback to ringtones-hindi)
      if (targetSubTab === "ringtone_hindi") {
        let res = await fetch(
          `https://babacloudflare.bkpraveen2010.workers.dev/?folder=ringtoned-hindi`
        );
        let data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          const resFallback = await fetch(
            `https://babacloudflare.bkpraveen2010.workers.dev/?folder=ringtones-hindi`
          );
          const dataFallback = await resFallback.json();
          if (Array.isArray(dataFallback) && dataFallback.length > 0) {
            data = dataFallback;
          }
        }
        if (Array.isArray(data)) {
          setTracks(data);
        } else {
          setTracks([]);
        }
        return;
      }

      // Dedicated dynamic fetching for Own Tune (?folder=own-tunes with fallback to own-tune)
      if (targetSubTab === "own_tunes") {
        let res = await fetch(
          `https://babacloudflare.bkpraveen2010.workers.dev/?folder=own-tunes`
        );
        let data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          const resFallback = await fetch(
            `https://babacloudflare.bkpraveen2010.workers.dev/?folder=own-tune`
          );
          const dataFallback = await resFallback.json();
          if (Array.isArray(dataFallback) && dataFallback.length > 0) {
            data = dataFallback;
          }
        }
        if (Array.isArray(data)) {
          setTracks(data);
        } else {
          setTracks([]);
        }
        return;
      }

      // Dedicated dynamic fetching for Meditation Music (?folder=meditation-music with fallback to meditation music)
      if (targetSubTab === "meditation_music") {
        let res = await fetch(
          `https://babacloudflare.bkpraveen2010.workers.dev/?folder=meditation-music`
        );
        let data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          const resFallback = await fetch(
            `https://babacloudflare.bkpraveen2010.workers.dev/?folder=${encodeURIComponent("meditation music")}`
          );
          const dataFallback = await resFallback.json();
          if (Array.isArray(dataFallback) && dataFallback.length > 0) {
            data = dataFallback;
          }
        }
        if (Array.isArray(data)) {
          setTracks(data);
        } else {
          setTracks([]);
        }
        return;
      }

      // Standard dynamic fetching for all other categories (Malayalam ringtones, Songs, Commentaries, Music)
      const res = await fetch(
        `https://babacloudflare.bkpraveen2010.workers.dev/?folder=${encodeURIComponent(folderPath)}`
      );
      const data = await res.json();

      // Crucial: The API returns the array directly, NOT wrapped inside { tracks: [...] }
      if (Array.isArray(data)) {
        setTracks(data);
      } else {
        setTracks([]);
      }
    } catch (error) {
      console.error("Error fetching audio files:", error);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }

  // 2. Tab Change Trigger: Immediately execute whenever sub-tab or main tab changes
  useEffect(() => {
    const currentFolderPath = R2_FOLDER_MAPPING[subTab];
    if (currentFolderPath) {
      fetchTracks(currentFolderPath, subTab);
    }
  }, [subTab, mainTab]);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    try {
      const currentFolderPath = R2_FOLDER_MAPPING[subTab];
      if (currentFolderPath) {
        await fetchTracks(currentFolderPath, subTab);
      }
      toast.show("Audio playlist refreshed", "success");
    } catch {
      toast.show("Loaded audio files", "info");
    } finally {
      setIsRefreshing(false);
      spinAnim.setValue(0);
    }
  };

  const handleMainTabSelect = (newMainTab: MainMediaTab) => {
    if (newMainTab === mainTab) return;
    setMainTab(newMainTab);
    const firstSub = MEDIA_TABS_CONFIG[newMainTab].subTabs[0]?.id || "panch_swarup";
    setSubTab(firstSub);
    setSearchQuery("");
    const currentFolderPath = R2_FOLDER_MAPPING[firstSub];
    if (currentFolderPath) {
      fetchTracks(currentFolderPath, firstSub);
    }
  };

  const handleSubTabSelect = (newSubTab: SubTabKey) => {
    if (newSubTab === subTab) return;
    setSubTab(newSubTab);
    setSearchQuery("");
    const currentFolderPath = R2_FOLDER_MAPPING[newSubTab];
    if (currentFolderPath) {
      fetchTracks(currentFolderPath, newSubTab);
    }
  };

  const handlePlay = (track: CloudflareR2Item) => {
    if (!track.url || !track.url.trim()) {
      toast.show("Audio stream not available", "info");
      return;
    }
    setAudioFailed(false);
    const trackId = track.key || track.url;
    const currentId = playingTrack ? (playingTrack.key || playingTrack.url) : null;

    if (currentId === trackId) {
      if (Platform.OS === "web" && audioRef.current) {
        if (!audioRef.current.paused) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play().catch((e) => console.log("[Audio] Resume error:", e));
          setIsPlaying(true);
        }
      } else {
        setIsPlaying((p) => !p);
      }
      return;
    }

    // 1. ONE-CLICK PLAY: Immediately update active/current track state
    setPlayingTrack(track);
    playingTrackRef.current = track;
    setIsPlaying(true);
    setIsBuffering(true);
    setAudioPos(0);
    setAudioDur(0);
    setSeekTarget(null);

    // 2. Direct Web Audio loading and playback in user event tick
    if (Platform.OS === "web") {
      let audio = audioRef.current;
      if (!audio && typeof document !== "undefined") {
        audio = document.createElement("audio");
        audio.preload = "auto";
        audioRef.current = audio;
        document.body.appendChild(audio);
      }

      if (audio) {
        const streamUrl = encodeURI(decodeURI(track.url.trim()));
        audio.src = streamUrl;
        audio.preload = "auto";
        audio.load();

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsBuffering(false);
              setIsPlaying(true);
            })
            .catch((err) => {
              console.log("[Audio] Direct play attempt deferred to canplay/loadeddata:", err);
              const onCanPlay = () => {
                audio?.play().catch((e) => console.log("[Audio] canplay play error:", e));
                audio?.removeEventListener("canplay", onCanPlay);
                audio?.removeEventListener("loadeddata", onCanPlay);
              };
              audio?.addEventListener("canplay", onCanPlay, { once: true });
              audio?.addEventListener("loadeddata", onCanPlay, { once: true });
            });
        }
      }
    }
  };

  const handleTogglePlayPause = () => {
    if (Platform.OS === "web" && audioRef.current) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch((e) => console.log("[Audio] Resume error:", e));
        setIsPlaying(true);
      }
    } else {
      setIsPlaying((p) => !p);
    }
  };

  const handleDownload = async (track: CloudflareR2Item) => {
    if (!track.url || !track.url.trim()) {
      toast.show("Download link not available", "info");
      return;
    }
    const cleanTitle = track.name
      ? track.name.replace(/\.[^/.]+$/, "")
      : (track.key ? track.key.split("/").pop()?.replace(/\.[^/.]+$/, "") : "Audio Track");
    const downloadUrl = encodeURI(decodeURI(track.url.trim()));

    toast.show(`Downloading: ${cleanTitle}`, "info");

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${cleanTitle}.mp3`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const ok = await Linking.canOpenURL(downloadUrl).catch(() => false);
    if (ok) {
      await Linking.openURL(downloadUrl);
    } else {
      const encoded = encodeURI(downloadUrl);
      await Linking.openURL(encoded).catch(() => {});
    }
  };

  // Timeline scrubber calculation
  const calculateSeekTarget = (evt: any) => {
    const totalW = trackLayoutRef.current.width || 300;
    let clickX = evt.nativeEvent.locationX ?? 0;
    const pageX = evt.nativeEvent.pageX;
    if (typeof pageX === "number" && trackLayoutRef.current.pageX > 0) {
      clickX = pageX - trackLayoutRef.current.pageX;
    }
    const ratio = Math.max(0, Math.min(1, clickX / totalW));
    const duration = audioDurRef.current || (audioRef.current?.duration || 0);
    if (duration > 0) {
      return ratio * duration;
    }
    return 0;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isScrubbingRef.current = true;
        setIsScrubbing(true);
        const target = calculateSeekTarget(evt);
        setScrubPos(target);
        if (audioRef.current && isFinite(target)) {
          audioRef.current.currentTime = target;
        }
      },
      onPanResponderMove: (evt) => {
        const target = calculateSeekTarget(evt);
        setScrubPos(target);
        if (audioRef.current && isFinite(target)) {
          audioRef.current.currentTime = target;
        }
      },
      onPanResponderRelease: (evt) => {
        const target = calculateSeekTarget(evt);
        setAudioPos(target);
        setSeekTarget(target);
        if (audioRef.current && isFinite(target)) {
          audioRef.current.currentTime = target;
        }
        isScrubbingRef.current = false;
        setIsScrubbing(false);
      },
      onPanResponderTerminate: () => {
        isScrubbingRef.current = false;
        setIsScrubbing(false);
      },
    })
  ).current;

  const handleSeekBackward = () => {
    const current = audioRef.current ? audioRef.current.currentTime : audioPos;
    const target = Math.max(0, current - 10);
    setAudioPos(target);
    setSeekTarget(target);
    if (audioRef.current && isFinite(target)) {
      audioRef.current.currentTime = target;
    }
  };

  const handleSeekForward = () => {
    const current = audioRef.current ? audioRef.current.currentTime : audioPos;
    const maxDur = audioDur > 0 ? audioDur : (audioRef.current?.duration || 3600);
    const target = Math.min(maxDur, current + 10);
    setAudioPos(target);
    setSeekTarget(target);
    if (audioRef.current && isFinite(target)) {
      audioRef.current.currentTime = target;
    }
  };

  // Filter tracks by search query if entered
  const visibleTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase().trim();
    return tracks.filter((t) => {
      const cleanTitle = (t.name || "").replace(/\.[^/.]+$/, "").toLowerCase();
      return cleanTitle.includes(q);
    });
  }, [tracks, searchQuery]);

  const visibleTracksRef = useRef(visibleTracks);
  visibleTracksRef.current = visibleTracks;

  const handleToggleAutoPlay = () => {
    setAutoPlay((prev) => {
      const next = !prev;
      toast.show(
        next
          ? "Auto-play: ON (Next track in list will play automatically)"
          : "Auto-play: OFF (Playback stops at end of song)",
        "info"
      );
      return next;
    });
  };

  // ── Auto-Play onEnded Handler ──
  const handleAudioEnded = () => {
    setIsBuffering(false);

    // 1. If Auto-Play is OFF: Simply stop playback at end of song
    if (!autoPlayRef.current) {
      setIsPlaying(false);
      return;
    }

    const currentTrack = playingTrackRef.current;
    if (!currentTrack) {
      setIsPlaying(false);
      return;
    }

    // 2. Continuous Playback: Next track from active playlist
    const playlist = visibleTracksRef.current.length > 0
      ? visibleTracksRef.current
      : tracksRef.current;

    if (!playlist || playlist.length === 0) {
      setIsPlaying(false);
      return;
    }

    const currentKey = currentTrack.key || currentTrack.url;
    const currentIdx = playlist.findIndex((t) => (t.key || t.url) === currentKey);

    // 3. Check if there is a next track in the currently active playlist
    if (currentIdx !== -1 && currentIdx < playlist.length - 1) {
      const nextTrack = playlist[currentIdx + 1];
      const nextTitle = (nextTrack.name || "").replace(/\.[^/.]+$/, "");
      toast.show(`Auto-playing next: ${nextTitle}`, "info");
      handlePlay(nextTrack);
    } else if (playlist.length > 0) {
      // Loop back to the first track so audio never stops abruptly
      const nextTrack = playlist[0];
      const nextTitle = (nextTrack.name || "").replace(/\.[^/.]+$/, "");
      toast.show(`Auto-playing: ${nextTitle}`, "info");
      handlePlay(nextTrack);
    } else {
      setIsPlaying(false);
      setAudioPos(0);
      setSeekTarget(0);
      toast.show("End of playlist reached", "info");
    }
  };

  handleAudioEndedRef.current = handleAudioEnded;

  const handleNextTrack = () => {
    const playlist = visibleTracksRef.current;
    if (!playingTrack || playlist.length === 0) return;
    const currentKey = playingTrack.key || playingTrack.url;
    const idx = playlist.findIndex((t) => (t.key || t.url) === currentKey);
    if (idx !== -1 && idx < playlist.length - 1) {
      handlePlay(playlist[idx + 1]);
    } else if (playlist.length > 0) {
      handlePlay(playlist[0]);
    }
  };

  const handlePreviousTrack = () => {
    const playlist = visibleTracksRef.current;
    if (!playingTrack || playlist.length === 0) return;
    const currentKey = playingTrack.key || playingTrack.url;
    const idx = playlist.findIndex((t) => (t.key || t.url) === currentKey);
    if (idx > 0) {
      handlePlay(playlist[idx - 1]);
    } else if (playlist.length > 0) {
      handlePlay(playlist[playlist.length - 1]);
    }
  };

  const fmtTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const activeAudioUrl = playingTrack ? playingTrack.url : "";
  const displayPos = isScrubbing ? scrubPos : audioPos;
  const progressPercent =
    audioDur > 0 ? Math.max(0, Math.min(100, (displayPos / audioDur) * 100)) : 0;

  const currentSubTabs = MEDIA_TABS_CONFIG[mainTab].subTabs;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary[700]]}
            tintColor={COLORS.primary[700]}
          />
        }
      >
        {/* ── [Header Card] ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <ListMusic color="#ffffff" size={22} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Rajayoga Audio Hub</Text>
            <Text style={styles.headerSub}>
              Spiritual Songs, Commentaries & Meditation Music
            </Text>
          </View>
          <Pressable
            style={styles.refreshBtn}
            onPress={handleRefresh}
            hitSlop={8}
            accessibilityLabel="Refresh Audio"
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw color={COLORS.primary[700]} size={16} strokeWidth={2.4} />
            </Animated.View>
          </Pressable>
        </View>

        {/* ── [1. TOP 4 MAIN TABS: CLEAN ENGLISH PILL CONTROL] ── */}
        <View style={styles.mainTabPillContainer}>
          {(Object.keys(MEDIA_TABS_CONFIG) as MainMediaTab[]).map((tabKey) => {
            const config = MEDIA_TABS_CONFIG[tabKey];
            const IconComponent = config.icon;
            const isActive = mainTab === tabKey;

            return (
              <Pressable
                key={tabKey}
                style={[
                  styles.mainTabPill,
                  isActive && styles.mainTabPillActive,
                ]}
                onPress={() => handleMainTabSelect(tabKey)}
                accessibilityRole="button"
                accessibilityLabel={config.label}
              >
                <IconComponent
                  color={isActive ? "#ffffff" : COLORS.primary[800]}
                  size={14}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <Text
                  style={[
                    styles.mainTabPillText,
                    isActive && styles.mainTabPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {config.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── [2. SECONDARY SUB-TAB STRIP: HORIZONTALLY SCROLLABLE] ── */}
        <View style={styles.subTabStripContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subTabScrollContent}
          >
            {currentSubTabs.map((sub) => {
              const isSubActive = subTab === sub.id;
              const count = isSubActive ? tracks.length : 0;

              return (
                <Pressable
                  key={sub.id}
                  style={[
                    styles.subTabChip,
                    isSubActive && styles.subTabChipActive,
                  ]}
                  onPress={() => handleSubTabSelect(sub.id)}
                  accessibilityRole="button"
                  accessibilityLabel={sub.label}
                >
                  <Text
                    style={[
                      styles.subTabChipText,
                      isSubActive && styles.subTabChipTextActive,
                    ]}
                  >
                    {sub.label}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.chipCountBadge,
                        isSubActive && styles.chipCountBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipCountText,
                          isSubActive && styles.chipCountTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                  {isSubActive && <View style={styles.subTabIndicator} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── [Search & Filter Bar] ── */}
        <View style={styles.searchBar}>
          <Search color={COLORS.neutral[400]} size={15} strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search in ${MEDIA_TABS_CONFIG[mainTab].label} - ${currentSubTabs.find((s) => s.id === subTab)?.label || ""}...`}
            placeholderTextColor={COLORS.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <X color={COLORS.neutral[400]} size={16} strokeWidth={2} />
            </Pressable>
          ) : (
            <Text style={styles.trackCountBadge}>{visibleTracks.length}</Text>
          )}
        </View>

        {/* ── [3. PERSISTENT FLOATING PLAYER CARD] ── */}
        {playingTrack && (
          <View style={styles.activePlayerCard}>
            <View style={styles.playerTopRow}>
              <View style={styles.playerInfo}>
                <View style={styles.nowPlayingBadge}>
                  <SoundwaveIndicator
                    isPlaying={isPlaying && !isBuffering}
                    color={COLORS.primary[700]}
                    size={12}
                  />
                  <Text style={styles.nowPlayingText}>
                    {isBuffering ? "BUFFERING STREAM..." : "NOW PLAYING"}
                  </Text>
                </View>
                <Text style={styles.activeTitle} numberOfLines={1}>
                  {playingTrack.name.replace(/\.[^/.]+$/, "")}
                </Text>
                <Text style={styles.activeSubtitle} numberOfLines={1}>
                  {playingTrack.key?.includes("/")
                    ? playingTrack.key.split("/")[0].toUpperCase()
                    : MEDIA_TABS_CONFIG[mainTab].label.toUpperCase()}
                </Text>
              </View>

              {/* Controls Group */}
              <View style={styles.playerControlsGroup}>
                <Pressable
                  style={({ pressed }) => [
                    styles.seekBtn,
                    pressed && styles.seekBtnPressed,
                  ]}
                  onPress={handleSeekBackward}
                  onLongPress={handlePreviousTrack}
                  accessibilityLabel="Rewind 10 seconds"
                >
                  <RotateCcw
                    color={COLORS.primary[700]}
                    size={14}
                    strokeWidth={2.3}
                  />
                  <Text style={styles.seekBtnText}>-10s</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.activePlayBtn,
                    pressed && styles.activePlayBtnPressed,
                  ]}
                  onPress={handleTogglePlayPause}
                  accessibilityLabel={isPlaying ? "Pause Audio" : "Play Audio"}
                >
                  {isBuffering ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : isPlaying && !audioFailed ? (
                    <Pause color="#ffffff" size={17} strokeWidth={2.4} />
                  ) : (
                    <Play
                      color="#ffffff"
                      size={17}
                      strokeWidth={2.4}
                      fill="#ffffff"
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.seekBtn,
                    pressed && styles.seekBtnPressed,
                  ]}
                  onPress={handleSeekForward}
                  onLongPress={handleNextTrack}
                  accessibilityLabel="Forward 10 seconds"
                >
                  <RotateCw
                    color={COLORS.primary[700]}
                    size={14}
                    strokeWidth={2.3}
                  />
                  <Text style={styles.seekBtnText}>+10s</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.playerDownloadBtn,
                    pressed && styles.seekBtnPressed,
                  ]}
                  onPress={() => handleDownload(playingTrack)}
                  accessibilityLabel="Download playing track"
                >
                  <Download
                    color={COLORS.primary[700]}
                    size={15}
                    strokeWidth={2.3}
                  />
                </Pressable>
              </View>
            </View>

            {/* Interactive Timeline Scrubber */}
            <View style={styles.progressWrap}>
              <View
                ref={progressAreaRef}
                style={styles.progressTouchArea}
                {...panResponder.panHandlers}
                onLayout={(e) => {
                  trackLayoutRef.current.width = e.nativeEvent.layout.width;
                  progressAreaRef.current?.measure?.((x, y, width, height, pageX, pageY) => {
                    if (pageX !== undefined && pageX > 0) {
                      trackLayoutRef.current.pageX = pageX;
                    }
                  });
                }}
              >
                <View style={styles.progressTrack} pointerEvents="none">
                  <View
                    style={[styles.progressFill, { width: `${progressPercent}%` }]}
                  />
                  <View
                    style={[
                      styles.progressThumb,
                      {
                        left: `${Math.min(98, Math.max(0, progressPercent))}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{fmtTime(displayPos)}</Text>

                {/* Subtle, Clean Auto-play Toggle Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.autoPlayToggleBtn,
                    autoPlay
                      ? styles.autoPlayToggleBtnActive
                      : styles.autoPlayToggleBtnInactive,
                    pressed && styles.actionPressed,
                  ]}
                  onPress={handleToggleAutoPlay}
                  hitSlop={8}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: autoPlay }}
                  accessibilityLabel={`Auto-play next track: ${autoPlay ? "On" : "Off"}`}
                >
                  <Repeat
                    size={11}
                    color={autoPlay ? "#ffffff" : COLORS.primary[700]}
                    strokeWidth={2.4}
                  />
                  <Text
                    style={[
                      styles.autoPlayToggleText,
                      autoPlay
                        ? styles.autoPlayToggleTextActive
                        : styles.autoPlayToggleTextInactive,
                    ]}
                  >
                    Auto-play
                  </Text>
                  <View
                    style={[
                      styles.autoPlayStatusBadge,
                      autoPlay
                        ? styles.autoPlayStatusBadgeActive
                        : styles.autoPlayStatusBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.autoPlayStatusBadgeText,
                        autoPlay
                          ? styles.autoPlayStatusBadgeTextActive
                          : styles.autoPlayStatusBadgeTextInactive,
                      ]}
                    >
                      {autoPlay ? "ON" : "OFF"}
                    </Text>
                  </View>
                </Pressable>

                <Text style={styles.timeText}>{fmtTime(audioDur)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── [4. AUDIO TRACKS LIST & SKELETONS] ── */}
        <View style={styles.listWrap}>
          {loading ? (
            // Animated Skeleton Loader
            [1, 2, 3, 4, 5].map((i) => (
              <Animated.View
                key={`skel_${i}`}
                style={[styles.skeletonRow, { opacity: skeletonPulse }]}
              >
                <View style={styles.skeletonNumber} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.skeletonTitle} />
                  <View style={styles.skeletonSub} />
                </View>
                <View style={styles.skeletonBtn} />
              </Animated.View>
            ))
          ) : visibleTracks.length === 0 ? (
            <View style={styles.emptyState}>
              <Music color={COLORS.neutral[300]} size={36} strokeWidth={2} />
              <Text style={styles.emptyText}>No tracks available in this category.</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? "Try clearing your search query"
                  : "Pull down to refresh audio"}
              </Text>
            </View>
          ) : (
            visibleTracks.map((track, idx) => {
              const trackKey = track.key || track.url;
              const isCurrent = (playingTrack?.key || playingTrack?.url) === trackKey;
              const showPause = isCurrent && isPlaying;
              const numberStr = String(idx + 1).padStart(2, "0");
              const displayTitle = track.name.replace(/\.[^/.]+$/, "");

              return (
                <View
                  key={trackKey}
                  style={[styles.listRow, isCurrent && styles.listRowActive]}
                >
                  <Pressable
                    style={styles.rowLeft}
                    onPress={() => handlePlay(track)}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${displayTitle}`}
                  >
                    {/* Number / Soundwave Indicator Badge */}
                    <View
                      style={[
                        styles.numberBadge,
                        isCurrent && styles.numberBadgeActive,
                      ]}
                    >
                      {isCurrent && isPlaying ? (
                        <SoundwaveIndicator
                          isPlaying={true}
                          color="#ffffff"
                          size={13}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.numberBadgeText,
                            isCurrent && styles.numberBadgeTextActive,
                          ]}
                        >
                          {numberStr}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text
                        style={[
                          styles.rowTitle,
                          isCurrent && styles.rowTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {displayTitle}
                      </Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {MEDIA_TABS_CONFIG[mainTab].label}
                        {` • ${currentSubTabs.find((s) => s.id === subTab)?.label || ""}`}
                      </Text>
                    </View>
                  </Pressable>

                  <View style={styles.rowActions}>
                    {/* Circular Play Button */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.redPlayBtn,
                        isCurrent && styles.redPlayBtnActive,
                        pressed && styles.actionPressed,
                      ]}
                      onPress={() => handlePlay(track)}
                      hitSlop={8}
                      accessibilityLabel={`Play ${displayTitle}`}
                    >
                      {isCurrent && isBuffering ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : showPause ? (
                        <Pause color="#ffffff" size={15} strokeWidth={2.4} />
                      ) : (
                        <Play
                          color="#ffffff"
                          size={14}
                          strokeWidth={2.4}
                          fill="#ffffff"
                          style={{ marginLeft: 2 }}
                        />
                      )}
                    </Pressable>

                    {/* Direct Download Button */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.downloadIconBtn,
                        pressed && styles.actionPressed,
                      ]}
                      onPress={() => handleDownload(track)}
                      hitSlop={8}
                      accessibilityLabel={`Download ${displayTitle}`}
                    >
                      <Download
                        color={COLORS.primary[700]}
                        size={15}
                        strokeWidth={2.2}
                      />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Global Continuous Playback Audio Engine (Native Expo-AV) */}
        {Platform.OS !== "web" && activeAudioUrl ? (
          <AudioPlayer
            url={activeAudioUrl}
            isPlaying={isPlaying}
            seekTo={seekTarget}
            onSeeked={() => setSeekTarget(null)}
            onTimeUpdate={setAudioPos}
            onDurationChange={setAudioDur}
            onBufferingChange={setIsBuffering}
            onEnded={handleAudioEnded}
            onError={() => {
              setIsPlaying(false);
              setIsBuffering(false);
              setAudioFailed(true);
            }}
          />
        ) : null}

        <View style={{ height: SPACING["3xl"] }} />
      </ScrollView>
    </View>
  );
}

export { MediaScreen };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F5",
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 85,
    gap: SPACING.sm,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.2,
    borderColor: "rgba(212, 175, 55, 0.25)",
    ...SHADOWS.sm,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary[100],
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[700],
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: "#D4AF37",
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: FONTS.sansBold,
    color: COLORS.neutral[900],
  },
  headerSub: {
    fontSize: 11,
    fontFamily: FONTS.sans,
    color: COLORS.neutral[500],
    marginTop: 2,
  },

  // ── 1. Top 4 Main Tabs: Segmented Pill Control ──
  mainTabPillContainer: {
    flexDirection: "row",
    backgroundColor: "#f5ece1",
    borderRadius: RADIUS.xl,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.35)",
    ...SHADOWS.sm,
  },
  mainTabPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: RADIUS.lg,
    gap: 5,
  },
  mainTabPillActive: {
    backgroundColor: COLORS.primary[700],
    shadowColor: "#8B0000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  mainTabPillText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
    color: COLORS.primary[900],
    letterSpacing: 0.1,
  },
  mainTabPillTextActive: {
    color: "#ffffff",
    fontFamily: FONTS.sansBold,
  },

  // ── 2. Horizontally Scrollable Sub-Tab Strip ──
  subTabStripContainer: {
    marginVertical: 2,
  },
  subTabScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  subTabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: "#e8dfd1",
    position: "relative",
    gap: 6,
    ...SHADOWS.sm,
  },
  subTabChipActive: {
    backgroundColor: "#fff7ed",
    borderColor: "#D4AF37",
    borderWidth: 1.3,
  },
  subTabChipText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: COLORS.neutral[600],
    letterSpacing: 0.1,
  },
  subTabChipTextActive: {
    fontFamily: FONTS.sansBold,
    color: COLORS.primary[800],
  },
  chipCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    backgroundColor: "#f5f0e8",
  },
  chipCountBadgeActive: {
    backgroundColor: "rgba(212, 175, 55, 0.2)",
  },
  chipCountText: {
    fontSize: 10,
    fontFamily: FONTS.sansSemiBold,
    color: COLORS.neutral[500],
  },
  chipCountTextActive: {
    color: COLORS.primary[800],
  },
  subTabIndicator: {
    position: "absolute",
    bottom: -1,
    left: "30%",
    right: "30%",
    height: 2,
    borderRadius: 1,
    backgroundColor: "#D4AF37",
  },

  // ── Search & Filter Bar ──
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#ebe4d8",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.sans,
    color: COLORS.neutral[900],
    paddingVertical: 0,
  },
  trackCountBadge: {
    fontSize: 10.5,
    fontFamily: FONTS.sansSemiBold,
    color: COLORS.neutral[400],
    backgroundColor: "#f5f0e8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },

  // ── Persistent Floating Player Card ──
  activePlayerCard: {
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: "#D4AF37",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  playerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  playerInfo: {
    flex: 1,
    paddingRight: 10,
  },
  nowPlayingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  nowPlayingText: {
    fontFamily: FONTS.sansBold,
    fontSize: 9.5,
    color: COLORS.primary[700],
    letterSpacing: 0.8,
  },
  activeTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: COLORS.neutral[900],
  },
  activeSubtitle: {
    fontFamily: FONTS.sansMedium,
    fontSize: 10.5,
    color: COLORS.neutral[500],
    marginTop: 1,
  },
  playerControlsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  seekBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.md,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.primary[100],
  },
  seekBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  seekBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    color: COLORS.primary[700],
    marginTop: 1,
  },
  activePlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary[700],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#D4AF37",
    shadowColor: COLORS.primary[700],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  activePlayBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  playerDownloadBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary[100],
  },

  // ── Timeline Scrubber ──
  progressWrap: {
    marginTop: 4,
  },
  progressTouchArea: {
    paddingVertical: 8,
    justifyContent: "center",
  },
  progressTrack: {
    height: 4.5,
    borderRadius: 3,
    backgroundColor: COLORS.neutral[200],
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: COLORS.primary[700],
  },
  progressThumb: {
    position: "absolute",
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ffffff",
    borderWidth: 2.5,
    borderColor: COLORS.primary[700],
    marginLeft: -7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  timeText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: COLORS.neutral[400],
  },
  autoPlayToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  autoPlayToggleBtnInactive: {
    backgroundColor: "#FAF5EE",
    borderColor: "rgba(212, 175, 55, 0.35)",
  },
  autoPlayToggleBtnActive: {
    backgroundColor: COLORS.primary[700],
    borderColor: "#D4AF37",
    shadowColor: COLORS.primary[700],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  autoPlayToggleText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 9.5,
    letterSpacing: 0.2,
  },
  autoPlayToggleTextInactive: {
    color: COLORS.primary[900],
  },
  autoPlayToggleTextActive: {
    color: "#ffffff",
  },
  autoPlayStatusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  autoPlayStatusBadgeInactive: {
    backgroundColor: "rgba(139, 0, 0, 0.08)",
  },
  autoPlayStatusBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  autoPlayStatusBadgeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 8,
    letterSpacing: 0.3,
  },
  autoPlayStatusBadgeTextInactive: {
    color: COLORS.primary[800],
  },
  autoPlayStatusBadgeTextActive: {
    color: "#ffffff",
  },

  // ── Track List Rows ──
  listWrap: {
    gap: 7,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ebe4d8",
    ...SHADOWS.sm,
  },
  listRowActive: {
    borderColor: "#D4AF37",
    backgroundColor: "#fffdf9",
    borderWidth: 1.3,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f5f0e8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e5ddcf",
  },
  numberBadgeActive: {
    backgroundColor: COLORS.primary[700],
    borderColor: "#D4AF37",
  },
  numberBadgeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10.5,
    color: COLORS.neutral[600],
  },
  numberBadgeTextActive: {
    color: "#ffffff",
  },
  rowTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    color: COLORS.neutral[900],
    lineHeight: 18,
  },
  rowTitleActive: {
    color: COLORS.primary[800],
    fontFamily: FONTS.sansBold,
  },
  rowSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 10.5,
    color: COLORS.neutral[400],
    marginTop: 1,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  redPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary[700],
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.sm,
  },
  redPlayBtnActive: {
    backgroundColor: COLORS.primary[800],
    borderWidth: 1.5,
    borderColor: "#D4AF37",
  },
  downloadIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f0e8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5ddcf",
  },
  actionPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },

  // ── Skeleton Loader Rows ──
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#f0ebe1",
    gap: 10,
  },
  skeletonNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e8dfd1",
  },
  skeletonTitle: {
    height: 12,
    width: "70%",
    borderRadius: 6,
    backgroundColor: "#e8dfd1",
  },
  skeletonSub: {
    height: 9,
    width: "40%",
    borderRadius: 5,
    backgroundColor: "#f0ebe1",
  },
  skeletonBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e8dfd1",
  },

  // ── Empty State ──
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.lg,
    padding: SPACING["2xl"],
    gap: 8,
    borderWidth: 1,
    borderColor: "#ebe4d8",
  },
  emptyText: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: COLORS.neutral[800],
  },
  emptySub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.neutral[400],
    textAlign: "center",
  },
});
