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
  varadan?: Varadan | null;
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
        if (isMounted && vardanText && typeof vardanText === 'string') {
          setExtractedVardan(vardanText.trim());
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
        if (vardanText && typeof vardanText === 'string') {
          setExtractedVardan(vardanText.trim());
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

  // Staggered Divine Entrance Animations with safe non-native driver fallback
  const animVaradan = useRef(new Animated.Value(0)).current;
  const animZoom = useRef(new Animated.Value(0)).current;
  const animGrid = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createTiming = (anim: Animated.Value) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
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
      await Linking.openURL(url).catch(() => {});
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

  const featuredList = useMemo(() => build2x2Videos(autoContent), [autoContent]);

  const effectiveVaradan: Varadan = useMemo(() => {
    const resolvedText =
      (extractedVardan && extractedVardan.trim().length > 15 ? extractedVardan : '') ||
      (typeof varadan === 'string' ? varadan : varadan?.textMl || varadan?.text || '') ||
      FALLBACK_VARADAN_ML;

    return {
      textMl: resolvedText,
      text: resolvedText,
      audioUrl: (typeof varadan === 'object' && varadan?.audioUrl) || '',
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
          isLoading={isVardanLoading && !extractedVardan}
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
                title={item.title}
                subtitle={item.subtitle}
                thumbnail={item.thumbnail}
                badge={item.badge}
                badgeColor={item.badgeColor}
                videoId={item.videoId}
                onPress={() =>
                  setSelectedVideo({
                    id: item.id,
                    title: item.title,
                    subtitle: item.subtitle,
                    url: item.url,
                    videoId: item.videoId,
                    channelId: item.channelId,
                    channelName: item.channelName,
                    badge: item.badge,
                    badgeColor: item.badgeColor,
                    thumbnail: item.thumbnail,
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
            subtitle: video.subtitle,
            url: video.url,
            videoId: video.videoId,
            channelId: video.channelId,
            channelName: video.channelName,
            badge: video.badge,
            badgeColor: video.badgeColor,
            thumbnail: video.thumbnail,
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

type FeaturedVideoItem = {
  id: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  badge: string;
  badgeColor: string;
  url: string;
  videoId?: string;
  channelId?: string;
  channelName?: string;
};

function build2x2Videos(autoContent?: AutoContentResult | null): FeaturedVideoItem[] {
  const defaultCalicut = FEATURED_VIDEOS[0] || {
    id: 'calicut',
    videoId: '04y26_09oU0',
    title: 'BK S Calicut Live',
    subtitle: 'Daily Classes & Live Streams',
    thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
    badge: 'LIVE',
    badgeColor: '#dc2626',
    url: 'https://www.youtube.com/@BKSCalicutLive',
  };

  const defaultPodcast = FEATURED_VIDEOS[1] || {
    id: 'podcast',
    videoId: 'c_Kk1bLgKxQ',
    title: 'Supreme Light Creations',
    subtitle: 'Meditation & Creative Videos',
    thumbnail: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=600&q=80',
    badge: 'NEW',
    badgeColor: '#ea580c',
    url: 'https://www.youtube.com/@SupremeLightCreations',
  };

  const defaultSheeba = FEATURED_VIDEOS[2] || {
    id: 'sheeba',
    videoId: '93fK3p1aLwY',
    title: 'BK Sheeba',
    subtitle: 'Spiritual Classes & Chintan',
    thumbnail: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80',
    badge: 'CLASS',
    badgeColor: '#15803d',
    url: 'https://www.youtube.com/@BKSheeba',
  };

  const defaultSheeja = FEATURED_VIDEOS[3] || {
    id: 'sheeja',
    videoId: 'tiKb43faieY',
    title: 'BK Sheeja',
    subtitle: 'Murli Chintan & Classes',
    thumbnail: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=600&q=80',
    badge: 'CLASS',
    badgeColor: '#0284c7',
    url: 'https://www.youtube.com/watch?v=tiKb43faieY',
  };

  const calicut = autoContent?.liveVideo;
  const podcast = autoContent?.podcastVideo;
  const sheeba = autoContent?.sheebaVideo;
  const sheeja = autoContent?.sheejaVideo;

  return [
    {
      id: calicut?.videoId || defaultCalicut.id,
      videoId: calicut?.videoId || (defaultCalicut as any).videoId,
      channelId: 'bks-calicut',
      title: 'BK S Calicut Live',
      subtitle: calicut?.title || (defaultCalicut as any).subtitle || 'Daily Classes & Live Streams',
      thumbnail: calicut?.thumbnail || defaultCalicut.thumbnail,
      badge: calicut?.badge || (calicut?.isLive ? 'LIVE' : (defaultCalicut as any).badge || 'LIVE'),
      badgeColor: calicut?.badgeColor || (defaultCalicut as any).badgeColor || '#dc2626',
      channelName: 'BK S Calicut Live',
      url: calicut?.url || (defaultCalicut as any).url || '',
    },
    {
      id: podcast?.videoId || defaultPodcast.id,
      videoId: podcast?.videoId || (defaultPodcast as any).videoId,
      channelId: 'supreme-light',
      title: 'Supreme Light Creations',
      subtitle: podcast?.title || (defaultPodcast as any).subtitle || 'Meditation & Creative Videos',
      thumbnail: podcast?.thumbnail || defaultPodcast.thumbnail,
      badge: podcast?.badge || (defaultPodcast as any).badge || 'NEW',
      badgeColor: podcast?.badgeColor || (defaultPodcast as any).badgeColor || '#ea580c',
      channelName: 'Supreme Light Creations',
      url: podcast?.url || (defaultPodcast as any).url || '',
    },
    {
      id: sheeba?.videoId || defaultSheeba.id,
      videoId: sheeba?.videoId || (defaultSheeba as any).videoId,
      channelId: 'bk-sheeba',
      title: 'BK Sheeba',
      subtitle: sheeba?.title || (defaultSheeba as any).subtitle || 'Spiritual Classes & Chintan',
      thumbnail: sheeba?.thumbnail || defaultSheeba.thumbnail,
      badge: sheeba?.badge || (defaultSheeba as any).badge || 'CLASS',
      badgeColor: sheeba?.badgeColor || (defaultSheeba as any).badgeColor || '#15803d',
      channelName: 'BK Sheeba',
      url: sheeba?.url || (defaultSheeba as any).url || '',
    },
    {
      id: sheeja?.videoId || defaultSheeja.id,
      videoId: sheeja?.videoId || (defaultSheeja as any).videoId,
      channelId: 'UCvQFuOM38iAZD7ltMujOq-g',
      title: 'BK Sheeja',
      subtitle: sheeja?.title || (defaultSheeja as any).subtitle || 'Murli Chintan & Classes',
      thumbnail: sheeja?.thumbnail || defaultSheeja.thumbnail,
      badge: sheeja?.badge || (defaultSheeja as any).badge || 'CLASS',
      badgeColor: sheeja?.badgeColor || (defaultSheeja as any).badgeColor || '#0284c7',
      channelName: 'BK Sheeja',
      url: sheeja?.url || (defaultSheeja as any).url || 'https://www.youtube.com/watch?v=tiKb43faieY',
    },
  ];
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
