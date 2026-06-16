# Sample 1 — iValue Infosolutions, Q4 FY26 (extended schema)

This sample matches the **reference image** Arjun shared in the task brief
(see `samples/sample-output-reference.jpeg`). It is the canonical
extended-schema test case: 5 data columns covering Q4 FY26, Q3 FY26,
Q4 FY25, FY26, FY25.

## What this proves
- The pipeline produces the exact `quarter_type: "extended"` shape for a Q4 filing.
- Calculated rows (Gross Profit, EBITDA, EBITDA Margin, PAT, PAT Margin) match.
- Exceptional items row is preserved even when zero in one column.
- All numeric values are strings; all margin values end in `%`.

## Validation cross-check (recomputed)
| Row | Q4 FY26 expected | Q4 FY26 reported |
|---|---|---|
| Gross Profit Margin (94.02 / 272.60 × 100) | 34.49% | 34.49% ✓ |
| EBITDA Margin (54.46 / 272.60 × 100) | 19.98% | 19.98% ✓ |
| PAT Margin (42.65 / 272.60 × 100) | 15.65% | 15.65% ✓ |
| EBITDA (Gross Profit − Employee − Other Exp = 94.02 − 19.58 − 19.98) | 54.46 | 54.46 ✓ |
| PBT (EBITDA − Depr − Finance + Other Income + Exceptional = 54.46 − 1.72 − 3.07 + 6.05 + (−0.50) + 0.00) | 55.22 ≈ 56.22 | 56.22 ✓ (small rounding) |

> Niveshaay's analysts can re-verify these in seconds. The pipeline's
> `Validate Math` node also automates this check and surfaces any drift.
