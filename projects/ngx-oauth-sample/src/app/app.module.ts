import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {AppComponent} from './app.component';
import {OAuthFlows, OAuthModule} from 'ngx-oauth';
import {FormsModule} from '@angular/forms';
import {RouterModule} from '@angular/router';

const resourceFlowConfig = {
  flowType: OAuthFlows.RESOURCE,
  flowConfig: {
    tokenPath: '/authorizationserver/oauth/token',
    clientSecret: 'secret',
    clientId: 'mobile_android'
  }
};

const implicitFlowConfig = {
  flowType: OAuthFlows.IMPLICIT,
  flowConfig: {
    authorizePath: '/authorizationserver/oauth/authorize',
    clientId: 'client-side'
  }
};

const clientCredentialFlowConfig = {
  flowType: OAuthFlows.CLIENT_CREDENTIAL,
  flowConfig: {
    tokenPath: '/authorizationserver/oauth/token',
    clientId: 'mobile_android',
    clientSecret: 'secret',
  }
};

const authCodeFlowConfig = {
  flowType: OAuthFlows.AUTHORIZATION_CODE,
  flowConfig: {
    authorizePath: '/authorizationserver/oauth/authorize',
    clientId: 'mobile_android',
    tokenPath: '/authorizationserver/oauth/token',
    clientSecret: 'secret',
  }
};

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    OAuthModule.forRoot(resourceFlowConfig),
    RouterModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
