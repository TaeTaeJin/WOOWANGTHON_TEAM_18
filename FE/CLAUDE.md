# FE/CLAUDE.md

The root [`CLAUDE.md`](../CLAUDE.md) rules apply; this file adds the commands and pitfalls of `FE/`.

> **`archive` branch (fork only, not in upstream)**: a landing-only static page for the finished project. There is no login, no API call and no Supabase, so no `FE/.env` is needed. Every other route redirects to `/`. The app screens (auth, deploy, admin, profile) live on `upstream/main`; do not port this branch back.

## Commands

FE (run in `FE/`, Node 22 (22.22+), 24 or 26+, [pnpm](https://pnpm.io) — the version is pinned in `FE/package.json` `packageManager`; `corepack enable` picks it up, but Node 25+ no longer bundles corepack, so run `npm i -g corepack` first there):

| Task | Command |
| --- | --- |
| Install (CI-exact) | `pnpm install --frozen-lockfile` |
| Dev server | `pnpm dev` |
| Lint ([ESLint](https://eslint.org) — type-aware and a11y rules) | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Test ([Vitest](https://vitest.dev)) | `pnpm test` |
| Build | `pnpm build` |
| Verify (lint → test → build, stops at the first failure; `build` runs `tsc -b`, so typecheck is included; run before every commit) | `pnpm verify` |
| Container image (run from the repo root; local dev only, production is S3 + CloudFront) | `docker build -t fe FE` |

## Pitfalls

- **Vite dev on a WSL `/mnt/c` checkout can serve stale code.** File-change events do not arrive, so edits do not show up until the dev server is restarted. Restart it, or set `server.watch.usePolling`, before judging a change.
- **`pnpm verify` can fail with timeouts on a slow machine, even on untouched `upstream/main`.** Check that the same tests fail there, then run `pnpm exec vitest run --testTimeout=60000 --hookTimeout=60000` and say so in the PR. Run FE and BE one after the other; parallel runs time out vitest workers.
