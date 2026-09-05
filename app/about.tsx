import React from 'react';
import {
  Dimensions,
  Image,
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
  Sparkles,
  Globe,
  Award,
  BookOpen,
  Heart,
  Users,
  Compass,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
} from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';

const BK_OFFICIAL_LOGO = require('@/assets/bk-official-logo.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AboutUsScreen() {
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
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
          onPress={handleBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color="#ffffff" size={22} strokeWidth={2.4} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            About Brahma Kumaris
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            പ്രജാപിതാ ബ്രഹ്മാകുമാരീസ് ഈശ്വരീയ വിശ്വവിദ്യാലയം
          </Text>
        </View>

        <View style={styles.headerEmblemWrap}>
          <Image
            source={BK_OFFICIAL_LOGO}
            style={styles.headerEmblemImg}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Hero Spiritual Banner ──────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroEmblemRow}>
            <View style={styles.sunEmblemCircle}>
              <Image
                source={BK_OFFICIAL_LOGO}
                style={styles.heroEmblemImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.heroTagBadge}>
              <Sparkles color="#D4AF37" size={13} strokeWidth={2.5} />
              <Text style={styles.heroTagBadgeText}>SPIRITUAL UNIVERSITY</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Prajapita Brahma Kumaris Ishwariya Vishwa Vidyalaya
          </Text>
          <Text style={styles.heroSubtitle}>
            Brahma Kumaris Kozhikode • Spiritual Knowledge & Rajyoga Meditation
          </Text>

          <View style={styles.mottoBox}>
            <Text style={styles.mottoLabel}>DIVINE MOTTO</Text>
            <Text style={styles.mottoText}>
              "Self Transformation leads to World Transformation"
            </Text>
            <Text style={styles.mottoMalayalam}>
              "സ്വയം പരിവർത്തനത്തിലൂടെ വിശ്വ പരിവർത്തനം"
            </Text>
          </View>
        </View>

        {/* ── 2. Global Overview & Key Facts ────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconPill, { backgroundColor: '#eff6ff' }]}>
              <Globe color="#1d4ed8" size={20} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Global Mission & Legacy</Text>
              <Text style={styles.cardSub}>ആഗോള സേവന ചരിത്രം • Since 1937</Text>
            </View>
          </View>

          <Text style={styles.bodyParagraph}>
            Prajapita Brahma Kumaris Ishwariya Vishwa Vidyalaya is a worldwide spiritual movement dedicated to personal transformation and world renewal. Founded in 1937 in Hyderabad Sindh by <Text style={styles.boldText}>Prajapita Brahma</Text> (Dada Lekhraj), the organization is headquartered at the peaceful heights of <Text style={styles.boldText}>Mount Abu, Rajasthan (Madhuban)</Text>.
          </Text>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>1937</Text>
              <Text style={styles.statLabel}>Founded in</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>110+</Text>
              <Text style={styles.statLabel}>Countries</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>8,500+</Text>
              <Text style={styles.statLabel}>Centers</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Free Service</Text>
            </View>
          </View>

          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Award color="#D4AF37" size={17} strokeWidth={2.2} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bulletTitle}>Led Entirely by Women</Text>
                <Text style={styles.bulletDesc}>
                  It is the largest global spiritual institution led exclusively by women (revered Dadis and Didis), championing spiritual equality and feminine spiritual leadership for over eight decades.
                </Text>
              </View>
            </View>

            <View style={styles.bulletItem}>
              <ShieldCheck color="#059669" size={17} strokeWidth={2.2} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bulletTitle}>United Nations Affiliation</Text>
                <Text style={styles.bulletDesc}>
                  An active international non-governmental organization (NGO) holding <Text style={styles.boldText}>General Consultative Status with UN ECOSOC</Text> and consultative status with <Text style={styles.boldText}>UNICEF</Text>, contributing to global peace, human rights, and environmental harmony.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 3. Core Pillars (3 Pillars Grid) ──────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconPill, { backgroundColor: '#fef3c7' }]}>
              <Compass color="#b45309" size={20} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Three Sacred Pillars</Text>
              <Text style={styles.cardSub}>ആത്മീയ ജീവിതത്തിന്റെ മൂന്ന് സ്തംഭങ്ങൾ</Text>
            </View>
          </View>

          <View style={styles.pillarsContainer}>
            {/* Pillar 1 */}
            <View style={styles.pillarCard}>
              <View style={[styles.pillarIconWrap, { backgroundColor: '#FFF7ED' }]}>
                <Sparkles color="#EA580C" size={20} strokeWidth={2.4} />
              </View>
              <Text style={styles.pillarTitle}>1. Rajyoga Meditation</Text>
              <Text style={styles.pillarMalayalam}>രാജയോഗ ധ്യാനം</Text>
              <Text style={styles.pillarDesc}>
                A practical, open-eye meditation connecting the conscious soul with the Supreme Soul (Shiva Baba), awakening inner peace, purity, and spiritual strength.
              </Text>
            </View>

            {/* Pillar 2 */}
            <View style={styles.pillarCard}>
              <View style={[styles.pillarIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <BookOpen color="#DC2626" size={20} strokeWidth={2.4} />
              </View>
              <Text style={styles.pillarTitle}>2. Daily Murli</Text>
              <Text style={styles.pillarMalayalam}>ദൈനംദിന ഈശ്വരീയ മഹാവാക്യം</Text>
              <Text style={styles.pillarDesc}>
                Daily spoken spiritual wisdom and guidance direct from the Supreme Father, providing nourishment for elevated contemplation and divine character building.
              </Text>
            </View>

            {/* Pillar 3 */}
            <View style={styles.pillarCard}>
              <View style={[styles.pillarIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Heart color="#059669" size={20} strokeWidth={2.4} />
              </View>
              <Text style={styles.pillarTitle}>3. Universal Free Service</Text>
              <Text style={styles.pillarMalayalam}>നിസ്വാർത്ഥ സേവനം</Text>
              <Text style={styles.pillarDesc}>
                All meditation courses, spiritual retreats, and counseling sessions are offered unconditionally free of charge to all humanity, irrespective of religion, caste, or background.
              </Text>
            </View>
          </View>
        </View>

        {/* ── 4. BK Kozhikode Center (Local Service & Offerings) ─────── */}
        <View style={[styles.card, styles.kozhikodeCard]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconPill, { backgroundColor: '#fff7ed' }]}>
              <MapPin color={COLORS.primary[700]} size={20} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Brahma Kumaris Kozhikode</Text>
              <Text style={styles.cardSub}>കോഴിക്കോട് സേവന കേന്ദ്രം • Malabar Region</Text>
            </View>
          </View>

          <Text style={styles.bodyParagraph}>
            The Kozhikode service center has been actively serving the people of Kozhikode and the broader Malabar region of Kerala for decades. Our serene meditation halls provide an oasis of peace amidst modern life's busy pace.
          </Text>

          <Text style={styles.sectionMiniHeader}>KEY SERVICES & ACTIVITIES:</Text>

          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <CheckCircle2 color="#059669" size={16} strokeWidth={2.4} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>Free 7-Day Rajyoga Foundation Course</Text>
                <Text style={styles.activityDesc}>
                  Learn soul consciousness, God's true identity, the law of Karma, and world cycle secrets.
                </Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <CheckCircle2 color="#059669" size={16} strokeWidth={2.4} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>Daily Murli Study Classes</Text>
                <Text style={styles.activityDesc}>
                  Conducted daily in Malayalam and Hindi every morning and evening.
                </Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <CheckCircle2 color="#059669" size={16} strokeWidth={2.4} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>Traffic Control Meditation Pauses</Text>
                <Text style={styles.activityDesc}>
                  Hourly pauses to silence the mind, refresh the intellect, and cultivate mindfulness.
                </Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <CheckCircle2 color="#059669" size={16} strokeWidth={2.4} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>Youth, Student & Family Workshops</Text>
                <Text style={styles.activityDesc}>
                  Stress-relief, positive thinking, de-addiction, and moral values development.
                </Text>
              </View>
            </View>
          </View>

          {/* Invitation Banner */}
          <View style={styles.invitationBox}>
            <View style={styles.invitationHeader}>
              <Clock color="#D4AF37" size={16} strokeWidth={2.4} />
              <Text style={styles.invitationTitle}>Open Daily to Everyone</Text>
            </View>
            <Text style={styles.invitationText}>
              All souls are cordially invited to visit our Kozhikode center anytime to experience quiet meditation, read spiritual literature, or enroll in a free introductory Rajyoga course.
            </Text>
          </View>
        </View>

        {/* ── 5. Official Portals & Global Links ────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconPill, { backgroundColor: '#f3e8ff' }]}>
              <ExternalLink color="#7e22ce" size={18} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Official Portals & Resources</Text>
              <Text style={styles.cardSub}>ഔദ്യോഗിക വെബ്സൈറ്റുകൾ</Text>
            </View>
          </View>

          <View style={styles.linkRows}>
            <Pressable
              style={({ pressed }) => [styles.externalRow, pressed && styles.rowPressed]}
              onPress={() => openUrl('https://brahmakumaris.org')}
            >
              <View style={styles.linkTextGroup}>
                <Text style={styles.externalLinkTitle}>Brahma Kumaris International</Text>
                <Text style={styles.externalLinkUrl}>brahmakumaris.org</Text>
              </View>
              <ExternalLink color={COLORS.primary[700]} size={16} strokeWidth={2.2} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.externalRow, pressed && styles.rowPressed]}
              onPress={() => openUrl('https://madhubanmurli.org')}
            >
              <View style={styles.linkTextGroup}>
                <Text style={styles.externalLinkTitle}>Official Madhuban Murli Portal</Text>
                <Text style={styles.externalLinkUrl}>madhubanmurli.org</Text>
              </View>
              <ExternalLink color={COLORS.primary[700]} size={16} strokeWidth={2.2} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.externalRow, pressed && styles.rowPressed]}
              onPress={() => openUrl('https://godlywoodstudio.org')}
            >
              <View style={styles.linkTextGroup}>
                <Text style={styles.externalLinkTitle}>Godlywood Studio (Spiritual Media)</Text>
                <Text style={styles.externalLinkUrl}>godlywoodstudio.org</Text>
              </View>
              <ExternalLink color={COLORS.primary[700]} size={16} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>Om Shanti • ഓം ശാന്തി</Text>
          <Text style={styles.footerSubText}>
            Connect GOD — Designed with devotion for spiritual nourishment.
          </Text>
        </View>

        <View style={{ height: SPACING['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
    gap: SPACING.md,
  },

  // ── Header ──────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[700],
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1.5,
    borderBottomColor: '#D4AF37',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  headerTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 15.5,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  headerSub: {
    fontFamily: FONTS.malayalam,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  headerEmblemWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerEmblemImg: {
    width: 28,
    height: 28,
  },

  // ── Hero Card ───────────────────────────────────────
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    ...SHADOWS.sm,
  },
  heroEmblemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sunEmblemCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
    borderColor: '#D4AF37',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  heroEmblemImg: {
    width: 54,
    height: 54,
  },
  heroTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  heroTagBadgeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 9.5,
    color: COLORS.primary[700],
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 17,
    color: COLORS.neutral[900],
    lineHeight: 23,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.neutral[600],
    lineHeight: 17,
    marginBottom: SPACING.md,
  },
  mottoBox: {
    backgroundColor: '#FFFDF9',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  mottoLabel: {
    fontFamily: FONTS.sansBold,
    fontSize: 9,
    color: COLORS.primary[700],
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  mottoText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
    color: COLORS.primary[900],
    lineHeight: 19,
  },
  mottoMalayalam: {
    fontFamily: FONTS.malayalam,
    fontSize: 12,
    color: COLORS.primary[800],
    marginTop: 3,
  },

  // ── Standard Cards ──────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    ...SHADOWS.sm,
  },
  kozhikodeCard: {
    borderColor: 'rgba(212, 175, 55, 0.45)',
    backgroundColor: '#FFFEFC',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  iconPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    color: COLORS.neutral[900],
  },
  cardSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.neutral[500],
    marginTop: 1,
  },
  bodyParagraph: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    color: COLORS.neutral[700],
    lineHeight: 19,
    marginBottom: SPACING.md,
  },
  boldText: {
    fontFamily: FONTS.sansBold,
    color: COLORS.neutral[900],
  },

  // ── Stats Grid ──────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 64) / 4 - 8,
    backgroundColor: '#FAF5EE',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  statNumber: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    color: COLORS.primary[800],
    letterSpacing: 0.2,
  },
  statLabel: {
    fontFamily: FONTS.sans,
    fontSize: 9.5,
    color: COLORS.neutral[600],
    marginTop: 2,
    textAlign: 'center',
  },

  // ── Bullet List ─────────────────────────────────────
  bulletList: {
    gap: 12,
    marginTop: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FAF8F5',
    padding: 10,
    borderRadius: RADIUS.md,
  },
  bulletTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
    color: COLORS.neutral[900],
    marginBottom: 2,
  },
  bulletDesc: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
    color: COLORS.neutral[600],
    lineHeight: 16,
  },

  // ── 3 Pillars Container ─────────────────────────────
  pillarsContainer: {
    gap: 10,
  },
  pillarCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  pillarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pillarTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
    color: COLORS.neutral[900],
  },
  pillarMalayalam: {
    fontFamily: FONTS.malayalam,
    fontSize: 11,
    color: COLORS.primary[700],
    marginTop: 1,
    marginBottom: 4,
  },
  pillarDesc: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
    color: COLORS.neutral[600],
    lineHeight: 16.5,
  },

  // ── Kozhikode Section ───────────────────────────────
  sectionMiniHeader: {
    fontFamily: FONTS.sansBold,
    fontSize: 10.5,
    color: COLORS.primary[700],
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  activityList: {
    gap: 10,
    marginBottom: SPACING.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  activityTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
    color: COLORS.neutral[900],
  },
  activityDesc: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.neutral[500],
    lineHeight: 15,
    marginTop: 1,
  },
  invitationBox: {
    backgroundColor: '#FFF9EB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  invitationTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
    color: '#92400E',
  },
  invitationText: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
    color: '#78350F',
    lineHeight: 16,
  },

  // ── Links ───────────────────────────────────────────
  linkRows: {
    gap: 8,
  },
  externalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  rowPressed: {
    backgroundColor: '#f3ece1',
    opacity: 0.9,
  },
  linkTextGroup: {
    flex: 1,
  },
  externalLinkTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
    color: COLORS.neutral[800],
  },
  externalLinkUrl: {
    fontFamily: FONTS.sans,
    fontSize: 10.5,
    color: COLORS.primary[700],
    marginTop: 1,
  },

  // ── Footer ──────────────────────────────────────────
  footerNote: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  footerText: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: COLORS.primary[800],
    letterSpacing: 0.5,
  },
  footerSubText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.neutral[500],
    textAlign: 'center',
    marginTop: 3,
  },
});
