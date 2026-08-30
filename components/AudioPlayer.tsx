import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { configureAudioMode, getAudioStreamCandidates } from '@/services/audioService';

export type AudioPlayerProps = {
  url: string;
  isPlaying: boolean;
  playbackRate?: number;
  seekTo?: number | null;
  onSeeked?: () => void;
  onTimeUpdate: (seconds: number) => void;
  onDurationChange: (seconds: number) => void;
  onBufferingChange?: (isBuffering: boolean) => void;
  onEnded: () => void;
  onError: () => void;
};

export function AudioPlayer({
  url,
  isPlaying,
  playbackRate = 1,
  seekTo,
  onSeeked,
  onTimeUpdate,
  onDurationChange,
  onBufferingChange,
  onEnded,
  onError,
}: AudioPlayerProps) {
  const containerRef = useRef<View>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Stable callback refs to prevent React render thrashing
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  const onDurationChangeRef = useRef(onDurationChange);
  onDurationChangeRef.current = onDurationChange;

  const onBufferingChangeRef = useRef(onBufferingChange);
  onBufferingChangeRef.current = onBufferingChange;

  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const onSeekedRef = useRef(onSeeked);
  onSeekedRef.current = onSeeked;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const candidateIdxRef = useRef(0);
  const candidatesRef = useRef<string[]>([]);
  const activeBlobUrlRef = useRef<string | null>(null);

  // 1. Initialize audio mode
  useEffect(() => {
    configureAudioMode();
  }, []);

  // ── WEB AUDIO ENGINE (HTML5 Native Audio with multi-candidate stream fallback) ──
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;

    const candidates = getAudioStreamCandidates(url);
    candidatesRef.current = candidates;
    candidateIdxRef.current = 0;

    if (!candidates || candidates.length === 0) return;

    // Create or reuse audio element
    let audio = webAudioRef.current;
    if (!audio) {
      audio = document.createElement('audio');
      audio.controls = false;
      audio.preload = 'auto';
      webAudioRef.current = audio;
      if (containerRef.current) {
        // @ts-ignore
        containerRef.current.appendChild(audio);
      }
    }

    // Clean up previous blob
    if (activeBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch (e) {}
      activeBlobUrlRef.current = null;
    }

    const loadCandidate = (index: number) => {
      if (!audio || index >= candidates.length) {
        onBufferingChangeRef.current?.(false);
        onErrorRef.current?.();
        return;
      }

      candidateIdxRef.current = index;
      const targetUrl = candidates[index];
      console.log(`[AudioPlayer Web] Loading stream candidate (${index + 1}/${candidates.length}):`, targetUrl);
      
      onBufferingChangeRef.current?.(true);
      audio.src = targetUrl;
      audio.load();

      if (isPlayingRef.current) {
        audio.play().catch((err) => {
          console.log(`[AudioPlayer Web] Stream play error on candidate ${index + 1}:`, err);
          // Try next candidate
          loadCandidate(index + 1);
        });
      }
    };

    const handleTimeUpdate = () => {
      if (!audio) return;
      onBufferingChangeRef.current?.(false);
      onTimeUpdateRef.current?.(audio.currentTime || 0);
    };

    const handleDurationChange = () => {
      if (!audio) return;
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        onDurationChangeRef.current?.(audio.duration);
      }
    };

    const handleWaiting = () => {
      onBufferingChangeRef.current?.(true);
    };

    const handlePlaying = () => {
      if (!audio) return;
      onBufferingChangeRef.current?.(false);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        onDurationChangeRef.current?.(audio.duration);
      }
      if (isPlayingRef.current && audio.paused) {
        audio.play().catch(() => {});
      }
    };

    const handleEnded = () => {
      onBufferingChangeRef.current?.(false);
      onEndedRef.current?.();
    };

    const handleError = () => {
      console.log(`[AudioPlayer Web] Stream error event on candidate ${candidateIdxRef.current + 1}`);
      loadCandidate(candidateIdxRef.current + 1);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('canplay', handlePlaying);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    loadCandidate(0);

    return () => {
      if (audio) {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('durationchange', handleDurationChange);
        audio.removeEventListener('loadedmetadata', handleDurationChange);
        audio.removeEventListener('canplay', handlePlaying);
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.pause();
      }
      if (activeBlobUrlRef.current) {
        try {
          URL.revokeObjectURL(activeBlobUrlRef.current);
        } catch (e) {}
        activeBlobUrlRef.current = null;
      }
    };
  }, [url]);

  // Handle Play/Pause on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || !webAudioRef.current) return;
    const audio = webAudioRef.current;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.log('[AudioPlayer Web] isPlaying play() error:', err);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Handle Seek on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || !webAudioRef.current) return;
    if (seekTo !== undefined && seekTo !== null && !isNaN(seekTo)) {
      webAudioRef.current.currentTime = seekTo;
      onSeekedRef.current?.();
    }
  }, [seekTo]);

  // Handle PlaybackRate on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || !webAudioRef.current) return;
    webAudioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // ── NATIVE AUDIO ENGINE (expo-av Sound with candidate fallback) ──
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let isMounted = true;
    const candidates = getAudioStreamCandidates(url);
    candidatesRef.current = candidates;

    if (!candidates || candidates.length === 0) return;

    async function loadNativeSound(idx: number) {
      if (!isMounted || idx >= candidates.length) {
        onBufferingChangeRef.current?.(false);
        onErrorRef.current?.();
        return;
      }

      const activeUri = candidates[idx];
      console.log(`[AudioPlayer Native] Loading candidate (${idx + 1}/${candidates.length}):`, activeUri);

      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync().catch(() => {});
          soundRef.current = null;
        }

        onBufferingChangeRef.current?.(true);

        const { sound } = await Audio.Sound.createAsync(
          { uri: activeUri },
          { shouldPlay: isPlayingRef.current, rate: playbackRate, shouldCorrectPitch: true },
          (status: AVPlaybackStatus) => {
            if (!isMounted || !status.isLoaded) return;

            if (status.durationMillis) {
              onDurationChangeRef.current?.(status.durationMillis / 1000);
            }
            if (status.positionMillis !== undefined) {
              onTimeUpdateRef.current?.(status.positionMillis / 1000);
            }
            if (onBufferingChangeRef.current) {
              onBufferingChangeRef.current(status.isBuffering);
            }
            if (status.didJustFinish) {
              onEndedRef.current?.();
            }
          }
        );

        if (!isMounted) {
          await sound.unloadAsync().catch(() => {});
          return;
        }

        soundRef.current = sound;
        onBufferingChangeRef.current?.(false);
      } catch (e) {
        console.log(`[AudioPlayer Native] Error on candidate ${idx + 1}:`, e);
        loadNativeSound(idx + 1);
      }
    }

    loadNativeSound(0);

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [url]);

  // Handle Play/Pause on Native
  useEffect(() => {
    if (Platform.OS === 'web' || !soundRef.current) return;
    if (isPlaying) {
      soundRef.current.playAsync().catch(() => {});
    } else {
      soundRef.current.pauseAsync().catch(() => {});
    }
  }, [isPlaying]);

  // Handle Seek on Native
  useEffect(() => {
    if (Platform.OS === 'web' || !soundRef.current) return;
    if (seekTo !== undefined && seekTo !== null && !isNaN(seekTo)) {
      soundRef.current.setPositionAsync(seekTo * 1000).catch(() => {});
      onSeekedRef.current?.();
    }
  }, [seekTo]);

  // Handle PlaybackRate on Native
  useEffect(() => {
    if (Platform.OS === 'web' || !soundRef.current) return;
    soundRef.current.setRateAsync(playbackRate, true).catch(() => {});
  }, [playbackRate]);

  return <View ref={containerRef} style={{ width: 1, height: 1, opacity: 0, overflow: 'hidden' }} />;
}
