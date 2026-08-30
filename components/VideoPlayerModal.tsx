import React from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { X, ExternalLink, Youtube } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { useToast } from '@/components/ToastProvider';

export type VideoPlayItem = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  videoId?: string;
  channelId?: string;
  channelName?: string;
  badge?: string;
  badgeColor?: string;
  thumbnail?: string;
};

type Props = {
  visible: boolean;
  video: VideoPlayItem | null;
  onClose: () => void;
};

export function VideoPlayerModal({ visible, video, onClose }: Props) {
  const toast = useToast();

  if (!video) return null;

  const extractYoutubeId = (url: string): string => {
    if (video.videoId && video.videoId.length === 11) return video.videoId;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = (url || '').match(regExp);
    if (match && match[2].length === 11) return match[2];
    if (
      video.channelId === 'UCvQFuOM38iAZD7ltMujOq-g' ||
      video.channelId === 'bk-sheeja' ||
      video.title === 'BK Sheeja' ||
      video.channelName === 'BK Sheeja'
    ) {
      return 'tiKb43faieY';
    }
    return 'u31qwQUeGuM';
  };

  const videoId = extractYoutubeId(video.url);

  // Strict in-app playback flags to prevent redirect and "Watch on YouTube" embed block
  const embedUrl = `https://www.youtube.com/embed/${videoId}?playsinline=1&enablejsapi=1&rel=0&autoplay=1&origin=https://localhost`;

  const handleOpenExternal = async () => {
    const targetUrl = video.url || `https://www.youtube.com/watch?v=${videoId}`;
    const ok = await Linking.canOpenURL(targetUrl).catch(() => false);
    if (ok) {
      await Linking.openURL(targetUrl);
    } else {
      toast.show('Opening YouTube...', 'info');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeWrap}>
              <View style={[styles.badge, { backgroundColor: video.badgeColor || COLORS.error[600] }]}>
                <Text style={styles.badgeText}>{video.badge || 'VIDEO'}</Text>
              </View>
              <Text style={styles.channelText} numberOfLines={1}>
                {video.channelName || 'Connect GOD'}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10} accessibilityLabel="Close player">
              <X color={COLORS.neutral[500]} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* In-app Video Player Frame (16:9 Aspect Ratio) */}
          <View style={styles.playerWrap}>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              <iframe
                src={embedUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={video.title}
              />
            ) : (
              <WebView
                style={{ flex: 1, backgroundColor: '#000000' }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={['*']}
                source={{
                  uri: embedUrl,
                  headers: { Referer: 'https://localhost' },
                }}
                userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"
                allowsFullscreenVideo={true}
                onShouldStartLoadWithRequest={() => {
                  // Keep playback inside the modal, allow youtube/embed loads, block unauthorized external app switching
                  return true;
                }}
              />
            )}
          </View>

          {/* Details & Actions */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{video.title}</Text>
            <Text style={styles.subtitle}>{video.subtitle}</Text>

            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                onPress={handleOpenExternal}
              >
                <Youtube color="#dc2626" size={18} strokeWidth={2.2} />
                <Text style={styles.actionBtnText}>Open in YouTube App</Text>
                <ExternalLink color="#dc2626" size={14} strokeWidth={2.2} />
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: COLORS.neutral[0],
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    maxHeight: '90%',
    overflow: 'hidden',
    alignSelf: 'center',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  channelText: {
    fontSize: 14,
    fontFamily: FONTS.sansBold,
    color: COLORS.neutral[800],
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  body: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.sansBold,
    color: COLORS.neutral[900],
    lineHeight: 22,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.neutral[600],
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[100],
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  actionBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: FONTS.sansBold,
    color: '#dc2626',
  },
});