import React, { useEffect } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Video, X, User, ArrowRight } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { ZOOM_CONFIG } from '@/lib/constants';

type Props = {
  visible: boolean;
  onClose: () => void;
  onJoin: (name: string) => void;
};

export function ZoomJoinModal({ visible, onClose, onJoin }: Props) {
  const [name, setName] = React.useState('');
  const scale = React.useRef(new Animated.Value(0.9)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.9);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  const handleJoin = () => {
    if (!name.trim()) return;
    onJoin(name.trim());
    setName('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ scale }], opacity }]}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Video color={COLORS.primary[700]} size={22} strokeWidth={2.2} />
            </View>
            <Text style={styles.title}>Join Live Murali in Zoom</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <X color={COLORS.neutral[500]} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>

          <Text style={styles.description}>
            Enter your name to join the live session. The meeting password is included automatically.
          </Text>

          <View style={styles.inputWrap}>
            <User color={COLORS.neutral[400]} size={18} strokeWidth={2} />
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={COLORS.neutral[400]}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={handleJoin}
            />
          </View>

          <View style={styles.meetingInfo}>
            <Text style={styles.meetingLabel}>Meeting ID</Text>
            <Text style={styles.meetingValue}>{ZOOM_CONFIG.meetingId}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.joinBtn, pressed && styles.joinBtnPressed]}
            onPress={handleJoin}
            disabled={!name.trim()}
          >
            <Text style={styles.joinBtnText}>Join Meeting</Text>
            <ArrowRight color={COLORS.neutral[0]} size={18} strokeWidth={2.2} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS['2xl'],
    padding: SPACING['2xl'],
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: FONTS.sansBold,
    fontSize: 17,
    color: COLORS.neutral[900],
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral[100],
  },
  description: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    color: COLORS.neutral[500],
    lineHeight: 19,
    marginBottom: SPACING.lg,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.sansMedium,
    fontSize: 15,
    color: COLORS.neutral[900],
    padding: 0,
  },
  meetingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  meetingLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: COLORS.neutral[500],
  },
  meetingValue: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
    color: COLORS.neutral[800],
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary[600],
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
  },
  joinBtnPressed: {
    backgroundColor: COLORS.primary[700],
  },
  joinBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    color: COLORS.neutral[0],
  },
});
