import { useCallback, useState } from 'react';
import { toPng } from 'html-to-image';
import type { PnLData } from '../lib/types';

interface Props {
  data: PnLData;
  imageNode: HTMLDivElement | null;
}

export function DownloadActions({ data, imageNode }: Props) {
  const [busy, setBusy] = useState<'png' | 'json' | null>(null);

  const downloadPng = useCallback(async () => {
    if (!imageNode) return;
    setBusy('png');
    try {
      const dataUrl = await toPng(imageNode, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `${slug(data.company_name)}-${data.quarter_type}-pnl.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('PNG export failed', e);
      alert('Sorry — PNG export failed. Open the browser console for details.');
    } finally {
      setBusy(null);
    }
  }, [data, imageNode]);

  const downloadJson = useCallback(() => {
    setBusy('json');
    try {
      const text = JSON.stringify(data, null, 2);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${slug(data.company_name)}-${data.quarter_type}-pnl.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  }, [data]);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={downloadPng}
        disabled={!imageNode || busy === 'png'}
        className="btn-primary"
        title="Download the P&L card as a high-resolution PNG (2× pixel ratio)"
      >
        {busy === 'png' ? 'Rendering…' : '⬇ Download PNG'}
      </button>
      <button
        type="button"
        onClick={downloadJson}
        disabled={busy === 'json'}
        className="btn-ghost"
        title="Download the raw structured JSON"
      >
        {busy === 'json' ? 'Saving…' : '⬇ Download JSON'}
      </button>
    </div>
  );
}

function slug(name: string): string {
  return String(name || 'pnl')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
