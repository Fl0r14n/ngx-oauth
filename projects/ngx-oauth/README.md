# ngx-oauth

OAuth 2.1 library for Angular 21. Zoneless, signal-based.

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

## License

[MIT](LICENSE)