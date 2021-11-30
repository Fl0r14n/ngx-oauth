import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {AppComponent} from './app.component';
import {OAuthType, OAuthModule} from 'ngx-oauth';
import {HttpClientModule} from '@angular/common/http';
import {PROFILE_SERVICE} from './service';
import {OpenidProfileService} from './service/openid-profile.service';

const hybrisConfig = {
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

const djangoConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    clientId: 'client_application',
    clientSecret: 'client_secret',
    authorizePath: '/o/authorize/',
    tokenPath: '/o/token/',
    revokePath: '/o/revoke/',
    scope: 'openid',
    pkce: true
  }
};

const keycloakOpenIDConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    issuerPath: 'http://localhost:8080/auth/realms/commerce',
    clientId: 'spartacus',
    // clientSecret: '02746877-9efd-4ff3-a39d-7b7685bb3190',
  }
};


@NgModule({
  imports: [
    BrowserModule.withServerTransition({appId: 'serverApp'}),
    OAuthModule.forRoot(keycloakOpenIDConfig),
    HttpClientModule
  ],
  providers: [
    {
      provide: PROFILE_SERVICE,
      useExisting: OpenidProfileService
    }
  ],
  declarations: [
    AppComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
