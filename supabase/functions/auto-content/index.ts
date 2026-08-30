import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VideoInfo {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
  publishedAt: string;
  isLive: boolean;
}

function parseYouTubeRSS(xml: string): VideoInfo[] {
  const videos: VideoInfo[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const videoId = extractTag(entry, "yt:videoId") || "";
    const title = extractTag(entry, "title") || "";
    const link = (entry.match(/<link[^>]*href="([^"]*)"[^>]*\/>/) || [])[1] || "";
    const thumbnail =
      (entry.match(/<media:thumbnail[^>]*url="([^"]*)"[^>]*\/>/) || [])[1] || "";
    const published = extractTag(entry, "published") || "";
    const isLive = /live/i.test(title) || /live broadcast/i.test(entry);
    if (videoId) {
      videos.push({ videoId, title, url: link, thumbnail, publishedAt: published, isLive });
    }
  }
  return videos;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(regex);
  return m ? m[1].trim() : null;
}

function extractVaradan(text: string): { varadanMl: string; varadanEn: string; fullText: string } | null {
  if (!text) return null;

  // Strip HTML tags
  const clean = text.replace(/<[^>]+>/g, "\n").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#\d+;/g, "");

  // Try to find Varadan section in Malayalam (വരദാൻ / വരദാനം)
  const mlPatterns = [
    /വരദാൻ[:\s]*\n?([\s\S]{10,500}?)(?:\n\s*\n|മുരളി|ശിവ|ഓം ശാന്തി|$)/i,
    /വരദാനം[:\s]*\n?([\s\S]{10,500}?)(?:\n\s*\n|മുരളി|ശിവ|ഓം ശാന്തി|$)/i,
  ];
  let varadanMl = "";
  for (const p of mlPatterns) {
    const m = clean.match(p);
    if (m && m[1]) {
      varadanMl = m[1].trim().split("\n").filter((l) => l.trim()).slice(0, 2).join(" ");
      break;
    }
  }

  // Try to find Varadan section in English / Hindi (वरदान / Varadan / Blessing)
  const enPatterns = [
    /वरदान[:\s]*\n?([\s\S]{10,500}?)(?:\n\s*\n|मुरली|शिव|$)/i,
    /Varadan[:\s]*\n?([\s\S]{10,500}?)(?:\n\s*\n|Murli|Blessing|$)/i,
    /Blessing[:\s]*\n?([\s\S]{10,500}?)(?:\n\s*\n|Murli|$)/i,
  ];
  let varadanEn = "";
  for (const p of enPatterns) {
    const m = clean.match(p);
    if (m && m[1]) {
      varadanEn = m[1].trim().split("\n").filter((l) => l.trim()).slice(0, 2).join(" ");
      break;
    }
  }

  if (!varadanMl && !varadanEn) return null;

  return { varadanMl, varadanEn, fullText: clean.trim().substring(0, 10000) };
}

async function fetchYouTubeRSS(channelId: string): Promise<VideoInfo[]> {
  if (!channelId || channelId.length < 5) return [];
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const resp = await fetch(rssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ConnectGodBot/1.0)" },
  });
  if (!resp.ok) throw new Error(`YouTube RSS fetch failed: ${resp.status}`);
  const xml = await resp.text();
  return parseYouTubeRSS(xml);
}

async function fetchMurliText(sourceUrl: string): Promise<string> {
  if (!sourceUrl || sourceUrl.length < 10) return "";
  const resp = await fetch(sourceUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ConnectGodBot/1.0)" },
  });
  if (!resp.ok) throw new Error(`Murli source fetch failed: ${resp.status}`);
  const text = await resp.text();
  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Read config
    const { data: config, error: cfgErr } = await supabase
      .from("content_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (cfgErr) throw cfgErr;
    if (!config) {
      return new Response(JSON.stringify({ error: "No content config found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, unknown> = { fetched: [], errors: [] };

    // ── Fetch YouTube videos if enabled ──
    if (config.auto_youtube_enabled) {
      // Daily Murli video
      if (config.murli_youtube_channel_id) {
        try {
          const videos = await fetchYouTubeRSS(config.murli_youtube_channel_id);
          if (videos.length > 0) {
            const latest = videos[0];
            await supabase.from("auto_content_cache").upsert({
              cache_key: "murli_video",
              content: latest,
              fetched_at: new Date().toISOString(),
            }, { onConflict: "cache_key" });
            results.fetched.push("murli_video");
          }
        } catch (e) {
          results.errors.push(`murli_video: ${(e as Error).message}`);
        }
      }

      // Podcast video
      if (config.podcast_youtube_channel_id) {
        try {
          const videos = await fetchYouTubeRSS(config.podcast_youtube_channel_id);
          if (videos.length > 0) {
            const latest = videos[0];
            await supabase.from("auto_content_cache").upsert({
              cache_key: "podcast_video",
              content: latest,
              fetched_at: new Date().toISOString(),
            }, { onConflict: "cache_key" });
            results.fetched.push("podcast_video");
          }
        } catch (e) {
          results.errors.push(`podcast_video: ${(e as Error).message}`);
        }
      }

      // Live stream video
      if (config.live_youtube_channel_id) {
        try {
          const videos = await fetchYouTubeRSS(config.live_youtube_channel_id);
          const liveVideo = videos.find((v) => v.isLive) || null;
          const content = liveVideo || { videoId: "", title: "", url: "", thumbnail: "", publishedAt: "", isLive: false };
          await supabase.from("auto_content_cache").upsert({
            cache_key: "live_video",
            content,
            fetched_at: new Date().toISOString(),
          }, { onConflict: "cache_key" });
          results.fetched.push("live_video");
        } catch (e) {
          results.errors.push(`live_video: ${(e as Error).message}`);
        }
      }
    }

    // ── Extract Varadan if enabled ──
    if (config.auto_varadan_enabled && config.murli_source_url) {
      try {
        const rawText = await fetchMurliText(config.murli_source_url);
        const extracted = extractVaradan(rawText);
        if (extracted) {
          await supabase.from("auto_content_cache").upsert({
            cache_key: "varadan_text",
            content: { textMl: extracted.varadanMl, text: extracted.varadanEn },
            fetched_at: new Date().toISOString(),
          }, { onConflict: "cache_key" });
          await supabase.from("auto_content_cache").upsert({
            cache_key: "full_murli",
            content: { fullText: extracted.fullText },
            fetched_at: new Date().toISOString(),
          }, { onConflict: "cache_key" });
          results.fetched.push("varadan_text", "full_murli");
        } else {
          results.errors.push("varadan_text: Could not extract Varadan section from source");
        }
      } catch (e) {
        results.errors.push(`varadan: ${(e as Error).message}`);
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
