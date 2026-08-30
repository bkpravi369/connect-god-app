import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';

type ToastType = 'success' | 'info' | 'warning' | 'error';

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  show: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, React.ComponentType<{ color: string; size: number }>> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const COLORS_BY_TYPE: Record<ToastType, string> = {
  success: COLORS.success[500],
  info: COLORS.primary[600],
  warning: COLORS.warning[500],
  error: COLORS.error[500],
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <ToastBubble key={t.id} toast={t} Icon={Icon} color={COLORS_BY_TYPE[t.type]} />
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

function ToastBubble({
  toast,
  Icon,
  color,
}: {
  toast: Toast;
  Icon: React.ComponentType<{ color: string; size: number }>;
  color: string;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 6 }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[styles.toast, { opacity, transform: [{ translateY }] }]}
    >
      <Icon color={color} size={20} />
      <Text style={styles.toastText}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral[0],
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.md,
  },
  toastText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    color: COLORS.neutral[800],
    flexShrink: 1,
  },
});

// Re-export Pressable noop to satisfy unused import lints in some setups
export const _noop = Pressable;
