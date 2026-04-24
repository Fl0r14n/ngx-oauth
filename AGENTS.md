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
| `npm test` | Run library tests via `@angular/build:unit-test` (Vitest) |
| `npm run lint` | Lint both projects via angular-eslint |
| `npm run format` | Format via prettier (`projects/**/*.{ts,html,scss,css,json}`) |

## Test Setup

- `@angular/build:unit-test` with Vitest runner (config in `angular.json` under `ngx-oauth.architect.test`)
- Zoneless: providers registered via `projects/ngx-oauth/test-providers.ts` (`provideZonelessChangeDetection()`)
- `include`: `**/*.spec.ts` relative to `projects/ngx-oauth`
- Default env is jsdom (node). App is zoneless — zone.js NOT used at runtime or test time.
- `buildTarget` points at `ngx-oauth-sample:build:development` (ng-packagr builder is not a valid unit-test buildTarget; sample app supplies the compile pipeline).

## Key Config

- `angular.json` — library + app build targets, library test target
- `tsconfig.json` — root TypeScript config
- `projects/ngx-oauth/tsconfig.spec.json` — spec tsconfig (`types: ["vitest/globals", "node"]`)
- `projects/ngx-oauth/tsconfig.lib.json` — library build config (excludes spec files, declares `types: []`)