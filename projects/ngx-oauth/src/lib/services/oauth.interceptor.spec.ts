import {OAuthInterceptor} from './oauth.interceptor';
import {OAUTH_HTTP_CLIENT, OAuthConfig, provideOAuthConfig} from '../models';
import {TestBed} from '@angular/core/testing';
import {HttpClient, HttpErrorResponse, HttpHandler, HttpParams, HttpRequest, HttpResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {TokenService} from './token.service';
import {catchError} from 'rxjs/operators';
import createSpyObj = jasmine.createSpyObj;
import objectContaining = jasmine.objectContaining;
import any = jasmine.any;

describe('OAuthInterceptor', () => {

  const token = {
    access_token: 'access_token',
    token_type: 'Bearer',
    expires_in: 320
  };
  let interceptor: OAuthInterceptor;
  let tokenService: TokenService;
  let config: OAuthConfig;
  const httpClient = createSpyObj<HttpClient>(['post']);
  httpClient.post.and.returnValue(of(token));

  beforeEach(() => {
    localStorage.clear();
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
          provide: OAUTH_HTTP_CLIENT,
          useValue: httpClient
        },
        TokenService,
        OAuthInterceptor,
      ]
    });
    config = TestBed.inject(OAuthConfig);
    tokenService = TestBed.inject(TokenService);
    interceptor = TestBed.inject(OAuthInterceptor);
  });

  it('should not add authorization', done => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(of(new HttpResponse()));
    interceptor.intercept(req, next).subscribe(() => {
      expect(next.handle).toHaveBeenCalledWith(req);
      done();
    });
  });

  it('should add authorization to request', done => {
    const req = createSpyObj<HttpRequest<any>>(['clone'], {
      url: 'localhost'
    });
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(of(new HttpResponse()));
    tokenService.token = token;
    interceptor.intercept(req, next).subscribe(() => {
      expect(req.clone).toHaveBeenCalledWith({
        setHeaders: {
          Authorization: `Bearer ${token.access_token}`
        }
      });
      done();
    });
  });

  it('should exclude path from authorization', done => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(of(new HttpResponse()));
    config.ignorePaths?.push(/localhost/);
    tokenService.token = token;
    interceptor.intercept(req, next).subscribe(() => {
      expect(next.handle).toHaveBeenCalledWith(req);
      done();
    });
  });

  it('should throw if 401 response and leave token if ignored Paths set', done => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(throwError(() => ({
      status: 401,
      message: 'not authorized'
    } as HttpErrorResponse)));
    config.ignorePaths?.push(/localhost/);
    tokenService.token = token;
    interceptor.intercept(req, next).pipe(
      catchError(err => of(err))
    ).subscribe(() => {
      expect(tokenService.token).toEqual(objectContaining(token));
      done();
    });
  });

  it('should set error token on 401', done => {
    const expected = {
      status: 401,
      message: 'not_authorized'
    } as HttpErrorResponse;
    const req = new HttpRequest('GET', 'https://localhost');
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(throwError(() => expected));
    tokenService.token = token;
    interceptor.intercept(req, next).pipe(
      catchError(err => of(err))
    ).subscribe(() => {
      expect(tokenService.token).toEqual(objectContaining({
        error: '401',
        error_description: 'not_authorized'
      }));
      done();
    });
  });

  it('should refresh token before making the call', done => {
    const req = createSpyObj<HttpRequest<any>>(['clone'], {
      url: 'localhost'
    });
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(of(new HttpResponse()));
    const expired = {
      access_token: 'Mfol5uucFHBHbC9ThK0Xpi-CtTc',
      token_type: 'bearer',
      refresh_token: 'HPtx43K3nKP7y-ot1GzQAZB_7DI',
      scope: 'basic openid',
      expires: 1658432377281
    };
    tokenService.token = expired;
    interceptor.intercept(req, next).subscribe(() => {
      expect(httpClient.post).toHaveBeenCalledWith(any(String), new HttpParams({
        fromObject: {
          client_id: 'clientId',
          client_secret: 'clientSecret',
          grant_type: 'refresh_token',
          refresh_token: 'HPtx43K3nKP7y-ot1GzQAZB_7DI'
        }
      }), any(Object));
      expect(req.clone).toHaveBeenCalledWith({
        setHeaders: {
          Authorization: `Bearer ${token.access_token}`
        }
      });
      done();
    });
  });
});
