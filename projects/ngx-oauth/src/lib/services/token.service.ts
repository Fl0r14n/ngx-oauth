import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject, distinctUntilChanged, EMPTY, of, switchMap} from 'rxjs';
import {HEADER_APPLICATION, OAuthConfig, OAuthToken} from '../models';
import {catchError} from 'rxjs/operators';
import {HttpClient, HttpParams} from '@angular/common/http';

const isExpiredToken = (token?: OAuthToken) => token && token.expires && Date.now() > token.expires || false;

@Injectable()
export class TokenService {

  #token$ = new BehaviorSubject<OAuthToken | undefined>(this.saved);
  token$ = this.#token$.pipe(
    distinctUntilChanged((p, c) => JSON.stringify(p || null) === JSON.stringify(c || null)),
    switchMap(token => !isExpiredToken(token) && of(token) || this.refreshToken(token)),
  );

  constructor(protected authConfig: OAuthConfig,
              protected http: HttpClient,
              protected zone: NgZone) {
  }

  get token() {
    return this.#token$.value;
  }

  set token(token) {
    if (token) {
      const {expires_in} = token;
      this.saved = {
        ...token,
        ...expires_in && {expires: Date.now() + Number(token.expires_in) * 1000} || {}
      };
      this.#token$.next(token);
    }
  }

  protected get saved() {
    const {storageKey, storage} = this.authConfig;
    return storageKey && storage && storage[storageKey] && JSON.parse(storage[storageKey]);
  }

  protected set saved(token: OAuthToken | undefined) {
    const {storageKey, storage} = this.authConfig;
    if (storage && storageKey) {
      if (token) {
        storage[storageKey] = JSON.stringify(token);
      } else {
        delete storage[storageKey];
      }
    }
  }

  protected refreshToken(token?: OAuthToken) {
    const {tokenPath, clientId, clientSecret, scope} = this.authConfig.config as any;
    const {refresh_token} = token || {};
    return tokenPath && refresh_token && this.http.post(tokenPath, new HttpParams({
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
        this.token = undefined;
        return EMPTY;
      }),
      switchMap(token => {
        this.token = {
          ...this.token,
          ...token
        };
        return EMPTY;
      })
    );
  }
}
