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
        <div class="oauth-login relative inline-block text-right">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition"
            (click)="s === OAuthStatus.AUTHORIZED ? logout() : toggleCollapse()">
            <ng-container *ngTemplateOutlet="message" />
            @if (s !== OAuthStatus.AUTHORIZED) {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 opacity-60">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
              </svg>
            }
          </button>
          @if (collapse() && (s === OAuthStatus.NOT_AUTHORIZED || s === OAuthStatus.DENIED)) {
            <div class="absolute right-0 z-20 mt-2 w-72 origin-top-right rounded-xl border border-slate-200 bg-white p-4 shadow-lg ring-1 ring-black/5 focus:outline-none">
              <div class="absolute -top-2 right-6 h-4 w-4 rotate-45 border-l border-t border-slate-200 bg-white"></div>
              <form #form="ngForm" (submit)="login({ username: username, password: password })" class="relative space-y-3">
                @if (s === OAuthStatus.DENIED) {
                  <div class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700" [innerHTML]="i18n().denied"></div>
                }
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-600">{{ i18n().username }}</label>
                  <input
                    type="text"
                    name="username"
                    required
                    [(ngModel)]="username"
                    [placeholder]="i18n().username"
                    class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-600">{{ i18n().password }}</label>
                  <input
                    type="password"
                    name="password"
                    required
                    [(ngModel)]="password"
                    [placeholder]="i18n().password"
                    class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <div class="flex justify-end pt-1">
                  <button
                    type="submit"
                    [disabled]="form.invalid"
                    class="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 transition">
                    {{ i18n().submit }}
                  </button>
                </div>
              </form>
            </div>
          }
        </div>
      } @else {
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition"
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
          <span class="authorized inline-flex items-center gap-1.5">
            <span class="welcome text-slate-600" [innerHTML]="i18n().authorized + '&nbsp;'"></span>
            <strong class="profile-name font-semibold text-slate-900" [innerHTML]="displayName()"></strong>
          </span>
        }
        @if (s === OAuthStatus.DENIED) {
          <span class="denied text-rose-600" [innerHTML]="i18n().denied"></span>
        }
      </ng-template>
    }
  `,
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
