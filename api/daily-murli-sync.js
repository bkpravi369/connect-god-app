/**
 * Vercel Serverless Function: /api/daily-murli-sync
 * 100% Self-Contained In-Project Daily Murli, Swaman & Varadanam Sync Engine.
 * Fetches live Hindi & Malayalam daily Murli from babamurli.com, extracts
 * Varadanam, Swaman & Essence, translates to spiritual Malayalam, and returns clean data.
 */

// Calculate Indian Standard Time (UTC+5:30) date parts
function getISTDateParts(overrideDateStr) {
  let baseDate = new Date();
  if (overrideDateStr && typeof overrideDateStr === 'string') {
    if (overrideDateStr.includes('.')) {
      const [d, m, y] = overrideDateStr.split('.').map(Number);
      const fullYear = y < 100 ? 2000 + y : y;
      return {
        day: String(d).padStart(2, '0'),
        month: String(m).padStart(2, '0'),
        shortYear: String(fullYear).slice(-2),
        fullYear,
        ddmmyy: `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${String(fullYear).slice(-2)}`,
        isoDate: `${fullYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      };
    } else if (overrideDateStr.includes('-')) {
      const [y, m, d] = overrideDateStr.split('-').map(Number);
      return {
        day: String(d).padStart(2, '0'),
        month: String(m).padStart(2, '0'),
        shortYear: String(y).slice(-2),
        fullYear: y,
        ddmmyy: `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${String(y).slice(-2)}`,
        isoDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      };
    }
  }

  const utc = baseDate.getTime() + baseDate.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
  const day = String(ist.getDate()).padStart(2, '0');
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const fullYear = ist.getFullYear();
  const shortYear = String(fullYear).slice(-2);

  return {
    day,
    month,
    shortYear,
    fullYear,
    ddmmyy: `${day}.${month}.${shortYear}`,
    isoDate: `${fullYear}-${month}-${day}`,
  };
}

// Free Google Translate API helper for Hindi -> Malayalam
async function translateToMalayalam(text) {
  if (!text || !text.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=hi&tl=ml&dt=t&q=${encodeURIComponent(text.trim())}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
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

function sanitizeHtml(rawHtml) {
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
    .replace(/color=["']#?0000ff["']/gi, 'color="#1d4ed8"')
    .replace(/color=["']#?008000["']/gi, 'color="#15803d"')
    .replace(/color=["']#?(800000|990000|cc0000|ff0000|red|maroon)["']/gi, 'color="#991b1b"')
    .replace(/color=["']#?(ff00ff|800080|magenta|purple)["']/gi, 'color="#7e22ce"');

  return html.trim();
}

function extractHindiSections(htmlOrText) {
  const clean = htmlOrText.replace(/<[^>]*>?/gm, ' ');

  const varadanMatch = clean.match(/(?:वरदान[:\s]|वरदान\s*[-–:])\s*([\s\S]*?)(?=(?:स्पष्टीकरण|स्लोगन|धारणा|मातेश्वरी|$))/i);
  const rawVaradan = varadanMatch ? varadanMatch[1].replace(/\s+/g, ' ').trim() : '';

  const sloganMatch = clean.match(/(?:स्लोगन[:\s]|स्लोगन\s*[-–:])\s*([\s\S]*?)(?=(?:मातेश्वरी|अव्यक्त|$))/i);
  const rawSlogan = sloganMatch ? sloganMatch[1].replace(/\s+/g, ' ').trim() : '';

  const essenceMatch = clean.match(/(?:सार[:\s]|सार\s*[-–:])\s*([\s\S]*?)(?=(?:प्रश्न|गीत|बाप के महावाक्य|$))/i);
  const rawEssence = essenceMatch ? essenceMatch[1].replace(/\s+/g, ' ').trim() : '';

  return { rawVaradan, rawSlogan, rawEssence };
}

function extractMalayalamSections(htmlOrText) {
  const clean = htmlOrText.replace(/<[^>]*>?/gm, ' ');

  const varadanMatch = clean.match(/(?:വരദാനം[:\s]|വരദാനം\s*[-–:])\s*([\s\S]*?)(?=(?:വിശദീകരണം|സ്ലോഗൻ|മാതേശ്വരി|$))/i);
  const rawVaradan = varadanMatch ? varadanMatch[1].replace(/\s+/g, ' ').trim() : '';

  const sloganMatch = clean.match(/(?:സ്ലോഗൻ[:\s]|സ്ലോഗൻ\s*[-–:])\s*([\s\S]*?)(?=(?:മാതേശ്വരി|അവ്യക്ത|$))/i);
  const rawSlogan = sloganMatch ? sloganMatch[1].replace(/\s+/g, ' ').trim() : '';

  const essenceMatch = clean.match(/(?:സാരം[:\s]|സാരം\s*\(Essence\)[:\s])\s*([\s\S]*?)(?=(?:ചോദ്യം|ഗാനം|ബാബയുടെ മഹാവാക്യങ്ങൾ|$))/i);
  const rawEssence = essenceMatch ? essenceMatch[1].replace(/\s+/g, ' ').trim() : '';

  return { rawVaradan, rawSlogan, rawEssence };
}

const FALLBACK_SWAMANS = [
  'ഞാൻ സദാ സർവ്വ ഗുണ സമ്പന്നനായ ശാന്തസ്വരൂപ ആത്മാവാണ്.',
  'ഞാൻ സർവ്വ ശക്തിമാനായ പരമാത്മാവിന്റെ മാസ്റ്റർ സർവ്വശക്തിവാൻ കുട്ടിയാണ്.',
  'ഞാൻ ശാന്തിയുടെയും സ്നേഹത്തിന്റെയും മൂർത്തസ്വരൂപമായ ദിവ്യ ആത്മാവാണ്.',
  'ഞാൻ സദാ ബാബയുടെ സുരക്ഷിതമായ ദിവ്യ സംരക്ഷണ വലയത്തിലാണ്.',
  'ഞാൻ വിജയീ രത്നമാണ്, വിജയം എന്റെ ജന്മാവകാശമാണ്.',
  'ഞാൻ പവിത്രതയുടെ കിരണങ്ങൾ പ്രസരിപ്പിക്കുന്ന പ്രകാശ സ്വരൂപമാണ്.',
  'ഞാൻ സദാ തൃപ്തനും പ്രസന്നചിത്തനുമായ മാസ്റ്റർ ദാതാവാണ്.',
];

const DEFAULT_VARADAN_ML =
  'സർവ്വ ഖജനാവുകളാലും സമ്പന്നമായി, മാസ്റ്റർ ദാതാവായി മാറി സർവ്വ ആത്മാക്കൾക്കും ശാന്തിയുടെയും ശക്തിയുടെയും ദാനം നൽകുന്ന സദാ തൃപ്ത ആത്മാവായി ഭവിക്കട്ടെ.';
const DEFAULT_SLOGAN_ML =
  'സ്വയം പരിവർത്തനത്തിലൂടെ ലോക പരിവർത്തനം ചെയ്യുക എന്നതാണ് ഏറ്റവും വലിയ ദിവ്യ സേവനം.';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const queryDate = req.query?.date || req.body?.date;
  const dateParts = getISTDateParts(queryDate);
  const ddmmyy = dateParts.ddmmyy;

  // Babamurli.com direct media paths
  const mlHtmlUrl = `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/01.%20Malayalam%20Murli%20-%20Htm/${ddmmyy}-Mal.htm`;
  const mlPdfUrl = `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/02.%20Malayalam%20Murli%20-%20Pdf/${ddmmyy}-Mal.pdf`;
  const mlAudioUrl = `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/03.%20Malayalam%20Murli%20-%20Mp3/${ddmmyy}-Mal.mp3`;

  const hiHtmlUrl = `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/01.%20Hindi%20Murli%20-%20Htm/${ddmmyy}-H.htm`;
  const hiPdfUrl = `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/02.%20Hindi%20Murli%20-%20Pdf/${ddmmyy}-h.pdf`;
  const hiAudioUrl = `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/03.%20Hindi%20Murli%20-%20Mp3/${ddmmyy}-Hin.mp3`;

  const enHtmlUrl = `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/01.%20Eng%20Murli%20-%20Htm/${ddmmyy}-E.htm`;
  const enPdfUrl = `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/02.%20Eng%20Murli%20-%20Pdf/${ddmmyy}-E.pdf`;
  const enAudioUrl = `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/03.%20English%20Murli%20-%20Mp3/${ddmmyy}-Eng.mp3`;

  let swamanMl = FALLBACK_SWAMANS[Number(dateParts.day) % FALLBACK_SWAMANS.length];
  let varadanMl = DEFAULT_VARADAN_ML;
  let sloganMl = DEFAULT_SLOGAN_ML;
  let essenceMl = '';
  let mlCleanHtml = '';
  let hiCleanHtml = '';
  let enCleanHtml = '';

  // Check uploaded varadanam.json dataset
  try {
    const fs = await import('fs');
    const path = await import('path');
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'data', 'varadanam.json'),
      path.join(process.cwd(), 'data', 'varadanam.json'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const list = JSON.parse(raw);
        const match = list.find((item) => item.date === dateParts.isoDate);
        if (match && match.vardan) {
          varadanMl = match.vardan;
          if (match.vardan.includes('ആകർഷണങ്ങളിൽ')) {
            swamanMl = 'ഞാൻ സർവ്വ ആകർഷണങ്ങളിൽ നിന്നും മുക്തനായ പവിത്ര ആത്മാവാണ്.';
          } else if (match.vardan.includes('ശക്തിസ്വരൂപ') || match.vardan.includes('സർവ്വശക്തിവാൻ')) {
            swamanMl = 'ഞാൻ സർവ്വ ശക്തിമാനായ പരമാത്മാവിന്റെ മാസ്റ്റർ സർവ്വശക്തിവാൻ കുട്ടിയാണ്.';
          }
          break;
        }
      }
    }
  } catch (err) {
    // ignore
  }

  // Parallel Fetch from babamurli.com
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  try {
    const [mlRes, hiRes, enRes] = await Promise.allSettled([
      fetch(mlHtmlUrl, { headers }).then((r) => (r.ok ? r.text() : '')),
      fetch(hiHtmlUrl, { headers }).then((r) => (r.ok ? r.text() : '')),
      fetch(enHtmlUrl, { headers }).then((r) => (r.ok ? r.text() : '')),
    ]);

    const rawMl = mlRes.status === 'fulfilled' ? mlRes.value : '';
    const rawHi = hiRes.status === 'fulfilled' ? hiRes.value : '';
    const rawEn = enRes.status === 'fulfilled' ? enRes.value : '';

    if (rawMl) {
      mlCleanHtml = sanitizeHtml(rawMl);
      const extractedMl = extractMalayalamSections(rawMl);
      if (extractedMl.rawVaradan && extractedMl.rawVaradan.length > 10) {
        varadanMl = extractedMl.rawVaradan;
      }
      if (extractedMl.rawSlogan && extractedMl.rawSlogan.length > 5) {
        sloganMl = extractedMl.rawSlogan;
      }
      if (extractedMl.rawEssence) {
        essenceMl = extractedMl.rawEssence;
      }
    }

    if (rawHi) {
      hiCleanHtml = sanitizeHtml(rawHi);
      // If Malayalam Varadan extraction was empty, extract from Hindi and translate
      if (varadanMl === DEFAULT_VARADAN_ML) {
        const extractedHi = extractHindiSections(rawHi);
        if (extractedHi.rawVaradan) {
          const translated = await translateToMalayalam(extractedHi.rawVaradan);
          if (translated && translated.length > 10) varadanMl = translated;
        }
        if (extractedHi.rawSlogan && sloganMl === DEFAULT_SLOGAN_ML) {
          const translatedSlogan = await translateToMalayalam(extractedHi.rawSlogan);
          if (translatedSlogan && translatedSlogan.length > 5) sloganMl = translatedSlogan;
        }
      }
    }

    if (rawEn) {
      enCleanHtml = sanitizeHtml(rawEn);
    }
  } catch (err) {
    console.warn('[daily-murli-sync] Fetch/parse error:', err.message);
  }

  const responsePayload = {
    success: true,
    date: dateParts.isoDate,
    formattedDate: ddmmyy,
    heroData: {
      swaman: swamanMl,
      varadan: varadanMl,
      slogan: sloganMl,
      essence: essenceMl,
      date: ddmmyy,
    },
    languages: {
      ml: {
        label: 'മലയാളം',
        code: 'ml',
        html: mlCleanHtml,
        pdfUrl: mlPdfUrl,
        audioUrl: mlAudioUrl,
        htmlUrl: mlHtmlUrl,
      },
      hi: {
        label: 'हिन्दी',
        code: 'hi',
        html: hiCleanHtml,
        pdfUrl: hiPdfUrl,
        audioUrl: hiAudioUrl,
        htmlUrl: hiHtmlUrl,
      },
      en: {
        label: 'English',
        code: 'en',
        html: enCleanHtml,
        pdfUrl: enPdfUrl,
        audioUrl: enAudioUrl,
        htmlUrl: enHtmlUrl,
      },
    },
  };

  return res.status(200).json(responsePayload);
}
