// =============================================================================
// Vercel serverless function: same-origin proxy to the Railway n8n webhook.
//
// Strategy: single call, model=gemini-2.5-flash by default.
//   * Flash returns in 8-25s on real BSE PDFs.
//   * If Gemini drifts on schema for a given filing, the workflow itself
//     retries internally with gemini-2.5-pro (see Parse Gemini Response).
//   * Total worst-case stays comfortably inside Vercel's 60s function cap.
//
// Why this and not a hedge race?
//   * Hedge race (pro+flash in parallel) often double-paid Gemini and
//     occasionally pushed total time past 60s, which Vercel killed mid-response.
//   * Letting the workflow handle accuracy fallback keeps the Vercel hop
//     deterministic and the proxy code simple.
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  'https://niveshaay-n8n-production.up.railway.app/webhook/process-pdf';

const DEFAULT_MODEL = 'gemini-2.5-flash';

// Stay below Vercel's 60s Hobby function cap so we surface a clean error
// instead of letting Vercel kill the response mid-flight.
const UPSTREAM_TIMEOUT_MS = 56_000;

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: {
        message: 'Method not allowed. Use POST.',
        status: 405,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const payload =
    typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  // Caller can override the model; default to flash for fast response.
  const bodyOut = { ...payload, model: payload.model || DEFAULT_MODEL };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(bodyOut),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await upstream.text();

    if (!text) {
      res.status(502).json({
        success: false,
        error: {
          message: 'Upstream pipeline returned an empty body.',
          status: 502,
          timestamp: new Date().toISOString(),
        },
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
          ? 'Pipeline took longer than 56s. Please retry; Gemini is sometimes slow on large filings.'
          : `Upstream call failed: ${(err as Error).message}`,
        status: aborted ? 504 : 502,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
