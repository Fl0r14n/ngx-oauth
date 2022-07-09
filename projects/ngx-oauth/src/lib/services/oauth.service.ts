import {Inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {catchError, concatMap, delay, filter, map, shareReplay, switchMap, tap} from 'rxjs/operators';
import {firstValueFrom, from, noop, of, ReplaySubject, throwError} from 'rxjs';
import {
  AuthorizationCodeConfig,
  AuthorizationParameters,
  HEADER_APPLICATION,
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
  return Object.keys(params).length && params || {};
};

const jwt = (token: string) => JSON.parse(atob(token.split('.')[1]));

@Injectable()
export class OAuthService {

  state$: ReplaySubject<string> = new ReplaySubject(1);
  config$ = of(this.authConfig.config).pipe(
    filter(Boolean),
    filter(config => !!config?.clientId),
    map(config => config as OpenIdConfig),
    switchMap(config => !config.issuerPath && of(config) || this.http.get<OpenIdConfiguration>(`${config.issuerPath}/.well-known/openid-configuration`).pipe(
      tap(v => this.set({
        ...v.authorization_endpoint && {authorizePath: v.authorization_endpoint} || {},
        ...v.token_endpoint && {tokenPath: v.token_endpoint} || {},
        ...v.revocation_endpoint && {revokePath: v.revocation_endpoint} || {},
        ...v.code_challenge_methods_supported && {pkce: v.code_challenge_methods_supported.indexOf('S256') > -1} || {},
        ...v.userinfo_endpoint && {userPath: v.userinfo_endpoint} || {},
        ...v.introspection_endpoint && {introspectionPath: v.introspection_endpoint} || {},
        ...v.end_session_endpoint && {logoutPath: v.end_session_endpoint} || {},
        ...{scope: config.scope || 'openid'}
      } as any)),
      map(() => this.authConfig.config)
    )),
    shareReplay(1)
  );
  token$ = this.config$.pipe(
    tap(config => {
      const {hash, search, origin, pathname} = this.location;
      const isImplicitRedirect = hash && /(access_token=)|(error=)/.test(hash);
      const isAuthCodeRedirect = search && /(code=)|(error=)/.test(search);
      if (isImplicitRedirect) {
        const parameters = parseOauthUri(hash.substring(1));
        this.token = {
          ...parameters,
          type: OAuthType.IMPLICIT,
        };
        this.checkResponse(this.token, parameters);
      } else if (isAuthCodeRedirect) {
        const parameters = parseOauthUri(search.substring(1));
        if (!this.checkResponse(this.token, parameters)) {
          this.token = parameters;
        } else {
          const newParametersString = this.getCleanedUnSearchParameters();
          const {clientId, clientSecret, tokenPath, scope} = config as AuthorizationCodeConfig;
          const {codeVerifier} = this.token || {}; //should be set by autorizationUrl construction
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
          ).subscribe(token => {
            this.token = {
              ...token,
              type: OAuthType.AUTHORIZATION_CODE
            };
            this.locationService.replaceState(`${pathname}${newParametersString}`);
          });
        }
      }
    }),
    switchMap(() => this.tokenService.token$),
    shareReplay(1)
  );
  status$ = this.token$.pipe(
    map(token => token.access_token && OAuthStatus.AUTHORIZED || token.error && OAuthStatus.DENIED || OAuthStatus.NOT_AUTHORIZED),
    shareReplay(1)
  );
  userInfo$ = this.status$.pipe(
    filter(s => s === OAuthStatus.AUTHORIZED),
    map(() => {
      const {config} = this.authConfig as any;
      return config.userPath;
    }),
    filter(Boolean),
    switchMap(path => this.http.get<UserInfo>(path)),
    shareReplay(1)
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
  }

  login(parameters?: OAuthParameters) {
    if ((parameters as ResourceParameters).password) {
      return this.resourceLogin(parameters as ResourceParameters);
    } else if ((parameters as AuthorizationParameters).responseType && (parameters as AuthorizationParameters).redirectUri) {
      return this.toAuthorizationUrl(parameters as AuthorizationParameters);
    } else {
      return this.clientCredentialLogin();
    }
  }

  logout(useLogoutUrl?: boolean) {
    this.revoke();
    this.token = {};
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

  set(config?: OAuthTypeConfig) {
    if (config) {
      this.authConfig.config = {
        ...this.authConfig.config,
        ...config
      };
    }
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
        return throwError(() => err);
      }),
      tap(params => {
        this.token = {
          ...params,
          type: OAuthType.CLIENT_CREDENTIAL,
        };
      }),
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
        return throwError(() => err);
      }),
      tap(params => {
        this.token = {
          ...params,
          type: OAuthType.RESOURCE,
        };
      })
    ));
  }

  private async toAuthorizationUrl(parameters: AuthorizationParameters) {
    const {config} = this.authConfig as any;
    let authorizationUrl = `${config.authorizePath}`;
    authorizationUrl += config.authorizePath.includes('?') && '&' || '?';
    authorizationUrl += `client_id=${config.clientId}`;
    authorizationUrl += `&redirect_uri=${encodeURIComponent(parameters.redirectUri)}`;
    authorizationUrl += `&response_type=${parameters.responseType}`;
    authorizationUrl += `&scope=${encodeURIComponent(config.scope || '')}`;
    authorizationUrl += `&state=${encodeURIComponent(parameters.state || '')}`;
    return this.location.replace(`${authorizationUrl}${this.generateNonce(config)}${await this.generateCodeChallenge(config)}`);
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
