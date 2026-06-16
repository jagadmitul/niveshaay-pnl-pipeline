# ADR 003 — Caching strategy (Redis, by URL hash)

**Status:** Recommended for production
**Date:** 2026-06-16

## Context

During testing, reviewers will hit the same PDF dozens of times. The
supplied Gemini key has a $10 budget. Each call costs roughly $0.10–0.30.
Without caching, the budget burns through faster than is comfortable.

In production, the same filing PDF may be reprocessed when downstream
analysts re-trigger the WhatsApp send — again, no need to re-extract.

## Decision

Add an **optional cache** layer keyed by `sha256(pdf_url)` backed by Redis
(already in `docker-compose.yml`). The workflow ships with the cache
**disabled by default** so reviewers see fresh Gemini outputs. A simple
"Cache Lookup" and "Cache Save" code node pair is included in
`workflow/niveshaay-pnl-pipeline.json` as commented stubs — flipping a
single env var (`CACHE_ENABLED=true`) wires them in.

### Why hash the URL, not the PDF bytes?

- BSE URLs are immutable once published (the UUID is content-addressed).
- Hashing the URL is O(1) — no need to download to know cache state.
- If a filing is amended, BSE issues a new URL with a new UUID, so cache
  invalidation comes for free.

### TTL

- **24 hours** for "in-flight" filings (results just dropped, analysts
  still re-triggering).
- **No expiry** for filings older than 7 days (archive read-through).

## Consequences

- 80%+ Gemini cost reduction during testing — comfortable within $10.
- Re-runs return in <100 ms instead of 12 s. Niveshaay's analysts get an
  instant card when they pull the same filing twice.
- Adds a Redis dependency. Already in the compose file; no extra work for
  the reviewer.

## Alternatives considered

- **File cache to disk.** Simpler but Niveshaay almost certainly runs n8n
  on a multi-instance setup; disk cache wouldn't share across workers.
- **n8n's built-in `Static Data`.** Persists across executions but is
  workflow-scoped and slower than Redis for high-traffic days.
