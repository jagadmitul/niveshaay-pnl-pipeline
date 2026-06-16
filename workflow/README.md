# n8n Workflow

The single workflow `niveshaay-pnl-pipeline.json` is the heart of this
project. Import it, wire the Gemini key, activate, and the webhook is
live.

## Import + activate

1. Open n8n at `http://localhost:5678`
2. Top-right "..." menu → **Import from File** → select
   `niveshaay-pnl-pipeline.json`
3. The workflow opens with 10 nodes.
4. Open **Settings → Variables** (or your `.env`) and confirm
   `GEMINI_API_KEY` is set. The workflow reads it via `$env.GEMINI_API_KEY`.
5. (Optional) Set `GEMINI_MODEL` if you want to swap to `gemini-2.5-pro`.
6. Click **Active** in the top-right.
7. The webhook is now reachable at:
   ```
   http://localhost:5678/webhook/process-pdf
   ```

## Node-by-node walkthrough

| # | Node | Type | Responsibility |
|---|---|---|---|
| 01 | Webhook (POST /process-pdf) | `n8n-nodes-base.webhook` | Entrypoint; uses `responseNode` mode so we can respond with JSON inline |
| 02 | Validate URL | Code | Schema check, BSE/NSE allowlist, .pdf extension |
| 03 | Download PDF | HTTP Request | Binary download, 30s timeout, redirects |
| 04 | Build Gemini Request | Code | Base64 + 20MB guard + full prompt embedded |
| 05 | Call Gemini | HTTP Request | `generateContent` with JSON response mode |
| 06 | Parse Gemini Response | Code | Strip fences, JSON.parse, schema validate, surface tokens |
| 07 | Validate Math | Code | Recompute GP/EBITDA/PAT margins; flag drift > 0.5pp |
| 08 | Respond Success | Respond to Webhook | Returns the full payload |
| 09 | Format Error | Code | Normalizes errors to `{success:false, error:{...}}` |
| 10 | Respond Error | Respond to Webhook | Returns the normalized error with appropriate HTTP status |

## Editing the prompt

The prompt is embedded inside the **Build Gemini Request** Code node so
the workflow is portable as a single JSON. The canonical text also lives
at `workflow/prompt.txt`.

If you change the prompt:

1. Edit `workflow/prompt.txt`
2. Open Code node 04 and replace the `prompt` constant
3. Re-export the workflow and overwrite the JSON

## Switching from React frontend to n8n's Form Trigger

If you'd rather use n8n's built-in Form Trigger instead of the React app:

1. Add a **Form Trigger** node (single text field: `pdf_url`).
2. Replace the connection from `Webhook` → `Validate URL` with
   `Form Trigger` → `Validate URL`.
3. Leave the `Respond Success` / `Respond Error` nodes — Form Trigger
   renders their JSON output on the form's results page.

The workflow's logic doesn't change.

## Test the webhook directly

```bash
curl -X POST http://localhost:5678/webhook/process-pdf \
  -H 'Content-Type: application/json' \
  -d '{
    "pdf_url": "https://www.bseindia.com/xml-data/corpfiling/AttachLive/<UUID>.pdf"
  }' | jq
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Could not reach the n8n webhook at ...` | n8n container is down. `docker compose ps`. |
| Returns HTTP 401 from Gemini | `GEMINI_API_KEY` not propagated to the container. Restart n8n after editing `.env`. |
| Returns "no pnl found" on a valid filing | The PDF has only segment-wise statements, no consolidated P&L. Open the PDF and confirm. |
| Timeouts on large PDFs | Increase the HTTP Request timeout on `Download PDF` node from 30s to 60s. |
| Gemini returns plain text instead of JSON | Confirm `responseMimeType: "application/json"` is preserved in node 05's body. |
