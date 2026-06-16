# ADR 001 — Why the backend is pure n8n

**Status:** Accepted
**Date:** 2026-06-16

## Context

The task brief says *"You may use only n8n for the task."* but Section 2.1
also says the form *"can be HTML/React/any framework"*. The two clauses
contradict each other on the surface.

## Decision

Treat n8n as the **only execution engine** for the pipeline. The frontend
is a static React app that does nothing more than POST a JSON body to the
n8n webhook and render the response. All real logic — URL validation, PDF
fetch, Gemini call, JSON parse, math check, error normalization — lives in
the n8n workflow.

## Consequences

- **Single import, single setup.** Reviewer imports one JSON, sets one
  credential, runs `docker compose up`, and the pipeline is live.
- **Frontend is disposable.** If Niveshaay decides to keep n8n's Form
  Trigger instead, the workflow needs no changes — just swap the first
  node.
- **No hidden business logic.** Every analyst-facing rule (margin
  recomputation, schema check, error shape) is visible in the workflow
  graph. Easier to audit, easier to extend with the existing n8n team.
- The frontend stays a thin UI — there's no temptation to push logic into
  TS that should live in the workflow.

## Alternatives considered

- **Pure n8n Form Trigger.** Cleanest "n8n only" interpretation but the
  Form Trigger UI is fixed; reviewers can't experience the production card
  preview side-by-side. We kept the React app as an optional showcase but
  shipped a Form Trigger variant inside the same workflow file (just
  disconnect Webhook and connect Form Trigger to "Validate URL").
- **Custom Express/Flask backend.** Would have been faster to write than
  the n8n JSON but violates the spirit of the constraint and gives
  Niveshaay nothing to maintain alongside their existing workflow library.
