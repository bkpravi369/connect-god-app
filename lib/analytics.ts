import { ChecklistEntry } from './supabase';

// Returns 0..1 completion ratio for a given day from the set of entries.
export function dayCompletionRatio(entries: ChecklistEntry[], date: string): number {
  const dayEntries = entries.filter((e) => e.entry_date === date);
  if (dayEntries.length === 0) return 0;
  const done = dayEntries.filter((e) => e.is_done || (e.value !== null && e.value > 0)).length;
  return done / dayEntries.length;
}

// Returns the list of distinct dates that have at least one completed item.
export function activeDays(entries: ChecklistEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    if (e.is_done || (e.value !== null && e.value > 0)) {
      set.add(e.entry_date);
  }
  }
  return Array.from(set).sort();
}

// Monthly analytics: for the given month, return total active days and the
// performance percentage = (completed items across the month) / (total possible items).
export function monthlyAnalytics(
  entries: ChecklistEntry[],
  year: number,
  month: number,
  totalItems: number,
): { activeDays: number; totalDays: number; percentage: number; completedItems: number } {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEntries = entries.filter((e) => e.entry_date.startsWith(prefix));
  const totalDays = new Date(year, month + 1, 0).getDate();
  const active = new Set<string>();
  let completedItems = 0;
  for (const e of monthEntries) {
    if (e.is_done || (e.value !== null && e.value > 0)) {
      active.add(e.entry_date);
      completedItems += 1;
    }
  }
  const possible = totalDays * totalItems;
  const percentage = possible > 0 ? Math.round((completedItems / possible) * 100) : 0;
  return { activeDays: active.size, totalDays, percentage, completedItems };
}

// Build a per-day percentage array for a month (for the mini bar chart).
export function monthDayPercentages(
  entries: ChecklistEntry[],
  year: number,
  month: number,
  totalItems: number,
): { date: string; pct: number }[] {
  const totalDays = new Date(year, month + 1, 0).getDate();
  const map = new Map<string, number>();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  for (const e of entries.filter((e) => e.entry_date.startsWith(prefix))) {
    const cur = map.get(e.entry_date) ?? 0;
    if (e.is_done || (e.value !== null && e.value > 0)) {
      map.set(e.entry_date, cur + 1);
    }
  }
  const out: { date: string; pct: number }[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const date = `${prefix}-${String(d).padStart(2, '0')}`;
    const done = map.get(date) ?? 0;
    out.push({ date, pct: totalItems > 0 ? done / totalItems : 0 });
  }
  return out;
}
