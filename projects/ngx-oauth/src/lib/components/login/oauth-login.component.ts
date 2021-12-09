import {
  Component,
  ContentChild,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  Output,
  TemplateRef,
  ViewEncapsulation
} from '@angular/core';
import {Observable, Subscription, take} from 'rxjs';
import {LOCATION, OAuthParameters, OAuthStatus, OAuthType} from '../../models';
import {tap} from 'rxjs/operators';
import {OAuthService} from '../../services/oauth.service';
import {Location as Location2} from '@angular/common';

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
  styleUrls: ['oauth-login.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class OAuthLoginComponent implements OnDestroy {

  private _redirectUri: string | undefined;
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
  set redirectUri(redirectUri: string) {
    if (redirectUri) {
      this._redirectUri = redirectUri;
    }
  }

  get redirectUri() {
    return this._redirectUri || `${this.location.origin}${this.locationService.path(true) || '/'}`;
  }

  @Input()
  useLogoutUrl = false;
  @Input()
  state = '';
  @Output()
  stateChange: EventEmitter<string> = new EventEmitter();
  @Input()
  profileName$: Observable<string | undefined> | undefined;
  @ContentChild('login', {static: false})
  loginTemplate: TemplateRef<any> | undefined;
  username = '';
  password = '';
  profileName: string | undefined;
  OAuthStatus = OAuthStatus;
  OAuthType = OAuthType;
  collapse = false;
  type = this.oauthService.type;
  state$ = this.oauthService.state$.pipe(
    tap(s => this.stateChange.emit(s))
  );
  status$ = this.oauthService.status$.pipe(
    tap(s => {
      if (s === OAuthStatus.AUTHORIZED && this.profileName$) {
        this.subscription.add(this.profileName$.pipe(take(1)).subscribe(n => this.profileName = n));
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
              private locationService: Location2,
              @Inject(LOCATION) private location: Location) {
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  logout() {
    this.oauthService.logout(this.useLogoutUrl);
  }

  async login(parameters: OAuthParameters) {
    await this.oauthService.login(parameters);
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
