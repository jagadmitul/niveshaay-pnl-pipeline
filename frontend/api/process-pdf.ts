import type { VercelRequest, VercelResponse } from '@vercel/node';

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  'https://niveshaay-n8n-production.up.railway.app/webhook/process-pdf';

// Slightly under Vercel's 60s function ceiling so we return a clean 504 instead
// of letting Vercel kill the response mid-flight.
const UPSTREAM_TIMEOUT_MS = 56_000;

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: { message: 'Method not allowed.', status: 405, timestamp: new Date().toISOString() },
    });
    return;
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await upstream.text();
    if (!text) {
      res.status(502).json({
        success: false,
        error: { message: 'Upstream returned an empty body.', status: 502, timestamp: new Date().toISOString() },
      });
      return;
    }

    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    res.send(text);
  } catch (err) {
    clearTimeout(timer);
    const aborted = (err as Error).name === 'AbortError';
    res.status(aborted ? 504 : 502).json({
      success: false,
      error: {
        message: aborted
          ? 'Pipeline took longer than 56s. Please retry.'
          : `Upstream call failed: ${(err as Error).message}`,
        status: aborted ? 504 : 502,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
