import {
  Component,
  computed,
  contentChild,
  effect,
  HostListener,
  inject,
  input,
  output,
  signal,
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

const defaultI18n: Required<OAuthLoginI18n> = {
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
        <div class="oauth dropdown text-end {{ collapse() ? 'show' : '' }}">
          <button class="btn btn-link p-0 dropdown-toggle" (click)="s === OAuthStatus.AUTHORIZED ? logout() : toggleCollapse()">
            <ng-container *ngTemplateOutlet="message" />
          </button>
          <div class="dropdown-menu mr-3 {{ collapse() ? 'show' : '' }}">
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
            s === OAuthStatus.AUTHORIZED
              ? logout()
              : login({ responseType: resolvedResponseType(), redirectUri: resolvedRedirectUri(), state: state() })
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

  readonly type = input<OAuthType>(OAuthType.RESOURCE)
  readonly state = input('')
  readonly profileName = input<string | undefined>(undefined)
  readonly logoutRedirectUri = input<string | undefined>(undefined)
  readonly redirectUri = input<string | undefined>(undefined)
  readonly responseType = input<string | undefined>(undefined)
  readonly i18n = input<Required<OAuthLoginI18n>, OAuthLoginI18n | undefined>(defaultI18n, {
    transform: v => ({ ...defaultI18n, ...v })
  })

  readonly loginTemplate = contentChild<TemplateRef<unknown>>('login')
  readonly stateChange = output<string | undefined>()

  protected readonly status = this.oauth.status
  protected readonly resolvedRedirectUri = computed(
    () => this.redirectUri() || `${globalThis.location?.origin ?? ''}${this.locationService.path(true) || '/'}`
  )
  protected readonly resolvedResponseType = computed(() => this.responseType() || this.type())
  protected readonly displayName = computed(() => {
    const override = this.profileName()
    if (override) return override
    const payload = this.oauth.token()?.id_token?.split('.')[1]
    const info = (payload && JSON.parse(atob(payload))) || {}
    return info.name || info.username || info.email || info.sub || ''
  })

  protected readonly collapse = signal(false)
  username = ''
  password = ''

  loginFunction = (p: OAuthParameters) => this.login(p)
  logoutFunction = () => this.logout()

  constructor() {
    effect(() => this.stateChange.emit(this.oauth.state()))
  }

  logout() {
    return this.oauth.logout(this.logoutRedirectUri(), this.state())
  }

  login(parameters: OAuthParameters) {
    this.collapse.set(false)
    return this.oauth.login(parameters)
  }

  toggleCollapse() {
    this.collapse.update(v => !v)
  }

  @HostListener('window:keydown.escape')
  keyboardEvent() {
    this.collapse.set(false)
  }
}
