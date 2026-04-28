import {
  Component,
  computed,
  contentChild,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation
} from '@angular/core'
import { CommonModule, isPlatformBrowser, Location as Location2 } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatListModule } from '@angular/material/list'
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu'
import { AuthorizationCodeParameters, OAUTH, OAUTH_USER, OAuthParameters, OAuthStatus, ResourceOwnerParameters } from 'ngx-oauth'

export type OAuthLoginConfig = Partial<ResourceOwnerParameters & AuthorizationCodeParameters & { logoutRedirectUri: string }>

export type OAuthLoginI18n = {
  username?: string
  password?: string
  submit?: string
  logout?: string
  notAuthorized?: string
  authorized?: string
  denied?: string
  dismiss?: string
  showPassword?: string
  hidePassword?: string
}

const defaultI18n: Required<OAuthLoginI18n> = {
  username: 'Username',
  password: 'Password',
  submit: 'Sign in',
  logout: 'Sign out',
  notAuthorized: 'Sign in',
  authorized: 'Welcome',
  denied: 'Access denied. Try again.',
  dismiss: 'Dismiss',
  showPassword: 'Show password',
  hidePassword: 'Hide password'
}

@Component({
  selector: 'oauth-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatListModule, MatMenuModule],
  template: `
    @if (isBrowser) {
      @if (loginTemplate(); as tpl) {
        <ng-container
          [ngTemplateOutlet]="tpl"
          [ngTemplateOutletContext]="{ login: loginFunction, logout: logoutFunction, status: status() }" />
      } @else if (status(); as s) {
        @if (s === OAuthStatus.NOT_AUTHORIZED && isAuthCode()) {
          <button mat-icon-button type="button" [attr.aria-label]="i18n().notAuthorized" (click)="login(authCodeParams())">
            <mat-icon [fontSet]="'material-icons-outlined'">account_circle</mat-icon>
          </button>
        } @else {
          <button
            mat-icon-button
            type="button"
            [matMenuTriggerFor]="menu"
            [attr.aria-label]="s === OAuthStatus.AUTHORIZED ? i18n().authorized : i18n().notAuthorized">
            <mat-icon [fontSet]="s === OAuthStatus.AUTHORIZED ? 'material-icons' : 'material-icons-outlined'">account_circle</mat-icon>
          </button>
          <mat-menu #menu="matMenu" xPosition="after">
            <div (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" class="oauth-login-content">
              @if (s === OAuthStatus.AUTHORIZED) {
                <mat-list class="p-0!">
                  <mat-list-item>
                    @if (profile().picture) {
                      <img matListItemAvatar [src]="profile().picture" alt="" />
                    } @else {
                      <div
                        matListItemAvatar
                        class="flex! items-center justify-center bg-blue-600 text-sm font-semibold uppercase text-white">
                        {{ profile().initials || '?' }}
                      </div>
                    }
                    <span matListItemTitle>{{ profile().title }}</span>
                    @if (profile().subtitle) {
                      <span matListItemLine>{{ profile().subtitle }}</span>
                    }
                    <div matListItemMeta>
                      <button mat-icon-button type="button" [attr.aria-label]="i18n().logout" (click)="logoutAndClose()">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  </mat-list-item>
                </mat-list>
              } @else if (s === OAuthStatus.DENIED && showError()) {
                <div class="flex items-center gap-2 py-1 text-red-700">
                  <mat-icon>error_outline</mat-icon>
                  <span class="flex-1 text-sm" [innerHTML]="i18n().denied"></span>
                  <button mat-icon-button type="button" (click)="dismissError()" [attr.aria-label]="i18n().dismiss">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              } @else {
                <form
                  #form="ngForm"
                  (ngSubmit)="login({ username: username, password: password })"
                  autocomplete="on"
                  class="flex flex-col gap-3">
                  <mat-form-field subscriptSizing="dynamic" class="block w-full">
                    <mat-label>{{ i18n().username }}</mat-label>
                    <mat-icon matPrefix>alternate_email</mat-icon>
                    <input matInput name="username" autocomplete="username" required [(ngModel)]="username" />
                  </mat-form-field>
                  <mat-form-field subscriptSizing="dynamic" class="block w-full">
                    <mat-label>{{ i18n().password }}</mat-label>
                    <mat-icon matPrefix>password</mat-icon>
                    <input
                      matInput
                      name="password"
                      autocomplete="current-password"
                      required
                      [type]="visible() ? 'text' : 'password'"
                      [(ngModel)]="password" />
                    <button
                      mat-icon-button
                      matSuffix
                      type="button"
                      (click)="visible.set(!visible())"
                      [attr.aria-label]="visible() ? i18n().hidePassword : i18n().showPassword">
                      <mat-icon>{{ visible() ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </mat-form-field>
                  <div class="flex justify-end pt-1">
                    <button mat-flat-button type="submit" [disabled]="form.invalid">{{ i18n().submit }}</button>
                  </div>
                </form>
              }
            </div>
          </mat-menu>
        }
      }
    }
  `,
  styles: `
    .mat-mdc-menu-panel:has(.oauth-login-content) {
      max-width: none;
      min-width: 360px;
    }
    .oauth-login-content .mat-mdc-list-item .mdc-list-item__end {
      align-self: center !important;
    }
  `,
  encapsulation: ViewEncapsulation.None
})
export class OAuthLoginComponent {
  private oauth = inject(OAUTH)
  private user = inject(OAUTH_USER)
  private locationService = inject(Location2)
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID))
  readonly OAuthStatus = OAuthStatus
  readonly config = input<OAuthLoginConfig>({})
  readonly i18n = input<Required<OAuthLoginI18n>, OAuthLoginI18n | undefined>(defaultI18n, {
    transform: v => ({ ...defaultI18n, ...v })
  })

  readonly loginTemplate = contentChild<TemplateRef<unknown>>('login')
  readonly stateChange = output<string | undefined>()
  readonly trigger = viewChild(MatMenuTrigger)

  protected readonly status = this.oauth.status
  protected readonly isAuthCode = computed(() => !!this.config().responseType)
  protected readonly authCodeParams = computed<AuthorizationCodeParameters>(() => ({
    ...this.config(),
    responseType: this.config().responseType!,
    redirectUri: this.config().redirectUri || `${globalThis.location?.origin ?? ''}${this.locationService.path(true) || '/'}`
  }))
  protected readonly profile = computed(() => {
    const info = this.user.value() ?? {}
    const title = info.name || info.preferred_username || info.email || info.sub || ''
    const subtitle = info.email ?? ''
    const initials = `${info.given_name?.charAt(0) ?? ''}${info.family_name?.charAt(0) ?? ''}`.toUpperCase()
    return { title, subtitle, picture: info.picture, initials }
  })

  protected readonly visible = signal(false)
  protected readonly showError = signal(true)
  username = ''
  password = ''

  constructor() {
    effect(() => this.stateChange.emit(this.oauth.state()))
    effect(() => {
      if (this.status() === OAuthStatus.DENIED) this.showError.set(true)
    })
    effect(() => {
      const { username, password } = this.config()
      if (username !== undefined) this.username = username
      if (password !== undefined) this.password = password
    })
  }

  loginFunction = (p: OAuthParameters) => this.login(p)
  logoutFunction = () => this.logout()

  logout() {
    return this.oauth.logout(this.config().logoutRedirectUri, this.config().state)
  }

  logoutAndClose() {
    this.trigger()?.closeMenu()
    return this.logout()
  }

  dismissError() {
    this.showError.set(false)
    return this.oauth.logout()
  }

  login(parameters: OAuthParameters) {
    this.trigger()?.closeMenu()
    return this.oauth.login(parameters)
  }
}
