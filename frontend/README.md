# JEE College Find (new)

Next.js **App Router** app with **TypeScript**, **Tailwind CSS v4**, and **Bun** as the package manager.

## Scripts

```bash
bun install
bun run dev    # Next.js dev server with Turbopack
bun run build
bun run start
bun run lint
```

Scraped JoSAA **text → JSON/CSV** is a separate offline tool: see **`../data-processing/`** (not part of the production Next.js app).

## Bun and Vite

- **Bun** is used to install dependencies and run scripts (`bun.lock` in this folder).
- **Vite** is not part of the Next.js stack: Next.js bundles with **Turbopack** (dev) and its own production compiler. This repo uses `next dev --turbopack` for fast refresh—similar goals to Vite, but native to Next.
- If you need a **Vite + React** SPA (no Next.js), create it separately, e.g. `bun create vite` in another directory.

## Data

Raw seat matrices and cutoff exports live in **`../data-processing/data/`**. Copy built assets into `public/` or an API when the app needs them.

## Legacy app

The previous full app lives in `../old/`.
