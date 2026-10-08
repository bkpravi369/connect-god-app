/**
 * Vercel Serverless API Route: /api/get-murli
 * Fetches and sanitizes live daily Murli HTML directly on the server without client-side CORS issues.
 */

function sanitizeHtmlContent(rawHtml) {
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
    // Enhance spiritual color highlights
    .replace(/color=["']#?0000ff["']/gi, 'color="#1d4ed8"')
    .replace(/color=["']#?008000["']/gi, 'color="#15803d"')
    .replace(/color=["']#?(800000|990000|cc0000|ff0000|red|maroon)["']/gi, 'color="#991b1b"')
    .replace(/color=["']#?(ff00ff|800080|magenta|purple)["']/gi, 'color="#7e22ce"')
    .replace(/color=["']#?6600cc["']/gi, 'color="#6b21a8"');

  return html.trim();
}

function extractVardanText(rawHtml, lang = 'ml') {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  const decoded = rawHtml
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
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

  // 1. Locate heading strictly when it appears as a section heading (e.g. "വരദാനം :-", "വരദാനം:").
  // Must match strictly at start-of-line. Do not match mid-sentence words in discourse.
  const headingRegex =
    lang === 'ml'
      ? /(?:^|\n)\s*വരദാനം(?:\s*\(Blessing\))?\s*(?::\s*[-–]|[-–]\s*:|[:\-–])\s*([\s\S]*?)(?=(?:\n\s*(?:സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|വിശദീകരണം)|സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|വിശദീകരണം|$))/i
      : /(?:^|\n)\s*(?:Varadan|Blessing|വരദാനം|वरदान)\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*([\s\S]*?)(?=(?:\n\s*(?:സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|വിശദീകരണം|धारणा|स्पष्टीकरण)|സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|धारणा|स्पष्टीकरण|$))/i;

  let contentToParse = '';
  const match = decoded.match(headingRegex);
  if (match && match[1]) {
    contentToParse = match[1];
  } else if (/^(?:വരദാനം|വരദാൻ|Varadan|Blessing|वरदान)\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])/i.test(decoded.trim())) {
    contentToParse = decoded
      .trim()
      .replace(/^(?:വരദാനം|വരദാൻ|Varadan|Blessing|वरदान)\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*/iu, '');
  }

  if (!contentToParse) return '';

  // 2. Trim leading hyphens, colons, or whitespace
  let remaining = contentToParse.replace(/^[:\-–\s]+/, '').trim();

  // 3. Extract ONLY the main blessing sentence immediately following it, stopping strictly at the very first full stop (.)
  let titleSentence = '';
  const benMatch = remaining.match(/^([\s\S]*?(?:ഭവിക്കട്ടെ|ഭവിക്കുക|ആകട്ടെ|ഭവിപ്പൂതാക|ഭവ:|भव)[.!\u0964]?)/i);
  const dotIdx = remaining.indexOf('.');

  if (dotIdx !== -1 && (!benMatch || dotIdx <= benMatch[1].length)) {
    titleSentence = remaining.slice(0, dotIdx + 1).trim();
  } else if (benMatch && benMatch[1].trim().length > 15) {
    titleSentence = benMatch[1].trim();
  } else if (dotIdx !== -1) {
    titleSentence = remaining.slice(0, dotIdx + 1).trim();
  } else {
    const newlineIdx = remaining.indexOf('\n');
    titleSentence = newlineIdx !== -1 ? remaining.slice(0, newlineIdx).trim() : remaining.trim();
  }

  titleSentence = titleSentence
    .replace(/^[:\-–\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (titleSentence && !/[.!\u0964]$/.test(titleSentence)) {
    titleSentence += '.';
  }

  if (lang === 'ml') {
    const hasMalayalam = /[\u0D00-\u0D7F]/.test(titleSentence);
    const hasHindi = /[\u0900-\u097F]/.test(titleSentence);
    if (!hasMalayalam || hasHindi) return '';
  }

  return titleSentence.length > 15 ? titleSentence : '';
}

function getTodayISTDateString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
  const dd = String(ist.getDate()).padStart(2, '0');
  const mm = String(ist.getMonth() + 1).padStart(2, '0');
  const yy = String(ist.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

export default async function handler(req, res) {
  // CORS & Strict Cache-Control Headers to ensure completely fresh daily fetches
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawLang = (req.query?.lang || 'ml').toLowerCase();
  const lang =
    rawLang === 'hindi' || rawLang === 'hi'
      ? 'hi'
      : rawLang === 'english' || rawLang === 'en'
      ? 'en'
      : 'ml';

  // Support date in either DD.MM.YY or YYYY-MM-DD (e.g. 2026-10-07)
  let rawDate = req.query?.date || req.query?.date_ymd || getTodayISTDateString();
  let date = rawDate;
  let dateYmd = '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    dateYmd = rawDate;
    const [yyyy, mm, dd] = rawDate.split('-');
    date = `${dd}.${mm}.${yyyy.slice(-2)}`;
  } else if (/^\d{2}\.\d{2}\.\d{2}$/.test(rawDate)) {
    const [dd, mm, yy] = rawDate.split('.');
    dateYmd = `20${yy}-${mm}-${dd}`;
  } else {
    date = getTodayISTDateString();
    const [dd, mm, yy] = date.split('.');
    dateYmd = `20${yy}-${mm}-${dd}`;
  }

  const candidates =
    lang === 'hi'
      ? [
          `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/01.%20Hindi%20Murli%20-%20Htm/${date}-H.htm`,
          `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/01.%20Hindi%20Murli%20-%20Htm/${date}-Hin.htm`,
          `https://www.babamurli.com/01.%20Daily%20Murli/01.%20Hindi/01.%20Hindi%20Murli%20-%20Htm/${date}-Hindi.htm`,
        ]
      : lang === 'en'
      ? [
          `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/01.%20Eng%20Murli%20-%20Htm/${date}-E.htm`,
          `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/01.%20English%20Murli%20-%20Htm/${date}-Eng.htm`,
          `https://www.babamurli.com/01.%20Daily%20Murli/02.%20English/01.%20Eng%20Murli%20-%20Htm/${date}-English.htm`,
        ]
      : [
          `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/01.%20Malayalam%20Murli%20-%20Htm/${date}-Mal.htm`,
          `https://www.babamurli.com/01.%20Daily%20Murli/06.%20Malayalam/01.%20Malayalam%20Murli%20-%20Htm/${date}-Malayalam.htm`,
        ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
      });

      if (response.ok) {
        const rawText = await response.text();
        if (rawText && rawText.length > 200) {
          const cleanedHtml = sanitizeHtmlContent(rawText);
          const vardan = extractVardanText(rawText, lang);
          return res.status(200).json({
            success: true,
            lang,
            date,
            date_ymd: dateYmd,
            sourceUrl: url,
            html: cleanedHtml,
            vardan,
          });
        }
      }
    } catch (err) {
      console.warn(`[get-murli] Error fetching from ${url}:`, err.message);
    }
  }

  return res.status(404).json({
    success: false,
    error: `Could not fetch live Murli for ${lang} on ${date}`,
  });
}
