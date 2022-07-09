import {fakeAsync, flush, TestBed, tick} from '@angular/core/testing';
import {TokenService} from './token.service';
import {provideOAuthConfig} from '../models';
import {HttpClient} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import createSpyObj = jasmine.createSpyObj;
import Spy = jasmine.Spy;

describe('TokenService', () => {

  let httpClient: HttpClient;

  beforeEach(() => {
    localStorage.clear();
    httpClient = createSpyObj<HttpClient>(['post']);
    TestBed.configureTestingModule({
      providers: [
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
          provide: HttpClient,
          useValue: httpClient
        },
        TokenService,
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
    const tokenService = TestBed.inject(TokenService);
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
    const tokenService = TestBed.inject(TokenService);
    tokenService.token = expected;
    tokenService.token$.subscribe(token => {
      expect(token).toEqual(jasmine.objectContaining(expected));
      expect(tokenService.saved).toEqual(jasmine.objectContaining(expected));
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
    const tokenService = TestBed.inject(TokenService);
    tokenService.token = expected;
    tokenService.token$.subscribe(token => {
      expect(token).toEqual(expected);
      expect(tokenService.saved).toEqual(expected);
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
    const tokenService = TestBed.inject(TokenService);
    tokenService.token = initial;
    tick(1500);
    tokenService.token$.subscribe(token => {
      expect(token).toEqual(jasmine.objectContaining(expected));
      expect(tokenService.saved).toEqual(jasmine.objectContaining(expected));
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
    const tokenService = TestBed.inject(TokenService);
    tokenService.token = initial;
    tick(1500);
    tokenService.token$.subscribe(token => {
      expect(token).toEqual(expected);
      expect(tokenService.saved).toEqual(expected);
      flush();
    });
  }));
});
