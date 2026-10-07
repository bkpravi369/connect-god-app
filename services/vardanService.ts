import { getTodayISTDateString, getFormattedMurliDate } from './murliService';
import { getDateStampedJSON, setDateStampedJSON } from '@/lib/storage';

const VARDAN_CACHE_KEY = 'connectgod_extracted_vardan_v6';

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
 * Identifies and rejects generic, hardcoded, or outdated template blessings.
 */
export function isGenericVaradan(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return true;
  const s = str.trim();
  if (s.includes('സർവ്വ ഖജനാവുകളാലും സമ്പന്നമായി') || s.includes('സർവ്വ ഖജനാവുകളാലും')) return true;
  if (s.includes('സ്വന്തം സ്മൃതി, മനോവൃത്തി') || s.includes('സ്മൃതി, മനോവൃത്തി')) return true;
  if (s.includes('സാധാരണതയിലൂടെ') || s.includes('സാധാരണത')) return true;
  return false;
}

/**
 * Robust extractor to isolate ONLY the Varadanam blessing title sentence from raw Murli HTML.
 * 1. Locates "വരദാനം" strictly when it appears as a section heading (e.g. "വരദാനം :-", "വരദാനം:").
 *    Mid-sentence words (e.g. in Sunday Murli discourse) are strictly ignored.
 * 2. If the input does not have a section heading but is already an extracted Malayalam blessing,
 *    it cleans and formats the single sentence directly.
 * 3. Extracts ONLY the first title sentence immediately following it, stopping strictly at the very
 *    first full stop (.) or sentence terminator, discarding the explanation paragraph below it.
 * 4. Trims leading hyphens, colons, or whitespace so only the clean single blessing title sentence is returned.
 * 5. Rejects Hindi / English and enforces Malayalam script.
 */
export function extractVardanFromHtml(rawHtml: string): string {
  try {
    if (!rawHtml || typeof rawHtml !== 'string') return '';

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
    const headingRegex =
      /(?:^|[^\p{L}\p{N}])(?:വരദാനം|വരദാൻ)\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*([\s\S]*?)(?=(?:\n\s*(?:സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|വിശദീകരണം)|സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|വിശദീകരണം|$))/iu;

    let contentToParse = '';
    const match = text.match(headingRegex);
    if (match && match[1]) {
      contentToParse = match[1];
    } else if (/^(?:വരദാനം|വരദാൻ)\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*/iu.test(text.trim())) {
      contentToParse = text
        .trim()
        .replace(/^(?:വരദാനം|വരദാൻ)\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*/iu, '');
    } else if (!text.includes('വരദാനം') && isMalayalamText(text) && text.trim().length > 15) {
      // Handles pre-extracted blessing sentences (e.g. from /api/get-murli)
      contentToParse = text.trim();
    }

    if (!contentToParse) {
      return '';
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

    if (isMalayalamText(titleSentence) && titleSentence.length > 15 && !isGenericVaradan(titleSentence)) {
      return titleSentence;
    }

    return '';
  } catch (err) {
    console.warn('[VardanService] extractVardanFromHtml error:', err);
    return '';
  }
}

/**
 * Asynchronously fetches today's live Murli HTML with cache busting and extracts ONLY the Vardan text.
 * Strictly consumes Malayalam language data and ignores Hindi/English.
 * Appends a dynamic query parameter based on the current date (YYYY-MM-DD) to the fetch request URL.
 */
export async function fetchDailyVardanFromMurli(forceRefresh = false): Promise<string> {
  try {
    const targetDate = getTodayISTDateString() || new Date().toISOString().split('T')[0];
    const { ddmmyy } = getFormattedMurliDate(targetDate);
    const cacheKey = `${VARDAN_CACHE_KEY}_${targetDate}`;

    // 1. Return cached Vardan for instant 0-second loading if valid Malayalam, non-generic, and not force-refreshing
    if (!forceRefresh) {
      try {
        const cached = getDateStampedJSON<any>(cacheKey, targetDate, null);
        const cachedStr = typeof cached === 'string' ? cached : cached?.textMl || cached?.vardan || '';
        if (cachedStr && typeof cachedStr === 'string' && cachedStr.trim().length > 15 && isMalayalamText(cachedStr) && !isGenericVaradan(cachedStr)) {
          const sanitized = extractVardanFromHtml(cachedStr);
          if (sanitized && sanitized.length > 15 && isMalayalamText(sanitized) && !isGenericVaradan(sanitized)) {
            return sanitized;
          }
          return cachedStr.trim();
        }
      } catch {
        // Safe continue
      }
    }

    // 2. Dynamic cache buster with current date YYYY-MM-DD ensuring fresh fetch from live network
    const cacheBuster = `date_ymd=${encodeURIComponent(targetDate)}&_t=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Candidate URLs in priority order: STRICTLY MALAYALAM ONLY (No Hindi/English fallback)
    const candidates = [
      `/api/get-murli?lang=ml&date=${encodeURIComponent(ddmmyy)}&${cacheBuster}`,
      `https://connect-god-app.vercel.app/api/get-murli?lang=ml&date=${encodeURIComponent(ddmmyy)}&${cacheBuster}`,
      `https://app.bkkozhikode.com/api/get-murli?lang=ml&date=${encodeURIComponent(ddmmyy)}&${cacheBuster}`,
      `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/01.%20Malayalam%20Murli%20-%20Htm/${ddmmyy}-Mal.htm?${cacheBuster}`,
      `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/01.%20Malayalam%20Murli%20-%20Htm/${ddmmyy}-Malayalam.htm?${cacheBuster}`,
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }).catch(() => null);

        if (!res || !res.ok) continue;

        let htmlContent = '';
        const contentType = res.headers?.get?.('content-type') || '';

        if (contentType.includes('application/json')) {
          const json = await res.json().catch(() => null);
          if (json?.vardan && typeof json.vardan === 'string' && json.vardan.length > 15 && isMalayalamText(json.vardan) && !isGenericVaradan(json.vardan)) {
            const cleanTitle = extractVardanFromHtml(json.vardan);
            if (cleanTitle && isMalayalamText(cleanTitle) && !isGenericVaradan(cleanTitle)) {
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
          if (extracted && extracted.length > 15 && isMalayalamText(extracted) && !isGenericVaradan(extracted)) {
            setDateStampedJSON(cacheKey, targetDate, extracted);
            return extracted;
          }
        }
      } catch (innerErr) {
        console.warn(`[VardanService] Non-fatal candidate error for ${url}:`, innerErr);
      }
    }

    // Check existing date stamped storage, verifying it is strictly Malayalam and non-generic
    try {
      const existing = getDateStampedJSON<any>(cacheKey, targetDate, null);
      const existingStr = typeof existing === 'string' ? existing : existing?.textMl || '';
      if (existingStr && typeof existingStr === 'string' && existingStr.length > 15 && isMalayalamText(existingStr) && !isGenericVaradan(existingStr)) {
        return existingStr;
      }
    } catch {
      // Safe continue
    }

    return '';
  } catch (err) {
    console.warn('[VardanService] fetchDailyVardanFromMurli error:', err);
    return '';
  }
}
