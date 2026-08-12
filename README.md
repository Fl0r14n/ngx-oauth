# ngx-oauth

OAuth 2.1 library for Angular 22. Zoneless, signal-based.

## Projects

- `projects/ngx-oauth/` — the library
- `projects/ngx-oauth-sample/` — demo app

## Commands

| Command | Description |
|---|---|
| `npm run build:lib` | Build the library |
| `npm run build:app` | Build the demo app |
| `npm start` | Serve demo (`https://localhost:3000`, SSL enabled) |
| `npm test` | Run library tests (Vitest) |
| `npm run lint` | Lint both projects |
| `npm run format` | Format code |

## Configure the demo

Edit `projects/ngx-oauth-sample/src/app/app.config.ts`:

```typescript
const oauthConfig = {
  config: {
    // autodiscovery
    issuerPath: 'https://your-idp.com/realms/realm',
    clientId: 'your-client-id',

    // or manual endpoints
    // authorizePath: '/authorize',
    // tokenPath: '/token',
    // clientId: 'your-client-id',

    scope: 'openid profile email',
    pkce: true
  }
}
```

## Library Usage

See [ngx-oauth/README.md](projects/ngx-oauth/README.md) for the full library documentation.

## Publishing

**Publishing a GitHub release publishes to npm.** That is the whole flow — the release event runs
[`.github/workflows/publish.yml`](.github/workflows/publish.yml), which lints, builds the library, tests it
and then publishes `ngx-oauth`.

```sh
# 1. bump the version in projects/ngx-oauth/package.json — that is the manifest ng-packagr
#    emits into dist/ngx-oauth and the one npm publishes. The root package.json has its own
#    unrelated version; npm never sees it.
# 2. commit and tag
git commit -am 'release 8.3.0'
git tag v8.3.0
git push --follow-tags
# 3. publish the release — this is the step that triggers npm
gh release create v8.3.0 --generate-notes
```

Watch it and confirm the result:

```sh
gh run watch "$(gh run list --workflow publish.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
npm view ngx-oauth version
```

The workflow publishes from `dist/ngx-oauth`, not from `projects/ngx-oauth` — the source directory holds no
bundles, and its `package.json` is the manifest ng-packagr rewrites on the way out.

No npm token is involved. It authenticates with [trusted
publishing](https://docs.npmjs.com/trusted-publishers/), exchanging GitHub's OIDC token for publish rights,
which also attaches [provenance](https://docs.npmjs.com/generating-provenance-statements) to the published
version. That takes one registration per package, already done for this one:

```sh
npm trust github ngx-oauth --file publish.yml --repo Fl0r14n/ngx-oauth --allow-publish
```

To publish from a workstation instead, `npm run build:lib && npm publish ./dist/ngx-oauth` — but prefer the
release: a local publish prompts for a 2FA code and produces no provenance.

## License

[MIT](LICENSE)