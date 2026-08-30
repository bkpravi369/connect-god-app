/**
 * Vercel Serverless Function: /api/varadanam
 * Serves the full dynamic Varadanam & Swaman JSON dataset
 */
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'data', 'varadanam.json'),
      path.join(process.cwd(), 'data', 'varadanam.json'),
      path.join(process.cwd(), 'data', 'malayalam_murli_vardans.json'),
      path.join(process.cwd(), 'malayalam_murli_vardans.json'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const data = JSON.parse(raw);
        return res.status(200).json(data);
      }
    }
  } catch (err) {
    console.error('Error serving /api/varadanam:', err);
  }

  return res.status(500).json({ error: 'Varadanam dataset not found' });
}
