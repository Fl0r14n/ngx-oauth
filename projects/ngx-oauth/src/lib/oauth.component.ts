import {Input} from '@angular/core';
import {OAuthEvent, OAuthService} from './oauth.service';

export class OAuthComponent {
  @Input()
  className: string;
  @Input()
  i18nLogin = 'Sign in';
  @Input()
  i18nLogout = 'Logout';
  @Input()
  i18nDenied = 'Access denied. Try Again';

  oauth: OAuthService;

  constructor(oauth: OAuthService) {
    this.oauth = oauth;
  }

  @Input()
  set storage(storage: Storage) {
    this.oauth.storage = storage;
  }

  isLogout() {
    return this.oauth.status === OAuthEvent.LOGOUT;
  }

  isAuthorized() {
    return this.oauth.status === OAuthEvent.AUTHORIZED;
  }

  isDenied() {
    return this.oauth.status === OAuthEvent.DENIED;
  }

  getEmail() {
    return this.oauth.profile ? this.oauth.profile.name : '';
  }
}
