# Go Predictor Backend (Current State)

This README documents only what is currently implemented.

## What is built

- Go HTTP server with endpoints:
  - `GET /health`
  - `GET /api/meta/filters`
  - `POST /api/predict`
- In-memory SQLite database loaded at startup from JoSAA CSV files.
- Base-case rank predictor with:
  - rank-window filtering
  - two outcomes: `dream` and `easy`
  - branch-level rows (institute can repeat)
  - female/neutral pool handling with merge-best behavior

## Data loading

- Source files: `data-processing/data/cutoffs/round-*-cutoffs.csv`
- Import behavior:
  - latest round -> `cutoff_rows` (used by prediction API)
  - older rounds -> `cutoff_rows_round_1` ... `cutoff_rows_round_5`
- Import normalization is applied before DB insert (gender/quota/state typing etc.).

## Canonical conventions (single source of truth)

Use these values consistently in DB, backend, and frontend:

- `gender`: `Neutral` | `Female`
- `chance`: `dream` | `easy`
- `examType` (request): `jee-main` | `jee-advanced`
- `quota`: `AI` | `HS` | `OS`
- `seat_type` examples: `OPEN`, `OPEN (PwD)`, `OBC-NCL`, `SC`, `ST`, `EWS`
- `category` (request): `General` | `OBC` | `SC` | `ST` | `EWS`

Rule: normalize raw CSV values to canonical forms at import time.

## Prediction pipeline (current)

### 1) Request normalization

- Required: `examType`, `rank` (rank may come via `rank` or `score` field from clients).
- Defaults:
  - missing/invalid gender input -> treated as neutral request flow
  - no implicit home-state default

### 2) Rank window

- Base-case range is around submitted rank:
  - `minRank = rank - rank/2` (clamped to 1)
  - `maxRank = rank + rank/2`

### 3) Row fetch constraints

Rows must satisfy:

- `exam_type = examType`
- `seat_type = OPEN`
- `closing_rank BETWEEN minRank AND maxRank`
- excludes B.Arch and B.Planning programs
- gender pool by user gender:
  - neutral user -> `Neutral`
  - female user -> `Neutral` + `Female`

### 4) Chance classification

For each row:

- `dream` if `closing_rank < user_rank`
- `easy` if `closing_rank >= user_rank`

### 5) Female merge-best logic

When female users can see both pools, duplicate branch rows can exist for same:

- `(institute, department)`

Dedup rule:

- keep the row with higher `closing_rank` (better probability for that user)

### 6) Output ordering

Final rows are sorted deterministically by:

1. `closing_rank` ascending
2. `institute` ascending
3. `department` ascending

## API response shape (current)

`POST /api/predict` returns:

- `resolvedRank`
- `colleges[]` (branch-level cards)
  - each `departments[0]` includes:
    - `department`
    - `opening_rank`
    - `closing_rank`
    - `quota`
    - `gender`
    - `seat_type`
    - `chance` (`dream|easy`)
- `count`

## Intentionally not implemented yet

- Full category-rank decision optimization across all seat types
- PwD/home-state benefit explanation tags in final UX
- Multi-band outcomes (`safe/target/moderate`) beyond `dream/easy`
- Preference modeling beyond cutoff/rank baseline

## Verification

- Unit tests: `internal/predict/service_test.go`
- Backend check: `go test ./...`
