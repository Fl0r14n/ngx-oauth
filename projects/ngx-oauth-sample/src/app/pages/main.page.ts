import { Component } from '@angular/core'
import { OAuthLoginComponent } from 'ngx-oauth/component'
import { OAuthType } from 'ngx-oauth'

@Component({
  selector: 'app-main-page',
  imports: [OAuthLoginComponent],
  template: ` <oauth-login [type]="type" [redirectUri]="redirectUri" [logoutRedirectUri]="logoutRedirectUri" [state]="state" /> `
})
export class MainPage {
  type = OAuthType.AUTHORIZATION_CODE
  redirectUri = `${globalThis.location?.origin}/oauth_callback`
  logoutRedirectUri = `${globalThis.location?.origin}/`
  state = crypto.randomUUID()
}
