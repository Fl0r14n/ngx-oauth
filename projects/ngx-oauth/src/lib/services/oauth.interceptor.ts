import {Inject, Injectable} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {OAuthConfigService, OAuthToken} from '../models';

@Injectable()
export class OAuthInterceptor implements HttpInterceptor {

  constructor(@Inject(OAuthConfigService) private config) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isPathExcepted(req)) {
      const token: OAuthToken = this.config.storage && this.config.storage[this.config.storageKey] &&
        JSON.parse(this.config.storage[this.config.storageKey]);
      if (token && token.access_token) {
        req = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token.access_token}`
          }
        });
      }
    }
    return next.handle(req);
  }

  private isPathExcepted(req: HttpRequest<any>) {
    for (const ignorePath of this.config.ignorePaths) {
      try {
        if (req.url.match(ignorePath)) {
          return true;
        }
      } catch (err) {
      }
    }
    return false;
  }
}
