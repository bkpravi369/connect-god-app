import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL [ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleClearCache = () => {
    try {
      if (typeof window !== 'undefined') {
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        if (window.localStorage) {
          window.localStorage.clear();
        }
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((reg) => reg.unregister());
          });
        }
        window.location.reload();
      }
    } catch {
      this.handleRetry();
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || String(this.state.error || 'Unknown runtime error');
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <AlertTriangle color={COLORS.primary[700]} size={28} strokeWidth={2.2} />
            </View>
            <Text style={styles.title}>{this.props.fallbackTitle || 'Something went wrong'}</Text>
            <Text style={styles.subtitle}>
              This section encountered a minor issue. Your data and progress are safe.
            </Text>

            {/* Visual Error Details for Instant Diagnosis */}
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorMsg} numberOfLines={4}>
                {errorMsg}
              </Text>
              {componentStack ? (
                <Text style={styles.stackMsg} numberOfLines={3}>
                  {componentStack.trim().split('\n').slice(0, 2).join('\n')}
                </Text>
              ) : null}
            </View>

            <View style={styles.btnRow}>
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
                onPress={this.handleRetry}
              >
                <RefreshCw color="#ffffff" size={16} strokeWidth={2.2} />
                <Text style={styles.retryBtnText}>Try Again</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.clearBtn, pressed && styles.btnPressed]}
                onPress={this.handleClearCache}
              >
                <Trash2 color="#b45309" size={15} strokeWidth={2.2} />
                <Text style={styles.clearBtnText}>Clear Cache</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral[50],
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    ...SHADOWS.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.interBold,
    fontSize: 18,
    color: COLORS.neutral[900],
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.inter,
    fontSize: 13,
    color: COLORS.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#fffbeb',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 10,
    marginBottom: SPACING.lg,
  },
  errorTitle: {
    fontFamily: FONTS.interBold,
    fontSize: 11,
    color: '#92400e',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorMsg: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 12,
    color: '#b45309',
    lineHeight: 16,
  },
  stackMsg: {
    fontFamily: FONTS.inter,
    fontSize: 10,
    color: '#78350f',
    marginTop: 4,
    opacity: 0.85,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary[700],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  retryBtnText: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 14,
    color: '#ffffff',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
  },
  clearBtnText: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 13,
    color: '#92400e',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
