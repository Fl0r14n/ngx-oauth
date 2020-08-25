import {Injectable, Injector} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {EMPTY, Observable} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {OAuthService} from './oauth.service';
import {OAuthStatus} from '../models';

@Injectable()
export class OAuthInterceptor implements HttpInterceptor {

  private oauthService: OAuthService;

  constructor(injector: Injector) {
    setTimeout(() => this.oauthService = injector.get(OAuthService));
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.oauthService) {
      if (!this.isPathExcepted(req)) {
        const token = this.oauthService.token;
        if (token && token.access_token) {
          req = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token.access_token}`
            }
          });
        }
      }
      return next.handle(req).pipe(
        catchError((err, caught) => {
          if (err.status === 401) {
            this.oauthService.token = null;
            this.oauthService.status = OAuthStatus.DENIED;
          }
          return EMPTY;
        })
      );
    } else {
      return next.handle(req);
    }
  }

  private isPathExcepted(req: HttpRequest<any>) {
    for (const ignorePath of this.oauthService.ignorePaths) {
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
