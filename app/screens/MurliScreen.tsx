import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BookOpen,
  ExternalLink,
  FileText,
  Globe,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { useToast } from '@/components/ToastProvider';
import { getJSON, setJSON } from '@/lib/storage';
import {
  DailyMurliSyncResult,
  getFormattedMurliDate,
  getTodayISTDateString,
  syncDailyMurliData,
} from '@/services/murliService';
import { MurliAudioPlayer } from '@/components/MurliAudioPlayer';

export type MurliLanguage = 'ml' | 'hi' | 'en';

const DEFAULT_MURLI_FONT_SIZE = 17;
const MIN_MURLI_FONT_SIZE = 14;
const MAX_MURLI_FONT_SIZE = 28;
const MURLI_FONT_STORAGE_KEY = '@connectgod_murli_font_size';

export function MurliScreen() {
  const toast = useToast();

  // 1. Exact Live Date Calculation in IST (DD.MM.YY format)
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yy = String(today.getFullYear()).slice(-2);
  const formattedDate = `${dd}.${mm}.${yy}`; // e.g. "27.08.26"

  const targetDate = getTodayISTDateString();
  const dateInfo = getFormattedMurliDate(targetDate);

  const [selectedLang, setSelectedLang] = useState<MurliLanguage>('ml');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncedData, setSyncedData] = useState<DailyMurliSyncResult | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // 1b. Font resize state scoped strictly to the Murli reading container (persisted)
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = getJSON<number | null>(MURLI_FONT_STORAGE_KEY, null);
    if (typeof saved === 'number' && saved >= MIN_MURLI_FONT_SIZE && saved <= MAX_MURLI_FONT_SIZE) {
      return saved;
    }
    return DEFAULT_MURLI_FONT_SIZE;
  });

  const handleDecreaseFont = () => {
    setFontSize((prev) => {
      const next = Math.max(MIN_MURLI_FONT_SIZE, Math.round((prev - 1.5) * 10) / 10);
      setJSON(MURLI_FONT_STORAGE_KEY, next);
      toast.show(`Text size: ${Math.round((next / DEFAULT_MURLI_FONT_SIZE) * 100)}%`, 'info');
      return next;
    });
  };

  const handleIncreaseFont = () => {
    setFontSize((prev) => {
      const next = Math.min(MAX_MURLI_FONT_SIZE, Math.round((prev + 1.5) * 10) / 10);
      setJSON(MURLI_FONT_STORAGE_KEY, next);
      toast.show(`Text size: ${Math.round((next / DEFAULT_MURLI_FONT_SIZE) * 100)}%`, 'info');
      return next;
    });
  };

  const handleResetFont = () => {
    setFontSize(DEFAULT_MURLI_FONT_SIZE);
    setJSON(MURLI_FONT_STORAGE_KEY, DEFAULT_MURLI_FONT_SIZE);
    toast.show('Text size reset (100%)', 'info');
  };

  const fontPercent = Math.round((fontSize / DEFAULT_MURLI_FONT_SIZE) * 100);

  // 2. Sync today's live Murli directly on mount
  useEffect(() => {
    syncDailyMurliData().then((res) => {
      if (res && res.success) {
        setSyncedData(res);
      }
    });
  }, []);

  // 3. Exact Live babamurli.com URLs
  const activeHtmlUrl =
    syncedData?.languages?.[selectedLang]?.htmlUrl ||
    (selectedLang === 'hi'
      ? `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/01.%20Hindi%20Murli%20-%20Htm/${formattedDate}-H.htm`
      : selectedLang === 'en'
      ? `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/01.%20Eng%20Murli%20-%20Htm/${formattedDate}-E.htm`
      : `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/01.%20Malayalam%20Murli%20-%20Htm/${formattedDate}-Mal.htm`);

  const activePdfUrl =
    syncedData?.languages?.[selectedLang]?.pdfUrl ||
    (selectedLang === 'hi'
      ? `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/02.%20Hindi%20Murli%20-%20Pdf/${formattedDate}-h.pdf`
      : selectedLang === 'en'
      ? `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/02.%20Eng%20Murli%20-%20Pdf/${formattedDate}-E.pdf`
      : `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/02.%20Malayalam%20Murli%20-%20Pdf/${formattedDate}-Mal.pdf`);

  const audioCandidates = useMemo(
    () =>
      selectedLang === 'hi'
        ? [
            `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/03.%20Hindi%20Murli%20-%20Mp3/${formattedDate}-Hin.mp3`,
            `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/03.%20Hindi%20Murli%20-%20MP3/${formattedDate}-H.mp3`,
            `https://bkdrluhar.com/00.%20Mp3/01.%20Hindi/${formattedDate}.mp3`,
          ]
        : selectedLang === 'en'
        ? [
            `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/03.%20English%20Murli%20-%20Mp3/${formattedDate}-Eng.mp3`,
            `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/04.%20Eng%20Murli%20-%20MP3%20-%20UK/${formattedDate}-E.mp3`,
            `https://bkdrluhar.com/00.%20Mp3/02.%20English/${formattedDate}.mp3`,
          ]
        : [
            `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/03.%20Malayalam%20Murli%20-%20Mp3/${formattedDate}-Mal.mp3`,
            `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/03.%20Malayalam%20Murli%20-%20MP3/${formattedDate}-Mal.mp3`,
            `https://bkdrluhar.com/00.%20Mp3/06.%20Malayalam/${formattedDate}.mp3`,
          ],
    [selectedLang, formattedDate]
  );

  const handleLanguageChange = useCallback((lang: MurliLanguage) => {
    setSelectedLang(lang);
  }, []);

  const handleRefresh = useCallback(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    setIsRefreshing(true);
    syncDailyMurliData(true).then((res) => {
      if (res && res.success) {
        setSyncedData(res);
      }
      setIsRefreshing(false);
      spinAnim.setValue(0);
      toast.show(`മുരളി (${formattedDate}) പുതുക്കി ✨`, 'info');
    });
  }, [spinAnim, toast, formattedDate]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleOpenPdf = useCallback(async () => {
    const url = activePdfUrl;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const supported = await Linking.canOpenURL(url).catch(() => false);
    if (supported) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(activeHtmlUrl);
    }
  }, [activePdfUrl, activeHtmlUrl]);

  const handleOpenHtml = useCallback(async () => {
    const url = activeHtmlUrl;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    await Linking.openURL(url);
  }, [activeHtmlUrl]);

  const dateHeading =
    selectedLang === 'hi'
      ? `${formattedDate} बापदादा मधुबन`
      : selectedLang === 'en'
      ? `${dateInfo.englishDate} (${formattedDate})`
      : `${dateInfo.malayalamDate} (${formattedDate})`;

  const portalCardHeading =
    selectedLang === 'hi'
      ? 'आज की सम्पूर्ण साकार मुरली पढ़ें'
      : selectedLang === 'en'
      ? "Read Today's Complete Murli"
      : 'ഇന്നത്തെ സമ്പൂർണ്ണ മുരളി വായിക്കുക';

  const cleanedHtmlText = syncedData?.languages?.[selectedLang]?.html || '';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary[700]]}
            tintColor={COLORS.primary[700]}
          />
        }
      >
        {/* ── [1. Top Date Bar: 'ദൈനംദിന മുരളി' with active date] ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <BookOpen color="#ffffff" size={22} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.headerRowTop}>
              <Text style={styles.headerTitle}>ദൈനംദിന മുരളി</Text>
              <View style={styles.liveDateBadge}>
                <Text style={styles.liveDateBadgeText}>{formattedDate}</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>{dateHeading}</Text>
          </View>
          <Pressable
            style={styles.refreshBtn}
            onPress={handleRefresh}
            hitSlop={8}
            accessibilityLabel="Refresh Murli"
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw color={COLORS.primary[700]} size={16} strokeWidth={2.4} />
            </Animated.View>
          </Pressable>
        </View>

        {/* ── [2. 3-Language Selector Tabs: [ മലയാളം | हिन्दी | English ]] ── */}
        <View style={styles.langTabBar}>
          {/* Tab 1: Malayalam */}
          <Pressable
            style={({ pressed }) => [
              styles.langTabBtn,
              selectedLang === 'ml' && styles.langTabBtnActive,
              pressed && styles.tabPressed,
            ]}
            onPress={() => handleLanguageChange('ml')}
            accessibilityLabel="Malayalam Murli"
          >
            <Text style={[styles.langTabTitle, selectedLang === 'ml' && styles.langTabTitleActive]}>
              മലയാളം
            </Text>
          </Pressable>

          {/* Tab 2: Hindi */}
          <Pressable
            style={({ pressed }) => [
              styles.langTabBtn,
              selectedLang === 'hi' && styles.langTabBtnActive,
              pressed && styles.tabPressed,
            ]}
            onPress={() => handleLanguageChange('hi')}
            accessibilityLabel="Hindi Murli"
          >
            <Text style={[styles.langTabTitle, selectedLang === 'hi' && styles.langTabTitleActive]}>
              हिन्दी
            </Text>
          </Pressable>

          {/* Tab 3: English */}
          <Pressable
            style={({ pressed }) => [
              styles.langTabBtn,
              selectedLang === 'en' && styles.langTabBtnActive,
              pressed && styles.tabPressed,
            ]}
            onPress={() => handleLanguageChange('en')}
            accessibilityLabel="English Murli"
          >
            <Text style={[styles.langTabTitle, selectedLang === 'en' && styles.langTabTitleActive]}>
              English
            </Text>
          </Pressable>
        </View>

        {/* ── [3. Official Daily Murli Audio Player] ── */}
        <MurliAudioPlayer
          selectedLang={selectedLang}
          formattedDate={formattedDate}
          audioCandidates={audioCandidates}
        />

        {/* ── [4. 'ഇന്നത്തെ സമ്പൂർണ്ണ മുരളി വായിക്കുക' Card with 2 Action Buttons] ── */}
        <View style={styles.readingPortalCard}>
          <View style={styles.portalHeaderRow}>
            <View style={styles.portalIconBox}>
              <Sparkles color="#D4AF37" size={18} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.portalHeading}>{portalCardHeading}</Text>
              <Text style={styles.portalSubText}>
                {selectedLang.toUpperCase()} • Official Daily Sakara Murli • {formattedDate}
              </Text>
            </View>
          </View>

          {/* Two Action Buttons: 📄 സമ്പൂർണ്ണ PDF തുറക്കുക & 🌐 വെബ് റീഡർ തുറക്കുക (HTML) */}
          <View style={styles.portalActionRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.primaryActionBtn, pressed && styles.btnPressed]}
              onPress={handleOpenPdf}
              accessibilityLabel="Open Full PDF"
            >
              <FileText color="#ffffff" size={16} strokeWidth={2.4} />
              <Text style={styles.primaryActionBtnText}>സമ്പൂർണ്ണ PDF തുറക്കുക</Text>
              <ExternalLink color="#ffffff" size={13} strokeWidth={2.4} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.secondaryActionBtn, pressed && styles.btnPressed]}
              onPress={handleOpenHtml}
              accessibilityLabel="Open HTML Web Reader"
            >
              <Globe color={COLORS.primary[800]} size={16} strokeWidth={2.4} />
              <Text style={styles.secondaryActionBtnText}>വെബ് റീഡർ തുറക്കുക (HTML)</Text>
              <ExternalLink color={COLORS.primary[800]} size={13} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>

        {/* ── [5. Full Clean In-App Murli Text Reader (Rendered Seamlessly)] ── */}
        {cleanedHtmlText ? (
          <View style={styles.textReaderCard}>
            <View style={styles.textReaderHeader}>
              <View style={styles.textReaderBadge}>
                <BookOpen color="#8B0000" size={13} strokeWidth={2.4} />
                <Text style={styles.textReaderBadgeText}>
                  {selectedLang.toUpperCase()} • {formattedDate}
                </Text>
              </View>

              <View style={styles.headerControlsRight}>
                {/* Font Resize (Zoom In / Zoom Out) Controls */}
                <View style={styles.fontResizeControls}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.fontBtn,
                      fontSize <= MIN_MURLI_FONT_SIZE && styles.fontBtnDisabled,
                      pressed && styles.fontBtnPressed,
                    ]}
                    onPress={handleDecreaseFont}
                    disabled={fontSize <= MIN_MURLI_FONT_SIZE}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease font size"
                  >
                    <Text
                      style={[
                        styles.fontBtnText,
                        fontSize <= MIN_MURLI_FONT_SIZE && styles.fontBtnTextDisabled,
                      ]}
                    >
                      A-
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.fontSizeResetBtn,
                      fontSize === DEFAULT_MURLI_FONT_SIZE && styles.fontSizeResetBtnActive,
                      pressed && styles.fontBtnPressed,
                    ]}
                    onPress={handleResetFont}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Current font size ${fontPercent} percent. Tap to reset to 100 percent.`}
                  >
                    <Text
                      style={[
                        styles.fontSizeResetText,
                        fontSize === DEFAULT_MURLI_FONT_SIZE && styles.fontSizeResetTextActive,
                      ]}
                    >
                      {fontPercent}%
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.fontBtn,
                      fontSize >= MAX_MURLI_FONT_SIZE && styles.fontBtnDisabled,
                      pressed && styles.fontBtnPressed,
                    ]}
                    onPress={handleIncreaseFont}
                    disabled={fontSize >= MAX_MURLI_FONT_SIZE}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Increase font size"
                  >
                    <Text
                      style={[
                        styles.fontBtnText,
                        fontSize >= MAX_MURLI_FONT_SIZE && styles.fontBtnTextDisabled,
                      ]}
                    >
                      A+
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={styles.openExternalIconBtn}
                  onPress={handleOpenHtml}
                  hitSlop={6}
                  accessibilityLabel="Open in new tab"
                >
                  <ExternalLink color={COLORS.primary[700]} size={13} strokeWidth={2.2} />
                </Pressable>
              </View>
            </View>

            {Platform.OS === 'web' ? (
              <>
                <style>{`
                  .murli-html-container {
                    font-size: ${fontSize}px !important;
                    line-height: 1.85 !important;
                  }
                  .murli-html-container p,
                  .murli-html-container div,
                  .murli-html-container span,
                  .murli-html-container font,
                  .murli-html-container td,
                  .murli-html-container th,
                  .murli-html-container li {
                    font-size: inherit !important;
                    line-height: inherit !important;
                  }
                `}</style>
                <div
                  className="murli-html-container"
                  style={{
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.85,
                    color: '#2d3748',
                    maxWidth: '100%',
                    overflowX: 'hidden',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    padding: '8px 4px',
                  }}
                  dangerouslySetInnerHTML={{ __html: cleanedHtmlText }}
                />
              </>
            ) : (
              <Text
                style={[
                  styles.nativeTextFallback,
                  { fontSize, lineHeight: Math.round(fontSize * 1.7) },
                ]}
              >
                {cleanedHtmlText.replace(/<[^>]*>?/gm, ' ')}
              </Text>
            )}
          </View>
        ) : null}

        <View style={{ height: 80 }} />
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
  content: {
    padding: SPACING.md,
    paddingTop: SPACING.md + 4,
    paddingBottom: 90,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: 4,
    marginBottom: SPACING.md,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    ...SHADOWS.sm,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: '#D4AF37',
    ...SHADOWS.sm,
  },
  headerRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: FONTS.sansBold,
    color: COLORS.neutral[900],
  },
  liveDateBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  liveDateBadgeText: {
    fontSize: 10.5,
    fontFamily: FONTS.sansBold,
    color: '#8B0000',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11.5,
    fontFamily: FONTS.sans,
    color: COLORS.neutral[500],
    marginTop: 2,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary[100],
  },
  langTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: RADIUS.xl,
    padding: 4,
    gap: 6,
    marginBottom: SPACING.md,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    ...SHADOWS.sm,
  },
  langTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  tabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  langTabBtnActive: {
    backgroundColor: COLORS.primary[700],
    borderWidth: 1,
    borderColor: '#D4AF37',
    ...SHADOWS.sm,
  },
  langTabTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: COLORS.neutral[700],
  },
  langTabTitleActive: {
    color: '#ffffff',
  },
  readingPortalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  portalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  portalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1.2,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalHeading: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: COLORS.neutral[900],
  },
  portalSubText: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
    color: COLORS.neutral[500],
    marginTop: 2,
  },
  portalActionRow: {
    flexDirection: 'column',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  primaryActionBtn: {
    backgroundColor: '#dc2626',
    borderWidth: 1.2,
    borderColor: '#D4AF37',
  },
  primaryActionBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  secondaryActionBtn: {
    backgroundColor: '#FFFBF3',
    borderWidth: 1.4,
    borderColor: '#D4AF37',
  },
  secondaryActionBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
    color: COLORS.primary[800],
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  textReaderCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.4,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    width: '100%',
    overflow: 'hidden',
  },
  textReaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
    marginBottom: SPACING.md,
  },
  textReaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textReaderBadgeText: {
    fontSize: 11.5,
    fontFamily: FONTS.sansBold,
    color: '#8B0000',
    letterSpacing: 0.5,
  },
  openExternalIconBtn: {
    padding: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary[50],
  },
  headerControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontResizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  fontBtn: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontBtnDisabled: {
    opacity: 0.32,
  },
  fontBtnPressed: {
    opacity: 0.65,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  fontBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    color: COLORS.primary[800],
    letterSpacing: 0.2,
  },
  fontBtnTextDisabled: {
    color: COLORS.neutral[400],
  },
  fontSizeResetBtn: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    marginHorizontal: 1,
  },
  fontSizeResetBtnActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.28)',
  },
  fontSizeResetText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 9.5,
    color: COLORS.primary[900],
  },
  fontSizeResetTextActive: {
    color: COLORS.primary[800],
    fontFamily: FONTS.sansBold,
  },
  nativeTextFallback: {
    fontFamily: FONTS.sans,
    fontSize: 15.5,
    lineHeight: 26,
    color: COLORS.neutral[800],
    letterSpacing: 0.2,
  },
});

export default MurliScreen;