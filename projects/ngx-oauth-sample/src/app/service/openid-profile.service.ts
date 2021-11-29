import {ProfileService} from './index';
import {Observable} from 'rxjs';
import {Injectable} from '@angular/core';
import {OAuthService} from 'ngx-oauth';
import {map} from 'rxjs/operators';

/**
 * Get profile if openid
 */
@Injectable({
  providedIn: 'root'
})
export class OpenidProfileService implements ProfileService {

  constructor(private oauthService: OAuthService) {
  }

  get profileName$(): Observable<string | undefined> {
    return this.oauthService.userInfo$.pipe(
      map(v => v.name)
    );
  }
}
