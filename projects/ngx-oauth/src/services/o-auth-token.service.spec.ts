import {fakeAsync, flush, TestBed, tick} from '@angular/core/testing';
import {HttpClient, provideHttpClient, withFetch} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import createSpyObj = jasmine.createSpyObj;
import Spy = jasmine.Spy;
import objectContaining = jasmine.objectContaining;
import {OAuthTokenService} from './o-auth-token.service';
import {provideOAuthConfig} from '../config';
import {OAuthHttpClient} from './o-auth-http-client';

describe('OAuthTokenService', () => {

  let httpClient: HttpClient;

  beforeEach(() => {
    localStorage.clear();
    httpClient = createSpyObj<HttpClient>(['post']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withFetch()
        ),
        provideOAuthConfig({
          config: {
            tokenPath: '/token',
            clientSecret: 'clientSecret',
            clientId: 'clientId'
          },
          storage: localStorage,
          storageKey: 'token',
          ignorePaths: []
        }),
        {
          provide: OAuthHttpClient,
          useValue: httpClient
        }
      ]
    });
  });

  it('should set existing token from storage', done => {
    const expected = {
      access_token: 'access_token',
      token_type: 'token_type',
      expires_in: 320
    };
    localStorage.setItem('token', JSON.stringify(expected));
    const tokenService = TestBed.inject(OAuthTokenService);
    tokenService.token$.subscribe(token => {
      expect(token).toEqual(expected);
      done();
    });
  });

  it('should set token', done => {
    const expected = {
      access_token: 'access_token',
      token_type: 'token_type',
      expires_in: 320
    };
    const tokenService = TestBed.inject(OAuthTokenService);
    tokenService.token = expected;
    tokenService.token$.subscribe(token => {
      expect(token).toEqual(objectContaining(expected));
      expect(tokenService.saved).toEqual(objectContaining(expected));
      done();
    });
  });

  it('should clear token', done => {
    const expected = {};
    const initial = {
      access_token: 'access_token',
      token_type: 'token_type',
      expires_in: 320
    };
    localStorage.setItem('token', JSON.stringify(initial));
    const tokenService = TestBed.inject(OAuthTokenService);
    tokenService.token = expected;
    tokenService.token$.subscribe(token => {
      expect(token).toEqual(expected);
      expect(tokenService.saved).toEqual(expected);
      done();
    });
  });

  it('should refresh token', done => {
    const expected = {
      access_token: 'access_token',
      token_type: 'token_type',
      refresh_token: 'refresh_token',
      expires_in: 320
    };
    const initial = {
      access_token: 'Mfol5uucFHBHbC9ThK0Xpi-CtTc',
      token_type: 'bearer',
      refresh_token: 'HPtx43K3nKP7y-ot1GzQAZB_7DI',
      expires_in: 34773,
      scope: 'basic openid',
      type: 'password',
      expires: 1658432377281
    };
    localStorage.setItem('token', JSON.stringify(initial));
    (httpClient.post as Spy).and.returnValue(of(expected));
    const tokenService = TestBed.inject(OAuthTokenService);
    tokenService.token$.subscribe(token => {
      expect(token).toEqual(objectContaining(expected));
      expect(tokenService.saved).toEqual(objectContaining(expected));
      done();
    });
  });

  it('should set token on refresh token', fakeAsync(() => {
    const expected = {
      access_token: 'access_token',
      token_type: 'token_type',
      refresh_token: 'refresh_token',
      expires_in: 320
    };
    const initial = {
      access_token: 'access_token',
      token_type: 'token_type',
      refresh_token: 'refresh_token',
      expires_in: 1
    };
    (httpClient.post as Spy).and.returnValue(of(expected));
    const tokenService = TestBed.inject(OAuthTokenService);
    tokenService.token = initial;
    tick(1100);
    tokenService.token$.subscribe(token => {
      expect(token).toEqual(objectContaining(expected));
      expect(tokenService.saved).toEqual(objectContaining(expected));
      flush();
    });
  }));

  it('should clear token on refresh token', fakeAsync(() => {
    const expected = {};
    const initial = {
      access_token: 'access_token',
      token_type: 'token_type',
      refresh_token: 'refresh_token',
      expires_in: 1
    };
    (httpClient.post as Spy).and.returnValue(throwError(() => new Error('refresh failed')));
    const tokenService = TestBed.inject(OAuthTokenService);
    tokenService.token = initial;
    tick(1100);
    tokenService.token$.subscribe(token => {
      expect(token).toEqual(expected);
      expect(tokenService.saved).toEqual(expected);
      flush();
    });
  }));
});
