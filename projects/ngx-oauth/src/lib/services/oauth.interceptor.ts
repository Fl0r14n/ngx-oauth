import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {switchMap, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {OAuthConfig} from '../models';
import {TokenService} from './token.service';

@Injectable()
export class OAuthInterceptor implements HttpInterceptor {

  constructor(protected tokenService: TokenService,
              protected authConfig: OAuthConfig) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return this.tokenService.token$.pipe(
      map(token => {
        if (token?.access_token && !this.isPathExcepted(req)) {
          req = req.clone({
            setHeaders: {
              Authorization: `${token.token_type} ${token.access_token}`
            }
          });
        }
        return req;
      }),
      switchMap(req => next.handle(req)),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && !this.isPathExcepted(req)) {
          this.tokenService.token = {
            error: err.message
          };
        }
        return throwError(() => err);
      })
    );
  }

  private isPathExcepted(req: HttpRequest<any>) {
    const {ignorePaths} = this.authConfig || {};
    if (ignorePaths) {
      for (const ignorePath of ignorePaths) {
        try {
          if (req.url.match(ignorePath)) {
            return true;
          }
        } catch (err) {
        }
      }
    }
    return false;
  }
}
