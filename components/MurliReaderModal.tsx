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

export function MurliReaderModal({ visible, onClose, fullMurliText }: Props) {
  const toast = useToast();
  const [pdfUrl, setPdfUrl] = useState(MURLI_TODAY.pdfUrl);

  useEffect(() => {
    if (!visible) return;
    const cfg = getJSON(STORAGE_KEYS.murliConfig, DEFAULT_MURLI_CONFIG);
    setPdfUrl(cfg.pdfUrl || MURLI_TODAY.pdfUrl);
  }, [visible]);

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
                <Text style={styles.autoTextContent}>{fullMurliText}</Text>
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
  },
  headerTitle: { fontFamily: FONTS.sansBold, fontSize: 17, color: COLORS.primary[800] },
  headerSub: { fontFamily: FONTS.malayalam, fontSize: 12, color: COLORS.neutral[500], marginTop: 2 },
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
