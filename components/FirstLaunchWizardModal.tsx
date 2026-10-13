import React, { useState, useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import {
  Bell,
  Clock,
  Zap,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react-native';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  TrafficControlNative,
  getDeviceBrandInfo,
  isAndroidTrafficApp,
} from '@/services/trafficNativePlugin';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { setJSON } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

export interface FirstLaunchWizardModalProps {
  visible: boolean;
  onComplete: () => void;
}

export function FirstLaunchWizardModal({ visible, onComplete }: FirstLaunchWizardModalProps) {
  // Only present on Android native app where OEM & background permissions apply
  if (!isAndroidTrafficApp() || !visible) {
    return null;
  }

  return <FirstLaunchWizardModalInner visible={visible} onComplete={onComplete} />;
}

function FirstLaunchWizardModalInner({ visible, onComplete }: FirstLaunchWizardModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [detectedBrand, setDetectedBrand] = useState<string>('Your Device');
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [step3Done, setStep3Done] = useState(false);
  const [step4Done, setStep4Done] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getDeviceBrandInfo()
      .then((info) => {
        if (isMounted && info?.brandName && info.brandName !== 'Your Device') {
          setDetectedBrand(info.brandName);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFinish = () => {
    setJSON(STORAGE_KEYS.firstLaunchWizard, true);
    onComplete();
  };

  const handleActionStep1 = async () => {
    try {
      const res = await LocalNotifications.requestPermissions();
      if (res?.display === 'granted') {
        setStep1Done(true);
      }
    } catch (e) {
      console.warn('[Wizard] Notification permission error:', e);
    }
    setCurrentStep(2);
  };

  const handleActionStep2 = async () => {
    try {
      await TrafficControlNative.requestExactAlarmPermission();
      setStep2Done(true);
    } catch (e) {
      console.warn('[Wizard] Exact alarm permission error:', e);
    }
    setCurrentStep(3);
  };

  const handleActionStep3 = async () => {
    try {
      await TrafficControlNative.requestIgnoreBatteryOptimizations();
      setStep3Done(true);
    } catch (e) {
      console.warn('[Wizard] Ignore battery optimization error:', e);
    }
    setCurrentStep(4);
  };

  const handleActionStep4 = async () => {
    try {
      const res = await TrafficControlNative.openOemBackgroundSettings();
      setStep4Done(true);
      if (Platform.OS === 'android') {
        if (res?.openedType === 'app_settings') {
          ToastAndroid.show('Please select Battery Saver -> No restrictions.', ToastAndroid.LONG);
        } else {
          ToastAndroid.show('Please enable Autostart & disable Battery Saver.', ToastAndroid.LONG);
        }
      }
    } catch (e) {
      console.warn('[Wizard] OEM autostart error:', e);
    }
    handleFinish();
  };

  const stepsData = [
    {
      step: 1,
      title: 'Enable Notifications',
      subtitle: 'Daily Murli & Meditation Alerts',
      desc: 'Receive morning Murli blessings, Traffic Control chime reminders, and spiritual announcements on time without missing a moment.',
      icon: Bell,
      iconColor: '#2563EB',
      iconBg: '#DBEAFE',
      actionText: 'Grant Notification Access',
      onAction: handleActionStep1,
      isDone: step1Done,
    },
    {
      step: 2,
      title: 'Exact Alarms',
      subtitle: 'Second-Accurate Meditation Chimes',
      desc: 'Allows the app to schedule precision timers for Traffic Control meditation chimes so they sound at the exact designated minute.',
      icon: Clock,
      iconColor: '#D97706',
      iconBg: '#FEF3C7',
      actionText: 'Allow Exact Alarms',
      onAction: handleActionStep2,
      isDone: step2Done,
    },
    {
      step: 3,
      title: 'Disable Battery Optimization',
      subtitle: 'Uninterrupted Audio Playback',
      desc: 'Android battery savers frequently stop or freeze background audio when the screen is locked. Whitelist Connect GOD to ensure seamless playback.',
      icon: Zap,
      iconColor: '#059669',
      iconBg: '#D1FAE5',
      actionText: 'Disable Battery Optimization',
      onAction: handleActionStep3,
      isDone: step3Done,
    },
    {
      step: 4,
      title: `OEM Autostart (${detectedBrand})`,
      subtitle: 'Background Killer Protection',
      desc: `Aggressive background managers on ${detectedBrand} devices can silence meditation alarms. Enable autostart and disable power restrictions.`,
      icon: ShieldAlert,
      iconColor: '#DC2626',
      iconBg: '#FEE2E2',
      actionText: 'Configure Autostart',
      onAction: handleActionStep4,
      isDone: step4Done,
    },
  ];

  const current = stepsData[currentStep - 1];
  const StepIcon = current.icon;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleFinish}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Top Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.stepBadge}>
                <Sparkles size={13} color="#D4AF37" strokeWidth={2.4} />
                <Text style={styles.stepBadgeText}>SETUP WIZARD • STEP {currentStep} OF 4</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
                onPress={handleFinish}
                hitSlop={8}
                accessibilityLabel="Close setup wizard"
              >
                <X size={18} color="#9CA3AF" strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Step Indicators */}
            <View style={styles.dotsRow}>
              {[1, 2, 3, 4].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.dot,
                    s === currentStep && styles.dotActive,
                    s < currentStep && styles.dotCompleted,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Step Content */}
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={[styles.iconWrap, { backgroundColor: current.iconBg }]}>
              <StepIcon size={34} color={current.iconColor} strokeWidth={2.2} />
            </View>

            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.subtitle}>{current.subtitle}</Text>

            <View style={styles.descCard}>
              <Text style={styles.descText}>{current.desc}</Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              onPress={current.onAction}
            >
              <Text style={styles.primaryBtnText}>{current.actionText}</Text>
              <ArrowRight size={16} color="#ffffff" strokeWidth={2.4} />
            </Pressable>

            <View style={styles.secondaryRow}>
              {currentStep > 1 && (
                <Pressable
                  style={({ pressed }) => [styles.linkBtn, pressed && styles.btnPressed]}
                  onPress={() => setCurrentStep((s) => Math.max(1, s - 1))}
                >
                  <Text style={styles.linkBtnText}>Back</Text>
                </Pressable>
              )}

              {currentStep < 4 ? (
                <Pressable
                  style={({ pressed }) => [styles.linkBtn, pressed && styles.btnPressed]}
                  onPress={() => setCurrentStep((s) => Math.min(4, s + 1))}
                >
                  <Text style={styles.linkBtnText}>Skip for now</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.linkBtn, pressed && styles.btnPressed]}
                  onPress={handleFinish}
                >
                  <Text style={styles.linkBtnText}>Done</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  stepBadgeText: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 10.5,
    color: '#92400E',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  dotActive: {
    backgroundColor: '#8B0000',
  },
  dotCompleted: {
    backgroundColor: '#D4AF37',
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 18,
    color: COLORS.neutral[900],
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.interMedium,
    fontSize: 13,
    color: '#D4AF37',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  descCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: SPACING.md,
    width: '100%',
  },
  descText: {
    fontFamily: FONTS.inter,
    fontSize: 13,
    lineHeight: 20,
    color: '#4B5563',
    textAlign: 'center',
  },
  footer: {
    padding: SPACING.lg,
    paddingTop: SPACING.xs,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B0000',
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  primaryBtnText: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 14,
    color: '#ffffff',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  linkBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  linkBtnText: {
    fontFamily: FONTS.interMedium,
    fontSize: 12.5,
    color: '#6B7280',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
