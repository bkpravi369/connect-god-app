import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Play } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { ShimmerSkeleton } from '@/components/ShimmerSkeleton';

type Props = {
  title: string;
  subtitle: string;
  thumbnail: string;
  badge: string;
  badgeColor: string;
  videoId?: string;
  channelLogo?: string;
  onPress: () => void;
};

export function VideoCard({ title, subtitle, thumbnail, badge, badgeColor, videoId, onPress }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // If videoId is provided or can be extracted, prefer high-quality YouTube thumbnail
  const resolvedVideoId = videoId || (thumbnail.includes('vi/') ? thumbnail.split('vi/')[1].split('/')[0] : null);
  const computedThumb = resolvedVideoId
    ? `https://img.youtube.com/vi/${resolvedVideoId}/hqdefault.jpg`
    : thumbnail || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80';

  const fallbackImg = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
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
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>

        {/* Circular Play button bottom-right with luxury gold glow */}
        <View style={styles.playBtn}>
          <Play color="#ffffff" size={13} strokeWidth={2.4} fill="#ffffff" style={{ marginLeft: 2 }} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.22)',
    ...SHADOWS.sm,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
    borderColor: '#D4AF37',
  },
  thumbWrap: {
    position: 'relative',
    height: 108,
    backgroundColor: COLORS.neutral[200],
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: RADIUS.xs,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  playBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: '#8B0000',
    borderWidth: 1.2,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  body: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
  },
  title: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
    color: COLORS.neutral[900],
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.neutral[500],
    marginTop: 2,
  },
});
