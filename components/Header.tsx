import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View, Text } from 'react-native';
import { Menu, Shield, Sparkles } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { APP_NAME, APP_LOGO } from '@/lib/constants';
import { BKSunEmblem } from '@/components/Logos';

type Props = {
  onMenuPress: () => void;
  onLogoPress?: () => void;
  onAdminPress?: () => void;
};

export function Header({ onMenuPress, onLogoPress, onAdminPress }: Props) {
  const [logoFailed, setLogoFailed] = useState(false);
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Infinite subtle breathing golden aura glow effect (60 FPS GPU-accelerated)
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowAnim, {
            toValue: 0.95,
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.02,
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.0,
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [glowAnim, pulseScale]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.btnPressed]}
          onPress={onMenuPress}
          hitSlop={12}
          accessibilityLabel="Open menu"
        >
          <Menu color={COLORS.neutral[800]} size={23} strokeWidth={2.2} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.emblem, pressed && styles.emblemPressed]}
          onPress={onLogoPress}
          accessibilityLabel="Go to Home"
        >
          <Animated.View
            style={[
              styles.emblemInner,
              {
                transform: [{ scale: pulseScale }],
                shadowOpacity: glowAnim,
              },
            ]}
          >
            <View style={styles.logoAura}>
              {logoFailed ? (
                <BKSunEmblem size={24} />
              ) : (
                <Image
                  source={{ uri: APP_LOGO }}
                  style={styles.logoImg}
                  resizeMode="contain"
                  onError={() => setLogoFailed(true)}
                />
              )}
            </View>
            <Text style={styles.emblemText}>{APP_NAME}</Text>
            <Sparkles color="#D4AF37" size={13} strokeWidth={2.2} />
          </Animated.View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.iconButton, styles.adminBtn, pressed && styles.btnPressed]}
          onPress={onAdminPress}
          hitSlop={12}
          accessibilityLabel="Admin Panel"
        >
          <Shield color={COLORS.primary[700]} size={19} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.22)',
    ...SHADOWS.sm,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
  },
  adminBtn: {
    backgroundColor: 'rgba(255, 245, 245, 0.85)',
    borderColor: 'rgba(220, 38, 38, 0.15)',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  emblem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  emblemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: RADIUS.full,
    backgroundColor: '#ffffff',
    borderWidth: 1.4,
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 4,
  },
  logoAura: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffdfa',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 3,
  },
  logoImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  emblemText: {
    fontFamily: FONTS.sansBold,
    fontSize: 14.5,
    color: COLORS.primary[800],
    letterSpacing: 0.4,
  },
});
