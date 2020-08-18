import {Inject, Injectable, NgZone} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {catchError} from 'rxjs/operators';
import {BehaviorSubject, EMPTY, Observable} from 'rxjs';
import {
  AuthorizationCodeFlowLoginParameters,
  FlowConfig,
  ImplicitLoginParameters,
  LoginParameters,
  OAuthConfigService,
  OAuthFlows,
  OAuthStatusTypes,
  ResourceFlowLoginParameters,
  Token
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class OAuthService {

  private static readonly QUERY_ERROR = 'error';

  timer: any;
  token: Token | null = null;
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
              private zone: NgZone,
              @Inject(OAuthConfigService) private config
  ) {
    const currentToken = this.config.storage[this.config.storageKey] &&
      this.config.storage[this.config.storageKey] &&
      JSON.parse(this.config.storage[this.config.storageKey]);
    if (currentToken && currentToken.access_token) {
      this.setToken(currentToken);
      this.status.next(OAuthStatusTypes.AUTHORIZED);
    } else if (currentToken && currentToken.error) {
      this.removeToken();
      this.status.next(OAuthStatusTypes.DENIED);
    }
    const implicitRegex = new RegExp('(#access_token=)|(#error=)');
    const authCodeRegex = new RegExp('(code=)|(error=)');
    if (location.hash && implicitRegex.test(location.hash)) {
      const parametersString = location.hash.substr(1);
      const parameters = OAuthService.parseOauthUri(parametersString);
      this.cleanLocationHash();
      if (!parameters || parameters[OAuthService.QUERY_ERROR]) {
        this.removeToken();
        this.status.next(OAuthStatusTypes.DENIED);
      } else {
        this.setToken(parameters);
        this.status.next(OAuthStatusTypes.AUTHORIZED);
      }
    } else if (location.search && authCodeRegex.test(location.search)) {
      const parametersString = location.search.substr(1);
      const parameters = OAuthService.parseOauthUri(parametersString);
      const newParametersString = this.getCleanedUnSearchParameters();
      if (parameters && parameters.code) {
        const body = new HttpParams({
          fromObject: {
            code: parameters.code,
            client_id: this.config.flowConfig.clientId,
            client_secret: this.config.flowConfig.clientSecret,
            redirect_uri: `${location.origin}/${newParametersString}`,
            grant_type: 'authorization_code'
          }
        });
        const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
        this.http.post(this.config.flowConfig.tokenPath, body, {headers}).pipe(
          catchError(() => {
            this.setToken({error: 'error'});
            this.status.next(OAuthStatusTypes.DENIED);
            location.href = `${location.origin}/${newParametersString}`;
            return EMPTY;
          })
        ).subscribe(token => {
          this.setToken(token);
          this.status.next(OAuthStatusTypes.AUTHORIZED);
          location.href = `${location.origin}/${newParametersString}`;
        });
      } else {
        this.status.next(OAuthStatusTypes.DENIED);
      }
    }
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
    this.removeToken();
    this.status.next(OAuthStatusTypes.NOT_AUTHORIZED);
  }

  getStatus(): Observable<OAuthStatusTypes> {
    return this.status;
  }

  getCurrentStatus(): OAuthStatusTypes {
    return this.status.getValue();
  }

  changeFlow(type: OAuthFlows, config?: FlowConfig): void {
    this.config.flowType = type;
    if (config) {
      this.config.flowConfig = config;
    }
  }

  getCurrentFlow(): OAuthFlows {
    return this.config.flowType;
  }

  getToken(): Token {
    return this.token;
  }

  private resourceFlowLogin(parameters: ResourceFlowLoginParameters) {
    const body = new HttpParams({
      fromObject: {
        client_id: this.config.flowConfig.clientId,
        client_secret: this.config.flowConfig.clientSecret,
        grant_type: 'password',
        username: parameters.username,
        password: parameters.password
      }
    });
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    this.http.post(this.config.flowConfig.tokenPath, body, {headers}).pipe(
      catchError(() => {
        this.removeToken();
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
    const body = new HttpParams({
      fromObject: {
        client_id: this.config.flowConfig.clientId,
        client_secret: this.config.flowConfig.clientSecret,
        grant_type: 'client_credentials'
      }
    });
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});

    this.http.post(this.config.flowConfig.tokenPath, body, {headers}).pipe(
      catchError(() => {
        this.removeToken();
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

  private removeToken() {
    delete this.config.storage[this.config.storageKey];
    this.token = null;
  }

  private startExpirationTimer() {
    clearTimeout(this.timer);
    if (this.token && this.token.expires_in) {
      this.zone.runOutsideAngular(() => {
        this.timer = setTimeout(() => {
          this.zone.run(() => {
            if (this.config.flowConfig.tokenPath && this.token.refresh_token) {
              const body = new HttpParams({
                fromObject: {
                  client_id: this.config.flowConfig.clientId,
                  client_secret: this.config.flowConfig.clientSecret,
                  grant_type: 'refresh_token',
                  refresh_token: this.token.refresh_token
                }
              });
              const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
              this.http.post(this.config.flowConfig.tokenPath, body, {headers}).pipe(
                catchError(() => {
                  this.logout();
                  return EMPTY;
                })
              ).subscribe(params => {
                this.setToken(params);
                this.status.next(OAuthStatusTypes.AUTHORIZED);
              });
            } else {
              this.logout();
            }
          });
        }, Number(this.token.expires_in) * 1000);
      });
    }
  }

  private getCleanedUnSearchParameters(): string {
    let searchString = location.search.substr(1);
    const hashKeys = ['code', 'state', 'error', 'error_description'];
    hashKeys.forEach((hashKey) => {
      const re = new RegExp('&' + hashKey + '(=[^&]*)?|^' + hashKey + '(=[^&]*)?&?');
      searchString = searchString.replace(re, '');
    });
    return searchString.length ? `?${searchString}` : '';
  }

  private cleanLocationHash() {
    let curHash = location.hash.substr(1);
    const hashKeys = ['access_token', 'token_type', 'expires_in', 'scope', 'state', 'error', 'error_description'];
    hashKeys.forEach((hashKey) => {
      const re = new RegExp('&' + hashKey + '(=[^&]*)?|^' + hashKey + '(=[^&]*)?&?');
      curHash = curHash.replace(re, '');
    });
    location.hash = curHash;
  }
}
