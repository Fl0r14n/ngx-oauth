import {OAuthService} from './oauth.service';
import {cold} from 'jasmine-marbles';
import Spy = jasmine.Spy;
import {of, throwError} from 'rxjs';
import {fakeAsync, flush, tick} from '@angular/core/testing';
import {NgZone} from '@angular/core';
import {OAuthType, OAuthStatus, LocationFactory} from '../models';

describe('OAuthService', () => {
  let oauthService: OAuthService;
  let http;
  let zone;

  beforeEach(() => {
    http = jasmine.createSpyObj(['post']);
    zone = new NgZone({});
    oauthService = new OAuthService(http, zone, {
      type: OAuthType.RESOURCE,
      config: {
        tokenPath: '/token',
        clientSecret: 'clentSecret',
        clientId: 'clientId'
      },
      storage: localStorage,
      storageKey: 'token'
    }, LocationFactory());
    localStorage.clear();
    location.hash = '';
  });

  describe('When service initialize', () => {

    it('should set the token if the token is present in storage', () => {
      const token = {
        access_token: 'access_token',
        token_type: 'token_type',
        expires_in: '320'
      };
      (http.post as Spy).and.returnValue(of(token));
      localStorage.setItem('token', JSON.stringify(token));
      oauthService = new OAuthService(http, zone, {
        type: OAuthType.RESOURCE,
        config: {
          tokenPath: '/token',
          clientSecret: 'clentSecret',
          clientId: 'clientId'
        },
        storage: localStorage,
        storageKey: 'token'
      }, LocationFactory());
      const status = cold('a', {a: OAuthStatus.AUTHORIZED});
      expect(oauthService.status$).toBeObservable(status);
      expect(oauthService.token).toEqual(token);
    });

    it('should denied if the token contains error', () => {
      localStorage.setItem('token', JSON.stringify({
        error: 'error'
      }));
      oauthService = new OAuthService(http, zone, {
        type: OAuthType.RESOURCE,
        config: {
          tokenPath: '/token',
          clientSecret: 'clentSecret',
          clientId: 'clientId'
        },
        storage: localStorage,
        storageKey: 'token'
      }, LocationFactory());
      const status = cold('a', {a: OAuthStatus.DENIED});
      expect(oauthService.status$).toBeObservable(status);
      expect(oauthService.token).toEqual(null);
    });

    it('should set the token after implicit redirect', () => {
      window.location.hash = '#access_token=token&token_type=bearer&expires_in=43199';
      oauthService = new OAuthService(http, zone, {
        type: OAuthType.RESOURCE,
        config: {
          tokenPath: '/token',
          clientSecret: 'clentSecret',
          clientId: 'clientId'
        },
        storage: localStorage,
        storageKey: 'token'
      }, LocationFactory());
      const status = cold('a', {a: OAuthStatus.AUTHORIZED});
      expect(oauthService.status$).toBeObservable(status);
      expect(oauthService.token).toEqual({
        access_token: 'token',
        token_type: 'bearer',
        expires_in: '43199'
      });
      expect(window.location.hash).toEqual('');
    });

    it('should denied if the authorization server denies implicit', () => {
      location.hash = '#error=access_denied&error_description=error_description';
      oauthService = new OAuthService(http, zone, {
        type: OAuthType.RESOURCE,
        config: {
          tokenPath: '/token',
          clientSecret: 'clentSecret',
          clientId: 'clientId'
        },
        storage: localStorage,
        storageKey: 'token'
      }, LocationFactory());
      const status = cold('a', {a: OAuthStatus.DENIED});
      expect(oauthService.status$).toBeObservable(status);
      expect(oauthService.token).toEqual(null);
      expect(window.location.hash).toEqual('');
    });
  });

  describe('When user logs in', () => {

    it('should set token when resource login', fakeAsync(() => {
      const token = {
        access_token: 'token',
        token_type: 'bearer',
        expires_in: '43199'
      };
      (http.post as Spy).and.returnValue(of(token));
      oauthService.login({username: 'username', password: 'password'});
      const status = cold('a', {a: OAuthStatus.AUTHORIZED});
      expect(oauthService.status$).toBeObservable(status);
      expect(oauthService.token).toEqual(token);
      flush();
    }));

    it('should set the denied if the auth is not successful', fakeAsync(() => {
      (http.post as Spy).and.returnValue(throwError('error'));
      oauthService.login({username: 'username', password: 'password'});
      const status = cold('a', {a: OAuthStatus.DENIED});
      expect(oauthService.status$).toBeObservable(status);
      expect(oauthService.token).toEqual(null);
    }));

    it('should refresh the token after the time expires', fakeAsync(() => {
      const expected = {
        access_token: 'token2',
        token_type: 'bearer2',
        expires_in: '3'
      };
      (http.post as Spy).and.returnValues(
        of({
          access_token: 'token',
          token_type: 'bearer',
          expires_in: '2',
          refresh_token: 'refresh_token'
        }),
        of(expected)
      );
      oauthService.login({username: 'username', password: 'password'});
      tick(4000);
      expect(oauthService.token).toEqual(expected);
      flush();
    }));
  });
});
