import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X, BookOpen, ExternalLink, FileText } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { MURLI_TODAY } from '@/lib/constants';
import { getJSON, setJSON } from '@/lib/storage';
import { STORAGE_KEYS, DEFAULT_MURLI_CONFIG } from '@/lib/constants';
import { useToast } from '@/components/ToastProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  fullMurliText?: string | null;
};

const DEFAULT_MURLI_FONT_SIZE = 17;
const MIN_MURLI_FONT_SIZE = 14;
const MAX_MURLI_FONT_SIZE = 28;
const MURLI_FONT_STORAGE_KEY = '@connectgod_murli_font_size';

export function MurliReaderModal({ visible, onClose, fullMurliText }: Props) {
  const toast = useToast();
  const [pdfUrl, setPdfUrl] = useState(MURLI_TODAY.pdfUrl);

  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = getJSON<number | null>(MURLI_FONT_STORAGE_KEY, null);
    if (typeof saved === 'number' && saved >= MIN_MURLI_FONT_SIZE && saved <= MAX_MURLI_FONT_SIZE) {
      return saved;
    }
    return DEFAULT_MURLI_FONT_SIZE;
  });

  useEffect(() => {
    if (!visible) return;
    const cfg = getJSON(STORAGE_KEYS.murliConfig, DEFAULT_MURLI_CONFIG);
    setPdfUrl(cfg.pdfUrl || MURLI_TODAY.pdfUrl);
    const savedFont = getJSON<number | null>(MURLI_FONT_STORAGE_KEY, null);
    if (typeof savedFont === 'number' && savedFont >= MIN_MURLI_FONT_SIZE && savedFont <= MAX_MURLI_FONT_SIZE) {
      setFontSize(savedFont);
    }
  }, [visible]);

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

  const handleOpenPdf = async () => {
    if (pdfUrl.includes('example')) {
      toast.show('Murli PDF not configured yet', 'info');
      return;
    }
    const ok = await Linking.canOpenURL(pdfUrl).catch(() => false);
    if (ok) {
      await Linking.openURL(pdfUrl);
    } else {
      toast.show('Unable to open Murli PDF', 'info');
    }
  };

  const hasAutoText = fullMurliText && fullMurliText.trim().length > 50;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Daily Murli</Text>
              <Text style={styles.headerSub}>ദൈനംദിന മുരളി · {MURLI_TODAY.date}</Text>
            </View>

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
                <Text style={[styles.fontBtnText, fontSize <= MIN_MURLI_FONT_SIZE && styles.fontBtnTextDisabled]}>
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
                accessibilityLabel={`Current font size ${fontPercent} percent. Tap to reset.`}
              >
                <Text style={[styles.fontSizeResetText, fontSize === DEFAULT_MURLI_FONT_SIZE && styles.fontSizeResetTextActive]}>
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
                <Text style={[styles.fontBtnText, fontSize >= MAX_MURLI_FONT_SIZE && styles.fontBtnTextDisabled]}>
                  A+
                </Text>
              </Pressable>
            </View>

            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <X color={COLORS.neutral[500]} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.iconWrap}>
              <BookOpen color={COLORS.neutral[0]} size={32} strokeWidth={2} />
            </View>
            <Text style={styles.title}>Daily Murli Reading</Text>
            <Text style={styles.subtitle}>
              The daily Murli is the spiritual knowledge given by the Supreme Father.
              Read today's Murli to nourish the soul with divine wisdom and uplift your day.
            </Text>

            {/* Auto-extracted full Murli text */}
            {hasAutoText && (
              <View style={styles.autoTextBox}>
                <View style={styles.autoTextBadge}>
                  <Text style={styles.autoTextBadgeText}>AUTO-EXTRACTED</Text>
                </View>
                <Text
                  style={[
                    styles.autoTextContent,
                    { fontSize, lineHeight: Math.round(fontSize * 1.65) },
                  ]}
                >
                  {fullMurliText}
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.openBtn, pressed && styles.openBtnPressed]}
              onPress={handleOpenPdf}
            >
              <FileText color={COLORS.neutral[0]} size={18} strokeWidth={2.2} />
              <Text style={styles.openBtnText}>Open Murli PDF</Text>
              <ExternalLink color={COLORS.neutral[0]} size={15} strokeWidth={2.2} />
            </Pressable>

            <View style={{ height: SPACING['3xl'] }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(67, 20, 7, 0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.neutral[0],
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
    gap: SPACING.sm,
  },
  headerTitle: { fontFamily: FONTS.sansBold, fontSize: 17, color: COLORS.primary[800] },
  headerSub: { fontFamily: FONTS.malayalam, fontSize: 12, color: COLORS.neutral[500], marginTop: 2 },
  fontResizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
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
  closeBtn: { width: 34, height: 34, borderRadius: 9999, backgroundColor: COLORS.neutral[100], alignItems: 'center', justifyContent: 'center' },
  body: { padding: SPACING.xl },
  iconWrap: { width: 64, height: 64, borderRadius: 9999, backgroundColor: COLORS.primary[600], alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SPACING.lg, ...SHADOWS.glow },
  title: { fontFamily: FONTS.sansBold, fontSize: 17, color: COLORS.neutral[900], textAlign: 'center' },
  subtitle: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.neutral[600], textAlign: 'center', lineHeight: 21, marginTop: SPACING.md, marginBottom: SPACING.xl },
  // Auto-extracted text box
  autoTextBox: {
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  autoTextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary[600],
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginBottom: SPACING.md,
  },
  autoTextBadgeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 9,
    color: COLORS.neutral[0],
    letterSpacing: 0.6,
  },
  autoTextContent: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.neutral[800],
    lineHeight: 22,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary[600],
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    ...SHADOWS.md,
  },
  openBtnPressed: { backgroundColor: COLORS.primary[700] },
  openBtnText: { fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.neutral[0] },
});
