import { Component, inject } from '@angular/core'
import { OAUTH, OAuthType } from 'ngx-oauth'
import { OAuthLoginComponent } from 'ngx-oauth/component'
import { PROFILE_SERVICE } from './service'

@Component({
  selector: 'app-root',
  imports: [OAuthLoginComponent],
  template: `
    <header class="border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a class="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <path d="M12 2L3 7l9 5 9-5-9-5z" />
              <path d="M3 17l9 5 9-5" />
              <path d="M3 12l9 5 9-5" />
            </svg>
          </span>
          OAuth Demo
        </a>
        <oauth-login
          [type]="type"
          [profileName]="profile.profileName()"
          [i18n]="i18n"
          [logoutRedirectUri]="logoutRedirectUri"
          [state]="state" />
      </nav>
      <div class="border-t border-indigo-100 bg-indigo-50/70">
        <div class="mx-auto max-w-6xl px-6 py-3 text-center text-sm font-medium text-indigo-900">
          status: <span class="ml-1 rounded-md bg-white/60 px-2 py-0.5 font-mono text-indigo-700 ring-1 ring-indigo-200">{{ oauth.status() }}</span>
        </div>
      </div>
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
