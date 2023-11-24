import {Component, ContentChild, HostListener, Input, Output, TemplateRef, ViewEncapsulation} from '@angular/core';
import {Observable, take} from 'rxjs';
import {OAuthParameters, OAuthStatus, OAuthType} from '../../models';
import {tap} from 'rxjs/operators';
import {OAuthService} from '../../services/oauth.service';
import { CommonModule, Location as Location2 } from '@angular/common';
import {FormsModule} from '@angular/forms';

export interface OAuthLoginI18n {
  username?: string;
  password?: string;
  submit?: string;
  notAuthorized?: string;
  authorized?: string;
  denied?: string;
}

@Component({
  selector: 'oauth-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
],
  template: `
@if (loginTemplate) {
  <ng-container
    [ngTemplateOutlet]="loginTemplate"
    [ngTemplateOutletContext]="{login: loginFunction, logout: logoutFunction, status: status$ | async}">
  </ng-container>
} @else {
  @if (status$ | async; as status) {
    @if (type === OAuthType.RESOURCE) {
      <div class="oauth dropdown text-end {{collapse ? 'show': ''}}">
        <button class="btn btn-link p-0 dropdown-toggle"
          (click)="status === OAuthStatus.AUTHORIZED ? logout() : toggleCollapse()">
          <ng-container *ngTemplateOutlet="message"></ng-container>
        </button>
        <div class="dropdown-menu mr-3 {{collapse ? 'show': ''}}">
          @if (status === OAuthStatus.NOT_AUTHORIZED || status === OAuthStatus.DENIED) {
            <form class="p-3"
              #form="ngForm"
              (submit)="login({username: username, password: password})">
              <div class="mb-3">
                <input type="text"
                  class="form-control"
                  name="username"
                  required
                  [(ngModel)]="username"
                  [placeholder]="i18n.username">
                </div>
                <div class="mb-3">
                  <input type="password"
                    class="form-control"
                    name="password"
                    required
                    [(ngModel)]="password"
                    [placeholder]="i18n.password">
                  </div>
                  <div class="text-end">
                    <button type="submit"
                      class="btn btn-primary"
                    [disabled]="form.invalid">{{i18n.submit}}</button>
                  </div>
                </form>
              }
            </div>
          </div>
        } @else {
          <a role="button"
            class="oauth"
            (click)="status === OAuthStatus.AUTHORIZED ? logout() : login({responseType: responseType,  redirectUri: redirectUri, state:state})">
            <ng-container *ngTemplateOutlet="message"></ng-container>
          </a>
        }
        <ng-template #message>
          @if (status === OAuthStatus.NOT_AUTHORIZED) {
            <span class="not-authorized"
            [innerHTML]="i18n.notAuthorized"></span>
          }
          @if (status === OAuthStatus.AUTHORIZED) {
            <span class="authorized"
              >
              <span class="welcome" [innerHTML]="i18n.authorized + '&nbsp;'"></span>
              <strong class="profile-name"
              [innerHTML]="profileName"></strong>
            </span>
          }
          @if (status === OAuthStatus.DENIED) {
            <span class="denied"
            [innerHTML]="i18n.denied"></span>
          }
        </ng-template>
      }
    }
    `,
  styles: [`
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
  `],
  encapsulation: ViewEncapsulation.None,
})
export class OAuthLoginComponent {

  #redirectUri?: string;
  #responseType?: string;
  #i18n: OAuthLoginI18n = {
    username: 'Username',
    password: 'Password',
    submit: 'Sign in',
    notAuthorized: 'Sign in',
    authorized: 'Welcome',
    denied: 'Access Denied. Try again!'
  };

  get i18n() {
    return this.#i18n;
  }

  @Input()
  type: OAuthType = OAuthType.RESOURCE;

  @Input()
  set i18n(i18n) {
    this.#i18n = {
      ...this.#i18n,
      ...i18n
    };
  }

  get redirectUri() {
    return this.#redirectUri || `${globalThis.location?.origin}${this.locationService.path(true) || '/'}`;
  }

  @Input()
  set redirectUri(redirectUri: string) {
    if (redirectUri) {
      this.#redirectUri = redirectUri;
    }
  }

  @Input()
  set responseType(responseType: string) {
    if (this.responseType) {
      this.#responseType = responseType;
    }
  }

  get responseType() {
    return this.#responseType || this.type;
  }

  @Input()
  useLogoutUrl = false;
  @Input()
  state = '';
  @Output()
  stateChange = this.oauthService.state$.asObservable();
  @Input()
  profileName$: Observable<string | undefined> | undefined;
  @ContentChild('login', {static: false})
  loginTemplate: TemplateRef<any> | null = null;
  username = '';
  password = '';
  profileName?: string;
  OAuthStatus = OAuthStatus;
  OAuthType = OAuthType;
  collapse = false;
  status$ = this.oauthService.status$.pipe(
    tap(s => {
      if (s === OAuthStatus.AUTHORIZED && this.profileName$) {
        this.profileName$.pipe(
          take(1)
        ).subscribe(n => this.profileName = n);
      } else {
        const {token} = this.oauthService;
        const userInfo = token && token.id_token && JSON.parse(atob(token.id_token.split('.')[1])) || {};
        this.profileName = userInfo.name || userInfo.username || userInfo.email || userInfo.sub || '';
      }
    })
  );
  loginFunction = (p: OAuthParameters) => this.login(p);
  logoutFunction = () => this.logout();

  constructor(private oauthService: OAuthService,
              private locationService: Location2) {
  }

  logout() {
    this.oauthService.logout(this.useLogoutUrl);
  }

  login(parameters: OAuthParameters) {
    this.collapse = false;
    return this.oauthService.login(parameters);
  }

  toggleCollapse() {
    this.collapse = !this.collapse;
  }

  @HostListener('window:keydown.escape')
  keyboardEvent() {
    this.collapse = false;
  }
}
