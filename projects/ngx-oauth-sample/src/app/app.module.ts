import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {AppComponent} from './app.component';
import {OAuthType, OAuthModule} from 'ngx-oauth';
import {HttpClientModule} from '@angular/common/http';

const hybrisCredentialConfig = {
  type: OAuthType.CLIENT_CREDENTIAL,
  config: {
    tokenPath: '/authorizationserver/oauth/token',
    revokePath: '/authorizationserver/oauth/revoke',
    clientId: 'mobile_android',
    clientSecret: 'secret',
  }
};

const hybrisResourceConfig = {
  type: OAuthType.RESOURCE,
  config: {
    tokenPath: '/authorizationserver/oauth/token',
    revokePath: '/authorizationserver/oauth/revoke',
    clientSecret: 'secret',
    clientId: 'mobile_android'
  }
};

const hybrisImplicitConfig = {
  type: OAuthType.IMPLICIT,
  config: {
    authorizePath: '/authorizationserver/oauth/authorize',
    clientId: 'client-side'
  }
};

const hybrisAuthorizationCodeConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    authorizePath: '/authorizationserver/oauth/authorize',
    revokePath: '/authorizationserver/oauth/revoke',
    clientId: 'mobile_android',
    tokenPath: '/authorizationserver/oauth/token',
    clientSecret: 'secret',
    scope: 'basic'
  }
};

const djangoAuthorizationCodeConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    clientId: 'client_application',
    clientSecret: 'client_secret',
    authorizePath: '/o/authorize/',
    tokenPath: '/o/token/',
    revokePath: '/o/revoke/',
    scope: 'openid',
    codeVerifier: 'M00AeaRfwOkpwQp8SK-8K-hHvPYu6OKgj1aCUOb6eSMcSZr2'
  }
};

const djangoResourceConfig = {
  type: OAuthType.RESOURCE,
  config: {
    clientId: 'client_password',
    clientSecret: 'client_secret',
    tokenPath: '/o/token/',
    revokePath: '/o/revoke/',
  }
};

const djangoImplicitConfig = {
  type: OAuthType.IMPLICIT,
  config: {
    authorizePath: '/o/authorize/',
    clientId: 'client_implicit',
  }
};

const keycloakCredentialConfig = {
  type: OAuthType.CLIENT_CREDENTIAL,
  config: {
    tokenPath: '/auth/realms/oauth-server.test/protocol/openid-connect/token',
    revokePath: '/auth/realms/oauth-server.test/protocol/openid-connect/revoke',
    clientId: 'client_introspect',
    clientSecret: 'be8dde74-8656-49b6-b446-818be69fa7c5',
  }
};

const keycloakResourceConfig = {
  type: OAuthType.RESOURCE,
  config: {
    clientId: 'spartacus',
    clientSecret: '02746877-9efd-4ff3-a39d-7b7685bb3190',
    tokenPath: '/auth/realms/commerce/protocol/openid-connect/token',
    revokePath: '/auth/realms/commerce/protocol/openid-connect/revoke',
    scope: 'openid email profile'
  }
};

const keycloakApplicationConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    clientId: 'spartacus',
    clientSecret: '02746877-9efd-4ff3-a39d-7b7685bb3190',
    authorizePath: 'http://localhost:8080/auth/realms/commerce/protocol/openid-connect/auth',
    tokenPath: 'http://localhost:8080/auth/realms/commerce/protocol/openid-connect/token',
    revokePath: 'http://localhost:8080/auth/realms/commerce/protocol/openid-connect/revoke',
    scope: 'openid email profile'
  }
};

const keycloakApplicationPKCEConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    clientId: 'spartacus',
    authorizePath: 'http://localhost:8080/auth/realms/commerce/protocol/openid-connect/auth',
    tokenPath: 'http://localhost:8080/auth/realms/commerce/protocol/openid-connect/token',
    revokePath: 'http://localhost:8080/auth/realms/commerce/protocol/openid-connect/revoke',
    scope: 'openid email profile',
    pkce: true
  }
};

@NgModule({
  imports: [
    BrowserModule.withServerTransition({appId: 'serverApp'}),
    OAuthModule.forRoot(keycloakApplicationPKCEConfig),
    HttpClientModule
  ],
  declarations: [
    AppComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
