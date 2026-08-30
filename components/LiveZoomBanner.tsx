import React, { useEffect, useRef } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { DEFAULT_ZOOM_CONFIG } from '@/lib/constants';

type Props = {
  onPress?: () => void;
  zoomUrl?: string;
};

export function LiveZoomBanner({ onPress, zoomUrl }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }
    const targetUrl = zoomUrl || DEFAULT_ZOOM_CONFIG.joinUrl;
    try {
      const ok = await Linking.canOpenURL(targetUrl).catch(() => false);
      if (ok) {
        await Linking.openURL(targetUrl);
      } else {
        await Linking.openURL(targetUrl);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.85, duration: 900, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [pulseAnim, glowAnim]);

  return (
    <Pressable
      style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Join Live Zoom Session"
    >
      <View style={styles.left}>
        <View style={styles.dotContainer}>
          <Animated.View
            style={[
              styles.pulseGlowRing,
              {
                opacity: glowAnim,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <View style={styles.liveDot} />
        </View>
        <Text style={styles.text} numberOfLines={1}>
          🔴 Live Zoom Session - Tap to Join
        </Text>
      </View>
      <View style={styles.arrowWrap}>
        <ArrowRight color="#ffffff" size={14} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8B0000',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.lg,
    borderWidth: 1.2,
    borderColor: '#D4AF37',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  bannerPressed: {
    backgroundColor: '#700000',
    transform: [{ scale: 0.98 }],
    opacity: 0.88,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dotContainer: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseGlowRing: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 75, 75, 0.65)',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  text: {
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
    color: '#ffffff',
    letterSpacing: 0.2,
    flex: 1,
  },
  arrowWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
});
