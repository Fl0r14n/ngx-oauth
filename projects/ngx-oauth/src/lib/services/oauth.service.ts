import {Inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {catchError, concatMap, delay, filter, map, shareReplay, switchMap, tap} from 'rxjs/operators';
import {EMPTY, firstValueFrom, from, noop, Observable, of, ReplaySubject} from 'rxjs';
import {
  AuthorizationCodeParameters,
  HEADER_APPLICATION,
  ImplicitParameters,
  LOCATION,
  OAuthConfig,
  OAuthParameters,
  OAuthStatus,
  OAuthToken,
  OAuthType,
  OAuthTypeConfig,
  OpenIdConfig,
  OpenIdConfiguration,
  ResourceParameters,
  UserInfo
} from '../models';
import {Location as Location2} from '@angular/common';
import {TokenService} from './token.service';

const arrToString = (buf: Uint8Array) => buf.reduce((s, b) => s + String.fromCharCode(b), '');

const base64url = (str: string) => btoa(str)
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

const randomString = (length: number = 48) => {
  const buff = arrToString(crypto.getRandomValues(new Uint8Array(length * 2)));
  return base64url(buff).substring(0, length);
};

const pkce = async (value: string) => {
  const buff = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return base64url(arrToString(new Uint8Array(buff)));
};

const parseOauthUri = (hash: string) => {
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
  return undefined;
};

const jwt = (token: string) => JSON.parse(atob(token.split('.')[1]));

@Injectable()
export class OAuthService {

  private _status = OAuthStatus.NOT_AUTHORIZED;
  state$: ReplaySubject<string> = new ReplaySubject(1);
  status$: ReplaySubject<OAuthStatus> = new ReplaySubject(1);
  userInfo$: Observable<UserInfo> = this.status$.pipe(
    filter(s => s === OAuthStatus.AUTHORIZED),
    map(() => {
      const {config} = this.authConfig as any;
      return config.userPath;
    }),
    filter(p => !!p),
    switchMap(path => this.http.get<UserInfo>(path)),
    shareReplay()
  );

  get token() {
    return this.tokenService.token;
  }

  set token(token) {
    this.tokenService.token = token;
  }

  constructor(protected http: HttpClient,
              protected authConfig: OAuthConfig,
              protected tokenService: TokenService,
              @Inject(LOCATION) protected location: Location,
              protected locationService: Location2) {
    setTimeout(() => this.init()); // decouple for http interceptor
  }

  /**
   * Get the oauth config for initialize. If OpenId with issuerPath is configured then configure from server openid configuration.
   * @protected
   */
  protected get config$() {
    let {config} = this.authConfig;
    if (config && config.clientId) {
      const {issuerPath, scope} = config as OpenIdConfig;
      if (issuerPath) {
        return this.http.get<OpenIdConfiguration>(`${issuerPath}/.well-known/openid-configuration`).pipe(
          tap(v => this.type && this.set(this.type, {
            ...v.authorization_endpoint && {authorizePath: v.authorization_endpoint} || {},
            ...v.token_endpoint && {tokenPath: v.token_endpoint} || {},
            ...v.revocation_endpoint && {revokePath: v.revocation_endpoint} || {},
            ...v.code_challenge_methods_supported && {pkce: v.code_challenge_methods_supported.indexOf('S256') > -1} || {},
            ...v.userinfo_endpoint && {userPath: v.userinfo_endpoint} || {},
            ...v.introspection_endpoint && {introspectionPath: v.introspection_endpoint} || {},
            ...v.end_session_endpoint && {logoutPath: v.end_session_endpoint} || {},
            ...scope && {} || {scope: 'openid'}
          } as any)),
          map(() => this.authConfig.config)
        );
      }
      return of(config);
    }
    console.warn('clientId is missing in oauth config');
    return EMPTY;
  }

  /**
   * Init. Will check the url implicit or authorization flow or existing saved token.
   * @protected
   */
  protected init(): void {
    const {hash, search, origin, pathname} = this.location;
    const isImplicitRedirect = hash && /(access_token=)|(error=)/.test(hash);
    const isAuthCodeRedirect = search && /(code=)|(error=)/.test(search);
    this.config$.subscribe(config => {
      if (isImplicitRedirect) {
        const parameters = parseOauthUri(hash.substr(1));
        this.token = {
          ...parameters,
          type: OAuthType.IMPLICIT,
        };
        this.status = this.checkResponse(this.token, parameters) && OAuthStatus.AUTHORIZED || OAuthStatus.DENIED;
      } else if (isAuthCodeRedirect) {
        const parameters = parseOauthUri(search.substr(1));
        if (!this.checkResponse(this.token, parameters)) {
          this.token = parameters;
          this.status = OAuthStatus.DENIED;
        } else {
          const newParametersString = this.getCleanedUnSearchParameters();
          const {clientId, clientSecret, tokenPath, scope} = config as any;
          const {codeVerifier} = this.token || {};
          this.http.post(tokenPath, new HttpParams({
            fromObject: {
              code: parameters?.['code'],
              client_id: clientId,
              ...clientSecret && {client_secret: clientSecret} || {},
              redirect_uri: `${origin}${pathname}`,
              grant_type: 'authorization_code',
              ...scope && {scope} || {},
              ...codeVerifier && {code_verifier: codeVerifier} || {}
            }
          }), {headers: HEADER_APPLICATION}).pipe(
            catchError((err) => {
              this.token = err;
              this.status = OAuthStatus.DENIED;
              this.locationService.replaceState(`${pathname}${newParametersString}`);
              return EMPTY;
            })
          ).subscribe(token => {
            this.token = {
              ...token,
              type: OAuthType.AUTHORIZATION_CODE
            };
            this.status = OAuthStatus.AUTHORIZED;
            this.locationService.replaceState(`${pathname}${newParametersString}`);
          });
        }
      } else if (this.token) {
        const {access_token, refresh_token, error} = this.token;
        if (access_token) {
          this.status = OAuthStatus.AUTHORIZED;
        } else {
          this.status = error && OAuthStatus.DENIED || OAuthStatus.NOT_AUTHORIZED;
        }
      } else {
        this.status = OAuthStatus.NOT_AUTHORIZED;
      }
    });
  }

  async login(parameters?: OAuthParameters) {
    if (this.isResourceType(parameters as ResourceParameters)) {
      await this.resourceLogin(parameters as ResourceParameters);
    } else if (this.isAuthorizationCodeType(parameters as AuthorizationCodeParameters)) {
      await this.authorizationCodeLogin(parameters as AuthorizationCodeParameters);
    } else if (this.isImplicitType(parameters as ImplicitParameters)) {
      await this.implicitLogin(parameters as ImplicitParameters);
    } else if (this.isClientCredentialType()) {
      await this.clientCredentialLogin();
    }
  }

  logout(useLogoutUrl?: boolean) {
    this.revoke();
    this.token = undefined;
    this.status = OAuthStatus.NOT_AUTHORIZED;
    const {logoutPath, logoutRedirectUri} = this.authConfig.config as any;
    if (useLogoutUrl && logoutPath) {
      const {origin, pathname} = this.location;
      const currentPath = `${origin}${pathname}`;
      this.location.replace(`${logoutPath}?post_logout_redirect_uri=${logoutRedirectUri || currentPath}`);
    }
  }

  revoke() {
    const {revokePath, clientId, clientSecret} = this.authConfig.config as any;
    if (revokePath) {
      const {access_token, refresh_token} = this.token || {};
      const toRevoke = [];
      if (access_token) {
        toRevoke.push({
          ...clientId && {client_id: clientId} || {},
          ...clientSecret && {client_secret: clientSecret} || {},
          token: access_token,
          token_type_hint: 'access_token'
        });
      }
      if (refresh_token) {
        toRevoke.push({
          ...clientId && {client_id: clientId} || {},
          ...clientSecret && {client_secret: clientSecret} || {},
          token: refresh_token,
          token_type_hint: 'refresh_token'
        });
      }
      from(toRevoke).pipe(
        concatMap(o => of(o).pipe(delay(300))), // space request to avoid cancellation
        switchMap(o => this.http.post(revokePath, new HttpParams({fromObject: o}))),
      ).subscribe(noop);
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

  get type() {
    return this.authConfig.type;
  }

  get ignorePaths(): RegExp[] {
    return this.authConfig.ignorePaths || [];
  }

  private async clientCredentialLogin() {
    const {clientId, clientSecret, tokenPath, scope} = this.authConfig.config as any;
    await firstValueFrom(this.http.post(tokenPath, new HttpParams({
      fromObject: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: OAuthType.CLIENT_CREDENTIAL,
        ...scope ? {scope} : {},
      }
    }), {headers: HEADER_APPLICATION}).pipe(
      catchError((err) => {
        this.token = err;
        this.status = OAuthStatus.DENIED;
        return EMPTY;
      }),
      tap(params => {
        this.token = {
          ...params,
          type: OAuthType.CLIENT_CREDENTIAL,
        };
        this.status = OAuthStatus.AUTHORIZED;
      })
    ));
  }

  private async resourceLogin(parameters: ResourceParameters) {
    const {clientId, clientSecret, tokenPath, scope} = this.authConfig.config as any;
    const {username, password} = parameters;
    await firstValueFrom(this.http.post(tokenPath, new HttpParams({
      fromObject: {
        client_id: clientId,
        ...clientSecret && {client_secret: clientSecret} || {},
        grant_type: OAuthType.RESOURCE,
        ...scope && {scope} || {},
        username,
        password
      }
    }), {headers: HEADER_APPLICATION}).pipe(
      catchError(err => {
        this.token = err;
        this.status = OAuthStatus.DENIED;
        return EMPTY;
      }),
      tap(params => {
        this.token = {
          ...params,
          type: OAuthType.RESOURCE,
        };
        this.status = OAuthStatus.AUTHORIZED;
      })
    ));
  }

  private async implicitLogin(parameters: ImplicitParameters) {
    const authUrl = await this.toAuthorizationUrl(parameters, OAuthType.IMPLICIT);
    this.location.replace(authUrl);
  }

  private async authorizationCodeLogin(parameters: AuthorizationCodeParameters) {
    const authUrl = await this.toAuthorizationUrl(parameters, OAuthType.AUTHORIZATION_CODE);
    this.location.replace(authUrl);
  }

  private isClientCredentialType(): boolean {
    return this.type === OAuthType.CLIENT_CREDENTIAL;
  }

  private isResourceType(parameters?: ResourceParameters): boolean {
    return this.type === OAuthType.RESOURCE && !!parameters?.password;
  }

  private isImplicitType(parameters?: ImplicitParameters): boolean {
    return this.type === OAuthType.IMPLICIT && !!parameters?.redirectUri;
  }

  private isAuthorizationCodeType(parameters?: AuthorizationCodeParameters): boolean {
    return this.type === OAuthType.AUTHORIZATION_CODE && !!parameters?.redirectUri;
  }

  private async toAuthorizationUrl(parameters: AuthorizationCodeParameters | ImplicitParameters, responseType: OAuthType): Promise<string> {
    const {config} = this.authConfig as any;
    let authorizationUrl = `${config.authorizePath}`;
    authorizationUrl += config.authorizePath.includes('?') && '&' || '?';
    authorizationUrl += `client_id=${config.clientId}`;
    authorizationUrl += `&redirect_uri=${encodeURIComponent(parameters.redirectUri)}`;
    authorizationUrl += `&response_type=${responseType}`;
    authorizationUrl += `&scope=${encodeURIComponent(config.scope || '')}`;
    authorizationUrl += `&state=${encodeURIComponent(parameters.state || '')}`;
    return `${authorizationUrl}${this.generateNonce(config)}${await this.generateCodeChallenge(config)}`;
  }

  private async generateCodeChallenge(config: any) {
    if (config.pkce) {
      const codeVerifier = randomString();
      this.token = {...this.token, codeVerifier};
      return `&code_challenge=${await pkce(codeVerifier)}&code_challenge_method=S256`;
    }
    return '';
  }

  private generateNonce(config: any) {
    if (config && config.scope && config.scope.indexOf('openid') > -1) {
      const nonce = randomString(10);
      this.token = {...this.token, nonce};
      return `&nonce=${nonce}`;
    }
    return '';
  }

  private checkResponse(token?: OAuthToken,
                        parameters?: Record<string, string>) {
    this.emitState(parameters);
    this.cleanLocationHash();
    if (!parameters || parameters['error']) {
      return false;
    }
    if (token && token.nonce && parameters['access_token']) {
      const jwtToken = jwt(parameters['access_token']);
      return token.nonce === jwtToken.nonce;
    }
    return parameters['access_token'] || parameters['code'];
  }

  private getCleanedUnSearchParameters() {
    const {search} = this.location;
    let searchString = search.substring(1);
    const hashKeys = ['code', 'state', 'error', 'error_description', 'session_state', 'scope', 'authuser', 'prompt'];
    hashKeys.forEach(hashKey => {
      const re = new RegExp('&' + hashKey + '(=[^&]*)?|^' + hashKey + '(=[^&]*)?&?');
      searchString = searchString.replace(re, '');
    });
    return searchString.length && `?${searchString}` || '';
  }

  private cleanLocationHash() {
    const {hash} = this.location;
    let curHash = hash.substring(1);
    const hashKeys = ['access_token', 'token_type', 'expires_in', 'scope', 'state', 'error', 'error_description', 'session_state', 'nonce'];
    hashKeys.forEach(hashKey => {
      const re = new RegExp('&' + hashKey + '(=[^&]*)?|^' + hashKey + '(=[^&]*)?&?');
      curHash = curHash.replace(re, '');
    });
    this.location.hash = curHash;
  }

  private emitState(parameters?: Record<string, string>) {
    const {state} = parameters || {};
    state && this.state$.next(state);
  }
}
