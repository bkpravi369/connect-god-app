import React from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Database,
  Youtube,
  HardDrive,
  EyeOff,
  Sparkles,
  ExternalLink,
} from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/' as any);
    }
  };

  const openUrl = async (url: string) => {
    const can = await Linking.canOpenURL(url).catch(() => false);
    if (can) await Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
          onPress={handleBack}
          hitSlop={10}
          accessibilityLabel="Go back"
        >
          <ArrowLeft color="#ffffff" size={22} strokeWidth={2.4} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <Text style={styles.headerSub}>സ്വകാര്യതാ നയം • Connect GOD</Text>
        </View>
        <View style={styles.shieldIconWrap}>
          <ShieldCheck color="#D4AF37" size={22} strokeWidth={2.2} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Highlight Banner ─────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <Sparkles color="#D4AF37" size={16} strokeWidth={2.4} />
            <Text style={styles.heroBadgeText}>YOUR PRIVACY IS SACRED</Text>
          </View>
          <Text style={styles.heroHeading}>
            Transparent, Spiritual & Ad-Free Experience
          </Text>
          <Text style={styles.heroBody}>
            Connect GOD is built with complete devotion to support spiritual study, meditation, and daily Murli reflection without collecting any personal data.
          </Text>
          <View style={styles.heroDateRow}>
            <Text style={styles.heroDate}>Effective Date: August 2026</Text>
            <Text style={styles.heroDate}>Version 1.0.0</Text>
          </View>
        </View>

        {/* ── Section 1: Zero Personal Data Collection ─────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconPill, { backgroundColor: '#ecfdf5' }]}>
              <EyeOff color="#059669" size={18} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>1. No Personal Data Collected</Text>
              <Text style={styles.cardSub}>വ്യക്തിഗത വിവരങ്ങൾ ശേഖരിക്കുന്നില്ല</Text>
            </View>
          </View>
          <Text style={styles.cardText}>
            We do <Text style={styles.boldText}>not</Text> collect, store, track, sell, or share any personal information, phone numbers, email addresses, names, or location data.
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>No user account creation or login required for public use.</Text>
            </View>
            <View style={styles.bulletItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>No analytics trackers or advertising networks embedded.</Text>
            </View>
            <View style={styles.bulletItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>Daily spiritual chart records remain 100% private to your device.</Text>
            </View>
          </View>
        </View>

        {/* ── Section 2: YouTube API Integration ──────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconPill, { backgroundColor: '#fee2e2' }]}>
              <Youtube color="#dc2626" size={18} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>2. YouTube Data API Services</Text>
              <Text style={styles.cardSub}>യൂട്യൂബ് ഡാറ്റാ എപിഐ ഉപയോഗം</Text>
            </View>
          </View>
          <Text style={styles.cardText}>
            This application uses the <Text style={styles.boldText}>YouTube Data API v3</Text> and embedded YouTube players to discover and display publicly published spiritual discourses, daily live Murli classes, and podcasts from official channels:
          </Text>
          <View style={styles.channelPillsRow}>
            <Text style={styles.channelPill}>BK S Calicut Live</Text>
            <Text style={styles.channelPill}>Supreme Light</Text>
            <Text style={styles.channelPill}>BK Sheeba</Text>
            <Text style={styles.channelPill}>BK Sheeja</Text>
          </View>
          <Text style={styles.cardText}>
            When playing YouTube content within the app or opening video links, you interact directly with YouTube/Google services subject to Google’s policies.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.btnPressed]}
            onPress={() => openUrl('https://policies.google.com/privacy')}
          >
            <Text style={styles.linkText}>Google Privacy Policy</Text>
            <ExternalLink color={COLORS.primary[600]} size={14} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.btnPressed]}
            onPress={() => openUrl('https://www.youtube.com/t/terms')}
          >
            <Text style={styles.linkText}>YouTube Terms of Service</Text>
            <ExternalLink color={COLORS.primary[600]} size={14} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* ── Section 3: Local Device Storage & Caching ─────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconPill, { backgroundColor: '#fef3c7' }]}>
              <HardDrive color="#d97706" size={18} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>3. Local Device Storage & Caching</Text>
              <Text style={styles.cardSub}>ലോക്കൽ സ്റ്റോറേജ് കാഷിംഗ്</Text>
            </View>
          </View>
          <Text style={styles.cardText}>
            The application accesses device storage (<Text style={styles.boldText}>AsyncStorage / LocalStorage</Text>) exclusively for offline caching and user preferences:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Murli & Blessing (Varadan) Text:</Text> Cached locally so you can read daily inspirations instantly without internet connection.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Audio & Video Caches:</Text> Streaming references are cached temporarily (1-hour TTL) to preserve your bandwidth and API quotas.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Daily Spiritual Chart:</Text> Checkbox items and score % are saved locally per calendar date and never uploaded to remote servers.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Section 4: Third-Party Integrations ─────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconPill, { backgroundColor: '#f0fdf4' }]}>
              <Database color="#16a34a" size={18} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>4. External Services & Permissions</Text>
              <Text style={styles.cardSub}>മറ്റ് സേവനങ്ങളും അനുമതികളും</Text>
            </View>
          </View>
          <Text style={styles.cardText}>
            The app requests standard network permissions to stream audio files, fetch official PDF documents, and launch external apps (Zoom for live meditation, YouTube app, or social handles).
          </Text>
        </View>

        {/* ── Section 5: Contact & Inquiries ──────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconPill, { backgroundColor: '#f5f3ff' }]}>
              <Lock color="#7c3aed" size={18} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>5. Contact & Questions</Text>
              <Text style={styles.cardSub}>ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ</Text>
            </View>
          </View>
          <Text style={styles.cardText}>
            If you have any questions regarding this Privacy Policy or the spiritual resources provided, please contact the center coordinator:
          </Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactName}>Brahma Kumaris Center Kozhikode</Text>
            <Text style={styles.contactDetail}>Kozhikode & Wayanad, Kerala, India</Text>
            <Text style={styles.contactDetail}>Devotional Service Platform • Om Shanti</Text>
          </View>
        </View>

        {/* ── Back to App Button ──────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && styles.btnPressed]}
          onPress={handleBack}
        >
          <Text style={styles.doneBtnText}>Return to Connect GOD</Text>
        </Pressable>

        <View style={{ height: SPACING['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral[50],
  },
  // Top Header
  header: {
    backgroundColor: COLORS.primary[800],
    paddingTop: Platform.OS === 'web' ? 24 : 52,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  headerTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: '#ffffff',
  },
  headerSub: {
    fontFamily: FONTS.malayalam,
    fontSize: 12,
    color: COLORS.primary[200],
    marginTop: 2,
  },
  shieldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  // Hero Highlight
  heroCard: {
    backgroundColor: '#fffdf5',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  heroBadgeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    color: '#92400e',
    letterSpacing: 0.5,
  },
  heroHeading: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: '#431407',
    lineHeight: 22,
    marginBottom: SPACING.xs,
  },
  heroBody: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: '#78350f',
    lineHeight: 19,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.25)',
  },
  heroDate: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: '#b45309',
  },
  // Content Cards
  card: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...SHADOWS.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 14.5,
    color: COLORS.neutral[900],
  },
  cardSub: {
    fontFamily: FONTS.malayalam,
    fontSize: 11.5,
    color: COLORS.neutral[500],
    marginTop: 1,
  },
  cardText: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    color: COLORS.neutral[700],
    lineHeight: 20,
    marginTop: SPACING.xs,
  },
  boldText: {
    fontFamily: FONTS.sansBold,
    color: COLORS.neutral[900],
  },
  // Bullet items
  bulletList: {
    marginTop: SPACING.sm,
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4AF37',
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    color: COLORS.neutral[600],
    lineHeight: 18,
  },
  // Channel pills
  channelPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: SPACING.sm,
  },
  channelPill: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    color: '#991b1b',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  // Links
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm,
    paddingVertical: 4,
  },
  linkText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12.5,
    color: COLORS.primary[600],
    textDecorationLine: 'underline',
  },
  // Contact box
  contactBox: {
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
  },
  contactName: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: COLORS.neutral[900],
  },
  contactDetail: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.neutral[600],
    marginTop: 2,
  },
  // Done button
  doneBtn: {
    backgroundColor: COLORS.primary[700],
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.md,
  },
  doneBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: '#ffffff',
  },
});
