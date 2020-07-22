import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {AppComponent} from './app.component';
import {OAuthFlows, OAuthModule} from 'ngx-oauth';
import {FormsModule} from '@angular/forms';
import {RouterModule} from '@angular/router';

const resourceFlowConfig = {
  flowType: OAuthFlows.RESOURCE,
  flowConfig: {
    tokenPath: 'https://localhost:9002/authorizationserver/oauth/token',
    clientSecret: 'secret',
    clientId: 'client-side'
  }
};

const implicitFlowConfig = {
  flowType: OAuthFlows.IMPLICIT,
  flowConfig: {
    authorizePath: 'https://localhost:9002/authorizationserver/oauth/authorize',
    clientId: 'client-side'
  }
};

const clientCredentialFlowConfig = {
  flowType: OAuthFlows.CLIENT_CREDENTIAL,
  flowConfig: {
    tokenPath: 'https://localhost:9002/authorizationserver/oauth/token',
    clientId: 'client-side',
    clientSecret: 'secret',
  }
};

const authCodeFlowConfig = {
  flowType: OAuthFlows.AUTHORIZATION_CODE,
  flowConfig: {
    authorizePath: 'https://localhost:9002/authorizationserver/oauth/authorize',
    clientId: 'client-side',
    tokenPath: 'https://localhost:9002/authorizationserver/oauth/token',
    clientSecret: 'secret',
  }
};

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    OAuthModule.forRoot(authCodeFlowConfig),
    RouterModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
