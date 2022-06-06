import {OAuthInterceptor} from './oauth.interceptor';
import {OAuthStatus} from '../models';
import {OAuthService} from './oauth.service';
import {TestBed} from '@angular/core/testing';
import createSpyObj = jasmine.createSpyObj;
import {HttpHandler, HttpRequest, HttpResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';

describe('OAuthInterceptor', () => {

  const token = {
    access_token: 'access_token',
    token_type: 'Bearer',
    expires_in: 320
  };
  let oauthService: OAuthService;
  let interceptor: OAuthInterceptor;

  beforeEach((done) => {
    oauthService = createSpyObj<OAuthService>([], {
      ignorePaths: []
    });
    TestBed.configureTestingModule({
      providers: [
        {provide: OAuthService, useValue: oauthService},
        OAuthInterceptor,
      ]
    });
    interceptor = TestBed.inject(OAuthInterceptor);
    setTimeout(done, 50);
  });

  it('should not add authorization if it does not exist', () => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(of(new HttpResponse()));
    interceptor.intercept(req, next);
    expect(next.handle).toHaveBeenCalledWith(req);
  });

  it('should add authorization to request', () => {
    const req = createSpyObj<HttpRequest<any>>(['clone'], {
      url: 'localhost'
    });
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(of(new HttpResponse()));
    oauthService.token = token;
    interceptor.intercept(req, next);
    expect(req.clone).toHaveBeenCalledWith({
      setHeaders: {
        Authorization: `Bearer ${token.access_token}`
      }
    });
  });

  it('should exclude path from authorization', () => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(of(new HttpResponse()));
    oauthService.ignorePaths.push(/localhost/);
    interceptor.intercept(req, next);
    expect(next.handle).toHaveBeenCalledWith(req);
  });

  it('should throw undefined if 401 response && ignored Paths set', () => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(throwError({status: 401}));
    oauthService.ignorePaths.push(/localhost/);
    oauthService.token = token;
    interceptor.intercept(req, next).subscribe();
    expect(oauthService.status).toBe(undefined as any);
  });

  it('should throw DENIED if 401 response && ignored Paths unset', () => {
    const req = new HttpRequest('GET', 'https://localhost');
    const next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(throwError({status: 401}));
    oauthService.token = token;
    interceptor.intercept(req, next).subscribe();
    expect(oauthService.status).toBe(OAuthStatus.DENIED);
  });
});
