import { useMemo, useState } from 'react';

interface Props {
  value: unknown;
}

export function JsonViewer({ value }: Props) {
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const highlighted = useMemo(() => highlight(text), [text]);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wider font-semibold text-niveshaay-ink/60">
          JSON output
        </p>
        <button type="button" onClick={copy} className="btn-ghost">
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
      <pre className="json-viewer p-4 rounded-lg bg-niveshaay-cream border border-niveshaay-light/30 overflow-x-auto">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlight(jsonString: string): string {
  return escapeHtml(jsonString).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-num';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-str';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    },
  );
}
