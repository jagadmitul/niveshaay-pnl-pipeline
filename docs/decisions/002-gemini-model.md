# ADR 002 — Why `gemini-2.5-flash` (and how to swap)

**Status:** Accepted
**Date:** 2026-06-16

## Context

The task allows Gemini *or* Claude. The brief constraints are:

- **$10 budget** on the supplied key
- **Native PDF input** (the prompt sends the PDF inline as `inline_data`)
- **Strict JSON output** — the prompt forbids prose, expects rigid schema
- **Indian financial reports** — sometimes multi-page, occasionally with
  scanned image-PDFs

## Decision

Default model is **`gemini-2.5-flash`**:

| Property | Why it matters here |
|---|---|
| Native `application/pdf` input | No external OCR / text-extract step |
| `responseMimeType: "application/json"` | Forces JSON shape; no post-hoc regex extraction |
| `temperature: 0.1` | Deterministic extraction; same PDF → same numbers |
| Cost (≈ $0.075–0.30 per result) | ~33–130 results within the $10 budget |
| Latency (6–14s typical) | Within the user-visible loading window |

The workflow reads the model name from `$env.GEMINI_MODEL` with a
`gemini-2.5-flash` fallback, so swapping to **`gemini-2.5-pro`** is a
single env change (3× cost, but better at messy scanned PDFs and
multi-table layouts).

## Consequences

- Default path is fast and cheap; the analyst sees results in under 15
  seconds for the typical filing.
- The "Validate Math" stage covers the small accuracy gap vs `pro`. When
  margins drift, the response surfaces a `validation.issues` array that
  Niveshaay can use to decide whether to re-run with the pro model.

## Alternatives considered

- **Claude 3.5 Sonnet.** Excellent reasoning on complex P&L layouts and
  the 200K context window is overkill but useful. Skipped for the default
  because the brief supplies a Gemini key with the $10 budget; switching
  providers would have required a separate billing setup the reviewer
  doesn't have.
- **Two-pass extraction (text via pdfplumber → Gemini text-only).** Would
  cost less per call but adds an OCR layer that breaks on scanned PDFs.
  Not worth the complexity for $0.05 savings per call.
