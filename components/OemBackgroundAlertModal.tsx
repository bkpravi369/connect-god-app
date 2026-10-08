import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ShieldAlert, ArrowRight, X } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import {
  getDeviceBrandInfo,
  requestOemBackgroundKillerProtection,
} from '@/services/trafficNativePlugin';

export interface OemBackgroundAlertModalProps {
  visible: boolean;
  onDismiss: () => void;
  brandName?: string;
  featureName?: 'Traffic Control' | 'Podcast';
  onSetupSuccess?: () => void;
}

export function OemBackgroundAlertModal({
  visible,
  onDismiss,
  brandName: initialBrand,
  featureName = 'Traffic Control',
  onSetupSuccess,
}: OemBackgroundAlertModalProps) {
  const [detectedBrand, setDetectedBrand] = useState<string>(initialBrand || 'Your Device');

  useEffect(() => {
    let isMounted = true;
    getDeviceBrandInfo()
      .then((info) => {
        if (isMounted && info.brandName && info.brandName !== 'Your Device') {
          setDetectedBrand(info.brandName);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSetupNow = async () => {
    try {
      await requestOemBackgroundKillerProtection();
      if (onSetupSuccess) onSetupSuccess();
    } catch (err) {
      console.warn('[OemBackgroundAlertModal] Setup error:', err);
    } finally {
      onDismiss();
    }
  };

  const alertMessage = `To ensure uninterrupted alarms on ${detectedBrand}, please allow Background Activity & disable Battery Saver.`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
            onPress={onDismiss}
            hitSlop={8}
            accessibilityLabel="Close alert"
          >
            <X color={COLORS.gray[400]} size={18} strokeWidth={2} />
          </Pressable>

          <View style={styles.iconWrap}>
            <ShieldAlert color="#d97706" size={28} strokeWidth={2.2} />
          </View>

          <Text style={styles.modalTitle}>Background Protection</Text>

          <Text style={styles.modalSubtitle}>
            {featureName} Optimization for {detectedBrand}
          </Text>

          <View style={styles.messageBox}>
            <Text style={styles.modalMessage}>{alertMessage}</Text>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
              onPress={onDismiss}
            >
              <Text style={styles.secondaryBtnText}>Later</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              onPress={handleSetupNow}
            >
              <Text style={styles.primaryBtnText}>Setup Now</Text>
              <ArrowRight color="#ffffff" size={16} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export interface OemWarningCardProps {
  brandName?: string;
  isExempted?: boolean;
  onSetupNow?: () => void;
  style?: any;
}

export function OemWarningCard({
  brandName: initialBrand,
  isExempted = false,
  onSetupNow,
  style,
}: OemWarningCardProps) {
  const [detectedBrand, setDetectedBrand] = useState<string>(initialBrand || 'Your Device');

  useEffect(() => {
    let isMounted = true;
    getDeviceBrandInfo()
      .then((info) => {
        if (isMounted && info.brandName && info.brandName !== 'Your Device') {
          setDetectedBrand(info.brandName);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePressSetup = async () => {
    if (onSetupNow) {
      onSetupNow();
    } else {
      await requestOemBackgroundKillerProtection();
    }
  };

  const alertMessage = `To ensure uninterrupted alarms on ${detectedBrand}, please allow Background Activity & disable Battery Saver.`;

  return (
    <View style={[styles.cardContainer, style]}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          <ShieldAlert color="#d97706" size={17} strokeWidth={2.2} />
          <Text style={styles.cardTitle}>{detectedBrand} Background Shield</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{isExempted ? 'Active' : 'Setup Required'}</Text>
        </View>
      </View>

      <Text style={styles.cardMessage}>{alertMessage}</Text>

      {!isExempted && (
        <Pressable
          style={({ pressed }) => [styles.cardActionBtn, pressed && styles.btnPressed]}
          onPress={handlePressSetup}
        >
          <Text style={styles.cardActionBtnText}>Setup Now</Text>
          <ArrowRight color="#78350f" size={14} strokeWidth={2.4} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    ...SHADOWS.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    borderRadius: RADIUS.full,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#d97706',
    textAlign: 'center',
    marginBottom: 12,
  },
  messageBox: {
    backgroundColor: '#fffbeb',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#fef08a',
    padding: 14,
    marginBottom: 20,
    width: '100%',
  },
  modalMessage: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 21,
    color: '#78350f',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#4b5563',
  },
  primaryBtn: {
    flex: 1.5,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  primaryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  cardContainer: {
    backgroundColor: '#fffbeb',
    borderRadius: RADIUS.lg,
    borderWidth: 1.2,
    borderColor: '#fde68a',
    padding: 14,
    marginBottom: SPACING.md,
    ...SHADOWS.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13.5,
    color: '#92400e',
  },
  statusPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 0.8,
    borderColor: '#fcd34d',
  },
  statusPillText: {
    fontFamily: FONTS.bold,
    fontSize: 10.5,
    color: '#b45309',
  },
  cardMessage: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
    color: '#78350f',
    marginBottom: 10,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  cardActionBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12.5,
    color: '#78350f',
  },
});
