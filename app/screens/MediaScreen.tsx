import React, { useEffect, useRef, useState } from "react";
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
  View,
} from "react-native";
import {
  Music,
  Play,
  Pause,
  Download,
  Volume2,
  ListMusic,
  Radio,
  Disc,
  RotateCcw,
  RotateCw,
  Sparkles,
  RefreshCw,
} from "lucide-react-native";
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from "@/lib/theme";
import { useToast } from "@/components/ToastProvider";
import {
  MediaTrack,
  MASTER_COMMENTARY_TRACKS,
} from "@/constants/mediaTracks";
import {
  AudioCategoryTab,
  fetchAllCloudinaryAudioTabs,
  getCachedCloudinaryCategory,
} from "@/services/audioService";
import { cleanMediaTitle, getCloudinaryDownloadUrl } from "@/services/mediaService";
import { AudioPlayer } from "@/components/AudioPlayer";
import { SoundwaveIndicator } from "@/components/SoundwaveIndicator";

export default function MediaScreen() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<AudioCategoryTab>("malayalam");

  // Track lists initialized synchronously from cache for 0ms load delay
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

  // Player State
  const [playingTrack, setPlayingTrack] = useState<MediaTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [audioPos, setAudioPos] = useState(0);
  const [audioDur, setAudioDur] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);

  // Drag & scrub state
  const isScrubbingRef = useRef(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);
  const audioDurRef = useRef(0);
  audioDurRef.current = audioDur;

  const trackLayoutRef = useRef<{ width: number; pageX: number }>({ width: 300, pageX: 0 });

  // Load latest Cloudinary audio lists in background
  useEffect(() => {
    let isMounted = true;
    fetchAllCloudinaryAudioTabs()
      .then((data) => {
        if (!isMounted) return;
        if (data.malayalam.length > 0) setMalayalamTracks(data.malayalam);
        if (data.hindi.length > 0) setHindiTracks(data.hindi);
        if (data.music.length > 0) setMusicTracks(data.music);
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
      toast.show("ഓഡിയോ പ്ലേലിസ്റ്റുകൾ പുതുക്കി (Refreshed)", "success");
    } catch {
      toast.show("Loaded cached audio files", "info");
    } finally {
      setIsRefreshing(false);
      spinAnim.setValue(0);
    }
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

  const calculateSeekTarget = (clientXorLocationX: number, isPageCoords = false) => {
    const totalW = trackLayoutRef.current.width || 300;
    const clickX = isPageCoords ? clientXorLocationX - trackLayoutRef.current.pageX : clientXorLocationX;
    const ratio = Math.max(0, Math.min(1, clickX / totalW));
    const duration = audioDurRef.current;
    if (duration > 0) {
      return ratio * duration;
    }
    return 0;
  };

  // PanResponder for smooth touch seeking and dragging
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

  // Current active track list based on selected category tab
  const getVisibleTracks = (): MediaTrack[] => {
    switch (activeTab) {
      case "malayalam":
        return malayalamTracks;
      case "hindi":
        return hindiTracks;
      case "music":
        return musicTracks;
      case "commentary":
        return commentaryTracks;
      default:
        return malayalamTracks;
    }
  };

  const visibleTracks = getVisibleTracks();

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
  const progressPercent = audioDur > 0 ? Math.max(0, Math.min(100, (displayPos / audioDur) * 100)) : 0;

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
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <ListMusic color="#ffffff" size={24} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Rajayoga Audio Repository</Text>
            <Text style={styles.headerSub}>
              Spiritual Songs & Commentaries
            </Text>
          </View>
          <Pressable
            style={styles.refreshBtn}
            onPress={handleRefresh}
            hitSlop={8}
            accessibilityLabel="Refresh Playlists"
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw color={COLORS.primary[700]} size={16} strokeWidth={2.4} />
            </Animated.View>
          </Pressable>
        </View>

        {/* ── [DYNAMIC 4 PURE AUDIO TABS: MALAYALAM, HINDI, MUSIC, COMMENTARIES] ── */}
        {/* ── [DYNAMIC 4 PURE AUDIO TABS: MALAYALAM, HINDI, MUSIC, COMMENTARIES] ── */}
        <View style={styles.mainTabBar}>
          {/* Tab 1: Malayalam Songs (മലയാളം ഗാനങ്ങൾ) */}
          <Pressable
            style={({ pressed }) => [
              styles.mainTabBtn,
              activeTab === "malayalam" && styles.mainTabBtnActive,
              pressed && styles.tabPressed,
            ]}
            onPress={() => setActiveTab("malayalam")}
            accessibilityLabel="Malayalam Songs"
          >
            <Music
              color={activeTab === "malayalam" ? "#ffffff" : COLORS.primary[700]}
              size={15}
              strokeWidth={activeTab === "malayalam" ? 2.4 : 2}
            />
            <View style={styles.mainTabLabelWrap}>
              <Text style={[styles.mainTabTitle, activeTab === "malayalam" && styles.mainTabTitleActive]} numberOfLines={1}>
                മലയാളം ഗാനങ്ങൾ
              </Text>
              <Text style={[styles.mainTabSub, activeTab === "malayalam" && styles.mainTabSubActive]}>
                {malayalamTracks.length} Songs
              </Text>
            </View>
          </Pressable>

          {/* Tab 2: Hindi Songs (ഹിന്ദി ഗാനങ്ങൾ) */}
          <Pressable
            style={({ pressed }) => [
              styles.mainTabBtn,
              activeTab === "hindi" && styles.mainTabBtnActive,
              pressed && styles.tabPressed,
            ]}
            onPress={() => setActiveTab("hindi")}
            accessibilityLabel="Hindi Songs"
          >
            <Disc
              color={activeTab === "hindi" ? "#ffffff" : COLORS.primary[700]}
              size={15}
              strokeWidth={activeTab === "hindi" ? 2.4 : 2}
            />
            <View style={styles.mainTabLabelWrap}>
              <Text style={[styles.mainTabTitle, activeTab === "hindi" && styles.mainTabTitleActive]} numberOfLines={1}>
                ഹിന്ദി ഗാനങ്ങൾ
              </Text>
              <Text style={[styles.mainTabSub, activeTab === "hindi" && styles.mainTabSubActive]}>
                {hindiTracks.length} Songs
              </Text>
            </View>
          </Pressable>

          {/* Tab 3: Music */}
          <Pressable
            style={({ pressed }) => [
              styles.mainTabBtn,
              activeTab === "music" && styles.mainTabBtnActive,
              pressed && styles.tabPressed,
            ]}
            onPress={() => setActiveTab("music")}
            accessibilityLabel="Music"
          >
            <Sparkles
              color={activeTab === "music" ? "#ffffff" : COLORS.primary[700]}
              size={15}
              strokeWidth={activeTab === "music" ? 2.4 : 2}
            />
            <View style={styles.mainTabLabelWrap}>
              <Text style={[styles.mainTabTitle, activeTab === "music" && styles.mainTabTitleActive]} numberOfLines={1}>
                Music
              </Text>
              <Text style={[styles.mainTabSub, activeTab === "music" && styles.mainTabSubActive]}>
                {musicTracks.length} Tracks
              </Text>
            </View>
          </Pressable>

          {/* Tab 4: Commentaries (കമന്ററികൾ) */}
          <Pressable
            style={({ pressed }) => [
              styles.mainTabBtn,
              activeTab === "commentary" && styles.mainTabBtnActive,
              pressed && styles.tabPressed,
            ]}
            onPress={() => setActiveTab("commentary")}
            accessibilityLabel="Commentaries"
          >
            <Radio
              color={activeTab === "commentary" ? "#ffffff" : COLORS.primary[700]}
              size={15}
              strokeWidth={activeTab === "commentary" ? 2.4 : 2}
            />
            <View style={styles.mainTabLabelWrap}>
              <Text style={[styles.mainTabTitle, activeTab === "commentary" && styles.mainTabTitleActive]} numberOfLines={1}>
                കമന്ററികൾ
              </Text>
              <Text style={[styles.mainTabSub, activeTab === "commentary" && styles.mainTabSubActive]}>
                {commentaryTracks.length} Yoga
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Persistent Floating Player Card (if a track is selected) */}
        {playingTrack && (
          <View style={styles.activePlayerCard}>
            <View style={styles.playerTopRow}>
              <View style={styles.playerInfo}>
                <View style={styles.nowPlayingBadge}>
                  <SoundwaveIndicator isPlaying={isPlaying && !isBuffering} color={COLORS.primary[700]} size={12} />
                  <Text style={styles.nowPlayingText}>
                    {isBuffering ? "BUFFERING STREAM..." : "NOW PLAYING"}
                  </Text>
                </View>
                <Text style={styles.activeTitle} numberOfLines={1}>
                  {cleanMediaTitle(playingTrack.title)}
                </Text>
                <Text style={styles.activeSubtitle} numberOfLines={1}>
                  {playingTrack.category.toUpperCase()} {playingTrack.subCategory ? `• ${playingTrack.subCategory.toUpperCase()}` : ""}
                </Text>
              </View>

              {/* Player Controls Group with Backward (-10s), Play/Pause, and Forward (+10s) */}
              <View style={styles.playerControlsGroup}>
                <Pressable
                  style={({ pressed }) => [styles.seekBtn, pressed && styles.seekBtnPressed]}
                  onPress={handleSeekBackward}
                  onLongPress={handlePreviousTrack}
                  accessibilityLabel="Rewind 10 seconds"
                >
                  <RotateCcw color={COLORS.primary[700]} size={15} strokeWidth={2.3} />
                  <Text style={styles.seekBtnText}>-10s</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.activePlayBtn, pressed && styles.activePlayBtnPressed]}
                  onPress={() => setIsPlaying(!isPlaying)}
                  accessibilityLabel={isPlaying ? "Pause Audio" : "Play Audio"}
                >
                  {isBuffering ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : isPlaying && !audioFailed ? (
                    <Pause color="#ffffff" size={18} strokeWidth={2.4} />
                  ) : (
                    <Play color="#ffffff" size={18} strokeWidth={2.4} fill="#ffffff" style={{ marginLeft: 2 }} />
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.seekBtn, pressed && styles.seekBtnPressed]}
                  onPress={handleSeekForward}
                  onLongPress={handleNextTrack}
                  accessibilityLabel="Forward 10 seconds"
                >
                  <RotateCw color={COLORS.primary[700]} size={15} strokeWidth={2.3} />
                  <Text style={styles.seekBtnText}>+10s</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.playerDownloadBtn, pressed && styles.seekBtnPressed]}
                  onPress={() => handleDownload(playingTrack)}
                  accessibilityLabel="Download playing track"
                >
                  <Download color={COLORS.primary[700]} size={15} strokeWidth={2.3} />
                </Pressable>
              </View>
            </View>

            {/* Interactive Progress Bar Scrubber with Touch / Click PanResponder */}
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
                    style={[
                      styles.progressFill,
                      { width: `${progressPercent}%` },
                    ]}
                  />
                  {/* Interactive Thumb Knob */}
                  <View
                    style={[
                      styles.progressThumb,
                      { left: `${Math.min(98, Math.max(0, progressPercent))}%` },
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

        {/* Pure Audio Item List */}
        <View style={styles.listWrap}>
          {visibleTracks.length === 0 ? (
            <View style={styles.emptyState}>
              <Music color={COLORS.neutral[300]} size={36} strokeWidth={2} />
              <Text style={styles.emptyText}>No tracks loaded in this category</Text>
              <Text style={styles.emptySub}>Pull down to refresh from Cloudinary CDN</Text>
            </View>
          ) : (
            visibleTracks.map((track, idx) => {
              const isCurrent = playingTrack?.id === track.id;
              const showPause = isCurrent && isPlaying;
              const numberStr = String(idx + 1).padStart(2, "0");
              const displayTitle = cleanMediaTitle(track.title);

              return (
                <View key={track.id} style={[styles.listRow, isCurrent && styles.listRowActive]}>
                  <View style={styles.rowLeft}>
                    {/* Number Tag / Soundwave Badge */}
                    <View style={[styles.numberBadge, isCurrent && styles.numberBadgeActive]}>
                      {isCurrent && isPlaying ? (
                        <SoundwaveIndicator isPlaying={true} color="#ffffff" size={13} />
                      ) : (
                        <Text style={[styles.numberBadgeText, isCurrent && styles.numberBadgeTextActive]}>
                          {numberStr}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.rowTitle, isCurrent && styles.rowTitleActive]} numberOfLines={1}>
                        {displayTitle}
                      </Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {activeTab === "malayalam"
                          ? "മലയാളം ഗാനം"
                          : activeTab === "hindi"
                          ? "हिन्दी गीत"
                          : activeTab === "music"
                          ? "Music"
                          : "രാജയോഗ കമന്ററി"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rowActions}>
                    {/* Circular Play Button (▶️) */}
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

                    {/* Direct Download Button (⬇️) */}
                    <Pressable
                      style={({ pressed }) => [styles.downloadIconBtn, pressed && styles.actionPressed]}
                      onPress={() => handleDownload(track)}
                      hitSlop={8}
                      accessibilityLabel={`Download ${displayTitle}`}
                    >
                      <Download color={COLORS.primary[700]} size={15} strokeWidth={2.2} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Direct Playback Engine with Immediate Playback on Play Click */}
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
    backgroundColor: '#FAF8F5',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 85,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary[700],
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: "#D4AF37",
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: 15.5,
    fontFamily: FONTS.sansBold,
    color: COLORS.neutral[900],
  },
  headerSub: {
    fontSize: 11.5,
    fontFamily: FONTS.sans,
    color: COLORS.neutral[500],
    marginTop: 2,
  },
  activePlayerCard: {
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
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
    marginBottom: 8,
  },
  playerInfo: {
    flex: 1,
    paddingRight: 8,
  },
  nowPlayingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  nowPlayingText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary[700],
    letterSpacing: 0.5,
  },
  activeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.neutral[900],
  },
  activeSubtitle: {
    fontSize: 11,
    color: COLORS.neutral[500],
    marginTop: 1,
  },
  playerControlsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  seekBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    gap: 2,
  },
  seekBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  seekBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary[800],
  },
  activePlayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#D4AF37",
    ...SHADOWS.sm,
  },
  activePlayBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  playerDownloadBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: {
    marginTop: 4,
  },
  progressTouchArea: {
    height: 24,
    justifyContent: "center",
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 3,
    position: "relative",
    overflow: "visible",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#dc2626",
    borderRadius: 3,
  },
  progressThumb: {
    position: "absolute",
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#D4AF37",
    borderWidth: 2,
    borderColor: "#ffffff",
    marginLeft: -7,
    ...SHADOWS.sm,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.neutral[500],
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  mainTabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: RADIUS.xl,
    padding: 4,
    gap: 4,
    marginBottom: SPACING.md,
    borderWidth: 1.2,
    borderColor: "rgba(212, 175, 55, 0.28)",
    ...SHADOWS.sm,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: RADIUS.md,
    gap: 3,
  },
  tabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  mainTabBtnActive: {
    backgroundColor: COLORS.primary[700],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#D4AF37",
    ...SHADOWS.sm,
  },
  mainTabLabelWrap: {
    alignItems: "center",
  },
  mainTabTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 10.5,
    color: COLORS.neutral[700],
    textAlign: "center",
  },
  mainTabTitleActive: {
    color: "#ffffff",
  },
  mainTabSub: {
    fontSize: 9,
    color: COLORS.neutral[500],
    fontWeight: "500",
    marginTop: 1,
  },
  mainTabSubActive: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  listWrap: {
    gap: 8,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    paddingVertical: 10,
    borderWidth: 1.2,
    borderColor: "rgba(212, 175, 55, 0.18)",
    ...SHADOWS.sm,
  },
  listRowActive: {
    borderColor: "#D4AF37",
    backgroundColor: "#fffdf5",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  numberBadgeActive: {
    backgroundColor: COLORS.primary[700],
    borderColor: "#D4AF37",
  },
  numberBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary[800],
  },
  numberBadgeTextActive: {
    color: "#ffffff",
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.neutral[900],
  },
  rowTitleActive: {
    color: COLORS.primary[800],
  },
  rowSubtitle: {
    fontSize: 11,
    color: COLORS.neutral[500],
    marginTop: 1,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  redPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#dc2626",
    borderWidth: 1,
    borderColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
  },
  redPlayBtnActive: {
    backgroundColor: "#b91c1c",
  },
  downloadIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  actionPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.neutral[700],
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.neutral[500],
  },
});

export { MediaScreen };
