import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {AppComponent} from './app.component';
import {OAuthType, OAuthModule} from 'ngx-oauth';
import {HttpClientModule} from '@angular/common/http';

const resourceConfig = {
  type: OAuthType.RESOURCE,
  config: {
    tokenPath: '/authorizationserver/oauth/token',
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

const clientCredentialConfig = {
  type: OAuthType.CLIENT_CREDENTIAL,
  config: {
    tokenPath: '/authorizationserver/oauth/token',
    clientId: 'mobile_android',
    clientSecret: 'secret',
  }
};

const authorizationCodeConfig = {
  type: OAuthType.AUTHORIZATION_CODE,
  config: {
    authorizePath: '/authorizationserver/oauth/authorize',
    clientId: 'mobile_android',
    tokenPath: '/authorizationserver/oauth/token',
    clientSecret: 'secret',
  }
};

@NgModule({
  imports: [
    BrowserModule,
    OAuthModule.forRoot(resourceConfig),
    HttpClientModule
  ],
  declarations: [
    AppComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
