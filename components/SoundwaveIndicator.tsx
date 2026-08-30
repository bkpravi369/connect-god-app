import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { COLORS } from '@/lib/theme';

type Props = {
  isPlaying?: boolean;
  color?: string;
  size?: number;
};

export function SoundwaveIndicator({ isPlaying = true, color = '#D4AF37', size = 16 }: Props) {
  const anim1 = useRef(new Animated.Value(0.3)).current;
  const anim2 = useRef(new Animated.Value(0.7)).current;
  const anim3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!isPlaying) {
      anim1.setValue(0.2);
      anim2.setValue(0.3);
      anim3.setValue(0.2);
      return;
    }

    const createLoop = (anim: Animated.Value, duration: number, minVal: number, maxVal: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: maxVal,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: minVal,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const loop1 = createLoop(anim1, 450, 0.25, 1.0);
    const loop2 = createLoop(anim2, 380, 0.35, 0.95);
    const loop3 = createLoop(anim3, 520, 0.2, 0.85);

    loop1.start();
    loop2.start();
    loop3.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [isPlaying, anim1, anim2, anim3]);

  const barWidth = Math.max(2.2, size / 6);
  const gap = Math.max(1.8, size / 8);

  return (
    <View style={[styles.container, { height: size, gap }]}>
      <Animated.View
        style={[
          styles.bar,
          {
            width: barWidth,
            height: size,
            backgroundColor: color,
            transform: [{ scaleY: anim1 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            width: barWidth,
            height: size,
            backgroundColor: color,
            transform: [{ scaleY: anim2 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            width: barWidth,
            height: size,
            backgroundColor: color,
            transform: [{ scaleY: anim3 }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 2,
    transformOrigin: 'bottom',
  },
});
