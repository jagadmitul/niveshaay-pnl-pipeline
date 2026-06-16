import { useCallback, useState } from 'react';
import { processPdf } from '../lib/api';
import type { PipelineResponse, PipelineSuccess } from '../lib/types';

type Status = 'idle' | 'loading' | 'done';

export function usePdfProcessing() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);

  const submit = useCallback(async (pdfUrl: string) => {
    const trimmed = pdfUrl.trim();
    setStatus('loading');
    setResult(null);
    setElapsedMs(null);
    setSubmittedUrl(trimmed);

    const started = performance.now();
    const response = await processPdf(trimmed);
    const elapsed = Math.round(performance.now() - started);

    setResult(response);
    setElapsedMs(elapsed);
    setStatus('done');
  }, []);

  // Replay a cached past result without re-calling Gemini.
  const replay = useCallback((pdfUrl: string, cachedResult: PipelineSuccess) => {
    setSubmittedUrl(pdfUrl);
    setResult(cachedResult);
    setElapsedMs(null);
    setStatus('done');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setElapsedMs(null);
    setSubmittedUrl(null);
  }, []);

  return { status, result, elapsedMs, submittedUrl, submit, replay, reset };
}
