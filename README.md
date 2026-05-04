# JEE College Find For Me

A fast, no-signup search engine for exploring JoSAA and CSAB past cutoffs. Built with a Go API and Next.js frontend, it helps students filter official-style cutoff data by exam, closing rank, quotas, category, and institute type.

## Getting Started

The easiest way to run the full stack (backend API, frontend UI, and Caddy reverse proxy) is using Docker Compose.

```bash
# Start the full stack in development mode with hot reload
docker compose -f docker-compose.dev.yml up
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **API Health:** [http://localhost:8080/api/health](http://localhost:8080/api/health)

## Monorepo Layout

| Path | Role |
|------|------|
| `backend/` | Go HTTP API, loads JoSAA/CSAB CSVs into an in-memory SQLite DB at startup |
| `frontend/` | Next.js UI with a search form, results tables, and state persistence |
| `data-processing/` | Offline scripts to parse scraped JoSAA/CSAB text data into CSV artifacts |

## Features

- **Search:** JoSAA (Category Ranks) vs CSAB (CRL Ranks), JEE Main vs Advanced, quotas, categories, and rank bands.
- **State Persistence:** Form state is preserved via `sessionStorage` for seamless navigation.
- **Shareable Links:** Results URLs contain the query state encoded in base64url, allowing for easy sharing.
- **No Sign-up Required:** Fully open access to data exploration.

## Known Limits

- B.Arch / B.Planning rows are excluded during backend DB import.
- IIT preparatory (`P`-suffix rank) rows are excluded during backend DB import.
- *Disclaimer:* Not official JoSAA software; meant for exploratory planning only.

## Running Separately (Without Docker)

You can run the API and frontend independently for local development.

**Terminal 1 — Backend:**
```bash
cd backend
go mod download
go run ./cmd/server
```

**Terminal 2 — Frontend:**
```bash
cd frontend
bun install
bun run dev
```

*Note: If the frontend and backend are on different origins, set `NEXT_PUBLIC_BACKEND_API_URL=http://127.0.0.1:8080` in `frontend/.env.local`.*

## Regenerating Data

When raw text inputs change under `data-processing/data/cutoffs/` or `data-processing/data/dasa&csab/`:

```bash
cd data-processing
bun install
bun run parse:cutoffs:all
```
Restart the backend to load the updated CSV artifacts.

## Further Reading

- `ALGORITHM.md` — Quota/home-state rules and backend cutoff-query logic.
- `backend/README.md` & `frontend/README.md` — Detailed documentation for specific stack elements.
