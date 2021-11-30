import {OAuthService} from './oauth.service';
import Spy = jasmine.Spy;
import {of, throwError} from 'rxjs';
import {fakeAsync, flush, TestBed, tick} from '@angular/core/testing';
import {OAuthType, OAuthStatus, OAUTH_CONFIG} from '../models';
import createSpyObj = jasmine.createSpyObj;
import {TestScheduler} from 'rxjs/testing';
import {OAuthModule} from '../oauth.module';
import {HttpClient} from '@angular/common/http';

describe('OAuthService', () => {
  let oauthService: OAuthService;
  let http: any;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
    localStorage.clear();
    location.hash = '';
  });

  describe('When service initialize', () => {

    it('should set the token if the token is present in storage', fakeAsync(() => {
      testScheduler.run(({expectObservable}) => {
        const token = {
          access_token: 'access_token',
          token_type: 'token_type',
          expires_in: 320
        };
        localStorage.setItem('token', JSON.stringify(token));
        TestBed.configureTestingModule({
          imports: [
            OAuthModule.forRoot({
              type: OAuthType.RESOURCE,
              config: {
                tokenPath: '/token',
                clientSecret: 'clientSecret',
                clientId: 'clientId'
              }
            }),
          ]
        });
        oauthService = TestBed.inject(OAuthService);
        tick(50);
        expectObservable(oauthService.status$).toBe('a', {a: OAuthStatus.AUTHORIZED});
        expect(oauthService.token).toEqual(token);
        flush();
      });
    }));

    it('should denied if the token contains error', fakeAsync(() => {
      testScheduler.run(({expectObservable}) => {
        const token = {
          error: 'error'
        };
        localStorage.setItem('token', JSON.stringify(token));
        TestBed.configureTestingModule({
          imports: [
            OAuthModule.forRoot({
              type: OAuthType.RESOURCE,
              config: {
                tokenPath: '/token',
                clientSecret: 'clientSecret',
                clientId: 'clientId'
              }
            }),
          ]
        });
        oauthService = TestBed.inject(OAuthService);
        tick(50);
        expectObservable(oauthService.status$).toBe('a', {a: OAuthStatus.DENIED});
        expect(oauthService.token).toEqual(token);
        flush();
      });
    }));

    it('should set the token after implicit redirect', fakeAsync(() => {
      testScheduler.run(({expectObservable}) => {
        window.location.hash = '#access_token=token&token_type=bearer&expires_in=43199';
        TestBed.configureTestingModule({
          imports: [
            OAuthModule.forRoot({
              type: OAuthType.IMPLICIT,
              config: {
                tokenPath: '/token',
                clientId: 'clientId'
              }
            }),
          ]
        });
        oauthService = TestBed.inject(OAuthService);
        tick(50);
        expectObservable(oauthService.status$).toBe('a', {a: OAuthStatus.AUTHORIZED});
        expect(oauthService.token).toEqual({
          access_token: 'token',
          token_type: 'bearer',
          expires_in: '43199'
        });
        expect(window.location.hash).toEqual('');
        flush();
      });
    }));

    it('should be denied if the authorization server denies implicit', fakeAsync(() => {
      testScheduler.run(({expectObservable}) => {
        location.hash = '#error=access_denied&error_description=error_description';
        TestBed.configureTestingModule({
          imports: [
            OAuthModule.forRoot({
              type: OAuthType.IMPLICIT,
              config: {
                tokenPath: '/token',
                clientId: 'clientId'
              }
            }),
          ]
        });
        oauthService = TestBed.inject(OAuthService);
        tick(50);
        expectObservable(oauthService.status$).toBe('a', {a: OAuthStatus.DENIED});
        expect(oauthService.token).toEqual({
          error: 'access_denied',
          error_description: 'error_description'
        });
        expect(window.location.hash).toEqual('');
        flush();
      });
    }));
  });

  describe('When user logs in', () => {

    beforeEach(fakeAsync(() => {
      http = createSpyObj(['post']);
      TestBed.configureTestingModule({
        imports: [
          OAuthModule.forRoot({
            type: OAuthType.RESOURCE,
            config: {
              tokenPath: '/token',
              clientId: 'clientId',
              clientSecret: 'clientSecret',
            }
          }),
        ],
        providers: [
          {
            provide: HttpClient,
            useValue: http
          }
        ]
      });
      oauthService = TestBed.inject(OAuthService);
      tick(50);
      flush();
    }));

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
        const error = {
          error: 'access_denied',
          error_description: 'error_description'
        };
        (http.post as Spy).and.returnValue(throwError(() => error));
        oauthService.login({username: 'username', password: 'password'});
        expectObservable(oauthService.status$).toBe('a', {a: OAuthStatus.DENIED});
        expect(oauthService.token).toEqual(error);
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

  describe('when OIDC', () => {

    it('should keep existing configuration when no issuer path present', fakeAsync(() => {
      const config = {
        authorizePath: '/authorize',
        clientId: 'clientId'
      };
      TestBed.configureTestingModule({
        imports: [
          OAuthModule.forRoot({
            type: OAuthType.AUTHORIZATION_CODE,
            config
          }),
        ]
      });
      oauthService = TestBed.inject(OAuthService);
      tick(50);
      const oauthConfig = TestBed.inject(OAUTH_CONFIG);
      expect(oauthConfig.config).toEqual(config);
    }));

    it('should try to autoconfigure client when issuer path is present', fakeAsync(() => {
      const config = {
        issuerPath: '/issuer',
        clientId: 'clientId'
      };
      const discovery = {
        authorization_endpoint: '/authorize',
        token_endpoint: '/token'
      };
      const expected = {
        ...config,
        authorizePath: '/authorize',
        tokenPath: '/token',
        scope: 'openid'
      };
      http = createSpyObj(['get']);
      (http.get as Spy).and.returnValue(of(discovery));
      TestBed.configureTestingModule({
        imports: [
          OAuthModule.forRoot({
            type: OAuthType.AUTHORIZATION_CODE,
            config
          }),
        ],
        providers: [
          {
            provide: HttpClient,
            useValue: http
          }
        ]
      });
      oauthService = TestBed.inject(OAuthService);
      tick(50);
      const oauthConfig = TestBed.inject(OAUTH_CONFIG);
      expect(oauthConfig.config).toEqual(expected);
    }));
  });
});
