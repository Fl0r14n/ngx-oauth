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
    logoutRedirectUri: 'http://google.com'
  }
};

const azureOpenIDConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    issuerPath: 'https://login.microsoftonline.com/common/v2.0', // for common make sure you app has "signInAudience": "AzureADandPersonalMicrosoftAccount",
    clientId: 'clientId',
    scope: 'openid profile email offline_access',
    pkce: true // manually since is required but code_challenge_methods_supported is not in openid configuration
  }
}

const googleOpenIDConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    issuerPath: 'https://accounts.google.com',
    clientId: 'clientId',
    clientSecret: 'clientSecret',
    scope: 'openid profile email'
  }
}


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
