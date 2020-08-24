import {OAuthInterceptor} from './oauth.interceptor';
import {OAuthStatus, OAuthType} from '../models';
import {HttpHandler, HttpRequest} from '@angular/common/http';
import createSpyObj = jasmine.createSpyObj;
import {OAuthService} from './oauth.service';
import {NgZone} from '@angular/core';
import {throwError} from 'rxjs';

describe('OAuthInterceptor', () => {

  const config = {
    type: OAuthType.RESOURCE,
    config: {
      tokenPath: '/token',
      clientSecret: 'clentSecret',
      clientId: 'clientId'
    },
    storage: localStorage,
    storageKey: 'token',
    ignorePaths: []
  };
  let service: OAuthService;
  let interceptor: OAuthInterceptor;
  let req;
  let next;

  beforeEach(() => {
    localStorage.clear();
    service = new OAuthService(null, new NgZone({}), config);
    interceptor = new OAuthInterceptor(service);
    req = createSpyObj<HttpRequest<any>>(['clone'], {
      url: 'localhost'
    });
    next = createSpyObj<HttpHandler>(['handle']);
    next.handle.and.returnValue(throwError({status: 401}));
  });

  it('should not add authorization if it does not exist', () => {
    interceptor.intercept(req, next);
    expect(next.handle).toHaveBeenCalledWith(req);
  });

  it('should add authorization to request', () => {
    const token = {
      access_token: 'access_token',
      token_type: 'token_type',
      expires_in: '320'
    };
    service.token = token;
    interceptor.intercept(req, next);
    expect(req.clone).toHaveBeenCalledWith({
      setHeaders: {
        Authorization: `Bearer ${token.access_token}`
      }
    });
  });

  it('should exclude path from authorization', () => {
    config.ignorePaths.push(/localhost/);
    interceptor.intercept(req, next);
    expect(next.handle).toHaveBeenCalledWith(req);
  });

  it('should return empty and throw denied if 401 response', () => {
    const token = {
      access_token: 'access_token',
      token_type: 'token_type',
      expires_in: '320'
    };
    service.token = token;
    interceptor.intercept(req, next).subscribe();
    expect(service.status).toBe(OAuthStatus.DENIED);
  });
});
