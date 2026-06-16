# Sample 2 — Tata Consultancy Services Limited, Q1 FY26 (standard schema)

A services company (no inventory / no Gross Profit row) showing the
**standard schema** with 3 data columns: Q1 FY26, Q4 FY25, Q1 FY25.

## What this proves
- The pipeline correctly produces `quarter_type: "standard"` for a Q1 filing.
- "Gross Profit" and "Gross Profit Margin" rows are **omitted** because the
  underlying filing does not contain COGS-style expenses (per prompt rule:
  *"intelligently add or remove fields"*).
- "Exceptional items" and "Share of JV" rows are absent — also a deliberate
  omission when not present in the source.

## Validation cross-check (recomputed)
| Row | Q1 FY26 expected | Q1 FY26 reported |
|---|---|---|
| EBITDA (Revenue − Total Expenses = 63437 − 47516) | 15921 | 15921 ✓ |
| EBITDA Margin (15921 / 63437 × 100) | 25.10% | 25.10% ✓ |
| PBT (EBITDA − Depr − Finance + Other Income = 15921 − 1234 − 188 + 1142) | 15641 | 15641 ✓ |
| PAT (PBT − Tax = 15641 − 4123) | 11518 | 11518 ✓ |
| PAT Margin (11518 / 63437 × 100) | 18.16% | 18.16% ✓ |
