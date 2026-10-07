import { getTodayISTDateString, getFormattedMurliDate } from './murliService';
import { getDateStampedJSON, setDateStampedJSON } from '@/lib/storage';

const VARDAN_CACHE_KEY = 'connectgod_extracted_vardan_v5';

export const FALLBACK_VARADAN_ML =
  'സർവ്വ ഖജനാവുകളാലും സമ്പന്നമായി, മാസ്റ്റർ ദാതാവായി മാറി സർവ്വ ആത്മാക്കൾക്കും ശാന്തിയുടെയും ശക്തിയുടെയും ദാനം നൽകുന്ന സദാ തൃപ്ത ആത്മാവായി ഭവിക്കട്ടെ.';

/**
 * Validates that the provided text is strictly Malayalam and does not contain Devanagari (Hindi) script.
 */
export function isMalayalamText(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const hasMalayalam = /[\u0D00-\u0D7F]/.test(str);
  const hasHindi = /[\u0900-\u097F]/.test(str);
  return hasMalayalam && !hasHindi;
}

/**
 * Robust extractor to isolate ONLY the Varadanam blessing title sentence from raw Murli HTML.
 * 1. Locates "വരദാനം" strictly when it appears as a section heading (e.g. "വരദാനം :-", "വരദാനം:").
 *    Mid-sentence words (e.g. in Sunday Murli discourse) are strictly ignored.
 * 2. Extracts ONLY the first title sentence immediately following it, stopping strictly at the very
 *    first full stop (.) or sentence terminator, discarding the explanation paragraph below it.
 * 3. Trims leading hyphens, colons, or whitespace so only the clean single blessing title sentence is returned.
 * 4. Rejects Hindi / English and enforces Malayalam script.
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
      .replace(/<\/(p|div|tr|h[1-6]|font|span)>/gi, '\n')
      .replace(/<(p|div|tr|h[1-6])[^>]*>/gi, '\n\n')
      .replace(/<[^>]*>?/gm, ' ');

    // 2. Locate "വരദാനം" strictly when it appears as a section heading (e.g. "വരദാനം :-" or "വരദാനം:").
    // Must be preceded by non-letter / start-of-line / whitespace,
    // and followed strictly by heading punctuation (":-", ": -", "-:", ":", "-", "–").
    // Mid-sentence words in Murli discourse are strictly excluded.
    // Note: 'അവ്യക്ത' is intentionally omitted from lookahead delimiters because blessing sentences
    // frequently contain the word 'അവ്യക്ത' (e.g. 'അവ്യക്ത ശാന്ത സ്വരൂപത്തിലൂടെ...').
    const headingRegex =
      /(?:^|[^\p{L}\p{N}])വരദാനം\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*([\s\S]*?)(?=(?:\n\s*(?:സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|വിശദീകരണം)|സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|വിശദീകരണം|$))/iu;

    let contentToParse = '';
    const match = text.match(headingRegex);
    if (match && match[1]) {
      contentToParse = match[1];
    } else if (/^വരദാനം\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*/i.test(text.trim())) {
      contentToParse = text
        .trim()
        .replace(/^വരദാനം\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*/i, '');
    }

    if (!contentToParse) {
      return FALLBACK_VARADAN_ML;
    }

    // 3. Trim leading hyphens, colons, or whitespace
    let remaining = contentToParse.replace(/^[:\-–\s]+/, '').trim();

    // 4. Extract ONLY the first title sentence immediately following it:
    // - Check for blessing benediction word ('ഭവിക്കട്ടെ', 'ഭവിക്കുക', 'ആകട്ടെ', 'ഭവിപ്പൂതാക', 'ഭവ:')
    // - Stop strictly at the first full stop (.) or sentence terminator, or paragraph break
    let titleSentence = '';
    const benedictionMatch = remaining.match(/^([\s\S]*?(?:ഭവിക്കട്ടെ|ഭവിക്കുക|ആകട്ടെ|ഭവിപ്പൂതാക|ഭവ:)[.!\u0964]?)/i);
    if (benedictionMatch && benedictionMatch[1] && benedictionMatch[1].trim().length > 15) {
      titleSentence = benedictionMatch[1].trim();
    } else {
      const dotIdx = remaining.indexOf('.');
      const newlineIdx = remaining.indexOf('\n');
      if (dotIdx !== -1 && (newlineIdx === -1 || dotIdx < newlineIdx)) {
        titleSentence = remaining.slice(0, dotIdx + 1).trim();
      } else if (newlineIdx !== -1) {
        titleSentence = remaining.slice(0, newlineIdx).trim();
      } else {
        titleSentence = remaining.trim();
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

    if (isMalayalamText(titleSentence) && titleSentence.length > 15) {
      return titleSentence;
    }

    return FALLBACK_VARADAN_ML;
  } catch (err) {
    console.warn('[VardanService] extractVardanFromHtml error:', err);
    return FALLBACK_VARADAN_ML;
  }
}

/**
 * Asynchronously fetches today's live Murli HTML with cache busting and extracts ONLY the Vardan text.
 * Strictly consumes Malayalam language data and ignores Hindi/English.
 */
export async function fetchDailyVardanFromMurli(forceRefresh = false): Promise<string> {
  try {
    const targetDate = getTodayISTDateString() || new Date().toISOString().split('T')[0];
    const { ddmmyy } = getFormattedMurliDate(targetDate);
    const cacheKey = `${VARDAN_CACHE_KEY}_${ddmmyy || 'today'}`;

    // 1. Return cached Vardan for instant 0-second loading if valid Malayalam and not force-refreshing
    if (!forceRefresh) {
      try {
        const cached = getDateStampedJSON<any>(cacheKey, targetDate, null);
        const cachedStr = typeof cached === 'string' ? cached : cached?.textMl || cached?.vardan || '';
        if (cachedStr && typeof cachedStr === 'string' && cachedStr.trim().length > 15 && isMalayalamText(cachedStr)) {
          const sanitized = extractVardanFromHtml(cachedStr);
          if (sanitized && sanitized.length > 15 && isMalayalamText(sanitized) && sanitized !== FALLBACK_VARADAN_ML) {
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

    // Candidate URLs in priority order: STRICTLY MALAYALAM ONLY (No Hindi/English fallback)
    const candidates = [
      `/api/get-murli?lang=ml&date=${encodeURIComponent(ddmmyy)}&${cacheBuster}`,
      `https://app.bkkozhikode.com/api/get-murli?lang=ml&date=${encodeURIComponent(ddmmyy)}&${cacheBuster}`,
      `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/01.%20Malayalam%20Murli%20-%20Htm/${ddmmyy}-Mal.htm?${cacheBuster}`,
      `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/01.%20Malayalam%20Murli%20-%20Htm/${ddmmyy}-Malayalam.htm?${cacheBuster}`,
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
          if (json?.vardan && typeof json.vardan === 'string' && json.vardan.length > 15 && isMalayalamText(json.vardan)) {
            const cleanTitle = extractVardanFromHtml(json.vardan);
            if (cleanTitle && isMalayalamText(cleanTitle) && cleanTitle !== FALLBACK_VARADAN_ML) {
              setDateStampedJSON(cacheKey, targetDate, cleanTitle);
              return cleanTitle;
            }
          }
          htmlContent = json?.html || '';
        } else {
          htmlContent = await res.text().catch(() => '');
        }

        if (htmlContent && typeof htmlContent === 'string' && htmlContent.length > 100) {
          const extracted = extractVardanFromHtml(htmlContent);
          if (extracted && extracted.length > 15 && isMalayalamText(extracted) && extracted !== FALLBACK_VARADAN_ML) {
            setDateStampedJSON(cacheKey, targetDate, extracted);
            return extracted;
          }
        }
      } catch (innerErr) {
        console.warn(`[VardanService] Non-fatal candidate error for ${url}:`, innerErr);
      }
    }

    // Check existing date stamped storage, verifying it is strictly Malayalam
    try {
      const existing = getDateStampedJSON<any>(cacheKey, targetDate, null);
      const existingStr = typeof existing === 'string' ? existing : existing?.textMl || '';
      if (existingStr && typeof existingStr === 'string' && existingStr.length > 15 && isMalayalamText(existingStr)) {
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
