import {OAuthInterceptor} from './oauth.interceptor';
import {OAuthConfig, provideOAuthConfig} from '../models';
import {TestBed} from '@angular/core/testing';
import {HttpClient, HttpHandler, HttpRequest, HttpResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {TokenService} from './token.service';
import {catchError} from 'rxjs/operators';
import createSpyObj = jasmine.createSpyObj;

describe('OAuthInterceptor', () => {

  const token = {
    access_token: 'access_token',
    token_type: 'Bearer',
    expires_in: 320
  };
  let interceptor: OAuthInterceptor;
  let tokenService: TokenService;
  let config: OAuthConfig;

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
          provide: HttpClient,
          useValue: createSpyObj<HttpClient>(['post'])
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

  it('should throw if 401 response && ignored Paths set', done => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(throwError(() => ({status: 401})));
    config.ignorePaths?.push(/localhost/);
    tokenService.token = token;
    interceptor.intercept(req, next).pipe(
      catchError(err => of(err))
    ).subscribe(() => {
      expect(tokenService.token).toEqual(jasmine.objectContaining(token));
      done();
    });
  });

  it('should clear token on 401', done => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(throwError(() => ({status: 401})));
    tokenService.token = token;
    interceptor.intercept(req, next).pipe(
      catchError(err => of(err))
    ).subscribe(() => {
      expect(tokenService.token).toEqual({});
      done();
    });
  });
});
