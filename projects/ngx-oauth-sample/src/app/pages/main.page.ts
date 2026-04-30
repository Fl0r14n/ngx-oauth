import { Component } from '@angular/core'
import { OAuthLoginComponent } from 'ngx-oauth/component'
import { OAuthType } from 'ngx-oauth'

@Component({
  selector: 'app-main-page',
  imports: [OAuthLoginComponent],
  template: `<div class="flex justify-end"><oauth-login [config]="config" /></div>`
})
export class MainPage {
  config = {
    responseType: OAuthType.AUTHORIZATION_CODE,
    redirectUri: `${globalThis.location?.origin}/oauth_callback`,
    logoutRedirectUri: `${globalThis.location?.origin}/`,
    state: crypto.randomUUID()
  }
}
