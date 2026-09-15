import { AppState, Share } from 'react-native';
import {
  TrafficControlNative,
  getTrafficAlarmDetailedStatus,
  getTrafficDiagnostics,
  exportTrafficDiagnosticsReport,
  isAndroidTrafficApp,
  TRAFFIC_PRESET_STORAGE_KEY,
  TrafficDiagnosticsData,
  AlarmStatusResult,
  SystemRingtone,
  getSystemAlarmTones,
  pickCustomAudioFile,
  playToneAudioPreview,
  stopToneAudioPreview,
  stopCurrentAlarmPlayback,
} from '@/services/trafficNativePlugin';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Plus,
  X,
  Bell,
  Trash2,
  ChevronDown,
  Clock,
  Volume2,
  VolumeX,
  Play,
  Square,
  Repeat,
  Activity,
  AlertTriangle,
  Share2,
  Copy,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Music,
  FolderOpen,
  Smartphone,
  Check,
} from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, BOTTOM_NAV_PADDING } from '@/lib/theme';
import {
  PRESET_ALARMS,
  HOURLY_TRAFFIC_TIMES,
  WEEKDAYS,
  STORAGE_KEYS,
  TRAFFIC_TRACK_SLOTS,
} from '@/lib/constants';
import { formatTime12h } from '@/lib/dates';
import { getJSON, setJSON } from '@/lib/storage';
import { useToast } from '@/components/ToastProvider';
import {
  playTrafficSlot,
  stopTrafficAudio,
  subscribeTrafficPlayback,
  timeToTrafficSlotKey,
} from '@/services/trafficAudioService';
import { rescheduleAllTrafficAlarms } from '@/services/notificationService';

export type CustomAlarm = {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  snoozeEnabled: boolean;
  repeatDays: number[] | null;
  loopRingtone: boolean;
  ringtoneKey: string;
  toneType?: 'bundled' | 'system' | 'file';
  toneUri?: string;
  toneTitle?: string;
};

export type AlarmState = {
  enabled: boolean;
  snoozeEnabled: boolean;
  repeatDays: number[] | null;
  loopRingtone: boolean;
  ringtoneKey: string;
  toneType?: 'bundled' | 'system' | 'file';
  toneUri?: string;
  toneTitle?: string;
};

export interface ToneSelection {
  toneType: 'bundled' | 'system' | 'file';
  toneUri?: string;
  toneTitle?: string;
}

export const BUNDLED_TONES = [
  { key: 'hourly_chime', title: 'Traffic Control Hourly Chime', subtitle: 'Calming bell chime' },
  { key: 'amritvela', title: 'Amritvela (3:30 AM)', subtitle: 'Divine soul remembrance' },
  { key: 'early_morning', title: 'Early Morning (5:45 AM)', subtitle: 'Peaceful dawn meditation' },
  { key: 'morning', title: 'Morning Study (7:00 AM)', subtitle: 'Murli study remembrance' },
  { key: 'mid_morning', title: 'Mid-Morning (10:30 AM)', subtitle: 'Mindful pause & withdrawal' },
  { key: 'noon', title: 'Noon Remembrance (12:00 PM)', subtitle: 'Midday stillness & peace' },
  { key: 'evening', title: 'Evening Sandhya (5:30 PM)', subtitle: 'Loving spiritual connection' },
  { key: 'dusk', title: 'Dusk (7:30 PM)', subtitle: 'Twilight contemplation' },
  { key: 'night', title: 'Night (9:30 PM)', subtitle: 'Evening silence & reflection' },
  { key: 'late_night', title: 'Late Night (11:00 PM)', subtitle: 'Soul rest & slumber' },
];

const DEFAULT_ALARM_STATE: AlarmState = {
  enabled: true,
  snoozeEnabled: true,
  repeatDays: null,
  loopRingtone: false,
  ringtoneKey: 'default',
  toneType: 'bundled',
  toneUri: '',
  toneTitle: 'Traffic Control Hourly Chime',
};

const DEFAULT_CUSTOM_ALARMS: CustomAlarm[] = [];

export default function TrafficControlScreen() {
  const toast = useToast();
  const [alarmStatus, setAlarmStatus] = useState('Checking alarm setup…');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [detailedStatus, setDetailedStatus] = useState<AlarmStatusResult | null>(null);

  const [diagnosticsVisible, setDiagnosticsVisible] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<TrafficDiagnosticsData | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [reportText, setReportText] = useState('');

  const refreshAlarmStatus = () => {
    try {
      getTrafficAlarmDetailedStatus()
        .then((res) => {
          setDetailedStatus(res);
          setAlarmStatus(res.message);
          if (res.scheduleError) {
            setScheduleError(res.scheduleError);
          }
        })
        .catch((e) => console.error('[TrafficControlScreen] refreshAlarmStatus error:', e));
    } catch (e) {
      console.error('[TrafficControlScreen] refreshAlarmStatus sync error:', e);
    }
  };

  const syncAlarms = () => {
    setScheduleError(null);
    try {
      rescheduleAllTrafficAlarms()
        .then(() => {
          setScheduleError(null);
          refreshAlarmStatus();
        })
        .catch((e: any) => {
          console.error('[TrafficControlScreen] syncAlarms error:', e);
          const errMsg = e?.message || String(e);
          setScheduleError(errMsg);
          refreshAlarmStatus();
          toast.show('Alarm scheduling issue: ' + errMsg, 'info');
        });
    } catch (e: any) {
      console.error('[TrafficControlScreen] syncAlarms sync error:', e);
      setScheduleError(e?.message || String(e));
    }
  };

  const handleOpenDiagnostics = async () => {
    setDiagnosticsVisible(true);
    setDiagnosticsLoading(true);
    try {
      const data = await getTrafficDiagnostics();
      setDiagnosticsData(data);
      const rep = await exportTrafficDiagnosticsReport();
      setReportText(rep);
    } catch (err) {
      console.error('Error loading diagnostics', err);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleShareReport = async () => {
    try {
      let report = reportText;
      if (!report) {
        report = await exportTrafficDiagnosticsReport();
        setReportText(report);
      }
      await Share.share({
        message: report,
        title: 'Connect GOD Traffic Control Diagnostics',
      });
    } catch (err) {
      console.error('Error sharing report', err);
    }
  };

  const handleCopyReport = async () => {
    try {
      let report = reportText;
      if (!report) {
        report = await exportTrafficDiagnosticsReport();
        setReportText(report);
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(report);
        toast.show('Diagnostics report copied to clipboard!', 'success');
      } else {
        toast.show('Report ready - copy from report text below', 'info');
      }
    } catch {
      toast.show('Unable to copy automatically - use Share button', 'info');
    }
  };
  useEffect(() => {
    refreshAlarmStatus();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncAlarms();
    });
    const onFocus = () => syncAlarms();
    if (typeof window !== 'undefined') window.addEventListener('focus', onFocus);
    return () => {
      subscription.remove();
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus);
    };
  }, []);

  const [customAlarms, setCustomAlarms] = useState<CustomAlarm[]>([]);
  const [presetStates, setPresetStates] = useState<Record<string, AlarmState>>({});
  const [hourlyChimesEnabled, setHourlyChimesEnabled] = useState<boolean>(true);
  const [addOpen, setAddOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [editingToneAlarmId, setEditingToneAlarmId] = useState<string | null>(null);

  // Active audio playback state
  const [activePlayingSlot, setActivePlayingSlot] = useState<string | null>(null);

  // ── Load from local storage on mount ──────────────────────────────────
  useEffect(() => {
    const savedAlarms = getJSON<CustomAlarm[]>(STORAGE_KEYS.alarms, DEFAULT_CUSTOM_ALARMS);
    const savedChimes = getJSON<boolean>(STORAGE_KEYS.hourlyChimes, true);
    setCustomAlarms(savedAlarms);
    setHourlyChimesEnabled(savedChimes);

    const map = getJSON<Record<string, AlarmState>>(TRAFFIC_PRESET_STORAGE_KEY, {});
    savedAlarms.forEach((r) => {
      map[`custom:${r.id}`] = {
        enabled: r.enabled,
        snoozeEnabled: r.snoozeEnabled,
        repeatDays: r.repeatDays,
        loopRingtone: r.loopRingtone,
        ringtoneKey: r.ringtoneKey,
        toneType: r.toneType,
        toneUri: r.toneUri,
        toneTitle: r.toneTitle,
      };
    });
    setPresetStates(map);

    // Subscribe to traffic audio engine playback state
    const unsubscribe = subscribeTrafficPlayback((slotKey) => {
      setActivePlayingSlot(slotKey);
    });

    return () => {
      unsubscribe();
      stopTrafficAudio();
      stopCurrentAlarmPlayback();
      stopToneAudioPreview();
    };
  }, []);

  // ── Toggle Audio Preview for a Slot ──────────────────────────────────
  const handleTogglePreview = async (slotKey: string) => {
    if (activePlayingSlot === slotKey) {
      await stopTrafficAudio();
      await stopCurrentAlarmPlayback();
      await stopToneAudioPreview();
      setActivePlayingSlot(null);
      toast.show('Playback stopped', 'info');
    } else {
      const custom = customAlarms.find((c) => c.id === slotKey);
      if (custom && isAndroidTrafficApp()) {
        await stopTrafficAudio();
        await stopCurrentAlarmPlayback();
        const playing = await playToneAudioPreview(
          custom.toneType || 'bundled',
          custom.toneUri,
          custom.toneUri ? undefined : timeToTrafficSlotKey(custom.time)
        );
        if (playing) {
          setActivePlayingSlot(slotKey);
          toast.show(`Playing ${custom.toneTitle || 'Custom Tone'}`, 'info');
        }
        return;
      }
      const slot = TRAFFIC_TRACK_SLOTS.find((s) => s.slotKey === slotKey || s.time === slotKey);
      const title = slot?.titleEn || 'Track';
      toast.show(`Playing ${title} (Non-repeating)`, 'info');
      await playTrafficSlot(slotKey);
    }
  };

  // ── Hourly Chimes Toggle ──────────────────────────────────────────────
  const toggleHourlyChimes = () => {
    const next = !hourlyChimesEnabled;
    setHourlyChimesEnabled(next);
    setJSON(STORAGE_KEYS.hourlyChimes, next);
    syncAlarms();
    toast.show(next ? 'Hourly chimes enabled' : 'Hourly chimes muted', 'info');
  };

  const getAlarmState = (key: string): AlarmState => presetStates[key] ?? DEFAULT_ALARM_STATE;

  const updateAlarmState = (key: string, patch: Partial<AlarmState>) => {
    const nextState = { ...getAlarmState(key), ...patch };
    setPresetStates((prev) => ({ ...prev, [key]: nextState }));

    if (key.startsWith('custom:')) {
      const id = key.replace('custom:', '');
      const updated = customAlarms.map((a) => (a.id === id ? { ...a, ...nextState } : a));
      setCustomAlarms(updated);
      setJSON(STORAGE_KEYS.alarms, updated);
    } else {
      const saved = getJSON<Record<string, AlarmState>>(TRAFFIC_PRESET_STORAGE_KEY, {});
      setJSON(TRAFFIC_PRESET_STORAGE_KEY, { ...saved, [key]: nextState });
    }

    syncAlarms();
  };

  const addCustomAlarm = (time: string, label: string, state: AlarmState) => {
    const newAlarm: CustomAlarm = {
      id: `al_${Date.now()}`,
      time,
      label: label || 'Custom Alarm',
      enabled: state.enabled,
      snoozeEnabled: state.snoozeEnabled,
      repeatDays: state.repeatDays,
      loopRingtone: state.loopRingtone,
      ringtoneKey: state.ringtoneKey,
      toneType: state.toneType || 'bundled',
      toneUri: state.toneUri || '',
      toneTitle: state.toneTitle || 'Traffic Control Hourly Chime',
    };
    const next = [...customAlarms, newAlarm].sort((a, b) => a.time.localeCompare(b.time));
    setCustomAlarms(next);
    setJSON(STORAGE_KEYS.alarms, next);
    setPresetStates((prev) => ({ ...prev, [`custom:${newAlarm.id}`]: state }));
    syncAlarms();
    toast.show('Custom alarm created', 'success');
  };

  const handleSelectToneForExistingAlarm = (tone: ToneSelection) => {
    if (editingToneAlarmId) {
      updateAlarmState(`custom:${editingToneAlarmId}`, {
        toneType: tone.toneType,
        toneUri: tone.toneUri,
        toneTitle: tone.toneTitle,
      });
      toast.show(`Tone changed: ${tone.toneTitle || 'Selected Tone'}`, 'success');
      setEditingToneAlarmId(null);
    }
  };

  const deleteCustomAlarm = (id: string) => {
    const next = customAlarms.filter((a) => a.id !== id);
    setCustomAlarms(next);
    setJSON(STORAGE_KEYS.alarms, next);
    syncAlarms();
    toast.show('Alarm removed', 'info');
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {isAndroidTrafficApp() && scheduleError && (
          <View style={styles.errorAlertBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <AlertTriangle color="#dc2626" size={18} strokeWidth={2.2} />
              <Text style={styles.errorAlertTitle}>Alarm Scheduling Issue</Text>
            </View>
            <Text style={styles.errorAlertText}>{scheduleError}</Text>
            <Pressable
              style={({ pressed }) => [styles.errorRetryBtn, pressed && styles.btnPressed]}
              onPress={() => syncAlarms()}
            >
              <Repeat color="#991b1b" size={14} strokeWidth={2.2} />
              <Text style={styles.errorRetryText}>Retry Scheduling (വീണ്ടും ശ്രമിക്കുക)</Text>
            </Pressable>
          </View>
        )}

        {isAndroidTrafficApp() && (
          <View style={styles.permissionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
              <Text style={styles.permissionText}>{alarmStatus}</Text>
              <Pressable
                style={({ pressed }) => [styles.diagnosticsPillBtn, pressed && styles.btnPressed]}
                onPress={handleOpenDiagnostics}
              >
                <Activity color="#991b1b" size={14} strokeWidth={2.2} />
                <Text style={styles.diagnosticsPillText}>Diagnostics</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <Pressable onPress={async () => {
                try {
                  await TrafficControlNative.requestExactAlarmPermission();
                  await syncAlarms();
                } catch { await refreshAlarmStatus(); }
              }}>
                <Text style={styles.permissionLink}>Set up alarm permission</Text>
              </Pressable>
              <Pressable onPress={handleOpenDiagnostics}>
                <Text style={[styles.permissionLink, { color: COLORS.neutral[700] }]}>View Status & Logs</Text>
              </Pressable>
            </View>
          </View>
        )}
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <Clock color="#ffffff" size={22} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Traffic Control</Text>
            <Text style={styles.headerSub}>Scheduled meditation alarms & hourly chimes</Text>
          </View>
        </View>

        {/* ── 1. Hourly Chimes Master Control ───────────────────────── */}
        <View style={styles.chimesCard}>
          <View style={styles.chimesTopRow}>
            <View style={styles.chimesLeft}>
              <View style={[styles.chimesIconWrap, hourlyChimesEnabled && styles.chimesIconActive]}>
                {hourlyChimesEnabled ? (
                  <Volume2 color={COLORS.primary[700]} size={20} strokeWidth={2.2} />
                ) : (
                  <VolumeX color={COLORS.neutral[400]} size={20} strokeWidth={2.2} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chimesTitle}>Hourly Chimes</Text>
                <Text style={styles.chimesSub}>
                  {hourlyChimesEnabled
                    ? 'Active: Plays dedicated chime song on non-traffic hours'
                    : 'Muted: No hourly chimes'}
                </Text>
              </View>
            </View>
            <Toggle value={hourlyChimesEnabled} onChange={toggleHourlyChimes} />
          </View>

          {/* Dedicated Hourly Chime Audio Preview Button */}
          <View style={styles.chimePreviewRow}>
            <Pressable
              style={({ pressed }) => [
                styles.previewChimeBtn,
                activePlayingSlot === 'hourly_chime' && styles.previewChimeBtnActive,
                pressed && styles.btnPressed,
              ]}
              onPress={() => handleTogglePreview('hourly_chime')}
            >
              {activePlayingSlot === 'hourly_chime' ? (
                <Square color="#ffffff" size={14} fill="#ffffff" strokeWidth={2} />
              ) : (
                <Play color={COLORS.primary[700]} size={14} fill={COLORS.primary[700]} strokeWidth={2} />
              )}
              <Text
                style={[
                  styles.previewChimeBtnText,
                  activePlayingSlot === 'hourly_chime' && styles.previewChimeBtnTextActive,
                ]}
              >
                {activePlayingSlot === 'hourly_chime' ? 'Stop Chime Song' : 'Listen to Hourly Chime Song'}
              </Text>
            </Pressable>
          </View>

          {/* Quick Hourly Schedule Badges (Exclusive Non-Traffic Hours) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
            <View style={styles.hourlyRow}>
              {HOURLY_TRAFFIC_TIMES.map((t) => (
                <View key={t} style={[styles.hourlyBadge, hourlyChimesEnabled && styles.hourlyBadgeOn]}>
                  <Text style={[styles.hourlyBadgeText, hourlyChimesEnabled && styles.hourlyBadgeTextOn]}>
                    {formatTime12h(t)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* ── 2. Preset Daily Traffic Control Schedule ───────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>DAILY TRAFFIC SCHEDULE</Text>
          <Text style={styles.sectionSubHeading}>Plays track once · Auto-stops</Text>
        </View>

        {PRESET_ALARMS.map((a) => {
          const slotKey = a.slotKey || a.time;
          const key = `preset:${a.time}`;
          const state = getAlarmState(key);
          const isPlayingThis = activePlayingSlot === slotKey || activePlayingSlot === a.time;

          return (
            <PresetAlarmCard
              key={key}
              slotKey={slotKey}
              time={a.time}
              label={a.label}
              labelMl={a.labelMl}
              enabled={state.enabled}
              isPlaying={isPlayingThis}
              onTogglePreview={() => handleTogglePreview(slotKey)}
              onEnabledChange={(v) => updateAlarmState(key, { enabled: v })}
            />
          );
        })}

        {/* ── 3. Custom Alarms ─────────────────────────────────────── */}
        <Text style={[styles.sectionHeading, { marginTop: SPACING.xl }]}>CUSTOM ALARMS</Text>
        {customAlarms.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell color={COLORS.neutral[300]} size={28} strokeWidth={2} />
            <Text style={styles.emptyText}>No custom alarms added</Text>
            <Text style={styles.emptySub}>Tap below to create your custom meditation alarm</Text>
          </View>
        ) : (
          customAlarms.map((row) => {
            const key = `custom:${row.id}`;
            const state = getAlarmState(key);
            const isExpanded = expandedKey === key;
            const isPlayingThis = activePlayingSlot === row.id || activePlayingSlot === row.time;

            return (
              <CustomAlarmCard
                key={key}
                slotKey={row.id}
                time={row.time}
                label={row.label}
                state={state}
                expanded={isExpanded}
                isPlaying={isPlayingThis}
                onTogglePreview={() => handleTogglePreview(row.id)}
                onDelete={() => deleteCustomAlarm(row.id)}
                onToggleExpand={() => setExpandedKey(isExpanded ? null : key)}
                onEnabledChange={(v) => updateAlarmState(key, { enabled: v })}
                onSnoozeChange={(v) => updateAlarmState(key, { snoozeEnabled: v })}
                onRepeatChange={(d) => updateAlarmState(key, { repeatDays: d })}
                onChangeTone={() => setEditingToneAlarmId(row.id)}
              />
            );
          })
        )}

        <Pressable
          style={({ pressed }) => [styles.addAlarmBtn, pressed && styles.addAlarmPressed]}
          onPress={() => setAddOpen(true)}
        >
          <Plus color={COLORS.primary[600]} size={20} strokeWidth={2.2} />
          <Text style={styles.addAlarmText}>Add Custom Alarm</Text>
        </Pressable>

        <View style={{ height: SPACING['3xl'] }} />
      </ScrollView>

      {/* Add Custom Alarm Modal with Snooze & Repeat Days */}
      <AddAlarmModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(time, label, state) => {
          addCustomAlarm(time, label, state);
          setAddOpen(false);
        }}
      />

      <DiagnosticsModal
        visible={diagnosticsVisible}
        onClose={() => setDiagnosticsVisible(false)}
        data={diagnosticsData}
        loading={diagnosticsLoading}
        reportText={reportText}
        onRefresh={handleOpenDiagnostics}
        onShare={handleShareReport}
        onCopy={handleCopyReport}
      />

      {/* Tone Picker Modal for editing an existing custom alarm */}
      {editingToneAlarmId && (
        <TonePickerModal
          visible={!!editingToneAlarmId}
          currentTone={{
            toneType: getAlarmState(`custom:${editingToneAlarmId}`).toneType || 'bundled',
            toneUri: getAlarmState(`custom:${editingToneAlarmId}`).toneUri || '',
            toneTitle: getAlarmState(`custom:${editingToneAlarmId}`).toneTitle || 'Traffic Control Hourly Chime',
          }}
          onClose={() => setEditingToneAlarmId(null)}
          onSelectTone={handleSelectToneForExistingAlarm}
        />
      )}
    </View>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const pos = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(pos, { toValue: value ? 1 : 0, useNativeDriver: true, friction: 6 }).start();
  }, [value, pos]);

  return (
    <Pressable
      style={[styles.toggle, value && styles.toggleOn]}
      onPress={() => onChange(!value)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View
        style={[
          styles.toggleKnob,
          {
            transform: [
              {
                translateX: pos.interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, 22],
                }),
              },
            ],
          },
        ]}
      />
    </Pressable>
  );
}

/**
 * Clean, streamlined Preset Alarm Card for mandatory daily spiritual schedule
 * No Snooze, No Repeat Days — Clean Master On/Off Switch & Preview Button
 */
function PresetAlarmCard({
  slotKey,
  time,
  label,
  labelMl,
  enabled,
  isPlaying,
  onTogglePreview,
  onEnabledChange,
}: {
  slotKey: string;
  time: string;
  label: string;
  labelMl?: string;
  enabled: boolean;
  isPlaying?: boolean;
  onTogglePreview: () => void;
  onEnabledChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.presetCard, !enabled && styles.alarmCardOff, isPlaying && styles.alarmCardPlaying]}>
      <View style={styles.alarmMain}>
        {/* Play/Stop Audio Preview Button */}
        <Pressable
          style={({ pressed }) => [
            styles.playPreviewBtn,
            isPlaying && styles.playPreviewBtnActive,
            pressed && styles.btnPressed,
          ]}
          onPress={onTogglePreview}
          hitSlop={6}
          accessibilityLabel={isPlaying ? 'Stop audio' : 'Play audio preview'}
        >
          {isPlaying ? (
            <Square color="#ffffff" size={16} fill="#ffffff" strokeWidth={2} />
          ) : (
            <Play color={COLORS.primary[700]} size={16} fill={COLORS.primary[700]} strokeWidth={2} />
          )}
        </Pressable>

        <View style={{ flex: 1 }}>
          <View style={styles.alarmTimeRow}>
            <Text style={[styles.alarmTime, !enabled && styles.alarmTimeOff]}>
              {formatTime12h(time)}
            </Text>
            {isPlaying && (
              <View style={styles.playingBadge}>
                <Text style={styles.playingBadgeText}>PLAYING</Text>
              </View>
            )}
          </View>
          <Text style={styles.alarmLabel} numberOfLines={1}>
            {label}
            {labelMl ? ` · ${labelMl}` : ''}
          </Text>
        </View>

        <Toggle value={enabled} onChange={onEnabledChange} />
      </View>
    </View>
  );
}

/**
 * Custom Alarm Card for user-created meditation reminders
 * Supports Snooze toggle, Repeat days, and Delete
 */
function CustomAlarmCard({
  slotKey,
  time,
  label,
  state,
  expanded,
  isPlaying,
  onTogglePreview,
  onDelete,
  onToggleExpand,
  onEnabledChange,
  onSnoozeChange,
  onRepeatChange,
  onChangeTone,
}: {
  slotKey: string;
  time: string;
  label: string;
  state: AlarmState;
  expanded: boolean;
  isPlaying?: boolean;
  onTogglePreview: () => void;
  onDelete: () => void;
  onToggleExpand: () => void;
  onEnabledChange: (v: boolean) => void;
  onSnoozeChange: (v: boolean) => void;
  onRepeatChange: (d: number[] | null) => void;
  onChangeTone: () => void;
}) {
  return (
    <View style={[styles.alarmCard, !state.enabled && styles.alarmCardOff, isPlaying && styles.alarmCardPlaying]}>
      <View style={styles.alarmMain}>
        {/* Play/Stop Audio Preview Button */}
        <Pressable
          style={({ pressed }) => [
            styles.playPreviewBtn,
            isPlaying && styles.playPreviewBtnActive,
            pressed && styles.btnPressed,
          ]}
          onPress={onTogglePreview}
          hitSlop={6}
          accessibilityLabel={isPlaying ? 'Stop audio' : 'Play audio preview'}
        >
          {isPlaying ? (
            <Square color="#ffffff" size={16} fill="#ffffff" strokeWidth={2} />
          ) : (
            <Play color={COLORS.primary[700]} size={16} fill={COLORS.primary[700]} strokeWidth={2} />
          )}
        </Pressable>

        <Pressable style={{ flex: 1 }} onPress={onToggleExpand}>
          <View style={styles.alarmTimeRow}>
            <Text style={[styles.alarmTime, !state.enabled && styles.alarmTimeOff]}>
              {formatTime12h(time)}
            </Text>
            {isPlaying && (
              <View style={styles.playingBadge}>
                <Text style={styles.playingBadgeText}>PLAYING</Text>
              </View>
            )}
          </View>
          <Text style={styles.alarmLabel} numberOfLines={1}>
            {label}
          </Text>
          {state.repeatDays && state.repeatDays.length > 0 && (
            <Text style={styles.alarmRepeat}>
              {state.repeatDays.map((d) => WEEKDAYS[d][0]).join(' ')}
            </Text>
          )}
        </Pressable>

        <Toggle value={state.enabled} onChange={onEnabledChange} />
      </View>

      {expanded && (
        <View style={styles.alarmExpanded}>
          {/* Alarm Tone Section */}
          <View style={styles.expandRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={styles.expandLeft}>
                <Music color={COLORS.neutral[500]} size={16} strokeWidth={2} />
                <Text style={styles.expandLabel}>Alarm Tone</Text>
              </View>
              <Text style={styles.expandToneTitle} numberOfLines={1}>
                {state.toneTitle || 'Traffic Control Hourly Chime'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.changeToneBtn, pressed && styles.btnPressed]}
              onPress={onChangeTone}
            >
              <Text style={styles.changeToneBtnText}>Change Tone</Text>
            </Pressable>
          </View>

          <View style={styles.expandRow}>
            <View style={styles.expandLeft}>
              <Clock color={COLORS.neutral[500]} size={16} strokeWidth={2} />
              <Text style={styles.expandLabel}>Snooze</Text>
            </View>
            <Toggle value={state.snoozeEnabled} onChange={onSnoozeChange} />
          </View>

          <View style={styles.expandRowCol}>
            <View style={styles.expandLeft}>
              <Repeat color={COLORS.neutral[500]} size={16} strokeWidth={2} />
              <Text style={styles.expandLabel}>Repeat days</Text>
            </View>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((d, i) => {
                const active = state.repeatDays?.includes(i) ?? false;
                return (
                  <Pressable
                    key={d}
                    style={[styles.weekBtn, active && styles.weekBtnActive]}
                    onPress={() => {
                      const cur = state.repeatDays ?? [];
                      const next = active ? cur.filter((x) => x !== i) : [...cur, i].sort();
                      onRepeatChange(next.length === 0 ? null : next);
                    }}
                  >
                    <Text style={[styles.weekBtnText, active && styles.weekBtnTextActive]}>
                      {d[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable style={styles.deleteRow} onPress={onDelete}>
            <Trash2 color={COLORS.error[500]} size={16} strokeWidth={2} />
            <Text style={styles.deleteText}>Delete custom alarm</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.expandChevron} onPress={onToggleExpand} hitSlop={10}>
        <ChevronDown
          color={COLORS.neutral[400]}
          size={18}
          strokeWidth={2.2}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>
    </View>
  );
}

/**
 * Modal to pick alarm tone:
 * 1. Bundled BK spiritual tracks/chimes
 * 2. System alarm ringtones
 * 3. User-imported audio file from device storage (copied into device-protected storage)
 */
function TonePickerModal({
  visible,
  currentTone,
  onClose,
  onSelectTone,
}: {
  visible: boolean;
  currentTone?: ToneSelection;
  onClose: () => void;
  onSelectTone: (tone: ToneSelection) => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<'bundled' | 'system' | 'file'>('bundled');
  const [selected, setSelected] = useState<ToneSelection>(
    currentTone || { toneType: 'bundled', toneUri: '', toneTitle: 'Traffic Control Hourly Chime' }
  );
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [systemTones, setSystemTones] = useState<SystemRingtone[]>([]);
  const [loadingSystemTones, setLoadingSystemTones] = useState(false);
  const [importedFile, setImportedFile] = useState<ToneSelection | null>(null);
  const [pickingFile, setPickingFile] = useState(false);

  useEffect(() => {
    if (visible) {
      if (currentTone) {
        setSelected(currentTone);
        if (currentTone.toneType === 'file') {
          setTab('file');
          setImportedFile(currentTone);
        } else if (currentTone.toneType === 'system') {
          setTab('system');
        } else {
          setTab('bundled');
        }
      }
    } else {
      stopToneAudioPreview();
      setPlayingKey(null);
    }
  }, [visible, currentTone]);

  useEffect(() => {
    if (visible && tab === 'system' && systemTones.length === 0 && !loadingSystemTones) {
      setLoadingSystemTones(true);
      getSystemAlarmTones()
        .then((tones) => {
          setSystemTones(tones);
          setLoadingSystemTones(false);
        })
        .catch(() => setLoadingSystemTones(false));
    }
  }, [visible, tab]);

  const handleTogglePreview = async (type: 'bundled' | 'system' | 'file', uri?: string) => {
    const key = `${type}:${uri || 'default'}`;
    if (playingKey === key) {
      await stopToneAudioPreview();
      setPlayingKey(null);
    } else {
      await stopToneAudioPreview();
      const started = await playToneAudioPreview(type, uri);
      if (started) {
        setPlayingKey(key);
      }
    }
  };

  const handlePickFile = async () => {
    try {
      setPickingFile(true);
      const res = await pickCustomAudioFile();
      setPickingFile(false);
      if (!res.cancelled && res.toneUri) {
        const tone: ToneSelection = {
          toneType: 'file',
          toneUri: res.toneUri,
          toneTitle: res.toneTitle || 'Custom Audio File',
        };
        setImportedFile(tone);
        setSelected(tone);
        toast.show('Audio imported to secure storage', 'success');
      }
    } catch (e: any) {
      setPickingFile(false);
      toast.show(e?.message || 'Failed to select audio file', 'error');
    }
  };

  const handleApply = () => {
    stopToneAudioPreview();
    setPlayingKey(null);
    onSelectTone(selected);
    onClose();
  };

  const handleClose = () => {
    stopToneAudioPreview();
    setPlayingKey(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.toneModalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Alarm Tone</Text>
            <Pressable style={styles.modalClose} onPress={handleClose} hitSlop={12}>
              <X color={COLORS.neutral[500]} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabBtn, tab === 'bundled' && styles.tabBtnActive]}
              onPress={() => setTab('bundled')}
            >
              <Text style={[styles.tabBtnText, tab === 'bundled' && styles.tabBtnTextActive]}>
                🕊️ BK Songs
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, tab === 'system' && styles.tabBtnActive]}
              onPress={() => setTab('system')}
            >
              <Text style={[styles.tabBtnText, tab === 'system' && styles.tabBtnTextActive]}>
                📱 Phone Tones
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, tab === 'file' && styles.tabBtnActive]}
              onPress={() => setTab('file')}
            >
              <Text style={[styles.tabBtnText, tab === 'file' && styles.tabBtnTextActive]}>
                📁 Choose File
              </Text>
            </Pressable>
          </View>

          {/* Tab 1: Bundled Spiritual Songs */}
          {tab === 'bundled' && (
            <ScrollView style={styles.toneList} showsVerticalScrollIndicator={false}>
              {BUNDLED_TONES.map((t) => {
                const isSelected =
                  selected.toneType === 'bundled' &&
                  (selected.toneUri === t.key || (!selected.toneUri && t.key === 'hourly_chime'));
                const isPlaying = playingKey === `bundled:${t.key}`;

                return (
                  <Pressable
                    key={t.key}
                    style={[styles.toneItem, isSelected && styles.toneItemActive]}
                    onPress={() =>
                      setSelected({
                        toneType: 'bundled',
                        toneUri: t.key,
                        toneTitle: t.title,
                      })
                    }
                  >
                    <View style={[styles.toneRadio, isSelected && styles.toneRadioActive]}>
                      {isSelected && <View style={styles.toneRadioInner} />}
                    </View>

                    <View style={styles.toneInfo}>
                      <Text
                        style={[styles.toneTitle, isSelected && styles.toneTitleActive]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                      <Text style={styles.toneSubtitle} numberOfLines={1}>
                        {t.subtitle}
                      </Text>
                    </View>

                    <Pressable
                      style={[styles.tonePreviewBtn, isPlaying && styles.tonePreviewBtnActive]}
                      onPress={() => handleTogglePreview('bundled', t.key)}
                      hitSlop={8}
                    >
                      {isPlaying ? (
                        <Square color="#ffffff" size={14} fill="#ffffff" strokeWidth={2} />
                      ) : (
                        <Play
                          color={COLORS.primary[700]}
                          size={14}
                          fill={COLORS.primary[700]}
                          strokeWidth={2}
                        />
                      )}
                    </Pressable>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Tab 2: Device System Alarm Tones */}
          {tab === 'system' && (
            <ScrollView style={styles.toneList} showsVerticalScrollIndicator={false}>
              {loadingSystemTones ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={COLORS.primary[600]} />
                  <Text style={[styles.toneSubtitle, { marginTop: 8 }]}>Loading system tones…</Text>
                </View>
              ) : systemTones.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={styles.emptyText}>No device alarm ringtones found</Text>
                </View>
              ) : (
                systemTones.map((st) => {
                  const isSelected = selected.toneType === 'system' && selected.toneUri === st.uri;
                  const isPlaying = playingKey === `system:${st.uri}`;

                  return (
                    <Pressable
                      key={st.uri}
                      style={[styles.toneItem, isSelected && styles.toneItemActive]}
                      onPress={() =>
                        setSelected({
                          toneType: 'system',
                          toneUri: st.uri,
                          toneTitle: st.title,
                        })
                      }
                    >
                      <View style={[styles.toneRadio, isSelected && styles.toneRadioActive]}>
                        {isSelected && <View style={styles.toneRadioInner} />}
                      </View>

                      <View style={styles.toneInfo}>
                        <Text
                          style={[styles.toneTitle, isSelected && styles.toneTitleActive]}
                          numberOfLines={1}
                        >
                          {st.title}
                        </Text>
                        <Text style={styles.toneSubtitle}>Device Alarm</Text>
                      </View>

                      <Pressable
                        style={[styles.tonePreviewBtn, isPlaying && styles.tonePreviewBtnActive]}
                        onPress={() => handleTogglePreview('system', st.uri)}
                        hitSlop={8}
                      >
                        {isPlaying ? (
                          <Square color="#ffffff" size={14} fill="#ffffff" strokeWidth={2} />
                        ) : (
                          <Play
                            color={COLORS.primary[700]}
                            size={14}
                            fill={COLORS.primary[700]}
                            strokeWidth={2}
                          />
                        )}
                      </Pressable>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Tab 3: Custom File Picker */}
          {tab === 'file' && (
            <View style={{ paddingVertical: SPACING.sm }}>
              <View style={[styles.filePickCard, importedFile && styles.filePickCardActive]}>
                <FolderOpen color={COLORS.primary[600]} size={36} strokeWidth={1.8} />
                <Pressable
                  style={({ pressed }) => [styles.filePickBtn, pressed && styles.btnPressed]}
                  onPress={handlePickFile}
                  disabled={pickingFile}
                >
                  {pickingFile ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Music color="#ffffff" size={16} strokeWidth={2} />
                      <Text style={styles.filePickBtnText}>Select Audio File from Phone</Text>
                    </>
                  )}
                </Pressable>
                <Text style={styles.filePickDesc}>
                  Supports MP3 and WAV. Audio is saved to app storage so alarms play reliably even after reboot.
                </Text>
              </View>

              {importedFile && (
                <Pressable
                  style={[styles.toneItem, styles.toneItemActive]}
                  onPress={() => setSelected(importedFile)}
                >
                  <View style={[styles.toneRadio, styles.toneRadioActive]}>
                    <View style={styles.toneRadioInner} />
                  </View>

                  <View style={styles.toneInfo}>
                    <Text style={[styles.toneTitle, styles.toneTitleActive]} numberOfLines={1}>
                      {importedFile.toneTitle}
                    </Text>
                    <Text style={styles.toneSubtitle}>Custom Phone Audio</Text>
                  </View>

                  <Pressable
                    style={[
                      styles.tonePreviewBtn,
                      playingKey === `file:${importedFile.toneUri}` && styles.tonePreviewBtnActive,
                    ]}
                    onPress={() => handleTogglePreview('file', importedFile.toneUri)}
                    hitSlop={8}
                  >
                    {playingKey === `file:${importedFile.toneUri}` ? (
                      <Square color="#ffffff" size={14} fill="#ffffff" strokeWidth={2} />
                    ) : (
                      <Play
                        color={COLORS.primary[700]}
                        size={14}
                        fill={COLORS.primary[700]}
                        strokeWidth={2}
                      />
                    )}
                  </Pressable>
                </Pressable>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.toneModalActions}>
            <Pressable style={styles.toneModalCancelBtn} onPress={handleClose}>
              <Text style={styles.toneModalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.toneModalApplyBtn} onPress={handleApply}>
              <Text style={styles.toneModalApplyText}>Select Tone</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Add Custom Alarm Modal featuring Custom Time, Label, Snooze, Repeat Days, and Tone Selection
 */
function AddAlarmModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (time: string, label: string, state: AlarmState) => void;
}) {
  const [hours, setHours] = useState('06');
  const [minutes, setMinutes] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [label, setLabel] = useState('');
  const [snoozeEnabled, setSnoozeEnabled] = useState(true);
  const [repeatDays, setRepeatDays] = useState<number[] | null>(null);
  const [selectedTone, setSelectedTone] = useState<ToneSelection>({
    toneType: 'bundled',
    toneUri: '',
    toneTitle: 'Traffic Control Hourly Chime',
  });
  const [tonePickerOpen, setTonePickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setHours('06');
      setMinutes('00');
      setPeriod('AM');
      setLabel('');
      setSnoozeEnabled(true);
      setRepeatDays(null);
      setSelectedTone({
        toneType: 'bundled',
        toneUri: '',
        toneTitle: 'Traffic Control Hourly Chime',
      });
      setTonePickerOpen(false);
    }
  }, [visible]);

  const computeTime = (): string => {
    let h = Number(hours);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${minutes}`;
  };

  const validTime = () => {
    const h = Number(hours);
    const m = Number(minutes);
    return h >= 1 && h <= 12 && m >= 0 && m <= 59;
  };

  const handleSave = () => {
    if (!validTime()) return;
    onAdd(computeTime(), label.trim(), {
      enabled: true,
      snoozeEnabled,
      repeatDays,
      loopRingtone: false,
      ringtoneKey: 'default',
      toneType: selectedTone.toneType,
      toneUri: selectedTone.toneUri,
      toneTitle: selectedTone.toneTitle,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Custom Traffic Alarm</Text>
            <Pressable style={styles.modalClose} onPress={onClose} hitSlop={12}>
              <X color={COLORS.neutral[500]} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Time Picker */}
          <Text style={styles.modalLabel}>Time</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeInputWrap}>
              <TextInput
                style={styles.timeInput}
                keyboardType="number-pad"
                value={hours}
                onChangeText={(t) => setHours(t.replace(/[^0-9]/g, '').slice(0, 2))}
                maxLength={2}
              />
              <Text style={styles.timeColon}>:</Text>
              <TextInput
                style={styles.timeInput}
                keyboardType="number-pad"
                value={minutes}
                onChangeText={(t) => setMinutes(t.replace(/[^0-9]/g, '').slice(0, 2))}
                maxLength={2}
              />
            </View>
            <View style={styles.periodRow}>
              {(['AM', 'PM'] as const).map((p) => (
                <Pressable
                  key={p}
                  style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Label */}
          <Text style={styles.modalLabel}>Label</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Afternoon Traffic Control"
            placeholderTextColor={COLORS.neutral[400]}
            value={label}
            onChangeText={setLabel}
          />

          {/* Alarm Tone Setting */}
          <View style={styles.modalSettingRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={styles.expandLeft}>
                <Music color={COLORS.neutral[600]} size={16} strokeWidth={2} />
                <Text style={styles.modalSettingLabel}>Alarm Tone</Text>
              </View>
              <Text style={styles.modalToneSub} numberOfLines={1}>
                {selectedTone.toneTitle || 'Traffic Control Hourly Chime'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.changeToneBtn, pressed && styles.btnPressed]}
              onPress={() => setTonePickerOpen(true)}
            >
              <Text style={styles.changeToneBtnText}>Change Tone</Text>
            </Pressable>
          </View>

          {/* Snooze Setting for Custom Alarm */}
          <View style={styles.modalSettingRow}>
            <View style={styles.expandLeft}>
              <Clock color={COLORS.neutral[600]} size={16} strokeWidth={2} />
              <Text style={styles.modalSettingLabel}>Enable Snooze</Text>
            </View>
            <Toggle value={snoozeEnabled} onChange={setSnoozeEnabled} />
          </View>

          {/* Day Recurrence for Custom Alarm */}
          <View style={styles.modalSettingCol}>
            <View style={styles.expandLeft}>
              <Repeat color={COLORS.neutral[600]} size={16} strokeWidth={2} />
              <Text style={styles.modalSettingLabel}>Repeat Days</Text>
            </View>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((d, i) => {
                const active = repeatDays?.includes(i) ?? false;
                return (
                  <Pressable
                    key={d}
                    style={[styles.modalWeekBtn, active && styles.modalWeekBtnActive]}
                    onPress={() => {
                      const cur = repeatDays ?? [];
                      const next = active ? cur.filter((x) => x !== i) : [...cur, i].sort();
                      setRepeatDays(next.length === 0 ? null : next);
                    }}
                  >
                    <Text style={[styles.modalWeekBtnText, active && styles.modalWeekBtnTextActive]}>
                      {d[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.modalAddBtn,
              pressed && styles.modalAddBtnPressed,
              !validTime() && styles.modalAddBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!validTime()}
          >
            <Plus color="#ffffff" size={18} strokeWidth={2.4} />
            <Text style={styles.modalAddBtnText}>Save Alarm</Text>
          </Pressable>

          <TonePickerModal
            visible={tonePickerOpen}
            currentTone={selectedTone}
            onClose={() => setTonePickerOpen(false)}
            onSelectTone={(t) => {
              setSelectedTone(t);
              setTonePickerOpen(false);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function DiagnosticsModal({
  visible,
  onClose,
  data,
  loading,
  reportText,
  onRefresh,
  onShare,
  onCopy,
}: {
  visible: boolean;
  onClose: () => void;
  data: TrafficDiagnosticsData | null;
  loading: boolean;
  reportText: string;
  onRefresh: () => void;
  onShare: () => void;
  onCopy: () => void;
}) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return { bg: '#dcfce7', text: '#15803d', label: 'COMPLETED' };
      case 'PLAYING':
        return { bg: '#dbeafe', text: '#1d4ed8', label: 'PLAYING' };
      case 'SCHEDULED':
        return { bg: '#f3e8ff', text: '#6d28d9', label: 'SCHEDULED' };
      case 'PAUSED_FOR_FOCUS':
        return { bg: '#fef3c7', text: '#b45309', label: 'PAUSED (FOCUS)' };
      case 'RETRYING':
        return { bg: '#ffedd5', text: '#c2410c', label: 'RETRYING' };
      case 'FAILED':
        return { bg: '#fee2e2', text: '#b91c1c', label: 'FAILED' };
      case 'MISSED_STALE':
        return { bg: '#f1f5f9', text: '#475569', label: 'MISSED (STALE)' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', label: status || 'PENDING' };
    }
  };

  const dev = data?.device;
  const slots = data?.slots || [];
  const events = data?.events || [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.diagModalOverlay}>
        <View style={styles.diagModalSheet}>
          <View style={styles.diagModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.diagModalTitle}>Traffic Control Diagnostics</Text>
              <Text style={styles.diagModalSub}>Native Android Alarm & Playback Audit</Text>
            </View>
            <Pressable style={styles.modalClose} onPress={onClose}>
              <X color={COLORS.neutral[500]} size={18} strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Action Bar */}
          <View style={styles.diagActionBar}>
            <Pressable
              style={({ pressed }) => [styles.diagActionBtn, styles.diagActionCopy, pressed && styles.btnPressed]}
              onPress={onCopy}
            >
              <Copy color="#ffffff" size={14} strokeWidth={2.2} />
              <Text style={styles.diagActionTextWhite}>Copy Report</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.diagActionBtn, styles.diagActionShare, pressed && styles.btnPressed]}
              onPress={onShare}
            >
              <Share2 color="#ffffff" size={14} strokeWidth={2.2} />
              <Text style={styles.diagActionTextWhite}>Share Report</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.diagActionBtn, styles.diagActionRefresh, pressed && styles.btnPressed]}
              onPress={onRefresh}
            >
              <RefreshCw color={COLORS.neutral[700]} size={14} strokeWidth={2.2} />
              <Text style={styles.diagActionTextDark}>Refresh</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.diagScroll} showsVerticalScrollIndicator={false}>
            {/* Device Status Card */}
            {dev && (
              <View style={styles.diagDeviceCard}>
                <Text style={styles.diagSectionHeader}>DEVICE & PERMISSION HEALTH</Text>
                <View style={styles.diagGrid}>
                  <View style={styles.diagGridItem}>
                    <Text style={styles.diagGridLabel}>Exact Alarms:</Text>
                    <Text style={[styles.diagGridVal, { color: dev.exactAlarmsAllowed ? '#15803d' : '#b91c1c' }]}>
                      {dev.exactAlarmsAllowed ? '✓ ALLOWED' : '✗ RESTRICTED'}
                    </Text>
                  </View>
                  <View style={styles.diagGridItem}>
                    <Text style={styles.diagGridLabel}>Battery Optimization:</Text>
                    <Text style={[styles.diagGridVal, { color: dev.batteryOptimizationIgnored ? '#15803d' : '#b45309' }]}>
                      {dev.batteryOptimizationIgnored ? '✓ EXEMPTED' : '⚠ RESTRICTED'}
                    </Text>
                  </View>
                  <View style={styles.diagGridItem}>
                    <Text style={styles.diagGridLabel}>Android Device:</Text>
                    <Text style={styles.diagGridVal}>{dev.manufacturer} {dev.model} (API {dev.sdkInt})</Text>
                  </View>
                  {dev.lastScheduleError && dev.lastScheduleError !== 'null' && (
                    <View style={[styles.diagGridItem, { width: '100%' }]}>
                      <Text style={[styles.diagGridLabel, { color: '#b91c1c' }]}>Last Schedule Error:</Text>
                      <Text style={[styles.diagGridVal, { color: '#b91c1c' }]}>{dev.lastScheduleError}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Slots Card */}
            <View style={styles.diagSlotsCard}>
              <Text style={styles.diagSectionHeader}>ACTIVE SLOTS AUDIT ({slots.length})</Text>
              {slots.length === 0 ? (
                <Text style={styles.diagEmptyText}>No active slots configured.</Text>
              ) : (
                slots.map((slot) => {
                  const badge = getStatusBadge(slot.lastStatus);
                  return (
                    <View key={slot.id} style={styles.diagSlotItem}>
                      <View style={styles.diagSlotTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.diagSlotTitle}>
                            [{slot.time}] {slot.title}
                          </Text>
                          <Text style={styles.diagSlotSub}>ID: {slot.id} • Track: {slot.slotKey}</Text>
                        </View>
                        <View style={[styles.diagBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.diagBadgeText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                      </View>
                      <View style={styles.diagSlotMeta}>
                        <Text style={styles.diagMetaText}>Next: {slot.nextScheduledFormatted || 'Not armed'}</Text>
                        <Text style={styles.diagMetaText}>Received: {slot.lastReceivedFormatted || 'Never'}</Text>
                        <Text style={styles.diagMetaText}>Started: {slot.lastPlaybackStartedFormatted || 'Never'}</Text>
                        <Text style={styles.diagMetaText}>Completed: {slot.lastCompletedFormatted || 'Never'}</Text>
                        {slot.lastError ? (
                          <Text style={[styles.diagMetaText, { color: '#b91c1c' }]}>
                            Issue: {slot.lastError}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Event Log */}
            <View style={styles.diagEventsCard}>
              <Text style={styles.diagSectionHeader}>RECENT AUDIT EVENTS (Last {events.length})</Text>
              {events.length === 0 ? (
                <Text style={styles.diagEmptyText}>No events recorded yet.</Text>
              ) : (
                events.slice(-15).reverse().map((ev, idx) => (
                  <View key={idx} style={styles.diagEventItem}>
                    <Text style={styles.diagEventTime}>{ev.timeFormatted}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.diagEventTitle}>[{ev.event}] {ev.slotId}</Text>
                      {ev.details ? <Text style={styles.diagEventDetails}>{ev.details}</Text> : null}
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  content: { padding: SPACING.lg, paddingBottom: BOTTOM_NAV_PADDING },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary[800],
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: FONTS.sansBold, fontSize: 17, color: COLORS.neutral[0] },
  headerSub: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.primary[200], marginTop: 2 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionHeading: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    color: COLORS.neutral[400],
    letterSpacing: 1.2,
  },
  sectionSubHeading: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.primary[600],
  },
  // Chimes Card
  chimesCard: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary[100],
    ...SHADOWS.sm,
  },
  chimesTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  chimesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
    marginRight: SPACING.md,
  },
  chimesIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  chimesIconActive: {
    backgroundColor: COLORS.primary[50],
  },
  chimesTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    color: COLORS.neutral[900],
  },
  chimesSub: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
    color: COLORS.neutral[500],
    marginTop: 2,
  },
  chimePreviewRow: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  previewChimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary[50],
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  previewChimeBtnActive: {
    backgroundColor: COLORS.primary[700],
    borderColor: COLORS.primary[700],
  },
  previewChimeBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
    color: COLORS.primary[800],
  },
  previewChimeBtnTextActive: {
    color: '#ffffff',
  },
  hourlyScroll: {
    marginTop: 4,
  },
  hourlyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  hourlyBadge: {
    backgroundColor: COLORS.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  hourlyBadgeOn: {
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  hourlyBadgeText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: COLORS.neutral[400],
  },
  hourlyBadgeTextOn: {
    color: COLORS.primary[700],
    fontFamily: FONTS.sansBold,
  },
  // Preset Alarm Card (Streamlined)
  presetCard: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral[100],
    ...SHADOWS.sm,
  },
  // Custom Alarm Card (Expandable)
  alarmCard: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral[100],
  },
  alarmCardOff: { opacity: 0.65 },
  alarmCardPlaying: {
    borderColor: COLORS.primary[400],
    backgroundColor: '#fffbfb',
  },
  alarmMain: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  playPreviewBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPreviewBtnActive: {
    backgroundColor: COLORS.primary[700],
  },
  alarmTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alarmTime: { fontFamily: FONTS.sansBold, fontSize: 18, color: COLORS.neutral[900] },
  alarmTimeOff: { color: COLORS.neutral[400] },
  playingBadge: {
    backgroundColor: COLORS.primary[700],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playingBadgeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 9,
    color: '#ffffff',
  },
  alarmLabel: { fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.neutral[600], marginTop: 2 },
  alarmRepeat: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.primary[600], marginTop: 2 },
  alarmExpanded: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.neutral[100], gap: SPACING.md },
  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  expandRowCol: { gap: SPACING.sm },
  expandLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  expandLabel: { fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.neutral[700] },
  weekRow: { flexDirection: 'row', gap: SPACING.xs },
  weekBtn: { width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: COLORS.neutral[100], alignItems: 'center', justifyContent: 'center' },
  weekBtnActive: { backgroundColor: COLORS.primary[600] },
  weekBtnText: { fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.neutral[500] },
  weekBtnTextActive: { color: COLORS.neutral[0] },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  deleteText: { fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.error[500] },
  expandChevron: { position: 'absolute', top: SPACING.md, right: 76 },
  expandToneTitle: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: COLORS.primary[700],
    marginTop: 2,
    marginLeft: 24,
  },
  modalToneSub: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: COLORS.primary[700],
    marginTop: 2,
    marginLeft: 24,
  },
  changeToneBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeToneBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
    color: COLORS.primary[700],
  },
  // Tone Picker Modal
  toneModalSheet: {
    backgroundColor: COLORS.neutral[0],
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    maxHeight: '85%',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral[100],
    borderRadius: RADIUS.lg,
    padding: 3,
    marginBottom: SPACING.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabBtnActive: {
    backgroundColor: COLORS.neutral[0],
    ...SHADOWS.sm,
  },
  tabBtnText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: COLORS.neutral[600],
  },
  tabBtnTextActive: {
    fontFamily: FONTS.sansBold,
    color: COLORS.primary[700],
  },
  toneList: {
    maxHeight: 320,
    minHeight: 180,
  },
  toneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.lg,
    marginBottom: 6,
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  toneItemActive: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[300],
  },
  toneRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  toneRadioActive: {
    borderColor: COLORS.primary[600],
    backgroundColor: COLORS.primary[600],
  },
  toneRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.neutral[0],
  },
  toneInfo: {
    flex: 1,
    marginRight: 8,
  },
  toneTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    color: COLORS.neutral[900],
  },
  toneTitleActive: {
    color: COLORS.primary[900],
  },
  toneSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.neutral[500],
    marginTop: 1,
  },
  tonePreviewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tonePreviewBtnActive: {
    backgroundColor: COLORS.primary[600],
  },
  filePickCard: {
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
    borderStyle: 'dashed',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filePickCardActive: {
    borderColor: COLORS.primary[400],
    backgroundColor: COLORS.primary[50],
    borderStyle: 'solid',
  },
  filePickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    marginTop: 8,
  },
  filePickBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    color: COLORS.neutral[0],
  },
  filePickDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.neutral[500],
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  toneModalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[100],
    marginTop: SPACING.xs,
  },
  toneModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.neutral[100],
    alignItems: 'center',
  },
  toneModalCancelText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
    color: COLORS.neutral[700],
  },
  toneModalApplyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary[600],
    alignItems: 'center',
  },
  toneModalApplyText: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: COLORS.neutral[0],
  },
  toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: COLORS.neutral[300], padding: 2 },
  toggleOn: { backgroundColor: COLORS.primary[600] },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.neutral[0], ...SHADOWS.sm },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  addAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral[0],
    borderWidth: 1.5,
    borderColor: COLORS.primary[300],
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    marginTop: SPACING.md,
  },
  addAlarmPressed: { backgroundColor: COLORS.primary[50] },
  addAlarmText: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.primary[600] },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.xs },
  emptyText: { fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.neutral[500] },
  emptySub: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.neutral[400] },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.neutral[0], borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], padding: SPACING.xl, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  modalTitle: { fontFamily: FONTS.sansBold, fontSize: 17, color: COLORS.neutral[900] },
  modalClose: { width: 34, height: 34, borderRadius: RADIUS.full, backgroundColor: COLORS.neutral[100], alignItems: 'center', justifyContent: 'center' },
  modalLabel: { fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.neutral[600], marginBottom: SPACING.sm },
  modalInput: { borderWidth: 1.5, borderColor: COLORS.neutral[200], borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, fontFamily: FONTS.sansMedium, fontSize: 15, color: COLORS.neutral[900], marginBottom: SPACING.md },
  modalSettingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm, marginBottom: SPACING.sm },
  modalSettingCol: { gap: SPACING.sm, marginBottom: SPACING.md },
  modalSettingLabel: { fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.neutral[700] },
  modalWeekBtn: { width: 34, height: 34, borderRadius: RADIUS.full, backgroundColor: COLORS.neutral[100], alignItems: 'center', justifyContent: 'center' },
  modalWeekBtnActive: { backgroundColor: COLORS.primary[600] },
  modalWeekBtnText: { fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.neutral[500] },
  modalWeekBtnTextActive: { color: COLORS.neutral[0] },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  timeInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.neutral[50], borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  timeInput: { fontFamily: FONTS.sansBold, fontSize: 22, color: COLORS.neutral[900], width: 48, textAlign: 'center', padding: 0 },
  timeColon: { fontFamily: FONTS.sansBold, fontSize: 22, color: COLORS.neutral[400] },
  periodRow: { flexDirection: 'row', gap: SPACING.xs },
  periodBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.neutral[100] },
  periodBtnActive: { backgroundColor: COLORS.primary[600] },
  periodBtnText: { fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.neutral[500] },
  periodBtnTextActive: { color: COLORS.neutral[0] },
  modalAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary[600], borderRadius: RADIUS.lg, paddingVertical: SPACING.lg, marginTop: SPACING.sm },
  modalAddBtnPressed: { backgroundColor: COLORS.primary[700] },
  modalAddBtnDisabled: { opacity: 0.5 },
  modalAddBtnText: { fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.neutral[0] },

  // Error Alert Banner
  errorAlertBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorAlertTitle: { fontFamily: FONTS.sansBold, fontSize: 14, color: '#b91c1c' },
  errorAlertText: { fontFamily: FONTS.sansMedium, fontSize: 13, color: '#991b1b', marginBottom: SPACING.sm },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
    borderRadius: RADIUS.md,
  },
  errorRetryText: { fontFamily: FONTS.sansBold, fontSize: 12, color: '#991b1b' },

  // Permission & Diagnostics Pill
  permissionCard: {
    backgroundColor: '#fff7ed',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  permissionText: { fontFamily: FONTS.sansMedium, fontSize: 13, color: '#7c2d12', flex: 1 },
  permissionLink: { fontFamily: FONTS.sansBold, fontSize: 13, color: '#991b1b' },
  diagnosticsPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fed7aa',
    borderRadius: RADIUS.full,
  },
  diagnosticsPillText: { fontFamily: FONTS.sansBold, fontSize: 11, color: '#9a3412' },

  // Diagnostics Modal
  diagModalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  diagModalSheet: {
    backgroundColor: COLORS.neutral[0],
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    padding: SPACING.xl,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  diagModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  diagModalTitle: { fontFamily: FONTS.sansBold, fontSize: 18, color: COLORS.neutral[900] },
  diagModalSub: { fontFamily: FONTS.sansMedium, fontSize: 12, color: COLORS.neutral[500], marginTop: 2 },
  diagActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  diagActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
  },
  diagActionCopy: { backgroundColor: COLORS.primary[700] },
  diagActionShare: { backgroundColor: '#0284c7' },
  diagActionRefresh: { backgroundColor: COLORS.neutral[100] },
  diagActionTextWhite: { fontFamily: FONTS.sansBold, fontSize: 12, color: '#ffffff' },
  diagActionTextDark: { fontFamily: FONTS.sansBold, fontSize: 12, color: COLORS.neutral[800] },
  diagScroll: { maxHeight: 520 },
  diagDeviceCard: {
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  diagSectionHeader: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    color: COLORS.neutral[500],
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  diagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  diagGridItem: {
    width: '48%',
    backgroundColor: COLORS.neutral[0],
    padding: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[100],
  },
  diagGridLabel: { fontFamily: FONTS.sansMedium, fontSize: 11, color: COLORS.neutral[500] },
  diagGridVal: { fontFamily: FONTS.sansBold, fontSize: 12, color: COLORS.neutral[900], marginTop: 2 },
  diagSlotsCard: {
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  diagEmptyText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: COLORS.neutral[400],
    fontStyle: 'italic',
  },
  diagSlotItem: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.neutral[100],
  },
  diagSlotTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  diagSlotTitle: { fontFamily: FONTS.sansBold, fontSize: 13, color: COLORS.neutral[900] },
  diagSlotSub: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.neutral[500] },
  diagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
  diagBadgeText: { fontFamily: FONTS.sansBold, fontSize: 10 },
  diagSlotMeta: { marginTop: 4, gap: 2 },
  diagMetaText: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.neutral[600] },
  diagEventsCard: {
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  diagEventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
  },
  diagEventTime: { fontFamily: FONTS.sansMedium, fontSize: 10, color: COLORS.neutral[400], width: 65 },
  diagEventTitle: { fontFamily: FONTS.sansBold, fontSize: 11, color: COLORS.neutral[800] },
  diagEventDetails: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.neutral[600] },
});

export { TrafficControlScreen };
