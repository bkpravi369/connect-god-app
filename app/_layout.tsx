import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  NotoSansMalayalam_400Regular,
  NotoSansMalayalam_700Bold,
} from '@expo-google-fonts/noto-sans-malayalam';
import { ToastProvider } from '@/components/ToastProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'NotoMalayalam-Regular': NotoSansMalayalam_400Regular,
    'NotoMalayalam-Bold': NotoSansMalayalam_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        document.title = 'Connect GOD - BK Kozhikode Official App';
      }
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/service-worker.js')
            .then((registration) => {
              registration.update().catch(() => {});
            })
            .catch((err) => {
              console.warn('[ServiceWorker] Registration failed:', err);
            });
        });
      }
    }
  }, []);

  const pathname = usePathname();
  const isDesktopRoute = pathname === '/admin-manage';

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ToastProvider>
      <View style={[styles.webShell, isDesktopRoute && styles.webShellDesktop]}>
        <View style={[styles.mobileAppContainer, isDesktopRoute && styles.mobileAppContainerDesktop]}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="about" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="wallpapers" />
            <Stack.Screen name="admin-manage" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
      </View>
      <StatusBar style="dark" />
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  webShell: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: Platform.OS === 'web' ? '#090d16' : '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webShellDesktop: {
    backgroundColor: '#0f172a',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  mobileAppContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'web'
      ? {
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: '#1e293b',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.5,
          shadowRadius: 30,
          elevation: 25,
        }
      : {}),
  },
  mobileAppContainerDesktop: {
    maxWidth: '100%',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: '#0f172a',
  },
});
