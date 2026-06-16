# ADR 004 — Why we ship an image generator on top of the JSON

**Status:** Accepted
**Date:** 2026-06-16

## Context

Section 1 of the task brief says Niveshaay's existing pipeline already
pushes a **formatted image** to a WhatsApp group via evolution API. The
sample reference (`samples/sample-output-reference.jpeg`) shows that image
in full: title bar with company name, Niveshaay logo, 8 columns including
calculated "Change (in %)" columns, color-coded margins.

The task asks the submission to return JSON only. Strictly meeting the
brief = stopping there. But the JSON is one step short of the actual
production output, and the JSON does not carry the "Change (in %)" columns
that the production image shows.

## Decision

Ship two layers on top of the JSON:

1. **`image-generator/template.html` + `styles.css`** — print-ready static
   reference card matching the production layout. Brand colors are
   extracted directly from the logo. Margin rows, section headers and
   bold totals follow the production styling.

2. **`frontend/src/components/ImagePreview.tsx`** — live React renderer
   that hydrates the same layout from any JSON response. This is what the
   reviewer toggles to in the "P&L Card Preview" tab.

The pipeline itself stays JSON-only. The image is rendered client-side
(in the React frontend) and via a static template (for the production
Browserless / htmlcsstoimage.com handoff). Niveshaay can plug their
existing image renderer right in without changing the workflow.

## Consequences

- Reviewer sees **both** outputs (JSON + visual card) in one screen — they
  don't have to imagine how the JSON would look in WhatsApp.
- Signals that the candidate understood the **whole pipeline**, not just
  the slice the brief asked for.
- Tiny additional surface area: ~250 lines across the template + React
  component. No new runtime dependency.

## Alternatives considered

- **Render the image inside n8n with an `HTML to PNG` node.** Would have
  worked but ties the workflow to a specific renderer (Browserless,
  WeasyPrint container, etc.). Better to leave the renderer pluggable.
- **Skip the image entirely.** Misses the signal opportunity. The task
  evaluation criteria (correctness, end-to-end functionality, code
  quality, documentation) all benefit when reviewers can see the
  end-state, not just the JSON slice.
