import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkles, Heart, RotateCw } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { Swaman } from '@/lib/constants';

type Props = {
  swaman?: Swaman | string | null;
  onPress?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export function DailySwamanCard({ swaman, onPress, onRefresh, isRefreshing }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Extract Malayalam text
  const textMl =
    typeof swaman === 'string'
      ? swaman
      : swaman?.textMl || 'ഞാൻ സദാ സർവ്വ ഗുണ സമ്പന്നനായ ശാന്തസ്വരൂപ ആത്മാവാണ്.';

  useEffect(() => {
    if (isRefreshing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isRefreshing, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.985, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="summary"
        accessibilityLabel={`ഇന്നത്തെ സ്വാമാനം: ${textMl}`}
      >
        {/* Subtle Decorative Gold Accent Top Bar */}
        <View style={styles.topAccentBar} />

        {/* Header Row with Badge & Refresh */}
        <View style={styles.headerRow}>
          <View style={styles.badgeContainer}>
            <Sparkles color="#D4AF37" size={13} strokeWidth={2.4} />
            <Text style={styles.headerTitle}>ഇന്നത്തെ സ്വാമാനം</Text>
          </View>

          <View style={styles.rightHeaderGroup}>
            {onRefresh && (
              <Pressable
                style={({ pressed }) => [styles.refreshBox, pressed && styles.actionPressed]}
                onPress={onRefresh}
                hitSlop={8}
                accessibilityLabel="Refresh Swaman"
              >
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <RotateCw color="#92400e" size={12} strokeWidth={2.4} />
                </Animated.View>
              </Pressable>
            )}
            <View style={styles.heartWrap}>
              <Heart color="#D4AF37" size={12} fill="rgba(212, 175, 55, 0.2)" strokeWidth={1.8} />
            </View>
          </View>
        </View>

        {/* Affirmation Text */}
        <View style={styles.bodyWrap}>
          <Text style={styles.quoteMarkLeft}>“</Text>
          <Text style={styles.affirmationText} numberOfLines={3}>
            {textMl}
          </Text>
          <Text style={styles.quoteMarkRight}>”</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: '#FDF8F0',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    paddingBottom: 12,
    borderWidth: 1.2,
    borderColor: '#D4AF37',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: '#FAF0DE',
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#D4AF37',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    opacity: 0.75,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 0.8,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  headerTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 11.5,
    color: '#8B0000',
    letterSpacing: 0.3,
  },
  rightHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: RADIUS.sm,
    width: 24,
    height: 24,
    ...SHADOWS.sm,
  },
  heartWrap: {
    padding: 2,
    opacity: 0.85,
  },
  bodyWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
  },
  quoteMarkLeft: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: '#D4AF37',
    lineHeight: 20,
    marginRight: 4,
    marginTop: -2,
  },
  affirmationText: {
    flex: 1,
    fontFamily: FONTS.malayalam,
    fontSize: 14.5,
    lineHeight: 22,
    color: '#3B1F0E',
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },
  quoteMarkRight: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: '#D4AF37',
    lineHeight: 20,
    marginLeft: 4,
    marginTop: -2,
  },
  actionPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
});
