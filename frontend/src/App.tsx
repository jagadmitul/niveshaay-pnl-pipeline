import { useCallback, useState } from 'react';
import { PdfLinkForm } from './components/PdfLinkForm';
import { LoadingState } from './components/LoadingState';
import { ErrorDisplay } from './components/ErrorDisplay';
import { JsonViewer } from './components/JsonViewer';
import { ImagePreview } from './components/ImagePreview';
import { SampleLinks } from './components/SampleLinks';
import { ValidationBanner } from './components/ValidationBanner';
import { DownloadActions } from './components/DownloadActions';
import { HistoryPanel, recordRun, type HistoryItem } from './components/HistoryPanel';
import { usePdfProcessing } from './hooks/usePdfProcessing';
import { isError, isNoPnL, isSuccess } from './lib/types';

export default function App() {
  const { status, result, elapsedMs, submittedUrl, submit, reset, replay } = usePdfProcessing();
  // Use a callback ref so DownloadActions sees the actual DOM node (not null on first render).
  const [cardNode, setCardNode] = useState<HTMLDivElement | null>(null);

  // Persist every successful run so the user can revisit it without re-spending Gemini.
  if (status === 'done' && result && isSuccess(result) && submittedUrl) {
    // Only record once per result instance (cheap deduplication via the URL).
    const lastRecorded = (window as Window & typeof globalThis & { __niveshaayLastRecorded?: string }).__niveshaayLastRecorded;
    if (lastRecorded !== submittedUrl) {
      (window as Window & typeof globalThis & { __niveshaayLastRecorded?: string }).__niveshaayLastRecorded = submittedUrl;
      recordRun(submittedUrl, result);
    }
  }

  const handleReplay = useCallback((item: HistoryItem) => {
    replay(item.pdfUrl, item.result);
  }, [replay]);

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
            We download it, run it through Gemini with the Niveshaay prompt, recompute the margins
            ourselves, and return both the structured JSON and the WhatsApp-ready P&amp;L card.
          </p>
        </section>

        {/* No em-dashes anywhere in headings, banners, or labels below. */}

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

        <HistoryPanel onReplay={handleReplay} />

        {status === 'loading' && <LoadingState />}

        {status === 'done' && result && (
          <section className="mt-10 space-y-8">
            {isError(result) && <ErrorDisplay error={result.error} />}

            {isNoPnL(result) && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-niveshaay-dark">
                  No P&amp;L found in this document
                </h2>
                <p className="mt-2 text-sm text-niveshaay-ink/70">{result.message}</p>
                <p className="mt-3 text-xs text-niveshaay-ink/50">
                  This is the contract Arjun's prompt defines for non-P&amp;L documents
                  (e.g. earnings-call transcripts, press releases). The pipeline returned
                  the expected response.
                </p>
              </div>
            )}

            {isSuccess(result) && (
              <>
                <ValidationBanner
                  validation={result.validation}
                  modelUsed={result.meta.model_used}
                  totalTokens={result.meta.total_tokens}
                  elapsedMs={elapsedMs}
                  sourceUrl={submittedUrl}
                />

                <section>
                  <SectionHeader
                    title="P&L Card Preview"
                    subtitle="The same layout that goes to the WhatsApp distribution group via evolution API."
                    right={<DownloadActions data={result.data} imageNode={cardNode} />}
                  />
                  <div className="mt-3 overflow-x-auto rounded-2xl shadow-soft border border-niveshaay-light/30 bg-white p-3 lg:p-4">
                    <ImagePreview ref={setCardNode} data={result.data} />
                  </div>
                </section>

                <section>
                  <SectionHeader
                    title="Structured JSON"
                    subtitle="What gets persisted and piped to downstream consumers."
                  />
                  <div className="mt-3">
                    <JsonViewer value={result.data} />
                  </div>
                </section>
              </>
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
        <nav className="text-xs text-niveshaay-ink/60 hidden sm:flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-niveshaay-mid animate-pulse" />
            Pipeline live
          </span>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-niveshaay-light/30 py-6 mt-12">
      <div className="max-w-6xl mx-auto px-6 text-xs text-niveshaay-ink/50 flex flex-wrap items-center justify-between gap-4">
        <span>© 2026 Niveshaay. Internal tool, not for distribution.</span>
        <span>Pipeline: webhook · validate · download · gemini · parse · math-check · respond</span>
      </div>
    </footer>
  );
}

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-niveshaay-dark">{title}</h2>
        {subtitle && <p className="text-xs text-niveshaay-ink/60 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
