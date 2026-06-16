# Sample 3 — Asian Paints Limited, Q2 FY26 (extended schema)

A manufacturer with inventory, full COGS-type expenses, and H1
comparatives — the **extended schema** for Q2 filings.

## What this proves
- The pipeline correctly produces `quarter_type: "extended"` for a Q2 filing,
  with the H1 FY26 and H1 FY25 columns appended.
- Gross Profit is present (the company has cost of materials and inventory changes).
- Negative "Changes in inventories" is handled as a string with leading minus.
- Sums across the 5 columns are consistent (H1 = Q1 + Q2 cleanly).

## Validation cross-check (recomputed)
| Row | Q2 FY26 expected | Q2 FY26 reported |
|---|---|---|
| Gross Profit (Revenue − COGS = 8027.50 − 3852.40 − 612.80 − (−58.30)) | 3620.60 | 3620.60 ✓ |
| Gross Profit Margin (3620.60 / 8027.50 × 100) | 45.10% | 45.10% ✓ |
| EBITDA (Gross Profit − Employee − Other = 3620.60 − 428.10 − 1715.40) | 1477.10 | 1477.10 ✓ |
| EBITDA Margin (1477.10 / 8027.50 × 100) | 18.40% | 18.40% ✓ |
| H1 Revenue (Q1 + Q2 = 8949.80 + 8027.50) | 16977.30 | 16977.30 ✓ |
| H1 PAT (Q1 + Q2 = 1375.60 + 1044.30) | 2419.90 | 2419.90 ✓ |
