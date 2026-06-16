import type { ValidationReport } from '../lib/types';

interface Props {
  validation?: ValidationReport;
  modelUsed: string;
  totalTokens: number;
  elapsedMs: number | null;
  sourceUrl: string | null;
}

export function ValidationBanner({
  validation,
  modelUsed,
  totalTokens,
  elapsedMs,
  sourceUrl,
}: Props) {
  const passed = validation?.passed ?? true;
  const issueCount = validation?.issues_count ?? 0;

  return (
    <div
      className={`card p-5 ${
        passed ? 'bg-niveshaay-light/10' : 'bg-amber-50/80'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-xl font-bold ${
            passed ? 'bg-niveshaay-mid text-white' : 'bg-amber-500 text-white'
          }`}
        >
          {passed ? '✓' : '!'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-niveshaay-dark">
                {passed
                  ? 'Output verified. Math recomputation matched.'
                  : `Math validation flagged ${issueCount} discrepanc${issueCount === 1 ? 'y' : 'ies'}.`}
              </h3>
              <p className="text-xs text-niveshaay-ink/70 mt-0.5">
                {passed
                  ? 'Gross Profit, EBITDA and PAT margins were recomputed from the raw rows and matched what the model reported.'
                  : 'The model\'s margin values do not perfectly match a recomputation. See details below.'}
              </p>
            </div>

            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost flex-shrink-0"
                title="Open the original BSE/NSE PDF in a new tab to cross-check the numbers yourself"
              >
                Open source PDF ↗
              </a>
            )}
          </div>

          <ol className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
            <Step label="URL validated" detail="BSE/NSE allowlist" />
            <Step label="PDF downloaded" detail="HTTP 200 from source" />
            <Step label="Gemini extracted" detail={modelUsed} />
            <Step label="Schema verified" detail={`${totalTokens.toLocaleString()} tokens`} />
            <Step
              label="Math re-checked"
              detail={passed ? 'No drift' : `${issueCount} flagged`}
              warn={!passed}
            />
          </ol>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-niveshaay-ink/70">
            <Pill label="Model" value={modelUsed} mono />
            <Pill
              label="Tokens"
              value={totalTokens.toLocaleString()}
              hint={`≈ $${(totalTokens * 0.000003).toFixed(4)}`}
            />
            {elapsedMs !== null && (
              <Pill label="Latency" value={`${(elapsedMs / 1000).toFixed(2)}s`} />
            )}
            <Pill label="Recomputed" value="GP · EBITDA · PAT margins" />
          </div>

          {!passed && validation && validation.issues.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-amber-900 font-semibold">
                Show {validation.issues.length} issue{validation.issues.length === 1 ? '' : 's'}
              </summary>
              <ul className="mt-2 space-y-1 text-amber-900/90 font-mono">
                {validation.issues.map((iss, i) => (
                  <li key={i}>
                    • {iss.row} ({iss.column}): expected {iss.expected}, got {iss.got} (Δ {iss.diff_pp}pp)
                  </li>
                ))}
              </ul>
            </details>
          )}

          {sourceUrl && (
            <p className="mt-3 text-[11px] text-niveshaay-ink/55 font-mono break-all">
              Source: {sourceUrl}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  label,
  detail,
  warn,
}: {
  label: string;
  detail: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-md px-2 py-2 border ${
        warn ? 'border-amber-300 bg-amber-50' : 'border-niveshaay-light/40 bg-white'
      }`}
    >
      <div className="flex items-center gap-1.5 font-semibold text-niveshaay-dark">
        <span className={warn ? 'text-amber-600' : 'text-niveshaay-mid'}>
          {warn ? '!' : '✓'}
        </span>
        <span>{label}</span>
      </div>
      <div className="text-niveshaay-ink/60 mt-0.5">{detail}</div>
    </div>
  );
}

function Pill({
  label,
  value,
  mono,
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div className="leading-tight">
      <span className="uppercase tracking-wide text-[9px] text-niveshaay-ink/55 mr-1.5">
        {label}
      </span>
      <span className={mono ? 'font-mono' : 'font-semibold'}>
        {value}
        {hint && <span className="text-niveshaay-ink/50 font-normal ml-1">{hint}</span>}
      </span>
    </div>
  );
}
