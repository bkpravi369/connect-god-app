import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { ShieldAlert, ArrowRight, X } from 'lucide-react-native';
import {
  getDeviceBrandInfo,
  requestOemBackgroundKillerProtection,
  isAndroidTrafficApp,
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
  // Gracefully return null on Web / PWA where native OEM intents do not exist
  if (!isAndroidTrafficApp() || !visible) {
    return null;
  }

  return (
    <OemBackgroundAlertModalInner
      visible={visible}
      onDismiss={onDismiss}
      brandName={initialBrand}
      featureName={featureName}
      onSetupSuccess={onSetupSuccess}
    />
  );
}

function OemBackgroundAlertModalInner({
  visible,
  onDismiss,
  brandName: initialBrand,
  featureName = 'Traffic Control',
  onSetupSuccess,
}: OemBackgroundAlertModalProps) {
  const [detectedBrand, setDetectedBrand] = useState<string>(initialBrand || 'Your Device');

  useEffect(() => {
    let isMounted = true;
    try {
      getDeviceBrandInfo()
        .then((info) => {
          if (isMounted && info?.brandName && info.brandName !== 'Your Device') {
            setDetectedBrand(info.brandName);
          }
        })
        .catch(() => {});
    } catch {
      // Safe fallback
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSetupNow = async () => {
    try {
      const res = await requestOemBackgroundKillerProtection();
      if (Platform.OS === 'android') {
        if (res?.openedType === 'app_settings') {
          ToastAndroid.show('Please select Battery Saver -> No restrictions inside App info.', ToastAndroid.LONG);
        } else {
          ToastAndroid.show('Please allow background activity & disable battery restrictions.', ToastAndroid.LONG);
        }
      }
      if (onSetupSuccess) onSetupSuccess();
    } catch (err) {
      console.warn('[OemBackgroundAlertModal] Setup error:', err);
    } finally {
      if (onDismiss) onDismiss();
    }
  };

  const alertMessage = `To ensure uninterrupted alarms on ${detectedBrand}, please allow Background Activity & disable Battery Saver.`;

  try {
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
              <X color="#9ca3af" size={18} strokeWidth={2} />
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
  } catch (renderErr) {
    console.warn('[OemBackgroundAlertModal] Render error:', renderErr);
    return null;
  }
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
  // Gracefully return null on Web / PWA where native OEM intents do not exist
  if (!isAndroidTrafficApp()) {
    return null;
  }

  const [detectedBrand, setDetectedBrand] = useState<string>(initialBrand || 'Your Device');

  useEffect(() => {
    let isMounted = true;
    try {
      getDeviceBrandInfo()
        .then((info) => {
          if (isMounted && info?.brandName && info.brandName !== 'Your Device') {
            setDetectedBrand(info.brandName);
          }
        })
        .catch(() => {});
    } catch {
      // Safe fallback
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePressSetup = async () => {
    try {
      if (onSetupNow) {
        onSetupNow();
      } else {
        const res = await requestOemBackgroundKillerProtection();
        if (Platform.OS === 'android') {
          if (res?.openedType === 'app_settings') {
            ToastAndroid.show('Please select Battery Saver -> No restrictions inside App info.', ToastAndroid.LONG);
          } else {
            ToastAndroid.show('Please allow background activity & disable battery restrictions.', ToastAndroid.LONG);
          }
        }
      }
    } catch (err) {
      console.warn('[OemWarningCard] Setup error:', err);
    }
  };

  const alertMessage = `To ensure uninterrupted alarms on ${detectedBrand}, please allow Background Activity & disable Battery Saver.`;

  try {
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
  } catch (renderErr) {
    console.warn('[OemWarningCard] Render error:', renderErr);
    return null;
  }
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    borderRadius: 9999,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#d97706',
    textAlign: 'center',
    marginBottom: 12,
  },
  messageBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
    padding: 14,
    marginBottom: 20,
    width: '100%',
  },
  modalMessage: {
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
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  primaryBtn: {
    flex: 1.5,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  cardContainer: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#fde68a',
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    fontSize: 13.5,
    fontWeight: '600',
    color: '#92400e',
  },
  statusPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 0.8,
    borderColor: '#fcd34d',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#b45309',
  },
  cardMessage: {
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
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  cardActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#78350f',
  },
});

