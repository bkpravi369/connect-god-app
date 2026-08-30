import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '@/lib/theme';

type Props = {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
};

export function ShimmerSkeleton({
  width = '100%',
  height = 20,
  borderRadius = RADIUS.md,
  style,
}: Props) {
  const shimmerAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: shimmerAnim,
        },
        style,
      ]}
    />
  );
}

export function VideoCardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <ShimmerSkeleton height={94} borderRadius={RADIUS.lg} />
      <View style={{ marginTop: 8, gap: 6 }}>
        <ShimmerSkeleton height={14} width="85%" borderRadius={4} />
        <ShimmerSkeleton height={10} width="55%" borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e2e8f0',
  },
  cardSkeleton: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
});
