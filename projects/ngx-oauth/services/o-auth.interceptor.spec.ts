import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpParams,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OAuthTokenService } from './o-auth-token.service';
import { OAuthHttpClient } from './o-auth-http-client';
import { OAuthInterceptor } from './o-auth.interceptor';
import { OAuthConfig, provideOAuthConfig } from '../config';

describe('OAuthInterceptor', () => {
  const token = {
    access_token: 'access_token',
    token_type: 'Bearer',
    expires_in: 320
  };
  let tokenService: OAuthTokenService;
  let config: OAuthConfig;
  const httpClient = { post: jest.fn().mockReturnValue(of(token)) } as unknown as HttpClient;

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
          provide: OAuthHttpClient,
          useValue: httpClient
        }
      ]
    });
    config = TestBed.inject(OAuthConfig);
    tokenService = TestBed.inject(OAuthTokenService);
  });

  it('should not add authorization', (done) => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = jest.fn() as unknown as jest.MockedFunction<HttpHandlerFn>;
    next.mockReturnValue(of({} as HttpEvent<unknown>));
    const oauthInterceptor = TestBed.runInInjectionContext(() => OAuthInterceptor(req, next));
    oauthInterceptor.subscribe(() => {
      expect(next).toHaveBeenCalledWith(req);
      done();
    });
  });

  it('should add authorization to request', (done) => {
    const req = { clone: jest.fn(), url: 'localhost' } as unknown as HttpRequest<unknown>;
    const next = jest.fn() as unknown as jest.MockedFunction<HttpHandlerFn>;
    next.mockReturnValue(of({} as HttpEvent<unknown>));
    tokenService.token = token;
    const oauthInterceptor = TestBed.runInInjectionContext(() => OAuthInterceptor(req, next));
    oauthInterceptor.subscribe(() => {
      expect((req as unknown as { clone: jest.Mock }).clone).toHaveBeenCalledWith({
        setHeaders: {
          Authorization: `Bearer ${token.access_token}`
        }
      });
      done();
    });
  });

  it('should exclude path from authorization', (done) => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = jest.fn() as unknown as jest.MockedFunction<HttpHandlerFn>;
    next.mockReturnValue(of({} as HttpEvent<unknown>));
    config.ignorePaths?.push(/localhost/);
    tokenService.token = token;
    const oauthInterceptor = TestBed.runInInjectionContext(() => OAuthInterceptor(req, next));
    oauthInterceptor.subscribe(() => {
      expect(next).toHaveBeenCalledWith(req);
      done();
    });
  });

  it('should throw if 401 response and leave token if ignored Paths set', (done) => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = jest.fn() as unknown as jest.MockedFunction<HttpHandlerFn>;
    next.mockReturnValue(
      throwError(
        () =>
          ({
            status: 401,
            message: 'not authorized'
          }) as HttpErrorResponse
      )
    );
    config.ignorePaths?.push(/localhost/);
    tokenService.token = token;
    const oauthInterceptor = TestBed.runInInjectionContext(() => OAuthInterceptor(req, next));
    oauthInterceptor.pipe(catchError((err) => of(err))).subscribe(() => {
      expect(tokenService.token).toEqual(expect.objectContaining(token));
      done();
    });
  });

  it('should set error token on 401', (done) => {
    const expected = {
      status: 401,
      message: 'not_authorized'
    } as HttpErrorResponse;
    const req = new HttpRequest('GET', 'https://localhost');
    const next = jest.fn() as unknown as jest.MockedFunction<HttpHandlerFn>;
    next.mockReturnValue(throwError(() => expected));
    tokenService.token = token;
    const oauthInterceptor = TestBed.runInInjectionContext(() => OAuthInterceptor(req, next));
    oauthInterceptor.pipe(catchError((err) => of(err))).subscribe(() => {
      expect(tokenService.token).toEqual(
        expect.objectContaining({
          error: '401',
          error_description: 'not_authorized'
        })
      );
      done();
    });
  });

  it('should refresh token before making the call', (done) => {
    const req = { clone: jest.fn(), url: 'localhost' } as unknown as HttpRequest<unknown>;
    const next = jest.fn() as unknown as jest.MockedFunction<HttpHandlerFn>;
    next.mockReturnValue(of(new HttpResponse()));
    tokenService.token = {
      access_token: 'Mfol5uucFHBHbC9ThK0Xpi-CtTc',
      token_type: 'bearer',
      refresh_token: 'HPtx43K3nKP7y-ot1GzQAZB_7DI',
      scope: 'basic openid',
      expires: 1658432377281
    };
    const oauthInterceptor = TestBed.runInInjectionContext(() => OAuthInterceptor(req, next));
    oauthInterceptor.subscribe(() => {
      expect((httpClient as unknown as { post: jest.Mock }).post).toHaveBeenCalledWith(
        expect.any(String),
        new HttpParams({
          fromObject: {
            client_id: 'clientId',
            client_secret: 'clientSecret',
            grant_type: 'refresh_token',
            refresh_token: 'HPtx43K3nKP7y-ot1GzQAZB_7DI'
          }
        }),
        expect.any(Object)
      );
      expect((req as unknown as { clone: jest.Mock }).clone).toHaveBeenCalledWith({
        setHeaders: {
          Authorization: `Bearer ${token.access_token}`
        }
      });
      done();
    });
  });
});
