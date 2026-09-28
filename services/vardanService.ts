import { getTodayISTDateString, getFormattedMurliDate } from './murliService';
import { getDateStampedJSON, setDateStampedJSON } from '@/lib/storage';

const VARDAN_CACHE_KEY = 'connectgod_extracted_vardan_v4';

export const FALLBACK_VARADAN_ML =
  'സർവ്വ ഖജനാവുകളാലും സമ്പന്നമായി, മാസ്റ്റർ ദാതാവായി മാറി സർവ്വ ആത്മാക്കൾക്കും ശാന്തിയുടെയും ശക്തിയുടെയും ദാനം നൽകുന്ന സദാ തൃപ്ത ആത്മാവായി ഭവിക്കട്ടെ.';

/**
 * Robust extractor to isolate ONLY the Varadanam blessing title sentence from raw Murli HTML.
 * 1. Locates "വരദാനം" strictly when it appears as a section heading (e.g. "വരദാനം :-", "വരദാനം:").
 *    Mid-sentence words (e.g. in Sunday Murli discourse) are strictly ignored.
 * 2. Extracts ONLY the first title sentence immediately following it, stopping strictly at the very
 *    first full stop (.) or sentence terminator, discarding the explanation paragraph below it.
 * 3. Trims leading hyphens, colons, or whitespace so only the clean single blessing title sentence is returned.
 */
export function extractVardanFromHtml(rawHtml: string): string {
  try {
    if (!rawHtml || typeof rawHtml !== 'string') return FALLBACK_VARADAN_ML;

    // 1. Safely decode numeric & named HTML entities
    let text = rawHtml
      .replace(/&#(\d+);/g, (_, code) => {
        try {
          return String.fromCharCode(Number(code));
        } catch {
          return '';
        }
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => {
        try {
          return String.fromCharCode(parseInt(code, 16));
        } catch {
          return '';
        }
      })
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      // Convert block & line break tags to newlines to preserve sentence and paragraph boundaries
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n\n')
      .replace(/<(p|div|tr|h[1-6])[^>]*>/gi, '\n')
      .replace(/<[^>]*>?/gm, ' ');

    // 2. Locate "വരദാനം" strictly when it appears as a section heading.
    // Must be preceded by non-letter / start-of-line / whitespace,
    // and followed strictly by heading punctuation (":-", ": -", "-:", ":", "-", "–").
    // Must NOT match mid-sentence words.
    const headingRegex =
      /(?:^|[^\p{L}\p{N}])(?:വരദാനം|വരദാൻ|Varadan|Blessing|वरदान)\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*([\s\S]*?)(?=(?:\n\s*(?:സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|അവ്യക്ത|വിശദീകരണം)|സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|അവ്യക്ത|धारणा|स्पष्टीकरण|$))/iu;

    let contentToParse = text;
    const match = text.match(headingRegex);
    if (match && match[1]) {
      contentToParse = match[1];
    } else if (/^(?:വരദാനം|വരദാൻ|Varadan|Blessing|वरदान)/i.test(text.trim())) {
      contentToParse = text
        .trim()
        .replace(/^(?:വരദാനം|വരദാൻ|Varadan|Blessing|वरदान)\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*/iu, '');
    }

    // 3. Trim leading hyphens, colons, or whitespace
    let remaining = contentToParse.replace(/^[:\-–\s]+/, '').trim();

    // 4. Extract ONLY the first title sentence immediately following it:
    // - Check for blessing benediction word ('ഭവിക്കട്ടെ', 'ആകട്ടെ', 'ഭവ:', 'भव')
    // - Stop strictly at the first full stop (.) or sentence terminator, or paragraph break
    let titleSentence = '';
    const benedictionMatch = remaining.match(/^([\s\S]*?(?:ഭവിക്കട്ടെ|ആകട്ടെ|ഭവ:|भव)[.!\u0964]?)/i);
    if (benedictionMatch && benedictionMatch[1] && benedictionMatch[1].trim().length > 15) {
      titleSentence = benedictionMatch[1].trim();
    } else {
      const stopMatch = remaining.match(/^([\s\S]*?(?:[.!\u0964]|\n\s*\n))/);
      if (stopMatch && stopMatch[1] && stopMatch[1].trim().length > 15) {
        titleSentence = stopMatch[1].trim();
      } else {
        const dotIdx = remaining.indexOf('.');
        titleSentence = dotIdx !== -1 ? remaining.slice(0, dotIdx + 1).trim() : remaining;
      }
    }

    // Clean formatting and trim leading punctuation
    titleSentence = titleSentence
      .replace(/^[:\-–\s]+/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (titleSentence && !/[.!\u0964]$/.test(titleSentence)) {
      titleSentence += '.';
    }

    return titleSentence && titleSentence.length > 15 ? titleSentence : FALLBACK_VARADAN_ML;
  } catch (err) {
    console.warn('[VardanService] extractVardanFromHtml error:', err);
    return FALLBACK_VARADAN_ML;
  }
}

/**
 * Asynchronously fetches today's live Murli HTML with cache busting and extracts ONLY the Vardan text.
 * Completely immune to unhandled network exceptions and missing properties.
 */
export async function fetchDailyVardanFromMurli(forceRefresh = false): Promise<string> {
  try {
    const targetDate = getTodayISTDateString() || new Date().toISOString().split('T')[0];
    const { ddmmyy } = getFormattedMurliDate(targetDate);
    const cacheKey = `${VARDAN_CACHE_KEY}_${ddmmyy || 'today'}`;

    // 1. Return cached Vardan for instant 0-second loading if valid and not force-refreshing
    if (!forceRefresh) {
      try {
        const cached = getDateStampedJSON<any>(cacheKey, targetDate, null);
        const cachedStr = typeof cached === 'string' ? cached : cached?.textMl || cached?.vardan || '';
        if (cachedStr && typeof cachedStr === 'string' && cachedStr.trim().length > 15 && cachedStr !== FALLBACK_VARADAN_ML) {
          const sanitized = extractVardanFromHtml(cachedStr);
          if (sanitized && sanitized.length > 15 && sanitized !== FALLBACK_VARADAN_ML) {
            return sanitized;
          }
          return cachedStr.trim();
        }
      } catch {
        // Safe continue
      }
    }

    // 2. Unique cache buster ensuring fresh fetch from live network
    const cacheBuster = `t=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Candidate URLs in priority order
    const candidates = [
      `/api/get-murli?lang=ml&date=${encodeURIComponent(ddmmyy)}&${cacheBuster}`,
      `https://app.bkkozhikode.com/api/get-murli?lang=ml&date=${encodeURIComponent(ddmmyy)}&${cacheBuster}`,
      `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/01.%20Malayalam%20Murli%20-%20Htm/${ddmmyy}-Mal.htm?${cacheBuster}`,
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
        }).catch(() => null);

        if (!res || !res.ok) continue;

        let htmlContent = '';
        const contentType = res.headers?.get?.('content-type') || '';

        if (contentType.includes('application/json')) {
          const json = await res.json().catch(() => null);
          if (json?.vardan && typeof json.vardan === 'string' && json.vardan.length > 15) {
            setDateStampedJSON(cacheKey, targetDate, json.vardan);
            return json.vardan;
          }
          htmlContent = json?.html || '';
        } else {
          htmlContent = await res.text().catch(() => '');
        }

        if (htmlContent && typeof htmlContent === 'string' && htmlContent.length > 100) {
          const extracted = extractVardanFromHtml(htmlContent);
          if (extracted && extracted.length > 15 && extracted !== FALLBACK_VARADAN_ML) {
            setDateStampedJSON(cacheKey, targetDate, extracted);
            return extracted;
          }
        }
      } catch (innerErr) {
        console.warn(`[VardanService] Non-fatal candidate error for ${url}:`, innerErr);
      }
    }

    // Check existing date stamped storage
    try {
      const existing = getDateStampedJSON<any>(cacheKey, targetDate, null);
      const existingStr = typeof existing === 'string' ? existing : existing?.textMl || '';
      if (existingStr && typeof existingStr === 'string' && existingStr.length > 15) {
        return existingStr;
      }
    } catch {
      // Safe continue
    }

    return FALLBACK_VARADAN_ML;
  } catch (err) {
    console.warn('[VardanService] fetchDailyVardanFromMurli error:', err);
    return FALLBACK_VARADAN_ML;
  }
}
