import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpEvent,
  HttpHandler,
  HttpHeaders,
  HttpInterceptor,
  HttpParams,
  HttpRequest
} from '@angular/common/http';
import {Component, EventEmitter, HostListener, Injectable, Injector, Input, NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {BrowserModule} from '@angular/platform-browser';
import {NavigationEnd, Router, RouterModule} from '@angular/router';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/empty';

export enum OAuthEvent {
  LOGOUT = <any>'oauth:logout',
  AUTHORIZED = <any>'oauth:autorized',
  DENIED = <any>'oauth:denied',
  PROFILE = <any>'oauth:profile'
}

export interface OAuthConfig {
  clientId: string
  redirectUri?: string
  profileUri?: string
  scope?: string
  state?: string
  storage?: Storage
}

export interface ResourceOAuthConfig extends OAuthConfig {
  tokenPath: string
  username: string
  password: string
  clientSecret: string
  grantType?: string
}

export interface ImplicitOAuthConfig extends OAuthConfig {
  authorizePath: string
  responseType?: string
}

export class DefaultOAuthConfig implements ResourceOAuthConfig, ImplicitOAuthConfig {
  authorizePath: string = null;
  tokenPath: string = null;
  profileUri: string = null;
  redirectUri = window.location.origin;
  clientId = 'client';
  clientSecret = '';
  grantType = 'password';
  username = '';
  password = '';
  responseType = 'token';
  scope = '';
  state = '';
  storage = sessionStorage;
}

@Injectable()
export class OAuthService extends DefaultOAuthConfig {

  status = OAuthEvent.LOGOUT;
  timer: any;
  profile: any;
  token: {
    access_token?: string
    refresh_token?: string
    token_type?: string
    state?: string
    error?: string
    expires_in?: Number
  };
  onStatus = new EventEmitter<OAuthEvent>();

  constructor(protected http: HttpClient, protected router: Router) {
    super();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd && event.url.match('/#access_token=')) {
        const hash = event.url.substr(2);
        const params = this.parseOauthUri(hash);
        if (params) {
          this.cleanLocationHash();
          this.setToken(params);
        }
      }
    });
  }

  init() {
    const tokenStr = this.storage['token'];
    if (tokenStr) {
      const token = JSON.parse(tokenStr);
      if (token && token.access_token) {
        this.setToken(token);
      }
    }
  }

  configure(oauthConfig: ResourceOAuthConfig | ImplicitOAuthConfig) {
    Object.assign(this, oauthConfig);
    this.init();
  }

  login() {
    if (this.authorizePath) {
      const appendChar = this.authorizePath.indexOf('?') === -1 ? '?' : '&';
      const authUrl = `${this.authorizePath}${appendChar}response_type=${this.responseType}&client_id=${this.clientId
        }&redirect_uri=${this.redirectUri}&scope=${this.scope}&state=${this.state}`;
      location.replace(authUrl);
    }
    if (this.tokenPath) {
      const body = new URLSearchParams();
      body.set('client_id', this.clientId);
      body.set('client_secret', this.clientSecret);
      body.set('grant_type', this.grantType);
      body.set('username', this.username);
      body.set('password', this.password);
      let headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
      this.http.post(this.tokenPath, body.toString(), {headers}).catch(error => {
        this.status = OAuthEvent.DENIED;
        this.onStatus.emit(OAuthEvent.DENIED);
        return Observable.empty();
      }).subscribe(params => this.setToken(params));
    }
  }

  logout() {
    delete this.storage['token'];
    delete this.token;
    delete this.profile;
    this.status = OAuthEvent.LOGOUT;
    this.onStatus.emit(OAuthEvent.LOGOUT);
  }

  private setToken(params: any) {
    if (params.error) {
      this.status = OAuthEvent.DENIED;
      this.onStatus.emit(OAuthEvent.DENIED);
      return;
    }
    this.token = this.token || {};
    Object.assign(this.token, params);
    this.storage['token'] = JSON.stringify(this.token);
    this.status = OAuthEvent.AUTHORIZED;
    this.onStatus.emit(OAuthEvent.AUTHORIZED);
    this.startExpirationTimer();
    if (this.profileUri) {
      this.http.get(this.profileUri, {
        headers: {
          Authorization: `Bearer ${this.token.access_token}`
        }
      }).subscribe(profile => {
        this.profile = profile;
        this.onStatus.emit(OAuthEvent.PROFILE);
      });
    }
  }

  private startExpirationTimer() {
    clearTimeout(this.timer);
    if (this.token.expires_in) {
      this.timer = setTimeout(() => {
        if (this.tokenPath && this.token.refresh_token) {
          const appendChar = this.tokenPath.indexOf('?') === -1 ? '?' : '&';
          const authUrl = `${this.tokenPath}${appendChar}refresh_token=${this.token.refresh_token
            }&client_id=${this.clientId}&client_secret=${this.clientSecret}&redirect_uri=&grant_type=refresh_token`;
          this.http.post(authUrl, null).subscribe(params => this.setToken(params));
        } else {
          this.logout();
        }
      }, Number(this.token.expires_in) * 1000);
    }
  }

  private parseOauthUri(hash: string) {
    const regex = /([^&=]+)=([^&]*)/g;
    let params: any = {};
    let m;
    while ((m = regex.exec(hash)) !== null) {
      params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }
    if (params['access_token'] || params['error']) {
      return params;
    }
  }

  private cleanLocationHash() {
    let curHash = location.hash;
    const haskKeys = ['#access_token', 'token_type', 'expires_in', 'scope', 'state', 'error', 'error_description'];
    haskKeys.forEach((hashKey) => {
      const re = new RegExp('&' + hashKey + '(=[^&]*)?|^' + hashKey + '(=[^&]*)?&?');
      curHash = curHash.replace(re, '');
    });
    location.hash = curHash;
  }
}

@Injectable()
export class OAuthInterceptor implements HttpInterceptor {

  private oauth: OAuthService;

  constructor(injector: Injector) {
    setTimeout(() => {
      this.oauth = injector.get(OAuthService);
    });
  };

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.oauth && this.oauth.token && this.oauth.token.access_token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${this.oauth.token.access_token}`
        }
      });
    }
    return next.handle(req);
  }
}

export class OAuthComponent {
  @Input()
  className: string;
  @Input()
  i18nLogin = 'Sign in';
  @Input()
  i18nLogout = 'Logout';
  @Input()
  i18nDenied = 'Access denied. Try Again';

  oauth: OAuthService;

  @Input()
  set storage(storage: Storage) {
    this.oauth.storage = storage;
  }

  constructor(oauth: OAuthService) {
    this.oauth = oauth;
  }

  isLogout() {
    return this.oauth.status === OAuthEvent.LOGOUT;
  }

  isAuthorized() {
    return this.oauth.status === OAuthEvent.AUTHORIZED;
  }

  isDenied() {
    return this.oauth.status === OAuthEvent.DENIED;
  }

  getEmail() {
    return this.oauth.profile ? this.oauth.profile.name : '';
  }
}


@Component({
  selector: 'oauth-implicit',
  template: `
    <a href="#" class="oauth {{className}}">
      <span *ngIf="isLogout()" (click)="oauth.login()">{{i18nLogin}}</span>
      <span *ngIf="isAuthorized()" (click)="oauth.logout()">{{i18nLogout}}&nbsp;<strong>{{getEmail()}}</strong></span>
      <span *ngIf="isDenied()" (click)="oauth.login()">{{i18nDenied}}</span>
    </a>
  `
})
export class ImplicitOAuthComponent extends OAuthComponent {

  constructor(oauth: OAuthService) {
    super(oauth);
  }

  @Input()
  set oauthConfig(oauthConfig: ImplicitOAuthConfig) {
    this.oauth.configure(oauthConfig);
  }
}

@Component({
  selector: 'oauth-resource',
  template: `
    <div class="oauth dropdown text-right p-3 {{collapse?'show':''}} {{className}}">
      <button class="btn btn-link p-0 dropdown-toogle" [innerHtml]="getText()"
              (click)="isAuthorized() ? this.oauth.logout() :collapse = !collapse"></button>
      <div class="dropdown-menu mr-3 {{collapse?'show':''}}">
        <form class="p-3" *ngIf="isLogout() || isDenied()" (submit)="oauth.login(); collapse=false;">
          <div class="form-group">
            <input type="text" class="form-control" name="username" required [(ngModel)]="oauth.username" [placeholder]="i18Username">
          </div>
          <div class="form-group">
            <input type="password" class="form-control" name="password" required [(ngModel)]="oauth.password" [placeholder]="i18Password">
          </div>
          <div class="text-right">
            <button type="submit" class="btn btn-primary">{{i18nLogin}}</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .oauth .dropdown-menu {
      left: auto;
      right: 0;
      box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
      min-width: 250px;
    }

    .oauth .dropdown-menu:before {
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

    .oauth .dropdown-menu:after {
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
  `]
})
export class ResourceOAuthComponent extends OAuthComponent {

  @Input()
  i18Username = 'Username';
  @Input()
  i18Password = 'Password';
  collapse = false;

  constructor(oauth: OAuthService) {
    super(oauth);
  }

  @Input()
  set oauthConfig(oauthConfig: ResourceOAuthConfig) {
    this.oauth.configure(oauthConfig);
  }

  getText() {
    switch (this.oauth.status) {
      case OAuthEvent.LOGOUT:
        return this.i18nLogin;
      case OAuthEvent.AUTHORIZED:
        return `${this.i18nLogout}&nbsp;<strong>${this.getEmail()}</strong>`;
      case OAuthEvent.DENIED:
        return this.i18nDenied;
    }
  }

  @HostListener('window:keyup', ['$event'])
  keyboardEvent(event: KeyboardEvent) {
    if (event.keyCode === 27) {
      this.collapse = false;
    }
  }
}

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    RouterModule
  ],
  declarations: [
    ImplicitOAuthComponent,
    ResourceOAuthComponent
  ],
  exports: [
    ImplicitOAuthComponent,
    ResourceOAuthComponent
  ],
  providers: [
    OAuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: OAuthInterceptor,
      multi: true,
    }
  ]
})
export class OAuthModule {
}

