import {Component, ContentChild, EventEmitter, HostListener, Inject, Input, OnDestroy, OnInit, Output, TemplateRef} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {LOCATION, OAuthStatus, OAuthType} from '../../models';
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
export class OAuthLoginComponent implements OnInit, OnDestroy {

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
  scope = null;
  @Input()
  state = '';
  @Output()
  stateChange: EventEmitter<string> = new EventEmitter();
  @Input()
  profileName$: Observable<string>;
  state$;
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
  redirectUri;
  loginFunction = (p) => this.login(p);
  logoutFunction = () => this.logout();

  constructor(private oauthService: OAuthService,
              @Inject(LOCATION) location) {
    this.redirectUri = location.href;
  }

  ngOnInit() {
    this.state$ = this.oauthService.state$.pipe(
      tap(s => this.stateChange.emit(s))
    );
    this.status$ = this.oauthService.status$.pipe(
      tap(s => {
        if (s === OAuthStatus.AUTHORIZED && this.profileName$) {
          this.subscription.add(this.profileName$.subscribe(n => this.profileName = n));
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

  @HostListener('window:keydown.escape', ['$event'])
  keyboardEvent(event: KeyboardEvent) {
    this.collapse = false;
  }
}
