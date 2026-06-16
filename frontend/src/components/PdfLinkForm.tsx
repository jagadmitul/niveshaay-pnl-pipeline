import { useState } from 'react';

interface Props {
  disabled?: boolean;
  onSubmit: (url: string) => void;
  onReset: () => void;
  hasResult: boolean;
}

export function PdfLinkForm({ disabled, onSubmit, onReset, hasResult }: Props) {
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);

  const trimmed = url.trim();
  const looksValid =
    /^https?:\/\//i.test(trimmed) &&
    /\.pdf(\?|#|$)/i.test(trimmed) &&
    /(bseindia|nseindia)\.com/i.test(trimmed);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!looksValid) return;
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5">
      <label
        htmlFor="pdf-url"
        className="block text-xs uppercase tracking-wider font-semibold text-niveshaay-ink/60 mb-2"
      >
        BSE / NSE Corporate Result PDF Link
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          id="pdf-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className="input-link flex-1"
          placeholder="https://www.bseindia.com/xml-data/corpfiling/AttachLive/<uuid>.pdf"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={disabled}
        />
        <button
          type="submit"
          className="btn-primary sm:w-auto"
          disabled={disabled || !looksValid}
        >
          {disabled ? 'Processing…' : 'Process PDF'}
        </button>
        {hasResult && (
          <button
            type="button"
            onClick={() => {
              setUrl('');
              setTouched(false);
              onReset();
            }}
            className="btn-ghost"
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </div>

      {touched && trimmed && !looksValid && (
        <p className="mt-2 text-xs text-red-700">
          URL must be HTTPS, end in <code className="font-mono">.pdf</code>, and come from{' '}
          <code className="font-mono">bseindia.com</code> or{' '}
          <code className="font-mono">nseindia.com</code>.
        </p>
      )}

      <p className="mt-3 text-[11px] text-niveshaay-ink/50">
        Tip: open the filing on BSE/NSE, right-click the PDF link, and choose
        “Copy link address”.
      </p>
    </form>
  );
}
