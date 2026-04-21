# Agent notes — `frontend/`

## Package manager

Use **Bun** (`bun install`, `bun run dev`, `bun run build`). Do not switch this package to npm/pnpm unless the user asks.

## What this app is

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind CSS v4**.
- **No auth, no payments, no DB in the browser.** Results come from the Go backend **`POST /api/cutoffs/query`**.
- **Primary UX**: cutoff search form on `/`, tabbed result tables on **`/results?q=<base64url JSON>`** (encoded `AdvancedCutoffQueryV1`). The `q` param is required for refresh/share; in-session navigation from home sets it on success.

## Layout

- **`components/layout/`** — site header/footer.
- **`components/cutoff-search/`** — home form (exam, gender, category, PwD, home state, institute types, rank bands).
- **`components/cutoff-results/`** — results page (hydrates from `q` when needed).
- **`components/advanced-query/`** — React context for form state, submit, URL re-query helpers.
- **`components/providers/`** — e.g. `AppProviders` wrapping `AdvancedQueryProvider`.
- **`components/ui/`** — shadcn-style primitives.

There is **no** `components/predict/` in this stack; ignore old docs that reference it.

## API wiring

- **`lib/advanced-query/api.ts`** — `postCutoffQuery`, base URL from `NEXT_PUBLIC_BACKEND_API_URL`.
- **`lib/advanced-query/types.ts`** — request/response TypeScript contracts (mirror `internal/cutoffquery` JSON).

## Data

- Cutoffs live in the **Go process** (SQLite loaded from CSV). The frontend does not bundle cutoff JSON.

## Dependency / tooling notes

- Prefer **current stable** versions when adding packages (`bun add <pkg>`).
- **ESLint**: keep versions aligned with `eslint-config-next` (see `package.json`).
- Per Next 16: prefer project-local patterns and compiler errors over older generic Next docs.

## Styling

- Tokens and Tailwind v4 entry: `app/globals.css`.
- Reuse existing spacing/typography patterns from `cutoff-search` / results before inventing new layout systems.
