import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {AppComponent} from './app.component';
import {OAuthType, OAuthModule} from 'ngx-oauth';
import {HttpClientModule} from '@angular/common/http';

const clientCredentialConfig = {
  type: OAuthType.CLIENT_CREDENTIAL,
  config: {
    tokenPath: '/authorizationserver/oauth/token',
    revokePath: '/authorizationserver/oauth/revoke',
    clientId: 'mobile_android',
    clientSecret: 'secret',
  }
};

const resourceConfig = {
  type: OAuthType.RESOURCE,
  config: {
    tokenPath: '/authorizationserver/oauth/token',
    revokePath: '/authorizationserver/oauth/revoke',
    clientSecret: 'secret',
    clientId: 'mobile_android'
  }
};

const implicitConfig = {
  type: OAuthType.IMPLICIT,
  config: {
    authorizePath: '/authorizationserver/oauth/authorize',
    clientId: 'client-side'
  }
};

const authorizationCodeConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    authorizePath: '/authorizationserver/oauth/authorize',
    revokePath: '/authorizationserver/oauth/revoke',
    clientId: 'mobile_android',
    tokenPath: '/authorizationserver/oauth/token',
    clientSecret: 'secret',
  }
};

const djangoAuthorizationCodeConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    clientId: 'client_application',
    clientSecret: 'client_secret',
    authorizePath: '/o/authorize/',
    tokenPath: '/o/token/',
    revokePath: '/o/revoke/'
  }
};

const djangoResourceConfig = {
  type: OAuthType.RESOURCE,
  config: {
    clientId: 'client_password',
    clientSecret: 'client_secret',
    tokenPath: '/o/token/',
    revokePath: '/o/revoke/'
  }
};

const djangoImplicitConfig = {
  type: OAuthType.IMPLICIT,
  config: {
    authorizePath: '/o/authorize/',
    clientId: 'client_implicit',
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
