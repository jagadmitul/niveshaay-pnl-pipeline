import type { PnLData, PnLRow } from '../lib/types';

interface Props {
  data: PnLData;
}

/**
 * Render the P&L JSON as the Niveshaay-branded card.
 *
 * This mirrors the WhatsApp distribution format (see samples/sample-output-reference.jpeg).
 * The JSON only carries the bare 4 or 6 columns; we compute the "Change (in %)"
 * columns in the renderer so the table matches the production card 1:1.
 */
export function ImagePreview({ data }: Props) {
  const rows = collectRows(data);
  if (rows.length === 0) return null;

  const header = rows[0];
  const body = rows.slice(1);
  const isExtended = data.quarter_type === 'extended';

  // Decide which (recent, previous) pairs to compute % change for.
  // Standard: col1 vs col2 (QoQ), col1 vs col3 (YoY) -> 2 change cols (after col2 and col3)
  // Extended Q4: col1 vs col2 (QoQ), col1 vs col3 (YoY), col4 vs col5 (FY) -> 3 change cols
  // Extended Q2: same (col1 vs col2, col1 vs col3, col4 vs col5)
  // We insert Change cols AFTER cols 2 and 3, and AFTER col 5 (extended only).
  const changeColPositions = isExtended ? [2, 3, 5] : [2, 3];

  return (
    <div className="space-y-3">
      <p className="text-xs text-niveshaay-ink/60">
        Preview of the formatted P&amp;L card. In production this is rendered via{' '}
        Puppeteer/Browserless and pushed to WhatsApp through evolution API.
      </p>

      <div className="overflow-x-auto rounded-lg border border-niveshaay-light/30 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-niveshaay-dark text-white">
              <th colSpan={header.length + changeColPositions.length} className="px-3 py-2.5 text-center font-semibold relative">
                <span className="block">{data.company_name}</span>
                <img
                  src="/niveshaay-logo.png"
                  alt=""
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-auto opacity-90"
                />
              </th>
            </tr>
            <tr className="bg-niveshaay-mid text-white">
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                <span className="text-[10px] uppercase tracking-wide opacity-80">Rs in Cr</span>
                <br />
                <span>{header[0]}</span>
              </th>
              {header.slice(1).map((label, i) => {
                const dataColIdx = i + 1; // 1-based after particulars
                const cells: JSX.Element[] = [
                  <th key={`h-${i}`} className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                    {label}
                  </th>,
                ];
                if (changeColPositions.includes(dataColIdx)) {
                  cells.push(
                    <th key={`hc-${i}`} className="px-3 py-2 text-right font-semibold whitespace-nowrap">
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
              const rowCls = `${isHeading ? 'bg-niveshaay-cream font-bold text-niveshaay-dark' : ''} ${
                isMargin ? 'bg-niveshaay-light/20 font-semibold' : ''
              }`;
              return (
                <tr key={idx} className={`border-t border-niveshaay-light/20 ${rowCls}`}>
                  <td className="px-3 py-1.5 whitespace-nowrap text-niveshaay-ink">{row[0]}</td>
                  {row.slice(1).map((cell, i) => {
                    const dataColIdx = i + 1;
                    const cells: JSX.Element[] = [
                      <td key={`d-${i}`} className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap">
                        {formatCell(cell)}
                      </td>,
                    ];
                    if (changeColPositions.includes(dataColIdx)) {
                      // Compute change vs col1 for QoQ/YoY, col4 vs col5 for FY.
                      const current = dataColIdx === 5 ? row[4] : row[1];
                      const prior = row[dataColIdx];
                      const change = pctChange(current, prior);
                      cells.push(
                        <td
                          key={`dc-${i}`}
                          className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap text-niveshaay-ink/80"
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
    </div>
  );
}

function collectRows(data: PnLData): PnLRow[] {
  return Object.entries(data)
    .filter(([k]) => /^row\d+$/.test(k))
    .sort(([a], [b]) => parseInt(a.replace('row', '')) - parseInt(b.replace('row', '')))
    .map(([, v]) => v as PnLRow);
}

function isSectionHeading(row: PnLRow): boolean {
  // A row that's just "Expenses" with no numbers is a heading.
  const label = String(row[0] || '').trim().toLowerCase();
  const allEmpty = row.slice(1).every((c) => !String(c || '').trim());
  return allEmpty && label === 'expenses';
}

function isMarginRow(label: string): boolean {
  const l = String(label || '').toLowerCase();
  return l.includes('margin');
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
