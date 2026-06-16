import { useCallback, useState } from 'react';
import { processPdf } from '../lib/api';
import type { PipelineResponse } from '../lib/types';

type Status = 'idle' | 'loading' | 'done';

export function usePdfProcessing() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const submit = useCallback(async (pdfUrl: string) => {
    setStatus('loading');
    setResult(null);
    setElapsedMs(null);

    const started = performance.now();
    const response = await processPdf(pdfUrl);
    const elapsed = Math.round(performance.now() - started);

    setResult(response);
    setElapsedMs(elapsed);
    setStatus('done');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setElapsedMs(null);
  }, []);

  return { status, result, elapsedMs, submit, reset };
}
