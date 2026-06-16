# Production Readiness Notes

This is a prototype, but it was built to upgrade cleanly. Below is a
short, opinionated checklist for what would change if Niveshaay shipped
this as the production replacement for the current n8n flow.

## Move from "prototype" → "production"

| Area | Today | Production target |
|---|---|---|
| **Cache** | Disabled stubs | Redis enabled, key = `sha256(pdf_url)`, 24h TTL (see ADR 003) |
| **Auth** | Open webhook | Shared HMAC header (`X-Niveshaay-Sig`) verified in Validate URL node |
| **Rate limit** | None | `n8n queue mode` + per-IP throttling at NGINX in front |
| **Observability** | n8n execution log | Forward execution metadata (`execution_id`, `pdf_url_hash`, `tokens`, `duration_ms`) to Loki/CloudWatch |
| **Cost tracking** | Tokens returned in response | Append to a Postgres `gemini_usage` table; alert on weekly spend |
| **Secrets** | `$env.GEMINI_API_KEY` | n8n native credential store, rotated via Vault / AWS Secrets Manager |
| **Image rendering** | Client-side preview + static template | `image-renderer` micro-service (Puppeteer) or htmlcsstoimage.com API call after `Validate Math` |
| **WhatsApp dispatch** | Out of scope | Hook the existing evolution API node onto the `Respond Success` branch |

## Scaling shape

The pipeline is naturally fan-out friendly:

- **n8n queue mode**: Add Redis-backed queue workers. The webhook stays in
  the main instance; PDF download + Gemini call go to workers. Earnings-
  day spikes (10–30 filings/min) stop being a problem.
- **Gemini concurrency**: Default Gemini Studio key allows 60 RPM. For
  Niveshaay scale, move to a paid project and lift to 1000 RPM.
- **Idempotency**: The cache key already provides idempotency. If a worker
  dies mid-execution and another worker picks it up, the second call
  reads from cache.

## What would break this

- **Scanned image-only PDFs** without text layers. Mitigation: detect via
  page count + text-density check; fall back to `gemini-2.5-pro` (which
  handles scanned PDFs natively).
- **Filings with multiple consolidated tables** (e.g. holding companies
  reporting segment-wise). The prompt already says "look at consolidated
  financial results"; in practice we'd add a quick post-extraction sanity
  check that totals match.
- **BSE/NSE serving the PDF with `text/html` content-type**. Mitigation:
  the Download PDF node already forces `Accept: application/pdf,*/*` and
  follows redirects up to 5 deep.
- **Gemini quota exhaustion**. Pipeline returns a normalized 5xx error
  shape; frontend surfaces it cleanly. Production should add an auto-
  fallback to Claude (the prompt is provider-agnostic, only the API call
  changes).

## What we'd build next (one-week sprint)

1. **Batch endpoint** — accept a list of URLs, fan-out in parallel, return
   a single envelope. Critical for results-day spikes when 30 filings
   drop in one hour.
2. **WhatsApp dispatch node** wired onto `Respond Success` with the
   evolution API credentials already in n8n.
3. **Watchlist trigger** — schedule node that polls NSE corporate
   announcements every 5 min and auto-triggers the pipeline for any
   ticker in `watchlist.json`.
4. **Analyst override UI** — when `validation.issues_count > 0`, surface
   a side panel where the analyst can manually edit any cell before the
   image renders. Edits are written back to Postgres for retraining
   signal.

See `ROADMAP.md` for the longer view.
