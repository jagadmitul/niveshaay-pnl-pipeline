import { useState } from 'react';
import { PdfLinkForm } from './components/PdfLinkForm';
import { LoadingState } from './components/LoadingState';
import { ErrorDisplay } from './components/ErrorDisplay';
import { JsonViewer } from './components/JsonViewer';
import { ImagePreview } from './components/ImagePreview';
import { SampleLinks } from './components/SampleLinks';
import { usePdfProcessing } from './hooks/usePdfProcessing';
import { isError, isNoPnL, isSuccess } from './lib/types';

export default function App() {
  const { status, result, elapsedMs, submit, reset } = usePdfProcessing();
  const [view, setView] = useState<'json' | 'card'>('json');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 lg:py-12">
        <section className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-niveshaay-dark leading-tight">
            Automated Financial Results Processing
          </h1>
          <p className="mt-2 text-niveshaay-ink/70 max-w-2xl">
            Paste a corporate result PDF link from <strong>BSE</strong> or <strong>NSE</strong>.
            We&apos;ll download it, send it through Gemini, and return a structured P&amp;L JSON
            (math-validated and ready for the WhatsApp distribution layer).
          </p>
        </section>

        <PdfLinkForm
          disabled={status === 'loading'}
          onSubmit={submit}
          onReset={reset}
          hasResult={status !== 'idle'}
        />

        <SampleLinks
          disabled={status === 'loading'}
          onPick={(url) => submit(url)}
        />

        {status === 'loading' && <LoadingState />}

        {status === 'done' && result && (
          <section className="mt-8">
            {isError(result) && <ErrorDisplay error={result.error} />}

            {isNoPnL(result) && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-niveshaay-dark">
                  No P&amp;L found
                </h2>
                <p className="mt-2 text-sm text-niveshaay-ink/70">{result.message}</p>
              </div>
            )}

            {isSuccess(result) && (
              <div className="space-y-6">
                <ResultMeta
                  companyName={result.data.company_name}
                  quarterType={result.data.quarter_type}
                  elapsedMs={elapsedMs}
                  totalTokens={result.meta.total_tokens}
                  modelUsed={result.meta.model_used}
                  validation={result.validation}
                />

                <div className="card overflow-hidden">
                  <div className="flex border-b border-niveshaay-light/30">
                    <Tab active={view === 'json'} onClick={() => setView('json')} label="JSON" />
                    <Tab active={view === 'card'} onClick={() => setView('card')} label="P&L Card Preview" />
                  </div>
                  <div className="p-5">
                    {view === 'json' ? (
                      <JsonViewer value={result.data} />
                    ) : (
                      <ImagePreview data={result.data} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-niveshaay-light/30 bg-niveshaay-paper/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/niveshaay-logo.png" alt="Niveshaay" className="h-10 w-auto" />
          <div className="hidden sm:block">
            <p className="text-xs uppercase tracking-wider text-niveshaay-ink/50">
              Internal Tools
            </p>
            <p className="text-sm font-semibold text-niveshaay-dark">
              P&amp;L Pipeline
            </p>
          </div>
        </div>
        <nav className="text-xs text-niveshaay-ink/60">
          <span className="hidden sm:inline">Powered by </span>
          <span className="font-mono">n8n · Gemini 2.5</span>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-niveshaay-light/30 py-6 mt-12">
      <div className="max-w-6xl mx-auto px-6 text-xs text-niveshaay-ink/50 flex flex-wrap items-center justify-between gap-4">
        <span>© 2026 Niveshaay — Internal tool, not for distribution.</span>
        <span>Pipeline: webhook · validate · download · gemini · parse · math-check · respond</span>
      </div>
    </footer>
  );
}

function Tab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors
        ${active
          ? 'border-niveshaay-dark text-niveshaay-dark bg-niveshaay-light/10'
          : 'border-transparent text-niveshaay-ink/60 hover:text-niveshaay-dark'
        }`}
    >
      {label}
    </button>
  );
}

function ResultMeta({
  companyName,
  quarterType,
  elapsedMs,
  totalTokens,
  modelUsed,
  validation,
}: {
  companyName: string;
  quarterType: string;
  elapsedMs: number | null;
  totalTokens: number;
  modelUsed: string;
  validation?: { passed: boolean; issues_count: number };
}) {
  return (
    <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-niveshaay-dark">{companyName}</h2>
        <p className="text-xs uppercase tracking-wide text-niveshaay-ink/50 mt-0.5">
          {quarterType === 'extended' ? 'Extended (Q2/Q4)' : 'Standard (Q1/Q3)'} schema
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {elapsedMs !== null && (
          <Pill label="Time" value={`${(elapsedMs / 1000).toFixed(1)}s`} />
        )}
        <Pill label="Tokens" value={totalTokens.toLocaleString()} />
        <Pill label="Model" value={modelUsed} mono />
        {validation && (
          <Pill
            label="Math check"
            value={validation.passed ? 'PASS' : `${validation.issues_count} issue(s)`}
            tone={validation.passed ? 'good' : 'warn'}
          />
        )}
      </div>
    </div>
  );
}

function Pill({
  label,
  value,
  mono,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'neutral' | 'good' | 'warn';
}) {
  const toneStyle =
    tone === 'good'
      ? 'bg-niveshaay-light/30 text-niveshaay-dark'
      : tone === 'warn'
      ? 'bg-amber-100 text-amber-900'
      : 'bg-niveshaay-cream text-niveshaay-ink';
  return (
    <div className={`px-2.5 py-1.5 rounded-md ${toneStyle}`}>
      <span className="uppercase tracking-wide text-[10px] opacity-70 mr-1.5">
        {label}
      </span>
      <span className={mono ? 'font-mono' : 'font-semibold'}>{value}</span>
    </div>
  );
}
