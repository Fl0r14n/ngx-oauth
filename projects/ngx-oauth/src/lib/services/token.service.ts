import {Inject, Injectable, NgZone} from '@angular/core';
import {BehaviorSubject, distinctUntilChanged, Observable, of, switchMap} from 'rxjs';
import {HEADER_APPLICATION, OAUTH_HTTP_CLIENT, OAuthConfig, OAuthToken} from '../models';
import {catchError, map, shareReplay} from 'rxjs/operators';
import {HttpClient, HttpParams} from '@angular/common/http';

const isExpiredToken = (token?: OAuthToken) => token && token.expires && Date.now() > token.expires || false;

@Injectable()
export class TokenService {

  #token$ = new BehaviorSubject<OAuthToken>(this.saved);
  token$ = this.#token$.pipe(
    distinctUntilChanged((p, c) => JSON.stringify(p || null) === JSON.stringify(c || null)),
    switchMap(token => !isExpiredToken(token) && of(token) || this.refreshToken(token)),
    shareReplay(1)
  );
  type$ = this.token$.pipe(
    map(token => token?.type),
    shareReplay(1)
  );
  accessToken$ = this.token$.pipe(
    map(token => token?.access_token),
    shareReplay(1),
  );

  constructor(protected authConfig: OAuthConfig,
              @Inject(OAUTH_HTTP_CLIENT) protected http: HttpClient,
              protected zone: NgZone) {
  }

  get token() {
    return this.#token$.value;
  }

  set token(token) {
    const expiresIn = Number(token.expires_in) || 0;
    const result = {
      ...token,
      ...expiresIn && {expires: Date.now() + expiresIn * 1000} || {}
    };
    this.saved = result;
    this.#token$.next(result);
  }

  get saved() {
    const {storageKey, storage} = this.authConfig;
    return storageKey && storage && storage[storageKey] && JSON.parse(storage[storageKey]) || {};
  }

  set saved(token: OAuthToken) {
    const {storageKey, storage} = this.authConfig;
    if (storage && storageKey) {
      if (token) {
        storage[storageKey] = JSON.stringify(token);
      } else {
        delete storage[storageKey];
      }
    }
  }

  protected refreshToken(token?: OAuthToken): Observable<OAuthToken> {
    const {tokenPath, clientId, clientSecret, scope} = this.authConfig.config as any;
    const {refresh_token} = token || {};
    return tokenPath && refresh_token && this.http.post<OAuthToken>(tokenPath, new HttpParams({
      fromObject: {
        client_id: clientId,
        ...clientSecret && {client_secret: clientSecret} || {},
        grant_type: 'refresh_token',
        refresh_token,
        ...scope && {scope} || {},
      }
    }), {
      headers: HEADER_APPLICATION
    }).pipe(
      catchError(() => {
        this.token = {};
        return of(this.token);
      }),
      map(token => {
        this.token = {
          ...this.token,
          ...token
        };
        return this.token;
      })
    ) || of(token);
  }
}
