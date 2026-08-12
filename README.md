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

Publishing a GitHub release publishes to npm — the release event runs
[`.github/workflows/publish.yml`](.github/workflows/publish.yml), which lints, builds the library, tests it
and publishes `ngx-oauth` from `dist/ngx-oauth`. No token needed.

```sh
# bump the version in projects/ngx-oauth/package.json first — the root one is unrelated
git commit -am 'release 8.3.0'
git tag v8.3.0
git push --follow-tags
gh release create v8.3.0 --generate-notes
```

Then watch it land:

```sh
gh run watch "$(gh run list --workflow publish.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
npm view ngx-oauth version
```

## License

[MIT](LICENSE)