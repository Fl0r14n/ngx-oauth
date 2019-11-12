import {EventEmitter, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParameterCodec, HttpParams} from '@angular/common/http';
import {NavigationEnd, Router} from '@angular/router';
import {catchError} from 'rxjs/operators';
import {EMPTY} from 'rxjs';
import {DefaultOAuthConfig, ImplicitOAuthConfig, ResourceOAuthConfig} from './oauth.config';

const STORAGE_ID = 'token';
const QUERY_ACCESS_TOKEN = 'access_token';
const QUERY_ERROR = 'error';

class HttpParamEncoder implements HttpParameterCodec {
  encodeKey(key: string): string {
    return encodeURIComponent(key);
  }

  encodeValue(value: string): string {
    return encodeURIComponent(value);
  }

  decodeKey(key: string): string {
    return decodeURIComponent(key);
  }

  decodeValue(value: string): string {
    return decodeURIComponent(value);
  }
}

const toHttpParams = (data: object): HttpParams => {
  let httpParams = new HttpParams({encoder: new HttpParamEncoder()});
  Object.keys(data).forEach((key) => {
    httpParams = httpParams.append(key, data[key]);
  });
  return httpParams;
};

export enum OAuthEvent {
  LOGOUT = 'oauth:logout',
  AUTHORIZED = 'oauth:autorized',
  DENIED = 'oauth:denied',
  PROFILE = 'oauth:profile'
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
    expires_in?: number
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
    const tokenStr = this.storage[STORAGE_ID];
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
      const body = toHttpParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: this.grantType,
        username: this.username,
        password: this.password
      });
      const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
      this.http.post(this.tokenPath, body, {headers}).pipe(catchError( error => {
        this.status = OAuthEvent.DENIED;
        this.onStatus.emit(OAuthEvent.DENIED);
        return EMPTY;
      })).subscribe(params => this.setToken(params));
    }
  }

  logout() {
    delete this.storage[STORAGE_ID];
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
    this.storage[STORAGE_ID] = JSON.stringify(this.token);
    this.startExpirationTimer();
    if (this.profileUri) {
      this.http.get(this.profileUri, {
        headers: {
          Authorization: `Bearer ${this.token.access_token}`
        }
      }).subscribe(profile => {
          this.profile = profile;
          this.status = OAuthEvent.AUTHORIZED;
          this.onStatus.emit(OAuthEvent.AUTHORIZED);
          this.onStatus.emit(OAuthEvent.PROFILE);
        },
        () => {
          this.status = OAuthEvent.DENIED;
          this.onStatus.emit(OAuthEvent.DENIED);
        }
      );
    } else {
      this.status = OAuthEvent.AUTHORIZED;
      this.onStatus.emit(OAuthEvent.AUTHORIZED);
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
    const params: any = {};
    let m;
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = regex.exec(hash)) !== null) {
      params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }
    if (params[QUERY_ACCESS_TOKEN] || params[QUERY_ERROR]) {
      return params;
    }
  }

  private cleanLocationHash() {
    let curHash = location.hash;
    const hashKeys = ['#access_token', 'token_type', 'expires_in', 'scope', 'state', 'error', 'error_description'];
    hashKeys.forEach((hashKey) => {
      const re = new RegExp('&' + hashKey + '(=[^&]*)?|^' + hashKey + '(=[^&]*)?&?');
      curHash = curHash.replace(re, '');
    });
    location.hash = curHash;
  }
}
