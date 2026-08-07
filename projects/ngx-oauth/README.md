# ngx-oauth

A fully OAuth 2.1 / OpenID Connect compliant library for Angular. Zoneless, signal-based, SSR-safe.

Supports Authorization Code + PKCE, Implicit, Resource Owner Password, and Client Credentials flows, with OpenID Connect
autodiscovery, JWT verification (`jose`), automatic token refresh, and an authenticated `fetch`.

## Requirements

- Angular 21+ (`@angular/core`, `@angular/common`, `@angular/forms`)
- `@angular/material` (only for the optional `<oauth-login>` component)
- `jose` >= 6 (JWT verification)

## Install

```bash
npm install ngx-oauth jose
```

## Configure

Register the config in your `ApplicationConfig` (or module) with `provideOAuthConfig`.

```typescript
import {ApplicationConfig, provideZonelessChangeDetection} from '@angular/core'
import {provideOAuthConfig} from 'ngx-oauth'

export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideOAuthConfig({
            config: {
                // OpenID Connect autodiscovery — endpoints resolved from issuerPath/.well-known
                issuerPath: 'https://your-idp.com/realms/realm',
                clientId: 'your-client-id',
                scope: 'openid profile email',
                pkce: true
            }
        })
    ]
}
```

Or configure endpoints manually instead of `issuerPath`:

```typescript
provideOAuthConfig({
    config: {
        authorizePath: 'https://your-idp.com/authorize',
        tokenPath: 'https://your-idp.com/token',
        revokePath: 'https://your-idp.com/revoke',
        userPath: 'https://your-idp.com/userinfo',
        clientId: 'your-client-id',
        scope: 'openid profile email',
        pkce: true
    }
})
```

### `OAuthConfig`

| Option        | Description                                                                                                                            |
|---------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `config`      | Flow config — one of `OpenIdConfig`, `AuthorizationCodePKCEConfig`, `ImplicitConfig`, `ResourceOwnerConfig`, `ClientCredentialConfig`. |
| `storageKey`  | `localStorage` key for the token. Default `'token'`. Accepts a `Signal<string>` for a reactive (e.g. per-site) key.                    |
| `ignorePaths` | `RegExp[]` — requests whose path matches are sent without an `Authorization` header by `OAUTH_FETCH`.                                  |
| `strictJwt`   | Verify `id_token` signature against the IdP JWKS. Default `true`.                                                                      |

> **Public clients (SPA):** use Authorization Code + PKCE (`pkce: true`) and do **not** set `clientSecret`. A secret in
> browser code is not confidential and buys no security.

## Usage

Inject the `OAUTH` token to drive the flow. All state is exposed as signals.

```typescript
import {Component, inject} from '@angular/core'
import {OAUTH, OAuthType} from 'ngx-oauth'

@Component({ /* ... */})
export class LoginComponent {
    private readonly oauth = inject(OAUTH)

    readonly status = this.oauth.status          // Signal<OAuthStatus>
    readonly isAuthorized = this.oauth.isAuthorized  // Signal<boolean>
    readonly token = this.oauth.token            // WritableSignal<OAuthToken>

    // Authorization Code / Implicit — redirects to the IdP
    login() {
        this.oauth.login({
            redirectUri: `${location.origin}/callback`,
            responseType: OAuthType.AUTHORIZATION_CODE // or OAuthType.IMPLICIT
        })
    }

    // Resource Owner Password
    loginPassword(username: string, password: string) {
        this.oauth.login({username, password})
    }

    // Client Credentials — no parameters
    loginClient() {
        this.oauth.login()
    }

    logout() {
        this.oauth.logout()
    }
}
```

### Handling the redirect callback

On your callback route, call `oauthCallback` to complete the Authorization Code (PKCE) or Implicit exchange:

```typescript
import {Component, inject} from '@angular/core'
import {OAUTH} from 'ngx-oauth'

@Component({template: ''})
export class CallbackComponent {
    constructor() {
        inject(OAUTH).oauthCallback() // reads window.location by default
    }
}
```

### Server-side rendering (SSR)

`oauthCallback`, `login`, and `logout` need browser APIs (`location`, `localStorage`) and finish with a redirect, so
they must run on the **client**, not during SSR. If a route guard runs them server-side and returns a redirect, the
server emits an HTTP 302 that navigates the browser away *before* it can complete the flow — the login silently fails.

**Preferred — render the callback route on the client.** When the route is statically addressable, set
`RenderMode.Client` in `app.routes.server.ts`; the server sends a shell and the browser performs the whole navigation
(running the guard once, on the client):

```typescript
import {RenderMode, ServerRoute} from '@angular/ssr'

export const serverRoutes: ServerRoute[] = [
    {path: 'oauth_callback', renderMode: RenderMode.Client},
    {path: '**', renderMode: RenderMode.Server}
]
```

**When the route can't be targeted** — e.g. it's nested under a dynamic prefix like `:tenant/:locale/oauth_callback`
that no static `ServerRoute` path matches (there is no matcher function, and `**` is a trailing-only catch-all) — defer
inside the guard instead. Return early on the server so the route renders without redirecting; the client re-runs the
guard on initial navigation and completes the exchange:

```typescript
import {inject, PLATFORM_ID} from '@angular/core'
import {isPlatformServer} from '@angular/common'
import {CanActivateFn} from '@angular/router'
import {OAUTH} from 'ngx-oauth'

export const oauthCallbackGuard: CanActivateFn = async () => {
    if (isPlatformServer(inject(PLATFORM_ID))) return true // defer — let the client do it
    await inject(OAUTH).oauthCallback()
    return true // …then redirect to your post-login target
}
```

Apply the same `isPlatformServer` guard to your `login`/`logout` routes for the same reason.

### `OAUTH` API

| Member                  | Type                         | Description                                                           |
|-------------------------|------------------------------|-----------------------------------------------------------------------|
| `login(params?)`        | `Promise<void>`              | Start a flow; params determine which (see above).                     |
| `logout(next?, state?)` | `Promise<void>`              | End session (RP-initiated logout if `logoutPath`, else token revoke). |
| `oauthCallback(url?)`   | `Promise<void>`              | Complete a redirect flow.                                             |
| `status`                | `Signal<OAuthStatus>`        | `NOT_AUTHORIZED` \| `AUTHORIZED` \| `DENIED`.                         |
| `isAuthorized`          | `Signal<boolean>`            |                                                                       |
| `token`                 | `WritableSignal<OAuthToken>` | Persisted token; auto-refreshed on expiry.                            |
| `type`                  | `Signal<OAuthType>`          | Active grant type.                                                    |
| `state`                 | `Signal<string>`             | `state` returned from the redirect.                                   |

## Authenticated fetch

`OAUTH_FETCH` is a drop-in `fetch` that attaches the bearer token, refreshes it when expired, and skips paths in
`ignorePaths`.

```typescript
import {inject} from '@angular/core'
import {OAUTH_FETCH} from 'ngx-oauth'

const fetch = inject(OAUTH_FETCH)
const res = await fetch('/api/resource')
```

## User info

`OAUTH_USER` is an Angular `resource` resolving the user profile — from the verified `id_token` when present, otherwise
from the `userinfo` endpoint.

```typescript
import {inject} from '@angular/core'
import {OAUTH_USER} from 'ngx-oauth'

const user = inject(OAUTH_USER) // resource<UserInfo | undefined>
// user.value(), user.isLoading(), ...
```

## Login component (optional)

A ready-made Material login/menu button lives in the `ngx-oauth/component` entry point.

```typescript
import {OAuthLoginComponent, OAuthLoginConfig} from 'ngx-oauth/component'

@Component({
    imports: [OAuthLoginComponent],
    template: `<oauth-login [config]="config" [i18n]="i18n" />`
})
export class HeaderComponent {
    // annotate with OAuthLoginConfig — an unannotated literal widens accessType/prompt to string
    config: OAuthLoginConfig = {
        responseType: OAuthType.AUTHORIZATION_CODE,
        redirectUri: `${location.origin}/oauth_callback`,
        logoutRedirectUri: `${location.origin}/`,
        accessType: 'offline', // optional, only sent when set
        prompt: 'consent' // optional empty if accessType defined but no prompt type specified
    }
}
```

`config` accepts `OAuthLoginConfig` — the `ResourceOwnerParameters` (`username`, `password`) and
`AuthorizationCodeParameters` (`redirectUri`, `responseType`, `state`, `accessType`, `prompt`) fields, plus
`logoutRedirectUri`. Labels are customizable via the `i18n` input (`OAuthLoginI18n`).

## License

[MIT](LICENSE)
