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

- B.Arch and B.Planning programs are not supported.
- IIT preparatory-course admissions are not included.
- Results are exploratory and not official counseling advice.

## Project Structure

```text
complete-stack/
  backend/
  frontend/
  data-processing/
```

## How To Run

There are only two supported ways to run this project:

### Option 1: Docker Compose (everything in one shot)

```bash
docker compose up --build
```

Default URLs:

- App: `https://localhost` (also available on `http://localhost`)
- API: `https://localhost/api` (also available on `http://localhost/api`)

Quick checks:

```bash
curl -k https://localhost/api/health
curl http://localhost/api/health
```

### Option 2: Run backend + frontend individually

Backend (terminal 1):

```bash
cd backend
go mod download
go run ./cmd/server
```

Frontend (terminal 2):

```bash
cd frontend
bun install
bun run dev
```

Default URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8080`

When running individually, frontend requests the backend directly.
If backend is hosted elsewhere, set this in frontend .env:

```bash
NEXT_PUBLIC_GO_PREDICTOR_API_BASE_URL=http://127.0.0.1:8080
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

## Data Refresh (no needed, it is not for you)

When source files change, regenerate offline artifacts:

```bash
cd data-processing
bun install
bun run parse:cutoffs:all
```
