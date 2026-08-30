/**
 * Vercel Serverless Function: /api/daily-murli
 * Dynamically resolves today's Murli in IST, extracts Swaman & Varadanam,
 * translates to spiritual Malayalam, and returns unified multi-language resources.
 */

// Helper to calculate Indian Standard Time (UTC+5:30) date parts
function getISTDate(overrideDate) {
  let baseDate = new Date();
  if (overrideDate && typeof overrideDate === 'string' && overrideDate.includes('-')) {
    const [y, m, d] = overrideDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  }
  const utc = baseDate.getTime() + baseDate.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

function getFormattedDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const fullYear = dateObj.getFullYear();
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

  return {
    isoDate: `${fullYear}-${month}-${day}`,
    ddmmyy: `${day}.${month}.${shortYear}`,
    ddmmyyyy: `${day}.${month}.${fullYear}`,
    formattedDateGb: `${day}/${month}/${fullYear}`,
    formattedDateMl: `${dateObj.getDate()} ${monthsMl[dateObj.getMonth()]} ${fullYear} (${daysMl[dateObj.getDay()]})`,
    formattedDateEn: `${dateObj.getDate()} ${monthsEn[dateObj.getMonth()]} ${fullYear} (${daysEn[dateObj.getDay()]})`,
  };
}

// Free Google Translate API helper for Hindi to Malayalam
async function translateToMalayalam(text) {
  if (!text || !text.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=hi&tl=ml&dt=t&q=${encodeURIComponent(text.trim())}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0].map((item) => item[0]).join('').trim();
      }
    }
  } catch (err) {
    console.warn('[translateToMalayalam] translation error:', err.message);
  }
  return text;
}

// Extract Vardaan & Swaman from Hindi text
function extractHindiSections(htmlOrText) {
  const clean = htmlOrText.replace(/<[^>]*>?/gm, ' ');

  // Vardaan extraction pattern
  const varadanMatch = clean.match(/(?:वरदान[:\s]|वरदान\s*[-–:])\s*([\s\S]*?)(?=(?:स्पष्टीकरण|स्लोगन|धारणा|मातेश्वरी|$))/i);
  const rawVaradan = varadanMatch ? varadanMatch[1].replace(/\s+/g, ' ').trim() : '';

  // Slogan extraction pattern
  const sloganMatch = clean.match(/(?:स्लोगन[:\s]|स्लोगन\s*[-–:])\s*([\s\S]*?)(?=(?:मातेश्वरी|अव्यक्त|$))/i);
  const rawSlogan = sloganMatch ? sloganMatch[1].replace(/\s+/g, ' ').trim() : '';

  // Essence extraction pattern
  const essenceMatch = clean.match(/(?:सार[:\s]|सार\s*[-–:])\s*([\s\S]*?)(?=(?:प्रश्न|गीत|बाप के महावाक्य|$))/i);
  const rawEssence = essenceMatch ? essenceMatch[1].replace(/\s+/g, ' ').trim() : '';

  return {
    rawVaradan,
    rawSlogan,
    rawEssence,
  };
}

// Fallback spiritual affirmations in Malayalam
const FALLBACK_SWAMANS = [
  'ഞാൻ സദാ സർവ്വ ഗുണ സമ്പന്നനായ ശാന്തസ്വരൂപ ആത്മാവാണ്.',
  'ഞാൻ സർവ്വ ശക്തിമാനായ പരമാത്മാവിന്റെ മാസ്റ്റർ സർവ്വശക്തിവാൻ കുട്ടിയാണ്.',
  'ഞാൻ ശാന്തിയുടെയും സ്നേഹത്തിന്റെയും മൂർത്തസ്വരൂപമായ ദിവ്യ ആത്മാവാണ്.',
  'ഞാൻ സദാ ബാബയുടെ സുരക്ഷിതമായ ദിവ്യ സംരക്ഷണ വലയത്തിലാണ്.',
  'ഞാൻ വിജയീ രത്നമാണ്, വിജയം എന്റെ ജന്മാവകാശമാണ്.',
  'ഞാൻ പവിത്രതയുടെ കിരണങ്ങൾ പ്രസരിപ്പിക്കുന്ന പ്രകാശ സ്വരൂപമാണ്.',
];

const DEFAULT_VARADAN_ML = 'സർവ്വ ഖജനാവുകളാലും സമ്പന്നമായി, മാസ്റ്റർ ദാതാവായി മാറി സർവ്വ ആത്മാക്കൾക്കും ശാന്തിയുടെയും ശക്തിയുടെയും ദാനം നൽകുന്ന സദാ തൃപ്ത ആത്മാവായി ഭവിക്കട്ടെ.';
const DEFAULT_SLOGAN_ML = 'സ്വയം പരിവർത്തനത്തിലൂടെ ലോക പരിവർത്തനം ചെയ്യുക എന്നതാണ് ഏറ്റവും വലിയ ദിവ്യ സേവനം.';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const targetUrl = req.query?.url;
  if (targetUrl) {
    try {
      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (response.ok) {
        const text = await response.text();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(text);
      }
      return res.status(response.status).send('Failed to fetch from remote URL');
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  const istDate = getISTDate(queryDate);
  const dateInfo = getFormattedDate(istDate);
  const ddmmyy = dateInfo.ddmmyy;

  // Cloudinary & bkdrluhar standard asset URLs
  const mlPdfUrl = `https://res.cloudinary.com/tb5bmwd5/image/upload/murlis/${ddmmyy}-Mal.pdf`;
  const mlAudioUrl = `https://www.bkdrluhar.com/00-Murli/02-Audio/08-Malayalam/${ddmmyy}.mp3`;
  const mlHtmlUrl = `https://www.bkdrluhar.com/00-Murli/00-Html/08-Malayalam/${ddmmyy}.html`;

  const hiPdfUrl = `https://www.bkdrluhar.com/00-Murli/01-Pdf/02-Hindi/${ddmmyy}.pdf`;
  const hiAudioUrl = `https://www.bkdrluhar.com/00-Murli/02-Audio/02-Hindi/${ddmmyy}.mp3`;
  const hiHtmlUrl = `https://www.bkdrluhar.com/00-Murli/00-Html/02-Hindi/${ddmmyy}.html`;

  const enPdfUrl = `https://res.cloudinary.com/tb5bmwd5/image/upload/murlis/${ddmmyy}-Eng.pdf`;
  const enAudioUrl = `https://www.bkdrluhar.com/00-Murli/02-Audio/01-English/${ddmmyy}.mp3`;
  const enHtmlUrl = `https://www.bkdrluhar.com/00-Murli/00-Html/01-English/${ddmmyy}.html`;

  let swamanMl = FALLBACK_SWAMANS[istDate.getDate() % FALLBACK_SWAMANS.length];
  let varadanMl = DEFAULT_VARADAN_ML;
  let sloganMl = DEFAULT_SLOGAN_ML;
  let hindiText = '';
  let malayalamText = '';
  let englishText = '';

  try {
    // Attempt fetching Hindi HTML from bkdrluhar.com
    const hindiRes = await fetch(hiHtmlUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }).catch(() => null);

    if (hindiRes && hindiRes.ok) {
      hindiText = await hindiRes.text();
      const extracted = extractHindiSections(hindiText);

      if (extracted.rawVaradan) {
        const translatedVaradan = await translateToMalayalam(extracted.rawVaradan);
        if (translatedVaradan && translatedVaradan.length > 10) {
          varadanMl = translatedVaradan;
        }
      }

      if (extracted.rawSlogan) {
        const translatedSlogan = await translateToMalayalam(extracted.rawSlogan);
        if (translatedSlogan && translatedSlogan.length > 5) {
          sloganMl = translatedSlogan;
        }
      }
    }
  } catch (err) {
    console.warn('[daily-murli backend] scrape/translation error:', err.message);
  }

  // Unified Response Structure
  const responseData = {
    success: true,
    date: dateInfo.isoDate,
    ddmmyy: dateInfo.ddmmyy,
    ddmmyyyy: dateInfo.ddmmyyyy,
    formattedDateGb: dateInfo.formattedDateGb,
    formattedDateMl: dateInfo.formattedDateMl,
    formattedDateEn: dateInfo.formattedDateEn,
    heroData: {
      swaman: swamanMl,
      varadan: varadanMl,
      slogan: sloganMl,
      date: dateInfo.formattedDateMl,
    },
    languages: {
      malayalam: {
        label: 'മലയാളം',
        code: 'ml',
        pdfUrl: mlPdfUrl,
        htmlUrl: mlHtmlUrl,
        audioUrl: mlAudioUrl,
        fullText: malayalamText,
      },
      hindi: {
        label: 'हिन्दी',
        code: 'hi',
        pdfUrl: hiPdfUrl,
        htmlUrl: hiHtmlUrl,
        audioUrl: hiAudioUrl,
        fullText: hindiText,
      },
      english: {
        label: 'English',
        code: 'en',
        pdfUrl: enPdfUrl,
        htmlUrl: enHtmlUrl,
        audioUrl: enAudioUrl,
        fullText: englishText,
      },
    },
  };

  res.status(200).json(responseData);
}
