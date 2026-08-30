import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Youtube, Instagram, Facebook, ChevronRight } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { Channel } from '@/lib/constants';
import { ChannelLogo } from '@/components/Logos';

type Props = {
  channel: Channel;
  onPress?: () => void;
  onYouTube?: () => void;
  onInstagram?: () => void;
  onFacebook?: () => void;
  onPinterest?: () => void;
};

function ChannelEmblem({ channel }: { channel: Channel }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!imgFailed && channel.logo) {
    return (
      <Image
        source={{ uri: channel.logo }}
        style={styles.emblemImg}
        resizeMode="cover"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return <ChannelLogo id={channel.id} size={42} />;
}

export function ChannelHub({ channel, onPress, onYouTube, onInstagram, onFacebook, onPinterest }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} onPress={onPress}>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: channel.thumbnail }} style={styles.thumb} resizeMode="cover" />
        <View style={styles.thumbOverlay} />
        {/* Strictly formatted circular avatar logo with subtle 1.5px gold border */}
        <View style={styles.emblem}>
          <ChannelEmblem channel={channel} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.channelName} numberOfLines={1}>{channel.name}</Text>
            {channel.nameMl && <Text style={styles.channelNameMl} numberOfLines={1}>{channel.nameMl}</Text>}
          </View>
          <ChevronRight color={COLORS.neutral[300]} size={16} strokeWidth={2.2} />
        </View>

        <View style={styles.actions}>
          {onYouTube && (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={onYouTube}
              hitSlop={6}
              accessibilityLabel="Open YouTube"
            >
              <Youtube color="#dc2626" size={17} strokeWidth={2.2} />
            </Pressable>
          )}
          {onInstagram && (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={onInstagram}
              hitSlop={6}
              accessibilityLabel="Open Instagram"
            >
              <Instagram color="#c13584" size={17} strokeWidth={2.2} />
            </Pressable>
          )}
          {onFacebook && (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={onFacebook}
              hitSlop={6}
              accessibilityLabel="Open Facebook"
            >
              <Facebook color="#1877f2" size={17} strokeWidth={2.2} />
            </Pressable>
          )}
          {onPinterest && (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={onPinterest}
              hitSlop={6}
              accessibilityLabel="Open Pinterest"
            >
              <Text style={styles.pinIconText}>P</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.neutral[100],
    ...SHADOWS.sm,
  },
  thumbWrap: {
    position: 'relative',
    height: 95,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(67, 20, 7, 0.22)',
  },
  // Circular logo strictly formatted as circular with pure gold ring #D4AF37
  emblem: {
    position: 'absolute',
    left: SPACING.md,
    bottom: -18,
    width: 46,
    height: 46,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  emblemImg: {
    width: 46,
    height: 46,
    borderRadius: 9999,
  },
  body: {
    paddingTop: 24,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelName: {
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
    color: COLORS.neutral[900],
  },
  channelNameMl: {
    fontFamily: FONTS.malayalamBold,
    fontSize: 11,
    color: COLORS.primary[700],
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: SPACING.sm,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.92 }],
    backgroundColor: COLORS.neutral[100],
  },
  pinIconText: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: '#e60023',
    lineHeight: 18,
  },
});
