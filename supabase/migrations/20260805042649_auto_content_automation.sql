/*
# Auto Content Automation — YouTube RSS + Varadan Extraction

## Summary
Adds a single-tenant content automation layer. The admin configures YouTube
channel IDs (for Daily Murli, Podcasts, Live Stream) and a Murli source URL.
An edge function fetches the latest videos from YouTube RSS feeds and extracts
the Varadan text from the Murli source, storing results in a cache table.
The frontend reads this cache to display always-fresh content without manual
video-link entry.

## New Tables

### `content_config`
Single-row config table holding the admin's automation settings.
- `id` (int, primary key, always 1) — singleton row
- `murli_youtube_channel_id` (text) — YouTube channel ID for Daily Murli videos
- `podcast_youtube_channel_id` (text) — YouTube channel ID for podcast videos
- `live_youtube_channel_id` (text) — YouTube channel ID for live stream detection
- `murli_source_url` (text) — web/RSS URL to fetch full Murli text for Varadan extraction
- `auto_varadan_enabled` (boolean, default false)
- `auto_youtube_enabled` (boolean, default false)
- `updated_at` (timestamptz)

### `auto_content_cache`
Stores fetched results from the edge function.
- `id` (uuid, primary key)
- `cache_key` (text, unique) — 'murli_video' | 'podcast_video' | 'live_video' | 'varadan_text' | 'full_murli'
- `content` (jsonb)
- `fetched_at` (timestamptz)

## Security
- RLS enabled on both tables, single-tenant (no sign-in), anon+authenticated CRUD.
- auto_content_cache: edge function writes via service role key (bypasses RLS).

## Notes
1. YouTube RSS: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID (no API key)
2. Varadan extraction: regex parses for 'वरदान' / 'Varadan' / 'വരദാൻ' section.
*/

CREATE TABLE IF NOT EXISTS content_config (
  id int PRIMARY KEY DEFAULT 1,
  murli_youtube_channel_id text DEFAULT '',
  podcast_youtube_channel_id text DEFAULT '',
  live_youtube_channel_id text DEFAULT '',
  murli_source_url text DEFAULT '',
  auto_varadan_enabled boolean NOT NULL DEFAULT false,
  auto_youtube_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton_content_config CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS auto_content_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_content_cache ENABLE ROW LEVEL SECURITY;

-- content_config policies
DROP POLICY IF EXISTS "cc_select" ON content_config;
CREATE POLICY "cc_select" ON content_config FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "cc_insert" ON content_config;
CREATE POLICY "cc_insert" ON content_config FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "cc_update" ON content_config;
CREATE POLICY "cc_update" ON content_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "cc_delete" ON content_config;
CREATE POLICY "cc_delete" ON content_config FOR DELETE TO anon, authenticated USING (true);

-- auto_content_cache policies
DROP POLICY IF EXISTS "acc_select" ON auto_content_cache;
CREATE POLICY "acc_select" ON auto_content_cache FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "acc_insert" ON auto_content_cache;
CREATE POLICY "acc_insert" ON auto_content_cache FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "acc_update" ON auto_content_cache;
CREATE POLICY "acc_update" ON auto_content_cache FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "acc_delete" ON auto_content_cache;
CREATE POLICY "acc_delete" ON auto_content_cache FOR DELETE TO anon, authenticated USING (true);

INSERT INTO content_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_auto_content_cache_key ON auto_content_cache(cache_key);
