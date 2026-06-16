const STEPS = [
  'Validating URL',
  'Downloading PDF from BSE/NSE',
  'Encoding for Gemini',
  'Extracting consolidated P&L',
  'Re-checking the math',
];

export function LoadingState() {
  return (
    <section className="mt-8 card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-3 w-3 rounded-full bg-niveshaay-mid animate-pulse" />
        <h2 className="text-lg font-semibold text-niveshaay-dark">
          Processing…
        </h2>
        <span className="text-xs text-niveshaay-ink/50">
          (typical: 6–18 seconds)
        </span>
      </div>

      <ol className="space-y-2">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="flex items-center gap-3 text-sm text-niveshaay-ink/80"
            style={{ animationDelay: `${i * 200}ms` }}
          >
            <span className="inline-block h-1.5 w-12 rounded-full bg-gradient-to-r from-niveshaay-light/30 via-niveshaay-mid to-niveshaay-light/30 animate-pulse" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
