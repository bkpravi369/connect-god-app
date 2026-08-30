import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Music, Play, Pause, Download, Headphones, X } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import {
  MeditationItem,
  DEFAULT_MEDITATION_ITEMS,
  STORAGE_KEYS,
  driveToStreamingUrl,
  driveToDownloadUrl,
} from '@/lib/constants';
import { getJSON } from '@/lib/storage';
import { useToast } from '@/components/ToastProvider';
import { AudioPlayer } from '@/components/AudioPlayer';

export default function MeditationScreen() {
  const toast = useToast();
  const [items, setItems] = useState<MeditationItem[]>(DEFAULT_MEDITATION_ITEMS);
  const [filter, setFilter] = useState<'commentary' | 'music' | 'song'>('commentary');
  const [playingItem, setPlayingItem] = useState<MeditationItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const stored = getJSON<MeditationItem[]>(STORAGE_KEYS.meditation, DEFAULT_MEDITATION_ITEMS);
    if (Array.isArray(stored) && stored.length > 0) setItems(stored);
  }, []);

  const handlePlay = (item: MeditationItem) => {
    if (item.driveUrl.includes('example') || !item.driveUrl.trim()) {
      toast.show('Audio URL not configured. Admin can set it in the Admin Panel.', 'info');
      return;
    }
    if (playingItem?.id === item.id) {
      setIsPlaying((p) => !p);
    } else {
      setPlayingItem(item);
      setIsPlaying(true);
    }
  };

  const handleDownload = async (item: MeditationItem) => {
    if (item.driveUrl.includes('example') || !item.driveUrl.trim()) {
      toast.show('Download URL not configured yet', 'info');
      return;
    }
    const url = driveToDownloadUrl(item.driveUrl);
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) {
      await Linking.openURL(url);
    } else {
      toast.show('Unable to open download link', 'info');
    }
  };

  const commentaries = items.filter((i) => i.category === 'commentary');
  const musics = items.filter((i) => i.category === 'music');
  const songs = items.filter((i) => i.category === 'song');
  const visible = filter === 'commentary' ? commentaries : filter === 'music' ? musics : songs;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <Headphones color={COLORS.neutral[0]} size={22} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Meditation & Songs</Text>
            <Text style={styles.headerSub}>ധ്യാനം, സംഗീതം & ഗാനങ്ങൾ</Text>
          </View>
        </View>

        {/* Filter Switcher */}
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterBtn, filter === 'commentary' && styles.filterBtnActive]}
            onPress={() => setFilter('commentary')}
          >
            <Text style={[styles.filterBtnText, filter === 'commentary' && styles.filterBtnTextActive]}>
              Commentaries ({commentaries.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterBtn, filter === 'music' && styles.filterBtnActive]}
            onPress={() => setFilter('music')}
          >
            <Text style={[styles.filterBtnText, filter === 'music' && styles.filterBtnTextActive]}>
              Music ({musics.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterBtn, filter === 'song' && styles.filterBtnActive]}
            onPress={() => setFilter('song')}
          >
            <Text style={[styles.filterBtnText, filter === 'song' && styles.filterBtnTextActive]}>
              Songs ({songs.length})
            </Text>
          </Pressable>
        </View>

        {/* Item List */}
        <View style={styles.listWrap}>
          {visible.length === 0 ? (
            <View style={styles.emptyState}>
              <Music color={COLORS.neutral[300]} size={36} strokeWidth={1.8} />
              <Text style={styles.emptyText}>No items yet</Text>
              <Text style={styles.emptySub}>Admin can add tracks in the Admin Panel</Text>
            </View>
          ) : (
            visible.map((item, idx) => {
              const isCurrent = playingItem?.id === item.id;
              const showPause = isCurrent && isPlaying;
              return (
                <View key={item.id} style={styles.listRow}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowIndex}>{String(idx + 1).padStart(2, '0')}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.subtitle ? (
                        <Text style={styles.rowSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.rowActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.playIconBtn,
                        pressed && styles.actionPressed,
                        isCurrent && styles.playIconBtnActive,
                      ]}
                      onPress={() => handlePlay(item)}
                      hitSlop={8}
                    >
                      {showPause ? (
                        <Pause color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
                      ) : (
                        <Play
                          color={isCurrent ? COLORS.neutral[0] : COLORS.primary[600]}
                          size={16}
                          strokeWidth={2.4}
                        />
                      )}
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.dlIconBtn, pressed && styles.actionPressed]}
                      onPress={() => handleDownload(item)}
                      hitSlop={8}
                    >
                      <Download color={COLORS.primary[600]} size={16} strokeWidth={2.2} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: SPACING['3xl'] }} />
      </ScrollView>

      {/* Audio Player Modal with streaming & download */}
      <AudioPlayerModal
        item={playingItem}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onClose={() => {
          setIsPlaying(false);
          setPlayingItem(null);
        }}
      />
    </View>
  );
}

function AudioPlayerModal({
  item,
  isPlaying,
  onTogglePlay,
  onClose,
}: {
  item: MeditationItem | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [audioFailed, setAudioFailed] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    setAudioFailed(false);
    setIsBuffering(false);
    setDuration(0);
    setPosition(0);
  }, [item?.id]);

  if (!item) return null;

  const handleDownload = async () => {
    const url = driveToDownloadUrl(item.driveUrl);
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) {
      await Linking.openURL(url);
    } else {
      toast.show('Unable to open download link', 'info');
    }
  };

  const fmtTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.playerOverlay}>
        <View style={styles.playerSheet}>
          {/* Header */}
          <View style={styles.playerHeader}>
            <Text style={styles.playerTitle} numberOfLines={1}>{item.title}</Text>
            <Pressable style={styles.playerClose} onPress={onClose} hitSlop={12}>
              <X color={COLORS.neutral[500]} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>
          {item.subtitle ? <Text style={styles.playerSubtitle}>{item.subtitle}</Text> : null}

          {/* Body */}
          <View style={styles.playerBody}>
            <Pressable
              style={({ pressed }) => [styles.playerPlayBtn, pressed && styles.actionPressed]}
              onPress={() => {
                setAudioFailed(false);
                onTogglePlay();
              }}
            >
              {isBuffering ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : isPlaying && !audioFailed ? (
                <Pause color={COLORS.neutral[0]} size={28} strokeWidth={2.4} />
              ) : (
                <Play color={COLORS.neutral[0]} size={28} strokeWidth={2.4} />
              )}
            </Pressable>
            <Text style={styles.playerLabel}>
              {isBuffering ? 'Buffering Audio...' : audioFailed ? 'Unable to stream' : isPlaying ? 'Now Streaming' : 'Paused'}
            </Text>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }]} />
            </View>
            <View style={styles.progressTimeRow}>
              <Text style={styles.progressTime}>{fmtTime(position)}</Text>
              <Text style={styles.progressTime}>{fmtTime(duration)}</Text>
            </View>

            {/* Download button */}
            <Pressable
              style={({ pressed }) => [styles.playerDlBtn, pressed && styles.actionPressed]}
              onPress={handleDownload}
            >
              <Download color={COLORS.primary[700]} size={16} strokeWidth={2.2} />
              <Text style={styles.playerDlText}>Download Audio</Text>
            </Pressable>

            {/* Hidden audio element with candidate fallback */}
            {audioFailed ? (
              <View style={styles.failBox}>
                <Text style={styles.failText}>
                  Streaming unavailable. Tap Download to save the file, or open in browser.
                </Text>
                <Pressable style={styles.failBtn} onPress={async () => {
                  const url = driveToStreamingUrl(item.driveUrl);
                  const ok = await Linking.canOpenURL(url).catch(() => false);
                  if (ok) await Linking.openURL(url);
                }}>
                  <Text style={styles.failBtnText}>Open in Browser</Text>
                </Pressable>
              </View>
            ) : (
              <AudioPlayer
                url={item.driveUrl}
                isPlaying={isPlaying}
                onTimeUpdate={setPosition}
                onDurationChange={setDuration}
                onBufferingChange={setIsBuffering}
                onEnded={() => { /* parent handles */ }}
                onError={() => setAudioFailed(true)}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  content: { padding: SPACING.lg },
  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primary[800], borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg, ...SHADOWS.md,
  },
  headerIconWrap: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.sansBold, fontSize: 17, color: COLORS.neutral[0] },
  headerSub: { fontFamily: FONTS.malayalam, fontSize: 13, color: COLORS.primary[200], marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  filterBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.md, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.neutral[0], borderWidth: 1.5, borderColor: COLORS.neutral[200],
  },
  filterBtnActive: { backgroundColor: COLORS.primary[600], borderColor: COLORS.primary[600], ...SHADOWS.sm },
  filterBtnText: { fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.primary[600] },
  filterBtnTextActive: { color: COLORS.neutral[0] },
  // Compact list
  listWrap: { gap: SPACING.xs },
  emptyState: { alignItems: 'center', paddingVertical: SPACING['4xl'], gap: SPACING.sm },
  emptyText: { fontFamily: FONTS.sansMedium, fontSize: 15, color: COLORS.neutral[500] },
  emptySub: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.neutral[400], textAlign: 'center' },
  listRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.neutral[0], borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderWidth: 1, borderColor: COLORS.neutral[100],
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  rowIndex: { fontFamily: FONTS.sansBold, fontSize: 13, color: COLORS.neutral[300], width: 28 },
  rowTitle: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.neutral[900] },
  rowSubtitle: { fontFamily: FONTS.malayalam, fontSize: 11, color: COLORS.neutral[500], marginTop: 1 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  playIconBtn: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50], alignItems: 'center', justifyContent: 'center',
  },
  playIconBtnActive: { backgroundColor: COLORS.primary[600] },
  dlIconBtn: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondary[100], alignItems: 'center', justifyContent: 'center',
  },
  actionPressed: { transform: [{ scale: 0.92 }] },
  // Player modal
  playerOverlay: { flex: 1, backgroundColor: 'rgba(67, 20, 7, 0.6)', justifyContent: 'flex-end' },
  playerSheet: {
    backgroundColor: COLORS.neutral[0], borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'],
    padding: SPACING.xl, paddingBottom: 32,
  },
  playerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerTitle: { fontFamily: FONTS.sansBold, fontSize: 17, color: COLORS.neutral[900], flex: 1 },
  playerClose: { width: 34, height: 34, borderRadius: RADIUS.full, backgroundColor: COLORS.neutral[100], alignItems: 'center', justifyContent: 'center' },
  playerSubtitle: { fontFamily: FONTS.malayalam, fontSize: 14, color: COLORS.neutral[500], marginTop: SPACING.xs },
  playerBody: { alignItems: 'center', paddingVertical: SPACING['3xl'] },
  playerPlayBtn: {
    width: 72, height: 72, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[600], alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg, ...SHADOWS.glow,
  },
  playerLabel: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.primary[700], marginBottom: SPACING.lg },
  // Progress bar
  progressTrack: {
    width: '100%', height: 4, borderRadius: 2, backgroundColor: COLORS.neutral[200], overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 2, backgroundColor: COLORS.primary[600],
  },
  progressTimeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: SPACING.xs },
  progressTime: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.neutral[400] },
  // Download button in player
  playerDlBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.secondary[100], borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.xl,
  },
  playerDlText: { fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.primary[700] },
  // Audio element
  audioElementWrap: { width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  // Fallback
  failBox: { alignItems: 'center', gap: SPACING.md, marginTop: SPACING.lg, paddingHorizontal: SPACING.lg },
  failText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.neutral[500], textAlign: 'center', lineHeight: 18 },
  failBtn: {
    backgroundColor: COLORS.primary[600], borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
  },
  failBtnText: { fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.neutral[0] },
});

export { MeditationScreen };
