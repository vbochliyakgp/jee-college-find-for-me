# Frontend (Next.js)

Next.js App Router frontend for entering rank details and viewing prediction results.

> Setup and run instructions are documented in the root `README.md`.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Bun as package manager/runtime for scripts

## Scripts (Reference)

- `bun run dev`
- `bun run build`
- `bun run start`
- `bun run lint`

## Backend Connection

This app calls the Go predictor backend. By default it uses same-origin `/api`
(works with Docker Compose + Caddy).

Configure base URL when needed:

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
