// =============================================================================
// Vercel serverless function: same-origin proxy to the Railway n8n webhook.
//
// Strategy: pass the request straight through to Railway. The workflow uses
// the GEMINI_MODEL env var on Railway (set to gemini-2.5-pro), which is the
// exact same model the local docker-compose stack uses — so live output
// matches localhost output row-for-row.
//
// Why a function (not a vercel.json rewrite)?
//   * Rewrites cap at 30s on Vercel Hobby. gemini-2.5-pro routinely takes
//     30-55s on real BSE PDFs, so a static rewrite would 504 mid-flight.
//   * A Node function gives us 60s, which fits Pro comfortably.
//   * Same-origin from the browser dodges n8n's known cross-origin empty-body
//     CORS edge case.
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  'https://niveshaay-n8n-production.up.railway.app/webhook/process-pdf';

// Stay below Vercel's 60s Hobby function cap so we surface a clean 504
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

  // Pass the request body straight through. We deliberately do NOT inject a
  // model override here — the workflow reads $env.GEMINI_MODEL on Railway,
  // which is set to gemini-2.5-pro for the higher fidelity Niveshaay wants.
  const body =
    typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

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
          ? 'Pipeline took longer than 56s. Please retry.'
          : `Upstream call failed: ${(err as Error).message}`,
        status: aborted ? 504 : 502,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
