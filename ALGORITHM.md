# Cutoff query — behavior and rules

This document describes the **current** product: the advanced cutoff search (`POST /api/cutoffs/query`) and how it relates to counseling-style data.

An older **rank-based “predictor”** shortlist (tabs, dream/easy, `POST /api/predict`) was removed from this repository. Quota and domicile rules below are what the cutoff SQL path implements today.

---

## 1. Request shape (conceptual)

The browser sends **`AdvancedCutoffQueryV1`** (see `frontend/lib/advanced-query/types.ts` and `backend/internal/cutoffquery/request.go`).

| Area | Role |
|------|------|
| `counseling` | `josaa` vs `csab` — decides the target database table and ranking logic |
| `examType` | `jee-main` vs `jee-advanced` — drives allowed quotas, `homeState`, institute types |
| `genderPool` | `neutral` / `female` — maps to DB `gender` |
| `category`, `isPwd` | Decide which **logical pools** may have rank bands and how seat types are resolved |
| `homeState` | JEE Main only, optional — expands quotas and turns on **domicile row filters** (§4) |
| `quotas` | Usually derived on the client from exam + `homeState`; server validates |
| `instituteTypes` | `IIT` / `NIT` / `IIIT` / `GFTI` — Advanced is IIT-only; Main disallows IIT in the payload |
| `powerMode.closingRankBands` | Union of rank windows; each clause targets `open` / `category` / `open_pwd` / `category_pwd` |

For each logical pool that has at least one active band, the server runs a **distinct** `SELECT` on the chosen table (`cutoff_rows` or `csab_cutoff_rows`) with that pool’s seat types and the shared global filters.

---

## 2. Counseling modes

Implementation: `backend/internal/cutoffquery/service.go`.

### JoSAA (`josaa`)
*   Uses **JoSAA category ranks** for category-specific seats (OBC, SC, ST, etc.).
*   Each logical pool (Open, Category, PwD) requires its own explicit rank range in the request.

### CSAB (`csab`)
*   Uses **Common Rank List (CRL)** for ALL seats, including reserved categories.
*   **Auto-fill logic**: If the `open` logical pool has a rank range, the server automatically applies that same range to the `category`, `open_pwd`, and `category_pwd` pools if they are eligible for the user. This simplifies the frontend to a single CRL input.

---

## 3. Seat types per pool

Implementation: `backend/internal/cutoffquery/seat_types.go`.

The server maps **`targetPool` + `category`** to exact `seat_type` strings (e.g. `OPEN`, `OBC-NCL`, `OPEN (PwD)`, …) matching JoSAA-style labels in the imported CSV.

---

## 4. Quota and home state (domicile)

When **`homeState` is absent** on JEE Main, only **AI** and **OS** quotas are allowed on the request, and the SQL path does **not** add extra row predicates beyond `quota IN (...)`.

When **`homeState` is set** on JEE Main, the client sends the full quota set **AI, OS, HS, GO, JK, LA**, and the server appends row filters (see `query_pool.go` — `homeStateQuotaSQL`) so that:

| Row `quota` | Row included when |
|-------------|-------------------|
| `AI` | Always (within other filters) |
| `HS` | Institute `state` equals the user’s home state |
| `OS` | Institute `state` is **not** the user’s home state |
| `GO` | User home state is **Goa** |
| `JK` | User home state is **Jammu and Kashmir** (exact string as in UI / data) |
| `LA` | User home state is **Ladakh** |

`state` on each row is the **institute state** attached during import, used for HS/OS discrimination.

JEE Advanced: **`homeState` must not be sent**; quotas are **AI + OS** only; institute types **IIT** only.

---

## 5. Rank bands

Each `closingRankBandClause` contributes `(closing_rank >= min OR min null) AND (closing_rank <= max OR max null)`; multiple clauses for the same `targetPool` are OR’d inside that pool’s query. Pools with no active bands return an empty array without hitting the DB for that pool. **At least one rank value (min or max) must be provided across all active bands; otherwise, the API rejects the request.**

---

## 6. Sorting

Pool results are ordered by **`closing_rank` ASC**, then institute, then department (`query_pool.go`).

---

## 7. Shareable results

The frontend encodes the same JSON body into **`/results?q=`** (base64url) so opening or refreshing the page can **replay** the query against the API. There is no server-side session store for results.
