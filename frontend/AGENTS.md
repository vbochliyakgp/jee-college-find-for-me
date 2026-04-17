# Agent notes — `new/` web app

## Package manager

Use **Bun** for this project, not npm or pnpm.

```bash
cd new
bun install
bun run dev
bun run build
```

Do not add `npm install` / `npm run` instructions for this package unless the user explicitly asks for npm.

## What this app is

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind CSS v4**.
- **Client-only demo**: no login, payments, admin, database, or API routes. The college predictor loads **bundled JSON** (`lib/data/cutoffs-demo.json`).
- **Production-oriented structure**: layout components under `components/layout/`, predictor UI under `components/predict/`, shared UI under `components/ui/` (shadcn-style).

## Regenerating demo cutoff data

Source CSV lives under `data-processing/data/cutoffs/`. Regenerate JSON with:

```bash
node new/scripts/build-cutoffs-demo.mjs
```

Optional npm script: `bun run build:data` (see `package.json`).

## Dependency policy

- Prefer **current stable** versions when adding packages (`bun add <pkg>`).
- **ESLint**: `eslint-config-next` is not compatible with ESLint 10 yet — keep **ESLint 9.x** until Next’s flat-config story catches up.
- A few libraries are **pinned** because the copied shadcn components target older APIs:
  - `react-day-picker@8` — Calendar component
  - `recharts@2` — Chart component
  - `react-resizable-panels@2` — Resizable component  
  If you upgrade these, update the matching `components/ui/*` files or expect type/runtime breakage.

## Next.js specifics

Per upstream guidance: this repo may use Next 16 conventions that differ from older docs. Prefer project-local patterns and compiler errors over assumptions from training data.

## Styling

- Global tokens and shadcn mapping live in `app/globals.css` (`@import "tailwindcss"`, `@plugin "tailwindcss-animate"`, `@theme inline`).
- Favor clear typography and spacing over cloning the legacy `/old` site pixel-perfectly; match branding only when it does not hurt UX.
