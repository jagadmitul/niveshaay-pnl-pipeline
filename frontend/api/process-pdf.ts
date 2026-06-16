// =============================================================================
// Vercel serverless function: same-origin proxy to the Railway n8n webhook.
//
// Why this exists (vs. a vercel.json rewrite):
//   - Vercel rewrites are capped at 30s on the Hobby plan.
//   - gemini-2.5-pro responses on real BSE PDFs run 35-60s.
//   - A Node serverless function gives us 60s (Hobby) / 300s (Pro) instead.
//   - Same-origin from the browser keeps us out of n8n's documented
//     cross-origin empty-body CORS edge case.
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  'https://niveshaay-n8n-production.up.railway.app/webhook/process-pdf';

// Stay just below Vercel's 60s function timeout so we can return a clean
// timeout error instead of letting Vercel kill the connection mid-response.
const UPSTREAM_TIMEOUT_MS = 58_000;

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const text = await upstream.text();

    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);

    if (!text) {
      // n8n occasionally returns 200 with empty body when something upstream
      // is malformed. Surface a real error so the frontend doesn't show a
      // confusing success state.
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

    res.send(text);
  } catch (err) {
    clearTimeout(timer);
    const aborted = (err as Error).name === 'AbortError';
    res.status(aborted ? 504 : 502).json({
      success: false,
      error: {
        message: aborted
          ? 'Pipeline took longer than 58s. Gemini may be slow; please retry.'
          : `Upstream call failed: ${(err as Error).message}`,
        status: aborted ? 504 : 502,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
