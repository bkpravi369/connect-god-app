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
  Swaman,
  Announcement,
  Channel,
} from '@/lib/constants';
import { AlertBanner } from '@/components/AlertBanner';
import { VaradanCard } from '@/components/VaradanCard';
import { LiveZoomBanner } from '@/components/LiveZoomBanner';
import { DailySwamanCard } from '@/components/DailySwamanCard';
import { VideoCard } from '@/components/VideoCard';
import { VideoPlayerModal, VideoPlayItem } from '@/components/VideoPlayerModal';
import { ChannelSubPageModal } from '@/components/ChannelSubPageModal';
import { ZoomJoinModal } from '@/components/ZoomJoinModal';
import { useToast } from '@/components/ToastProvider';
import type { AutoContentResult } from '@/lib/auto-content';

import { syncDailyMurliData, DailyMurliSyncResult } from '@/services/murliService';
import { getDailyVaradanamAndSwaman, fetchDynamicRemoteVaradanam } from '@/services/varadanamDataset';

type Props = {
  varadan: Varadan;
  swaman?: Swaman | null;
  announcement: Announcement;
  onMurliPress: () => void;
  autoContent?: AutoContentResult | null;
  zoomConfig?: ZoomConfig;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export default function HomeScreen({
  varadan,
  swaman,
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
  const [syncedData, setSyncedData] = useState<DailyMurliSyncResult | null>(null);
  const [blessingData, setBlessingData] = useState(() => getDailyVaradanamAndSwaman());

  // Instant local dataset resolution for today's IST date
  const todayBlessing = blessingData;

  // Sync today's live Varadanam & Swaman directly from in-project sync engine & remote JSON
  useEffect(() => {
    fetchDynamicRemoteVaradanam().then(() => {
      setBlessingData(getDailyVaradanamAndSwaman());
    });
    syncDailyMurliData().then((res) => {
      if (res && res.success) {
        setSyncedData(res);
      }
    });
  }, []);

  const handleRefresh = () => {
    fetchDynamicRemoteVaradanam().then(() => {
      setBlessingData(getDailyVaradanamAndSwaman());
    });
    syncDailyMurliData(true).then((res) => {
      if (res && res.success) {
        setSyncedData(res);
      }
    });
    if (onRefresh) onRefresh();
  };

  // Staggered Divine Entrance Animations (50ms intervals, 400ms duration, 60 FPS GPU)
  const animVaradan = useRef(new Animated.Value(0)).current;
  const animZoom = useRef(new Animated.Value(0)).current;
  const animSwaman = useRef(new Animated.Value(0)).current;
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
      createTiming(animSwaman),
      createTiming(animGrid),
    ]).start();
  }, [animVaradan, animZoom, animSwaman, animGrid]);

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

  const effectiveVaradan: Varadan = {
    ...varadan,
    textMl: syncedData?.heroData?.varadan || todayBlessing.varadanText || varadan.textMl,
    text: syncedData?.heroData?.varadan || todayBlessing.varadanText || varadan.text,
  };

  const effectiveSwaman: Swaman = {
    textMl:
      syncedData?.heroData?.swaman ||
      todayBlessing.swamanText ||
      (typeof swaman === 'string' ? swaman : swaman?.textMl) ||
      'ഞാൻ സർവ്വ ശക്തിമാനായ പരമാത്മാവിന്റെ മാസ്റ്റർ സർവ്വശക്തിവാൻ കുട്ടിയാണ്.',
    textEn:
      todayBlessing.swamanTextEn ||
      (typeof swaman === 'object' && swaman ? swaman.textEn : '') ||
      'I am the master almighty child of the Supreme Soul.',
  };

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

      {/* ── [Card 1] Divine Gold / Parchment Varadan Card ─────────────── */}
      <Animated.View style={makeAnimStyle(animVaradan)}>
        <VaradanCard
          varadan={effectiveVaradan}
          onReadFull={onMurliPress}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </Animated.View>

      {/* ── [Strip] Single-line "🔴 Live Zoom Session - Tap to Join" ── */}
      <Animated.View style={makeAnimStyle(animZoom)}>
        <LiveZoomBanner
          onPress={handleDirectZoom}
          zoomUrl={zoomConfig?.joinUrl || ZOOM_CONFIG.joinUrl}
        />
      </Animated.View>

      {/* ── [Card 2] Premium Single-Line "ഇന്നത്തെ സ്വാമാനം" Card ────── */}
      <Animated.View style={makeAnimStyle(animSwaman)}>
        <DailySwamanCard
          swaman={effectiveSwaman}
          onPress={() => toast.show('ആത്മീയ സ്വാമാനം ഹൃദയത്തിൽ സ്ഥിരപ്പെടുത്തുക ✨', 'info')}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
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
        <Text style={styles.sectionSub}>BK S Calicut • Supreme Light • BK Sheeba • BK Sheeja</Text>

        <View style={styles.grid2x2}>
          {featuredList.map((v) => (
            <View key={v.id} style={styles.gridCell}>
              <VideoCard
                title={v.title}
                subtitle={v.subtitle}
                thumbnail={v.thumbnail}
                badge={v.badge}
                badgeColor={v.badgeColor}
                videoId={v.videoId}
                channelLogo={v.channelLogo}
                onPress={() =>
                  setSelectedVideo({
                    id: v.id,
                    title: v.title,
                    subtitle: v.subtitle,
                    url: v.url,
                    videoId: v.videoId,
                    channelId: v.channelId,
                    channelName: v.channelName || v.title,
                    badge: v.badge,
                    badgeColor: v.badgeColor,
                    thumbnail: v.thumbnail,
                  })
                }
              />
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={{ height: 60 }} />

      {/* In-App Video Playback Modal */}
      <VideoPlayerModal
        visible={!!selectedVideo}
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />

      {/* Channel Hub Sub-page Modal */}
      <ChannelSubPageModal
        visible={!!selectedChannel}
        channel={selectedChannel}
        onClose={() => setSelectedChannel(null)}
        onPlayVideo={(v) => {
          setSelectedChannel(null);
          setSelectedVideo(v);
        }}
      />

      {/* Zoom Join Modal */}
      <ZoomJoinModal
        visible={zoomOpen}
        onClose={() => setZoomOpen(false)}
        onJoin={handleZoomJoin}
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
  channelLogo?: string;
};

function build2x2Videos(autoContent?: AutoContentResult | null): FeaturedVideoItem[] {
  const defaultCalicut = FEATURED_VIDEOS[0];
  const defaultPodcast = FEATURED_VIDEOS[1];
  const defaultSheeba = FEATURED_VIDEOS[2];
  const defaultSheeja = FEATURED_VIDEOS[3];

  const calicut = autoContent?.liveVideo;
  const podcast = autoContent?.podcastVideo;
  const sheeba = autoContent?.sheebaVideo;
  const sheeja = autoContent?.sheejaVideo;

  return [
    {
      id: calicut?.videoId || defaultCalicut.id,
      videoId: calicut?.videoId || defaultCalicut.videoId,
      channelId: 'bks-calicut',
      title: 'BK S Calicut Live',
      subtitle: calicut?.title || defaultCalicut.subtitle,
      thumbnail: calicut?.thumbnail || defaultCalicut.thumbnail,
      badge: calicut?.badge || (calicut?.isLive ? 'LIVE' : defaultCalicut.badge),
      badgeColor: calicut?.badgeColor || defaultCalicut.badgeColor,
      channelName: 'BK S Calicut Live',
      url: calicut?.url || defaultCalicut.url,
    },
    {
      id: podcast?.videoId || defaultPodcast.id,
      videoId: podcast?.videoId || defaultPodcast.videoId,
      channelId: 'supreme-light',
      title: 'Supreme Light Creations',
      subtitle: podcast?.title || defaultPodcast.subtitle,
      thumbnail: podcast?.thumbnail || defaultPodcast.thumbnail,
      badge: podcast?.badge || defaultPodcast.badge,
      badgeColor: podcast?.badgeColor || defaultPodcast.badgeColor,
      channelName: 'Supreme Light Creations',
      url: podcast?.url || defaultPodcast.url,
    },
    {
      id: sheeba?.videoId || defaultSheeba.id,
      videoId: sheeba?.videoId || defaultSheeba.videoId,
      channelId: 'bk-sheeba',
      title: 'BK Sheeba',
      subtitle: sheeba?.title || defaultSheeba.subtitle,
      thumbnail: sheeba?.thumbnail || defaultSheeba.thumbnail,
      badge: sheeba?.badge || defaultSheeba.badge,
      badgeColor: sheeba?.badgeColor || defaultSheeba.badgeColor,
      channelName: 'BK Sheeba',
      url: sheeba?.url || defaultSheeba.url,
    },
    {
      id: sheeja?.videoId || defaultSheeja.id,
      videoId: sheeja?.videoId || defaultSheeja.videoId,
      channelId: 'UCvQFuOM38iAZD7ltMujOq-g',
      title: 'BK Sheeja',
      subtitle: sheeja?.title || defaultSheeja.subtitle,
      thumbnail: sheeja?.thumbnail || defaultSheeja.thumbnail,
      badge: sheeja?.badge || defaultSheeja.badge,
      badgeColor: sheeja?.badgeColor || defaultSheeja.badgeColor,
      channelName: 'BK Sheeja',
      url: sheeja?.url || defaultSheeja.url || 'https://www.youtube.com/watch?v=tiKb43faieY',
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5', // Soft Pearl / Ivory Canvas
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 80,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: COLORS.neutral[900],
    letterSpacing: 0.2,
  },
  hubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(254, 226, 226, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  sectionBadge: {
    fontFamily: FONTS.sansBold,
    fontSize: 9.5,
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  sectionSub: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
    color: COLORS.neutral[500],
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  // 2x2 Grid for the 4 YouTube channels
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  gridCell: {
    width: '48.5%',
  },
});

export { HomeScreen };
