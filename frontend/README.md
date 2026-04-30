# Frontend (Next.js)

Next.js **App Router** UI for the **cutoff query** flow: home form → **`/results?q=…`** (shareable, re-fetches from encoded query).

**Search Mode**: Supports both **JoSAA** (Category Ranks) and **CSAB** (CRL Ranks) counseling modes.

**State Persistence**: Search criteria are automatically saved to `sessionStorage`, preserving the form state during back-navigation or page refreshes.

Monorepo run instructions: root **`../README.md`**.

## Stack

- Next.js 16+, React 19, TypeScript, Tailwind CSS v4
- **Bun** for install/scripts (`packageManager` in `package.json`)

## Scripts

- `bun run dev` — dev server (Turbopack)
- `bun run build` — production build
- `bun run start` — serve production build
- `bun run lint` — ESLint

## API base URL

Client code posts to **`{base}/api/cutoffs/query`** (`lib/advanced-query/api.ts`).

Resolution order:

1. `NEXT_PUBLIC_BACKEND_API_URL`
2. **Browser**: empty string → same origin (typical with Docker + Caddy)
3. **Server** (SSR): internal default for compose (`http://backend:8080`)

Example local `.env.local` when frontend and API run on different ports:

```bash
NEXT_PUBLIC_BACKEND_API_URL=http://127.0.0.1:8080
```

## App structure (high level)

| Area | Path |
|------|------|
| Home search | `app/page.tsx`, `components/cutoff-search/` |
| Results | `app/results/page.tsx`, `components/cutoff-results/` |
| Query state | `components/advanced-query/advanced-query-context.tsx` (includes persistence logic) |
| Types + payload builder | `lib/advanced-query/types.ts`, `build-payload.ts` |
| Share link codec | `lib/advanced-query/query-url.ts` |
| Layout / chrome | `components/layout/`, `components/providers/` |
| shadcn-style UI | `components/ui/` |

## Not modeled

- B.Arch / B.Planning–specific UX
- Official JoSAA choice filling or eligibility

Raw parsers live in **`../data-processing/`**; the web app does not run them at build time.
