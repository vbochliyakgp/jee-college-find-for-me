# Backend (Go Predictor API)

Go API that serves prediction data to the frontend by loading JoSAA cutoff CSVs into an in-memory SQLite database.

## Run Locally

```bash
go mod download
go run ./cmd/server
```

Default URL: `http://127.0.0.1:8080`

Health check:

```bash
curl http://127.0.0.1:8080/health
```

## Endpoints

- `GET /health`
- `GET /api/meta/filters`
- `POST /api/predict`

## Data Loading

- Source: `../data-processing/data/cutoffs/round-*-cutoffs.csv`
- Latest round is loaded into `cutoff_rows` (prediction source)
- Older rounds are loaded into history tables
- Values are normalized during import (gender/quota/state/seat formatting)

## Prediction Behavior (Current)

- Input requires exam type and rank (rank can come via `rank` or `score`)
- Rank window centered around user rank
- Rows filtered by exam type and supported seat constraints
- Output labels use two bands:
  - `dream`
  - `easy`
- Female requests can combine female and gender-neutral pools, then keep the better row per branch

## Canonical Values

- `examType`: `jee-main` | `jee-advanced`
- `gender`: `Neutral` | `Female`
- `chance`: `dream` | `easy`
- `category`: `General` | `OBC` | `SC` | `ST` | `EWS`

## Known Limits

- PwD-specific prediction flow is not supported end-to-end
- B.Arch and B.Planning are excluded
- Output is exploratory and should not be treated as official counseling advice

## Testing

```bash
go test ./...
```
