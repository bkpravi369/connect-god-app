import { getJSON, setJSON, removeItem, getDateStampedJSON, setDateStampedJSON, purgeStaleStorageKeys } from '@/lib/storage';
import varadanamData from '@/src/data/varadanam.json';
import {
  DEFAULT_MURLI_CONFIG,
  DEFAULT_VARADAN,
  MURLI_TODAY,
  STORAGE_KEYS,
  Varadan,
  driveToStreamingUrl,
} from '@/lib/constants';

export type StructuredMurli = {
  date: string;
  formattedDateMl: string;
  formattedDateEn: string;
  formattedDateGb: string;
  ddmmyy: string;
  ddmmyyyy: string;
  titleMl: string;
  titleEn: string;
  titleHi?: string;
  essenceMl: string;
  essenceEn: string;
  essenceHi?: string;
  questionAnswerMl?: string;
  questionAnswerEn?: string;
  questionAnswerHi?: string;
  songMl?: string;
  songEn?: string;
  songHi?: string;
  discourseMl?: string;
  discourseEn?: string;
  discourseHi?: string;
  dharnaMl?: string;
  dharnaEn?: string;
  dharnaHi?: string;
  varadanSnippetMl: string;
  varadanSnippetEn: string;
  varadanSnippetHi?: string;
  blessingFullMl: string;
  blessingFullEn: string;
  blessingFullHi?: string;
  sloganMl: string;
  sloganEn: string;
  sloganHi?: string;
  mateshwarijiMl?: string;
  mateshwarijiEn?: string;
  mateshwarijiHi?: string;
  fullTextMl: string;
  fullTextEn: string;
  fullTextHi?: string;
  audioUrl: string;
  pdfUrl: string;
};

const MURLI_CACHE_PREFIX = 'connectgod_murli_parsed_';

/**
 * Returns current Date string (YYYY-MM-DD) resolved dynamically in Indian Standard Time (IST).
 */
export function getTodayISTDateString(): string {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch {
    const ist = getISTDate();
    const month = String(ist.getMonth() + 1).padStart(2, '0');
    const day = String(ist.getDate()).padStart(2, '0');
    return `${ist.getFullYear()}-${month}-${day}`;
  }
}

/**
 * Returns current Date resolved dynamically in Indian Standard Time (IST, UTC+5:30).
 */
export function getISTDate(date?: Date | string): Date {
  if (typeof date === 'string' && date.includes('-')) {
    const parts = date.split('-').map(Number);
    if (parts.length === 3) {
      return new Date(parts[0], parts[1] - 1, parts[2], 5, 30, 0);
    }
  }
  const base = date instanceof Date ? date : new Date();
  const utc = base.getTime() + base.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

/**
 * Generates formatted date strings for today's Murli (DD.MM.YY, Malayalam & English titles, DD/MM/YYYY) in IST.
 */
export function getFormattedMurliDate(date: Date | string = getTodayISTDateString()): {
  isoDate: string;
  ddmmyy: string;
  ddmmyyyy: string;
  formattedDateGb: string;
  malayalamDate: string;
  malayalamDateSimple: string;
  englishDate: string;
  day: string;
  month: string;
  shortYear: string;
  fullYear: number;
} {
  const ist = getISTDate(typeof date === 'string' ? date : date);
  const day = String(ist.getDate()).padStart(2, '0');
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const fullYear = ist.getFullYear();
  const shortYear = String(fullYear).slice(-2);

  const monthsMl = [
    'ജനുവരി', 'ഫെബ്രുവരി', 'മാർച്ച്', 'ഏപ്രിൽ', 'മേയ്', 'ജൂൺ',
    'ജൂലൈ', 'ആഗസ്റ്റ്', 'സെപ്റ്റംബർ', 'ഒക്ടോബർ', 'നവംബർ', 'ഡിസംബർ'
  ];
  const monthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysMl = ['ഞായർ', 'തിങ്കൾ', 'ചൊവ്വ', 'ബുധൻ', 'വ്യാഴം', 'വെള്ളി', 'ശനി'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const isoDate = `${fullYear}-${month}-${day}`;
  const ddmmyy = `${day}.${month}.${shortYear}`;
  const ddmmyyyy = `${day}.${month}.${fullYear}`;
  const formattedDateGb = `${day}/${month}/${fullYear}`; // DD/MM/YYYY in IST
  const malayalamDate = `${ist.getDate()} ${monthsMl[ist.getMonth()]} ${fullYear} (${daysMl[ist.getDay()]})`;
  const malayalamDateSimple = `${ist.getDate()} ${monthsMl[ist.getMonth()]} ${fullYear}`;
  const englishDate = `${ist.getDate()} ${monthsEn[ist.getMonth()]} ${fullYear} (${daysEn[ist.getDay()]})`;

  return {
    isoDate,
    ddmmyy,
    ddmmyyyy,
    formattedDateGb,
    malayalamDate,
    malayalamDateSimple,
    englishDate,
    day,
    month,
    shortYear,
    fullYear,
  };
}

/**
 * Resolves the official Murli MP3 streaming audio URL dynamically based on language and IST date.
 * Exactly follows bkdrluhar.com structure:
 * - Malayalam: https://bkdrluhar.com/00.%20Mp3/06.%20Malayalam/${formattedDate}.mp3
 * - Hindi:     https://bkdrluhar.com/00.%20Mp3/01.%20Hindi/${formattedDate}.mp3
 * - English:   https://bkdrluhar.com/00.%20Mp3/02.%20English/${formattedDate}.mp3
 */
export function getDailyAudioUrl(lang: 'ml' | 'en' | 'hi' = 'ml', date: Date | string = getTodayISTDateString()): string {
  const { ddmmyy } = getFormattedMurliDate(date);
  if (lang === 'hi') {
    return `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/03.%20Hindi%20Murli%20-%20MP3/${ddmmyy}-H.mp3`;
  }
  if (lang === 'en') {
    return `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/04.%20Eng%20Murli%20-%20MP3%20-%20UK/${ddmmyy}-E.mp3`;
  }
  return `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/03.%20Malayalam%20Murli%20-%20MP3/${ddmmyy}-Mal.mp3`;
}

export function getDailyPdfUrl(lang: 'ml' | 'en' | 'hi' = 'ml', date: Date | string = getTodayISTDateString()): string {
  const { ddmmyy } = getFormattedMurliDate(date);
  if (lang === 'hi') {
    return `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/02.%20Hindi%20Murli%20-%20Pdf/${ddmmyy}-h.pdf`;
  }
  if (lang === 'en') {
    return `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/02.%20Eng%20Murli%20-%20Pdf/${ddmmyy}-E.pdf`;
  }
  return `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/02.%20Malayalam%20Murli%20-%20Pdf/${ddmmyy}-Mal.pdf`;
}

export function getDailyHtmlUrl(lang: 'ml' | 'en' | 'hi' = 'ml', date: Date | string = getTodayISTDateString()): string {
  const { ddmmyy } = getFormattedMurliDate(date);
  if (lang === 'hi') {
    return `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/01.%20Hindi%20Murli%20-%20Htm/${ddmmyy}-H.htm`;
  }
  if (lang === 'en') {
    return `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/01.%20Eng%20Murli%20-%20Htm/${ddmmyy}-E.htm`;
  }
  return `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/01.%20Malayalam%20Murli%20-%20Htm/${ddmmyy}-Mal.htm`;
}

/**
 * Resolves the official Malayalam Murli MP3 streaming audio URL dynamically based on IST date.
 */
export function getDailyMalayalamAudioUrl(date: Date | string = getTodayISTDateString()): string {
  return getDailyAudioUrl('ml', date);
}

/**
 * Resolves the official Malayalam Murli PDF URL dynamically based on IST date.
 */
export function getDailyMalayalamPdfUrl(date: Date | string = getTodayISTDateString()): string {
  return getDailyPdfUrl('ml', date);
}

/**
 * Resolves the official Malayalam Murli HTML URL dynamically based on IST date.
 */
export function getDailyMalayalamHtmlUrl(date: Date | string = getTodayISTDateString()): string {
  return getDailyHtmlUrl('ml', date);
}

/**
 * Sanitizes raw Murli HTML from babamurli.com to create clean, responsive native typography:
 * - Strips outdated tables, colgroups, fixed widths, inline heights, and font-family overrides.
 * - Preserves spiritual color highlights (blue for essence, green for question, red/maroon for answer, purple for slogan).
 */
export function sanitizeMurliHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  let html = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<\/?(html|body|table|tbody|thead|tfoot|tr|td|th|colgroup|col|blockquote|center|meta|title)[^>]*>/gi, '')
    .replace(/width=([\"\x27])[^\"\x27]*\1/gi, '')
    .replace(/height=([\"\x27])[^\"\x27]*\1/gi, '')
    .replace(/bgcolor=([\"\x27])[^\"\x27]*\1/gi, '')
    .replace(/border=([\"\x27])[^\"\x27]*\1/gi, '')
    .replace(/cellspacing=([\"\x27])[^\"\x27]*\1/gi, '')
    .replace(/cellpadding=([\"\x27])[^\"\x27]*\1/gi, '')
    .replace(/class=([\"\x27])[^\"\x27]*\1/gi, '')
    .replace(/style=([\"\x27])[^\"\x27]*\1/gi, '')
    .replace(/face=([\"\x27])[^\"\x27]*\1/gi, '')
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br/><br/>')
    .replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, '')
    // Map spiritual colors to high-contrast modern palette
    .replace(/color=["']#?0000ff["']/gi, 'color="#1d4ed8"')
    .replace(/color=["']#?008000["']/gi, 'color="#15803d"')
    .replace(/color=["']#?(800000|990000|cc0000|ff0000|red|maroon)["']/gi, 'color="#991b1b"')
    .replace(/color=["']#?(ff00ff|800080|magenta|purple)["']/gi, 'color="#7e22ce"')
    .replace(/color=["']#?6600cc["']/gi, 'color="#6b21a8"');

  return html.trim();
}

// In-memory fallback cache
const MEMORY_MURLI_STORAGE: Record<string, string> = {};

/**
 * Retrieves persisted Murli text from localStorage (or in-memory cache on native)
 */
export function getStoredMurliText(dateStr: string, lang: string): string | null {
  const key = `murli_${dateStr}_${lang}`;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val && val.length > 100) return val;
    }
  } catch {}
  return MEMORY_MURLI_STORAGE[key] || null;
}

/**
 * Persists cleaned Murli text to localStorage (and in-memory cache)
 */
export function setStoredMurliText(dateStr: string, lang: string, content: string): void {
  if (!content || content.length < 100) return;
  const key = `murli_${dateStr}_${lang}`;
  MEMORY_MURLI_STORAGE[key] = content;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, content);
    }
  } catch {}
}

export interface DailyMurliSyncResult {
  success: boolean;
  date: string;
  formattedDate: string;
  heroData: {
    swaman: string;
    varadan: string;
    slogan: string;
    essence: string;
    date: string;
  };
  languages: {
    ml: { label: string; code: string; html: string; pdfUrl: string; audioUrl: string; htmlUrl: string };
    hi: { label: string; code: string; html: string; pdfUrl: string; audioUrl: string; htmlUrl: string };
    en: { label: string; code: string; html: string; pdfUrl: string; audioUrl: string; htmlUrl: string };
  };
}

/**
 * 100% In-Project Sync Engine: Fetches and caches today's live Murli, Swaman & Varadanam data.
 * Checks localStorage first for 0-second instant loading.
 */
export async function syncDailyMurliData(forceRefresh = false): Promise<DailyMurliSyncResult | null> {
  const targetDate = getTodayISTDateString();
  const { ddmmyy } = getFormattedMurliDate(targetDate);
  const cacheKey = `daily_murli_sync_${ddmmyy}`;

  // Purge any outdated daily cache from previous days
  purgeStaleStorageKeys(targetDate);

  // 1. Instant check from localStorage with date validation
  if (!forceRefresh) {
    const cached = getDateStampedJSON<DailyMurliSyncResult | null>(cacheKey, targetDate, null);
    if (cached && cached.heroData?.varadan) {
      return cached;
    }
  }

  // 2. Fetch from our in-project /api/daily-murli-sync serverless endpoint with cache buster
  const cacheBuster = `t=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const res = await fetch(`/api/daily-murli-sync?date=${encodeURIComponent(ddmmyy)}&${cacheBuster}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
    if (res.ok) {
      const data = (await res.json()) as DailyMurliSyncResult;
      if (data && data.success && data.heroData?.varadan) {
        setDateStampedJSON(cacheKey, targetDate, data);
        return data;
      }
    }
  } catch (err) {
    console.warn('[syncDailyMurliData] Error calling /api/daily-murli-sync:', err);
  }

  return null;
}

/**
 * Fetches and returns cleaned Murli HTML using our dedicated Vercel Serverless proxy (/api/get-murli)
 */
export async function fetchMurliHtmlContent(lang: string, date: string): Promise<string> {
  const cacheBuster = `t=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const apiUrl = `/api/get-murli?lang=${encodeURIComponent(lang)}&date=${encodeURIComponent(date)}&${cacheBuster}`;
    const res = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data.html) {
        return sanitizeMurliHtml(data.html);
      }
    }
  } catch (err) {
    console.warn('[fetchMurliHtmlContent] Error fetching from /api/get-murli:', err);
  }

  return '';
}

/**
 * Resolves the previous day IST date string (YYYY-MM-DD)
 */
export function getPreviousDayISTDateString(dateStr: string = getTodayISTDateString()): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    dt.setUTCDate(dt.getUTCDate() - 1);
    const prevY = dt.getUTCFullYear();
    const prevM = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const prevD = String(dt.getUTCDate()).padStart(2, '0');
    return `${prevY}-${prevM}-${prevD}`;
  } catch {
    return dateStr;
  }
}

export const CLOUDINARY_CLOUD_NAME = 'tb5bmwd5';

/**
 * Resolves the official Cloudinary Murli PDF URL strictly based on exact DD.MM.YY-Mal.pdf pattern.
 */
export function getCloudinaryMurliPdfUrl(
  lang: 'ml' | 'en' | 'hi' = 'ml',
  date: Date | string = getTodayISTDateString(),
  cloudName: string = CLOUDINARY_CLOUD_NAME
): string {
  const { ddmmyy } = getFormattedMurliDate(date);
  const langSuffix = lang === 'hi' ? 'Hin' : lang === 'en' ? 'Eng' : 'Mal';
  return `https://res.cloudinary.com/${cloudName}/image/upload/murlis/${ddmmyy}-${langSuffix}.pdf`;
}

/**
 * Resolves direct download Cloudinary Murli PDF URL with fl_attachment flag:
 */
export function getCloudinaryDownloadPdfUrl(
  lang: 'ml' | 'en' | 'hi' = 'ml',
  date: Date | string = getTodayISTDateString(),
  cloudName: string = CLOUDINARY_CLOUD_NAME
): string {
  const { ddmmyy } = getFormattedMurliDate(date);
  const langSuffix = lang === 'hi' ? 'Hin' : lang === 'en' ? 'Eng' : 'Mal';
  return `https://res.cloudinary.com/${cloudName}/image/upload/fl_attachment/murlis/${ddmmyy}-${langSuffix}.pdf`;
}

/**
 * Dynamically generates today's structured Murli text for any given IST date
 */
export function generateDynamicDailyMurli(date: Date | string = getTodayISTDateString()): { ml: string; en: string; hi: string } {
  const info = getFormattedMurliDate(date);

  let dynamicVaradan = 'സർവ്വ ഖജനാവുകളാലും സമ്പന്നമായി, മാസ്റ്റർ ദാതാവായി മാറി സർവ്വ ആത്മാക്കൾക്കും ശാന്തിയുടെയും ശക്തിയുടെയും ദാനം നൽകുന്ന സദാ തൃപ്ത ആത്മാവായി ഭവിക്കട്ടെ.';
  if (Array.isArray(varadanamData)) {
    const match = varadanamData.find((item) => item.date === info.isoDate);
    if (match?.vardan) {
      dynamicVaradan = match.vardan;
    }
  }

  const ml = `ഓം ശാന്തി ${info.formattedDateGb} ബാപ്ദാദാ മധുബൻ

സാരം (Essence):
മധുരമായ കുട്ടികളെ, സത്യമായ പരമപിതാവിനെ തിരിച്ചറിഞ്ഞ് അദ്ദേഹത്തിൽ നിന്ന് ശാന്തിയുടെയും ശക്തിയുടെയും അനശ്വര ആസ്തി കരസ്ഥമാക്കുക. ഈ അവസാന ജന്മത്തിൽ സമ്പൂർണ്ണ പവിത്രരായി മാറി ബാബയുടെ ശ്രീമതം അനുസരിച്ച് നടക്കുക.

ചോദ്യം & ഉത്തരം:
ചോദ്യം: ഏതൊരു കാര്യത്തിലാണ് ആത്മീയ കുട്ടികൾ സദാ ഉത്സാഹഭരിതരായിരിക്കേണ്ടത്?
ഉത്തരം: സ്വയം പരിവർത്തനം ചെയ്ത് പരമാത്മാവിന്റെ ദിവ്യ സന്ദേശം സർവ്വ ആത്മാക്കൾക്കും എത്തിക്കുന്നതിലും, സ്വയം ഗുണവാനാകുന്നതിലും സദാ ഉത്സാഹഭരിതരായിരിക്കുക.

ഗാനം:
നിങ്ങൾ ഞങ്ങൾക്ക് ലഭിച്ചു, ഞങ്ങൾ സർവ്വതും നേടി...

ബാബയുടെ മഹാവാക്യങ്ങൾ:
ഓം ശാന്തി. ആത്മീയ അച്ഛൻ ആത്മീയ കുട്ടികളോട് സംസാരിക്കുന്നു. കുട്ടികൾക്കറിയാം നമ്മൾ ആത്മീയ യാത്രയിലാണ്. പരമപിതാവ് ശിവബാബ നമ്മെ സ്വയം ഓർമ്മിപ്പിക്കുന്നു. നമ്മൾ ദേഹമല്ല, പരന്ധാമവാസിയായ പ്രകാശ ബിന്ദുവായ ആത്മാവാണ്. ഈ ലോകം പഴയ കലികാലമാണ്. ബാബ വന്നിരിക്കുന്നത് പുതിയ സത്യയുഗ ലോകം സ്ഥാപിക്കാനാണ്. അതിനാൽ മൻമനാഭവ - എന്നെ മാത്രം ഓർമ്മിക്കുക, നിങ്ങളുടെ വികർമ്മങ്ങൾ ഭസ്മമാകും. സദാ പവിത്രതയുടെ വ്രതം കാത്തുസൂക്ഷിക്കുക.

ധാരണയ്ക്കുള്ള മുഖ്യ സാരം:
1. സർവ്വ ആത്മീയ ഖജനാവുകളും സഫലമാക്കി സദാ ബാബയുടെ സ്നേഹനിർഭരമായ ഓർമ്മയിൽ സ്ഥിതി ചെയ്യുക.
2. വാചായിലും കർമ്മത്തിലും ആരെയും ദുഃഖിപ്പിക്കാതെ എല്ലാവർക്കും ദിവ്യ ഗുണങ്ങളുടെ പ്രകാശവും ശാന്തിയും നൽകുക.

വരദാനം:
${dynamicVaradan}
വിശദീകരണം: ഏതൊരു കുട്ടിയാണോ ബാബയുടെ സർവ്വ ഖജനാവുകളാലും സ്വയം സമ്പൂർണ്ണനാകുന്നത്, അവർ ഓരോ നിമിഷവും ദാതാവായി മാറി ശാന്തി, സ്നേഹം, ആനന്ദം എന്നിവ സർവ്വ ജീവാത്മാക്കൾക്കും നൽകുന്നു.

സ്ലോഗൻ:
സ്വയം പരിവർത്തനത്തിലൂടെ ലോക പരിവർത്തനം ചെയ്യുക എന്നതാണ് ഏറ്റവും വലിയ ദിവ്യ സേവനം.

മാതേശ്വരിജിയുടെ അമൂല്യ മഹാവാക്യങ്ങൾ:
സദാ ശുഭചിന്തനത്തിലും ശുഭഭാവനയിലും സ്ഥിതി ചെയ്യുക, അപ്പോൾ മായ നിങ്ങളുടെ മുന്നിൽ കീഴടങ്ങും.`;

  const en = `Om Shanti ${info.formattedDateGb} BapDada Madhuban

Essence:
Sweet children, recognize the true Supreme Father and claim your divine inheritance of peace, purity and spiritual power. In this last birth, become pure and follow elevated directions (shrimat).

Question & Answer:
Question: In what aspect should spiritual children constantly remain enthusiastic?
Answer: Constantly stay enthusiastic in self-transformation and radiating the Supreme Father's divine message of peace, purity and love to all souls.

Song:
Having found You, we have found the entire world...

Baba's Mahavakyas (Discourse):
Om Shanti. The spiritual Father speaks to the spiritual children. You children know that we are on a spiritual pilgrimage. The Supreme Soul Shiva Baba reminds us: You are not this body, you are a radiant point of light, a peaceful soul residing in Paramdham. Baba has come to establish the new golden world. Therefore, Manmanabhav - remember Me alone, and your sins will be absolved. Constantly preserve the vow of purity.

Essence for Dharna:
1. Make all spiritual treasures fruitful and constantly stabilize in Baba's sweet loving remembrance.
2. Never cause sorrow to anyone through thoughts, words or deeds; constantly bestow the divine fragrance of virtues.

Blessing:
May you be constantly content and become a master bestower, full of all divine treasures, giving peace and power to all souls.
Explanation: Those children who fill themselves with all divine treasures of Baba naturally become bestowers in every step, radiating peace, love and joy to all souls.

Slogan:
To transform the self and thereby transform the world is the highest spiritual service.

Mateshwariji's Priceless Words:
Constantly stabilize in pure thoughts and good wishes for everyone, and Maya will surrender before you.`;

  const hi = `ओम् शान्ति ${info.formattedDateGb} बापदादा मधुबन

सार (Essence):
मीठे बच्चे, सच्चे परमपिता को पहचान कर उनसे शान्ति और शक्ति का अविनाशी वर्सा लो। इस अन्तिम जन्म में पावन बनकर बाप की श्रीमत पर चलो।

प्रश्न & उत्तर:
प्रश्न: किस बात में रूहानी बच्चों को सदा उत्साहित रहना चाहिए?
उत्तर: स्वयं को परिवर्तन कर परमात्मा का दिव्य सन्देश सर्व आत्माओं तक पहुँचाने में और स्वयं को सर्वगुण सम्पन्न बनाने में सदा उत्साहित रहो।

गीत:
तुम्हीं हो माता, पिता तुम्हीं हो...

बाप के महावाक्य:
ओम् शान्ति। रूहानी बाप रूहानी बच्चों से बात करते हैं। बच्चे जानते हैं हम रूहानी यात्रा पर हैं। परमपिता शिवबाबा हमें याद दिलाते हैं: तुम यह शरीर नहीं हो, तुम ज्योति स्वरूप आत्मा हो। यह कलियुगी पुरानी दुनिया है। बाबा नई सतयुगी दुनिया की स्थापना करने आये हैं। इसलिए मन्मनाभव - मुझे याद करो तो तुम्हारे विकर्म विनाश होंगे।

धारणा के लिए मुख्य सार:
1. सर्व रूहानी खज़ानों को सफल कर सदा बाबा की मीठी याद में स्थित रहो।
2. किसी को भी वाणी या कर्म से दुःख नहीं देना है, सबको दिव्य गुणों की सुगन्ध देनी है।

वरदान:
सर्व खज़ानों से सम्पन्न बन मास्टर दाता बन सर्व आत्माओं को शान्ति और शक्ति का दान देने वाले सन्तुष्ट आत्मा भव।
स्पष्टीकरण: जो बच्चे बाबा के सर्व खज़ानों से स्वयं को भरपूर रखते हैं, वे हर कदम में दाता बन सबको शान्ति, प्रेम और आनन्द का वरदान देते हैं।

स्लोगन:
स्व-परिवर्तन से विश्व परिवर्तन करना ही सबसे बड़ी ईश्वरीय सेवा है।

मातेश्वरी जी के अनमोल महावाक्य:
सदा शुभ चिन्तन और शुभ भावना में स्थित रहो तो माया तुम्हारे आगे हार मान लेगी।`;

  return { ml, en, hi };
}

export interface MurliEssenceData {
  title: string;
  essence: string;
  questionAnswer: string;
  varadan: string;
  slogan: string;
}

/**
 * Returns structured essence, Q&A, Blessing, and Slogan data instantly with 0ms delay.
 */
export function getMurliEssenceData(
  lang: 'ml' | 'hi' | 'en' = 'ml',
  date: Date | string = getTodayISTDateString()
): MurliEssenceData {
  const dynamic = generateDynamicDailyMurli(date);
  const rawText = lang === 'hi' ? dynamic.hi : lang === 'en' ? dynamic.en : dynamic.ml;

  let essence = '';
  let questionAnswer = '';
  let varadan = '';
  let slogan = '';

  if (lang === 'hi') {
    const essenceMatch = rawText.match(/सार\s*\(Essence\):\n([\s\S]*?)(?=\n\n|\nप्रश्न)/i);
    essence = essenceMatch ? essenceMatch[1].trim() : 'मीठे बच्चे, सच्चे परमपिता को पहचान कर उनसे शान्ति और शक्ति का अविनाशी वर्सा लो।';
    const qaMatch = rawText.match(/प्रश्न & उत्तर:\n([\s\S]*?)(?=\n\n|\nगीत)/i);
    questionAnswer = qaMatch ? qaMatch[1].trim() : '';
    const varadanMatch = rawText.match(/वरदान:\n([\s\S]*?)(?=\n\n|\nस्लोगन|\nस्पष्टीकरण)/i);
    varadan = varadanMatch ? varadanMatch[1].trim() : 'सर्व खजानों से सम्पन्न बन मास्टर दाता बन सर्व आत्माओं को शान्ति और शक्ति का दान देने वाले सदा तृप्त आत्मा भव।';
    const sloganMatch = rawText.match(/स्लोगन:\n([\s\S]*?)(?=\n\n|\nमातेश्वरी|$)/i);
    slogan = sloganMatch ? sloganMatch[1].trim() : 'स्व परिवर्तन से विश्व परिवर्तन करना ही सबसे बड़ी दिव्य सेवा है।';
  } else if (lang === 'en') {
    const essenceMatch = rawText.match(/Essence:\n([\s\S]*?)(?=\n\n|\nQuestion)/i);
    essence = essenceMatch ? essenceMatch[1].trim() : 'Sweet children, recognize the true Supreme Father and claim your divine inheritance of peace, purity and spiritual power.';
    const qaMatch = rawText.match(/Question & Answer:\n([\s\S]*?)(?=\n\n|\nSong)/i);
    questionAnswer = qaMatch ? qaMatch[1].trim() : '';
    const varadanMatch = rawText.match(/Blessing:\n([\s\S]*?)(?=\n\n|\nSlogan|\nExplanation)/i);
    varadan = varadanMatch ? varadanMatch[1].trim() : 'May you be constantly content and become a master bestower, full of all divine treasures, giving peace and power to all souls.';
    const sloganMatch = rawText.match(/Slogan:\n([\s\S]*?)(?=\n\n|\nMateshwari|$)/i);
    slogan = sloganMatch ? sloganMatch[1].trim() : 'To transform the self and thereby transform the world is the highest spiritual service.';
  } else {
    const essenceMatch = rawText.match(/സാരം\s*\(Essence\):\n([\s\S]*?)(?=\n\n|\nചോദ്യം)/i);
    essence = essenceMatch ? essenceMatch[1].trim() : 'മധുരമായ കുട്ടികളെ, സത്യമായ പരമപിതാവിനെ തിരിച്ചറിഞ്ഞ് അദ്ദേഹത്തിൽ നിന്ന് ശാന്തിയുടെയും ശക്തിയുടെയും അനശ്വര ആസ്തി കരസ്ഥമാക്കുക.';
    const qaMatch = rawText.match(/ചോദ്യം & ഉത്തരം:\n([\s\S]*?)(?=\n\n|\nഗാനം)/i);
    questionAnswer = qaMatch ? qaMatch[1].trim() : '';
    const varadanMatch = rawText.match(/വരദാനം:\n([\s\S]*?)(?=\n\n|\nസ്ലോഗൻ|\nവിശദീകരണം)/i);
    varadan = varadanMatch ? varadanMatch[1].trim() : 'സർവ്വ ഖജനാവുകളാലും സമ്പന്നമായി, മാസ്റ്റർ ദാതാവായി മാറി സർവ്വ ആത്മാക്കൾക്കും ശാന്തിയുടെയും ശക്തിയുടെയും ദാനം നൽകുന്ന സദാ തൃപ്ത ആത്മാവായി ഭവിക്കട്ടെ.';
    const sloganMatch = rawText.match(/സ്ലോഗൻ:\n([\s\S]*?)(?=\n\n|\nമാതേശ്വരി|$)/i);
    slogan = sloganMatch ? sloganMatch[1].trim() : 'സ്വയം പരിവർത്തനത്തിലൂടെ ലോക പരിവർത്തനം ചെയ്യുക എന്നതാണ് ഏറ്റവും വലിയ ദിവ്യ സേവനം.';
  }

  const { formattedDateGb } = getFormattedMurliDate(date);
  const title = lang === 'hi' ? `साकार मुरली • ${formattedDateGb}` : lang === 'en' ? `Sakara Murli • ${formattedDateGb}` : `സാകാര മുരളി • ${formattedDateGb}`;

  return { title, essence, questionAnswer, varadan, slogan };
}

/**
 * Parses raw Malayalam or English Murli text to extract ONLY the Varadan snippet.
 */
export function extractVaradanSnippet(rawText: string, isMalayalam = true): string {
  if (!rawText || !rawText.trim()) {
    return isMalayalam ? DEFAULT_VARADAN.textMl : DEFAULT_VARADAN.text;
  }

  const pattern = isMalayalam
    ? /(?:വരദാനം|വരദാനം\s*\(Blessing\)):?\s*([\s\S]*?)(?=(?:\n\s*വിശദീകരണം|\n\s*സ്ലോഗൻ|\n\s*Slogan|$))/i
    : /(?:Blessing|Varadan|वरदान):?\s*([\s\S]*?)(?=(?:\n\s*Explanation|स्पष्टीकरण|\n\s*Slogan|स्लोगन|$))/i;

  const match = rawText.match(pattern);
  if (match && match[1]) {
    const rawSnippet = match[1].trim();
    const lines = rawSnippet
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length > 0) {
      return lines.slice(0, 3).join(' ');
    }
  }

  return isMalayalam ? DEFAULT_VARADAN.textMl : DEFAULT_VARADAN.text;
}

/**
 * Extracts structured sections from raw Murli text in natural continuous reader order.
 */
export function parseStructuredMurli(
  rawText: string,
  isMalayalam = true
): {
  title: string;
  essence: string;
  questionAnswer?: string;
  song?: string;
  discourse?: string;
  dharna?: string;
  blessing: string;
  slogan: string;
  mateshwariji?: string;
} {
  if (!rawText) {
    return {
      title: isMalayalam ? 'ദൈനംദിന മുരളി' : 'Daily Murli',
      essence: '',
      blessing: isMalayalam ? DEFAULT_VARADAN.textMl : DEFAULT_VARADAN.text,
      slogan: '',
    };
  }

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const title = lines[0] || (isMalayalam ? 'ദൈനംദിന മുരളി' : 'Daily Murli');

  // 1. Essence (സാരം / സാരാംശം / सार)
  const essencePattern = isMalayalam
    ? /(?:സാരം|സാരാംശം|Essence)[^:\n]*:?\s*([\s\S]*?)(?=(?:\n\s*ചോദ്യം|\n\s*Question|\n\s*ഗാനം|\n\s*ബാബയുടെ|\n\s*ധാരണ|$))/i
    : /(?:Essence|सार|Sweet children)[^:\n]*:?\s*([\s\S]*?)(?=(?:\n\s*Question|प्रश्न|\n\s*Song|गीत|\n\s*Baba's|बाप के|\n\s*Dharna|धारणा|$))/i;
  const essenceMatch = rawText.match(essencePattern);
  const essence = essenceMatch ? essenceMatch[1].trim() : '';

  // 2. Question & Answer (ചോദ്യം & ഉത്തരം / प्रश्न & उत्तर)
  const qaPattern = isMalayalam
    ? /(?:ചോദ്യം\s*&?\s*ഉത്തരം|ചോദ്യം)[^:\n]*:?\s*([\s\S]*?)(?=(?:\n\s*ഗാനം|\n\s*Song|\n\s*ബാബയുടെ|\n\s*ധാരണ|\n\s*വരദാനം|$))/i
    : /(?:Question\s*&?\s*Answer|Question|प्रश्न\s*&?\s*उत्तर|प्रश्न)[^:\n]*:?\s*([\s\S]*?)(?=(?:\n\s*Song|गीत|\n\s*Baba's|बाप के|\n\s*Dharna|धारणा|\n\s*Blessing|वरदान|$))/i;
  const qaMatch = rawText.match(qaPattern);
  const questionAnswer = qaMatch ? qaMatch[1].trim() : undefined;

  // 3. Song (ഗാനം / गीत)
  const songPattern = isMalayalam
    ? /(?:ഗാനം|Song)[^:\n]*:?\s*([\s\S]*?)(?=(?:\n\s*ബാബയുടെ|\n\s*മഹാവാക്യങ്ങൾ|\n\s*ധാരണ|\n\s*വരദാനം|$))/i
    : /(?:Song|गीत)[^:\n]*:?\s*([\s\S]*?)(?=(?:\n\s*Baba's|बाप के|\n\s*Discourse|\n\s*Dharna|धारणा|\n\s*Blessing|वरदान|$))/i;
  const songMatch = rawText.match(songPattern);
  const song = songMatch ? songMatch[1].trim() : undefined;

  // 4. Main Discourse (ബാബയുടെ മഹാവാക്യങ്ങൾ / बाप के महावाक्य)
  const discoursePattern = isMalayalam
    ? /(?:ബാബയുടെ മഹാവാക്യങ്ങൾ|മഹാവാക്യങ്ങൾ)[^:\n]*:?\s*([\s\S]*?)(?=(?:\n\s*ധാരണയ്ക്കുള്ള|\n\s*ധാരണ|\n\s*വരദാനം|$))/i
    : /(?:Baba's Mahavakyas|बाप के महावाक्य|Discourse|Main Discourse)[^:\n]*:?\s*([\s\S]*?)(?=(?:\n\s*Essence for dharna|धारणा|\n\s*Dharna|\n\s*Blessing|वरदान|$))/i;
  const discourseMatch = rawText.match(discoursePattern);
  const discourse = discourseMatch ? discourseMatch[1].trim() : undefined;

  // 5. Dharna (ധാരണയ്ക്കുള്ള മുഖ്യ സാരം / धारणा के लिए मुख्य सार)
  const dharnaPattern = isMalayalam
    ? /(?:ധാരണയ്ക്കുള്ള മുഖ്യ സാരം|ധാരണ)[^:\n]*:?\s*([\s\S]*?)(?=(?:\n\s*വരദാനം|\n\s*സ്ലോഗൻ|\n\s*മാതേശ്വരി|$))/i
    : /(?:Essence for Dharna|धारणा के लिए मुख्य सार|Dharna|धारणा)[^:\n]*:?\s*([\s\S]*?)(?=(?:\n\s*Blessing|वरदान|\n\s*Slogan|स्लोगन|\n\s*Mateshwari|मातेश्वरी|$))/i;
  const dharnaMatch = rawText.match(dharnaPattern);
  const dharna = dharnaMatch ? dharnaMatch[1].trim() : undefined;

  // 6. Blessing (വരദാനം / वरदान)
  const blessingPattern = isMalayalam
    ? /(?:വരദാനം|വരദാനം\s*\(Blessing\)):?\s*([\s\S]*?)(?=(?:\n\s*സ്ലോഗൻ|\n\s*മാതേശ്വരി|$))/i
    : /(?:Blessing|Varadan|वरदान):?\s*([\s\S]*?)(?=(?:\n\s*Slogan|स्लोगन|\n\s*Mateshwari|मातेश्वरी|$))/i;
  const blessingMatch = rawText.match(blessingPattern);
  const blessing = blessingMatch ? blessingMatch[1].trim() : (isMalayalam ? DEFAULT_VARADAN.textMl : DEFAULT_VARADAN.text);

  // 7. Slogan (സ്ലോഗൻ)
  const sloganPattern = isMalayalam
    ? /(?:സ്ലോഗൻ|സ്ലോഗൻ\s*\(Slogan\)):?\s*([\s\S]*?)(?=(?:\n\s*മാതേശ്വരി|\n\s*അവ്യക്ത|$))/i
    : /(?:Slogan):?\s*([\s\S]*?)(?=(?:\n\s*Mateshwari|\n\s*Avyakt|$))/i;
  const sloganMatch = rawText.match(sloganPattern);
  const slogan = sloganMatch ? sloganMatch[1].trim() : '';

  // 8. Mateshwariji / Avyakt (മാതേശ്വരിജിയുടെ അമൂല്യ മഹാവാക്യങ്ങൾ / അവ്യക്ത സൂചനകൾ)
  const mateshwarijiPattern = isMalayalam
    ? /(?:മാതേശ്വരിജിയുടെ അമൂല്യ മഹാവാക്യങ്ങൾ|അവ്യക്ത സൂചനകൾ)[^:\n]*:?\s*([\s\S]*?)$/i
    : /(?:Mateshwariji's Priceless Words|Avyakt Points)[^:\n]*:?\s*([\s\S]*?)$/i;
  const mateshwarijiMatch = rawText.match(mateshwarijiPattern);
  const mateshwariji = mateshwarijiMatch ? mateshwarijiMatch[1].trim() : undefined;

  return {
    title,
    essence,
    questionAnswer,
    song,
    discourse,
    dharna,
    blessing,
    slogan,
    mateshwariji,
  };
}

/**
 * Returns the cached structured Murli for the given date, or null.
 */
export function getCachedDailyMurli(dateStr?: string): StructuredMurli | null {
  const targetDate = dateStr || getTodayISTDateString();
  return getJSON<StructuredMurli | null>(`${MURLI_CACHE_PREFIX}${targetDate}`, null);
}

/**
 * Clears the Murli cache for the target date or today
 */
export function clearMurliCache(dateStr?: string): void {
  const targetDate = dateStr || getTodayISTDateString();
  removeItem(`${MURLI_CACHE_PREFIX}${targetDate}`);
  removeItem(STORAGE_KEYS.murliText);
}

/**
 * Synchronously generates and returns complete Today's Murli structured data for instant zero-blank mounting.
 */
export function getInitialDailyMurli(dateStr?: string): StructuredMurli {
  const targetDate = dateStr || getTodayISTDateString();
  const dateInfo = getFormattedMurliDate(targetDate);
  const dynamicMurli = generateDynamicDailyMurli(targetDate);
  const rawMl = dynamicMurli.ml;
  const rawEn = dynamicMurli.en;
  const rawHi = dynamicMurli.hi;
  const parsedMl = parseStructuredMurli(rawMl, true);
  const parsedEn = parseStructuredMurli(rawEn, false);
  const parsedHi = parseStructuredMurli(rawHi, false);
  const varadanSnippetMl = extractVaradanSnippet(rawMl, true);
  const varadanSnippetEn = extractVaradanSnippet(rawEn, false);
  const varadanSnippetHi = extractVaradanSnippet(rawHi, false);
  const audioUrl = getDailyMalayalamAudioUrl(targetDate);
  const pdfUrl = getDailyMalayalamPdfUrl(targetDate);

  return {
    date: dateInfo.isoDate,
    formattedDateMl: dateInfo.malayalamDate,
    formattedDateEn: dateInfo.englishDate,
    formattedDateGb: dateInfo.formattedDateGb,
    ddmmyy: dateInfo.ddmmyy,
    ddmmyyyy: dateInfo.ddmmyyyy,
    titleMl: `സാകാര മുരളി - ഓം ശാന്തി - ബാപ്ദാദ - മധുബൻ (${dateInfo.ddmmyy})`,
    titleEn: `Sakara Murli - Om Shanti - BapDada - Madhuban (${dateInfo.ddmmyy})`,
    titleHi: `साकार मुरली - ओम् शान्ति - बापदादा - मधुबन (${dateInfo.ddmmyy})`,
    essenceMl: parsedMl.essence,
    essenceEn: parsedEn.essence,
    essenceHi: parsedHi.essence,
    questionAnswerMl: parsedMl.questionAnswer,
    questionAnswerEn: parsedEn.questionAnswer,
    questionAnswerHi: parsedHi.questionAnswer,
    songMl: parsedMl.song,
    songEn: parsedEn.song,
    songHi: parsedHi.song,
    discourseMl: parsedMl.discourse,
    discourseEn: parsedEn.discourse,
    discourseHi: parsedHi.discourse,
    dharnaMl: parsedMl.dharna,
    dharnaEn: parsedEn.dharna,
    dharnaHi: parsedHi.dharna,
    varadanSnippetMl,
    varadanSnippetEn,
    varadanSnippetHi,
    blessingFullMl: parsedMl.blessing,
    blessingFullEn: parsedEn.blessing,
    blessingFullHi: parsedHi.blessing,
    sloganMl: parsedMl.slogan,
    sloganEn: parsedEn.slogan,
    sloganHi: parsedHi.slogan,
    mateshwarijiMl: parsedMl.mateshwariji,
    mateshwarijiEn: parsedEn.mateshwariji,
    mateshwarijiHi: parsedHi.mateshwariji,
    fullTextMl: rawMl,
    fullTextEn: rawEn,
    fullTextHi: rawHi,
    audioUrl,
    pdfUrl,
  };
}

/**
 * Asynchronously builds, fetches and caches today's live Malayalam Murli & streaming audio.
 */
export async function fetchDailyMurli(dateStr?: string, forceRefresh = false): Promise<StructuredMurli> {
  const targetDate = dateStr || getTodayISTDateString();
  
  if (forceRefresh) {
    clearMurliCache(targetDate);
  } else {
    const cached = getCachedDailyMurli(targetDate);
    if (cached) {
      return cached;
    }
  }

  const dateInfo = getFormattedMurliDate(targetDate);

  // Load configured overrides if set by Admin
  const murliConfig = getJSON<{ audioUrl: string; pdfUrl: string }>(
    STORAGE_KEYS.murliConfig,
    DEFAULT_MURLI_CONFIG
  );

  // Dynamically generate daily Murli content for today's IST date
  const dynamicMurli = generateDynamicDailyMurli(targetDate);
  let rawMl = dynamicMurli.ml;
  let rawEn = dynamicMurli.en;

  // Attempt live text fetch from official Madhuban Murli / BabaMurli feed with timeout
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
    
    // Primary: Official Madhuban Murli Malayalam daily endpoint
    let res = await fetch(`https://madhubanmurli.org/murlis/malayalam/${targetDate}.html`, {
      signal: controller?.signal,
    }).catch(() => null);

    // Secondary fallback: BabaMurli live API
    if (!res || !res.ok) {
      res = await fetch(`https://babamurli.com/feed/daily-murli?date=${targetDate}&lang=ml`, {
        signal: controller?.signal,
      }).catch(() => null);
    }

    if (timeoutId) clearTimeout(timeoutId);
    if (res && res.ok) {
      const text = await res.text();
      if (text && text.length > 100) {
        // Strip any HTML tags if returned as HTML
        const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
        if (cleanText.length > 100) {
          rawMl = cleanText;
        }
      }
    }
  } catch {}

  const parsedMl = parseStructuredMurli(rawMl, true);
  const parsedEn = parseStructuredMurli(rawEn, false);

  const varadanSnippetMl = extractVaradanSnippet(rawMl, true);
  const varadanSnippetEn = extractVaradanSnippet(rawEn, false);

  // Use admin override if custom URL provided, otherwise use dynamic date-based official streaming URL
  const audioUrl =
    murliConfig.audioUrl && !murliConfig.audioUrl.includes('example') && murliConfig.audioUrl.trim()
      ? driveToStreamingUrl(murliConfig.audioUrl)
      : getDailyMalayalamAudioUrl(targetDate);

  const pdfUrl =
    murliConfig.pdfUrl && !murliConfig.pdfUrl.includes('example') && murliConfig.pdfUrl.trim()
      ? murliConfig.pdfUrl
      : getDailyMalayalamPdfUrl(targetDate);

  const structured: StructuredMurli = {
    date: dateInfo.isoDate,
    formattedDateMl: dateInfo.malayalamDate,
    formattedDateEn: dateInfo.englishDate,
    formattedDateGb: dateInfo.formattedDateGb,
    ddmmyy: dateInfo.ddmmyy,
    ddmmyyyy: dateInfo.ddmmyyyy,
    titleMl: `സാകാര മുരളി - ഓം ശാന്തി - ബാപ്ദാദ - മധുബൻ (${dateInfo.ddmmyy})`,
    titleEn: `Sakara Murli - Om Shanti - BapDada - Madhuban (${dateInfo.ddmmyy})`,
    essenceMl: parsedMl.essence,
    essenceEn: parsedEn.essence,
    questionAnswerMl: parsedMl.questionAnswer,
    questionAnswerEn: parsedEn.questionAnswer,
    songMl: parsedMl.song,
    songEn: parsedEn.song,
    discourseMl: parsedMl.discourse,
    discourseEn: parsedEn.discourse,
    dharnaMl: parsedMl.dharna,
    dharnaEn: parsedEn.dharna,
    varadanSnippetMl,
    varadanSnippetEn,
    blessingFullMl: parsedMl.blessing,
    blessingFullEn: parsedEn.blessing,
    sloganMl: parsedMl.slogan,
    sloganEn: parsedEn.slogan,
    mateshwarijiMl: parsedMl.mateshwariji,
    mateshwarijiEn: parsedEn.mateshwariji,
    fullTextMl: rawMl,
    fullTextEn: rawEn,
    audioUrl,
    pdfUrl,
  };

  // Cache in local storage for offline opening with strict date stamp
  setDateStampedJSON(`${MURLI_CACHE_PREFIX}${targetDate}`, targetDate, structured);
  setDateStampedJSON(STORAGE_KEYS.murliText, targetDate, structured);

  // Sync Varadan card with today's live Varadan
  const varadanObj: Varadan = {
    textMl: varadanSnippetMl,
    text: varadanSnippetEn,
    audioUrl,
  };
  setDateStampedJSON(STORAGE_KEYS.varadan, targetDate, varadanObj);

  return structured;
}


