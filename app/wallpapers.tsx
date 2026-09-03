import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Download,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
  X,
  Eye,
  Info,
} from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { useToast } from '@/components/ToastProvider';
import {
  WallpaperItem,
  fetchWallpapers,
  getCachedWallpapers,
  WALLPAPERS_CLOUD_NAME,
  WALLPAPERS_ASSET_TAG,
} from '@/services/wallpaperService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_MAX_W = Math.min(SCREEN_WIDTH, 440);
const HORIZONTAL_PADDING = SPACING.md;
const COLUMN_GAP = 10;
const COLUMN_WIDTH = Math.floor((CONTAINER_MAX_W - (HORIZONTAL_PADDING * 2) - COLUMN_GAP) / 2);

export default function WallpapersScreen() {
  const router = useRouter();
  const toast = useToast();

  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>(getCachedWallpapers);
  const [loading, setLoading] = useState<boolean>(() => getCachedWallpapers().length === 0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isRestricted, setIsRestricted] = useState<boolean>(false);
  const [selectedWallpaper, setSelectedWallpaper] = useState<WallpaperItem | null>(null);

  // Animation values
  const spinAnim = useRef(new Animated.Value(0)).current;
  const skeletonPulse = useRef(new Animated.Value(0.3)).current;

  // Shimmer pulse animation for skeletons
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 0.8,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [skeletonPulse]);

  const loadWallpapers = useCallback(
    async (force = true) => {
      if (wallpapers.length === 0) setLoading(true);
      try {
        const res = await fetchWallpapers(force);
        setWallpapers(res.wallpapers);
        setIsRestricted(!!res.isRestricted);
      } catch (err) {
        console.warn('[WallpapersScreen] Fetch error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [wallpapers.length]
  );

  useEffect(() => {
    loadWallpapers(true);
  }, [loadWallpapers]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    await loadWallpapers(true);

    spinAnim.setValue(0);
    toast.show('Wallpapers refreshed', 'info');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/' as any);
    }
  };

  const handleDownload = async (item: WallpaperItem) => {
    toast.show(`Downloading: ${item.title}`, 'info');

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = item.downloadUrl;
      a.download = `${item.title.replace(/\s+/g, '_')}.${item.format || 'jpg'}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const can = await Linking.canOpenURL(item.downloadUrl).catch(() => false);
    if (can) {
      await Linking.openURL(item.downloadUrl);
    } else {
      await Linking.openURL(item.fullUrl);
    }
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Split into 2 Pinterest columns
  const col0 = wallpapers.filter((_, i) => i % 2 === 0);
  const col1 = wallpapers.filter((_, i) => i % 2 === 1);

  return (
    <View style={styles.container}>
      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
          onPress={handleBack}
          hitSlop={10}
          accessibilityLabel="Go back"
        >
          <ArrowLeft color="#ffffff" size={22} strokeWidth={2.4} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Spiritual Wallpapers</Text>
            {wallpapers.length > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{wallpapers.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSub}>Divine & Meditation HD Wallpapers</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && styles.btnPressed]}
          onPress={handleRefresh}
          hitSlop={10}
          accessibilityLabel="Refresh Wallpapers"
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RefreshCw color="#D4AF37" size={18} strokeWidth={2.4} />
          </Animated.View>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary[700]]}
            tintColor={COLORS.primary[700]}
          />
        }
      >
        {/* ── Hero Banner ─────────────────────────────────────────── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroLeft}>
            <View style={styles.heroBadge}>
              <Sparkles color="#D4AF37" size={12} strokeWidth={2.5} />
              <Text style={styles.heroBadgeText}>DIVINE SACRED ART</Text>
            </View>
            <Text style={styles.heroTitle}>High-Definition Wallpapers</Text>
            <Text style={styles.heroDesc}>
              Sacred remembrance of Shiva Baba, Brahma Baba & Madhuban Peace
            </Text>
          </View>
          <View style={styles.heroIconWrap}>
            <ImageIcon color="#ffffff" size={24} strokeWidth={2.2} />
          </View>
        </View>

        {/* ── Content: Loading / Skeletons / Empty / 2-Col Grid ───── */}
        {loading && wallpapers.length === 0 ? (
          // 2-Column Skeleton Grid
          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              {[220, 180, 240].map((h, i) => (
                <Animated.View
                  key={`skel_col0_${i}`}
                  style={[styles.skeletonCard, { height: h, opacity: skeletonPulse }]}
                />
              ))}
            </View>
            <View style={styles.gridColumn}>
              {[190, 230, 200].map((h, i) => (
                <Animated.View
                  key={`skel_col1_${i}`}
                  style={[styles.skeletonCard, { height: h, opacity: skeletonPulse }]}
                />
              ))}
            </View>
          </View>
        ) : wallpapers.length === 0 ? (
          // Empty State
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <ImageIcon color={COLORS.primary[700]} size={36} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>No Wallpapers Found</Text>
            <Text style={styles.emptyBody}>
              Wallpapers uploaded with tag <Text style={styles.codeText}>"{WALLPAPERS_ASSET_TAG}"</Text> in Cloudinary
              account <Text style={styles.codeText}>"{WALLPAPERS_CLOUD_NAME}"</Text> will automatically appear here.
            </Text>

            {isRestricted && (
              <View style={styles.restrictionNotice}>
                <Info color="#B45309" size={15} strokeWidth={2.2} style={{ marginTop: 2 }} />
                <Text style={styles.restrictionText}>
                  Cloudinary client-side listing is currently restricted on this account. In Cloudinary Console, navigate to{' '}
                  <Text style={{ fontWeight: '700' }}>Settings &gt; Security</Text> and uncheck{' '}
                  <Text style={{ fontWeight: '700' }}>"Resource list"</Text>.
                </Text>
              </View>
            )}

            <Pressable style={styles.emptyActionBtn} onPress={handleRefresh}>
              <RefreshCw color="#ffffff" size={15} strokeWidth={2.2} />
              <Text style={styles.emptyActionText}>Refresh Gallery</Text>
            </Pressable>
          </View>
        ) : (
          // 2-Column Pinterest/Card Style Grid
          <View style={styles.gridContainer}>
            {/* Left Column */}
            <View style={styles.gridColumn}>
              {col0.map((item, index) => (
                <WallpaperCard
                  key={item.id}
                  item={item}
                  index={index * 2}
                  onPress={() => setSelectedWallpaper(item)}
                  onDownload={() => handleDownload(item)}
                />
              ))}
            </View>

            {/* Right Column */}
            <View style={styles.gridColumn}>
              {col1.map((item, index) => (
                <WallpaperCard
                  key={item.id}
                  item={item}
                  index={index * 2 + 1}
                  onPress={() => setSelectedWallpaper(item)}
                  onDownload={() => handleDownload(item)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: SPACING['3xl'] }} />
      </ScrollView>

      {/* ── Full-Screen Preview Modal ─────────────────────────────── */}
      <Modal
        visible={!!selectedWallpaper}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedWallpaper(null)}
      >
        {selectedWallpaper && (
          <View style={styles.modalBackdrop}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setSelectedWallpaper(null)}
                hitSlop={12}
                accessibilityLabel="Close wallpaper preview"
              >
                <X color="#ffffff" size={22} strokeWidth={2.4} />
              </Pressable>

              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedWallpaper.title}
                </Text>
                <Text style={styles.modalSubTitle}>
                  {selectedWallpaper.width} x {selectedWallpaper.height} • {selectedWallpaper.format.toUpperCase()}
                </Text>
              </View>

              <Pressable
                style={styles.modalHeaderDownloadBtn}
                onPress={() => handleDownload(selectedWallpaper)}
                hitSlop={10}
                accessibilityLabel="Download full resolution"
              >
                <Download color="#ffffff" size={20} strokeWidth={2.4} />
              </Pressable>
            </View>

            {/* Modal Full-Screen Image */}
            <View style={styles.modalImageContainer}>
              <Image
                source={{ uri: selectedWallpaper.fullUrl }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </View>

            {/* Modal Bottom Action Bar */}
            <View style={styles.modalBottomBar}>
              <Pressable
                style={({ pressed }) => [
                  styles.downloadBigBtn,
                  pressed && styles.downloadBigBtnPressed,
                ]}
                onPress={() => handleDownload(selectedWallpaper)}
              >
                <Download color="#ffffff" size={18} strokeWidth={2.4} />
                <Text style={styles.downloadBigBtnText}>Download Full HD Wallpaper</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

/**
 * Individual Wallpaper Card for the 2-Column Pinterest Grid
 */
function WallpaperCard({
  item,
  onPress,
  onDownload,
}: {
  item: WallpaperItem;
  index: number;
  onPress: () => void;
  onDownload: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Dynamic aspect ratio calculation based on natural dimensions, clamped for elegant vertical portrait display
  const rawRatio = item.width > 0 && item.height > 0 ? item.height / item.width : 1.4;
  const aspectRatio = Math.max(1.15, Math.min(1.65, rawRatio));
  const cardHeight = Math.round(COLUMN_WIDTH * aspectRatio);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardWrap,
        { height: cardHeight },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityLabel={`View ${item.title}`}
    >
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.cardImage}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
          onError={() => setHasError(true)}
        />

        {!imageLoaded && !hasError && (
          <View style={styles.imageLoadingOverlay}>
            <ActivityIndicator size="small" color={COLORS.primary[700]} />
          </View>
        )}

        {hasError && (
          <View style={styles.imageErrorOverlay}>
            <ImageIcon color={COLORS.neutral[400]} size={24} strokeWidth={2} />
            <Text style={styles.errorText}>Preview</Text>
          </View>
        )}

        {/* Gradient Overlay & Metadata Badge */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.cardActionRow}>
            <View style={styles.cardFormatPill}>
              <Text style={styles.cardFormatText}>{item.format.toUpperCase()}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.quickDownloadBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              hitSlop={6}
              accessibilityLabel={`Download ${item.title}`}
            >
              <Download color="#ffffff" size={13} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>

        {/* Subtle view icon indicator on top right */}
        <View style={styles.previewIndicator}>
          <Eye color="#ffffff" size={12} strokeWidth={2.4} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 40,
    gap: SPACING.md,
  },

  // ── Header ──────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[700],
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1.5,
    borderBottomColor: '#D4AF37',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  headerSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: 2,
  },
  countPill: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  countPillText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: COLORS.primary[900],
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },

  // ── Hero Banner ─────────────────────────────────────
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    ...SHADOWS.sm,
  },
  heroLeft: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  heroBadgeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 9.5,
    color: COLORS.primary[700],
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: COLORS.neutral[900],
    marginBottom: 2,
  },
  heroDesc: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.neutral[500],
    lineHeight: 15,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    ...SHADOWS.sm,
  },

  // ── 2-Column Pinterest Grid ─────────────────────────
  gridContainer: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
    justifyContent: 'space-between',
  },
  gridColumn: {
    width: COLUMN_WIDTH,
    gap: COLUMN_GAP,
  },
  cardWrap: {
    width: '100%',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    ...SHADOWS.sm,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  cardImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#f5ece1',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5ece1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5ece1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  errorText: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: COLORS.neutral[400],
  },
  cardFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(13, 15, 20, 0.72)',
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  cardTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFormatPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  cardFormatText: {
    fontFamily: FONTS.sansBold,
    fontSize: 8.5,
    color: '#D4AF37',
    letterSpacing: 0.4,
  },
  quickDownloadBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  previewIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Skeleton Loader ─────────────────────────────────
  skeletonCard: {
    width: '100%',
    backgroundColor: '#ebd8c3',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },

  // ── Empty State ─────────────────────────────────────
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary[100],
  },
  emptyTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: COLORS.neutral[900],
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  codeText: {
    fontFamily: FONTS.sansBold,
    color: COLORS.primary[700],
  },
  restrictionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: SPACING.md,
  },
  restrictionText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary[700],
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#D4AF37',
    ...SHADOWS.sm,
  },
  emptyActionText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
    color: '#ffffff',
  },

  // ── Full-Screen Modal Preview ───────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 10, 0.95)',
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 18,
    paddingBottom: 14,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(15, 20, 28, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.25)',
    gap: 12,
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    color: '#ffffff',
  },
  modalSubTitle: {
    fontFamily: FONTS.sans,
    fontSize: 10.5,
    color: '#D4AF37',
    marginTop: 1,
  },
  modalHeaderDownloadBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  modalImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalBottomBar: {
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.md,
    backgroundColor: 'rgba(15, 20, 28, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.25)',
  },
  downloadBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary[700],
    paddingVertical: 13,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    ...SHADOWS.md,
  },
  downloadBigBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  downloadBigBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
