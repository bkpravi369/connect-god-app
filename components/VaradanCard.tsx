import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Path, G } from 'react-native-svg';
import { BookOpen, ExternalLink, RotateCw, Sparkles } from 'lucide-react-native';
import { FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { Varadan } from '@/lib/constants';

type Props = {
  varadan: Varadan;
  onReadFull?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

function ParchmentBackground({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
      <Defs>
        <RadialGradient id="parch-center" cx="50%" cy="30%" r="85%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="35%" stopColor="#FDFBF7" />
          <Stop offset="75%" stopColor="#FAF4E8" stopOpacity={0.98} />
          <Stop offset="100%" stopColor="#F5E8D0" stopOpacity={0.82} />
        </RadialGradient>
        <RadialGradient id="parch-glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="100%" stopColor="#D4AF37" stopOpacity={0.12} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#parch-center)" rx="18" />
      <Rect x="0" y="0" width={width} height={height} fill="url(#parch-glow)" rx="18" />
      {/* Corner flourishes with gold hue */}
      <G opacity={0.5}>
        <Path d="M 12 12 Q 22 7 26 16 Q 16 14 12 12 Z" fill="#D4AF37" />
        <Path d={`M ${width - 12} 12 Q ${width - 22} 7 ${width - 26} 16 Q ${width - 16} 14 ${width - 12} 12 Z`} fill="#D4AF37" />
        <Path d={`M 12 ${height - 12} Q 22 ${height - 7} 26 ${height - 16} Q 16 ${height - 14} 12 ${height - 12} Z`} fill="#D4AF37" />
        <Path d={`M ${width - 12} ${height - 12} Q ${width - 22} ${height - 7} ${width - 26} ${height - 16} Q ${width - 16} ${height - 14} ${width - 12} ${height - 12} Z`} fill="#D4AF37" />
      </G>
      {/* 1.5px gold border with #D4AF37 */}
      <Rect x="1" y="1" width={width - 2} height={height - 2} fill="none" stroke="#D4AF37" strokeWidth="1.5" rx="17" opacity={0.92} />
      <Rect x="3.5" y="3.5" width={width - 7} height={height - 7} fill="none" stroke="#D4AF37" strokeWidth="0.6" rx="15" opacity={0.45} />
    </Svg>
  );
}

export function VaradanCard({ varadan, onReadFull, onRefresh, isRefreshing }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0.2)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [dims, setDims] = React.useState({ w: 320, h: 140 });

  // Infinite subtle breathing golden aura glow
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1.008,
            duration: 2800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.5,
            duration: 2800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 2800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.2,
            duration: 2800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, glowPulse]);

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

  const handlePortalPress = async () => {
    if (onReadFull) {
      onReadFull();
    } else {
      await Linking.openURL('https://madhubanmurli.org/');
    }
  };

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yy = String(today.getFullYear()).slice(-2);
  const formattedDate = `${dd}.${mm}.${yy}`;

  const blessingText =
    varadan.textMl ||
    varadan.text ||
    'സർവ്വ ഖജനാവുകളാലും സമ്പന്നമായി, മാസ്റ്റർ ദാതാവായി മാറി സർവ്വ ആത്മാക്കൾക്കും ശാന്തിയുടെയും ശക്തിയുടെയും ദാനം നൽകുന്ന സദാ തൃപ്ത ആത്മാവായി ഭവിക്കട്ടെ.';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ scale: pulse }],
        },
      ]}
      onLayout={(e) => setDims({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <ParchmentBackground width={dims.w} height={dims.h} />
      <View style={styles.inner}>
        {/* Top Header Row with Title & Refresh */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.headingAccent} />
            <Text style={styles.heading}>വരദാനം ({formattedDate})</Text>
            <Sparkles color="#D4AF37" size={14} strokeWidth={2.4} />
          </View>

          {onRefresh && (
            <Pressable
              style={({ pressed }) => [styles.refreshBox, pressed && styles.actionPressed]}
              onPress={onRefresh}
              hitSlop={8}
              accessibilityLabel="Refresh Varadan"
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RotateCw color="#92400e" size={13} strokeWidth={2.4} />
              </Animated.View>
            </Pressable>
          )}
        </View>

        {/* Dynamic / Editable Blessing Text */}
        <Text style={styles.body}>{blessingText}</Text>

        {/* Action Button: സമ്പൂർണ്ണ മുരളി വായിക്കുക (Official Portal) */}
        <Pressable
          style={({ pressed }) => [styles.portalBtn, pressed && styles.actionPressed]}
          onPress={handlePortalPress}
          accessibilityLabel="Open Official Madhuban Murli Portal"
        >
          <BookOpen color="#92400e" size={14} strokeWidth={2.4} />
          <Text style={styles.portalBtnText}>സമ്പൂർണ്ണ മുരളി വായിക്കുക</Text>
          <ExternalLink color="#92400e" size={13} strokeWidth={2.4} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: 18,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  inner: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headingAccent: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#D4AF37',
  },
  heading: {
    fontFamily: FONTS.malayalamBold,
    fontSize: 14.5,
    color: '#92400e',
    letterSpacing: 0.3,
  },
  refreshBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: RADIUS.md,
    width: 28,
    height: 28,
    ...SHADOWS.sm,
  },
  body: {
    fontFamily: FONTS.malayalam,
    fontSize: 14.5,
    color: '#431407',
    lineHeight: 23,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  portalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1.2,
    borderColor: '#D4AF37',
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 4,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  portalBtnText: {
    fontFamily: FONTS.malayalamBold,
    fontSize: 12.5,
    color: '#92400e',
  },
  actionPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
});
