import {
  Component,
  computed,
  contentChild,
  effect,
  HostListener,
  inject,
  input,
  output,
  TemplateRef,
  ViewEncapsulation
} from '@angular/core'
import { CommonModule, Location as Location2 } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { OAUTH, OAuthParameters, OAuthStatus, OAuthType } from 'ngx-oauth'

export type OAuthLoginI18n = {
  username?: string
  password?: string
  submit?: string
  notAuthorized?: string
  authorized?: string
  denied?: string
}

const defaultI18n: OAuthLoginI18n = {
  username: 'Username',
  password: 'Password',
  submit: 'Sign in',
  notAuthorized: 'Sign in',
  authorized: 'Welcome',
  denied: 'Access Denied. Try again!'
}

@Component({
  selector: 'oauth-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (loginTemplate(); as tpl) {
      <ng-container
        [ngTemplateOutlet]="tpl"
        [ngTemplateOutletContext]="{ login: loginFunction, logout: logoutFunction, status: status() }" />
    } @else if (status(); as s) {
      @if (type() === OAuthType.RESOURCE) {
        <div class="oauth dropdown text-end {{ collapse ? 'show' : '' }}">
          <button class="btn btn-link p-0 dropdown-toggle" (click)="s === OAuthStatus.AUTHORIZED ? logout() : toggleCollapse()">
            <ng-container *ngTemplateOutlet="message" />
          </button>
          <div class="dropdown-menu mr-3 {{ collapse ? 'show' : '' }}">
            @if (s === OAuthStatus.NOT_AUTHORIZED || s === OAuthStatus.DENIED) {
              <form class="p-3" #form="ngForm" (submit)="login({ username: username, password: password })">
                <div class="mb-3">
                  <input type="text" class="form-control" name="username" required [(ngModel)]="username" [placeholder]="i18n().username" />
                </div>
                <div class="mb-3">
                  <input
                    type="password"
                    class="form-control"
                    name="password"
                    required
                    [(ngModel)]="password"
                    [placeholder]="i18n().password" />
                </div>
                <div class="text-end">
                  <button type="submit" class="btn btn-primary" [disabled]="form.invalid">{{ i18n().submit }}</button>
                </div>
              </form>
            }
          </div>
        </div>
      } @else {
        <button
          type="button"
          class="oauth"
          (click)="
            s === OAuthStatus.AUTHORIZED ? logout() : login({ responseType: responseType(), redirectUri: redirectUri(), state: state() })
          ">
          <ng-container *ngTemplateOutlet="message" />
        </button>
      }
      <ng-template #message>
        @if (s === OAuthStatus.NOT_AUTHORIZED) {
          <span class="not-authorized" [innerHTML]="i18n().notAuthorized"></span>
        }
        @if (s === OAuthStatus.AUTHORIZED) {
          <span class="authorized">
            <span class="welcome" [innerHTML]="i18n().authorized + '&nbsp;'"></span>
            <strong class="profile-name" [innerHTML]="displayName()"></strong>
          </span>
        }
        @if (s === OAuthStatus.DENIED) {
          <span class="denied" [innerHTML]="i18n().denied"></span>
        }
      </ng-template>
    }
  `,
  styles: [
    `
      .oauth {
        .dropdown-menu {
          left: auto;
          right: 0;
          box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
          min-width: 250px;

          &:before {
            content: '';
            display: inline-block;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-bottom: 7px solid #ccc;
            border-bottom-color: rgba(0, 0, 0, 0.2);
            position: absolute;
            top: -7px;
            left: auto;
            right: 15px;
          }

          &:after {
            content: '';
            display: inline-block;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 6px solid #ffffff;
            position: absolute;
            top: -6px;
            left: auto;
            right: 16px;
          }
        }
      }
    `
  ],
  encapsulation: ViewEncapsulation.None
})
export class OAuthLoginComponent {
  private oauth = inject(OAUTH)
  private locationService = inject(Location2)

  readonly OAuthStatus = OAuthStatus
  readonly OAuthType = OAuthType

  type = input<OAuthType>(OAuthType.RESOURCE)
  logoutRedirectUri = input<string | undefined>(undefined)
  state = input('')
  profileName = input<string | undefined>(undefined)

  protected i18nInput = input<OAuthLoginI18n>({}, { alias: 'i18n' })
  i18n = computed<OAuthLoginI18n>(() => ({ ...defaultI18n, ...this.i18nInput() }))

  protected redirectUriInput = input<string | undefined>(undefined, { alias: 'redirectUri' })
  redirectUri = computed(() => this.redirectUriInput() || `${globalThis.location?.origin}${this.locationService.path(true) || '/'}`)

  protected responseTypeInput = input<string | undefined>(undefined, { alias: 'responseType' })
  responseType = computed(() => this.responseTypeInput() || this.type())

  loginTemplate = contentChild<TemplateRef<unknown>>('login')

  status = this.oauth.status
  private token = this.oauth.token

  displayName = computed(() => {
    const override = this.profileName()
    if (override) return override
    const t = this.token()
    const payload = t?.id_token?.split('.')[1]
    const info = (payload && JSON.parse(atob(payload))) || {}
    return info.name || info.username || info.email || info.sub || ''
  })

  stateChange = output<string | undefined>()

  username = ''
  password = ''
  collapse = false

  loginFunction = (p: OAuthParameters) => this.login(p)
  logoutFunction = () => this.logout()

  constructor() {
    effect(() => this.stateChange.emit(this.oauth.state()))
  }

  logout() {
    return this.oauth.logout(this.logoutRedirectUri(), this.state())
  }

  login(parameters: OAuthParameters) {
    this.collapse = false
    return this.oauth.login(parameters)
  }

  toggleCollapse() {
    this.collapse = !this.collapse
  }

  @HostListener('window:keydown.escape')
  keyboardEvent() {
    this.collapse = false
  }
}
