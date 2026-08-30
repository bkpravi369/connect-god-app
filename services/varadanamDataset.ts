import varadanamData from '@/src/data/varadanam.json';
import { getTodayISTDateString, getFormattedMurliDate } from '@/services/murliService';
import { getJSON, setJSON } from '@/lib/storage';

export interface VaradanamItem {
  date: string;
  vardan: string;
}

export interface DailyBlessingEntry {
  date: string;
  formattedDateShort: string; // "29.08.26"
  formattedDateLong: string; // "29 August 2026"
  varadanText: string;
  swamanText: string;
  swamanTextEn: string;
}

const REMOTE_CACHE_KEY = 'connectgod_remote_varadanam_data';
let memoryDataset: VaradanamItem[] = [...varadanamData];

/**
 * Intelligent Swaman generator derived from the core spiritual essence of each Varadanam.
 */
function deriveSwamanFromVaradan(varadanText: string, index: number): { ml: string; en: string } {
  if (!varadanText) {
    return {
      ml: 'ഞാൻ സദാ സർവ്വ ഗുണ സമ്പന്നനായ ശാന്തസ്വരൂപ ആത്മാവാണ്.',
      en: 'I am always a peaceful soul full of all divine virtues.',
    };
  }

  const v = varadanText;

  if (v.includes('ആകർഷണങ്ങളിൽ നിന്നു മുക്ത') || v.includes('ആകർഷണങ്ങളിൽനിന്നും മുക്ത')) {
    return {
      ml: 'ഞാൻ സർവ്വ ആകർഷണങ്ങളിൽ നിന്നും മുക്തനായ പവിത്ര ആത്മാവാണ്.',
      en: 'I am a pure soul, completely free from all bodily attractions.',
    };
  }
  if (v.includes('ശക്തിസ്വരൂപ') || v.includes('സർവ്വശക്തിവാനായി')) {
    return {
      ml: 'ഞാൻ സർവ്വ ശക്തിമാനായ പരമാത്മാവിന്റെ മാസ്റ്റർ സർവ്വശക്തിവാൻ കുട്ടിയാണ്.',
      en: 'I am the master almighty child of the Almighty Supreme Soul.',
    };
  }
  if (v.includes('വിജയീ') || v.includes('വിജയരത്ന') || v.includes('സഫലത')) {
    return {
      ml: 'ഞാൻ നിശ്ചയബുദ്ധിയുള്ള വിജയീ രത്നമാണ്, വിജയം എന്റെ ജന്മാവകാശമാണ്.',
      en: 'I am a victorious jewel with unshakeable faith; success is my birthright.',
    };
  }
  if (v.includes('ശാന്തി') || v.includes('സൈലൻസ്')) {
    return {
      ml: 'ഞാൻ ശാന്തിയുടെയും ശക്തിയുടെയും മൂർത്തസ്വരൂപമായ പരന്ധാമവാസി ആത്മാവാണ്.',
      en: 'I am an embodiment of peace and divine power, resident of Paramdham.',
    };
  }
  if (v.includes('സമ്പൂർണ്ണ') || v.includes('നിർവ്വികാരി')) {
    return {
      ml: 'ഞാൻ സമ്പൂർണ്ണ പവിത്രനും നിർവ്വികാരിയുമായ ദേവതാ സ്വരൂപമാണ്.',
      en: 'I am a completely pure, viceless and divine angelic soul.',
    };
  }
  if (v.includes('ഭാഗ്യശാലി') || v.includes('ഭാഗ്യ')) {
    return {
      ml: 'ഞാൻ ഭഗവാന്റെ പരമ സ്നേഹപാത്രമായ ശ്രേഷ്ഠ ഭാഗ്യശാലി ആത്മാവാണ്.',
      en: 'I am the most fortunate soul, beloved child of God.',
    };
  }
  if (v.includes('ദാതാവായി') || v.includes('വരദാതാവായി') || v.includes('കല്യാണകാരി')) {
    return {
      ml: 'ഞാൻ സർവ്വ ആത്മാക്കൾക്കും ശാന്തിയും സ്നേഹവും നൽകുന്ന മാസ്റ്റർ ദാതാവാണ്.',
      en: 'I am a master bestower, radiating peace and love to all souls.',
    };
  }
  if (v.includes('പ്രകാശ') || v.includes('ജ്ഞാനസൂര്യ')) {
    return {
      ml: 'ഞാൻ സർവ്വലോകത്തിലും ദിവ്യ പ്രകാശം ചൊരിയുന്ന പ്രകാശസ്വരൂപ ആത്മാവാണ്.',
      en: 'I am a radiant soul of light, illuminating the entire universe.',
    };
  }

  // Fallback rotating library
  const rotatingSwamans = [
    { ml: 'ഞാൻ സദാ സർവ്വ ഗുണ സമ്പന്നനായ ശാന്തസ്വരൂപ ആത്മാവാണ്.', en: 'I am always a peaceful soul full of all divine virtues.' },
    { ml: 'ഞാൻ സർവ്വ ശക്തിമാനായ പരമാത്മാവിന്റെ മാസ്റ്റർ സർവ്വശക്തിവാൻ കുട്ടിയാണ്.', en: 'I am the master almighty child of the Supreme Soul.' },
    { ml: 'ഞാൻ സദാ ബാബയുടെ സുരക്ഷിതമായ ദിവ്യ സംരക്ഷണ വലയത്തിലാണ്.', en: 'I am always within Baba’s divine canopy of protection.' },
    { ml: 'ഞാൻ പവിത്രതയുടെ കിരണങ്ങൾ പ്രസരിപ്പിക്കുന്ന പ്രകാശ സ്വരൂപമാണ്.', en: 'I am an embodiment of light radiating rays of purity.' },
    { ml: 'ഞാൻ സദാ തൃപ്തനും പ്രസന്നചിത്തനുമായ മാസ്റ്റർ ദാതാവാണ്.', en: 'I am a master bestower, always contented and blissful.' },
  ];

  return rotatingSwamans[index % rotatingSwamans.length];
}

/**
 * Fetches dynamic remote Varadanam JSON from configured remote URL or API route.
 * Automatically updates persistent cache and in-memory dataset.
 */
export async function fetchDynamicRemoteVaradanam(customUrl?: string): Promise<VaradanamItem[]> {
  // Check local storage cached remote data
  const cached = getJSON<VaradanamItem[] | null>(REMOTE_CACHE_KEY, null);
  if (cached && Array.isArray(cached) && cached.length > 0) {
    memoryDataset = cached;
  }

  const endpoint =
    customUrl ||
    process.env.EXPO_PUBLIC_VARADANAM_JSON_URL ||
    '/api/varadanam';

  const separator = endpoint.includes('?') ? '&' : '?';
  const urlWithCacheBuster = `${endpoint}${separator}v=${Date.now()}`;

  try {
    const res = await fetch(urlWithCacheBuster, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        memoryDataset = data;
        setJSON(REMOTE_CACHE_KEY, data);
        return data;
      }
    }
  } catch (err) {
    console.warn('[Varadanam Dataset] Could not fetch remote JSON, using local dataset fallback:', err);
  }

  return memoryDataset;
}

/**
 * Retrieves the daily Varadanam and Swaman matching the given IST date.
 * Fallbacks safely to index rotation so the cards are NEVER empty.
 */
export function getDailyVaradanamAndSwaman(dateStr?: string): DailyBlessingEntry {
  const targetDate = dateStr || getTodayISTDateString();
  const dateInfo = getFormattedMurliDate(targetDate);

  // Check cached remote data in storage if not yet in memory
  if (memoryDataset.length === varadanamData.length) {
    const cached = getJSON<VaradanamItem[] | null>(REMOTE_CACHE_KEY, null);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      memoryDataset = cached;
    }
  }

  const activeDataset = memoryDataset.length > 0 ? memoryDataset : varadanamData;

  // 1. Direct date match (e.g. "2026-08-29")
  let matchIndex = activeDataset.findIndex((item) => item.date === targetDate);
  let matchedItem = matchIndex !== -1 ? activeDataset[matchIndex] : null;

  // 2. If no exact match (e.g. date out of range), use day-of-year rotation
  if (!matchedItem && activeDataset.length > 0) {
    try {
      const [y, m, d] = targetDate.split('-').map(Number);
      const dayOfYear = Math.floor((new Date(y, m - 1, d).getTime() - new Date(y, 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      matchIndex = Math.abs(dayOfYear) % activeDataset.length;
      matchedItem = activeDataset[matchIndex];
    } catch {
      matchIndex = 0;
      matchedItem = activeDataset[0];
    }
  }

  const varadanText =
    matchedItem?.vardan ||
    'സ്വന്തം സ്മൃതി, മനോവൃത്തി, ദൃഷ്ടിയെ അലൗകികമാക്കുന്ന സർവ്വ ആകർഷണങ്ങളിൽ നിന്നു മുക്തരായി ഭവിക്കട്ടെ.';

  const swaman = deriveSwamanFromVaradan(varadanText, matchIndex !== -1 ? matchIndex : 0);

  return {
    date: targetDate,
    formattedDateShort: dateInfo.ddmmyy,
    formattedDateLong: dateInfo.englishDate,
    varadanText,
    swamanText: swaman.ml,
    swamanTextEn: swaman.en,
  };
}

export default varadanamData;
