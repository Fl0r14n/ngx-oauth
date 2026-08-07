# Agent Instructions

## Projects

- `projects/ngx-oauth/` — the library (what gets published)
- `projects/ngx-oauth-sample/` — demo app (not published)

## Package Manager

Use **bun**. `bun.lock` is the lockfile in use — do not run `npm install`/`yarn` (it creates a competing `package-lock.json`). Both lockfiles are gitignored.

- Install: `bun install`
- Add dep: `bun add <pkg>` / `bun add -d <pkg>`
- Run a script: `bun run <script>` — **not** `bun test`, which invokes bun's own test runner instead of the `test` script

## Commands

| Command | Description |
|---|---|
| `bun run build:lib` | Build the library |
| `bun run build:app` | Build the demo app |
| `bun run build` | Build both (lib then app) |
| `bun start` | Serve demo (SSL enabled, dev config) |
| `bun run test` | Run library tests via `@angular/build:unit-test` (Vitest) |
| `bun run lint` | Lint both projects via angular-eslint |
| `bun run format` | Format via prettier (`projects/**/*.{ts,html,scss,css,json}`) |
| `bun run serve:ssr` | Serve the built SSR app (`dist/ngx-oauth-sample/server/server.mjs`) |

## Test Setup

- `@angular/build:unit-test` with Vitest runner (config in `angular.json` under `ngx-oauth.architect.test`)
- Zoneless: providers registered via `projects/ngx-oauth/test-providers.ts` (`provideZonelessChangeDetection()`)
- `include`: `**/*.spec.ts` relative to `projects/ngx-oauth`
- Default env is jsdom (node). App is zoneless — zone.js NOT used at runtime or test time.
- `buildTarget` points at `ngx-oauth-sample:build:development` (ng-packagr builder is not a valid unit-test buildTarget; sample app supplies the compile pipeline).

## SSR

- OAuth callback route (`RenderMode.Client`) must render on the client — reads `window.location` (hash, search) and writes to `localStorage`.
- Configure in `app.routes.server.ts`: `{ path: 'oauth_callback', renderMode: RenderMode.Client }`

## Key Config

- `angular.json` — library + app build targets, library test target
- `tsconfig.json` — root TypeScript config
- `projects/ngx-oauth/tsconfig.spec.json` — spec tsconfig (`types: ["vitest/globals", "node"]`)
- `projects/ngx-oauth/tsconfig.lib.json` — library build config (excludes spec files, declares `types: []`)

## Dependency Constraints

- `typescript` must stay in `>=6.0 <6.1` — the peer range of `@angular/compiler-cli` 22.x. Do not bump to TS 7 until Angular widens it.
- Version to publish lives in `projects/ngx-oauth/package.json`. Root `package.json` is `private` and its version is unused.