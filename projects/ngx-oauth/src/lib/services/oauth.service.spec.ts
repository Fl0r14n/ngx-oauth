import {OAuthService} from './oauth.service';
import {cold} from 'jasmine-marbles';
import Spy = jasmine.Spy;
import {of, throwError} from 'rxjs';
import {fakeAsync, flush, tick} from '@angular/core/testing';
import {NgZone} from '@angular/core';
import {OAuthType, OAuthStatus} from '../models';

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
    });
    localStorage.clear();
    location.hash = '';
  });

  describe('When service initialize', () => {

    it('should set the token if the token is present in storage', () => {
      localStorage.setItem('token', JSON.stringify({
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        token_type: 'token_type',
        expires_in: '320'
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
      });
      const status = cold('a', {a: OAuthStatus.AUTHORIZED});
      expect(oauthService.status$).toBeObservable(status);
      expect(oauthService.token).toEqual({
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        token_type: 'token_type',
        expires_in: '320'
      });
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
      });
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
      });
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
      });
      const status = cold('a', {a: OAuthStatus.DENIED});
      expect(oauthService.status$).toBeObservable(status);
      expect(oauthService.token).toEqual(null);
      expect(window.location.hash).toEqual('');
    });
  });

  describe('When user logs in', () => {

    it('should set token when resource login', fakeAsync(() => {
      (http.post as Spy).and.returnValue(of({
        access_token: 'token',
        token_type: 'bearer',
        expires_in: '43199'
      }));
      oauthService.login({username: 'username', password: 'password'});
      const status = cold('a', {a: OAuthStatus.AUTHORIZED});
      expect(oauthService.status$).toBeObservable(status);
      expect(oauthService.token).toEqual({
        access_token: 'token',
        token_type: 'bearer',
        expires_in: '43199'
      });
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
      (http.post as Spy).and.returnValues(
        of({
          access_token: 'token',
          token_type: 'bearer',
          expires_in: '2',
          refresh_token: 'refresh_token'
        }),
        of({
          access_token: 'token2',
          token_type: 'bearer2',
          expires_in: '3'
        })
      );
      oauthService.login({username: 'username', password: 'password'});
      tick(4000);
      expect(oauthService.token).toEqual({
        access_token: 'token2',
        token_type: 'bearer2',
        expires_in: '3'
      });
      flush();
    }));
  });
});
