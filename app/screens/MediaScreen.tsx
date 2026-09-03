import React, { useEffect, useRef, useState, useMemo } from "react";
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
  Disc,
} from "lucide-react-native";
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from "@/lib/theme";
import { useToast } from "@/components/ToastProvider";
import {
  MediaTrack,
  MASTER_COMMENTARY_TRACKS,
  SHEEBA_SISTER_COMMENTARIES,
  SHEEJA_SISTER_COMMENTARIES,
  OTHERS_COMMENTARIES,
  OM_DHWANI_TRACKS,
  OM_AND_BHORG_TRACKS,
  OWN_TUNES_TRACKS,
  FUNCTION_MUSIC_TRACKS,
  OWN_MUSIC_TRACKS,
  HINDI_RINGTONES,
  MALAYALAM_RINGTONES,
} from "@/constants/mediaTracks";
import {
  fetchAllCloudinaryAudioTabs,
  getCachedCloudinaryCategory,
} from "@/services/audioService";
import { cleanMediaTitle, getCloudinaryDownloadUrl } from "@/services/mediaService";
import { AudioPlayer } from "@/components/AudioPlayer";
import { SoundwaveIndicator } from "@/components/SoundwaveIndicator";

// ── Tab Type Definitions ───────────────────────────────────────────────
export type MainMediaTab = "songs" | "commentary" | "music" | "ringtones";

export interface SubTabItem {
  id: string;
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
      { id: "hindi", label: "Hindi" },
      { id: "malayalam", label: "Malayalam" },
      { id: "om_and_bhorg", label: "Om and Bhorg" },
      { id: "own_tunes", label: "Own Tunes" },
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
      { id: "meditation_music", label: "Meditation Music" },
      { id: "function_music", label: "Function Music" },
      { id: "own_music", label: "Own Music" },
    ],
  },
  ringtones: {
    label: "Ringtones",
    icon: Volume2,
    subTabs: [
      { id: "hindi", label: "Hindi" },
      { id: "malayalam", label: "Malayalam" },
    ],
  },
};

export default function MediaScreen() {
  const toast = useToast();

  // Active Main & Sub Tab State
  const [mainTab, setMainTab] = useState<MainMediaTab>("songs");
  const [subTab, setSubTab] = useState<string>("hindi");
  const [searchQuery, setSearchQuery] = useState("");

  // Track lists initialized synchronously from cache for instant 0ms rendering
  const [malayalamTracks, setMalayalamTracks] = useState<MediaTrack[]>(() =>
    getCachedCloudinaryCategory("malayalam")
  );
  const [hindiTracks, setHindiTracks] = useState<MediaTrack[]>(() =>
    getCachedCloudinaryCategory("hindi")
  );
  const [musicTracks, setMusicTracks] = useState<MediaTrack[]>(() =>
    getCachedCloudinaryCategory("music")
  );
  const [commentaryTracks, setCommentaryTracks] = useState<MediaTrack[]>(
    MASTER_COMMENTARY_TRACKS
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Global Audio Player State (Uninterrupted across tab switches)
  const [playingTrack, setPlayingTrack] = useState<MediaTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [audioPos, setAudioPos] = useState(0);
  const [audioDur, setAudioDur] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);

  // Drag & scrub state for audio timeline
  const isScrubbingRef = useRef(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);
  const audioDurRef = useRef(0);
  audioDurRef.current = audioDur;

  const trackLayoutRef = useRef<{ width: number; pageX: number }>({
    width: 300,
    pageX: 0,
  });

  // Load latest Cloudinary audio lists in background
  useEffect(() => {
    let isMounted = true;
    fetchAllCloudinaryAudioTabs()
      .then((data) => {
        if (!isMounted) return;
        if (data.malayalam.length > 0) setMalayalamTracks(data.malayalam);
        if (data.hindi.length > 0) setHindiTracks(data.hindi);
        if (data.music.length > 0) setMusicTracks(data.music);
        if (data.commentary.length > 0) setCommentaryTracks(data.commentary);
      })
      .catch((err) => console.warn("[MediaScreen] Background sync error:", err));

    return () => {
      isMounted = false;
    };
  }, []);

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
      const data = await fetchAllCloudinaryAudioTabs(true);
      if (data.malayalam.length > 0) setMalayalamTracks(data.malayalam);
      if (data.hindi.length > 0) setHindiTracks(data.hindi);
      if (data.music.length > 0) setMusicTracks(data.music);
      if (data.commentary.length > 0) setCommentaryTracks(data.commentary);
      toast.show("Audio playlists refreshed", "success");
    } catch {
      toast.show("Loaded cached audio files", "info");
    } finally {
      setIsRefreshing(false);
      spinAnim.setValue(0);
    }
  };

  const handleMainTabSelect = (newMainTab: MainMediaTab) => {
    if (newMainTab === mainTab) return;
    setMainTab(newMainTab);
    const firstSub = MEDIA_TABS_CONFIG[newMainTab].subTabs[0]?.id || "";
    setSubTab(firstSub);
    setSearchQuery("");
  };

  const handleSubTabSelect = (newSubTab: string) => {
    if (newSubTab === subTab) return;
    setSubTab(newSubTab);
    setSearchQuery("");
  };

  const handlePlay = (track: MediaTrack) => {
    if (!track.url || !track.url.trim()) {
      toast.show("Audio stream not available", "info");
      return;
    }
    setAudioFailed(false);
    if (playingTrack?.id === track.id) {
      setIsPlaying((p) => !p);
    } else {
      setPlayingTrack(track);
      setIsPlaying(true);
      setIsBuffering(true);
      setAudioPos(0);
      setAudioDur(0);
      setSeekTarget(null);
    }
  };

  const handleDownload = async (track: MediaTrack) => {
    if (!track.url || !track.url.trim()) {
      toast.show("Download link not available", "info");
      return;
    }
    const cleanTitle = cleanMediaTitle(track.title);
    const downloadUrl = getCloudinaryDownloadUrl(track.url);

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
      await Linking.openURL(track.url);
    }
  };

  // Timeline scrubber calculation
  const calculateSeekTarget = (clientXorLocationX: number, isPageCoords = false) => {
    const totalW = trackLayoutRef.current.width || 300;
    const clickX = isPageCoords
      ? clientXorLocationX - trackLayoutRef.current.pageX
      : clientXorLocationX;
    const ratio = Math.max(0, Math.min(1, clickX / totalW));
    const duration = audioDurRef.current;
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
        const target = calculateSeekTarget(evt.nativeEvent.locationX);
        setScrubPos(target);
      },
      onPanResponderMove: (evt) => {
        const target = calculateSeekTarget(evt.nativeEvent.locationX);
        setScrubPos(target);
      },
      onPanResponderRelease: (evt) => {
        const target = calculateSeekTarget(evt.nativeEvent.locationX);
        setAudioPos(target);
        setSeekTarget(target);
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
    const target = Math.max(0, audioPos - 10);
    setAudioPos(target);
    setSeekTarget(target);
  };

  const handleSeekForward = () => {
    const maxDur = audioDur > 0 ? audioDur : 3600;
    const target = Math.min(maxDur, audioPos + 10);
    setAudioPos(target);
    setSeekTarget(target);
  };

  // Resolve tracks for the active sub-tab
  const activeSubTabTracks = useMemo((): MediaTrack[] => {
    switch (mainTab) {
      case "songs": {
        if (subTab === "hindi") return hindiTracks;
        if (subTab === "malayalam") return malayalamTracks;
        if (subTab === "om_and_bhorg" || subTab === "om_dhwani") {
          const cldOm = musicTracks.filter((t) =>
            /omdhvani|om\s*dhwani|omkar|bhog|bhorg/i.test(t.title || t.url)
          );
          const list = [...OM_AND_BHORG_TRACKS];
          cldOm.forEach((c) => {
            if (!list.some((t) => t.url === c.url || t.title === c.title)) {
              list.unshift(c);
            }
          });
          return list;
        }
        if (subTab === "own_tunes") return OWN_TUNES_TRACKS;
        return hindiTracks;
      }
      case "commentary": {
        if (subTab === "sheeba_sister") {
          const list = commentaryTracks.filter(
            (t) =>
              /sheeba/i.test(t.title) ||
              /sheeba/i.test(t.url) ||
              t.subCategory === "sheeba_sister" ||
              t.speaker?.includes("Sheeba")
          );
          return list.length > 0 ? list : SHEEBA_SISTER_COMMENTARIES;
        }
        if (subTab === "sheeja_sister") {
          const list = commentaryTracks.filter(
            (t) =>
              /sheeja/i.test(t.title) ||
              /sheeja/i.test(t.url) ||
              t.subCategory === "sheeja_sister" ||
              t.speaker?.includes("Sheeja")
          );
          return list.length > 0 ? list : SHEEJA_SISTER_COMMENTARIES;
        }
        if (subTab === "others") {
          const list = commentaryTracks.filter(
            (t) =>
              !/sheeba/i.test(t.title) &&
              !/sheeba/i.test(t.url) &&
              !/sheeja/i.test(t.title) &&
              !/sheeja/i.test(t.url) &&
              t.subCategory !== "sheeba_sister" &&
              t.subCategory !== "sheeja_sister"
          );
          return list.length > 0 ? list : OTHERS_COMMENTARIES;
        }
        return SHEEBA_SISTER_COMMENTARIES;
      }
      case "music": {
        if (subTab === "meditation_music" || subTab === "music") {
          const list = musicTracks.filter(
            (t) => !/omdhvani|om\s*dhwani/i.test(t.title || t.url)
          );
          return list.length > 0 ? list : musicTracks;
        }
        if (subTab === "function_music") {
          return FUNCTION_MUSIC_TRACKS;
        }
        if (subTab === "own_music") return OWN_MUSIC_TRACKS;
        return musicTracks;
      }
      case "ringtones": {
        if (subTab === "hindi") return HINDI_RINGTONES;
        if (subTab === "malayalam") return MALAYALAM_RINGTONES;
        return HINDI_RINGTONES;
      }
      default:
        return hindiTracks;
    }
  }, [mainTab, subTab, hindiTracks, malayalamTracks, musicTracks, commentaryTracks]);

  // Filter tracks by search query if entered
  const visibleTracks = useMemo(() => {
    if (!searchQuery.trim()) return activeSubTabTracks;
    const q = searchQuery.toLowerCase().trim();
    return activeSubTabTracks.filter((t) => {
      const title = cleanMediaTitle(t.title).toLowerCase();
      const speaker = (t.speaker || "").toLowerCase();
      return title.includes(q) || speaker.includes(q);
    });
  }, [activeSubTabTracks, searchQuery]);

  const handleNextTrack = () => {
    if (!playingTrack || visibleTracks.length === 0) return;
    const idx = visibleTracks.findIndex((t) => t.id === playingTrack.id);
    if (idx !== -1 && idx < visibleTracks.length - 1) {
      handlePlay(visibleTracks[idx + 1]);
    } else if (visibleTracks.length > 0) {
      handlePlay(visibleTracks[0]);
    }
  };

  const handlePreviousTrack = () => {
    if (!playingTrack || visibleTracks.length === 0) return;
    const idx = visibleTracks.findIndex((t) => t.id === playingTrack.id);
    if (idx > 0) {
      handlePlay(visibleTracks[idx - 1]);
    } else if (visibleTracks.length > 0) {
      handlePlay(visibleTracks[visibleTracks.length - 1]);
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
                  {cleanMediaTitle(playingTrack.title)}
                </Text>
                <Text style={styles.activeSubtitle} numberOfLines={1}>
                  {playingTrack.speaker ||
                    playingTrack.category.toUpperCase()}
                  {playingTrack.subCategory
                    ? ` • ${playingTrack.subCategory.replace("_", " ").toUpperCase()}`
                    : ""}
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
                  onPress={() => setIsPlaying(!isPlaying)}
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
                style={styles.progressTouchArea}
                {...panResponder.panHandlers}
                onLayout={(e) => {
                  trackLayoutRef.current.width = e.nativeEvent.layout.width;
                }}
              >
                <View style={styles.progressTrack}>
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
                <Text style={styles.timeText}>{fmtTime(audioDur)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── [4. AUDIO TRACKS LIST] ── */}
        <View style={styles.listWrap}>
          {visibleTracks.length === 0 ? (
            <View style={styles.emptyState}>
              <Music color={COLORS.neutral[300]} size={36} strokeWidth={2} />
              <Text style={styles.emptyText}>No tracks found in this category</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? "Try clearing your search query"
                  : "Pull down to refresh from Cloudinary"}
              </Text>
            </View>
          ) : (
            visibleTracks.map((track, idx) => {
              const isCurrent = playingTrack?.id === track.id;
              const showPause = isCurrent && isPlaying;
              const numberStr = String(idx + 1).padStart(2, "0");
              const displayTitle = cleanMediaTitle(track.title);

              return (
                <View
                  key={track.id}
                  style={[styles.listRow, isCurrent && styles.listRowActive]}
                >
                  <View style={styles.rowLeft}>
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
                        {track.speaker ||
                          MEDIA_TABS_CONFIG[mainTab].label.toUpperCase()}
                        {track.subCategory
                          ? ` • ${track.subCategory.replace("_", " ").toUpperCase()}`
                          : ""}
                      </Text>
                    </View>
                  </View>

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

        {/* Global Continuous Playback Audio Engine */}
        {activeAudioUrl ? (
          <AudioPlayer
            url={activeAudioUrl}
            isPlaying={isPlaying}
            seekTo={seekTarget}
            onSeeked={() => setSeekTarget(null)}
            onTimeUpdate={setAudioPos}
            onDurationChange={setAudioDur}
            onBufferingChange={setIsBuffering}
            onEnded={() => {
              setIsPlaying(false);
              setIsBuffering(false);
            }}
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
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: "#e8dfd1",
    position: "relative",
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
    justifyContent: "space-between",
    marginTop: -2,
  },
  timeText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: COLORS.neutral[400],
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

export { MediaScreen };
