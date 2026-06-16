# Architecture (single-page summary)

> **TL;DR**: Static React frontend POSTs `pdf_url` to a single n8n webhook.
> The workflow validates → downloads → calls Gemini → parses → re-checks
> the math → responds. All real logic lives in n8n so Niveshaay's existing
> tech team can extend it without leaving the tool they already use.

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (user pastes PDF URL)                                │
├──────────────────────────────────────────────────────────────┤
│  React + Vite + Tailwind  (frontend/)                         │
│  · PdfLinkForm  · LoadingState  · ErrorDisplay                │
│  · JsonViewer   · ImagePreview  (renders the WhatsApp card)   │
├──────────────────────────────────────────────────────────────┤
│  n8n workflow  (workflow/niveshaay-pnl-pipeline.json)         │
│                                                               │
│  Webhook ─▶ Validate URL ─▶ Download PDF ─▶ Build Gemini      │
│             Request ─▶ Call Gemini ─▶ Parse Response ─▶       │
│             Validate Math ─▶ Respond Success                  │
│                                                               │
│  Any failure → Format Error → Respond Error                   │
├──────────────────────────────────────────────────────────────┤
│  External:                                                    │
│  · BSE / NSE static PDF hosting (download)                    │
│  · Google AI Studio / generativelanguage.googleapis.com       │
│  · Redis (cache stub, optional)                               │
└──────────────────────────────────────────────────────────────┘
```

## Decisions in 30 seconds each

- **n8n is the only execution engine.** Frontend is a thin presenter. The
  workflow JSON is the production artefact. (See ADR 001.)
- **Default model: `gemini-2.5-flash`.** Fast, cheap, accepts PDFs
  natively. Swap to `gemini-2.5-pro` via `$env.GEMINI_MODEL`. (See ADR 002.)
- **Cache by URL hash.** Redis is in the compose file; the workflow ships
  with cache stubs so reviewers see fresh runs by default. (See ADR 003.)
- **Image generator on top of JSON.** The production output is a P&L
  card, not a JSON. Both are shipped so Niveshaay sees the end state.
  (See ADR 004.)

## Failure model

| Where it fails | What gets returned |
|---|---|
| Frontend can't reach webhook | `{success:false, error:{status:0, ...}}` |
| URL missing / wrong host / not .pdf | HTTP 400 with explanation |
| PDF > 20 MB | HTTP 413 |
| BSE/NSE download fails | HTTP 5xx with hostname in message |
| Gemini 4xx (bad input / key issue) | HTTP 5xx with Gemini message |
| Gemini returns "no pnl found" | HTTP 200 with `success:false, reason:'no_pnl_found'` |
| Gemini JSON malformed / schema mismatch | HTTP 5xx with first 500 chars of raw output |
| Math validation flags drift | HTTP 200 success with `validation.issues_count > 0` |

The front end's `ErrorDisplay` consumes any of these and shows a
remediation hint.

## Extensibility hooks

The workflow has three explicit hooks for production:

1. **Cache stubs** before/after Gemini — flip on by setting
   `CACHE_ENABLED=true` and wiring the Redis nodes (commented in the
   workflow file).
2. **Image renderer** — `Respond Success` can be replaced with an HTTP
   call to a render service (htmlcsstoimage.com / Browserless) that
   returns an image URL; the response shape stays JSON.
3. **WhatsApp dispatch** — branch from `Validate Math` to an
   `Evolution API` HTTP node; the rest stays untouched.

## What's intentionally not in this prototype

- Authentication, rate limiting, dashboard — see
  [`docs/production-readiness.md`](docs/production-readiness.md).
- Batch processing — easy to add as a second workflow with a Form
  Trigger accepting newline-separated URLs and a SplitInBatches loop.
- Persistent storage of results — the workflow is read-only by design;
  the existing Niveshaay schema decides where outputs land.
