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
    scope: 'openid'
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
    clientId: 'client_password',
    clientSecret: '92fff2b1-6a68-40af-aa31-4c850237c5b3',
    tokenPath: '/auth/realms/oauth-server.test/protocol/openid-connect/token',
    revokePath: '/auth/realms/oauth-server.test/protocol/openid-connect/revoke',
    scope: 'openid'
  }
};

const keycloakApplicationConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    clientId: 'client_application',
    clientSecret: '3c18e4d1-bb2a-44a2-8ca2-777e64dd8d5b',
    authorizePath: 'http://localhost:8080/auth/realms/oauth-server.test/protocol/openid-connect/auth',
    tokenPath: 'http://localhost:8080/auth/realms/oauth-server.test/protocol/openid-connect/token',
    revokePath: 'http://localhost:8080/auth/realms/oauth-server.test/protocol/openid-connect/revoke',
    scope: 'openid email profile'
  }
};

@NgModule({
  imports: [
    BrowserModule.withServerTransition({appId: 'serverApp'}),
    OAuthModule.forRoot(djangoAuthorizationCodeConfig),
    HttpClientModule
  ],
  declarations: [
    AppComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
