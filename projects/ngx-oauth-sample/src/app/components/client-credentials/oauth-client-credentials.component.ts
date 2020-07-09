import {Component} from '@angular/core';
import {Observable} from 'rxjs';
import {OAuthService, OAuthStatusTypes} from 'ngx-oauth';

@Component({
  selector: 'app-oauth-client-credentials',
  templateUrl: 'oauth-client-credentials.component.html'
})
export class OauthClientCredentialsComponent {
  location = window.location.origin;
  status$: Observable<OAuthStatusTypes>;
  statusTypes = OAuthStatusTypes;
  constructor(public oauth: OAuthService) {
    this.status$ = this.oauth.getStatus();
  }
}
