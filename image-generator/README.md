# Image Generator

A print-ready HTML template that renders the **Niveshaay-branded P&L card** —
the same format you push to the WhatsApp group via evolution API.

## Why this exists

The task asks for JSON only. But the real production output is the
formatted P&L image in `samples/sample-output-reference.jpeg`. This template
captures that format end-to-end so the pipeline can hand a finished card
to the WhatsApp dispatcher instead of just a JSON blob.

## What's here

- **`template.html`** — static markup using the iValue Infosolutions sample so
  you can sanity-check the layout in a browser.
- **`styles.css`** — brand colors extracted from the Niveshaay logo. Includes
  the three row variants: section heading, bold totals, highlighted margins.
- **`logo.png`** — the Niveshaay logo asset (cached locally so the renderer
  doesn't have to fetch it on every run).

## How to render from JSON in production

Two clean paths:

1. **n8n + HTTP node → Browserless** (recommended). Push the JSON to a tiny
   server that hydrates the template, then call `https://chrome.browserless.io/screenshot?token=...`
   with the rendered HTML. Cheapest path; no server you have to maintain.
2. **n8n + Code node → htmlcsstoimage.com**. POST `{html, css}` and get back
   an image URL in ~600 ms. Easiest if you don't want to run any browser.

The React frontend already renders the same layout client-side (see
`frontend/src/components/ImagePreview.tsx`) so reviewers can see the card
without spinning up a renderer.

## Preview the static template

```bash
cd image-generator
python3 -m http.server 8081
# open http://localhost:8081/template.html
```
