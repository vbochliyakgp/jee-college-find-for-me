# Data processing (offline)

JoSAA **seat matrix** `.txt` → JSON and **cutoff** `.txt` → CSV. Run only when you refresh scraped files; the **Next.js app** in `../new` does not depend on this package at build or runtime.

## Usage

```bash
cd data-processing
bun run parse:iits
bun run parse:nits
bun run parse:iiits
bun run parse:gftis
bun run parse:cutoffs:all
```

Inputs and outputs live under `data/` (e.g. `data/seat-matix/`, `data/cutoffs/`).

To ship processed data in the web app later, copy the generated JSON/CSV into `new/public/` or load from your API—keep this folder out of production deploys if you only need the site.
