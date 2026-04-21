# Prediction Algorithm — How It Works

This document traces the complete data flow from form submission to sorted results for every scenario.

---

## 1. Form Fields → Backend Request

| Form field | JSON field sent | Used as |
|---|---|---|
| CRL Rank | `rank` | Primary rank for OPEN pool |
| Category | `category` | `General / OBC / SC / ST / EWS` |
| Category Rank | `categoryRank` | Rank for category-specific pool |
| Gender | `gender` | `gender-neutral` or `female` |
| Home State | `homeState` | Quota filter (HS vs OS rows) |
| PwD checkbox | `isPWD` | Enables PwD pool building |
| OPEN-PwD Rank | `openPwdRank` | Rank for `OPEN (PwD)` pool |
| Category-PwD Rank | `categoryPwdRank` | Rank for e.g. `OBC-NCL (PwD)` pool |
| Tab clicked | `mode` | `combined / without-category / category-only / pwd-only` |

**PwD rank fields are optional.** If left blank, the corresponding PwD pool is simply not searched. If `isPWD` is checked but both PwD rank fields are empty, `pwd=true` is not sent at all and the request behaves as non-PwD.

---

## 2. The Two Code Paths

After validation, the backend routes to one of two completely separate paths.

```
incoming request
      │
      ▼
  mode switch
  ├── without-category → strip to General + no PwD → check condition below
  ├── category-only    → predictWithPools(open=false, cat=true,  pwdOnly=false)
  ├── pwd-only         → predictWithPools(open=false, cat=false, pwdOnly=true)
  └── combined / ""   → check condition below
           │
           ▼
   Category != General  OR  isPWD == true ?
   ├── YES → predictWithPools(open=true, cat=Category!="General", pwdOnly=false)
   └── NO  → fetchBaseGeneralRows  (simple path)
```

**Simple path** triggers only when the effective request is: General category + not PwD.
This happens for:
- A pure General non-PwD student on any tab
- Any student on the **Open tab** (because `without-category` strips everything to General + no PwD before the check)

**Pool path** triggers for everyone else: reserved category, PwD students, or any tab mode that explicitly routes there.

---

## 3. Simple Path (General / Open tab)

**File:** `fetcher.go` → `fetchBaseGeneralRows`, then `grouper.go` → `groupByCollege`

### Fetch
Single SQL query on `cutoff_rows` where:
- `seat_type = 'OPEN'`
- `closing_rank BETWEEN minRank AND maxRank`
- Gender filter: `gender = 'Neutral'` OR `gender IN ('Neutral', 'Female')` if female
- Quota filter: depends on home state (see quota section below)
- `ORDER BY closing_rank ASC`

### Spread window (rankSpread)
The `[minRank, maxRank]` window is computed as `rank ± spread` where spread scales with rank magnitude:

| Your rank | Base spread |
|---|---|
| ≤ 100 | 120 |
| ≤ 300 | 220 |
| ≤ 700 | max(320, rank × 0.55) |
| ≤ 1,500 | max(550, rank × 0.50) |
| ≤ 3,000 | max(900, rank × 0.45) |
| ≤ 6,000 | max(1,500, rank × 0.40) |
| ≤ 12,000 | max(2,800, rank × 0.34) |
| ≤ 25,000 | max(5,000, rank × 0.28) |
| ≤ 50,000 | max(8,500, rank × 0.22) |
| ≤ 1,00,000 | max(13,000, rank × 0.18) |
| > 1,00,000 | max(18,000, rank × 0.15) |

If no rows are found, the spread is multiplied by 5× → 10× → 15× → 20× (up to 5 attempts).

### Deduplication (`groupByCollege`)
For each `(institute, department)` pair, keeps the row with the **highest closing rank** — i.e. the most accessible seat (Female pool cutoff > Neutral pool cutoff, so Female wins when present).

Also stores the Neutral closing rank separately as `generalClosingRank` for display.

### Sort
`closing_rank` ascending. Because dream entries all have `closing_rank < userRank` and easy entries all have `closing_rank >= userRank`, dream entries naturally appear first without explicit grouping.

### What is shown on the card
- **OPEN (Neutral) cutoff** = the Neutral pool closing rank for that program (reference)
- **Your pool cutoff** = the winning row's closing rank (Female if female, otherwise same as above)

---

## 4. Pool Path (predictWithPools)

**File:** `category_flow.go`

Used for all non-Open tabs and for any student who is reserved category or PwD.

### Step 1 — Build eligible pools (`buildEligiblePools`)

Each pool is a struct `{seatType, rank, rankType}`. The pools built depend on the mode flags:

| `includeOpen` | `includeCategory` | `pwdOnly` | Pools built |
|---|---|---|---|
| true | false | false | OPEN always; plus OPEN(PwD) only when `isPWD=true` and `openPwdRank` is given |
| false | true | false | {Category} + {Category}(PwD) if categoryPwdRank given |
| true | true | false | All four above |
| false | false | true | OPEN(PwD) if openPwdRank given + {Category}(PwD) if categoryPwdRank given |

Important clarification:
- In backend pool-builder logic, `includeOpen` means "include OPEN family pools". So in combined/category flows it may include both `OPEN` and `OPEN (PwD)` if PwD inputs exist.
- In the **Open tab** (`without-category`), PwD fields are stripped before routing, so the effective pool is **OPEN only**.

Category seat type mapping:
- OBC → `OBC-NCL`, OBC PwD → `OBC-NCL (PwD)`
- SC → `SC`, SC PwD → `SC (PwD)`
- ST → `ST`, ST PwD → `ST (PwD)`
- EWS → `EWS`, EWS PwD → `EWS (PwD)`

### Step 2 — Fetch rows per pool (`fetchRowsBySeatType`)

For each pool, runs a SQL query:
```sql
WHERE seat_type = ?          -- exact match: 'OPEN', 'OBC-NCL', 'OPEN (PwD)', etc.
  AND closing_rank BETWEEN ? AND ?
  AND gender = 'Neutral'     -- or (Neutral OR Female) if female user
  AND quota ...              -- see quota section
```

The `[minRank, maxRank]` window uses the same `rankSpread` function and the same 5-attempt widening, but widening stops only once **all pools** have at least one matching row.

### Step 3 — Score each row (`scoreCandidate`)

For each fetched row:
- **chance** = `easy` if `closing_rank >= pool.rank`, else `dream`
- **margin** = `(closing_rank - pool.rank) / pool.rank`  (positive = easy, negative = dream)

### Step 4 — Deduplicate (`mergeBestCandidate`)

One winner kept per `(institute, department)`. Preference order:
1. `easy` beats `dream`
2. Higher margin wins (algorithm prefers safer/easier gap, not closest fit)
3. Higher `closing_rank` as tiebreaker

This means for a given program, if the Female pool gives easy and Neutral gives dream, Female wins. If OBC-NCL gives easy and OPEN gives dream, OBC-NCL wins.

### Step 5 — Fetch OPEN Neutral anchors

After deduplication, fetches the `MAX(closing_rank)` for `seat_type='OPEN'`, `gender='Neutral'`, `quota IN ('AI','OS')` for every winning program. This is the **OPEN (Neutral) cutoff** shown on the card and also the primary sort key.

### Step 6 — Sort

```
1. dream before easy
2. within each group: sort by OPEN Neutral anchor ascending (most competitive program first)
3. tiebreaker: closing_rank ascending
4. tiebreaker: institute name alphabetically
5. tiebreaker: department name alphabetically
```

These tiebreakers are used only for ordering rows that are already selected. They do **not** decide whether a row is included or excluded.

---

## 5. Quota Filter Logic

Applies to both code paths. Determines which rows are eligible based on home state:

| Row's quota | Condition to include |
|---|---|
| `AI` | Always included (All India) |
| `HS` | Only if `row.state == userHomeState` |
| `OS` | Only if `row.state != userHomeState` |
| `GO` | Only if userHomeState = Goa |
| `JK` | Only if userHomeState = Jammu & Kashmir |
| `LA` | Only if userHomeState = Ladakh |

If no home state is provided: only `AI` and `OS` rows are included.

---

## 6. Tab Modes — What Each Strips/Keeps

| Tab | mode param | Fields stripped before routing | Pools |
|---|---|---|---|
| Open | `without-category` | Category→General, CategoryRank→nil, CategoryPwdRank→nil, IsPWD→false, OpenPwdRank→nil | OPEN only |
| {Category} | `category-only` | IsPWD→false, OpenPwdRank→nil, CategoryPwdRank→nil | {Category} only |
| PwD Quota | `pwd-only` | nothing | OPEN(PwD) + {Category}(PwD) |
| Best Path | `combined` | nothing | all available pools |

Tabs are only shown when 2+ tabs exist. A General non-PwD student sees no tabs (single combined view). The Best Path tab data is SSR-fetched on the server; Open / Category / PwD Quota tabs are fetched client-side in parallel on page load and cached in React state — no re-fetch on tab click.

---

## 7. Scenario Reference

### Scenario A — General student, no PwD, no home state
- Pools: `OPEN` (CRL rank)
- Path: simple (`fetchBaseGeneralRows`)
- Tabs shown: none
- Sort: pool cutoff ascending

### Scenario B — General student, female, home state = Bihar
- Pools: `OPEN` Neutral + `OPEN` Female
- Path: simple
- Tabs: none
- Dedup: Female row wins when `closing_rank(Female) > closing_rank(Neutral)`
- Card shows: OPEN Neutral cutoff as reference, Female closing rank as "your pool cutoff"

### Scenario C — OBC student, categoryRank given, no PwD
- Tabs: Open | OBC-NCL | Best Path
- **Open tab** (without-category): strips to General → simple path → OPEN pool only
- **OBC-NCL tab** (category-only): pool path → `OBC-NCL` pool using categoryRank
- **Best Path** (combined): pool path → `OPEN` + `OBC-NCL`

### Scenario D — General PwD, openPwdRank given
- Tabs: Open | PwD Quota | Best Path
- **Open tab**: strips PwD → OPEN only (simple path)
- **PwD Quota**: `OPEN (PwD)` pool using openPwdRank
- **Best Path**: `OPEN` + `OPEN (PwD)` — mergeBestCandidate picks easier path per program

### Scenario E — OBC PwD, all ranks given (CRL + categoryRank + openPwdRank + categoryPwdRank)
- Tabs: Open | OBC-NCL | PwD Quota | Best Path
- **Open**: OPEN only (simple path)
- **OBC-NCL**: `OBC-NCL` pool only (PwD stripped)
- **PwD Quota**: `OPEN (PwD)` + `OBC-NCL (PwD)` — mergeBestCandidate picks best PwD seat per program
- **Best Path**: all 4 pools — each program gets its single easiest seat across all pools

### Scenario F — OBC PwD, only categoryPwdRank given (no openPwdRank)
- Tabs: Open | OBC-NCL | PwD Quota | Best Path  (PwD Quota shows because at least one PwD rank present)
- **PwD Quota**: only `OBC-NCL (PwD)` pool (OPEN PwD skipped, no rank)
- **Best Path**: `OPEN` + `OBC-NCL` + `OBC-NCL (PwD)`  (OPEN PwD skipped)

### Scenario G — OBC student, no categoryRank, no PwD
- Tabs: none (categoryRank missing → `showTabs = false`)
- Behaves like Best Path: pool path with OPEN only (no categoryRank → can't build OBC-NCL pool)

### Scenario H — Female OBC PwD, home state = Bihar
- All 4 tabs shown
- Every pool fetches both Neutral and Female rows
- For each pool, Female row wins over Neutral row when Female cutoff > Neutral cutoff (i.e. Female is more accessible)
- Home state filter: Bihar institutes included via HS quota, non-Bihar institutes via OS quota
- Card shows: OPEN Neutral cutoff as reference anchor; your actual Female/PwD/category pool cutoff as "your pool cutoff"

---

## 8. What "dream" and "easy" Mean

- **easy**: `closing_rank >= your_rank` — last year's cutoff was higher (more relaxed) than your rank, meaning you would have gotten in
- **dream**: `closing_rank < your_rank` — last year's cutoff was stricter than your rank, meaning you would not have gotten in on past data, but the program is nearby

Both are based on the previous year's JoSAA data. Actual counselling cutoffs change each year.
