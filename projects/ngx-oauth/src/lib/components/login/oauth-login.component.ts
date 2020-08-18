import {Component, ContentChild, HostListener, Input, OnDestroy, OnInit, TemplateRef} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {OAuthStatus, OAuthType} from '../../models';
import {OAuthService} from '../../services';
import {tap} from 'rxjs/operators';

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
  templateUrl: 'oauth-login.component.html',
  styleUrls: ['oauth-login.component.scss']
})
export class OauthLoginComponent implements OnInit, OnDestroy {

  private subscription = new Subscription();
  // tslint:disable-next-line:variable-name
  private _i18n: OAuthLoginI18n = {
    username: 'Username',
    password: 'Password',
    submit: 'Sign in',
    notAuthorized: 'Sign in',
    authorized: 'Welcome',
    denied: 'Access Denied. Try again!'
  };

  get i18n() {
    return this._i18n;
  }

  @Input()
  set i18n(i18n) {
    this._i18n = {
      ...this._i18n,
      ...i18n
    };
  }

  @Input()
  getProfileName: () => Observable<string>;
  @ContentChild('login', {static: false})
  loginTemplate: TemplateRef<any>;
  status$: Observable<OAuthStatus>;
  type: OAuthType;
  collapse = false;
  username: string;
  password: string;
  profileName: string;
  OAuthStatus = OAuthStatus;
  OAuthType = OAuthType;
  location = window.location.href;
  loginFunction = (p) => this.login(p);
  logoutFunction = () => this.logout();

  constructor(private readonly oauthService: OAuthService) {
  }

  ngOnInit() {
    this.status$ = this.oauthService.status$.pipe(
      tap(s => {
        if (s === OAuthStatus.AUTHORIZED) {
          this.subscription.add(this.getProfileName().subscribe(n => this.profileName = n));
        } else {
          this.profileName = '';
        }
      })
    );
    this.type = this.oauthService.type;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  logout() {
    this.oauthService.logout();
  }

  login(parameters) {
    this.oauthService.login(parameters);
    this.collapse = false;
  }

  toggleCollapse() {
    this.collapse = !this.collapse;
  }

  @HostListener('window:keyup', ['$event'])
  keyboardEvent(event: KeyboardEvent) {
    if (event.keyCode === 27) {
      this.collapse = false;
    }
  }
}
