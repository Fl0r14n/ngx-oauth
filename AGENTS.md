# Agent Instructions

## Projects

- `projects/ngx-oauth/` — the library (what gets published)
- `projects/ngx-oauth-sample/` — demo app (not published)

## Commands

| Command | Description |
|---|---|
| `npm run build:lib` | Build the library |
| `npm run build:app` | Build the demo app |
| `npm start` | Serve demo (SSL enabled, dev config) |
| `npm test` | Run library tests via jest |
| `npm run lint` | Lint both projects via angular-eslint |
| `npm run format` | Format via prettier (`projects/**/*.{ts,html,scss,css,json}`) |

## Test Setup

- Jest uses `jest-preset-angular` with zoneless setup (`projects/ngx-oauth/setup-jest.ts`)
- Only `projects/ngx-oauth/**/*.spec.ts` files are picked up
- zone.js is required for tests (loaded in `jest.config.ts` setupFilesAfterEnv)

## Key Config

- `angular.json` — defines both library and app build targets
- `jest.config.ts` — jest preset, test file patterns, and zone.js loading
- `tsconfig.json` — root TypeScript config
- `projects/ngx-oauth/tsconfig.lib.json` — library build config (excludes spec files, declares `types: []`)