# JEE College Find For Me (complete stack)

Go API + Next.js app for **JoSAA-style cutoff row search**: filter official-style snapshots by exam, quotas, institute types, category context, and closing-rank bands. No signup.

## Monorepo layout

| Path | Role |
|------|------|
| `backend/` | HTTP API, loads cutoff CSVs into in-memory SQLite at startup |
| `frontend/` | Next.js UI: home form → results tables |
| `data-processing/` | Offline parsers: scraped JoSAA text → CSV artifacts |

## Product (current)

- **Home (`/`)** — `CutoffSearchForm`: JEE Main vs Advanced, gender pool, category, PwD, home state (Main only), institute types, optional rank bands per logical pool (open / category / open PwD / category PwD).
- **Results (`/results?q=…`)** — Four result pools; **`q`** is base64url(JSON) of `AdvancedCutoffQueryV1` so links are refreshable and shareable.
- **Redirects** — `/predict` and `/advanced` send users to `/`.

Backend: **`POST /api/cutoffs/query`** validates the payload, maps seat types per pool, runs SQL (including domicile-aware HS/OS/GO/JK/LA when `homeState` is set on JEE Main), returns row lists per pool.

## Limits

- B.Arch / B.Planning rows are excluded during backend DB import.
- IIT preparatory (`P`-suffix rank) rows are excluded during backend DB import.
- Not official JoSAA software; exploratory planning only.

## Run

### Docker Compose (dev, hot reload)

```bash
docker compose -f docker-compose.dev.yml up
```

API-only:

```bash
docker compose -f docker-compose.dev.yml up backend caddy
```

### Docker Compose (production build)

```bash
docker compose up --build
```

Health (behind Caddy, `/api` is proxied to the Go server):

```bash
curl -k https://localhost/api/health
curl http://localhost/api/health
```

Deploy with a real host:

```bash
SERVICE_DOMAIN=api.example.com docker compose up --build -d
```

### Local: backend + frontend separately

**Terminal 1 — backend**

```bash
cd backend
go mod download
go run ./cmd/server
```

Listens on `:8080` by default (`PORT` supported).

**Terminal 2 — frontend**

```bash
cd frontend
bun install
bun run dev
```

Defaults: frontend `http://localhost:3000`, backend `http://127.0.0.1:8080`.

When the browser must call the API on another origin, set in `frontend/.env.local`:

```bash
NEXT_PUBLIC_BACKEND_API_URL=http://127.0.0.1:8080
```

## Commands

```bash
cd backend && go test ./...
```

```bash
cd frontend && bun run build && bun run lint
```

## Regenerate cutoff CSVs

When raw inputs under `data-processing/data/cutoffs/` change:

```bash
cd data-processing
bun install
bun run parse:cutoffs:all
```

Then restart the backend so it reloads CSVs from `data-processing/data/cutoffs/` (see `CUTOFFS_CSV_DIR` in `backend/cmd/server`).

## Further reading

- `ALGORITHM.md` — Quota / home-state rules and cutoff-query behavior (no legacy rank predictor).
- `backend/README.md`, `frontend/README.md`, `frontend/AGENTS.md` — stack details for humans and agents.
