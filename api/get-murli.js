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

function extractVardanText(rawHtml) {
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
    .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n\n')
    .replace(/<(p|div|tr|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]*>?/gm, ' ');

  // 1. Locate "വരദാനം" strictly when it appears as a section heading (e.g. "വരദാനം :-", "വരദാനം:").
  // Do not match mid-sentence words.
  const headingRegex =
    /(?:^|[^\p{L}\p{N}])(?:വരദാനം|വരദാൻ|Varadan|Blessing|वरदान)\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*([\s\S]*?)(?=(?:\n\s*(?:സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|അവ്യക്ത|വിശദീകരണം)|സ്ലോഗൻ|സ്ലോഗന്|സ്ലോഗന്‍|Slogan|മാതേശ്വരി|അവ്യക്ത|धारणा|स्पष्टीकरण|$))/iu;

  let contentToParse = decoded;
  const match = decoded.match(headingRegex);
  if (match && match[1]) {
    contentToParse = match[1];
  } else if (/^(?:വരദാനം|വരദാൻ|Varadan|Blessing|वरदान)/i.test(decoded.trim())) {
    contentToParse = decoded
      .trim()
      .replace(/^(?:വരദാനം|വരദാൻ|Varadan|Blessing|वरदान)\s*(?:\([^\)]*\)\s*)?(?::\s*[-–]|[-–]\s*:|[:\-–])\s*/iu, '');
  }

  // 2. Trim leading hyphens, colons, or whitespace
  let remaining = contentToParse.replace(/^[:\-–\s]+/, '').trim();

  // 3. Extract ONLY the first title sentence immediately following it, stopping strictly at the very first full stop (.)
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

  titleSentence = titleSentence
    .replace(/^[:\-–\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (titleSentence && !/[.!\u0964]$/.test(titleSentence)) {
    titleSentence += '.';
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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,HEAD');
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

  const rawLang = (req.query?.lang || 'ml').toLowerCase();
  const lang =
    rawLang === 'hindi' || rawLang === 'hi'
      ? 'hi'
      : rawLang === 'english' || rawLang === 'en'
      ? 'en'
      : 'ml';

  const date = req.query?.date || getTodayISTDateString();

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
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (response.ok) {
        const rawText = await response.text();
        if (rawText && rawText.length > 200) {
          const cleanedHtml = sanitizeHtmlContent(rawText);
          const vardan = extractVardanText(rawText);
          return res.status(200).json({
            success: true,
            lang,
            date,
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
