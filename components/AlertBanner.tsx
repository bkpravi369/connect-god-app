import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, X, Volume2 } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '@/lib/theme';

import { Announcement } from '@/lib/constants';

type Props = {
  announcement?: Announcement;
  title?: string;
  body?: string;
  enabled?: boolean;
  onPress?: () => void;
  onDismiss?: () => void;
};

export function AlertBanner(props: Props) {
  const { onPress, onDismiss } = props;
  const title = props.announcement?.title ?? props.title ?? '';
  const body = props.announcement?.body ?? props.body ?? '';
  const enabled = props.announcement?.enabled ?? props.enabled ?? true;

  const animatedValue = useRef(new Animated.Value(0)).current;
  const marqueeText = title ? `${title.toUpperCase()} • ${body}     ✦     ${title.toUpperCase()} • ${body}` : `${body}     ✦     ${body}`;

  useEffect(() => {
    if (!enabled || !body.trim()) return;

    animatedValue.setValue(0);
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [body, title, enabled, animatedValue]);

  if (!enabled || !body.trim()) return null;

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [300, -350],
  });

  return (
    <View style={styles.marqueeContainer}>
      <Pressable style={styles.innerPressable} onPress={onPress}>
        <View style={styles.badge}>
          <Volume2 color="#fff" size={13} strokeWidth={2.4} />
          <Text style={styles.badgeText}>NOTICE</Text>
        </View>

        <View style={styles.marqueeViewport}>
          <Animated.View style={[styles.marqueeTrack, { transform: [{ translateX }] }]}>
            <Text style={styles.marqueeContent} numberOfLines={1}>
              {marqueeText}
            </Text>
          </Animated.View>
        </View>

        {onDismiss && (
          <Pressable style={styles.closeBtn} onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss">
            <X color={COLORS.divine[600]} size={14} strokeWidth={2.4} />
          </Pressable>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  marqueeContainer: {
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    overflow: 'hidden',
    height: 38,
    justifyContent: 'center',
  },
  innerPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: '100%',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8B0000',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: '#D4AF37',
    zIndex: 2,
  },
  badgeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 9.5,
    color: '#ffffff',
    letterSpacing: 0.6,
  },
  marqueeViewport: {
    flex: 1,
    overflow: 'hidden',
    height: 24,
    justifyContent: 'center',
  },
  marqueeTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marqueeContent: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12.5,
    color: '#92400e',
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 4,
    marginLeft: SPACING.xs,
    zIndex: 2,
  },
});

