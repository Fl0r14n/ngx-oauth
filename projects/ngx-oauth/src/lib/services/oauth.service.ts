import {Inject, Injectable, NgZone} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {catchError} from 'rxjs/operators';
import {BehaviorSubject, EMPTY} from 'rxjs';
import {
  AuthorizationCodeParameters,
  OAuthTypeConfig,
  ImplicitParameters,
  OAuthParameters,
  OAuthConfigService,
  OAuthType,
  OAuthStatus,
  ResourceParameters,
  OAuthToken
} from '../models';

const QUERY_ERROR = 'error';
const REQUEST_HEADER = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});

const parseOauthUri = (hash: string) => {
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
};

@Injectable({
  providedIn: 'root'
})
export class OAuthService {

  // tslint:disable-next-line:variable-name
  private _token: OAuthToken | null = null;
  timer: any;
  status$: BehaviorSubject<OAuthStatus> = new BehaviorSubject(OAuthStatus.NOT_AUTHORIZED);

  constructor(private http: HttpClient,
              private zone: NgZone,
              @Inject(OAuthConfigService) private authConfig) {
    // do we have a saved token?
    const currentToken = this.authConfig.storage && this.authConfig.storage[this.authConfig.storageKey] &&
      JSON.parse(this.authConfig.storage[this.authConfig.storageKey]);
    if (currentToken && currentToken.access_token) {
      this.token = currentToken;
      if (this.token.refresh_token) {
        this.refreshToken();
      } else {
        this.status$.next(OAuthStatus.AUTHORIZED);
      }
    } else if (currentToken && currentToken.error) {
      this.token = null;
      this.status$.next(OAuthStatus.DENIED);
    }
    // check if we are redirected back from implicit or auth code flow
    const implicitRegex = new RegExp('(#access_token=)|(#error=)');
    const authCodeRegex = new RegExp('(code=)|(error=)');
    if (location.hash && implicitRegex.test(location.hash)) {
      const parameters = parseOauthUri(location.hash.substr(1));
      this.cleanLocationHash();
      if (!parameters || parameters[QUERY_ERROR]) {
        this.token = null;
        this.status$.next(OAuthStatus.DENIED);
      } else {
        this.token = parameters;
        this.status$.next(OAuthStatus.AUTHORIZED);
      }
    } else if (location.search && authCodeRegex.test(location.search)) {
      const parameters = parseOauthUri(location.search.substr(1));
      const newParametersString = this.getCleanedUnSearchParameters();
      if (parameters && parameters.code) {
        const {clientId, clientSecret, tokenPath} = this.authConfig.config;
        this.http.post(tokenPath, new HttpParams({
          fromObject: {
            code: parameters.code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${location.origin}/${newParametersString}`,
            grant_type: OAuthType.AUTHORIZATION_CODE
          }
        }), {headers: REQUEST_HEADER}).pipe(
          catchError(() => {
            this.token = {error: 'error'};
            this.status$.next(OAuthStatus.DENIED);
            location.href = `${location.origin}/${newParametersString}`;
            return EMPTY;
          })
        ).subscribe(token => {
          this.token = token;
          this.status$.next(OAuthStatus.AUTHORIZED);
          location.href = `${location.origin}/${newParametersString}`;
        });
      } else {
        this.status$.next(OAuthStatus.DENIED);
      }
    }
  }

  login(parameters?: OAuthParameters) {
    if (this.isResourceType(parameters)) {
      this.resourceLogin(parameters);
    } else if (this.isAuthorizationCodeType(parameters)) {
      this.authorizationCodeLogin(parameters);
    } else if (this.isImplicitType(parameters)) {
      this.implicitLogin(parameters);
    } else if (this.isClientCredentialType(parameters)) {
      this.clientCredentialLogin();
    }
  }

  logout() {
    this.token = null;
    this.status$.next(OAuthStatus.NOT_AUTHORIZED);
  }

  get status(): OAuthStatus {
    return this.status$.getValue();
  }

  set(type: OAuthType, config?: OAuthTypeConfig): void {
    this.authConfig.type = type;
    if (config) {
      this.authConfig.config = config;
    }
  }

  get type(): OAuthType {
    return this.authConfig.type;
  }

  private resourceLogin(parameters: ResourceParameters) {
    const {clientId, clientSecret, tokenPath} = this.authConfig.config;
    const {username, password} = parameters;
    this.http.post(tokenPath, new HttpParams({
      fromObject: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: OAuthType.RESOURCE,
        username,
        password
      }
    }), {headers: REQUEST_HEADER}).pipe(
      catchError(() => {
        this.token = null;
        this.status$.next(OAuthStatus.DENIED);
        return EMPTY;
      })
    ).subscribe(params => {
      this.token = params;
      this.status$.next(OAuthStatus.AUTHORIZED);
    });
  }

  private authorizationCodeLogin(parameters: AuthorizationCodeParameters) {
    const authUrl = this.toAuthorizationUrl(parameters, OAuthType.AUTHORIZATION_CODE);
    location.replace(authUrl);
  }

  private implicitLogin(parameters: ImplicitParameters) {
    const authUrl = this.toAuthorizationUrl(parameters, OAuthType.IMPLICIT);
    location.replace(authUrl);
  }

  private clientCredentialLogin() {
    const {clientId, clientSecret, tokenPath} = this.authConfig.config;
    this.http.post(tokenPath, new HttpParams({
      fromObject: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: OAuthType.CLIENT_CREDENTIAL
      }
    }), {headers: REQUEST_HEADER}).pipe(
      catchError(() => {
        this.token = null;
        this.status$.next(OAuthStatus.DENIED);
        return EMPTY;
      })
    ).subscribe(params => {
      this.token = params;
      this.status$.next(OAuthStatus.AUTHORIZED);
    });
  }

  private isResourceType(parameters?: OAuthParameters): parameters is ResourceParameters {
    return this.authConfig.type === OAuthType.RESOURCE && parameters && !!(parameters as ResourceParameters).password;
  }

  private isAuthorizationCodeType(parameters?: OAuthParameters): parameters is AuthorizationCodeParameters {
    return this.authConfig.type === OAuthType.AUTHORIZATION_CODE && parameters && !!(parameters as ImplicitParameters).redirectUri;
  }

  private isImplicitType(parameters?: OAuthParameters): parameters is ImplicitParameters {
    return this.authConfig.type === OAuthType.IMPLICIT && parameters && !!(parameters as ImplicitParameters).redirectUri;
  }

  private isClientCredentialType(parameters?: OAuthParameters): parameters is undefined {
    return this.authConfig.type === OAuthType.CLIENT_CREDENTIAL;
  }

  private toAuthorizationUrl(parameters: AuthorizationCodeParameters | ImplicitParameters, responseType): string {
    const appendChar = this.authConfig.config.authorizePath.includes('?') ? '&' : '?';
    const clientId = `${appendChar}client_id=${this.authConfig.config.clientId}`;
    const redirectUri = `&redirect_uri=${encodeURIComponent(parameters.redirectUri)}`;
    const responseTypeString = `&response_type=${responseType}`;
    const scope = `&scope=${encodeURIComponent(parameters.scope || '')}`;
    const state = `&state=${encodeURIComponent(parameters.state || '')}`;
    const parametersString = `${clientId}${redirectUri}${responseTypeString}${scope}${state}`;
    return `${this.authConfig.config.authorizePath}${parametersString}`;
  }

  set token(token: OAuthToken | null) {
    this._token = token;
    if (token) {
      this.authConfig.storage[this.authConfig.storageKey] = JSON.stringify(this.token);
      clearTimeout(this.timer);
      if (this.token && this.token.expires_in) {
        this.zone.runOutsideAngular(() => {
          this.timer = setTimeout(() => {
            this.zone.run(() => {
              this.refreshToken();
            });
          }, Number(this.token.expires_in) * 1000);
        });
      }
    } else {
      delete this.authConfig.storage[this.authConfig.storageKey];
    }
  }

  get token() {
    return this._token;
  }

  refreshToken() {
    const {tokenPath, clientId, clientSecret} = this.authConfig.config;
    const {refresh_token} = this.token;
    if (tokenPath && refresh_token) {
      this.http.post(tokenPath, new HttpParams({
        fromObject: {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token
        }
      }), {headers: REQUEST_HEADER}).pipe(
        catchError(() => {
          this.logout();
          return EMPTY;
        })
      ).subscribe(params => {
        this.token = params;
        this.status$.next(OAuthStatus.AUTHORIZED);
      });
    } else {
      this.logout();
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
