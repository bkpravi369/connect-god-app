import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Play } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { ShimmerSkeleton } from '@/components/ShimmerSkeleton';

type Props = {
  title?: string;
  subtitle?: string;
  thumbnail?: string;
  badge?: string;
  badgeColor?: string;
  videoId?: string;
  channelLogo?: string;
  onPress?: () => void;
  video?: {
    id?: string;
    title?: string;
    thumbnailUrl?: string;
    thumbnail?: string;
    youtubeUrl?: string;
    channelTitle?: string;
    channelName?: string;
    category?: string;
    videoId?: string;
    badge?: string;
    badgeColor?: string;
  };
  onPlay?: () => void;
};

export function VideoCard({
  title,
  subtitle,
  thumbnail,
  badge,
  badgeColor,
  videoId,
  onPress,
  video,
  onPlay,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const effectiveTitle = title || video?.title || 'Spiritual Video';
  const effectiveSubtitle = subtitle || video?.channelTitle || video?.channelName || '';
  const effectiveThumb = thumbnail || video?.thumbnailUrl || video?.thumbnail || '';
  const effectiveBadge = badge || video?.badge || 'WATCH';
  const effectiveBadgeColor = badgeColor || video?.badgeColor || '#dc2626';
  const handlePress = onPress || onPlay || (() => {});

  // Safe videoId resolution with complete null/undefined protection
  let resolvedVideoId = videoId || video?.videoId || null;
  if (!resolvedVideoId && effectiveThumb && typeof effectiveThumb === 'string' && effectiveThumb.includes('vi/')) {
    try {
      const parts = effectiveThumb.split('vi/');
      if (parts && parts[1]) {
        resolvedVideoId = parts[1].split('/')[0] || null;
      }
    } catch {}
  }

  const fallbackImg = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80';
  const computedThumb = resolvedVideoId
    ? `https://img.youtube.com/vi/${resolvedVideoId}/hqdefault.jpg`
    : effectiveThumb || fallbackImg;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={effectiveTitle}
    >
      <View style={styles.thumbWrap}>
        {!loaded && !hasError && (
          <View style={StyleSheet.absoluteFillObject}>
            <ShimmerSkeleton height="100%" borderRadius={0} />
          </View>
        )}
        <Image
          source={{ uri: hasError ? fallbackImg : computedThumb }}
          style={styles.thumb}
          resizeMode="cover"
          onLoad={() => setLoaded(true)}
          onLoadEnd={() => setLoaded(true)}
          onError={() => {
            setHasError(true);
            setLoaded(true);
          }}
        />
        <View style={styles.thumbOverlay} />

        {/* Badge in top left with subtle frosted glass background */}
        <View style={[styles.badge, { backgroundColor: effectiveBadgeColor }]}>
          <Text style={styles.badgeText}>{effectiveBadge}</Text>
        </View>

        {/* Central Play Button */}
        <View style={styles.playBtnWrap}>
          <View style={styles.playBtn}>
            <Play color="#ffffff" size={16} fill="#ffffff" style={{ marginLeft: 2 }} />
          </View>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {effectiveTitle}
        </Text>
        {effectiveSubtitle ? (
          <Text style={styles.sub} numberOfLines={1}>
            {effectiveSubtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.neutral[200],
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FONTS.interBold,
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  playBtnWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  info: {
    padding: SPACING.sm,
    gap: 2,
  },
  title: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 12.5,
    color: COLORS.text,
    lineHeight: 16,
  },
  sub: {
    fontFamily: FONTS.inter,
    fontSize: 10.5,
    color: COLORS.textMuted,
  },
});
