import {Component} from '@angular/core';
import {Observable} from 'rxjs';
import {OAuthService, OAuthStatusTypes} from 'ngx-oauth';

@Component({
  selector: 'app-oauth-authorization-code',
  templateUrl: 'oauth-authorization-code.component.html'
})
export class OauthAuthorizationCodeComponent {
  location = window.location.origin;
  status$: Observable<OAuthStatusTypes>;
  statusTypes = OAuthStatusTypes;
  constructor(public oauth: OAuthService) {
    this.status$ = this.oauth.getStatus();
  }
}
