import {Inject, Injectable, NgZone} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {catchError} from 'rxjs/operators';
import {EMPTY, ReplaySubject} from 'rxjs';
import {
  AuthorizationCodeParameters,
  ImplicitParameters,
  OAuthConfigService,
  OAuthParameters,
  OAuthStatus,
  OAuthToken,
  OAuthType,
  OAuthTypeConfig,
  ResourceParameters
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
  // tslint:disable-next-line:variable-name
  private _status: OAuthStatus;
  private timer: any;
  status$: ReplaySubject<OAuthStatus> = new ReplaySubject(1);

  constructor(private http: HttpClient,
              private zone: NgZone,
              @Inject(OAuthConfigService) private authConfig) {
    const isImplicitRedirect = location.hash && new RegExp('(#access_token=)|(#error=)').test(location.hash);
    const isAuthCodeRedirect = location.search && new RegExp('(code=)|(error=)').test(location.search);
    const savedToken = this.authConfig.storage && this.authConfig.storage[this.authConfig.storageKey] &&
      JSON.parse(this.authConfig.storage[this.authConfig.storageKey]);
    if (isImplicitRedirect) {
      const parameters = parseOauthUri(location.hash.substr(1));
      this.cleanLocationHash();
      if (!parameters || parameters[QUERY_ERROR]) {
        this.token = null;
        this.status = OAuthStatus.DENIED;
      } else {
        this.token = parameters;
        this.status = OAuthStatus.AUTHORIZED;
      }
    } else if (isAuthCodeRedirect) {
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
            grant_type: 'authorization_code'
          }
        }), {headers: REQUEST_HEADER}).pipe(
          catchError(() => {
            this.token = {error: 'error'};
            this.status = OAuthStatus.DENIED;
            location.href = `${location.origin}/${newParametersString}`;
            return EMPTY;
          })
        ).subscribe(token => {
          this.token = token;
          this.status = OAuthStatus.AUTHORIZED;
          location.href = `${location.origin}/${newParametersString}`;
        });
      } else {
        this.token = null;
        this.status = OAuthStatus.DENIED;
      }
    } else if (savedToken) {
      const {access_token, refresh_token, error} = savedToken;
      if (error) {
        this.token = null;
        this.status = OAuthStatus.DENIED;
      } else if (access_token) {
        this.token = savedToken;
        if (refresh_token) {
          this.refreshToken();
        } else {
          this.status = OAuthStatus.AUTHORIZED;
        }
      }
    } else {
      this.status = OAuthStatus.NOT_AUTHORIZED;
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
    this.status = OAuthStatus.NOT_AUTHORIZED;
  }

  get status(): OAuthStatus {
    return this._status;
  }

  set status(status) {
    this._status = status;
    this.status$.next(status);
  }

  set(type: OAuthType, config?: OAuthTypeConfig): void {
    this.authConfig.type = type;
    if (config) {
      this.authConfig.config = {
        ...this.authConfig.config,
        ...config
      };
    }
  }

  get type(): OAuthType {
    return this.authConfig.type;
  }

  get ignorePaths(): RegExp[] {
    return this.authConfig.ignorePaths;
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
        this.status = OAuthStatus.DENIED;
        return EMPTY;
      })
    ).subscribe(params => {
      this.token = params;
      this.status = OAuthStatus.AUTHORIZED;
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
        this.status = OAuthStatus.DENIED;
        return EMPTY;
      })
    ).subscribe(params => {
      this.token = params;
      this.status = OAuthStatus.AUTHORIZED;
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

  private refreshToken() {
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
        this.status = OAuthStatus.AUTHORIZED;
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