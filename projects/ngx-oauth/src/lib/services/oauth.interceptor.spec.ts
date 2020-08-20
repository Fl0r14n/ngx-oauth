import {OAuthInterceptor} from './oauth.interceptor';
import {OAuthType} from '../models';
import {HttpHandler, HttpRequest} from '@angular/common/http';
import createSpyObj = jasmine.createSpyObj;

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
  let service: OAuthInterceptor;
  let req;
  let next;

  beforeEach(() => {
    localStorage.clear();
    service = new OAuthInterceptor(config);
    req = createSpyObj<HttpRequest<any>>(['clone'], {
      url: 'localhost'
    });
    next = createSpyObj<HttpHandler>(['handle']);
  });

  it('should not add authorization if it does not exist', () => {
    service.intercept(req, next);
    expect(next.handle).toHaveBeenCalledWith(req);
  });

  it('should add authorization to request', () => {
    const token = {
      access_token: 'access_token',
      token_type: 'token_type',
      expires_in: '320'
    };
    localStorage.setItem('token', JSON.stringify(token));
    service.intercept(req, next);
    expect(req.clone).toHaveBeenCalledWith({
      setHeaders: {
        Authorization: `Bearer ${token.access_token}`
      }
    });
  });

  it('should exclude path from authorization', () => {
    const token = {
      access_token: 'access_token',
      token_type: 'token_type',
      expires_in: '320'
    };
    localStorage.setItem('token', JSON.stringify(token));
    config.ignorePaths.push(/localhost/);
    service.intercept(req, next);
    expect(next.handle).toHaveBeenCalledWith(req);
  });
});
