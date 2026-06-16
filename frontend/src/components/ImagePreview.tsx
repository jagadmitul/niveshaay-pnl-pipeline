import { forwardRef } from 'react';
import type { PnLData, PnLRow } from '../lib/types';

interface Props {
  data: PnLData;
}

/**
 * Niveshaay-branded P&L card. Layout mirrors Arjun's WhatsApp reference:
 *  - White title bar with company name centred + the Niveshaay logo top-right
 *  - Dark-green column header row
 *  - Highlighted margin rows + bold totals
 *  - Auto-calculated Change (in %) columns between data columns
 */
export const ImagePreview = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const rows = collectRows(data);
  if (rows.length === 0) return null;

  const header = rows[0];
  const body = rows.slice(1);
  const isExtended = data.quarter_type === 'extended';
  const changeColPositions = isExtended ? [2, 3, 5] : [2, 3];

  return (
    <div ref={ref} className="bg-white">
      <div className="border border-niveshaay-light/40 rounded-lg overflow-hidden shadow-soft">
        {/* Title bar: white background so the logo (dark text on transparent) shows clean */}
        <div className="relative bg-white px-4 py-3 border-b-2 border-niveshaay-mid flex items-center justify-between gap-4">
          <div className="w-16 flex-shrink-0" />
          <h2 className="flex-1 text-center text-base font-bold tracking-wide text-niveshaay-dark">
            {data.company_name}
          </h2>
          <div className="w-16 flex-shrink-0 flex items-center justify-end">
            <img
              src="/niveshaay-logo.png"
              alt="Niveshaay"
              className="h-9 w-auto"
              crossOrigin="anonymous"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]" cellPadding={0} cellSpacing={0}>
            <thead>
              <tr className="bg-niveshaay-mid text-white">
                <th
                  className="px-3 py-2 text-left font-semibold whitespace-nowrap align-bottom"
                  style={{ minWidth: 240 }}
                >
                  <div className="text-[9px] uppercase tracking-wide opacity-80">
                    Rs in Cr
                  </div>
                  <div>{header[0]}</div>
                </th>
                {header.slice(1).map((label, i) => {
                  const dataColIdx = i + 1;
                  const cells = [
                    <th
                      key={`h-${i}`}
                      className="px-3 py-2 text-right font-semibold whitespace-nowrap align-bottom"
                    >
                      {label}
                    </th>,
                  ];
                  if (changeColPositions.includes(dataColIdx)) {
                    cells.push(
                      <th
                        key={`hc-${i}`}
                        className="px-3 py-2 text-right font-semibold whitespace-nowrap align-bottom"
                        style={{ background: '#186f3f' }}
                      >
                        Change (in %)
                      </th>,
                    );
                  }
                  return cells;
                })}
              </tr>
            </thead>
            <tbody>
              {body.map((row, idx) => {
                const isHeading = isSectionHeading(row);
                const isMargin = isMarginRow(row[0]);
                const isBold = isBoldRow(row[0]);

                let rowCls = '';
                if (isMargin) rowCls = 'bg-niveshaay-light/25 font-semibold';
                else if (isBold) rowCls = 'bg-niveshaay-cream font-bold text-niveshaay-dark';
                else if (isHeading) rowCls = 'bg-niveshaay-cream font-bold text-niveshaay-dark';

                return (
                  <tr key={idx} className={`border-t border-niveshaay-light/15 ${rowCls}`}>
                    <td className="px-3 py-1.5 whitespace-nowrap">{row[0]}</td>
                    {row.slice(1).map((cell, i) => {
                      const dataColIdx = i + 1;
                      const cells = [
                        <td
                          key={`d-${i}`}
                          className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap"
                        >
                          {formatCell(cell)}
                        </td>,
                      ];
                      if (changeColPositions.includes(dataColIdx)) {
                        const currentStr = dataColIdx === 5 ? row[4] : row[1];
                        const priorStr = row[dataColIdx];
                        const change = pctChange(currentStr, priorStr);
                        cells.push(
                          <td
                            key={`dc-${i}`}
                            className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap text-niveshaay-ink/75"
                          >
                            {change}
                          </td>,
                        );
                      }
                      return cells;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-niveshaay-light/25 bg-niveshaay-cream/70 px-3 py-1.5 text-[10px] text-niveshaay-ink/60 flex items-center justify-between">
          <span>Powered by Niveshaay · Auto-extracted from BSE/NSE filing</span>
          <span>
            {new Date().toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
});

ImagePreview.displayName = 'ImagePreview';

function collectRows(data: PnLData): PnLRow[] {
  return Object.entries(data)
    .filter(([k]) => /^row\d+$/.test(k))
    .sort(([a], [b]) => parseInt(a.replace('row', '')) - parseInt(b.replace('row', '')))
    .map(([, v]) => v as PnLRow);
}

function isSectionHeading(row: PnLRow): boolean {
  const label = String(row[0] || '').trim().toLowerCase();
  const allEmpty = row.slice(1).every((c) => !String(c || '').trim());
  return allEmpty && label === 'expenses';
}

function isMarginRow(label: string): boolean {
  return String(label || '').toLowerCase().includes('margin');
}

function isBoldRow(label: string): boolean {
  const boldLabels = [
    'gross profit',
    'total expenses',
    'ebitda',
    'profit before exceptional',
    'profit before tax',
    'profit/loss before tax',
    'pat',
  ];
  const l = String(label || '').toLowerCase();
  if (l.includes('margin')) return false;
  return boldLabels.some((b) => l === b || l.startsWith(b));
}

function formatCell(s: string): string {
  if (!s && s !== '0') return '';
  const trimmed = String(s).trim();
  if (!trimmed) return '';
  if (trimmed.endsWith('%')) return trimmed;
  const n = parseFloat(trimmed.replace(/,/g, ''));
  if (!Number.isFinite(n)) return trimmed;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctChange(currentStr: string, priorStr: string): string {
  const current = parseFloat(String(currentStr || '').replace(/[%,]/g, ''));
  const prior = parseFloat(String(priorStr || '').replace(/[%,]/g, ''));
  if (!Number.isFinite(current) || !Number.isFinite(prior) || prior === 0) return '';
  const change = ((current - prior) / Math.abs(prior)) * 100;
  return `${change.toFixed(2)}%`;
}
