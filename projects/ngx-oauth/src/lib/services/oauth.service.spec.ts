import {OAuthService} from './oauth.service';
import Spy = jasmine.Spy;
import {of, throwError} from 'rxjs';
import {fakeAsync, flush, tick} from '@angular/core/testing';
import {NgZone} from '@angular/core';
import {OAuthType, OAuthStatus} from '../models';
import createSpyObj = jasmine.createSpyObj;
import {TestScheduler} from 'rxjs/testing';

describe('OAuthService', () => {
  let oauthService: OAuthService;
  let http: any;
  let zone: any;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
    http = createSpyObj(['post']);
    zone = new NgZone({});
    oauthService = new OAuthService(http, zone, {
      type: OAuthType.RESOURCE,
      config: {
        tokenPath: '/token',
        clientSecret: 'clientSecret',
        clientId: 'clientId'
      },
      storage: localStorage,
      storageKey: 'token'
    }, location);
    localStorage.clear();
    location.hash = '';
  });

  describe('When service initialize', () => {

    it('should set the token if the token is present in storage', () => {
      testScheduler.run(({expectObservable}) => {
        const token = {
          access_token: 'access_token',
          token_type: 'token_type',
          expires_in: 320
        };
        (http.post as Spy).and.returnValue(of(token));
        localStorage.setItem('token', JSON.stringify(token));
        oauthService = new OAuthService(http, zone, {
          type: OAuthType.RESOURCE,
          config: {
            tokenPath: '/token',
            clientSecret: 'clientSecret',
            clientId: 'clientId'
          },
          storage: localStorage,
          storageKey: 'token'
        }, location);
        expectObservable(oauthService.status$).toBe('a', {a: OAuthStatus.AUTHORIZED});
        expect(oauthService.token).toEqual(token);
      });
    });

    it('should denied if the token contains error', () => {
      testScheduler.run(({expectObservable}) => {
        localStorage.setItem('token', JSON.stringify({
          error: 'error'
        }));
        oauthService = new OAuthService(http, zone, {
          type: OAuthType.RESOURCE,
          config: {
            tokenPath: '/token',
            clientSecret: 'clientSecret',
            clientId: 'clientId'
          },
          storage: localStorage,
          storageKey: 'token'
        }, location);
        expectObservable(oauthService.status$).toBe('a', {a: OAuthStatus.DENIED});
        expect(oauthService.token).toEqual(null);
      });
    });

    it('should set the token after implicit redirect', () => {
      testScheduler.run(({expectObservable}) => {
        window.location.hash = '#access_token=token&token_type=bearer&expires_in=43199';
        oauthService = new OAuthService(http, zone, {
          type: OAuthType.RESOURCE,
          config: {
            tokenPath: '/token',
            clientSecret: 'clientSecret',
            clientId: 'clientId'
          },
          storage: localStorage,
          storageKey: 'token'
        }, location);
        expectObservable(oauthService.status$).toBe('a', {a: OAuthStatus.AUTHORIZED});
        expect(oauthService.token).toEqual({
          access_token: 'token',
          token_type: 'bearer',
          expires_in: '43199'
        });
        expect(window.location.hash).toEqual('');
      });
    });

    it('should denied if the authorization server denies implicit', () => {
      testScheduler.run(({expectObservable}) => {
        location.hash = '#error=access_denied&error_description=error_description';
        oauthService = new OAuthService(http, zone, {
          type: OAuthType.RESOURCE,
          config: {
            tokenPath: '/token',
            clientSecret: 'clientSecret',
            clientId: 'clientId'
          },
          storage: localStorage,
          storageKey: 'token'
        }, location);
        expectObservable(oauthService.status$).toBe('a', {a: OAuthStatus.DENIED});
        expect(oauthService.token).toEqual(null);
        expect(window.location.hash).toEqual('');
      });
    });
  });

  describe('When user logs in', () => {

    it('should set token when resource login', () => {
      testScheduler.run(({expectObservable}) => {
        const token = {
          access_token: 'token',
          token_type: 'bearer',
          expires_in: 43199
        };
        (http.post as Spy).and.returnValue(of(token));
        oauthService.login({username: 'username', password: 'password'});
        expectObservable(oauthService.status$).toBe('a', {a: OAuthStatus.AUTHORIZED});
        expect(oauthService.token).toEqual(token);
      });
    });

    it('should set the denied if the auth is not successful', () => {
      testScheduler.run(({expectObservable}) => {
        (http.post as Spy).and.returnValue(throwError(() => new Error('error')));
        oauthService.login({username: 'username', password: 'password'});
        expectObservable(oauthService.status$).toBe('a', {a: OAuthStatus.DENIED});
        expect(oauthService.token).toEqual(null);
      });
    });

    it('should refresh the token after the time expires', fakeAsync(() => {
      const expected = {
        access_token: 'token2',
        token_type: 'bearer2',
        expires_in: 10,
        refresh_token: 'refresh_token2'
      };
      (http.post as Spy).and.returnValues(
        of({
          access_token: 'token',
          token_type: 'bearer',
          expires_in: 2,
          refresh_token: 'refresh_token'
        }),
        of(expected)
      );
      oauthService.login({username: 'username', password: 'password'});
      tick(4000);
      expect(oauthService.token).toEqual(expected);
      delete oauthService.token?.refresh_token; // stop refresh token timer
      flush();
    }));
  });
});
