import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
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

            <View style={styles.btnRow}>
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
                onPress={this.handleRetry}
              >
                <RefreshCw color="#ffffff" size={16} strokeWidth={2.2} />
                <Text style={styles.retryBtnText}>Try Again</Text>
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
    maxWidth: 360,
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.xl,
    padding: SPACING['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    ...SHADOWS.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.sansBold,
    fontSize: 17,
    color: COLORS.neutral[900],
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.xl,
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.md,
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
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  retryBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
    color: '#ffffff',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
