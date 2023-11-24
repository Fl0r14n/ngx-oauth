## Angular OAuth

> `Ngx-oauth` is a fully **OAuth 2.1** compliant angular library. The library supports all the 4 flows:
> * **resource**
> * **implicit**
> * **authorization code**
> * **client credentials**

> Supports OIDC

> `PKCE` support for authorization code with code verification

### How to

Provide a `OAuthConfig` using `provideOAuthConfig` or `provideOAuthConfigFactory`

Example:

```typescript
const oauthConfig = {
  config: {
    tokenPath: '/authorizationserver/oauth/token',
    revokePath: '/authorizationserver/oauth/revoke', // optional
    clientId: '<your_client_id>',
    clientSecret: '<your_client_secret>'
  },
  storage: localStorage, // Optional, default value is localStorage
  storageKey: 'token' // Optional, default value is 'token'
};


export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      withInterceptors([OAuthInterceptor])
    ),
    provideOAuthConfig(keycloakOpenIDConfig),
  ]
};
``` 

Example for **authorization code** flow with `OIDC` and `PKCE`
For public oauth clients `clientSecret` can be removed since is not used

```typescript
const oauthConfig = {
  config: {
    clientId: '<your_client_id>',
    clientSecret: '<your_client_secret>', //not used for public clients
    authorizePath: '/o/authorize/',
    tokenPath: '/o/token/',
    revokePath: '/o/revoke/',
    scope: 'openid email profile',
    pkce: true
  },
}
```

***Keycloak*** example for **oidc** with autodiscovery

```typescript
const keycloakOpenIDConfig = {
  config: {
    issuerPath: 'http://localhost:8080/realms/<some-realm>',
    clientId: '<your_client_id>',
  }
};
```

***Azure*** example

```typescript
const azureOpenIDConfig = {
  config: {
    issuerPath: 'https://login.microsoftonline.com/common/v2.0', // for common make sure you app has "signInAudience": "AzureADandPersonalMicrosoftAccount",
    clientId: '<your_client_id>',
    scope: 'openid profile email offline_access',
    pkce: true // manually, since is required, but code_challenge_methods_supported is not in openid configuration
  }
}
```

***Google*** example

```typescript
const googleOpenIDConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    issuerPath: 'https://accounts.google.com',
    clientId: '<your_client_id>',
    clientSecret: '<your_client_secret>',
    scope: 'openid profile email'
  }
}
```

You can use the `oauth-login` component

```html

<div class="login-component">
  <oauth-login></oauth-login>
</div>  
```

or with params

```typescript
@Component({
  selector: 'login-component',
  template: `
    <oauth-login [type]="type"
                 [i18n]="i18n"
                 [profileName$]="profileName$"
                 [useLogoutUrl]="useLogoutUrl"
                 [(state)]="state"></oauth-login>
  `
})
export class LoginComponent {
  i18n: OAuthLoginI18n = {
    username: 'Username'
  };
  state = 'some_salt_hash_or_whatever';
  // not only revoke tokens but also access the logout page if defined.
  // logoutPath needs to be defined. logoutRedirectUri is optional. Current url will be used if undefined
  useLogoutUrl = true;

  constructor(private oauthService: OAuthService) {
  }

  get profileName$(): Observable<string> {
    // ex: get profile name form oidc user_info endpoint or get it from some user service 
    return this.oauthService.userInfo$.pipe(
      map(v => `${v.name}&nbsp;${this.getPicture(v.picture)}`)
    );
  }

  // show profile picture if user info provides thumbnail url
  getPicture(picture?: string) {
    return picture && `<img class="rounded-circle img-thumbnail" src="${picture}">` || ''
  }
}
```

(`state`, `redirectUri`, `responseType` are optional in case of some advanced configuration)

or create your custom login template using OAuthService

```html

<div class="login-component">
  <oauth-login>
    <ng-template #login let-li="login" let-s="status" let-lo="logout">
      <form (submit)="li({username: username, password: password})">
        <ng-container *ngIf="s === OAuthStatus.AUTHORIZED; else loginTemplate">
          <h2>profileName</h2>
          <button (click)="lo()">Logout</button>
        </ng-container>
        <ng-template #loginTemplate>
          <div class="card">
            <div class="card-header text-center">
              <h2 class="m-0 p-3">
                <strong>Login</strong>
              </h2>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <input type="text" class="form-control" name="username" required [(ngModel)]="oauthService.username"
                       placeholder="username">
              </div>
              <div class="mb-3">
                <input type="password" class="form-control" name="password" required [(ngModel)]="oauthService.password"
                       placeholder="password">
              </div>
            </div>
            <div class="card-footer">
              <div class="text-center">
                <button type="submit" class="btn btn-primary">Submit</button>
              </div>
            </div>
          </div>
        </ng-template>
      </form>
    </ng-template>
  </oauth-login>
</div>

```

and import OAuthService in your login component constructor

## Installing:

```
npm install ngx-oauth --save
```

## App Requirements

* none

## Running the demo

* change proxy context in ```proxy.conf.js``` so that vite forwards your request to your oauth server (if relative paths in oauth configuration)
* in app.component.ts add your **clientId, secret**, oauth server **token endpoint** and user **profile endpoint**
* npm i
* npm run build:lib
* npm start

#### Licensing

[MIT License](LICENSE)
