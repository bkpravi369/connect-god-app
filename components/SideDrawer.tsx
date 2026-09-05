import React, { useEffect, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Info,
  X,
  Youtube,
  Facebook,
  Instagram,
  ChevronRight,
  ChevronDown,
  Shield,
  ShieldCheck,
  BookOpen,
  Music,
  MessageCircle,
  Send,
  Image as ImageIcon,
  User,
  Download,
  Sparkles,
  FileText,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { APP_NAME, APP_TAGLINE, APP_LOGO, CHANNELS, SocialLinks, DEFAULT_SOCIAL_LINKS, STORAGE_KEYS } from '@/lib/constants';
import { getJSON } from '@/lib/storage';
import { BKSunEmblem, ChannelLogo } from '@/components/Logos';

export type ProfileData = {
  name: string;
  subtitle: string;
  designation: string;
  cvUrl: string;
  phone?: string;
  email?: string;
  bio: string;
  highlights: string[];
};

export const PROFILES: ProfileData[] = [
  {
    name: 'BK Sheeba',
    subtitle: 'Assistant Director, BK Calicut',
    designation: 'Assistant Director, Brahma Kumaris Calicut',
    cvUrl: '/profiles/bk-sheeba-cv.pdf',
    phone: '989556762',
    email: 'brahmakumarisheeba@gmail.com',
    bio: 'Senior Faculty of Rajayoga at Prajapita Brahma Kumaris Ishwariya Vishwa Vidyalaya for over 30 years. Renowned spiritual speaker, television personality, and youth motivator.',
    highlights: [
      'Senior Rajayoga Faculty (30+ Years)',
      'Trained cadets at Indian Naval Academy & IIM Calicut',
      'Masters in Crisis & Self Management (Annamalai University)',
    ],
  },
  {
    name: 'BK Sheeja',
    subtitle: 'Spiritual Teacher & Counsellor',
    designation: 'Spiritual Teacher & Counsellor',
    cvUrl: '/profiles/bk-sheeja-cv.pdf',
    phone: '09895777017',
    email: 'bksheeja71@gmail.com',
    bio: 'Dedicated spiritual teacher, counsellor, and Rajyoga practitioner for over 34 years. Expert in emotional wellness, stress-free lifestyle, and mind meditation.',
    highlights: [
      '34 Years of Rajyoga Meditation Practitioner Experience',
      'M.Sc in Value Education & Spirituality',
      'Renowned Speaker & Stress Management Counsellor',
    ],
  },
];

const SCREEN_W = Math.min(Dimensions.get('window').width, 440);
const DRAWER_W = Math.min(SCREEN_W * 0.84, 360);

const SOCIAL_COLORS = {
  youtube: COLORS.error[500],
  instagram: COLORS.accent[500],
  facebook: COLORS.primary[600],
};

type DrawerChannel = {
  id: string;
  name: string;
  logo?: string;
  links: {
    youtube: string;
    instagram: string;
    facebook: string;
    pinterest: string;
  };
};

const DRAWER_CHANNELS: DrawerChannel[] = CHANNELS.map((c) => ({
  id: c.id,
  name: c.name,
  logo: c.logo,
  links: {
    youtube: c.youtubeUrl,
    instagram: c.instagramUrl,
    facebook: c.facebookUrl,
    pinterest: c.pinterestUrl,
  },
}));

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdminPress: () => void;
  onMurliPress: () => void;
  onMeditationPress: () => void;
  onWallpapersPress?: () => void;
  onAboutPress?: () => void;
  onSelectChannel?: (channelId: string) => void;
  socialLinks?: SocialLinks;
};

function DrawerChannelAvatar({ channel }: { channel: DrawerChannel }) {
  const [failed, setFailed] = useState(false);
  if (!failed && channel.logo) {
    return (
      <Image
        source={{ uri: channel.logo }}
        style={styles.channelAvatar}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return <ChannelLogo id={channel.id} size={40} />;
}

function DrawerLogo() {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <Image
        source={{ uri: APP_LOGO }}
        style={styles.appLogo}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }
  return <BKSunEmblem size={44} />;
}

export function SideDrawer({ visible, onClose, onAdminPress, onMurliPress, onMeditationPress, onWallpapersPress, onAboutPress, onSelectChannel, socialLinks }: Props) {
  const router = useRouter();
  const offscreen = -(DRAWER_W + 60);
  const translateX = React.useRef(new Animated.Value(offscreen)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [links, setLinks] = useState<SocialLinks>(DEFAULT_SOCIAL_LINKS);
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null);

  const handleOpenCV = (url: string) => {
    if (!url) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
      return;
    }
    Linking.openURL(url).catch(() => {});
  };

  useEffect(() => {
    const stored = getJSON<SocialLinks>(STORAGE_KEYS.socialLinks, DEFAULT_SOCIAL_LINKS);
    setLinks({
      ...DEFAULT_SOCIAL_LINKS,
      ...stored,
      youtubeChannels: Array.isArray(stored?.youtubeChannels) ? stored.youtubeChannels : [],
    });
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: offscreen, duration: 240, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
      setExpandedChannel(null);
    }
  }, [visible, translateX, overlayOpacity, offscreen]);

  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => handler.remove();
  }, [visible, onClose]);

  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  if (!mounted) return null;

  const toggleChannel = (id: string) =>
    setExpandedChannel((prev) => (prev === id ? null : id));

  const openLink = async (url: string) => {
    onClose();
    if (!url) return;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) await Linking.openURL(url);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {/* ── Drawer header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <DrawerLogo />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.appName}>{APP_NAME}</Text>
              <Text style={styles.appTag}>{APP_TAGLINE}</Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Close menu"
            >
              <X color={COLORS.neutral[0]} size={22} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

          {/* ── Channel Hubs ────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>CHANNEL HUBS</Text>
          {DRAWER_CHANNELS.map((ch) => {
            const isOpen = expandedChannel === ch.id;
            return (
              <View key={ch.id} style={styles.channelGroup}>
                <Pressable
                  style={({ pressed }) => [styles.channelRow, pressed && styles.rowPressed]}
                  onPress={() => toggleChannel(ch.id)}
                >
                  <DrawerChannelAvatar channel={ch} />
                  <Text style={styles.channelName} numberOfLines={1}>{ch.name}</Text>
                  <ChevronDown
                    color={COLORS.neutral[400]}
                    size={18}
                    strokeWidth={2.2}
                    style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
                  />
                </Pressable>

                {isOpen && (
                  <View style={styles.subMenu}>
                    {onSelectChannel && (
                      <Pressable
                        style={styles.channelSubPageBtn}
                        onPress={() => {
                          onClose();
                          onSelectChannel(ch.id);
                        }}
                      >
                        <Text style={styles.channelSubPageBtnText}>Open Channel Hub Page</Text>
                        <ChevronRight color={COLORS.primary[600]} size={14} strokeWidth={2.2} />
                      </Pressable>
                    )}
                    <SubLink
                      label="YouTube"
                      icon={<Youtube color="#dc2626" size={16} strokeWidth={2} />}
                      color="#dc2626"
                      onPress={() => openLink(ch.links.youtube)}
                    />
                    <SubLink
                      label="Facebook"
                      icon={<Facebook color="#1877f2" size={16} strokeWidth={2} />}
                      color="#1877f2"
                      onPress={() => openLink(ch.links.facebook)}
                    />
                    <SubLink
                      label="Instagram"
                      icon={<Instagram color="#c13584" size={16} strokeWidth={2} />}
                      color="#c13584"
                      onPress={() => openLink(ch.links.instagram)}
                    />
                    <SubLink
                      label="Pinterest"
                      icon={<Text style={{ color: '#e60023', fontWeight: '900', fontSize: 13 }}>P</Text>}
                      color="#e60023"
                      onPress={() => openLink(ch.links.pinterest)}
                    />
                  </View>
                )}
              </View>
            );
          })}

          {/* ── Quick Links ──────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>QUICK LINKS</Text>

          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.rowPressed]}
            onPress={() => {
              onClose();
              Linking.openURL('https://madhubanmurli.org/');
            }}
          >
            <View style={styles.linkIconWrap}>
              <BookOpen color={COLORS.primary[700]} size={20} strokeWidth={2} />
            </View>
            <Text style={styles.linkText}>Official Madhuban Murli</Text>
            <ChevronRight color={COLORS.neutral[300]} size={18} strokeWidth={2} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.rowPressed]}
            onPress={() => { onClose(); onMeditationPress(); }}
          >
            <View style={styles.linkIconWrap}>
              <Music color={COLORS.primary[700]} size={20} strokeWidth={2} />
            </View>
            <Text style={styles.linkText}>Meditation</Text>
            <ChevronRight color={COLORS.neutral[300]} size={18} strokeWidth={2} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.rowPressed]}
            onPress={() => {
              onClose();
              if (onWallpapersPress) {
                onWallpapersPress();
              } else {
                router.push('/wallpapers' as any);
              }
            }}
          >
            <View style={[styles.linkIconWrap, { backgroundColor: '#fff7ed' }]}>
              <ImageIcon color={COLORS.saffron[600]} size={20} strokeWidth={2} />
            </View>
            <Text style={styles.linkText}>Wallpapers</Text>
            <ChevronRight color={COLORS.neutral[300]} size={18} strokeWidth={2} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.rowPressed]}
            onPress={() => {
              onClose();
              if (onAboutPress) {
                onAboutPress();
              } else {
                router.push('/about' as any);
              }
            }}
          >
            <View style={[styles.linkIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Info color="#1d4ed8" size={20} strokeWidth={2} />
            </View>
            <Text style={styles.linkText}>About Us</Text>
            <ChevronRight color={COLORS.neutral[300]} size={18} strokeWidth={2} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.rowPressed]}
            onPress={() => {
              onClose();
              router.push('/privacy' as any);
            }}
          >
            <View style={[styles.linkIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <ShieldCheck color="#059669" size={20} strokeWidth={2} />
            </View>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <ChevronRight color={COLORS.neutral[300]} size={18} strokeWidth={2} />
          </Pressable>

          {/* ── Profiles ────────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>PROFILES</Text>
          {PROFILES.map((p) => (
            <Pressable
              key={p.name}
              style={({ pressed }) => [styles.profileRow, pressed && styles.rowPressed]}
              onPress={() => setSelectedProfile(p)}
            >
              <View style={styles.profileAvatarWrap}>
                <User color={COLORS.primary[600]} size={20} strokeWidth={2} />
              </View>
              <View style={styles.profileMeta}>
                <Text style={styles.profileName}>{p.name}</Text>
                <Text style={styles.profileSub} numberOfLines={1}>{p.subtitle}</Text>
              </View>
              <ChevronRight color={COLORS.neutral[300]} size={18} strokeWidth={2} />
            </Pressable>
          ))}

          {/* Other social platforms */}
          <View style={[styles.socialSection, { marginTop: SPACING.sm }]}>
            <Text style={styles.socialSubLabel}>Social Media</Text>
            <View style={styles.socialRow}>
              <SocialBtn icon={<Instagram color="#E1306C" size={18} strokeWidth={2} />} bg="#E1306C18" onPress={() => openLink(links?.instagram || '')} />
              <SocialBtn icon={<Facebook color="#1877F2" size={18} strokeWidth={2} />} bg="#1877F218" onPress={() => openLink(links?.facebook || '')} />
              <SocialBtn icon={<MessageCircle color="#25D366" size={18} strokeWidth={2} />} bg="#25D36618" onPress={() => openLink(links?.whatsapp || '')} />
              <SocialBtn icon={<Send color="#0088cc" size={18} strokeWidth={2} />} bg="#0088cc18" onPress={() => openLink(links?.telegram || '')} />
            </View>
          </View>

          {/* ── Admin Panel ─────────────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [styles.adminLinkRow, pressed && styles.rowPressed]}
            onPress={() => { onClose(); onAdminPress(); }}
          >
            <View style={styles.adminLinkIconWrap}>
              <Shield color={COLORS.secondary[600]} size={20} strokeWidth={2} />
            </View>
            <Text style={styles.adminLinkText}>Admin Panel</Text>
            <ChevronRight color={COLORS.secondary[400]} size={18} strokeWidth={2} />
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Version 1.0.0</Text>
            <Text style={styles.footerSub}>Made with devotion · Om Shanti</Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* ── Profile Details Modal ───────────────────────────────── */}
      <Modal
        visible={!!selectedProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProfile(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedProfile(null)}
        >
          {selectedProfile && (
            <Pressable
              style={styles.profileModalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.profileModalHeader}>
                <View style={styles.profileModalAvatar}>
                  <User color={COLORS.primary[600]} size={28} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalName}>{selectedProfile.name}</Text>
                  <Text style={styles.modalDesignation}>{selectedProfile.subtitle}</Text>
                </View>
                <Pressable
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedProfile(null)}
                  hitSlop={8}
                  accessibilityLabel="Close profile details"
                >
                  <X color={COLORS.neutral[500]} size={18} strokeWidth={2.5} />
                </Pressable>
              </View>

              <Text style={styles.modalBio}>{selectedProfile.bio}</Text>

              <View style={styles.modalHighlights}>
                <Text style={styles.highlightsHeader}>KEY HIGHLIGHTS</Text>
                {selectedProfile.highlights.map((h, i) => (
                  <View key={i} style={styles.modalHighlightRow}>
                    <Sparkles color="#d97706" size={14} strokeWidth={2} style={{ marginTop: 2 }} />
                    <Text style={styles.modalHighlightText}>{h}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.downloadCvBtn,
                  pressed && styles.downloadCvBtnPressed,
                ]}
                onPress={() => handleOpenCV(selectedProfile.cvUrl)}
              >
                <FileText color="#ffffff" size={18} strokeWidth={2.2} />
                <Text style={styles.downloadCvBtnText}>Download CV (PDF)</Text>
                <Download color="#ffffff" size={16} strokeWidth={2.2} />
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

function SubLink({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.subLinkRow, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={[styles.subLinkIcon, { backgroundColor: `${color}18` }]}>{icon}</View>
      <Text style={[styles.subLinkText, { color }]}>{label}</Text>
      <ChevronRight color={color} size={14} strokeWidth={2} />
    </Pressable>
  );
}

function SocialBtn({ icon, bg, onPress }: { icon: React.ReactNode; bg: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.socialBtn, { backgroundColor: bg }, pressed && styles.socialBtnPressed]}
      onPress={onPress}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(67, 20, 7, 0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: COLORS.neutral[0],
    ...SHADOWS.lg,
  },
  // Header
  header: {
    backgroundColor: COLORS.primary[800],
    paddingTop: 56,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  appLogo: {
    width: 50,
    height: 50,
  },
  appName: {
    fontFamily: FONTS.sansBold,
    fontSize: 20,
    color: COLORS.neutral[0],
  },
  appTag: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.primary[200],
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  // Body
  body: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sectionLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    color: COLORS.neutral[400],
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  rowPressed: {
    backgroundColor: COLORS.primary[50],
  },
  // Channel rows
  channelGroup: {
    marginBottom: SPACING.xs,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  channelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#D4AF37',
    backgroundColor: '#ffffff',
  },
  channelName: {
    flex: 1,
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    color: COLORS.neutral[800],
  },
  // Sub-menu
  subMenu: {
    marginLeft: SPACING['3xl'] + SPACING.sm,
    marginBottom: SPACING.xs,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.neutral[100],
    paddingLeft: SPACING.md,
    gap: 4,
  },
  channelSubPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    marginBottom: 4,
  },
  channelSubPageBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
    color: COLORS.primary[700],
  },
  subLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  subLinkIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subLinkText: {
    flex: 1,
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
  },
  // General links
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  linkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
    fontFamily: FONTS.sansMedium,
    fontSize: 15,
    color: COLORS.neutral[800],
  },
  // Admin link
  adminLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.secondary[50],
    borderWidth: 1,
    borderColor: COLORS.secondary[200],
  },
  adminLinkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminLinkText: {
    flex: 1,
    fontFamily: FONTS.sansSemiBold,
    fontSize: 15,
    color: COLORS.secondary[700],
  },
  // Footer
  footer: {
    marginTop: SPACING['3xl'],
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[100],
  },
  footerText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.neutral[400],
  },
  footerSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.neutral[300],
    marginTop: 2,
  },
  // Social links row
  socialRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  // Social sections (YouTube channels list + other socials)
  socialSection: {
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  socialSubLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    color: COLORS.neutral[400],
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  socialLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLinkLogo: { width: 28, height: 28, borderRadius: RADIUS.sm },
  socialLinkText: {
    flex: 1,
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: COLORS.neutral[800],
  },
  // Profile styles
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    gap: SPACING.md,
  },
  profileAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
    color: COLORS.neutral[900],
  },
  profileSub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.neutral[500],
    marginTop: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  profileModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.lg,
  },
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  profileModalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalName: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: COLORS.neutral[900],
  },
  modalDesignation: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: COLORS.primary[600],
    marginTop: 2,
  },
  modalBio: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.neutral[600],
    marginBottom: SPACING.md,
  },
  modalHighlights: {
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    gap: SPACING.xs + 2,
  },
  highlightsHeader: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    color: COLORS.neutral[400],
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  modalHighlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs + 2,
  },
  modalHighlightText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.neutral[700],
  },
  downloadCvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#dc2626',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  downloadCvBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  downloadCvBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
