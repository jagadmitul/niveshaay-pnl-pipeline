# Niveshaay — Automated P&L Pipeline

Paste a BSE/NSE corporate-result PDF link and get back a standardized,
math-validated P&L JSON.

Submission for the Niveshaay Tech Team assignment. Mitul Jagad, June 2026.

- Live: https://niveshaay-pnl-pipeline.vercel.app
- Webhook: `POST https://niveshaay-pnl-pipeline.vercel.app/api/process-pdf`
- Repo: https://github.com/jagadmitul/niveshaay-pnl-pipeline

Stack: n8n · Gemini 2.5 Pro · React + Vite · Vercel + Railway.

## Quick test

```bash
curl -X POST https://niveshaay-pnl-pipeline.vercel.app/api/process-pdf \
  -H 'Content-Type: application/json' \
  -d '{"pdf_url":"https://www.bseindia.com/xml-data/corpfiling/AttachHis/af9d0bd2-4d46-4d9a-bf64-73db891db83a.pdf"}'
```

Or open the live URL and paste any BSE corporate-result PDF link.

Real sample outputs are in `samples/`.

## Run locally

```bash
cp .env.example .env             # paste your Gemini key
docker compose up -d             # boots n8n on :5678 + Redis
# Open http://localhost:5678 → finish first-run setup
# Import workflow/niveshaay-pnl-pipeline.json → toggle Active

cd frontend
cp .env.example .env.local
npm install
npm run dev                      # http://localhost:5173
```

The Vite dev server proxies `/api/process-pdf` to localhost:5678.

## How it works

```
Browser
  └─ POST /api/process-pdf
       └─ Vercel function (or Vite proxy in dev)
            └─ Railway n8n webhook
                 ├─ Validate URL
                 ├─ Download PDF
                 ├─ Build Gemini Request (Section-3 prompt + inline PDF)
                 ├─ Call Gemini 2.5 Pro
                 ├─ Parse Response (handles `no pnl found`)
                 ├─ Validate Math (recomputes margins, enriches calculated rows)
                 └─ Respond
```

The Section-3 prompt is verbatim from the assignment. Total Expenses,
Gross Profit, margins and other rows marked `*Calculated if missing`
in the prompt are filled in by the workflow when Gemini omits them,
using the prompt's own formulas (e.g. Total Expenses = Revenue − EBITDA).

## Sample response

```json
{
  "success": true,
  "data": {
    "company_name": "Bharat Forge Limited",
    "quarter_type": "extended",
    "row1": ["Particulars", "Q4 FY26", "Q3 FY26", "Q4 FY25", "FY26", "FY25"],
    "row2": ["Revenue", "2260.50", "2083.70", "2163.00", "8395.80", "8843.70"],
    "row3": ["Expenses", "", "", "", "", ""],
    "row4": ["Total Expenses", "1650.20", "1514.30", "1534.10", "6083.70", "6320.10"],
    "row5": ["EBITDA", "610.30", "569.40", "628.90", "2312.10", "2523.60"]
  },
  "meta": {
    "model_used": "gemini-2.5-pro",
    "total_tokens": 12345,
    "rows_returned": 14
  },
  "validation": { "passed": true, "issues_count": 0, "issues": [] }
}
```

When the PDF has no P&L table (e.g. earnings-call transcripts):

```json
{
  "success": false,
  "reason": "no_pnl_found",
  "message": "The document does not contain a recognizable Profit & Loss statement."
}
```

## Error shape

```json
{
  "success": false,
  "error": {
    "message": "URL must be from BSE or NSE. Got host: example.com",
    "status": 400,
    "timestamp": "2026-06-17T08:25:18.114Z"
  }
}
```

Status codes: 400 (bad URL), 413 (PDF >30MB), 422 (no P&L), 502 (upstream), 504 (timeout).

## Folder layout

```
.
├── README.md
├── docker-compose.yml             # n8n + Redis for local
├── .env.example
├── workflow/
│   └── niveshaay-pnl-pipeline.json
├── frontend/
│   ├── api/process-pdf.ts         # Vercel function (proxy to Railway)
│   └── src/                       # React app
├── n8n-deploy/                    # Railway Dockerfile + entrypoint
└── samples/                       # real BSE outputs
```

## Notes

- Default model is `gemini-2.5-pro`. Swap via the `GEMINI_MODEL` env var.
  Flash is faster (~15s vs 35-55s) but sometimes picks the standalone
  section instead of consolidated.
- Vercel Hobby caps Node functions at 60s, which Pro occasionally brushes
  on larger filings. Frontend retries on 504. Upgrading the plan or moving
  to async polling are the only real fixes.
- BSE links work end-to-end. NSE has bot protection on server-side fetches.
- Webhook PDF cap is 30MB. Larger filings would need the Gemini Files API.

Questions: jagadmitul@gmail.com
