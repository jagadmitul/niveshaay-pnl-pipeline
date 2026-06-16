import { useEffect, useState, useCallback } from 'react';
import type { PipelineSuccess } from '../lib/types';

const STORAGE_KEY = 'niveshaay.history.v1';
const MAX_ITEMS = 10;

export interface HistoryItem {
  id: string;
  pdfUrl: string;
  companyName: string;
  quarterType: string;
  savedAt: number;
  result: PipelineSuccess;
}

function readHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota or disabled */
  }
}

export function recordRun(pdfUrl: string, result: PipelineSuccess) {
  const item: HistoryItem = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    pdfUrl,
    companyName: result.data.company_name,
    quarterType: result.data.quarter_type,
    savedAt: Date.now(),
    result,
  };
  const existing = readHistory().filter((x) => x.pdfUrl !== pdfUrl);
  const next = [item, ...existing].slice(0, MAX_ITEMS);
  writeHistory(next);
  window.dispatchEvent(new CustomEvent('niveshaay:history-updated'));
}

interface Props {
  onReplay: (item: HistoryItem) => void;
}

export function HistoryPanel({ onReplay }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => setItems(readHistory()), []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('niveshaay:history-updated', handler);
    return () => window.removeEventListener('niveshaay:history-updated', handler);
  }, [refresh]);

  const clear = () => {
    writeHistory([]);
    refresh();
  };

  if (items.length === 0) return null;

  return (
    <section className="mt-4 card p-4">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((x) => !x)}
          className="flex items-center gap-2 text-sm font-semibold text-niveshaay-dark"
        >
          <span>Recent runs</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-niveshaay-light/30 text-niveshaay-dark font-semibold">
            {items.length}
          </span>
          <span className="text-niveshaay-ink/50 text-xs">
            {open ? '▾' : '▸'}
          </span>
        </button>
        {open && (
          <button
            type="button"
            onClick={clear}
            className="text-[11px] text-niveshaay-ink/50 hover:text-niveshaay-dark"
          >
            Clear all
          </button>
        )}
      </header>

      {open && (
        <ul className="mt-3 space-y-1.5">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onReplay(it)}
                className="w-full text-left px-3 py-2 rounded-md bg-niveshaay-cream/60 hover:bg-niveshaay-cream border border-niveshaay-light/30 transition-colors"
                title={it.pdfUrl}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-niveshaay-dark truncate">
                    {it.companyName}
                  </span>
                  <span className="text-[11px] text-niveshaay-ink/55 flex-shrink-0">
                    {formatRelative(it.savedAt)}
                  </span>
                </div>
                <div className="text-[11px] text-niveshaay-ink/50 mt-0.5 flex items-center gap-2">
                  <span className="font-mono">
                    {it.quarterType === 'extended' ? 'Q2/Q4 extended' : 'Q1/Q3 standard'}
                  </span>
                  <span className="opacity-50">·</span>
                  <span className="font-mono truncate">{shortenUrl(it.pdfUrl)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function shortenUrl(u: string): string {
  try {
    const url = new URL(u);
    const file = url.pathname.split('/').pop() || '';
    return `${url.hostname}/…/${file.slice(0, 10)}…`;
  } catch {
    return u.slice(0, 50) + '…';
  }
}
