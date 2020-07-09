import {Inject, Injectable, NgZone} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {NavigationEnd, Router} from '@angular/router';
import {catchError, filter, map, take, tap} from 'rxjs/operators';
import {BehaviorSubject, EMPTY, Observable} from 'rxjs';
import {
  AuthorizationCodeFlowLoginParameters,
  ImplicitLoginParameters,
  LoginParameters,
  OAuthConfigService,
  OAuthFlows,
  OAuthStatusTypes,
  ResourceFlowLoginParameters,
  Token
} from './oauth.config';

@Injectable()
export class OAuthService {
  private static readonly QUERY_ERROR = 'error';

  timer: any;
  token: Token | null;
  status: BehaviorSubject<OAuthStatusTypes> = new BehaviorSubject<OAuthStatusTypes>(OAuthStatusTypes.NOT_AUTHORIZED);

  private static parseOauthUri(hash: string) {
    const regex = /([^&=]+)=([^&]*)/g;
    const params: any = {};
    let m;
    // tslint:disable-next-line:no-conditional-assignment
    while ((m = regex.exec(hash)) !== null) {
      params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }
    if (Object.keys(params).length) {
      return params;
    }
  }

  constructor(private http: HttpClient,
              private router: Router,
              private zone: NgZone,
              @Inject(OAuthConfigService) private config
  ) {
    const currentToken = this.config.storage[this.config.storageKey] &&
      this.config.storage[this.config.storageKey] &&
      JSON.parse(this.config.storage[this.config.storageKey]);
    if (currentToken && currentToken.access_token) {
      this.token = currentToken.access_token;
      this.status.next(OAuthStatusTypes.AUTHORIZED);
      this.startExpirationTimer();
    }
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd && !!event.url.match('/#access_token=')),
      map((event: NavigationEnd) => OAuthService.parseOauthUri(event.url.substr(2))),
      filter((params) => !!params),
    ).subscribe((params) => {
      this.cleanLocationHash();
      if (params[OAuthService.QUERY_ERROR]) {
        this.status.next(OAuthStatusTypes.DENIED);
      } else {
        this.setToken(params);
        this.status.next(OAuthStatusTypes.AUTHORIZED);
      }
    });

    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd && !!event.url.match(new RegExp(/\?code=/, 'g'))),
      map((event: NavigationEnd) => OAuthService.parseOauthUri(event.url.substr(2))),
      filter((params) => !!params),
    ).subscribe((params) => {
      const body = new HttpParams({
        fromObject: {
          code: params.code,
          client_id: this.config.flowConfig.clientId,
          client_secret: this.config.flowConfig.clientSecret,
          redirect_uri: window.location.origin,
          grant_type: 'authorization_code'
        }
      });
      const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
      this.http.post(this.config.flowConfig.tokenPath, body, {headers}).pipe(
        catchError( () => {
          this.status.next(OAuthStatusTypes.DENIED);
          return EMPTY;
        })
      ).subscribe(token => {
        this.setToken(token);
        this.status.next(OAuthStatusTypes.AUTHORIZED);
      });
    });
  }

  login(parameters?: LoginParameters) {
    if (this.isResourceFlow(parameters)) {
      this.resourceFlowLogin(parameters);
    } else if (this.isAuthorizationCodeFlow(parameters)) {
      this.authorizationCodeFlowLogin(parameters);
    } else if (this.isImplicitFlow(parameters)) {
      this.implicitFlowLogin(parameters);
    } else if (this.isClientCredentialFlow(parameters)) {
      this.clientCredentialFlowLogin();
    }
  }

  logout() {
    delete this.config.storage[this.config.storageKey];
    this.token = null;
    this.status.next(OAuthStatusTypes.NOT_AUTHORIZED);
  }

  getStatus(): Observable<OAuthStatusTypes> {
    return this.status;
  }

  private resourceFlowLogin(parameters: ResourceFlowLoginParameters) {
    const body = new HttpParams({fromObject: {
      client_id: this.config.flowConfig.clientId,
      client_secret: this.config.flowConfig.clientSecret,
      grant_type: 'password',
      username: parameters.username,
      password: parameters.password
    }});
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    this.http.post(this.config.flowConfig.tokenPath, body, {headers}).pipe(
      catchError( () => {
        this.status.next(OAuthStatusTypes.DENIED);
        return EMPTY;
      })
    ).subscribe(params => {
      this.setToken(params);
      this.status.next(OAuthStatusTypes.AUTHORIZED);
    });
  }

  private authorizationCodeFlowLogin(parameters: AuthorizationCodeFlowLoginParameters) {
    const authUrl = this.getAuthorizationUrl(parameters, 'code');
    location.replace(authUrl);
  }

  private implicitFlowLogin(parameters: ImplicitLoginParameters) {
    const authUrl = this.getAuthorizationUrl(parameters, 'token');
    location.replace(authUrl);
  }

  private clientCredentialFlowLogin() {
    const body = new HttpParams({fromObject: {
      client_id: this.config.flowConfig.clientId,
      client_secret: this.config.flowConfig.clientSecret,
      grant_type: 'client_credentials'
    }});
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    this.http.post(this.config.flowConfig.tokenPath, body, {headers}).pipe(
      catchError( () => {
        this.status.next(OAuthStatusTypes.DENIED);
        return EMPTY;
      })
    ).subscribe(params => {
      this.setToken(params);
      this.status.next(OAuthStatusTypes.AUTHORIZED);
    });
  }

  private isResourceFlow(parameters?: LoginParameters): parameters is ResourceFlowLoginParameters {
    return this.config.flowType === OAuthFlows.RESOURCE && parameters && !!(parameters as ResourceFlowLoginParameters).password;
  }

  private isAuthorizationCodeFlow(parameters?: LoginParameters): parameters is AuthorizationCodeFlowLoginParameters {
    return this.config.flowType === OAuthFlows.AUTHORIZATION_CODE && parameters && !!(parameters as ImplicitLoginParameters).redirectUri;
  }

  private isImplicitFlow(parameters?: LoginParameters): parameters is ImplicitLoginParameters {
    return this.config.flowType === OAuthFlows.IMPLICIT && parameters && !!(parameters as ImplicitLoginParameters).redirectUri;
  }

  private isClientCredentialFlow(parameters?: LoginParameters): parameters is undefined {
    return this.config.flowType === OAuthFlows.CLIENT_CREDENTIAL;
  }

  private getAuthorizationUrl(parameters: AuthorizationCodeFlowLoginParameters | ImplicitLoginParameters, responseType): string {
    const appendChar = this.config.flowConfig.authorizePath.includes('?') ? '&' : '?';
    const clientId = `${appendChar}client_id=${this.config.flowConfig.clientId}`;
    const redirectUri = `&redirect_uri=${encodeURIComponent(parameters.redirectUri)}`;
    const responseTypeString = `&response_type=${responseType}`;
    const scope = `&scope=${encodeURIComponent(parameters.scope || '')}`;
    const state = `&state=${encodeURIComponent(parameters.state || '')}`;
    const parametersString = `${clientId}${redirectUri}${responseTypeString}${scope}${state}`;

    return `${this.config.flowConfig.authorizePath}${parametersString}`;
  }

  private setToken(token: Token) {
    this.token = token;
    this.config.storage[this.config.storageKey] = JSON.stringify(this.token);
    this.startExpirationTimer();
  }

  private startExpirationTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    if (this.token.expires_in) {
      // this.zone.runOutsideAngular(() => {
        this.timer = setTimeout(() => {
          // this.zone.run(() => {
            if (this.config.flowConfig.tokenPath && this.token.refresh_token) {
              const appendChar = this.config.flowConfig.tokenPath.includes('?') ? '&' : '?';
              const refreshToken = `${appendChar}refresh_token=${this.token.refresh_token}`;
              const clientId = `&client_id=${this.config.flowConfig.clientId}`;
              const clientSecret = `&client_secret=${this.config.flowConfig.clientSecret}`;
              const grantType = '&grant_type=refresh_token';
              const authUrl = `${this.config.flowConfig.tokenPath}${refreshToken}${clientId}${clientSecret}${grantType}`;
              this.http.post(authUrl, null)
                .subscribe(params => {
                  this.setToken(params);
                  this.status.next(OAuthStatusTypes.AUTHORIZED);
                });
            } else {
              this.logout();
            }
          // });
        }, Number(this.token.expires_in) * 1000);
      // });
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
