import React, { useEffect, useRef, useState } from 'react';
import {
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
} from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
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
};

type AlarmState = {
  enabled: boolean;
  snoozeEnabled: boolean;
  repeatDays: number[] | null;
  loopRingtone: boolean;
  ringtoneKey: string;
};

const DEFAULT_ALARM_STATE: AlarmState = {
  enabled: true,
  snoozeEnabled: true,
  repeatDays: null,
  loopRingtone: false,
  ringtoneKey: 'default',
};

const DEFAULT_CUSTOM_ALARMS: CustomAlarm[] = [];

export default function TrafficControlScreen() {
  const toast = useToast();
  const [customAlarms, setCustomAlarms] = useState<CustomAlarm[]>([]);
  const [presetStates, setPresetStates] = useState<Record<string, AlarmState>>({});
  const [hourlyChimesEnabled, setHourlyChimesEnabled] = useState<boolean>(true);
  const [addOpen, setAddOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Active audio playback state
  const [activePlayingSlot, setActivePlayingSlot] = useState<string | null>(null);

  // ── Load from local storage on mount ──────────────────────────────────
  useEffect(() => {
    const savedAlarms = getJSON<CustomAlarm[]>(STORAGE_KEYS.alarms, DEFAULT_CUSTOM_ALARMS);
    const savedChimes = getJSON<boolean>(STORAGE_KEYS.hourlyChimes, true);
    setCustomAlarms(savedAlarms);
    setHourlyChimesEnabled(savedChimes);

    const map: Record<string, AlarmState> = {};
    savedAlarms.forEach((r) => {
      map[`custom:${r.id}`] = {
        enabled: r.enabled,
        snoozeEnabled: r.snoozeEnabled,
        repeatDays: r.repeatDays,
        loopRingtone: r.loopRingtone,
        ringtoneKey: r.ringtoneKey,
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
    };
  }, []);

  // ── Toggle Audio Preview for a Slot ──────────────────────────────────
  const handleTogglePreview = async (slotKey: string) => {
    if (activePlayingSlot === slotKey) {
      await stopTrafficAudio();
      toast.show('Playback stopped', 'info');
    } else {
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
    rescheduleAllTrafficAlarms();
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
    }

    rescheduleAllTrafficAlarms();
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
    };
    const next = [...customAlarms, newAlarm].sort((a, b) => a.time.localeCompare(b.time));
    setCustomAlarms(next);
    setJSON(STORAGE_KEYS.alarms, next);
    setPresetStates((prev) => ({ ...prev, [`custom:${newAlarm.id}`]: state }));
    rescheduleAllTrafficAlarms();
    toast.show('Custom alarm created', 'success');
  };

  const deleteCustomAlarm = (id: string) => {
    const next = customAlarms.filter((a) => a.id !== id);
    setCustomAlarms(next);
    setJSON(STORAGE_KEYS.alarms, next);
    rescheduleAllTrafficAlarms();
    toast.show('Alarm removed', 'info');
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
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
 * Add Custom Alarm Modal featuring Custom Time, Label, Snooze, and Repeat Days
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

  useEffect(() => {
    if (!visible) {
      setHours('06');
      setMinutes('00');
      setPeriod('AM');
      setLabel('');
      setSnoozeEnabled(true);
      setRepeatDays(null);
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  content: { padding: SPACING.lg },
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
});

export { TrafficControlScreen };
