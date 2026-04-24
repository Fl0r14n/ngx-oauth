import { Component, inject } from '@angular/core'
import { OAUTH, OAuthType } from 'ngx-oauth'
import { OAuthLoginComponent } from 'ngx-oauth/component'
import { PROFILE_SERVICE } from './service'

@Component({
  selector: 'app-root',
  imports: [OAuthLoginComponent],
  template: `
    <header>
      <nav class="navbar navbar-light bg-light container-fluid px-3">
        <a class="navbar-brand">OAuth Demo</a>
        <ul class="nav">
          <li class="nav-item">
            <oauth-login
              [type]="type"
              [profileName]="profile.profileName()"
              [i18n]="i18n"
              [logoutRedirectUri]="logoutRedirectUri"
              [state]="state" />
          </li>
        </ul>
      </nav>
      <div class="alert alert-info text-center font-weight-bold">{{ oauth.status() }}</div>
    </header>
  `
})
export class AppComponent {
  protected readonly oauth = inject(OAUTH)
  protected readonly profile = inject(PROFILE_SERVICE)

  protected readonly type = OAuthType.AUTHORIZATION_CODE
  protected readonly logoutRedirectUri = 'https://localhost:4200'
  protected readonly state = 'some_salt_dummy_state'
  protected readonly i18n = { username: 'Username' }
}
