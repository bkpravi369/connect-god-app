/*
# Murali Hub - Daily chart & alarm persistence (single-tenant, no auth)

## Summary
Creates the persistence layer for the Murali Hub super-app. The app has no
sign-in screen, so this is a single-tenant schema: every policy is scoped to
`anon, authenticated` so the anon-key frontend can read and write its own data.
No `user_id` columns and no `auth.uid()` ownership checks.

## New Tables

### `custom_tasks`
User-added personalized habits shown alongside the 16 default Malayalam
checklist items on the Daily Chart tab.
- `id` (uuid, primary key)
- `label` (text, not null) - the habit name, e.g. a custom Malayalam or English task
- `entry_type` (text, not null, default 'checkbox') - 'checkbox' or 'number' (for minutes/count)
- `sort_order` (int, default 0) - display ordering after the 16 defaults
- `created_at` (timestamptz, default now())

### `checklist_entries`
One row per (task, date) recording whether/for how long the habit was done.
`task_key` stores either a default item key (e.g. 'good_morning') or the
`custom_tasks.id` (prefixed `custom:<uuid>`) so both default and custom items
share one table.
- `id` (uuid, primary key)
- `task_key` (text, not null) - default item key or `custom:<uuid>`
- `entry_date` (date, not null) - the day this entry belongs to (local date)
- `is_done` (boolean, default false) - for checkbox-type items
- `value` (int, default null) - for number/minutes-type items
- `updated_at` (timestamptz, default now())
- UNIQUE (task_key, entry_date) so a day can only have one entry per task

### `alarms`
Alarm definitions for the Traffic Control tab. Preset alarms (3:30 AM etc.)
are seeded into the app constants, not this table; this table stores the
user's custom alarms and any per-alarm toggle-state overrides.
- `id` (uuid, primary key)
- `time` (text, not null) - 'HH:MM' 24-hour format, e.g. '03:30'
- `label` (text, default null) - optional friendly name
- `enabled` (boolean, default true) - master on/off for the alarm
- `snooze_enabled` (boolean, default true)
- `repeat_days` (int[], default null) - array of weekday numbers 0=Sun..6=Sat; null = one-time
- `loop_ringtone` (boolean, default true) - true = looping, false = single play
- `ringtone_key` (text, default 'default') - which built-in ringtone to use
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on all three tables.
- All CRUD policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because the data is intentionally single-tenant and shared (no sign-in screen).
  This is the documented single-tenant exception, not an ownership-check shortcut.
- 4 separate policies per table (SELECT/INSERT/UPDATE/DELETE), no `FOR ALL`.

## Notes
1. Preset alarm times (03:30, 05:45, 07:00, 10:30, 12:00, 17:30, 19:30, 22:00)
   are defined in the app and are not stored in the database. The `alarms` table
   holds custom alarms the user adds with "+ Add Alarm".
2. `checklist_entries.entry_date` is a `date` (not timestamptz) so entries group
   cleanly by calendar day for the monthly analytics view.
3. Re-running this migration is safe: all statements are idempotent.
*/

CREATE TABLE IF NOT EXISTS custom_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  entry_type text NOT NULL DEFAULT 'checkbox',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key text NOT NULL,
  entry_date date NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  value int,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_key, entry_date)
);

CREATE TABLE IF NOT EXISTS alarms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time text NOT NULL,
  label text,
  enabled boolean NOT NULL DEFAULT true,
  snooze_enabled boolean NOT NULL DEFAULT true,
  repeat_days int[] DEFAULT NULL,
  loop_ringtone boolean NOT NULL DEFAULT true,
  ringtone_key text NOT NULL DEFAULT 'default',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;

-- custom_tasks policies
DROP POLICY IF EXISTS "ct_select" ON custom_tasks;
CREATE POLICY "ct_select" ON custom_tasks FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ct_insert" ON custom_tasks;
CREATE POLICY "ct_insert" ON custom_tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ct_update" ON custom_tasks;
CREATE POLICY "ct_update" ON custom_tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ct_delete" ON custom_tasks;
CREATE POLICY "ct_delete" ON custom_tasks FOR DELETE
  TO anon, authenticated USING (true);

-- checklist_entries policies
DROP POLICY IF EXISTS "ce_select" ON checklist_entries;
CREATE POLICY "ce_select" ON checklist_entries FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ce_insert" ON checklist_entries;
CREATE POLICY "ce_insert" ON checklist_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ce_update" ON checklist_entries;
CREATE POLICY "ce_update" ON checklist_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ce_delete" ON checklist_entries;
CREATE POLICY "ce_delete" ON checklist_entries FOR DELETE
  TO anon, authenticated USING (true);

-- alarms policies
DROP POLICY IF EXISTS "al_select" ON alarms;
CREATE POLICY "al_select" ON alarms FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "al_insert" ON alarms;
CREATE POLICY "al_insert" ON alarms FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "al_update" ON alarms;
CREATE POLICY "al_update" ON alarms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "al_delete" ON alarms;
CREATE POLICY "al_delete" ON alarms FOR DELETE
  TO anon, authenticated USING (true);

-- Helpful indexes for the common query patterns
CREATE INDEX IF NOT EXISTS idx_checklist_entries_date ON checklist_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_checklist_entries_task_key ON checklist_entries(task_key);
CREATE INDEX IF NOT EXISTS idx_alarms_enabled ON alarms(enabled);
