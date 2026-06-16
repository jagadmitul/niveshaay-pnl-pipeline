// =============================================================================
// Vercel serverless function: same-origin proxy to the Railway n8n webhook.
//
// Strategy: hedged Pro+Flash race.
//   1. Fire gemini-2.5-pro immediately (preferred accuracy).
//   2. After HEDGE_DELAY_MS, also fire gemini-2.5-flash in parallel.
//   3. Whichever returns a usable success first wins; the loser is aborted.
//
// Why: Pro takes 35-65s on real BSE PDFs and routinely brushes Vercel's 60s
// Hobby function cap (returning HTTP 200 with empty body). Flash returns in
// 8-25s. The hedge gives users Pro accuracy when it's fast and Flash speed
// when it isn't, inside a single same-origin call.
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  'https://niveshaay-n8n-production.up.railway.app/webhook/process-pdf';

const PRO_MODEL = 'gemini-2.5-pro';
const FLASH_MODEL = 'gemini-2.5-flash';

// Give Pro a head start before launching Flash; many filings finish in under
// 25s on Pro, in which case we never spend Flash tokens.
const HEDGE_DELAY_MS = 8_000;

// Stay below Vercel's 60s Hobby function cap so we return a clean error
// instead of letting Vercel kill the response mid-flight.
const UPSTREAM_TIMEOUT_MS = 56_000;

export const config = {
  maxDuration: 60,
};

type UpstreamSuccess = {
  kind: 'success';
  status: number;
  body: string;
  contentType: string | null;
  model: string;
};
type UpstreamEmpty = { kind: 'empty'; status: number; model: string };
type UpstreamError = { kind: 'error'; status: number; message: string; model: string };
type UpstreamResult = UpstreamSuccess | UpstreamEmpty | UpstreamError;

async function callRailway(
  payload: unknown,
  model: string,
  signal: AbortSignal,
): Promise<UpstreamResult> {
  const body = JSON.stringify({ ...(payload as Record<string, unknown>), model });
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal,
    });
    const text = await res.text();
    if (!text || text.length === 0) {
      return { kind: 'empty', status: res.status, model };
    }
    return {
      kind: 'success',
      status: res.status,
      body: text,
      contentType: res.headers.get('content-type'),
      model,
    };
  } catch (err) {
    const e = err as Error;
    return { kind: 'error', status: 502, message: e.message, model };
  }
}

function isUsableSuccess(r: UpstreamResult): r is UpstreamSuccess {
  return r.kind === 'success' && r.status >= 200 && r.status < 300;
}

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

  const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;

  const proCtrl = new AbortController();
  const flashCtrl = new AbortController();
  const proTimer = setTimeout(() => proCtrl.abort(), UPSTREAM_TIMEOUT_MS);
  const flashTimer = setTimeout(() => flashCtrl.abort(), UPSTREAM_TIMEOUT_MS);

  let proResult: UpstreamResult | null = null;
  let flashResult: UpstreamResult | null = null;

  const proPromise = callRailway(payload, PRO_MODEL, proCtrl.signal).then((r) => {
    proResult = r;
    return r;
  });

  // Start flash after the hedge delay (only if Pro hasn't already settled).
  const flashPromise: Promise<UpstreamResult> = new Promise((resolve) => {
    const t = setTimeout(() => {
      if (proResult && isUsableSuccess(proResult)) {
        // Pro already won; skip flash entirely.
        resolve(proResult);
        return;
      }
      callRailway(payload, FLASH_MODEL, flashCtrl.signal).then((r) => {
        flashResult = r;
        resolve(r);
      });
    }, HEDGE_DELAY_MS);
    // If pro wins before the hedge timer fires, cancel it.
    proPromise.then((r) => {
      if (isUsableSuccess(r)) {
        clearTimeout(t);
        resolve(r);
      }
    });
  });

  // Race: first usable success wins; on failure, prefer the model that did return.
  const winner = await new Promise<UpstreamResult>((resolve) => {
    let resolved = false;
    const settle = (r: UpstreamResult) => {
      if (resolved) return;
      resolved = true;
      resolve(r);
    };

    proPromise.then((r) => {
      if (isUsableSuccess(r)) {
        flashCtrl.abort();
        settle(r);
        return;
      }
      // Pro failed/empty. If flash already came back, decide now.
      if (flashResult) {
        settle(isUsableSuccess(flashResult) ? flashResult : r);
      }
    });

    flashPromise.then((r) => {
      if (isUsableSuccess(r)) {
        proCtrl.abort();
        settle(r);
        return;
      }
      if (proResult) {
        settle(isUsableSuccess(proResult) ? proResult : r);
      }
    });

    // Safety: if both end up failing without ever settling, force-resolve.
    Promise.allSettled([proPromise, flashPromise]).then(() => {
      const final = (proResult && isUsableSuccess(proResult))
        ? proResult
        : (flashResult && isUsableSuccess(flashResult))
          ? flashResult
          : (proResult ?? flashResult ?? { kind: 'error', status: 502, message: 'Both upstream calls failed.', model: 'unknown' });
      settle(final as UpstreamResult);
    });
  });

  clearTimeout(proTimer);
  clearTimeout(flashTimer);

  if (winner.kind === 'success') {
    res.status(winner.status);
    if (winner.contentType) res.setHeader('content-type', winner.contentType);
    res.send(winner.body);
    return;
  }

  if (winner.kind === 'empty') {
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

  res.status(winner.status || 502).json({
    success: false,
    error: {
      message: winner.message || 'Upstream call failed.',
      status: winner.status || 502,
      timestamp: new Date().toISOString(),
    },
  });
}
