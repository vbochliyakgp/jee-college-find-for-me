# JEE College Find For Me (Complete Stack)

Full-stack JEE college predictor with a Go backend and Next.js frontend.

## Monorepo Apps

- `backend/` - Go API that loads JoSAA cutoff CSV data into in-memory SQLite at startup.
- `frontend/` - Next.js UI for entering rank and viewing shortlist results.
- `data-processing/` - Offline parsers for converting scraped JoSAA text files to structured artifacts.

## Current Product Scope

- Rank-based prediction for `jee-main` and `jee-advanced`.
- Two outcome bands: `dream` and `easy`.
- Branch-level shortlist rows grouped by institute.
- Female + gender-neutral pool handling.
- Category-based views when category rank is provided.

## Current Limitations

- PwD flow is not supported in the UI yet.
- B.Arch and B.Planning programs are not supported.
- Results are exploratory and not official counseling advice.

## Project Structure

```text
complete-stack/
  backend/
  frontend/
  data-processing/
```

## Prerequisites

- Go (version compatible with `backend/go.mod`)
- Bun (for `frontend/` and `data-processing/`)

## Quick Start

Run the backend:

```bash
cd backend
go mod download
go run ./cmd/server
```

Run the frontend in another terminal:

```bash
cd frontend
bun install
bun run dev
```

Default URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8080`

If backend is hosted elsewhere, set:

```bash
NEXT_PUBLIC_GO_PREDICTOR_API_BASE_URL=http://127.0.0.1:8080
```

Health check:

```bash
curl http://127.0.0.1:8080/health
```

## Useful Commands

Backend tests:

```bash
cd backend
go test ./...
```

Frontend checks:

```bash
cd frontend
bun run build
bun run lint
```

## Data Refresh (Optional)

When source files change, regenerate offline artifacts:

```bash
cd data-processing
bun install
bun run parse:cutoffs:all
```
