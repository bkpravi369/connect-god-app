import { getJSON, setJSON } from '@/lib/storage';
import { DEFAULT_SWAMAN, STORAGE_KEYS, Swaman } from '@/lib/constants';
import { todayISO } from '@/lib/dates';

/**
 * 31 Authentic Brahma Kumaris Daily Swaman (Spiritual Self-Respect Affirmations)
 * Curated in authentic Malayalam & English for each day of the month.
 */
export const DAILY_SWAMAN_COLLECTION: Swaman[] = [
  {
    textMl: 'ഞാൻ സദാ സർവ്വ ഗുണ സമ്പന്നനായ ശാന്തസ്വരൂപ ആത്മാവാണ്.',
    textEn: 'I am a peaceful soul, constantly full of all divine virtues.',
  },
  {
    textMl: 'ഞാൻ സർവ്വ ശക്തിമാനായ പരമാത്മാവിന്റെ മാസ്റ്റർ സർവ്വശക്തിവാൻ കുട്ടിയാണ്.',
    textEn: 'I am the master almighty child of the Supreme Almighty Soul.',
  },
  {
    textMl: 'ഞാൻ ശാന്തിയുടെയും സ്നേഹത്തിന്റെയും മൂർത്തസ്വരൂപമായ ദിവ്യ ആത്മാവാണ്.',
    textEn: 'I am a divine embodiment of peace and unconditional love.',
  },
  {
    textMl: 'ഞാൻ സദാ ബാബയുടെ സുരക്ഷിതമായ ദിവ്യ സംരക്ഷണ വലയത്തിലാണ്.',
    textEn: "I am forever safe under the Supreme Soul's divine canopy of protection.",
  },
  {
    textMl: 'ഞാൻ വിജയീ രത്നമാണ്, വിജയം എന്റെ ജന്മാവകാശമാണ്.',
    textEn: 'I am a jewel of victory, victory is my spiritual birthright.',
  },
  {
    textMl: 'ഞാൻ പവിത്രതയുടെ കിരണങ്ങൾ പ്രസരിപ്പിക്കുന്ന പ്രകാശ സ്വരൂപമാണ്.',
    textEn: 'I am a being of light radiating radiant rays of divine purity.',
  },
  {
    textMl: 'ഞാൻ ബാബയുടെ ഹൃദയ സിംഹാസനാധികാരിയായ ഭാഗ്യവാനായ ആത്മാവാണ്.',
    textEn: "I am a fortunate soul seated on Baba's heart throne.",
  },
  {
    textMl: 'ഞാൻ കർമ്മബന്ധനങ്ങളിൽ നിന്ന് മുക്തനായ സ്വതന്ത്ര ആത്മാവാണ്.',
    textEn: 'I am a detached and liberated soul, free from all karmic bondages.',
  },
  {
    textMl: 'ഞാൻ ജ്ഞാന സൂര്യനായ ശിവബാബയുടെ സ്നേഹനിധിയായ കുട്ടിയാണ്.',
    textEn: 'I am the dearly beloved child of the Sun of Knowledge, Shiv Baba.',
  },
  {
    textMl: 'ഞാൻ സദാ ആനന്ദത്തിലും നിർഭയത്വത്തിലും സ്ഥിതി ചെയ്യുന്ന പുണ്യ ആത്മാവാണ്.',
    textEn: 'I am a sacred soul abiding always in supreme bliss and fearlessness.',
  },
  {
    textMl: 'ഞാൻ മാസ്റ്റർ ജ്ഞാന സൂര്യനാണ്, അജ്ഞാനത്തിന്റെ ഇരുൾ അകറ്റുന്നവനാണ്.',
    textEn: 'I am a master sun of knowledge, dispelling all darkness of ignorance.',
  },
  {
    textMl: 'ഞാൻ സദാ ക്ഷമയും സഹിഷ്ണുതയും ഉള്ള ഉദാരമനസ്കനായ ആത്മാവാണ്.',
    textEn: 'I am a benevolent soul endowed with patience, forgiveness, and tolerance.',
  },
  {
    textMl: 'ഞാൻ ലോകകല്യാണകാരിയായ മാസ്റ്റർ ദാതാവാണ്.',
    textEn: 'I am a master bestower, dedicated to the spiritual welfare of the world.',
  },
  {
    textMl: 'ഞാൻ ബാബയുടെ നയനങ്ങളിൽ വസിക്കുന്ന ദിവ്യ നക്ഷത്രമാണ്.',
    textEn: "I am a sparkling divine star resting within Baba's spiritual vision.",
  },
  {
    textMl: 'ഞാൻ സർവ്വ ഖജനാവുകളാലും സമ്പന്നനായ തൃപ്ത ആത്മാവാണ്.',
    textEn: 'I am an eternally content soul, overflowing with all divine treasures.',
  },
  {
    textMl: 'ഞാൻ ശരീരത്തിൽ നിന്ന് വേറിട്ട സ്വയം പ്രകാശമാനമായ ബിന്ദു സ്വരൂപമാണ്.',
    textEn: 'I am a self-luminous point of pure light, distinct from the physical body.',
  },
  {
    textMl: 'ഞാൻ ബാബയുടെ കൈകളിലെ നിർമ്മലമായ ഉപകരണമാണ് (നിമിത്തം).',
    textEn: 'I am a humble and pure instrument in the divine hands of Baba.',
  },
  {
    textMl: 'ഞാൻ സദാ ആത്മീയ ഉന്മേഷത്തിലും സന്തോഷത്തിലും നൃത്തം ചെയ്യുന്നവനാണ്.',
    textEn: 'I am a joyous soul dancing constantly in spiritual zeal and enthusiasm.',
  },
  {
    textMl: 'ഞാൻ പ്രകൃതിയെയും ഇന്ദ്രിയങ്ങളെയും ഭരിക്കുന്ന സ്വരാജ്യ അധികാരിയാണ്.',
    textEn: 'I am a sovereign ruler, master of my senses and the physical nature.',
  },
  {
    textMl: 'ഞാൻ ബാബയുടെ സ്നേഹത്താൽ സദാ സംതൃപ്തനായ ആത്മാവാണ്.',
    textEn: 'I am an eternally fulfilled soul, nourished by the ocean of divine love.',
  },
  {
    textMl: 'ഞാൻ ഏകാഗ്രതയിലും അചഞ്ചലമായ സ്ഥിതിയിലും സ്ഥിരതയുള്ളവനാണ്.',
    textEn: 'I am steady, unshakable, and anchored in profound concentration.',
  },
  {
    textMl: 'ഞാൻ സർവ്വ ആത്മാക്കൾക്കും ശുഭഭാവനയും ശുഭകാമനയും നൽകുന്നവനാണ്.',
    textEn: 'I radiate good wishes and pure benevolent feelings to all souls.',
  },
  {
    textMl: 'ഞാൻ കർമ്മയോഗിയാണ്, ഓരോ കർമ്മത്തിലും ബാബയെ ഒപ്പം കാണുന്നവനാണ്.',
    textEn: 'I am a karma yogi, keeping Baba as my constant companion in all actions.',
  },
  {
    textMl: 'ഞാൻ മാസ്റ്റർ ശാന്തി സാഗരനാണ്, ലോകമെങ്ങും ശാന്തി പരത്തുന്നവനാണ്.',
    textEn: 'I am a master ocean of peace, spreading tranquil vibrations across the globe.',
  },
  {
    textMl: 'ഞാൻ സർവ്വ ആത്മാക്കളെയും ആത്മീയ ദൃഷ്ടിയോടെ വീക്ഷിക്കുന്ന ദൃഷ്ടാന്തമാണ്.',
    textEn: 'I view every soul with the pure vision of spiritual brotherhood.',
  },
  {
    textMl: 'ഞാൻ ബാബയുടെ വരദാനങ്ങളാൽ അലങ്കരിക്കപ്പെട്ട ദിവ്യ ദേവതയാണ്.',
    textEn: 'I am an angelic soul adorned with all blessings and divine virtues.',
  },
  {
    textMl: 'ഞാൻ സദാ വിഘ്നവിനാശകനും മായാജീത്തുമായ ശക്തനായ ആത്മാവാണ്.',
    textEn: 'I am an obstacle destroyer, conqueror of illusion and negativity.',
  },
  {
    textMl: 'ഞാൻ അനന്തമായ ആത്മീയ ധൈര്യവും ആത്മവിശ്വാസവുമുള്ള ആത്മാവാണ്.',
    textEn: 'I possess infinite spiritual courage and unwavering self-confidence.',
  },
  {
    textMl: 'ഞാൻ സദാ ബാബയുടെ സ്മരണയിൽ ലയിച്ചിരിക്കുന്ന തപോമൂർത്തിയാണ്.',
    textEn: 'I am an embodiment of deep tapasya, immersed in sweet remembrance of Baba.',
  },
  {
    textMl: 'ഞാൻ സൃഷ്ടിയുടെ രക്ഷകനായ ശിവബാബയുടെ തുണയുള്ള അജയ്യനായ ആത്മാവാണ്.',
    textEn: 'I am an invincible soul, sheltered and empowered by Shiv Baba.',
  },
  {
    textMl: 'ഞാൻ സദാ സമ്പൂർണ്ണ പവിത്രതയുടെയും ദിവ്യ പ്രകാശത്തിന്റെയും മൂർത്തീരൂപമാണ്.',
    textEn: 'I am an embodiment of complete divine purity and celestial light.',
  },
];

/**
 * Extracts explicit Swaman text from raw Murli or blessing text if present.
 * Looks for patterns like "സ്വാമാനം:", "സ്വമാനം:", "സ്വാമാൻ:", "Swaman:"
 */
export function extractSwamanFromMurli(rawText: string): string | null {
  if (!rawText || !rawText.trim()) return null;

  const pattern = /(?:സ്വാമാനം|സ്വമാനം|സ്വാമാൻ|Swaman|Affirmation):?\s*([\s\S]*?)(?=(?:\n\s*വരദാനം|\n\s*സ്ലോഗൻ|\n\s*സാരം|\n\s*വിശദീകരണം|$))/i;
  const match = rawText.match(pattern);

  if (match && match[1]) {
    const lines = match[1]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 0) {
      return lines[0].replace(/^["'“‘]+|["'”’]+$/g, '').trim();
    }
  }

  return null;
}

/**
 * Resolves the daily Swaman for a specific date using day-of-month indexing.
 */
export function getSwamanByDate(dateStr: string = todayISO()): Swaman {
  const dateObj = new Date(dateStr);
  const dayOfMonth = isNaN(dateObj.getDate()) ? new Date().getDate() : dateObj.getDate();
  const index = (dayOfMonth - 1) % DAILY_SWAMAN_COLLECTION.length;
  return DAILY_SWAMAN_COLLECTION[index] || DEFAULT_SWAMAN;
}

/**
 * Retrieves today's cached Swaman from local storage.
 */
export function getCachedDailySwaman(dateStr: string = todayISO()): Swaman | null {
  return getJSON<Swaman | null>(`${STORAGE_KEYS.swaman}_${dateStr}`, null);
}

/**
 * Asynchronously fetches and caches today's Swaman affirmation.
 */
export async function fetchDailySwaman(
  dateStr: string = todayISO(),
  rawMurliText?: string
): Promise<Swaman> {
  const cached = getCachedDailySwaman(dateStr);
  if (cached && cached.textMl) {
    return cached;
  }

  let swamanObj: Swaman;

  if (rawMurliText) {
    const extracted = extractSwamanFromMurli(rawMurliText);
    if (extracted) {
      swamanObj = {
        textMl: extracted,
        textEn: 'I am a peaceful soul, seated in self-respect.',
      };
    } else {
      swamanObj = getSwamanByDate(dateStr);
    }
  } else {
    swamanObj = getSwamanByDate(dateStr);
  }

  // Persist locally for instant offline-first loading
  setJSON(`${STORAGE_KEYS.swaman}_${dateStr}`, swamanObj);
  setJSON(STORAGE_KEYS.swaman, swamanObj);

  return swamanObj;
}
