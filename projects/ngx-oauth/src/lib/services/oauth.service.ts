import {Inject, Injectable, NgZone} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {catchError, concatMap, delay, switchMap} from 'rxjs/operators';
import {EMPTY, from, of, ReplaySubject} from 'rxjs';
import {
  AuthorizationCodeParameters,
  ImplicitParameters,
  LOCATION,
  OAUTH_CONFIG,
  OAuthParameters,
  OAuthStatus,
  OAuthToken,
  OAuthType,
  OAuthTypeConfig,
  ResourceParameters
} from '../models';

const REQUEST_HEADER = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});

const parseOauthUri = (hash: string): Record<string, string> => {
  const regex = /([^&=]+)=([^&]*)/g;
  const params: Record<string, string> = {};
  let m;
  // tslint:disable-next-line:no-conditional-assignment
  while ((m = regex.exec(hash)) !== null) {
    params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
  }
  if (Object.keys(params).length) {
    return params;
  }
};

@Injectable()
export class OAuthService {

  private _token: OAuthToken | null = null;
  private _status: OAuthStatus;
  private timer: any;
  state$: ReplaySubject<string> = new ReplaySubject(1);
  status$: ReplaySubject<OAuthStatus> = new ReplaySubject(1);

  constructor(private http: HttpClient,
              private zone: NgZone,
              @Inject(OAUTH_CONFIG) private authConfig,
              @Inject(LOCATION) private locationService) {
    this.init();
  }

  protected init() {
    const {hash, search, origin} = this.locationService;
    const isImplicitRedirect = hash && new RegExp('(#access_token=)|(#error=)').test(hash);
    const isAuthCodeRedirect = search && new RegExp('(code=)|(error=)').test(search);
    const {storageKey} = this.authConfig;
    const savedToken = storageKey && this.authConfig.storage && this.authConfig.storage[storageKey] &&
      JSON.parse(this.authConfig.storage[storageKey]);
    if (isImplicitRedirect) {
      const parameters = parseOauthUri(hash.substr(1));
      this.emitState(parameters);
      this.cleanLocationHash();
      if (!parameters || parameters.error) {
        this.token = null;
        this.status = OAuthStatus.DENIED;
      } else {
        this.token = parameters;
        this.status = OAuthStatus.AUTHORIZED;
      }
    } else if (isAuthCodeRedirect) {
      const parameters = parseOauthUri(search.substr(1));
      this.emitState(parameters);
      const newParametersString = this.getCleanedUnSearchParameters();
      if (parameters && parameters.code) {
        const {clientId, clientSecret, tokenPath} = this.authConfig.config;
        setTimeout(() => {
          this.http.post(tokenPath, new HttpParams({
            fromObject: {
              code: parameters.code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: `${origin}/${newParametersString}`,
              grant_type: 'authorization_code'
            }
          }), {headers: REQUEST_HEADER}).pipe(
            catchError((err) => {
              this.token = {error: 'error'};
              this.status = OAuthStatus.DENIED;
              this.locationService.href = `${origin}/${newParametersString}`;
              return EMPTY;
            })
          ).subscribe(token => {
            this.token = token;
            // authorized event will be triggered after redirect
            this.locationService.href = `${origin}/${newParametersString}`;
          });
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
          setTimeout(() => {
            this.refreshToken();
          });
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
    this.revoke();
    this.token = null;
    this.status = OAuthStatus.NOT_AUTHORIZED;
  }

  revoke() {
    const {revokePath, clientId, clientSecret} = this.authConfig.config;
    if (revokePath) {
      const {access_token, refresh_token} = this.token;
      const toRevoke = [];
      if (access_token) {
        toRevoke.push({
          ...clientId ? {client_id: clientId} : {},
          ...clientSecret ? {client_secret: clientSecret} : {},
          token: access_token,
          token_type_hint: 'access_token'
        });
      }
      if (refresh_token) {
        toRevoke.push({
          ...clientId ? {client_id: clientId} : {},
          ...clientSecret ? {client_secret: clientSecret} : {},
          token: refresh_token,
          token_type_hint: 'refresh_token'
        });
      }
      from(toRevoke).pipe(
        concatMap(o => of(o).pipe(delay(300))), // space request to avoid cancellation
        switchMap(o => this.http.post(revokePath, new HttpParams({fromObject: o}))),
      ).subscribe(() => {
      });
    }
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
    return this.authConfig.ignorePaths || [];
  }

  private resourceLogin(parameters: ResourceParameters) {
    const {clientId, clientSecret, tokenPath, scope} = this.authConfig.config;
    const {username, password} = parameters;
    this.http.post(tokenPath, new HttpParams({
      fromObject: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: OAuthType.RESOURCE,
        ...scope ? {scope} : {},
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
    this.locationService.replace(authUrl);
  }

  private implicitLogin(parameters: ImplicitParameters) {
    const authUrl = this.toAuthorizationUrl(parameters, OAuthType.IMPLICIT);
    this.locationService.replace(authUrl);
  }

  private clientCredentialLogin() {
    const {clientId, clientSecret, tokenPath, scope} = this.authConfig.config;
    this.http.post(tokenPath, new HttpParams({
      fromObject: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: OAuthType.CLIENT_CREDENTIAL,
        ...scope ? {scope} : {},
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

  private isClientCredentialType(parameters?: OAuthParameters): parameters is undefined {
    return this.authConfig.type === OAuthType.CLIENT_CREDENTIAL;
  }

  private isResourceType(parameters?: OAuthParameters): parameters is ResourceParameters {
    return this.authConfig.type === OAuthType.RESOURCE && parameters && !!(parameters as ResourceParameters).password;
  }

  private isImplicitType(parameters?: OAuthParameters): parameters is ImplicitParameters {
    return this.authConfig.type === OAuthType.IMPLICIT && parameters && !!(parameters as ImplicitParameters).redirectUri;
  }

  private isAuthorizationCodeType(parameters?: OAuthParameters): parameters is AuthorizationCodeParameters {
    return this.authConfig.type === OAuthType.AUTHORIZATION_CODE && parameters && !!(parameters as ImplicitParameters).redirectUri;
  }

  private toAuthorizationUrl(parameters: AuthorizationCodeParameters | ImplicitParameters, responseType): string {
    const appendChar = this.authConfig.config.authorizePath.includes('?') ? '&' : '?';
    const clientId = `${appendChar}client_id=${this.authConfig.config.clientId}`;
    const redirectUri = `&redirect_uri=${encodeURIComponent(parameters.redirectUri)}`;
    const responseTypeString = `&response_type=${responseType}`;
    const scope = `&scope=${encodeURIComponent(parameters.scope || this.authConfig.config.scope || '')}`;
    const state = `&state=${encodeURIComponent(parameters.state || '')}`;
    const parametersString = `${clientId}${redirectUri}${responseTypeString}${scope}${state}`;
    return `${this.authConfig.config.authorizePath}${parametersString}`;
  }

  set token(token: OAuthToken | null) {
    this._token = token;
    const storageKey = this.authConfig;
    if (token) {
      this.authConfig.storage[storageKey] = JSON.stringify(this.token);
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
      delete this.authConfig.storage[storageKey];
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
        catchError((err) => {
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
    const {search} = this.locationService;
    let searchString = search.substr(1);
    const hashKeys = ['code', 'state', 'error', 'error_description', 'session_state'];
    hashKeys.forEach((hashKey) => {
      const re = new RegExp('&' + hashKey + '(=[^&]*)?|^' + hashKey + '(=[^&]*)?&?');
      searchString = searchString.replace(re, '');
    });
    return searchString.length ? `?${searchString}` : '';
  }

  private cleanLocationHash() {
    const {hash} = this.locationService;
    let curHash = hash.substr(1);
    const hashKeys = ['access_token', 'token_type', 'expires_in', 'scope', 'state', 'error', 'error_description', 'session_state'];
    hashKeys.forEach((hashKey) => {
      const re = new RegExp('&' + hashKey + '(=[^&]*)?|^' + hashKey + '(=[^&]*)?&?');
      curHash = curHash.replace(re, '');
    });
    this.locationService.hash = curHash;
  }

  private emitState(parameters) {
    const {state} = parameters;
    if (state) {
      this.state$.next(state);
    }
  }
}
