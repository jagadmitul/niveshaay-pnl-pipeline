# Roadmap

A short, honest list of what we'd build if this prototype became the
production pipeline replacement. Ordered by impact.

## Week 1 — finish the production loop

- [ ] **Auth on the webhook**: shared HMAC header verified in `Validate URL`.
      Stops anonymous public posts when the workflow is exposed outside the
      private network.
- [ ] **Cache on**: flip the Redis stubs to active and start collecting hit
      rate metrics. Expected hit rate during analyst-day: 60–75% after the
      first hour.
- [ ] **WhatsApp dispatch node**: branch from `Validate Math` to the
      existing evolution API HTTP node. Pipeline returns JSON to caller
      and pushes the card to the group simultaneously.
- [ ] **Pipeline metrics**: append `execution_id`, `pdf_url_hash`, tokens,
      duration, model used, and validation pass/fail to a Postgres
      `pipeline_runs` table for weekly cost + accuracy reports.

## Week 2 — analyst workflow

- [ ] **Manual edit panel**: when `validation.issues_count > 0`, surface a
      side panel on the frontend where the analyst can override any cell.
      Edits write a "corrections" row that becomes labeled training data
      if Niveshaay ever fine-tunes a smaller model later.
- [ ] **Watchlist auto-trigger**: cron node that polls NSE corporate
      announcements every 5 minutes and auto-runs the pipeline for any
      ticker in `watchlist.json`. Card lands in WhatsApp within 3 minutes
      of a filing dropping.
- [ ] **Batch endpoint**: second workflow with a Form Trigger that
      accepts newline-separated URLs, SplitInBatches with concurrency 4,
      and an aggregated response. Critical for results-day spikes.

## Month 2 — scale + UX

- [ ] **Comparison view in frontend**: paste 2+ URLs, get a side-by-side
      column compare. Useful when the same company files Q4 then the
      Annual Report a week later.
- [ ] **Provider fallback**: on Gemini 5xx or quota exhaustion, fall back
      to Claude 3.5 Sonnet (same prompt is provider-agnostic). Single
      env switch.
- [ ] **Document classifier**: prepend a tiny LLM call that classifies the
      PDF (Quarterly Result / Annual Report / Press Release / Investor
      Presentation) so non-P&L documents skip Gemini entirely.

## Stretch — research signals

- [ ] **MD&A summarizer**: separate workflow that extracts the management
      discussion + outlook commentary and produces a 5-bullet summary
      alongside the P&L card.
- [ ] **Sector benchmarking**: for any company processed, look up sector
      peers from a maintained table and show YoY/QoQ delta vs sector
      median in the WhatsApp card.
- [ ] **Earnings-call transcript ingest**: same pipeline, different
      prompt — push key quotes + sentiment into the same WhatsApp group
      when a transcript drops.

## What this roadmap is not

- Not a feature wishlist — every item maps to an observable analyst pain
  (manual extraction, late WhatsApp posts, missed filings, drift between
  Gemini and source PDF).
- Not a UI overhaul — the React frontend in this repo is for review +
  demo. Production keeps WhatsApp as the primary surface.
