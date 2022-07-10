import {OAuthService} from './oauth.service';
import {of, throwError} from 'rxjs';
import {TestBed} from '@angular/core/testing';
import {OAuthConfig, OAuthStatus} from '../models';
import {OAuthModule} from '../oauth.module';
import {HttpClient} from '@angular/common/http';
import Spy = jasmine.Spy;
import createSpyObj = jasmine.createSpyObj;
import objectContaining = jasmine.objectContaining;

describe('OAuthService', () => {

  describe('When service initialize', () => {

    const authConfig: OAuthConfig = {
      config: {
        tokenPath: '/token',
        clientSecret: 'clientSecret',
        clientId: 'clientId'
      }
    };

    beforeEach(() => {
      localStorage.clear();
      location.hash = '';
    });

    it('shoud be not authorized if no token', done => {
      TestBed.configureTestingModule({
        imports: [OAuthModule.forRoot(authConfig)]
      });
      const oauthService = TestBed.inject(OAuthService);
      oauthService.status$.subscribe(status => {
        expect(status).toBe(OAuthStatus.NOT_AUTHORIZED);
        done();
      });
    });

    it('should be authorized if token', done => {
      const token = {
        access_token: 'access_token',
        token_type: 'token_type',
        expires_in: 320
      };
      localStorage.setItem('token', JSON.stringify(token));
      TestBed.configureTestingModule({
        imports: [OAuthModule.forRoot(authConfig)]
      });
      const oauthService = TestBed.inject(OAuthService);
      oauthService.status$.subscribe(status => {
        expect(status).toBe(OAuthStatus.AUTHORIZED);
        done();
      });
    });

    it('should be denied if error in token', done => {
      const token = {
        error: 'error'
      };
      localStorage.setItem('token', JSON.stringify(token));
      TestBed.configureTestingModule({
        imports: [OAuthModule.forRoot(authConfig)]
      });
      const oauthService = TestBed.inject(OAuthService);
      oauthService.status$.subscribe(status => {
        expect(status).toBe(OAuthStatus.DENIED);
        done();
      });
    });
  });

  describe('When ClientCredential', () => {

    it('should be authorized if client credential login', () => {

    });

    it('should be denied if client credential login error', () => {

    });
  });

  describe('When Resouce', () => {

    const authConfig: OAuthConfig = {
      config: {
        tokenPath: '/token',
        clientSecret: 'clientSecret',
        clientId: 'clientId'
      }
    };
    let oauthService: OAuthService;
    let http: HttpClient;

    beforeEach(() => {
      localStorage.clear();
      location.hash = '';
      http = createSpyObj(['post']);
      TestBed.configureTestingModule({
        imports: [OAuthModule.forRoot(authConfig)],
        providers: [{provide: HttpClient, useValue: http}]
      });
      oauthService = TestBed.inject(OAuthService);
    });

    it('should be authorized if resouce login', done => {
      const expected = {
        access_token: 'token',
        token_type: 'bearer',
        expires_in: 43199
      };
      (http.post as Spy).and.returnValue(of(expected));
      oauthService.login({username: 'username', password: 'password'});
      oauthService.status$.subscribe(status => {
        expect(status).toBe(OAuthStatus.AUTHORIZED);
        expect(oauthService.token).toEqual(objectContaining(expected));
        done();
      });
    });

    it('should be denied if resouce login error', done => {
      const expected = {
        error: 'access_denied',
        error_description: 'error_description'
      };
      (http.post as Spy).and.returnValue(throwError(() => expected));
      oauthService.login({username: 'username', password: 'password'});
      oauthService.status$.subscribe(status => {
        expect(status).toBe(OAuthStatus.DENIED);
        expect(oauthService.token).toEqual(objectContaining(expected));
        done();
      });
    });
  });

  describe('When Implicit', () => {

    const authConfig: OAuthConfig = {
      config: {
        tokenPath: '/token',
        clientId: 'clientId'
      }
    };

    beforeEach(() => {
      localStorage.clear();
      location.hash = '';
    });

    it('should be authorized if implicit login', done => {
      location.hash = '#access_token=token&token_type=bearer&expires_in=43199';
      TestBed.configureTestingModule({
        imports: [OAuthModule.forRoot(authConfig)]
      });
      const oauthService = TestBed.inject(OAuthService);
      oauthService.status$.subscribe(status => {
        expect(status).toBe(OAuthStatus.AUTHORIZED);
        expect(location.hash).toEqual('');
        expect(oauthService.token).toEqual(objectContaining({
          access_token: 'token',
          token_type: 'bearer',
          expires_in: '43199'
        }));
        done();
      });
    });

    it('should be denied if implicit login error', done => {
      location.hash = '#error=access_denied&error_description=error_description';
      TestBed.configureTestingModule({
        imports: [OAuthModule.forRoot(authConfig)]
      });
      const oauthService = TestBed.inject(OAuthService);
      oauthService.status$.subscribe(status => {
        expect(status).toBe(OAuthStatus.DENIED);
        expect(location.hash).toEqual('');
        expect(oauthService.token).toEqual(objectContaining({
          error: 'access_denied',
          error_description: 'error_description'
        }));
        done();
      });
    });
  });

  describe('When AuthorizationCode', () => {

    it('should be authorized if authorization code login', () => {

    });

    it('should be denied if authorization code login error', () => {

    });
  });

  describe('When OIDC', () => {

    it('should keep existing configuration when no issuer path present', done => {
      const config = {
        authorizePath: '/authorize',
        clientId: 'clientId'
      };
      TestBed.configureTestingModule({
        imports: [OAuthModule.forRoot({config})]
      });
      const oauthService = TestBed.inject(OAuthService);
      oauthService.config$.subscribe(cfg => {
        expect(cfg).toBe(config);
        done();
      });
    });

    it('should try to autoconfigure client when issuer path is present', done => {
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
      const http = createSpyObj(['get']);
      (http.get as Spy).and.returnValue(of(discovery));
      TestBed.configureTestingModule({
        imports: [OAuthModule.forRoot({config})],
        providers: [{
          provide: HttpClient,
          useValue: http
        }]
      });
      const oauthService = TestBed.inject(OAuthService);
      oauthService.config$.subscribe(cfg => {
        expect(cfg).toEqual(expected);
        done();
      });
    });
  });
});
