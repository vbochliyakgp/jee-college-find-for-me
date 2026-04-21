# Backend (Go cutoff API)

Serves **`POST /api/cutoffs/query`**: loads JoSAA-style cutoff CSVs into **in-memory SQLite** at process start, validates JSON, runs one query per non-empty rank-band pool, returns distinct rows.

Monorepo run instructions: root **`../README.md`**.

## HTTP routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness JSON `{"status":"ok"}` |
| `POST` | `/api/cutoffs/query` | Body: `cutoffquery.Request` (JSON). Success: pools `open`, `category`, `openPwd`, `categoryPwd` |

## Data loading

- **Source directory**: `CUTOFFS_CSV_DIR` or defaults under `data-processing/data/cutoffs` (see `cmd/server/main.go`).
- **Table**: `cutoff_rows` (and optional round history tables from the importer).
- **Normalization**: gender, quota, state, seat type, etc. in `internal/importer`.

## Cutoff query behavior (summary)

- **Validation** — `internal/cutoffquery/validate.go` (exam, quotas vs `homeState`, institute types, rank bands vs category/PwD).
- **Seat types** — `seat_types.go` maps each logical pool + category to JoSAA `seat_type` strings.
- **SQL** — `query_pool.go`: global filters + closing-rank OR bands per pool; when JEE Main sends **`homeState`**, extra predicates match **ALGORITHM.md §5** (HS vs institute `state`, OS other-state, GO/JK/LA vs domicile).

## Canonical string values

- `examType`: `jee-main` | `jee-advanced`
- `genderPool` (request) / DB `gender`: `neutral` → `Neutral`, `female` → `Female`
- `category`: `General` | `OBC` | `SC` | `ST` | `EWS`
- Quotas: `AI`, `OS`, `HS`, `GO`, `JK`, `LA`
- `instituteTypes`: `IIT`, `NIT`, `IIIT`, `GFTI`

## Known limits

- B.Arch / B.Planning rows are excluded during backend DB import.
- IIT preparatory (`P`-suffix rank) rows are excluded during backend DB import.
- Exploratory output only — not official counseling.
