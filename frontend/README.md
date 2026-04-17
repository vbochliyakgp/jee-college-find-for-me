# Frontend (Next.js)

Next.js App Router frontend for entering rank details and viewing prediction results.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Bun as package manager/runtime for scripts

## Local Development

```bash
bun install
bun run dev
```

Useful scripts:

```bash
bun run build
bun run start
bun run lint
```

Default app URL: `http://localhost:3000`

## Backend Connection

This app calls the Go predictor backend. Configure base URL when needed:

```bash
NEXT_PUBLIC_GO_PREDICTOR_API_BASE_URL=http://127.0.0.1:8080
```

## Feature Coverage (Current)

- Home form for exam, rank, gender, home state, and category inputs
- Results page with shortlist cards and category mode tabs
- Mobile-friendly responsive UI

## Not Supported Yet

- PwD flow in UI and prediction journey
- B.Arch and B.Planning focused flows

## Data Notes

- Raw scraped files and parsers are maintained in `../data-processing/`.
- This frontend does not run those parsers at build/runtime.
