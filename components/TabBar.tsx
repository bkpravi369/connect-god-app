import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Home, BookOpen, Clock, BarChart3, Music, Phone } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';

export type TabKey = 'home' | 'murli' | 'traffic' | 'chart' | 'media' | 'contact';

const TABS: {
  key: TabKey;
  label: string;
  Icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>;
}[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'murli', label: 'Murli', Icon: BookOpen },
  { key: 'traffic', label: 'Traffic', Icon: Clock },
  { key: 'chart', label: 'Chart', Icon: BarChart3 },
  { key: 'media', label: 'Media', Icon: Music },
  { key: 'contact', label: 'Contact', Icon: Phone },
];

type Props = {
  active: TabKey;
  onChange: (key: TabKey) => void;
};

function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: (typeof TABS)[0];
  isActive: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1.08 : 1)).current;
  const { Icon } = tab;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1.08 : 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [isActive, scaleAnim]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tab,
        pressed && styles.tabPressed,
      ]}
      onPress={onPress}
      accessibilityLabel={tab.label}
      hitSlop={6}
    >
      <View style={styles.tabInner}>
        <Animated.View
          style={[
            styles.iconWrap,
            isActive && styles.iconWrapActive,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Icon
            color={isActive ? '#8B0000' : COLORS.neutral[400]}
            size={18}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </Animated.View>

        <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
          {tab.label}
        </Text>

        {isActive && (
          <View style={styles.indicatorWrap}>
            <View style={styles.indicatorGlow} />
            <View style={styles.indicatorPill} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function TabBar({ active, onChange }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.floatingContainer}>
        {TABS.map((tab) => (
          <TabItem
            key={tab.key}
            tab={tab}
            isActive={active === tab.key}
            onPress={() => onChange(tab.key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: SPACING.sm,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  floatingContainer: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: RADIUS['2xl'],
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    ...SHADOWS.glow,
  },
  tab: {
    flex: 1,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
    position: 'relative',
  },
  iconWrap: {
    width: 34,
    height: 28,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255, 245, 245, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  label: {
    fontFamily: FONTS.sansMedium,
    fontSize: 9.5,
    color: COLORS.neutral[400],
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#8B0000',
    fontFamily: FONTS.sansBold,
  },
  indicatorWrap: {
    position: 'absolute',
    bottom: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorGlow: {
    position: 'absolute',
    width: 12,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D4AF37',
    opacity: 0.35,
  },
  indicatorPill: {
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#D4AF37',
  },
});
