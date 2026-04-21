# Data Processing (Offline)

Offline parsing scripts for JoSAA source text files.

This package converts:

- seat matrix `.txt` files to structured JSON
- cutoff `.txt` files to CSV used by the backend loader

It is not required at frontend runtime.

## Setup

```bash
bun install
```

## Common Commands

```bash
bun run parse:iits
bun run parse:nits
bun run parse:iiits
bun run parse:gftis
bun run parse:cutoffs:all
```

## Data Locations

- Inputs/outputs are under `data/`
- Common folders include `data/seat-matix/` and `data/cutoffs/`

## Integration notes

- The **Go backend** reads generated cutoff CSVs from `data/cutoffs/` (or `CUTOFFS_CSV_DIR`).
- The **Next.js app** does not read these files; it only talks to the HTTP API.
- Treat this package as an offline maintenance tool: ship the backend plus CSV artifacts, not necessarily this folder, in production.
