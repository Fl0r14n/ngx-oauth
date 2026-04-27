## Angular OAuth

> `ngx-oauth` is a fully **OAuth 2.1** compliant Angular library. Supports the 4 flows:
> * **resource owner password**
> * **implicit**
> * **authorization code** (with optional **PKCE**)
> * **client credentials**

> OIDC (OpenID Connect) with autodiscovery and JWKS verification (via [`jose`](https://github.com/panva/jose)).

> Zoneless / signal-based. No `OAuthService`, no RxJS. Public API is a set of `InjectionToken`s exposing signals and async functions.

### Installing

```
npm install ngx-oauth
```

Peer deps: `@angular/common@^21`, `@angular/core@^21`, `jose@^6`.

### Configure

Provide an `OAuthConfig` via `provideOAuthConfig`.

```typescript
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'
import { provideOAuthConfig } from 'ngx-oauth'

const oauthConfig = {
  config: {
    tokenPath: '/oauth/token',
    revokePath: '/oauth/revoke',  // optional
    clientId: '<your_client_id>',
    clientSecret: '<your_client_secret>'
  },
  storageKey: 'token',           // optional, default 'token'
  ignorePaths: [/^\/public\//],  // optional, paths to skip Authorization header
  strictJwt: true                // optional, verify id_token via JWKS when jwksUri known
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideOAuthConfig(oauthConfig)
  ]
}
```

Authorization code + OIDC + PKCE (public client — no `clientSecret`):

```typescript
const oauthConfig = {
  config: {
    clientId: '<your_client_id>',
    authorizePath: '/o/authorize/',
    tokenPath: '/o/token/',
    revokePath: '/o/revoke/',
    scope: 'openid email profile',
    pkce: true
  }
}
```

***Keycloak*** with autodiscovery:

```typescript
const keycloakConfig = {
  config: {
    issuerPath: 'http://localhost:8080/realms/<some-realm>',
    clientId: '<your_client_id>'
  }
}
```

***Azure***:

```typescript
const azureConfig = {
  config: {
    issuerPath: 'https://login.microsoftonline.com/common/v2.0',
    clientId: '<your_client_id>',
    scope: 'openid profile email offline_access',
    pkce: true // required by Azure; not advertised in openid-configuration
  }
}
```

***Google*** (authorization code with refresh token):

```typescript
import { OAuthType } from 'ngx-oauth'

const googleConfig = {
  config: {
    issuerPath: 'https://accounts.google.com',
    clientId: '<your_client_id>',
    clientSecret: '<your_client_secret>',
    scope: 'openid profile email'
  }
}
```

### Login component

```html
<oauth-login />
```

With inputs:

```typescript
import { Component } from '@angular/core'
import { OAuthLoginComponent, OAuthLoginI18n } from 'ngx-oauth/component'
import { OAuthType } from 'ngx-oauth'

@Component({
  selector: 'login-component',
  imports: [OAuthLoginComponent],
  template: `
    <oauth-login
      [type]="type"
      [i18n]="i18n"
      [redirectUri]="redirectUri"
      [logoutRedirectUri]="logoutRedirectUri"
      [state]="state"
      (stateChange)="onState($event)" />
  `
})
export class LoginComponent {
  type = OAuthType.AUTHORIZATION_CODE
  redirectUri = `${location.origin}/oauth_callback`
  logoutRedirectUri = `${location.origin}/`
  state = crypto.randomUUID()
  i18n: OAuthLoginI18n = { username: 'Username' }
  onState(s?: string) { /* ... */ }
}
```

Inputs: `type`, `state`, `redirectUri`, `logoutRedirectUri`, `responseType`, `i18n`. Output: `stateChange`.

Custom template via `#login`:

```html
<oauth-login>
  <ng-template #login let-li="login" let-s="status" let-lo="logout">
    @if (s === 'AUTHORIZED') {
      <button (click)="lo()">Logout</button>
    } @else {
      <form (submit)="li({ username, password })">
        <input name="username" [(ngModel)]="username">
        <input name="password" type="password" [(ngModel)]="password">
        <button type="submit">Sign in</button>
      </form>
    }
  </ng-template>
</oauth-login>
```

### OAuth callback route

For redirect-based flows (authorization code / implicit), the IdP returns to a callback URL. Wire a route guard that calls `oauthCallback`:

```typescript
import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { OAUTH } from 'ngx-oauth'

export const oauthCallbackGuard: CanActivateFn = async (_route, state) => {
  const oauth = inject(OAUTH)
  const router = inject(Router)
  await oauth.oauthCallback(new URL(`app:${state.url}`).toString())
  return router.parseUrl('/')
}

export const routes = [
  { path: 'oauth_callback', canActivate: [oauthCallbackGuard], loadComponent: () => null as any },
  // ...
]
```

**SSR**: the callback route reads `window.location` (`hash`, `search`) and writes to `localStorage`, so it must render on the client. Mark it `RenderMode.Client` in `app.routes.server.ts`:

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr'

export const serverRoutes: ServerRoute[] = [
  { path: 'oauth_callback', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server }
]
```

### Programmatic API

Inject `OAUTH` for login/logout/callback and signal-based status:

```typescript
import { Component, inject } from '@angular/core'
import { OAUTH, OAuthStatus } from 'ngx-oauth'

@Component({ /* ... */ })
export class MyComponent {
  private oauth = inject(OAUTH)
  status = this.oauth.status        // Signal<OAuthStatus>
  token = this.oauth.token          // WritableSignal<OAuthToken>
  isAuthorized = this.oauth.isAuthorized

  login() { return this.oauth.login({ username: 'u', password: 'p' }) }
  logout() { return this.oauth.logout() }
}
```

User profile (resource — uses `id_token` claims, or fetches `userinfo_endpoint` for non-OIDC):

```typescript
import { OAUTH_USER } from 'ngx-oauth'

const user = inject(OAUTH_USER)
user.value()      // Signal<UserInfo | undefined>
user.isLoading()
```

Authenticated fetch (auto-attaches `Authorization` header, refreshes on expiry, single-flight):

```typescript
import { OAUTH_FETCH } from 'ngx-oauth'

const oauthFetch = inject(OAUTH_FETCH)
const res = await oauthFetch('/api/me')
```

Paths matching `ignorePaths` regex array bypass the header.

### Token refresh

A reactive `effect` watches the token and refreshes automatically when expired (if `refresh_token` is present and `tokenPath` is configured). The previous `refresh_token` is preserved when the IdP omits it in the refresh response. `OAUTH_FETCH` deduplicates concurrent refreshes (single-flight).

### Public API

| Token | Description |
|---|---|
| `provideOAuthConfig(cfg)` | Register configuration |
| `OAUTH` | login / logout / oauthCallback / token / status / state |
| `OAUTH_TOKEN` | token / status / accessToken / isAuthorized / error / autoconfigOauth |
| `OAUTH_FETCH` | `typeof fetch` with auto Authorization + refresh |
| `OAUTH_USER` | Angular `resource()` returning `UserInfo` |
| `OAUTH_VERIFY_JWT` | id_token verification (JWKS or decode) |
| `OAUTH_REFRESH`, `OAUTH_REVOKE`, `OAUTH_AUTHORIZE`, `OAUTH_RESOURCE_OWNER`, `OAUTH_CLIENT_CREDENTIAL`, `OAUTH_OPENID_CONFIG`, `OAUTH_USER_INFO`, `OAUTH_INTROSPECT` | Replaceable async functions |

All function tokens are overridable via DI to swap implementations or for testing.

### Running the demo

* configure your `clientId` / `clientSecret` and endpoints in `projects/ngx-oauth-sample/src/app/app.config.ts`
* `npm i`
* `npm run build:lib`
* `npm start`

### Licensing

[MIT License](LICENSE)
