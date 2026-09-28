/**
 * Vercel Serverless Function: /api/download
 * Proxy download endpoint to resolve cross-origin download restrictions and
 * missing Content-Disposition attachment headers on Cloudflare R2 audio files.
 * Streams audio files with forced download headers.
 */

import { Readable, pipeline } from 'stream';

function sanitizeFilename(title, fallback) {
  let name = (title || fallback || 'audio_track').trim();
  // Strip any trailing audio file extensions
  name = name.replace(/\.(mp3|wav|m4a|aac|ogg|mpeg|flac)$/i, '').trim();
  // Replace illegal filename characters with underscores
  const cleanTitle = name.replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'audio_track';
  // ASCII fallback for older user-agents
  const asciiTitle = cleanTitle.replace(/[^\x20-\x7E]/g, '').trim() || 'audio_track';
  // RFC 5987 / RFC 6266 encoded filename for modern browsers supporting Unicode (Malayalam, Hindi, etc.)
  const encodedTitle = encodeURIComponent(`${cleanTitle}.mp3`);

  return {
    cleanTitle,
    asciiName: `${asciiTitle}.mp3`,
    encodedName: encodedTitle,
  };
}

function setStatus(res, code) {
  if (typeof res.status === 'function') {
    res.status(code);
  } else {
    res.statusCode = code;
  }
  return res;
}

function sendJson(res, code, data) {
  setStatus(res, code);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (typeof res.json === 'function') {
    return res.json(data);
  }
  return res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  // CORS & caching headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    setStatus(res, 200);
    return res.end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const rawUrl = req.query?.url;
  const rawTitle = req.query?.title;

  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return sendJson(res, 400, { error: 'Missing required "url" parameter' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawUrl.trim());
  } catch (err) {
    return sendJson(res, 400, { error: 'Invalid URL format' });
  }

  if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    return sendJson(res, 400, { error: 'Only http and https protocols are supported' });
  }

  // Derive default title from URL pathname if not explicitly provided
  const urlPathname = targetUrl.pathname;
  const fallbackFromUrl = decodeURIComponent(urlPathname.split('/').pop() || 'audio_track');
  const { cleanTitle, asciiName, encodedName } = sanitizeFilename(rawTitle, fallbackFromUrl);

  try {
    const upstreamRes = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ConnectGodApp-DownloadProxy/1.0)',
      },
    });

    if (!upstreamRes.ok) {
      const statusCode = upstreamRes.status >= 400 && upstreamRes.status < 500 ? 502 : upstreamRes.status;
      return sendJson(res, statusCode, {
        error: `Failed to fetch audio from source: ${upstreamRes.status} ${upstreamRes.statusText}`,
      });
    }

    const contentType = upstreamRes.headers.get('content-type') || 'audio/mpeg';
    const contentLength = upstreamRes.headers.get('content-length');

    res.setHeader(
      'Content-Type',
      contentType.includes('audio') || contentType.includes('octet-stream') ? contentType : 'audio/mpeg'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`
    );

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    setStatus(res, 200);

    if (req.method === 'HEAD') {
      return res.end();
    }

    pipeline(Readable.fromWeb(upstreamRes.body), res, (err) => {
      if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        console.error('[api/download] Pipeline streaming error:', err);
      }
    });
  } catch (error) {
    console.error('[api/download] Fetch error:', error);
    if (!res.headersSent) {
      return sendJson(res, 502, { error: 'Failed to connect to audio host' });
    }
  }
}
