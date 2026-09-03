import { getTodayISTDateString, getFormattedMurliDate } from './murliService';
import { getDateStampedJSON, setDateStampedJSON } from '@/lib/storage';

const VARDAN_CACHE_KEY = 'connectgod_extracted_vardan';

export const FALLBACK_VARADAN_ML =
  'സർവ്വ ഖജനാവുകളാലും സമ്പന്നമായി, മാസ്റ്റർ ദാതാവായി മാറി സർവ്വ ആത്മാക്കൾക്കും ശാന്തിയുടെയും ശക്തിയുടെയും ദാനം നൽകുന്ന സദാ തൃപ്ത ആത്മാവായി ഭവിക്കട്ടെ.';

/**
 * Robust extractor to isolate ONLY the Vardan blessing text from raw Murli HTML.
 * Matches headings like "വരദാനം:", "വരദാനം :-", "वरदान:", "Varadan:", "Blessing:".
 * Completely eliminates any external or manual JSON file dependency.
 */
export function extractVardanFromHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  // 1. Decode numeric & named HTML entities (e.g. &#3381;...)
  const decoded = rawHtml
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  // 2. Strip HTML tags to get pure text stream
  const clean = decoded.replace(/<[^>]*>?/gm, ' ');

  // 3. Extract the Vardan block between the Vardan heading and following sections (Explanation, Slogan, Mateshwari, etc.)
  const regex =
    /(?:വരദാനം|വരദാനം\s*:|വരദാനം\s*:-|वरदान|वरदान\s*:|वरदान\s*:-|Varadan|Blessing)\s*[:\-–]?\s*([\s\S]*?)(?=(?:വിശദീകരണം|സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|സ്ലോഗൻ\s*:|സ്ലോഗന്\s*:-|മാതേശ്വരി|അവ്യക്ത|धारणा|स्पष्टीकरण|$))/i;

  const match = clean.match(regex);
  if (!match || !match[1]) return '';

  let vardan = match[1]
    .replace(/^[:\-–\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Extract the primary divine blessing sentence ending with 'ഭവിക്കട്ടെ.', 'ആകട്ടെ.', 'ഭവ:', or 'भव।'
  const sentenceMatch = vardan.match(/^([\s\S]*?(?:ഭവിക്കട്ടെ|ആകട്ടെ|ഭവ:|भव)[.।]?)/i);
  if (sentenceMatch && sentenceMatch[1].trim().length > 15) {
    vardan = sentenceMatch[1].trim();
  }

  return vardan;
}

/**
 * Asynchronously fetches today's live Murli HTML with cache busting and extracts ONLY the Vardan text.
 * Strictly avoids manual JSON files.
 */
export async function fetchDailyVardanFromMurli(forceRefresh = false): Promise<string> {
  const targetDate = getTodayISTDateString();
  const { ddmmyy } = getFormattedMurliDate(targetDate);
  const cacheKey = `${VARDAN_CACHE_KEY}_${ddmmyy}`;

  // 1. Return cached Vardan for instant 0-second loading if valid and not force-refreshing
  if (!forceRefresh) {
    const cached = getDateStampedJSON<string | null>(cacheKey, targetDate, null);
    if (cached && cached.trim().length > 15 && cached !== FALLBACK_VARADAN_ML) {
      return cached;
    }
  }

  // 2. Unique cache buster ensuring fresh fetch from live network
  const cacheBuster = `t=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Candidate URLs in priority order
  const candidates = [
    // Primary: In-project Vercel Serverless proxy (avoids CORS in web browser)
    `/api/get-murli?lang=ml&date=${encodeURIComponent(ddmmyy)}&${cacheBuster}`,
    // Fallback 1: Production URL
    `https://app.bkkozhikode.com/api/get-murli?lang=ml&date=${encodeURIComponent(ddmmyy)}&${cacheBuster}`,
    // Fallback 2: Direct BabaMurli source
    `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/01.%20Malayalam%20Murli%20-%20Htm/${ddmmyy}-Mal.htm?${cacheBuster}`,
    // Fallback 3: Hindi Murli if Malayalam is not yet published early morning
    `/api/get-murli?lang=hi&date=${encodeURIComponent(ddmmyy)}&${cacheBuster}`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });

      if (!res.ok) continue;

      let htmlContent = '';
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (json?.vardan && json.vardan.length > 15) {
          setDateStampedJSON(cacheKey, targetDate, json.vardan);
          return json.vardan;
        }
        htmlContent = json?.html || '';
      } else {
        htmlContent = await res.text();
      }

      if (htmlContent && htmlContent.length > 100) {
        const extracted = extractVardanFromHtml(htmlContent);
        if (extracted && extracted.length > 15) {
          setDateStampedJSON(cacheKey, targetDate, extracted);
          return extracted;
        }
      }
    } catch (err) {
      console.warn(`[VardanService] Error fetching from ${url}:`, err);
    }
  }

  // If already in memory or previous date cache, return it
  const existing = getDateStampedJSON<string | null>(cacheKey, targetDate, null);
  if (existing && existing.length > 15) return existing;

  return FALLBACK_VARADAN_ML;
}
