import type { PipelineResponse } from './types';

const DEFAULT_WEBHOOK = '/api/process-pdf';
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_200;

export function getWebhookUrl(): string {
  return import.meta.env.VITE_N8N_WEBHOOK_URL || DEFAULT_WEBHOOK;
}

export async function processPdf(pdfUrl: string): Promise<PipelineResponse> {
  let last: PipelineResponse | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    last = await callOnce(pdfUrl);
    if (!shouldRetry(last)) return last;
    if (attempt < MAX_ATTEMPTS) await sleep(BASE_BACKOFF_MS * attempt);
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
      error: { message: `Could not reach ${webhookUrl}. ${message}`, status: 0, timestamp: new Date().toISOString() },
    };
  }

  const text = await raw.text();
  if (!text) {
    return {
      success: false,
      error: { message: `Pipeline returned an empty body (status ${raw.status}).`, status: raw.status, timestamp: new Date().toISOString() },
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

// Only retry on transient infra issues. no_pnl_found is a real verdict, don't burn budget on it.
function shouldRetry(r: PipelineResponse): boolean {
  if (r.success) return false;
  if ('reason' in r && r.reason === 'no_pnl_found') return false;
  if ('error' in r) {
    const status = r.error.status || 0;
    if (status === 0 || status === 502 || status === 503 || status === 504) return true;
    const m = (r.error.message || '').toLowerCase();
    if (m.includes('empty body') || m.includes('non-json')) return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
