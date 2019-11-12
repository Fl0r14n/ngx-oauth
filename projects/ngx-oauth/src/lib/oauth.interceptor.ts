import {Injectable, Injector} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {OAuthService} from './oauth.service';

@Injectable()
export class OAuthInterceptor implements HttpInterceptor {

  private oauth: OAuthService;

  constructor(injector: Injector) {
    setTimeout(() => {
      this.oauth = injector.get(OAuthService);
    });
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.oauth && this.oauth.token && this.oauth.token.access_token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${this.oauth.token.access_token}`
        }
      });
    }
    return next.handle(req);
  }
}
