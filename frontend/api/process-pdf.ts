// =============================================================================
// Vercel serverless function: same-origin proxy to the Railway n8n webhook.
//
// Strategy: race gemini-2.5-pro and gemini-2.5-flash in parallel.
//   * Pro is the accuracy default (picks consolidated over standalone, includes
//     all expense rows). Returns in 25-55s on real BSE PDFs.
//   * Flash is the safety net (8-25s) for PDFs where Pro brushes Vercel's 60s
//     function cap.
//   * Whichever returns FIRST with a usable success body wins. The loser is
//     aborted to save Gemini tokens on the slow side.
//   * If Pro returns within ~3s of Flash, we hand back Pro's answer for the
//     better fidelity.
//
// This costs roughly 1.3-1.6x the Gemini tokens of a single call but gives the
// user the most accurate result available within Vercel's hard 60s ceiling.
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  'https://niveshaay-n8n-production.up.railway.app/webhook/process-pdf';

const PRO_MODEL = 'gemini-2.5-pro';
const FLASH_MODEL = 'gemini-2.5-flash';

// Vercel Hobby caps Node functions at 60s; stay below so we return a clean
// timeout error instead of letting Vercel kill the response mid-flight.
const UPSTREAM_TIMEOUT_MS = 56_000;

// If Flash returns first but Pro is "close behind", prefer Pro's higher
// fidelity. Pro typically lands 15-25s after Flash on real BSE PDFs, so we
// give it a generous window before falling back to Flash. The cap is bounded
// by UPSTREAM_TIMEOUT_MS so we never blow past Vercel's 60s function limit.
//
// Why this matters: Arjun's prompt tells Gemini to "intelligently add or
// remove fields". Flash takes that liberty more aggressively and condenses
// the output to 6-9 rows; Pro stays closer to the full 12-21 row spec.
// Waiting for Pro keeps the live output matching the reference iValue card.
const PRO_PREFERENCE_WINDOW_MS = 22_000;

export const config = {
  maxDuration: 60,
};

type UpstreamResult = {
  status: number;
  body: string;
  contentType: string | null;
  model: string;
  // A "real" successful extraction: HTTP 2xx + body parses + success:true with data.
  // Crucially this is FALSE for no_pnl_found / error envelopes, so the race
  // keeps waiting for the other model to produce a real answer.
  isUsable: boolean;
  // Truthy when the upstream returned a structurally-fine but non-success
  // envelope (e.g. no_pnl_found, schema-drift error). We can fall back to this
  // if neither model produced a usable extraction.
  isWellFormedNegative: boolean;
};

async function callRailway(
  payload: unknown,
  model: string,
  signal: AbortSignal,
): Promise<UpstreamResult> {
  const body = JSON.stringify({ ...(payload as Record<string, unknown>), model });
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    signal,
  });
  const text = await res.text();
  let isUsable = false;
  let isWellFormedNegative = false;
  if (res.status >= 200 && res.status < 300 && text.length > 0) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.success === true && parsed.data) {
        isUsable = true;
      } else {
        // success:false (no_pnl_found, validation error, etc.) — well-formed but
        // not a real extraction.
        isWellFormedNegative = true;
      }
    } catch {
      // Non-JSON body. Treat as not usable.
    }
  }
  return {
    status: res.status,
    body: text,
    contentType: res.headers.get('content-type'),
    model,
    isUsable,
    isWellFormedNegative,
  };
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

  const payload =
    typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  const proCtrl = new AbortController();
  const flashCtrl = new AbortController();
  const proTimer = setTimeout(() => proCtrl.abort(), UPSTREAM_TIMEOUT_MS);
  const flashTimer = setTimeout(() => flashCtrl.abort(), UPSTREAM_TIMEOUT_MS);

  let proResult: UpstreamResult | null = null;
  let proError: Error | null = null;
  let flashResult: UpstreamResult | null = null;
  let flashError: Error | null = null;

  const proPromise = callRailway(payload, PRO_MODEL, proCtrl.signal)
    .then((r) => { proResult = r; return r; })
    .catch((e: Error) => { proError = e; throw e; });

  const flashPromise = callRailway(payload, FLASH_MODEL, flashCtrl.signal)
    .then((r) => { flashResult = r; return r; })
    .catch((e: Error) => { flashError = e; throw e; });

  // Race for a usable success. We re-evaluate every time either promise settles.
  const winner: UpstreamResult | null = await new Promise((resolve) => {
    let resolved = false;
    const settle = (r: UpstreamResult | null) => {
      if (resolved) return;
      resolved = true;
      resolve(r);
    };

    proPromise.then(
      (r) => {
        // Pro returned first with a usable body — easy win.
        if (r.isUsable) {
          flashCtrl.abort();
          settle(r);
          return;
        }
        // Pro failed/empty; if flash already came back, decide now.
        if (flashResult || flashError) {
          settle(flashResult && flashResult.isUsable ? flashResult : r);
        }
      },
      () => {
        // Pro threw (likely aborted). Defer to flash if it has anything.
        if (flashResult || flashError) {
          settle(flashResult && flashResult.isUsable ? flashResult : null);
        }
      },
    );

    flashPromise.then(
      (r) => {
        if (r.isUsable) {
          // If Pro has already returned a usable body, keep Pro (more accurate).
          if (proResult && proResult.isUsable) {
            flashCtrl.abort();
            settle(proResult);
            return;
          }
          // Brief grace window: if Pro is still in-flight, wait a moment in case
          // it finishes with a better answer.
          const grace = setTimeout(() => {
            // Take whichever usable answer we have.
            const winner =
              proResult && proResult.isUsable ? proResult : r;
            settle(winner);
          }, PRO_PREFERENCE_WINDOW_MS);
          // If pro settles inside the grace window, the proPromise.then above
          // will fire settle() and we'll clear this timer indirectly via
          // `resolved`. No explicit clearTimeout needed.
          proPromise.then(
            (pr) => {
              if (pr.isUsable) {
                clearTimeout(grace);
                flashCtrl.abort();
                settle(pr);
              }
            },
            () => { /* pro aborted/threw; grace timer will pick flash */ },
          );
          return;
        }
        // Flash failed/empty; if pro is also already in, decide.
        if (proResult || proError) {
          settle(proResult && proResult.isUsable ? proResult : r);
        }
      },
      () => {
        if (proResult || proError) {
          settle(proResult && proResult.isUsable ? proResult : null);
        }
      },
    );

    // Final safety net: if both settle without anyone calling settle, force-resolve.
    Promise.allSettled([proPromise, flashPromise]).then(() => {
      const best =
        (proResult && proResult.isUsable && proResult) ||
        (flashResult && flashResult.isUsable && flashResult) ||
        proResult ||
        flashResult ||
        null;
      settle(best);
    });
  });

  clearTimeout(proTimer);
  clearTimeout(flashTimer);

  if (winner && winner.isUsable) {
    res.status(winner.status);
    if (winner.contentType) res.setHeader('content-type', winner.contentType);
    res.send(winner.body);
    return;
  }

  if (winner) {
    // We got a response but it wasn't a 2xx — pass it through so the frontend's
    // standard error renderer kicks in.
    res.status(winner.status || 502);
    if (winner.contentType) res.setHeader('content-type', winner.contentType);
    res.send(
      winner.body ||
        JSON.stringify({
          success: false,
          error: {
            message: 'Upstream returned an empty body.',
            status: winner.status || 502,
            timestamp: new Date().toISOString(),
          },
        }),
    );
    return;
  }

  res.status(504).json({
    success: false,
    error: {
      message: 'Pipeline took longer than 56s on both models. Please retry.',
      status: 504,
      timestamp: new Date().toISOString(),
    },
  });
}
