import type { PipelineResponse } from './types';

const DEFAULT_WEBHOOK = 'http://localhost:5678/webhook/process-pdf';

export function getWebhookUrl(): string {
  return import.meta.env.VITE_N8N_WEBHOOK_URL || DEFAULT_WEBHOOK;
}

export async function processPdf(pdfUrl: string): Promise<PipelineResponse> {
  const webhookUrl = getWebhookUrl();

  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_url: pdfUrl.trim() }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: {
        message: `Could not reach the n8n webhook at ${webhookUrl}. ${message}`,
        status: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // n8n sends a JSON body whether success or error — try to parse either way.
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      success: false,
      error: {
        message: `Webhook returned non-JSON response (status ${response.status}).`,
        status: response.status,
        timestamp: new Date().toISOString(),
      },
    };
  }

  return payload as PipelineResponse;
}
