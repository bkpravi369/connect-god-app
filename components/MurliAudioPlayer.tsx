import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { AudioPlayer } from '@/components/AudioPlayer';
import { SoundwaveIndicator } from '@/components/SoundwaveIndicator';

export interface MurliAudioPlayerProps {
  selectedLang: 'ml' | 'hi' | 'en';
  formattedDate: string;
  audioCandidates: string[];
}

export const MurliAudioPlayer = React.memo(function MurliAudioPlayer({
  selectedLang,
  formattedDate,
  audioCandidates,
}: MurliAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [audioPos, setAudioPos] = useState(0);
  const [audioDur, setAudioDur] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [audioUrlIndex, setAudioUrlIndex] = useState<number>(0);

  const audioDurRef = useRef(0);
  audioDurRef.current = audioDur;
  const trackLayoutRef = useRef<{ width: number; pageX: number }>({ width: 300, pageX: 0 });

  // Reset state on language switch
  useEffect(() => {
    setIsPlaying(false);
    setAudioPos(0);
    setAudioUrlIndex(0);
  }, [selectedLang]);

  const activeAudioUrl = audioCandidates[audioUrlIndex] || audioCandidates[0];

  const handleAudioError = useCallback(() => {
    if (audioUrlIndex < audioCandidates.length - 1) {
      setAudioUrlIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      setIsBuffering(false);
    }
  }, [audioUrlIndex, audioCandidates.length]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const totalW = trackLayoutRef.current.width || 300;
        const clickX = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, clickX / totalW));
        const duration = audioDurRef.current;
        if (duration > 0) setSeekTarget(ratio * duration);
      },
      onPanResponderMove: (evt) => {
        const totalW = trackLayoutRef.current.width || 300;
        const clickX = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, clickX / totalW));
        const duration = audioDurRef.current;
        if (duration > 0) setSeekTarget(ratio * duration);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const handleSeekBackward = useCallback(() => {
    setSeekTarget(Math.max(0, audioPos - 10));
  }, [audioPos]);

  const handleSeekForward = useCallback(() => {
    setSeekTarget(Math.min(audioDur || 1800, audioPos + 10));
  }, [audioPos, audioDur]);

  const fmtTime = (s: number) => {
    if (!s || isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressPercent = audioDur > 0 ? (audioPos / audioDur) * 100 : 0;

  return (
    <View style={styles.playerCard}>
      <View style={styles.playerTopRow}>
        <View style={styles.playerInfo}>
          <View style={styles.nowPlayingBadge}>
            <SoundwaveIndicator isPlaying={isPlaying && !isBuffering} color={COLORS.primary[700]} size={12} />
            <Text style={styles.nowPlayingText}>
              {isBuffering ? 'STREAMING...' : `MURLI AUDIO (${formattedDate})`}
            </Text>
          </View>
          <Text style={styles.playerTitle} numberOfLines={1}>
            {selectedLang === 'ml'
              ? 'മലയാളം മുരളി ഓഡിയോ'
              : selectedLang === 'hi'
              ? 'हिन्दी मुरली ऑडियो'
              : 'English Murli Audio'}
          </Text>
          <Text style={styles.playerSub} numberOfLines={1}>
            {formattedDate} • Official Babamurli.com Audio
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsGroup}>
          <Pressable
            style={({ pressed }) => [styles.seekBtn, pressed && styles.btnPressed]}
            onPress={handleSeekBackward}
            accessibilityLabel="Rewind 10 seconds"
          >
            <RotateCcw color={COLORS.primary[700]} size={15} strokeWidth={2.3} />
            <Text style={styles.seekBtnText}>-10s</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.playBtn, pressed && styles.btnPressed]}
            onPress={() => setIsPlaying(!isPlaying)}
            accessibilityLabel={isPlaying ? 'Pause Murli' : 'Play Murli'}
          >
            {isBuffering ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : isPlaying ? (
              <Pause color="#ffffff" size={18} strokeWidth={2.4} />
            ) : (
              <Play color="#ffffff" size={18} strokeWidth={2.4} fill="#ffffff" style={{ marginLeft: 2 }} />
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.seekBtn, pressed && styles.btnPressed]}
            onPress={handleSeekForward}
            accessibilityLabel="Forward 10 seconds"
          >
            <RotateCw color={COLORS.primary[700]} size={15} strokeWidth={2.3} />
            <Text style={styles.seekBtnText}>+10s</Text>
          </Pressable>
        </View>
      </View>

      {/* Progress Scrubber */}
      <View style={styles.progressWrap}>
        <View
          style={styles.progressTouchArea}
          {...panResponder.panHandlers}
          onLayout={(e) => {
            trackLayoutRef.current.width = e.nativeEvent.layout.width;
          }}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            <View
              style={[
                styles.progressThumb,
                { left: `${Math.min(98, Math.max(0, progressPercent))}%` },
              ]}
            />
          </View>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{fmtTime(audioPos)}</Text>
          <Text style={styles.timeText}>{fmtTime(audioDur)}</Text>
        </View>
      </View>

      {/* Internal Audio Player Component */}
      {activeAudioUrl ? (
        <AudioPlayer
          url={activeAudioUrl}
          isPlaying={isPlaying}
          seekTo={seekTarget}
          onSeeked={() => setSeekTarget(null)}
          onTimeUpdate={setAudioPos}
          onDurationChange={setAudioDur}
          onBufferingChange={setIsBuffering}
          onEnded={() => {
            setIsPlaying(false);
            setIsBuffering(false);
          }}
          onError={handleAudioError}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  playerCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  playerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playerInfo: {
    flex: 1,
    paddingRight: 8,
  },
  nowPlayingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  nowPlayingText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary[700],
    letterSpacing: 0.5,
  },
  playerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.neutral[900],
  },
  playerSub: {
    fontSize: 11,
    color: COLORS.neutral[500],
    marginTop: 1,
  },
  controlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seekBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    gap: 2,
  },
  seekBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary[800],
  },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#D4AF37',
    ...SHADOWS.sm,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  progressWrap: {
    marginTop: 4,
  },
  progressTouchArea: {
    height: 24,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#dc2626',
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D4AF37',
    borderWidth: 2,
    borderColor: '#ffffff',
    marginLeft: -7,
    ...SHADOWS.sm,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.neutral[500],
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

export default MurliAudioPlayer;
