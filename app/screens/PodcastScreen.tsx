import React, { useState, useEffect } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Play, Headphones, Radio, ExternalLink, Sparkles, Youtube, RotateCw } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { useToast } from '@/components/ToastProvider';

import { getApiKey, syncAllYouTubeMedia, YouTubeVideo } from '@/lib/youtube';
import { fetchPodcastVideos, getCachedPodcastVideos } from '@/services/podcastService';

export type PodcastCardItem = {
  id: string;
  videoId: string;
  title: string;
  channelName: string;
  publishedAt?: string;
  thumbnail: string;
  url: string;
  link?: string;
  badge?: string;
  badgeColor?: string;
  description?: string;
};

// ── Fallback Category Cards (Instant Zero-Blank Load) ──
const DEFAULT_MEDIA_FEEDS: {
  live: PodcastCardItem;
  podcast: PodcastCardItem;
  sheeba: PodcastCardItem;
  sheeja: PodcastCardItem;
} = {
  live: {
    id: 'DlFt6-KwmcI',
    videoId: 'DlFt6-KwmcI',
    title: 'Daily Murli Live Discourse & Morning Class - BK S Calicut',
    channelName: 'BK S Calicut Live',
    thumbnail: 'https://i.ytimg.com/vi/DlFt6-KwmcI/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=DlFt6-KwmcI',
    link: 'https://www.youtube.com/watch?v=DlFt6-KwmcI',
    badge: 'LIVE CLASS',
    badgeColor: '#dc2626',
  },
  podcast: {
    id: 'uA-DDYjAniM',
    videoId: 'uA-DDYjAniM',
    title: 'DAILY MURLI PODCAST 22-8-26',
    channelName: 'Supreme Light Creations',
    thumbnail: 'https://img.youtube.com/vi/uA-DDYjAniM/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=uA-DDYjAniM',
    link: 'https://www.youtube.com/watch?v=uA-DDYjAniM',
    badge: 'TODAY PODCAST',
    badgeColor: '#d97706',
  },
  sheeba: {
    id: '_kKSsaZaklI',
    videoId: '_kKSsaZaklI',
    title: 'Think This Way, And You Can Manifest Anything - BK Sheeba',
    channelName: 'BK Sheeba',
    thumbnail: 'https://i.ytimg.com/vi/_kKSsaZaklI/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=_kKSsaZaklI',
    link: 'https://www.youtube.com/watch?v=_kKSsaZaklI',
    badge: 'CLASSES',
    badgeColor: '#c13584',
  },
  sheeja: {
    id: 'tiKb43faieY',
    videoId: 'tiKb43faieY',
    title: 'Spiritual Songs & Meditation Commentary - BK Sheeja',
    channelName: 'BK Sheeja',
    thumbnail: 'https://i.ytimg.com/vi/tiKb43faieY/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=tiKb43faieY',
    link: 'https://www.youtube.com/watch?v=tiKb43faieY',
    badge: 'MEDITATION',
    badgeColor: '#7c3aed',
  },
};

export default function PodcastScreen() {
  const toast = useToast();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'live' | 'podcast' | 'sheeba' | 'sheeja'>('all');
  const [feeds, setFeeds] = useState(DEFAULT_MEDIA_FEEDS);
  const [allVideosList, setAllVideosList] = useState<PodcastCardItem[]>([
    DEFAULT_MEDIA_FEEDS.live,
    DEFAULT_MEDIA_FEEDS.podcast,
    DEFAULT_MEDIA_FEEDS.sheeba,
    DEFAULT_MEDIA_FEEDS.sheeja,
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mapYtToCard = (yt: YouTubeVideo | null, fallback: PodcastCardItem): PodcastCardItem => {
    if (!yt || !yt.videoId) return fallback;
    return {
      id: yt.videoId,
      videoId: yt.videoId,
      title: yt.title || fallback.title,
      channelName: yt.channelTitle || yt.subtitle || fallback.channelName,
      thumbnail: yt.thumbnail || fallback.thumbnail,
      url: yt.url || `https://www.youtube.com/watch?v=${yt.videoId}`,
      link: yt.url || `https://www.youtube.com/watch?v=${yt.videoId}`,
      publishedAt: yt.publishedAt,
      badge: yt.badge || fallback.badge,
      badgeColor: yt.badgeColor || fallback.badgeColor,
      description: yt.description,
    };
  };

  const loadYouTubeMediaEngine = async (bypassCache = false) => {
    try {
      // 1. Fetch from podcast service / API
      const podcastItems = await fetchPodcastVideos(bypassCache);
      if (podcastItems && podcastItems.length > 0) {
        const liveItem = podcastItems.find((p) => p.category === 'live') || DEFAULT_MEDIA_FEEDS.live;
        const podItem = podcastItems.find((p) => p.category === 'podcast') || DEFAULT_MEDIA_FEEDS.podcast;
        const sheebaItem = podcastItems.find((p) => p.category === 'sheeba') || DEFAULT_MEDIA_FEEDS.sheeba;
        const sheejaItem = podcastItems.find((p) => p.category === 'sheeja') || DEFAULT_MEDIA_FEEDS.sheeja;

        setFeeds({
          live: liveItem,
          podcast: podItem,
          sheeba: sheebaItem,
          sheeja: sheejaItem,
        });
        setAllVideosList([liveItem, podItem, sheebaItem, sheejaItem]);
      }

      // 2. Also try direct client YouTube sync if available
      const mediaResult = await syncAllYouTubeMedia(bypassCache);
      if (mediaResult) {
        const liveCard = mapYtToCard(mediaResult.liveVideo, DEFAULT_MEDIA_FEEDS.live);
        const podcastCard = mapYtToCard(mediaResult.podcastVideo, DEFAULT_MEDIA_FEEDS.podcast);
        const sheebaCard = mapYtToCard(mediaResult.sheebaVideo, DEFAULT_MEDIA_FEEDS.sheeba);
        const sheejaCard = mapYtToCard(mediaResult.sheejaVideo, DEFAULT_MEDIA_FEEDS.sheeja);

        const updatedFeeds = {
          live: liveCard,
          podcast: podcastCard,
          sheeba: sheebaCard,
          sheeja: sheejaCard,
        };

        setFeeds(updatedFeeds);
        setAllVideosList([liveCard, podcastCard, sheebaCard, sheejaCard]);
      }
    } catch (err) {
      console.warn('[PodcastScreen] Error loading YouTube media engine:', err);
    }
  };

  useEffect(() => {
    loadYouTubeMediaEngine(true);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadYouTubeMediaEngine(true);
    setIsRefreshing(false);
    toast.show('YouTube feeds synced ✨', 'success');
  };

  const handleOpenVideo = async (video: PodcastCardItem) => {
    const targetUrl = video.link || video.url || `https://www.youtube.com/watch?v=${video.videoId}`;
    try {
      const canOpen = await Linking.canOpenURL(targetUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(targetUrl);
      } else {
        await Linking.openURL(targetUrl);
      }
    } catch {
      toast.show('Unable to open video', 'error');
    }
  };

  const renderSectionCard = (
    title: string,
    subtitle: string,
    item: PodcastCardItem,
    iconColor: string,
    accentBorder?: string
  ) => (
    <View style={[styles.categorySection, accentBorder ? { borderColor: accentBorder, borderWidth: 1.5 } : null]}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitleRow}>
          <View style={[styles.categoryDot, { backgroundColor: iconColor }]} />
          <Text style={styles.categoryTitle}>{title}</Text>
        </View>
        <Text style={styles.categorySub}>{subtitle}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.featureCard, pressed && styles.cardPressed]}
        onPress={() => handleOpenVideo(item)}
        accessibilityLabel={item.title}
      >
        <View style={styles.featureThumbWrap}>
          <Image source={{ uri: item.thumbnail }} style={styles.featureThumbImg} resizeMode="cover" />
          <View style={styles.playOverlay}>
            <View style={[styles.playCircle, { backgroundColor: iconColor }]}>
              <Play color="#ffffff" size={20} fill="#ffffff" />
            </View>
          </View>
          {item.badge && (
            <View style={[styles.badgeWrap, { backgroundColor: item.badgeColor || iconColor }]}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
        </View>

        <View style={styles.featureInfoWrap}>
          <Text style={styles.featureCardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.cardFooterRow}>
            <View style={styles.channelRow}>
              <Youtube color="#dc2626" size={14} strokeWidth={2.2} />
              <Text style={styles.channelName}>{item.channelName}</Text>
            </View>
            <View style={styles.watchNowBtn}>
              <Text style={styles.watchNowText}>Watch</Text>
              <ExternalLink color={COLORS.primary[600]} size={12} strokeWidth={2.2} />
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );

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
            <Headphones color="#ffffff" size={22} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Spiritual Video & Podcast Hub</Text>
            <Text style={styles.headerSub}>ദൈനംദിന ആത്മീയ പ്രഭാഷണങ്ങൾ, മുരളി ക്ലാസുകൾ & പോഡ്കാസ്റ്റുകൾ</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={handleRefresh} hitSlop={8}>
            <RotateCw color="#ffffff" size={16} strokeWidth={2.4} />
          </Pressable>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>All Channels</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, selectedFilter === 'live' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('live')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'live' && styles.filterChipTextActive]}>Live Murli</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, selectedFilter === 'podcast' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('podcast')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'podcast' && styles.filterChipTextActive]}>Podcast</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, selectedFilter === 'sheeba' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('sheeba')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'sheeba' && styles.filterChipTextActive]}>BK Sheeba</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, selectedFilter === 'sheeja' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('sheeja')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'sheeja' && styles.filterChipTextActive]}>BK Sheeja</Text>
          </Pressable>
        </ScrollView>

        {/* 1. Live Murli (BK S Calicut) */}
        {(selectedFilter === 'all' || selectedFilter === 'live') &&
          renderSectionCard(
            'Live Murli Class',
            'BK S Calicut Live',
            feeds.live,
            '#dc2626'
          )}

        {/* 2. Daily Podcast (Supreme Light Creations) */}
        {(selectedFilter === 'all' || selectedFilter === 'podcast') && (
          <View>
            {renderSectionCard(
              'Daily Murli Podcast',
              'Supreme Light Creations',
              feeds.podcast,
              '#d97706'
            )}
            <Pressable
              style={({ pressed }) => [styles.viewAllChannelBtn, pressed && { opacity: 0.85 }]}
              onPress={() => Linking.openURL('https://youtube.com/@supremelightcreations')}
              accessibilityLabel="View All Episodes on YouTube Channel"
            >
              <Youtube color="#dc2626" size={18} strokeWidth={2.2} />
              <Text style={styles.viewAllChannelText}>View All Episodes on YouTube Channel</Text>
              <ExternalLink color="#d97706" size={14} strokeWidth={2.2} />
            </Pressable>
          </View>
        )}

        {/* 3. BK Sheeba Classes */}
        {(selectedFilter === 'all' || selectedFilter === 'sheeba') &&
          renderSectionCard(
            'Spiritual Classes & Lectures',
            'BK Sheeba',
            feeds.sheeba,
            '#c13584'
          )}

        {/* 4. BK Sheeja Meditation */}
        {(selectedFilter === 'all' || selectedFilter === 'sheeja') &&
          renderSectionCard(
            'Meditation & Commentary',
            'BK Sheeja',
            feeds.sheeja,
            '#7c3aed'
          )}

        <View style={{ height: SPACING['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral[50],
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[700],
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  headerSub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  filterScroll: {
    marginBottom: SPACING.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    ...SHADOWS.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary[700],
    borderColor: COLORS.primary[700],
  },
  filterChipText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12.5,
    color: COLORS.neutral[600],
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontFamily: FONTS.sansBold,
  },
  categorySection: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    ...SHADOWS.sm,
  },
  categoryHeader: {
    marginBottom: SPACING.sm,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 15.5,
    color: COLORS.neutral[900],
  },
  categorySub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.neutral[500],
    marginTop: 2,
    marginLeft: 15,
  },
  featureCard: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  featureThumbWrap: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: COLORS.neutral[900],
  },
  featureThumbImg: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
    ...SHADOWS.md,
  },
  badgeWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 9.5,
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  featureInfoWrap: {
    padding: SPACING.md,
  },
  featureCardTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 14.5,
    lineHeight: 20,
    color: COLORS.neutral[900],
    marginBottom: SPACING.sm,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  channelName: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12.5,
    color: COLORS.neutral[700],
  },
  watchNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
  },
  watchNowText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11.5,
    color: COLORS.primary[700],
  },
  viewAllChannelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.md,
    gap: 8,
  },
  viewAllChannelText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: '#92400e',
    letterSpacing: 0.2,
  },
});

export { PodcastScreen };
