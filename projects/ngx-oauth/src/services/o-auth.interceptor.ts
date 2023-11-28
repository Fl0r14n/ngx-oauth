import {inject} from '@angular/core';
import {HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {switchMap, take, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {OAuthTokenService} from './o-auth-token.service';
import {OAuthConfig} from '../config';

export const OAuthInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const authConfig = inject(OAuthConfig)
  const tokenService = inject(OAuthTokenService)
  const isPathExcepted = (req: HttpRequest<any>) => {
    const {ignorePaths} = authConfig || {};
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
  return isPathExcepted(req) && next(req) || tokenService.token$.pipe(
    take(1),
    map(token => {
      if (token?.access_token) {
        req = req.clone({
          setHeaders: {
            Authorization: `${token.token_type} ${token.access_token}`
          }
        })
      }
      return req
    }),
    switchMap(req => next(req)),
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        tokenService.token = {
          error: `${err.status}`,
          error_description: err.message
        };
      }
      return throwError(() => err);
    })
  );
}
