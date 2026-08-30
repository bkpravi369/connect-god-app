import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Check, Plus, X, ChevronLeft, ChevronRight, ChevronDown, BarChart3, Trash2, Calendar } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { DEFAULT_ITEMS, ChecklistItem } from '@/lib/constants';
import { monthDayPercentages, monthlyAnalytics } from '@/lib/analytics';
import { monthLabel, todayISO, prettyDate } from '@/lib/dates';
import { getJSON, setJSON } from '@/lib/storage';
import { useToast } from '@/components/ToastProvider';

type CombinedItem = ChecklistItem & { customId?: string };

type StoredEntry = {
  task_key: string;
  entry_date: string;
  is_done: boolean;
  value: number | null;
};

type CustomTask = {
  id: string;
  label: string;
  entry_type: 'checkbox' | 'number' | 'percent';
};

const PRIMARY_ENTRIES_KEY = 'connectgod_checklist_entries';
const LEGACY_ENTRIES_KEY = 'murali_hub_checklist_entries';
const PRIMARY_TASKS_KEY = 'connectgod_custom_tasks';
const LEGACY_TASKS_KEY = 'murali_hub_custom_tasks';

export default function DailyChartScreen() {
  const toast = useToast();
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [entries, setEntries] = useState<StoredEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [analyticsView, setAnalyticsView] = useState(false);
  const [activeDate, setActiveDate] = useState<string>(todayISO());

  const isToday = activeDate === todayISO();

  const changeDay = (offset: number) => {
    const d = new Date(activeDate);
    d.setDate(d.getDate() + offset);
    setActiveDate(d.toISOString().slice(0, 10));
  };

  const allItems: CombinedItem[] = useMemo(
    () => [
      ...DEFAULT_ITEMS,
      ...customTasks.map<CombinedItem>((t) => ({
        key: `custom:${t.id}`,
        label: t.label,
        labelEn: t.label,
        type: t.entry_type,
        customId: t.id,
      })),
    ],
    [customTasks],
  );

  const load = useCallback(() => {
    setLoading(true);
    const tasks = getJSON<CustomTask[]>(PRIMARY_TASKS_KEY, getJSON<CustomTask[]>(LEGACY_TASKS_KEY, []));
    const stored = getJSON<StoredEntry[]>(PRIMARY_ENTRIES_KEY, getJSON<StoredEntry[]>(LEGACY_ENTRIES_KEY, []));
    setCustomTasks(tasks);
    setEntries(stored);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback((next: StoredEntry[]) => {
    setEntries(next);
    setJSON(PRIMARY_ENTRIES_KEY, next);
  }, []);

  const entryFor = useCallback(
    (key: string) => entries.find((e) => e.task_key === key && e.entry_date === activeDate),
    [entries, activeDate],
  );

  const upsert = useCallback(
    (key: string, patch: Partial<StoredEntry>) => {
      const existing = entryFor(key);
      let next: StoredEntry[];
      if (existing) {
        next = entries.map((e) =>
          e.task_key === key && e.entry_date === activeDate
            ? { ...e, ...patch }
            : e,
        );
      } else {
        next = [...entries, { task_key: key, entry_date: activeDate, is_done: false, value: null, ...patch }];
      }
      persist(next);
    },
    [entryFor, activeDate, entries, persist],
  );

  const persistTasks = useCallback((next: CustomTask[]) => {
    setCustomTasks(next);
    setJSON(PRIMARY_TASKS_KEY, next);
  }, []);

  const addCustomTask = useCallback(
    (label: string, type: 'checkbox' | 'number' | 'percent') => {
      const newTask: CustomTask = {
        id: `ct_${Date.now()}`,
        label,
        entry_type: type,
      };
      persistTasks([...customTasks, newTask]);
      toast.show('Task added', 'success');
    },
    [customTasks, persistTasks, toast],
  );

  const deleteCustomTask = useCallback(
    (item: CombinedItem) => {
      if (!item.customId) return;
      persistTasks(customTasks.filter((t) => t.id !== item.customId));
      const nextEntries = entries.filter((e) => e.task_key !== `custom:${item.customId}`);
      persist(nextEntries);
      toast.show('Task removed', 'info');
    },
    [customTasks, persistTasks, entries, toast, persist],
  );

  const doneCount = useMemo(
    () => allItems.filter((i) => {
      const e = entryFor(i.key);
      return e && (e.is_done || (e.value !== null && e.value > 0));
    }).length,
    [allItems, entryFor],
  );

  const progress = allItems.length > 0 ? doneCount / allItems.length : 0;
  const scorePercent = Math.round(progress * 100);

  const spiritualBadge = useMemo(() => {
    if (scorePercent === 100) return { label: '🌟 Master Bestower (സമ്പൂർണ്ണൻ)', color: '#D4AF37' };
    if (scorePercent >= 75) return { label: '✨ Deep Purity & Power (ശക്തിശാലി)', color: '#10b981' };
    if (scorePercent >= 50) return { label: '🌿 Peaceful Progress (പുരോഗതി)', color: '#38bdf8' };
    if (scorePercent > 0) return { label: '🌱 Soul Awakening (ആരംഭം)', color: '#f59e0b' };
    return { label: '🧘 Start Daily Chart', color: '#94a3b8' };
  }, [scorePercent]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Date Header Card with Navigation and Gold Progress Ring/Bar */}
        <View style={styles.dateCard}>
          <View style={styles.dateTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>{isToday ? 'Today' : 'Daily Chart'}</Text>
              <Text style={styles.dateText}>{prettyDate(activeDate)}</Text>
              <View style={[styles.badgePill, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                <Text style={[styles.badgePillText, { color: spiritualBadge.color }]}>
                  {spiritualBadge.label}
                </Text>
              </View>
            </View>
            <View style={styles.progressRing}>
              <Text style={styles.progressPct}>{scorePercent}%</Text>
              <Text style={styles.progressLbl}>{doneCount}/{allItems.length} Tasks</Text>
            </View>
          </View>

          {/* Minimalist Golden Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.max(4, scorePercent)}%` }]} />
          </View>

          {/* Date Selector buttons */}
          <View style={styles.dateNavRow}>
            <Pressable
              style={({ pressed }) => [styles.dateNavBtn, pressed && styles.dateNavBtnPressed]}
              onPress={() => changeDay(-1)}
            >
              <ChevronLeft color="#ffffff" size={16} strokeWidth={2.4} />
              <Text style={styles.dateNavBtnText}>Previous</Text>
            </Pressable>

            {!isToday && (
              <Pressable
                style={({ pressed }) => [styles.dateTodayBtn, pressed && styles.dateNavBtnPressed]}
                onPress={() => setActiveDate(todayISO())}
              >
                <Text style={styles.dateTodayBtnText}>Go to Today</Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [styles.dateNavBtn, pressed && styles.dateNavBtnPressed]}
              onPress={() => changeDay(1)}
            >
              <Text style={styles.dateNavBtnText}>Next</Text>
              <ChevronRight color="#ffffff" size={16} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.analyticsBtn, pressed && styles.analyticsBtnPressed]}
          onPress={() => setAnalyticsView(true)}
        >
          <BarChart3 color={COLORS.primary[700]} size={20} strokeWidth={2.2} />
          <Text style={styles.analyticsBtnText}>Monthly / Yearly Progress</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={COLORS.primary[600]} size="large" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.list}>
            {allItems.map((item, idx) => (
              <ChecklistRow
                key={item.key}
                item={item}
                index={idx}
                entry={entryFor(item.key)}
                onToggle={() => {
                  const cur = entryFor(item.key);
                  upsert(item.key, { is_done: !cur?.is_done });
                }}
                onValue={(v) => upsert(item.key, { value: v, is_done: v > 0 })}
                onDelete={item.customId ? () => deleteCustomTask(item) : undefined}
              />
            ))}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.addTaskBtn, pressed && styles.addTaskPressed]}
          onPress={() => setAddOpen(true)}
        >
          <Plus color={COLORS.primary[600]} size={20} strokeWidth={2.2} />
          <Text style={styles.addTaskText}>Add Custom Task</Text>
        </Pressable>

        <View style={{ height: SPACING['2xl'] }} />
      </ScrollView>

      <AddTaskModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(label, type) => { addCustomTask(label, type); setAddOpen(false); }}
      />

      <AnalyticsModal
        visible={analyticsView}
        onClose={() => setAnalyticsView(false)}
        entries={entries}
        totalItems={allItems.length}
      />
    </View>
  );
}

function ChecklistRow({
  item,
  index,
  entry,
  onToggle,
  onValue,
  onDelete,
}: {
  item: CombinedItem;
  index: number;
  entry?: StoredEntry;
  onToggle: () => void;
  onValue: (v: number) => void;
  onDelete?: () => void;
}) {
  const isNumber = item.type === 'number';
  const isPercent = item.type === 'percent';
  const isQuant = isNumber || isPercent;
  const isChecked = entry?.is_done ?? false;
  const numVal = entry?.value ?? 0;
  const done = isChecked || (isQuant && numVal > 0);
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    onToggle();
  };

  const handleText = (t: string) => {
    let v = Number(t.replace(/[^0-9]/g, '')) || 0;
    if (isPercent) v = Math.min(100, v);
    onValue(v);
  };

  return (
    <Animated.View style={[styles.row, done && styles.rowDone, { transform: [{ scale }] }]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowIndex}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{item.label}</Text>
          {item.label !== item.labelEn && <Text style={styles.rowLabelEn}>{item.labelEn}</Text>}
        </View>
      </View>

      <View style={styles.rowRight}>
        {isQuant ? (
          <View style={styles.badgeWrap}>
            <TextInput
              style={styles.badgeInput}
              keyboardType="number-pad"
              value={String(numVal)}
              onChangeText={handleText}
              maxLength={isPercent ? 3 : 5}
              selectTextOnFocus
            />
            <Text style={styles.badgeUnit}>
              {isPercent ? '%' : item.unit ?? ''}
            </Text>
          </View>
        ) : (
          <Pressable style={[styles.checkbox, done && styles.checkboxDone]} onPress={handlePress} hitSlop={8}>
            {done && <Check color={COLORS.neutral[0]} size={16} strokeWidth={3} />}
          </Pressable>
        )}

        {onDelete && (
          <Pressable style={styles.delBtn} onPress={onDelete} hitSlop={8}>
            <Trash2 color={COLORS.neutral[300]} size={16} strokeWidth={2} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

function AddTaskModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (label: string, type: 'checkbox' | 'number' | 'percent') => void;
}) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'checkbox' | 'number' | 'percent'>('checkbox');

  useEffect(() => {
    if (!visible) { setLabel(''); setType('checkbox'); }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Custom Task</Text>
            <Pressable style={styles.modalClose} onPress={onClose} hitSlop={12}>
              <X color={COLORS.neutral[500]} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>

          <TextInput
            style={styles.modalInput}
            placeholder="Task name (Malayalam or English)"
            placeholderTextColor={COLORS.neutral[400]}
            value={label}
            onChangeText={setLabel}
            autoFocus
          />

          <Text style={styles.modalLabel}>Entry type</Text>
          <View style={styles.typeRow}>
            <Pressable
              style={[styles.typeBtn, type === 'checkbox' && styles.typeBtnActive]}
              onPress={() => setType('checkbox')}
            >
              <Text style={[styles.typeBtnText, type === 'checkbox' && styles.typeBtnTextActive]}>Checkbox</Text>
            </Pressable>
            <Pressable
              style={[styles.typeBtn, type === 'number' && styles.typeBtnActive]}
              onPress={() => setType('number')}
            >
              <Text style={[styles.typeBtnText, type === 'number' && styles.typeBtnTextActive]}>Number</Text>
            </Pressable>
            <Pressable
              style={[styles.typeBtn, type === 'percent' && styles.typeBtnActive]}
              onPress={() => setType('percent')}
            >
              <Text style={[styles.typeBtnText, type === 'percent' && styles.typeBtnTextActive]}>Percent</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.modalAddBtn, pressed && styles.modalAddBtnPressed, !label.trim() && styles.modalAddBtnDisabled]}
            onPress={() => label.trim() && onAdd(label.trim(), type)}
            disabled={!label.trim()}
          >
            <Plus color={COLORS.neutral[0]} size={18} strokeWidth={2.4} />
            <Text style={styles.modalAddBtnText}>Add Task</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function buildMonthOptions(): { year: number; month: number; label: string }[] {
  const now = new Date();
  const opts: { year: number; month: number; label: string }[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabel(d.getFullYear(), d.getMonth()) });
  }
  return opts;
}

function AnalyticsModal({
  visible,
  onClose,
  entries,
  totalItems,
}: {
  visible: boolean;
  onClose: () => void;
  entries: StoredEntry[];
  totalItems: number;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const monthOptions = useMemo(buildMonthOptions, []);

  const stats = useMemo(
    () => monthlyAnalytics(entries as never[], year, month, totalItems),
    [entries, year, month, totalItems],
  );
  const dayData = useMemo(
    () => monthDayPercentages(entries as never[], year, month, totalItems),
    [entries, year, month, totalItems],
  );

  const selectMonth = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setDropdownOpen(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalSheet, { maxHeight: '88%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Monthly Analytics</Text>
            <Pressable style={styles.modalClose} onPress={onClose} hitSlop={12}>
              <X color={COLORS.neutral[500]} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.dropdownWrap}>
            <Pressable
              style={({ pressed }) => [styles.dropdownBtn, pressed && styles.dropdownBtnPressed]}
              onPress={() => setDropdownOpen((v) => !v)}
            >
              <Calendar color={COLORS.primary[600]} size={18} strokeWidth={2.2} />
              <Text style={styles.dropdownText}>{monthLabel(year, month)}</Text>
              <ChevronDown
                color={COLORS.neutral[400]}
                size={18}
                strokeWidth={2.2}
                style={{ transform: [{ rotate: dropdownOpen ? '180deg' : '0deg' }] }}
              />
            </Pressable>

            {dropdownOpen && (
              <View style={styles.dropdownList}>
                <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
                  {monthOptions.map((opt) => {
                    const active = opt.year === year && opt.month === month;
                    return (
                      <Pressable
                        key={`${opt.year}-${opt.month}`}
                        style={({ pressed }) => [styles.dropdownItem, active && styles.dropdownItemActive, pressed && styles.dropdownItemPressed]}
                        onPress={() => selectMonth(opt.year, opt.month)}
                      >
                        <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                          {opt.label}
                        </Text>
                        {active && <Check color={COLORS.primary[600]} size={16} strokeWidth={2.4} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.monthNav}>
            <Pressable style={styles.monthNavBtn} onPress={() => {
              if (month === 0) { setYear(year - 1); setMonth(11); }
              else setMonth(month - 1);
            }} hitSlop={8}>
              <ChevronLeft color={COLORS.neutral[700]} size={22} strokeWidth={2.2} />
            </Pressable>
            <Text style={styles.monthNavText}>Calendar: 1st to {stats.totalDays}th</Text>
            <Pressable style={styles.monthNavBtn} onPress={() => {
              if (month === 11) { setYear(year + 1); setMonth(0); }
              else setMonth(month + 1);
            }} hitSlop={8}>
              <ChevronRight color={COLORS.neutral[700]} size={22} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeDays}</Text>
              <Text style={styles.statLabel}>Days completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.percentage}%</Text>
              <Text style={styles.statLabel}>Performance</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.completedItems}</Text>
              <Text style={styles.statLabel}>Total checkmarks</Text>
            </View>
          </View>

          <Text style={styles.chartTitle}>Daily completion (1–{stats.totalDays})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
            <View style={styles.chartRow}>
              {dayData.map((d) => {
                const h = Math.max(4, d.pct * 90);
                const isFuture = new Date(d.date) > new Date(`${todayISO()}T23:59:59`);
                return (
                  <View key={d.date} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View style={[styles.bar, { height: h, backgroundColor: isFuture ? COLORS.neutral[200] : d.pct > 0 ? COLORS.primary[500] : COLORS.neutral[200] }]} />
                    </View>
                    <Text style={styles.barDay}>{Number(d.date.slice(-2))}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.legendRow}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Completed items per day (out of {totalItems})</Text>
          </View>

          <View style={styles.persistNote}>
            <Check color={COLORS.success[500]} size={14} strokeWidth={2.4} />
            <Text style={styles.persistNoteText}>All entries saved locally — previous months are preserved</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  content: { padding: SPACING.lg },
  dateCard: {
    backgroundColor: COLORS.primary[800],
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  dateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateLabel: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.primary[200] },
  dateText: { fontFamily: FONTS.sansBold, fontSize: 17, color: COLORS.neutral[0], marginTop: 2 },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: RADIUS.full,
    marginTop: 6,
  },
  badgePillText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  progressRing: { alignItems: 'flex-end', justifyContent: 'center' },
  progressPct: { fontFamily: FONTS.sansBold, fontSize: 24, color: '#D4AF37' },
  progressLbl: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.primary[200], marginTop: 2 },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 3,
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  dateNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  dateNavBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  dateNavBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
    color: '#ffffff',
  },
  dateTodayBtn: {
    backgroundColor: COLORS.secondary[400],
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  dateTodayBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11.5,
    color: COLORS.primary[900],
  },
  analyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral[0],
    borderWidth: 1,
    borderColor: COLORS.primary[100],
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  analyticsBtnPressed: { backgroundColor: COLORS.primary[50] },
  analyticsBtnText: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.primary[700] },
  list: { gap: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[100],
  },
  rowDone: { borderColor: COLORS.primary[200], backgroundColor: COLORS.primary[50] },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  rowIndex: { fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.neutral[300], width: 26 },
  rowLabel: { fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.neutral[900] },
  rowLabelEn: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.neutral[400], marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: COLORS.primary[600], borderColor: COLORS.primary[600] },
  // Badge-style numeric / percent input — no +/- buttons
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary[200],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    minWidth: 72,
  },
  badgeInput: {
    width: 34,
    textAlign: 'center',
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: COLORS.primary[800],
    padding: 0,
  },
  badgeUnit: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
    color: COLORS.primary[500],
    marginLeft: 2,
  },
  delBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  addTaskBtn: {
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
  addTaskPressed: { backgroundColor: COLORS.primary[50] },
  addTaskText: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.primary[600] },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.neutral[0],
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    padding: SPACING.xl,
    paddingBottom: 32,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  modalTitle: { fontFamily: FONTS.sansBold, fontSize: 17, color: COLORS.neutral[900] },
  modalClose: { width: 34, height: 34, borderRadius: RADIUS.full, backgroundColor: COLORS.neutral[100], alignItems: 'center', justifyContent: 'center' },
  modalInput: {
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontFamily: FONTS.sansMedium,
    fontSize: 15,
    color: COLORS.neutral[900],
    marginBottom: SPACING.lg,
  },
  modalLabel: { fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.neutral[600], marginBottom: SPACING.sm },
  typeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  typeBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
    alignItems: 'center',
  },
  typeBtnActive: { borderColor: COLORS.primary[600], backgroundColor: COLORS.primary[50] },
  typeBtnText: { fontFamily: FONTS.sansMedium, fontSize: 12, color: COLORS.neutral[500] },
  typeBtnTextActive: { color: COLORS.primary[700], fontFamily: FONTS.sansSemiBold },
  modalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary[600],
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
  },
  modalAddBtnPressed: { backgroundColor: COLORS.primary[700] },
  modalAddBtnDisabled: { opacity: 0.5 },
  modalAddBtnText: { fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.neutral[0] },
  dropdownWrap: { position: 'relative', marginBottom: SPACING.md },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1.5,
    borderColor: COLORS.primary[200],
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  dropdownBtnPressed: { backgroundColor: COLORS.primary[50] },
  dropdownText: { flex: 1, fontFamily: FONTS.sansSemiBold, fontSize: 15, color: COLORS.neutral[900] },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    ...SHADOWS.md,
    zIndex: 10,
    marginTop: 4,
  },
  dropdownScroll: { maxHeight: 220 },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[50],
  },
  dropdownItemActive: { backgroundColor: COLORS.primary[50] },
  dropdownItemPressed: { backgroundColor: COLORS.primary[100] },
  dropdownItemText: { fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.neutral[700] },
  dropdownItemTextActive: { color: COLORS.primary[700], fontFamily: FONTS.sansBold },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  monthNavBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.neutral[100], alignItems: 'center', justifyContent: 'center' },
  monthNavText: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.neutral[500] },
  statGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  statValue: { fontFamily: FONTS.sansBold, fontSize: 22, color: COLORS.primary[700] },
  statLabel: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.neutral[500], marginTop: 4, textAlign: 'center' },
  chartTitle: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.neutral[800], marginBottom: SPACING.md },
  chartScroll: { marginBottom: SPACING.md },
  chartRow: { flexDirection: 'row', gap: 4, paddingBottom: SPACING.xs },
  barCol: { alignItems: 'center', width: 14 },
  barTrack: { width: 10, height: 96, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 10, borderRadius: 3 },
  barDay: { fontFamily: FONTS.sans, fontSize: 8, color: COLORS.neutral[400], marginTop: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  legendDot: { width: 10, height: 10, borderRadius: 3, backgroundColor: COLORS.primary[500] },
  legendText: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.neutral[500] },
  persistNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.success[500] + '15',
    borderRadius: RADIUS.md,
  },
  persistNoteText: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.success[600] },
});

export { DailyChartScreen };
