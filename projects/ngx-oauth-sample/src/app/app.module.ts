import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {OauthImplicitComponent} from './components/implicit/oauth-implicit.component';
import {OAuthResourceComponent} from './components/resource/oauth-resource.component';
import {OauthAuthorizationCodeComponent} from './components/auth-code/oauth-authorization-code.component';
import {OauthClientCredentialsComponent} from './components/client-credentials/oauth-client-credentials.component';
import {OAuthFlows, OAuthModule} from 'ngx-oauth';
import {FormsModule} from '@angular/forms';

const resourceFlowConfig = {
  flowType: OAuthFlows.RESOURCE,
  flowConfig: {
    tokenPath: 'authorizationserver/oauth/token',
    clientSecret: 'secret',
    clientId: 'client-side'
  },
  storage: localStorage,
  storageKey: 'token'
};

const implicitFlowConfig = {
  flowType: OAuthFlows.IMPLICIT,
  flowConfig: {
    authorizePath: 'https://localhost:9002/authorizationserver/oauth/authorize',
    clientId: 'client-side'
  },
  storage: localStorage,
  storageKey: 'token'
};

const clientCredentialFlowConfig = {
  flowType: OAuthFlows.CLIENT_CREDENTIAL,
  flowConfig: {
    tokenPath: 'authorizationserver/oauth/token',
    clientId: 'client-side',
    clientSecret: 'secret',
  },
  storage: localStorage,
  storageKey: 'token'
};

const authCodeFlowConfig = {
  flowType: OAuthFlows.AUTHORIZATION_CODE,
  flowConfig: {
    authorizePath: 'https://localhost:9002/authorizationserver/oauth/authorize',
    clientId: 'client-side',
    tokenPath: 'authorizationserver/oauth/token',
    clientSecret: 'secret',
  },
  storage: localStorage,
  storageKey: 'token'
};

@NgModule({
  declarations: [
    AppComponent,
    OauthImplicitComponent,
    OAuthResourceComponent,
    OauthAuthorizationCodeComponent,
    OauthClientCredentialsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    OAuthModule.forRoot(resourceFlowConfig),
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
