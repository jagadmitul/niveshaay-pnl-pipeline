# Gemini Prompt

The prompt below is sent verbatim to Gemini as the first part of the
multipart request. The PDF follows as the second part (base64,
`mime_type: application/pdf`).

The same content lives inside the `Build Gemini Request` Code node of the
n8n workflow (so the workflow is self-contained) and inside
`workflow/prompt.txt` (so the prompt is editable without diffing JSON).

> **Source of truth**: `workflow/prompt.txt` is canonical. If you change
> the prompt, update the Code node in the workflow at the same time.

```text
You are a financial data processor that converts quarterly P&L statements into standardized JSON format...
```

(See [`workflow/prompt.txt`](../workflow/prompt.txt) for the full text.)

## Why this prompt is strict on shape

- **`responseMimeType: "application/json"`** + a strict schema description
  forces Gemini to emit only JSON. We still strip code fences in the
  parser as a belt-and-braces guard.
- **`row1`, `row2`, ... key naming** (instead of an array of objects)
  matches the existing Niveshaay format — easier for their downstream
  image renderer to consume without a translation layer.
- **All numeric values as strings** preserves "−" for negatives and "%"
  suffix for margins, and prevents JSON-number precision drift.

## Why temperature 0.1, not 0

Gemini's tokenizer is deterministic at temp 0, but margin recomputations
sometimes round the last decimal differently when the value is at a tie.
0.1 keeps determinism for 99% of cases without locking into single-token
ties.
