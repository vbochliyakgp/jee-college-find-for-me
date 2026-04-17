# JEE College Find For Me (Complete Stack)

This repository contains a full-stack JEE counseling predictor:

- `backend/` - Go API with in-memory SQLite and CSV-powered prediction logic
- `frontend/` - Next.js app for user input and shortlist UI
- `data-processing/` - parsing/build scripts for JoSAA source data

The current product focus is a clean rank-based predictor with:

- `dream` / `easy` classification
- female + neutral pool handling
- branch-level shortlist rows
- CSV-driven data import at backend startup

## Project Structure

```text
complete-stack/
  backend/
  frontend/
  data-processing/
```

## Prerequisites

- Go (compatible with `backend/go.mod`)
- Bun (for `frontend/`)
- Node.js (for `data-processing/` scripts)

## 1) Backend Setup (Go API)

From repository root:

```bash
cd backend
go mod download
go run ./cmd/server
```

Default API URL: `http://127.0.0.1:8080`

Health check:

```bash
curl http://127.0.0.1:8080/health
```

## 2) Frontend Setup (Next.js)

Open a second terminal:

```bash
cd frontend
bun install
bun run dev
```

Default UI URL: `http://localhost:3000`

If backend runs on a different host/port, set:

```bash
GO_PREDICTOR_API_BASE_URL=http://127.0.0.1:8080
```

## 3) Data Processing (optional)

Use this when you want to regenerate cutoff artifacts or parsers:

```bash
cd data-processing
npm install
# run scripts from package.json as needed
```

## Common Commands

Backend tests:

```bash
cd backend
go test ./...
```

Frontend production build:

```bash
cd frontend
bun run build
```

## Notes

- Backend loads CSVs into in-memory SQLite at startup.
- Latest round data is used for prediction; older rounds are also imported for history/reference tables.
- Canonical gender values in app flow are `Neutral` and `Female`.
