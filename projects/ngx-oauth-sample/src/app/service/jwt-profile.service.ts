import {Injectable} from '@angular/core';
import {ProfileService} from './index';
import {OAuthService, OAuthStatus} from 'ngx-oauth';
import {Observable} from 'rxjs';
import {filter, map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class JwtProfileService implements ProfileService {

  constructor(private oauthService: OAuthService) {
  }

  get profileName$(): Observable<string> {
    return this.oauthService.status$.pipe(
      filter(s => s === OAuthStatus.AUTHORIZED),
      map(() => this.oauthService.token?.id_token),
      filter(t => !!t),
      // @ts-ignore
      map(t => JSON.parse(atob(t.split('.')[1]))),
      map(t => t.name || t.username || t.email || t.sub),
    );
  }
}
