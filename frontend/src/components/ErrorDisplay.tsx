interface Props {
  error: {
    message: string;
    status: number;
    timestamp: string;
  };
}

export function ErrorDisplay({ error }: Props) {
  return (
    <div className="card p-6 border-red-200/60 bg-red-50/60">
      <div className="flex items-start gap-3">
        <div className="text-red-700 mt-0.5">⚠</div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-red-800">
            {humaniseStatus(error.status)}
          </h2>
          <p className="mt-1 text-sm text-red-900/90">{error.message}</p>
          <p className="mt-3 text-[11px] text-red-700/70 font-mono">
            HTTP {error.status} · {new Date(error.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-red-800 font-medium">
          What can I check?
        </summary>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-red-900/80">
          <li>Is the n8n workflow active and the webhook URL reachable?</li>
          <li>Is the URL a public BSE/NSE corporate filing PDF (not an HTML page)?</li>
          <li>Did the PDF download time out? Some filings are large; the pipeline allows 30s.</li>
          <li>Is the Gemini API key valid and within budget? (<code>$env.GEMINI_API_KEY</code>)</li>
        </ul>
      </details>
    </div>
  );
}

function humaniseStatus(status: number): string {
  if (status === 0) return 'Network error';
  if (status === 400) return 'Invalid input';
  if (status === 413) return 'PDF too large';
  if (status >= 500) return 'Server error';
  return `Error ${status}`;
}
