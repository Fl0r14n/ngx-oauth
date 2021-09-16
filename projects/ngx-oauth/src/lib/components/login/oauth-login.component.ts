import {Component, ContentChild, EventEmitter, HostListener, Inject, Input, OnDestroy, Output, TemplateRef} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {LOCATION, OAuthParameters, OAuthStatus, OAuthType} from '../../models';
import {tap} from 'rxjs/operators';
import {OAuthService} from '../../services/oauth.service';

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
export class OAuthLoginComponent implements OnDestroy {

  private subscription = new Subscription();
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
  state = '';
  @Output()
  stateChange: EventEmitter<string> = new EventEmitter();
  @Input()
  profileName$: Observable<string> | undefined;
  @ContentChild('login', {static: false})
  loginTemplate: TemplateRef<any> | undefined;
  username = '';
  password = '';
  profileName: string | undefined;
  OAuthStatus = OAuthStatus;
  OAuthType = OAuthType;
  collapse = false;
  type = this.oauthService.type;
  redirectUri = this.location.href;
  state$ = this.oauthService.state$.pipe(
    tap(s => this.stateChange.emit(s))
  );
  status$ = this.oauthService.status$.pipe(
    tap(s => {
      if (s === OAuthStatus.AUTHORIZED && this.profileName$) {
        this.subscription.add(this.profileName$.subscribe(n => this.profileName = n));
      } else {
        this.profileName = '';
      }
    })
  );
  loginFunction = (p: OAuthParameters) => this.login(p);
  logoutFunction = () => this.logout();

  constructor(private oauthService: OAuthService,
              @Inject(LOCATION) private location: Location) {
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  logout() {
    this.oauthService.logout();
  }

  login(parameters: OAuthParameters) {
    this.oauthService.login(parameters);
    this.collapse = false;
  }

  toggleCollapse() {
    this.collapse = !this.collapse;
  }

  @HostListener('window:keydown.escape')
  keyboardEvent() {
    this.collapse = false;
  }
}
