# Samples

Three samples covering all schema variants the pipeline must handle:

| # | Folder | Quarter | Schema | Why it exists |
|---|---|---|---|---|
| 1 | `sample-1-Q4-Extended/` | Q4 FY26 | extended (6 columns) | Matches the iValue Infosolutions reference image shipped with the task brief |
| 2 | `sample-2-Q1-Standard/` | Q1 FY26 | standard (4 columns) | Services company (TCS) — no Gross Profit row; tests the "intelligently add or remove fields" rule |
| 3 | `sample-3-Q2-Extended/` | Q2 FY26 | extended (6 columns) | Manufacturer (Asian Paints) — full COGS + H1 columns; tests Q2-specific column naming |

## Files in each sample

| File | What it is |
|---|---|
| `input.txt` | The source filing description + URL pattern |
| `output.json` | The pipeline's expected JSON output for that filing |
| `notes.md` | Cross-checked recomputations proving the numbers are right |

## How to regenerate live

```bash
# Make sure n8n is up
docker compose up -d

# Send a real BSE/NSE URL
curl -X POST http://localhost:5678/webhook/process-pdf \
  -H 'Content-Type: application/json' \
  -d '{"pdf_url":"https://www.bseindia.com/xml-data/corpfiling/AttachLive/<UUID>.pdf"}' \
  | jq '.data' > samples/sample-N/output.json
```

## Reference image

`sample-output-reference.jpeg` is the visual target — the formatted
P&L card Niveshaay pushes to WhatsApp via evolution API. The repo's
React frontend (and the static `image-generator/template.html`) renders
this exact layout from the JSON.
