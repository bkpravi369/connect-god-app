import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Sparkles, Youtube } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import {
  FEATURED_VIDEOS,
  ZOOM_CONFIG,
  ZoomConfig,
  Varadan,
  Announcement,
  Channel,
} from '@/lib/constants';
import { AlertBanner } from '@/components/AlertBanner';
import { VaradanCard } from '@/components/VaradanCard';
import { LiveZoomBanner } from '@/components/LiveZoomBanner';
import { VideoCard } from '@/components/VideoCard';
import { VideoPlayerModal, VideoPlayItem } from '@/components/VideoPlayerModal';
import { ChannelSubPageModal } from '@/components/ChannelSubPageModal';
import { ZoomJoinModal } from '@/components/ZoomJoinModal';
import { useToast } from '@/components/ToastProvider';
import type { AutoContentResult } from '@/lib/auto-content';
import { fetchDailyVardanFromMurli, FALLBACK_VARADAN_ML } from '@/services/vardanService';

type Props = {
  varadan: Varadan;
  announcement: Announcement;
  onMurliPress: () => void;
  autoContent?: AutoContentResult | null;
  zoomConfig?: ZoomConfig;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export default function HomeScreen({
  varadan,
  announcement,
  onMurliPress,
  autoContent,
  zoomConfig,
  onRefresh,
  isRefreshing,
}: Props) {
  const toast = useToast();
  const [zoomOpen, setZoomOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoPlayItem | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  // Live Vardan extraction state (Zero manual JSON dependency)
  const [extractedVardan, setExtractedVardan] = useState<string>('');
  const [isVardanLoading, setIsVardanLoading] = useState<boolean>(true);

  // Fetch today's live Vardan directly from Murli HTML on mount
  useEffect(() => {
    let isMounted = true;
    setIsVardanLoading(true);

    fetchDailyVardanFromMurli(false)
      .then((vardanText) => {
        if (isMounted && vardanText) {
          setExtractedVardan(vardanText);
        }
      })
      .catch((err) => {
        console.warn('[HomeScreen] Vardan extraction warning:', err);
      })
      .finally(() => {
        if (isMounted) setIsVardanLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = () => {
    setIsVardanLoading(true);
    fetchDailyVardanFromMurli(true)
      .then((vardanText) => {
        if (vardanText) {
          setExtractedVardan(vardanText);
        }
      })
      .catch((err) => {
        console.warn('[HomeScreen] Vardan refresh warning:', err);
      })
      .finally(() => {
        setIsVardanLoading(false);
      });

    if (onRefresh) onRefresh();
  };

  // Staggered Divine Entrance Animations
  const animVaradan = useRef(new Animated.Value(0)).current;
  const animZoom = useRef(new Animated.Value(0)).current;
  const animGrid = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createTiming = (anim: Animated.Value) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

    Animated.stagger(50, [
      createTiming(animVaradan),
      createTiming(animZoom),
      createTiming(animGrid),
    ]).start();
  }, [animVaradan, animZoom, animGrid]);

  const makeAnimStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  });

  const openUrl = async (url: string, fallbackMsg?: string) => {
    if (!url) {
      if (fallbackMsg) toast.show(fallbackMsg, 'info');
      return;
    }
    const supported = await Linking.canOpenURL(url).catch(() => false);
    if (supported) {
      await Linking.openURL(url);
    } else if (fallbackMsg) {
      toast.show(fallbackMsg, 'info');
    }
  };

  const handleDirectZoom = async () => {
    const targetUrl = zoomConfig?.joinUrl || ZOOM_CONFIG.joinUrl;
    try {
      const supported = await Linking.canOpenURL(targetUrl).catch(() => false);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        await Linking.openURL(targetUrl);
      }
    } catch {
      toast.show('Unable to open Zoom link', 'error');
    }
  };

  const handleZoomJoin = async (name: string) => {
    setZoomOpen(false);
    toast.show(`Welcome ${name}, opening Zoom...`, 'success');
    const targetUrl = zoomConfig?.joinUrl || ZOOM_CONFIG.joinUrl;
    await openUrl(targetUrl, 'Zoom app not available on this device');
  };

  const featuredList = build2x2Videos(autoContent);

  const effectiveVaradan: Varadan = useMemo(() => {
    const resolvedText = extractedVardan || varadan?.textMl || FALLBACK_VARADAN_ML;

    return {
      ...varadan,
      textMl: resolvedText,
      text: resolvedText,
    };
  }, [extractedVardan, varadan]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={Boolean(isRefreshing)}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary[700]}
          colors={[COLORS.primary[700]]}
        />
      }
    >
      {/* ── [Top] Announcement Bar: Scrolling Marquee ── */}
      <AlertBanner announcement={announcement} />

      {/* ── [Card 1] Divine Gold / Parchment Varadan Card (Pure Extracted Vardan) ─────────── */}
      <Animated.View style={makeAnimStyle(animVaradan)}>
        <VaradanCard
          varadan={effectiveVaradan}
          onReadFull={onMurliPress}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          isLoading={isVardanLoading}
        />
      </Animated.View>

      {/* ── [Strip] Single-line "🔴 Live Zoom Session - Tap to Join" ── */}
      <Animated.View style={makeAnimStyle(animZoom)}>
        <LiveZoomBanner
          onPress={handleDirectZoom}
          zoomUrl={zoomConfig?.joinUrl || ZOOM_CONFIG.joinUrl}
        />
      </Animated.View>

      {/* ── [Grid] 2x2 Clean YouTube Thumbnail Grid (Spiritual Media Hub) ── */}
      <Animated.View style={[styles.section, makeAnimStyle(animGrid)]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.titleWithIcon}>
            <Text style={styles.sectionTitle}>Spiritual Media Hub</Text>
            <Sparkles color="#D4AF37" size={14} strokeWidth={2.2} />
          </View>
          <View style={styles.hubBadge}>
            <Youtube color="#dc2626" size={13} strokeWidth={2.4} />
            <Text style={styles.sectionBadge}>2x2 LIVE HUB</Text>
          </View>
        </View>

        <View style={styles.grid2x2}>
          {featuredList.map((item) => (
            <View key={item.id} style={styles.gridItem}>
              <VideoCard
                video={{
                  id: item.id,
                  title: item.title,
                  thumbnailUrl: item.thumbnail,
                  youtubeUrl: item.youtubeUrl,
                  channelTitle: item.channelTitle,
                  category: 'class',
                }}
                onPlay={() =>
                  setSelectedVideo({
                    id: item.id,
                    title: item.title,
                    youtubeUrl: item.youtubeUrl,
                    channelTitle: item.channelTitle,
                  })
                }
              />
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ── Modal Popups ── */}
      <VideoPlayerModal
        visible={Boolean(selectedVideo)}
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />

      <ChannelSubPageModal
        visible={Boolean(selectedChannel)}
        channel={selectedChannel}
        onClose={() => setSelectedChannel(null)}
        onPlayVideo={(video) => {
          setSelectedVideo({
            id: video.id,
            title: video.title,
            youtubeUrl: video.youtubeUrl,
            channelTitle: video.channelTitle,
          });
        }}
      />

      <ZoomJoinModal
        visible={zoomOpen}
        onClose={() => setZoomOpen(false)}
        onJoin={handleZoomJoin}
        meetingTopic={zoomConfig?.topic}
        meetingTime={zoomConfig?.meetingTime}
      />
    </ScrollView>
  );
}

function build2x2Videos(autoContent?: AutoContentResult | null) {
  if (autoContent && autoContent.videos && autoContent.videos.length > 0) {
    const list = autoContent.videos.slice(0, 4).map((v, i) => ({
      id: v.id || `auto-${i}`,
      title: v.title,
      thumbnail: v.thumbnailUrl || (FEATURED_VIDEOS[i % FEATURED_VIDEOS.length]?.thumbnail ?? ''),
      youtubeUrl: v.youtubeUrl || (FEATURED_VIDEOS[i % FEATURED_VIDEOS.length]?.youtubeUrl ?? ''),
      channelTitle: v.channelTitle || 'BK Media',
      channelId: v.channelId || 'bk_media',
    }));
    while (list.length < 4) {
      const fallback = FEATURED_VIDEOS[list.length % FEATURED_VIDEOS.length];
      list.push({
        id: fallback.id,
        title: fallback.title,
        thumbnail: fallback.thumbnail,
        youtubeUrl: fallback.youtubeUrl,
        channelTitle: fallback.channelTitle,
        channelId: fallback.channelId,
      });
    }
    return list;
  }
  return FEATURED_VIDEOS.slice(0, 4);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  section: {
    marginTop: 2,
    gap: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: FONTS.interBold,
    fontSize: 16,
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  hubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  sectionBadge: {
    fontFamily: FONTS.interBold,
    fontSize: 10,
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  gridItem: {
    width: '48.2%',
  },
});
