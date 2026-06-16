import type { PipelineResponse } from './types';

// Default to a same-origin path. In production (Vercel) this is rewritten by
// vercel.json to the Railway-hosted n8n webhook. In local dev it is routed by
// Vite's proxy in vite.config.ts to localhost:5678. Either way, the browser
// sees a same-origin request, which sidesteps n8n's CORS / Origin-header bug.
const DEFAULT_WEBHOOK = '/api/process-pdf';
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 800;

export function getWebhookUrl(): string {
  return import.meta.env.VITE_N8N_WEBHOOK_URL || DEFAULT_WEBHOOK;
}

export async function processPdf(pdfUrl: string): Promise<PipelineResponse> {
  let last: PipelineResponse | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    last = await callOnce(pdfUrl);
    if (!shouldRetry(last)) return last;
    if (attempt < MAX_ATTEMPTS) {
      await sleep(BASE_BACKOFF_MS * Math.pow(1.5, attempt - 1));
    }
  }
  return last as PipelineResponse;
}

async function callOnce(pdfUrl: string): Promise<PipelineResponse> {
  const webhookUrl = getWebhookUrl();
  let raw: Response;
  try {
    raw = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_url: pdfUrl.trim() }),
      cache: 'no-store',
      credentials: 'omit',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: {
        message: `Could not reach the webhook at ${webhookUrl}. ${message}`,
        status: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }

  const text = await raw.text();
  if (!text) {
    return {
      success: false,
      error: {
        message: `Pipeline returned an empty body (status ${raw.status}).`,
        status: raw.status,
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    return JSON.parse(text) as PipelineResponse;
  } catch {
    return {
      success: false,
      error: {
        message: `Pipeline returned non-JSON (status ${raw.status}). Body preview: ${text.slice(0, 400)}`,
        status: raw.status,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

function shouldRetry(r: PipelineResponse): boolean {
  if (r.success) return false;
  if ('error' in r) {
    const m = (r.error.message || '').toLowerCase();
    return m.includes('empty body') || m.includes('non-json');
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
