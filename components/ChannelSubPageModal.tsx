import React, { useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X, Youtube, Instagram, Facebook, ExternalLink, Play } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { Channel } from '@/lib/constants';
import { ChannelLogo } from '@/components/Logos';
import { useToast } from '@/components/ToastProvider';

type Props = {
  visible: boolean;
  channel: Channel | null;
  onClose: () => void;
  onPlayVideo?: (video: any) => void;
};

// SVG or custom Pinterest Icon
function PinterestIcon({ color = '#E60023', size = 20 }: { color?: string; size?: number }) {
  return (
    <View style={[styles.pinterestWrap, { width: size, height: size }]}>
      <Text style={[styles.pinterestText, { color, fontSize: size * 0.85 }]}>P</Text>
    </View>
  );
}

export function ChannelSubPageModal({ visible, channel, onClose, onPlayVideo }: Props) {
  const toast = useToast();
  const [logoErr, setLogoErr] = useState(false);

  if (!channel) return null;

  const openUrl = async (url: string, name: string) => {
    if (!url) {
      toast.show(`${name} link not configured`, 'info');
      return;
    }
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) {
      await Linking.openURL(url);
    } else {
      toast.show(`Opening ${name}...`, 'info');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Channel Banner */}
          <View style={styles.bannerWrap}>
            <Image source={{ uri: channel.thumbnail }} style={styles.bannerImg} resizeMode="cover" />
            <View style={styles.bannerOverlay} />
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <X color="#ffffff" size={20} strokeWidth={2.4} />
            </Pressable>

            {/* Circular Avatar Logo with subtle 1.5px gold border */}
            <View style={styles.avatarWrap}>
              {!logoErr && channel.logo ? (
                <Image
                  source={{ uri: channel.logo }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                  onError={() => setLogoErr(true)}
                />
              ) : (
                <ChannelLogo id={channel.id} size={64} />
              )}
            </View>
          </View>

          {/* Body Content */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.metaRow}>
              <Text style={styles.channelTitle}>{channel.name}</Text>
              {channel.nameMl && <Text style={styles.channelTitleMl}>{channel.nameMl}</Text>}
              {channel.description && <Text style={styles.channelDesc}>{channel.description}</Text>}
            </View>

            {/* Social Platform Action Buttons */}
            <Text style={styles.sectionHeading}>OFFICIAL PLATFORMS</Text>
            <View style={styles.platformsGrid}>
              {/* YouTube */}
              <Pressable
                style={({ pressed }) => [styles.platformBtn, styles.ytBtn, pressed && styles.btnPressed]}
                onPress={() => openUrl(channel.youtubeUrl, 'YouTube')}
              >
                <View style={styles.platformIconWrap}>
                  <Youtube color="#ffffff" size={20} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.platformName}>YouTube Channel</Text>
                  <Text style={styles.platformSub}>Subscribe & Watch</Text>
                </View>
                <ExternalLink color="#ffffff" size={16} strokeWidth={2.2} />
              </Pressable>

              {/* Instagram */}
              <Pressable
                style={({ pressed }) => [styles.platformBtn, styles.igBtn, pressed && styles.btnPressed]}
                onPress={() => openUrl(channel.instagramUrl, 'Instagram')}
              >
                <View style={styles.platformIconWrap}>
                  <Instagram color="#ffffff" size={20} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.platformName}>Instagram</Text>
                  <Text style={styles.platformSub}>Follow for updates</Text>
                </View>
                <ExternalLink color="#ffffff" size={16} strokeWidth={2.2} />
              </Pressable>

              {/* Facebook */}
              <Pressable
                style={({ pressed }) => [styles.platformBtn, styles.fbBtn, pressed && styles.btnPressed]}
                onPress={() => openUrl(channel.facebookUrl, 'Facebook')}
              >
                <View style={styles.platformIconWrap}>
                  <Facebook color="#ffffff" size={20} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.platformName}>Facebook Page</Text>
                  <Text style={styles.platformSub}>Like & Connect</Text>
                </View>
                <ExternalLink color="#ffffff" size={16} strokeWidth={2.2} />
              </Pressable>

              {/* Pinterest */}
              <Pressable
                style={({ pressed }) => [styles.platformBtn, styles.pinBtn, pressed && styles.btnPressed]}
                onPress={() => openUrl(channel.pinterestUrl, 'Pinterest')}
              >
                <View style={styles.platformIconWrap}>
                  <PinterestIcon color="#ffffff" size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.platformName}>Pinterest</Text>
                  <Text style={styles.platformSub}>Spiritual quotes & art</Text>
                </View>
                <ExternalLink color="#ffffff" size={16} strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Featured Video Box */}
            {channel.featuredVideoId && (
              <View style={styles.featuredVideoSection}>
                <Text style={styles.sectionHeading}>FEATURED MEDIA</Text>
                <Pressable
                  style={styles.featuredBox}
                  onPress={() => {
                    if (channel.id === 'bk-sheeja' || channel.name === 'BK Sheeja') {
                      openUrl(channel.youtubeUrl || 'https://www.youtube.com/channel/UCvQFuOM38iAZD7ltMujOq-g', 'YouTube');
                      return;
                    }
                    if (onPlayVideo) {
                      onPlayVideo({
                        id: channel.id,
                        title: channel.featuredVideoTitle || channel.name,
                        subtitle: channel.name,
                        url: channel.youtubeUrl,
                        videoId: channel.featuredVideoId,
                        channelName: channel.name,
                        badge: 'FEATURED',
                        badgeColor: COLORS.primary[600],
                      });
                    } else {
                      openUrl(channel.youtubeUrl, 'YouTube');
                    }
                  }}
                >
                  <View style={styles.featuredPlayWrap}>
                    <Play color="#ffffff" size={24} strokeWidth={2.4} fill="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featuredTitle} numberOfLines={2}>
                      {channel.featuredVideoTitle || 'Watch Featured Session'}
                    </Text>
                    <Text style={styles.featuredSub}>Tap for in-app video playback</Text>
                  </View>
                </Pressable>
              </View>
            )}

            <View style={{ height: SPACING['3xl'] }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: COLORS.neutral[0],
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    maxHeight: '92%',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  bannerWrap: {
    position: 'relative',
    height: 140,
    backgroundColor: COLORS.primary[800],
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(67, 20, 7, 0.35)',
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Circular logo strictly formatted as circular (border-radius: 9999px) with pure gold ring #D4AF37
  avatarWrap: {
    position: 'absolute',
    left: SPACING.xl,
    bottom: -34,
    width: 72,
    height: 72,
    borderRadius: 9999,
    borderWidth: 2.5,
    borderColor: '#D4AF37',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 5,
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 9999,
  },
  body: {
    paddingTop: 42,
    paddingHorizontal: SPACING.xl,
  },
  metaRow: {
    marginBottom: SPACING.xl,
  },
  channelTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 20,
    color: COLORS.neutral[900],
  },
  channelTitleMl: {
    fontFamily: FONTS.malayalamBold,
    fontSize: 14,
    color: COLORS.primary[700],
    marginTop: 2,
  },
  channelDesc: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.neutral[600],
    lineHeight: 19,
    marginTop: SPACING.xs,
  },
  sectionHeading: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    color: COLORS.neutral[400],
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
  },
  platformsGrid: {
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  platformBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    ...SHADOWS.sm,
  },
  ytBtn: { backgroundColor: '#dc2626' },
  igBtn: { backgroundColor: '#c13584' },
  fbBtn: { backgroundColor: '#1877f2' },
  pinBtn: { backgroundColor: '#e60023' },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  platformIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformName: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: '#ffffff',
  },
  platformSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  pinterestWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinterestText: {
    fontFamily: FONTS.sansBold,
    fontWeight: '900',
  },
  featuredVideoSection: {
    marginBottom: SPACING.xl,
  },
  featuredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  featuredPlayWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
    color: COLORS.neutral[900],
  },
  featuredSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.primary[700],
    marginTop: 2,
  },
});