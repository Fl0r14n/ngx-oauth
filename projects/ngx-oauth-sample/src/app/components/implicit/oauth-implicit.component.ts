import {Component} from '@angular/core';
import {Observable} from 'rxjs';
import {OAuthService, OAuthStatusTypes} from 'ngx-oauth';

@Component({
  selector: 'app-oauth-implicit',
  templateUrl: 'oauth-implicit.component.html'
})
export class OauthImplicitComponent {
  location = window.location.origin;
  status$: Observable<OAuthStatusTypes>;
  statusTypes = OAuthStatusTypes;
  constructor(public oauth: OAuthService) {
    this.status$ = this.oauth.getStatus();
  }
}
